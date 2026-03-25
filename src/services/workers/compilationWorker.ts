import { supabase } from '@/utils/supabaseClient';
import { WorkerUtils } from './workerUtils';
import { EmailService } from '../notifications/emailService';
import { v4 as uuidv4 } from 'uuid';

export class CompilationWorker {

    /**
     * Executes the final Compilation job, constructing the PDF, evaluating the subscription
     * logic for Yearly Previews, and emitting Soft Copy emails.
     */
    static async processJob(jobId: string, orderId: string, attempts: number) {
        console.log(`[CompilationWorker] Initiating Job ${jobId} for Order ${orderId}`);

        try {
            await supabase.from('order_jobs').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', jobId).eq('status', 'queued').select();

            const { data: order, error } = await supabase
                .from('orders')
                .select('story_data, subscription_id, order_number')
                .eq('order_number', orderId)
                .single();

            if (error || !order || !order.story_data) throw new Error("Order data missing");

            // SIMULATE PDF COMPILATION (Would normally invoke pdf-lib or Playwright here)
            // It uses order.story_data.pages[].illustrationUrl and .text
            console.log(`[CompilationWorker] Stitching final PDF for ${order.order_number}...`);
            await new Promise(res => setTimeout(res, 3000)); // Fake compilation time

            const artifactId = uuidv4();
            const storageUrl = `internal://artifact/pdf/${artifactId}`; // Hardcoded mockup for now

            // 1. Log Artifact globally
            await supabase.from('artifacts').insert({
                id: artifactId,
                order_id: orderId,
                artifact_type: 'compiled_pdf',
                storage_url: storageUrl,
                version: 1
            });

            // 2. Evaluate Subscription Specific Routing Rules
            let nextStatus = 'softcopy_ready';
            let planType = 'one_time';

            if (order.subscription_id) {
                const { data: sub } = await supabase.from('subscriptions').select('plan').eq('id', order.subscription_id).single();
                if (sub && sub.plan) {
                    planType = sub.plan;
                }
            }

            console.log(`[CompilationWorker] Order ${orderId} resolved to Plan Type: ${planType}`);

            if (planType === 'yearly') {
                // YEARLY RULE: 1 Free Regeneration Preview Window
                nextStatus = 'awaiting_preview_approval';

                await supabase.from('orders').update({ status: nextStatus }).eq('order_number', orderId);

                // Start 72h auto-timeout tracking in events (Scheduler will pick this up)
                await supabase.from('event_audit_log').insert({
                    event_type: 'preview_ready',
                    order_id: orderId,
                    details: {
                        timestamp: new Date().toISOString(),
                        timeout_deadline: new Date(Date.now() + 72 * 60 * 60 * 1000).toISOString()
                    }
                });

                // Emit Preview Email
                await EmailService.sendNotification(orderId, 'preview_ready', { previewLink: storageUrl });

            } else {
                // MONTHLY or ONE-TIME: Direct to Print Handoff
                nextStatus = 'softcopy_ready';

                await supabase.from('orders').update({ status: nextStatus }).eq('order_number', orderId);

                await supabase.from('event_audit_log').insert({
                    event_type: 'softcopy_ready',
                    order_id: orderId,
                    details: { timestamp: new Date().toISOString() }
                });

                // Emit Softcopy Download Email
                await EmailService.sendNotification(orderId, 'softcopy_ready', { downloadLink: storageUrl });

                // Instantly queue vendor Print Handoff
                // We'll advance the state to sent_to_print in that worker.
                const { MasterScheduler } = await import('./scheduler');
                await MasterScheduler.dispatchJob(orderId, 'print_handoff');
            }

            // Cleanup
            await supabase.from('order_jobs').update({
                status: 'completed',
                finished_at: new Date().toISOString()
            }).eq('id', jobId);

            console.log(`[CompilationWorker] Successfully compiled ${orderId}. Escalate State => ${nextStatus}`);

        } catch (error: any) {
            console.error(`[CompilationWorker] Fatal Error executing job ${jobId}:`, error);
            await WorkerUtils.handleJobFailure(jobId, orderId, error, attempts);
        }
    }
}
