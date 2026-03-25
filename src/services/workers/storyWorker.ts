import { supabase } from '@/utils/supabaseClient';
import { generateStoryDraft } from '@/services/story/narrativeAgent';
import { runEditorPass } from '@/services/story/editorAgent';
import { generateVisualPlan } from '@/services/visual/director';
import { generatePrompts } from '@/services/visual/promptEngineer';
import { runQualityAssurance } from '@/services/visual/qualityAssurance';
import { WorkerUtils } from './workerUtils';
import { MasterScheduler } from './scheduler';

export class StoryWorker {

    /**
     * Executes a single Story Generation job pulled from the queue
     */
    static async processJob(jobId: string, orderId: string, attempts: number) {
        console.log(`[StoryWorker] Initiating Job ${jobId} for Order ${orderId}`);

        try {
            // Lock the job to 'running' using an atomic conditional update
            const { data: lockResult, error: lockErr } = await supabase
                .from('order_jobs')
                .update({ status: 'running', started_at: new Date().toISOString() })
                .eq('id', jobId)
                .eq('status', 'queued') // Concurrency lock
                .select();

            if (lockErr || !lockResult || lockResult.length === 0) {
                console.warn(`[StoryWorker] Job ${jobId} already grabbed by another worker. Aborting.`);
                return;
            }

            const { data: order, error: orderError } = await supabase
                .from('orders')
                .select('story_data, generation_snapshot, order_number')
                .eq('order_number', orderId)
                .single();

            if (orderError || !order) throw new Error("Order not found or database error");

            const storyData = order.story_data as any; // The initial blob
            const snapshot = order.generation_snapshot as any || {};

            // Extract the frozen inputs from the pre-flight snapshot
            const childAge = snapshot.age || storyData.childAge;
            const childName = storyData.childName;
            const childGender = storyData.childGender;
            const secondCharacter = storyData.secondCharacter;
            const language = storyData.language || 'en';
            const visualDNA = storyData.visualDNA;

            // --------------------------------------------------------
            // 1. GENERATE STORY (Blueprint already exists)
            // --------------------------------------------------------
            if (!storyData.blueprint) {
                throw new Error("Blueprint missing in StoryData. Sequence error.");
            }
            const blueprint = storyData.blueprint;

            console.log(`[StoryWorker] Generating Narrative Draft...`);
            const narRes = await WorkerUtils.withTimeout(generateStoryDraft(blueprint, language, childName, childGender, secondCharacter));
            if (narRes.log.status === 'Failed') throw new Error(narRes.log.outputs.error);


            console.log(`[StoryWorker] Running Editor Pass...`);
            const edRes = await WorkerUtils.withTimeout(runEditorPass(narRes.result, blueprint, language, childName, childAge));
            const script = edRes.result;

            // --------------------------------------------------------
            // 2. GENERATE VISUAL PLAN & PROMPTS
            // --------------------------------------------------------
            console.log(`[StoryWorker] Generating Visual Plan...`);
            const planRes = await WorkerUtils.withTimeout(generateVisualPlan(script, blueprint, visualDNA));
            if (planRes.log.status === 'Failed') throw new Error(planRes.log.outputs.error);
            const plan = planRes.result;

            console.log(`[StoryWorker] Engineering Prompts...`);
            const childDescription = storyData.mainCharacter?.description || '';
            const promptRes = await WorkerUtils.withTimeout(generatePrompts(
                plan, blueprint, visualDNA, childAge, childDescription, childName,
                secondCharacter, language,
                storyData.occasion,                // Pass occasion
                storyData.customIllustrationNotes, // Pass extra items
                storyData.theme                    // Pass theme
            ));

            console.log(`[StoryWorker] Running QA on Prompts...`);
            const qaRes = await WorkerUtils.withTimeout(runQualityAssurance(promptRes.result));
            const prompts = qaRes.result;

            // --------------------------------------------------------
            // 3. COMPILE AND PERSIST
            // --------------------------------------------------------
            console.log(`[StoryWorker] Saving Artifacts to Database...`);

            // Reconstruct the deep merged story data object
            const updatedStoryData = {
                ...order.story_data,
                blueprint: blueprint,
                rawScript: narRes.result,
                script: script,
                pages: script.map((p: any, i: number) => ({ pageNumber: i, text: p.text })),
                finalPrompts: script.map(() => ''), // initialize empty prompts to match length
                visualPlan: plan,
                prompts: prompts,
                // Add tracking metadata
                prompt_version: 'v4-agentic-worker-1'
            };

            // Save to DB
            await supabase.from('orders').update({
                story_data: updatedStoryData as any,
                status: 'story_ready' // Advance the main state machine
            }).eq('order_number', orderId);

            // Log event progress block
            await supabase.from('event_audit_log').insert({
                event_type: 'story_generation_completed',
                order_id: orderId,
                details: { timestamp: new Date(), prompts_generated: prompts.length }
            });

            // Mark job complete
            await supabase.from('order_jobs').update({
                status: 'completed',
                finished_at: new Date().toISOString()
            }).eq('id', jobId);

            // Trigger the next stage automatically (Illustration)
            await MasterScheduler.dispatchJob(orderId, 'illustration');

        } catch (error: any) {
            console.error(`[StoryWorker] Error executing job ${jobId}:`, error);
            await WorkerUtils.handleJobFailure(jobId, orderId, error, attempts);
        }
    }
}
