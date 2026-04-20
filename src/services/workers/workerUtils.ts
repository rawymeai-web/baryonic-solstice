import { supabase } from '@/utils/supabaseClient';

export class WorkerUtils {
    // 5 Minute Timeout
    static async withTimeout<T>(promise: Promise<T>, ms: number = 300000): Promise<T> {
        let timer: NodeJS.Timeout;
        const timeoutPromise = new Promise<never>((_, reject) => {
            timer = setTimeout(() => {
                reject(new Error('JOB_TIMEOUT'));
            }, ms);
        });

        return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
    }

    /**
     * Classifies an AI generation error to determine the retry strategy.
     */
    static classifyError(error: any): 'transient' | 'content' | 'deterministic' {
        const msg = error?.message?.toLowerCase() || '';

        // Timeout or network issues
        if (msg.includes('timeout') || msg.includes('network') || msg.includes('fetch') || msg.includes('502') || msg.includes('503') || msg.includes('429')) {
            return 'transient';
        }

        // Safety filter or bad generation structure
        if (msg.includes('safety') || msg.includes('content policy') || msg.includes('failed to parse json') || msg.includes('schema mismatch')) {
            return 'content';
        }

        // Invalid key, quota exceeded, bad request format
        return 'deterministic';
    }

    /**
     * Exponential Backoff Calculator
     * Attempt 1: 30s
     * Attempt 2: 120s (2m)
     * Attempt 3: 600s (10m)
     */
    static calculateBackoff(attempts: number): number {
        if (attempts === 1) return 30 * 1000;
        if (attempts === 2) return 120 * 1000;
        return 600 * 1000;
    }

    /**
     * Updates a job on failure, executing the exponential backoff policy and state machine escalation.
     */
    static async handleJobFailure(jobId: string, orderId: string, error: any, currentAttempts: number) {
        const errorClass = this.classifyError(error);
        console.error(`[WorkerUtils] Job ${jobId} failed. Class: ${errorClass}, Message: ${error.message}`);

        if (errorClass === 'deterministic') {
            // Deterministic errors immediately halt the pipeline. No retries.
            await supabase.from('order_jobs').update({ status: 'failed', error_message: `DETERMINISTIC: ${error.message}` }).eq('id', jobId);
            await supabase.from('orders').update({ status: 'on_hold', error_message: `Halted due to deterministic AI error: ${error.message}` }).eq('order_number', orderId);
            return;
        }

        const newAttempts = currentAttempts + 1;

        if (newAttempts >= 3) {
            // Exceeded max retries (3)
            await supabase.from('order_jobs').update({ status: 'failed', error_message: `MAX_RETRIES_EXCEEDED: ${error.message}` }).eq('id', jobId);
            await supabase.from('orders').update({ status: 'on_hold', error_message: `Pipeline stalled. Max retries exceeded on job ${jobId}.` }).eq('order_number', orderId);
        } else {
            // Re-queue with backoff (We just mark it queued, the scheduler could respect a 'run_after' time or we just delay it inherently)
            // For now, setting status to 'queued' allows it to be picked up again immediately by the scheduler, 
            // but in a true distributed system we'd set a 'next_run_at'. We'll simulate by updating standard metadata.
            await supabase.from('order_jobs').update({
                status: 'queued',
                attempts: newAttempts,
                error_message: `Last error (${errorClass}): ${error.message}`
            }).eq('id', jobId);
        }
    }
}
