import { supabase } from '@/utils/supabaseClient';
import { generateBlueprint } from '@/services/story/blueprintAgent';
import { WorkerUtils } from './workerUtils';
import { MasterScheduler } from './scheduler';

export class BlueprintWorker {
    /**
     * Executes the Blueprint Generation job.
     * This is the first step in the backend pipeline after payment.
     */
    static async processJob(jobId: string, orderId: string, attempts: number) {
        console.log(`[BlueprintWorker] Initiating Job ${jobId} for Order ${orderId}`);

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

            // AUTO-DETECT LANGUAGE: If theme or title contains Arabic, force 'ar'
            const arabicRegex = /[\u0600-\u06FF]/;
            const hasArabic = arabicRegex.test(storyData.theme || '') || arabicRegex.test(storyData.title || '');
            const language = hasArabic ? 'ar' : (storyData.language || 'en');

            console.log(`[BlueprintWorker] Detected Language: ${language} (Auto-detected: ${hasArabic})`);

            console.log(`[BlueprintWorker] Generating Blueprint for ${orderId}...`);
            const bpRes = await WorkerUtils.withTimeout(generateBlueprint(storyData, language));

            if (bpRes.log.status === 'Failed') {
                throw new Error(bpRes.log.outputs.error || "Blueprint generation failed");
            }

            const blueprint = bpRes.result;

            // Merge back into story_data
            const updatedStoryData = {
                ...storyData,
                language: language, // Persist the detected language
                blueprint: blueprint
            };

            await supabase.from('orders').update({
                story_data: updatedStoryData,
                status: 'blueprint_ready'
            }).eq('order_number', orderId);

            // Mark job complete
            await supabase.from('order_jobs').update({
                status: 'completed',
                finished_at: new Date().toISOString()
            }).eq('id', jobId);

            // Audit
            await supabase.from('event_audit_log').insert({
                event_type: 'blueprint_generated',
                order_id: orderId,
                details: {
                    title: blueprint.foundation.title,
                    theme: blueprint.foundation.storyCore,
                    language: language,
                    auto_detected: hasArabic
                }
            });

            // Dispatch next step: Character Generation (DNA Anchor)
            await MasterScheduler.dispatchJob(orderId, 'character');

        } catch (error: any) {
            console.error(`[BlueprintWorker] Error:`, error);
            await WorkerUtils.handleJobFailure(jobId, orderId, error, attempts);
        }
    }
}
