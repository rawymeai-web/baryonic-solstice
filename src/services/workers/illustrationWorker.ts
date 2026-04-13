import { supabase } from '@/utils/supabaseClient';
import { generateMethod4Image } from '@/services/generation/imageGenerator';
import { WorkerUtils } from './workerUtils';
import { MasterScheduler } from './scheduler';
import { v4 as uuidv4 } from 'uuid';

export class IllustrationWorker {

    /**
     * Executes a single Illustration Generation job pulled from the queue.
     * Iteratively processes all missing images in the StoryData prompts block.
     */
    static async processJob(jobId: string, orderId: string, attempts: number) {
        console.log(`[IllustrationWorker] Initiating Job ${jobId} for Order ${orderId}`);

        try {
            // Lock the job to 'running' using an atomic conditional update
            const { data: lockResult, error: lockErr } = await supabase
                .from('order_jobs')
                .update({ status: 'running', started_at: new Date().toISOString() })
                .eq('id', jobId)
                .eq('status', 'queued') // Concurrency lock
                .select();

            if (lockErr || !lockResult || lockResult.length === 0) {
                console.warn(`[IllustrationWorker] Job ${jobId} already grabbed by another worker. Aborting.`);
                return;
            }

            // Fetch the Order and the current payload
            const { data: order, error } = await supabase
                .from('orders')
                .select('story_data, generation_snapshot, order_number')
                .eq('order_number', orderId)
                .single();

            if (error || !order || !order.story_data) throw new Error("Order data missing");

            const storyData = order.story_data as any;
            const snapshot = order.generation_snapshot as any || {};

            // Ensure we have prompts to process
            if (!storyData.prompts || !Array.isArray(storyData.prompts)) {
                throw new Error("Missing prompts array. Cannot run illustration loop.");
            }

            const childAge = snapshot.age || storyData.childAge;
            const styleRef = snapshot.style_reference_image_url || storyData.styleReferenceImageBase64;
            const childDesc = storyData.mainCharacter?.description || '';
            const secondRef = storyData.secondCharacter?.imageBases64?.[0]; // If using second character

            // Pre-seed tracking for idempotency
            let allCompleted = true;
            let pagesUpdated = 0;

            console.log(`[IllustrationWorker] Processing ${storyData.prompts.length} spreads...`);

            // Event Tracker: Start
            await supabase.from('event_audit_log').insert({
                event_type: 'illustration_batch_started',
                order_id: orderId,
                details: { timestamp: new Date(), target_spreads: storyData.prompts.length }
            });

            // Process each prompt payload
            for (let i = 0; i < storyData.prompts.length; i++) {
                const promptBlock = storyData.prompts[i];
                const existingPage = storyData.pages?.[i];

                // Idempotency: skip if already successfully generated
                if (existingPage && existingPage.illustrationUrl && !existingPage.illustrationUrl.includes('error')) {
                    continue;
                }

                console.log(`[IllustrationWorker] Generating Image ${i + 1}/${storyData.prompts.length}`);

                try {
                    // HERO DNA: We prioritze the processed illustration DNA over the raw photo
                    const heroDNA = storyData.mainCharacter?.imageDNA?.[0] || storyData.mainCharacter?.imageBases64?.[0];
                    let secondaryDNA = storyData.secondCharacter?.imageDNA?.[0] || storyData.secondCharacter?.imageBases64?.[0];

                    if (storyData.secondCharacter?.type === 'object') {
                        secondaryDNA = undefined;
                    }

                    // Impose a 2 minute timeout per single generation
                    const imgRes = await WorkerUtils.withTimeout(
                        generateMethod4Image(
                            promptBlock.imagePrompt,
                            storyData.selectedStylePrompt || "high quality storybook illustration",
                            heroDNA, // This is the PRIMARY anchor (Sarah)
                            childDesc,
                            childAge,
                            Math.floor(Math.random() * 100000), // Random Seed
                            secondaryDNA
                        ),
                        120000
                    );

                    // Image generated successfully.
                    const base64Out = imgRes.imageBase64;

                    // 1. Upload to Supabase Storage instead of inserting Base64 directly into Postgres!
                    const bucket = 'images';
                    const fileName = `${orderId}/spread_${i + 1}_${Date.now()}.jpg`;
                    const buffer = Buffer.from(base64Out, 'base64');

                    const { error: uploadErr } = await supabase.storage
                        .from(bucket)
                        .upload(fileName, buffer, {
                            contentType: 'image/jpeg',
                            upsert: true
                        });

                    let finalUrl = `data:image/jpeg;base64,${base64Out}`; // fallback to base64 if bucket fails

                    if (!uploadErr) {
                        const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(fileName);
                        if (publicData?.publicUrl) {
                            finalUrl = publicData.publicUrl;
                        }
                    } else {
                        console.warn(`[IllustrationWorker] Failed to upload Spread ${i + 1} to bucket, falling back to base64.`, uploadErr);
                    }

                    // 2. We patch storyData.pages safely (or initialize)
                    if (!storyData.pages) storyData.pages = [];
                    // Find the original page generated by the story worker to preserve text
                    const safeExistingPage = storyData.pages[i] || {};

                    storyData.pages[i] = {
                        ...safeExistingPage,
                        pageNumber: i + 1,
                        text: safeExistingPage.text || promptBlock.storyText, // CRITICAL FIX: Retain original text
                        illustrationUrl: finalUrl, // NOW USES BUCKET URL (~100 bytes) INSTEAD OF BASE64 (10 MB)
                        promptDetails: promptBlock
                    };

                    pagesUpdated++;

                } catch (imgError: any) {
                    console.error(`[IllustrationWorker] Failed on Spread ${i + 1}`, imgError);
                    allCompleted = false;

                    // Log specific failure to audit log for visibility
                    await supabase.from('event_audit_log').insert({
                        event_type: 'error',
                        order_id: orderId,
                        details: {
                            error: imgError.message || String(imgError),
                            spread_number: i + 1,
                            context: 'illustration_generation'
                        }
                    });
                }

                // Sleep to respect LLM rate limits / backpressure
                await new Promise(resolve => setTimeout(resolve, 2000));
            }

            // Sync Partial/Full progress back to the database
            await supabase.from('orders').update({ story_data: storyData }).eq('order_number', orderId);

            if (!allCompleted) {
                // Not all spreads finished. We throw an error to trigger the WorkerUtils retry backoff.
                throw new Error("DETERMINISTIC: One or more illustrations failed to generate during the batch loop.");
            }

            // --------------------------------------------------------
            // 3. SUCCESS COMPLETION
            // --------------------------------------------------------
            console.log(`[IllustrationWorker] Completed Job ${jobId}. All illustrations processed.`);

            await supabase.from('orders').update({ status: 'illustrations_ready' }).eq('order_number', orderId);

            await supabase.from('event_audit_log').insert({
                event_type: 'illustration_batch_completed',
                order_id: orderId,
                details: { timestamp: new Date(), successfully_generated: pagesUpdated }
            });

            await supabase.from('order_jobs').update({
                status: 'completed',
                finished_at: new Date().toISOString()
            }).eq('id', jobId);

            // Dispatch Compilation Queue
            await MasterScheduler.dispatchJob(orderId, 'compilation');

        } catch (error: any) {
            console.error(`[IllustrationWorker] Fatal Error executing job ${jobId}:`, error);
            await WorkerUtils.handleJobFailure(jobId, orderId, error, attempts);
        }
    }
}
