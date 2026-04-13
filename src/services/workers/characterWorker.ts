import { supabase } from '@/utils/supabaseClient';
import { describeSubject, describeObjectProp, generateThemeStylePreview, generateObjectStylePreview } from '@/services/generation/imageGenerator';
import { WorkerUtils } from './workerUtils';
import { MasterScheduler } from './scheduler';

export class CharacterWorker {
    /**
     * Executes the Character Processing job.
     * Takes a raw photo and generates:
     * 1. A detailed AI text description (Text DNA).
     * 2. A high-quality character reference illustration (Visual DNA anchor).
     */
    static async processJob(jobId: string, orderId: string, attempts: number) {
        console.log(`[CharacterWorker] Initiating Job ${jobId} for Order ${orderId}`);

        try {
            // Lock the job
            const { data: lockResult, error: lockErr } = await supabase
                .from('order_jobs')
                .update({ status: 'running', started_at: new Date().toISOString() })
                .eq('id', jobId)
                .eq('status', 'queued')
                .select();

            if (lockErr || !lockResult || lockResult.length === 0) return;

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .select('story_data')
                .eq('order_number', orderId)
                .single();

            if (orderError || !order) throw new Error("Order not found");

            const storyData = order.story_data as any;
            const mainChar = storyData.mainCharacter;

            if (!mainChar || !mainChar.imageBases64 || !mainChar.imageBases64[0]) {
                console.warn(`[CharacterWorker] No image photo found for ${orderId}. Skipping character generation.`);
                // Fast-track to story if no image present
                await this.completeJob(jobId, orderId, storyData);
                return;
            }

            console.log(`[CharacterWorker] Processing Text DNA for ${orderId}...`);
            const description = await WorkerUtils.withTimeout(describeSubject(mainChar.imageBases64[0]));

            // Process Second Character DNA if it exists
            let secondDescription = "";
            let secondImageDNA = "";
            if (storyData.secondCharacter && storyData.secondCharacter.imageBases64 && storyData.secondCharacter.imageBases64[0]) {
                console.log(`[CharacterWorker] Processing Text DNA for second character in ${orderId}...`);
                if (storyData.secondCharacter.type === 'object') {
                    secondDescription = await WorkerUtils.withTimeout(describeObjectProp(storyData.secondCharacter.imageBases64[0]));
                    console.log(`[CharacterWorker] Processing Visual DNA for Object in ${orderId}...`);
                    const objectStylePreview = await WorkerUtils.withTimeout(
                        generateObjectStylePreview(
                            storyData.secondCharacter.imageBases64[0],
                            storyData.selectedStylePrompt || "high quality storybook illustration",
                            secondDescription
                        )
                    );
                    secondImageDNA = objectStylePreview.imageBase64;
                } else {
                    secondDescription = await WorkerUtils.withTimeout(describeSubject(storyData.secondCharacter.imageBases64[0]));
                    console.log(`[CharacterWorker] Processing Visual DNA for Second Character in ${orderId}...`);
                    const charStylePreview = await WorkerUtils.withTimeout(
                        generateThemeStylePreview(
                            storyData.secondCharacter as any,
                            undefined,
                            storyData.theme || "story setting",
                            storyData.selectedStylePrompt || "high quality storybook illustration",
                            storyData.secondCharacter.age || storyData.childAge || "5"
                        )
                    );
                    secondImageDNA = charStylePreview.imageBase64;
                }
            }

            console.log(`[CharacterWorker] Processing Visual DNA for Primary Character ${orderId}...`);
            const stylePreview = await WorkerUtils.withTimeout(
                generateThemeStylePreview(
                    mainChar,
                    undefined, // NEVER BUNDLE THEM TOGETHER IN THE VISION V2 ARCHITECTURE
                    storyData.theme || "story setting",
                    storyData.selectedStylePrompt || "high quality storybook illustration",
                    storyData.childAge || "5"
                )
            );

            // Update story_data with the generated DNA
            const updatedStoryData = {
                ...storyData,
                mainCharacter: {
                    ...mainChar,
                    description: description,
                    imageDNA: [stylePreview.imageBase64] // This is the definitive visual anchor
                },
                secondCharacter: storyData.secondCharacter ? {
                    ...storyData.secondCharacter,
                    description: secondDescription || storyData.secondCharacter.description,
                    imageDNA: secondImageDNA ? [secondImageDNA] : undefined // Persist the stylized object!
                } : undefined,
                selectedStylePrompt: stylePreview.prompt // Lock the style prompt used
            };

            await this.completeJob(jobId, orderId, updatedStoryData);

        } catch (error: any) {
            console.error(`[CharacterWorker] Error:`, error);
            await WorkerUtils.handleJobFailure(jobId, orderId, error, attempts);
        }
    }

    private static async completeJob(jobId: string, orderId: string, updatedStoryData: any) {
        await supabase.from('orders').update({
            story_data: updatedStoryData,
            status: 'character_ready'
        }).eq('order_number', orderId);

        await supabase.from('order_jobs').update({
            status: 'completed',
            finished_at: new Date().toISOString()
        }).eq('id', jobId);

        // Audit
        await supabase.from('event_audit_log').insert({
            event_type: 'character_processed',
            order_id: orderId,
            details: { charName: updatedStoryData.mainCharacter?.name }
        });

        // Dispatch next step: Story Generation
        await MasterScheduler.dispatchJob(orderId, 'story');
    }
}
