import { supabase } from '@/utils/supabaseClient';
import { ThemeAssignmentEngine } from './themeEngine';
import { v4 as uuidv4 } from 'uuid';
import { BlueprintWorker } from './blueprintWorker';
import { StoryWorker } from './storyWorker';
import { IllustrationWorker } from './illustrationWorker';
import { CharacterWorker } from './characterWorker';
import { CompilationWorker } from './compilationWorker';

export class MasterScheduler {

    /**
     * Executes the cron tick, picking up orders and advancing their state machines.
     * This is designed to be called by a Vercel Cron Job every 5-10 minutes.
     */
    static async executeTick() {
        console.log(`[Scheduler] Tick Triggered at ${new Date().toISOString()}`);

        const hasLock = await this.acquireDistributedLock();
        if (!hasLock) return;

        try {
            await this.checkSystemHealth();
            await this.processQueuedOrders();
            await this.processBlueprintGenerations();
            await this.processCharacterGenerations();
            await this.processStoryGenerations();
            await this.processIllustrationGenerations();
            await this.processCompilations();
            await this.processPreviewTimeouts();
        } finally {
            // Best effort release
            await supabase.from('system_locks').delete().eq('lock_name', 'master_scheduler');
        }
    }

    /**
     * System Health Monitor: Checks for massive backlogs or failing jobs, logging alerts for the Admin Ops dashboard.
     */
    static async checkSystemHealth() {
        const { count: pendingStories } = await supabase.from('order_jobs').select('*', { count: 'exact', head: true }).eq('job_type', 'story').eq('status', 'queued');
        const { count: pendingImages } = await supabase.from('order_jobs').select('*', { count: 'exact', head: true }).eq('job_type', 'illustration').eq('status', 'queued');
        const { count: failedJobs } = await supabase.from('order_jobs').select('*', { count: 'exact', head: true }).eq('status', 'failed');

        if ((pendingStories || 0) > 50 || (pendingImages || 0) > 100) {
            console.error(`[ALERT] CRITICAL Queue Backpressure! Stories: ${pendingStories}, Images: ${pendingImages}`);
            // Phase 5 integration: Send slack/email ops alert
        }
        if ((failedJobs || 0) > 10) {
            console.error(`[ALERT] HIGH FAILURE RATE! ${failedJobs} jobs in terminal failure state requiring admin intervention.`);
        }
    }

    /**
     * Prevents multiple Vercel crons or worker nodes from executing the same cycle simultaneously.
     */
    static async acquireDistributedLock(): Promise<boolean> {
        const now = new Date();
        const lockExpiry = new Date(now.getTime() + (4 * 60000)); // 4 minutes lock

        const { data: existing } = await supabase.from('system_locks').select('locked_until').eq('lock_name', 'master_scheduler').maybeSingle();

        if (existing && new Date(existing.locked_until) > now) {
            console.log(`[Scheduler] Lock held by another instance until ${existing.locked_until}. Skipping tick.`);
            return false;
        }

        const { error } = await supabase.from('system_locks').upsert({
            lock_name: 'master_scheduler',
            locked_until: lockExpiry.toISOString()
        });

        if (error) {
            console.warn(`[Scheduler] Lock acquisition failed:`, error);
            return false;
        }
        return true;
    }

    /**
     * Finds orders that are 'queued' (Paid successfully) and assigns them a theme,
     * transitioning them to 'story_generating' if successful.
     */
    static async processQueuedOrders() {
        // Fetch early, limit 5 to prevent Vercel 10s timeout constraints during bulk theme matching
        const { data: orders } = await supabase
            .from('orders')
            .select('order_number, subscription_id, story_data')
            .eq('status', 'queued')
            .limit(5);

        if (!orders || orders.length === 0) return;

        console.log(`[Scheduler] Found ${orders.length} queued orders for Theme Assignment.`);

        for (const order of orders) {
            try {
                // If it's a subscription order, we use the engine. 
                // If ONE-OFF, the frontend already assigned a theme, so we bypass to story generation.
                if (order.subscription_id) {
                    // We need the hero_id for this subscription
                    const { data: sub } = await supabase.from('subscriptions').select('hero_id').eq('id', order.subscription_id).single();
                    if (!sub?.hero_id) {
                        console.error(`Subscription ${order.subscription_id} missing hero_id`);
                        await supabase.from('orders').update({ status: 'on_hold', error_message: 'Missing hero_id' }).eq('order_number', order.order_number);
                        continue;
                    }

                    // Assign Theme
                    const result = await ThemeAssignmentEngine.assignThemeForOrder(order.order_number, order.subscription_id, sub.hero_id);

                    if (result.success && result.themeId) {
                        // Queue the actual Story Generation Job
                        await this.dispatchJob(order.order_number, 'story');
                    }
                } else {
                    // Jump straight to blueprint generation!
                    await supabase.from('orders').update({ status: 'blueprint_generating' }).eq('order_number', order.order_number);
                    await this.dispatchJob(order.order_number, 'blueprint');
                }
            } catch (err: any) {
                console.error(`[Scheduler] Failed queueing order ${order.order_number}`, err);
                await supabase.from('orders').update({ status: 'failed', error_message: err.message }).eq('order_number', order.order_number);
            }
        }
    }

    /**
     * Queueing logic to populate the target worker queue.
     * Prevents duplicate jobs by checking status.
     */
    static async dispatchJob(orderId: string, jobType: 'blueprint' | 'character' | 'story' | 'illustration' | 'compilation' | 'print_handoff') {
        const { data: existing } = await supabase
            .from('order_jobs')
            .select('id, status')
            .eq('order_id', orderId)
            .eq('job_type', jobType);

        const activeJob = existing?.find(j => ['queued', 'running'].includes(j.status));
        if (activeJob) {
            console.log(`[Scheduler] Job ${jobType} already active for ${orderId}`);
            return; // Idempotency Guard
        }

        const jobId = uuidv4();
        await supabase.from('order_jobs').insert({
            id: jobId,
            order_id: orderId,
            job_type: jobType,
            status: 'queued',
            attempts: 0
        });

        console.log(`[Scheduler] Dispatched ${jobType} job ${jobId} for order ${orderId}`);
    }

    static async processBlueprintGenerations() {
        const { data: jobs } = await supabase
            .from('order_jobs')
            .select('id, order_id, attempts')
            .eq('job_type', 'blueprint')
            .eq('status', 'queued')
            .order('created_at', { ascending: true })
            .limit(3);

        if (!jobs || jobs.length === 0) return;

        for (const job of jobs) {
            await BlueprintWorker.processJob(job.id, job.order_id, job.attempts);
        }
    }

    static async processCharacterGenerations() {
        const { data: jobs } = await supabase
            .from('order_jobs')
            .select('id, order_id, attempts')
            .eq('job_type', 'character')
            .eq('status', 'queued')
            .order('created_at', { ascending: true })
            .limit(3);

        if (!jobs || jobs.length === 0) return;

        for (const job of jobs) {
            await CharacterWorker.processJob(job.id, job.order_id, job.attempts);
        }
    }

    static async processStoryGenerations() {
        const { data: jobs } = await supabase
            .from('order_jobs')
            .select('id, order_id, attempts')
            .eq('job_type', 'story')
            .eq('status', 'queued')
            .order('created_at', { ascending: true })
            .limit(3);

        if (!jobs || jobs.length === 0) return;

        for (const job of jobs) {
            // We await here to respect limits, but in a real lambda architecture we might fan out.
            await StoryWorker.processJob(job.id, job.order_id, job.attempts);
        }
    }

    static async processIllustrationGenerations() {
        const { data: jobs } = await supabase
            .from('order_jobs')
            .select('id, order_id, attempts')
            .eq('job_type', 'illustration')
            .eq('status', 'queued')
            .order('created_at', { ascending: true })
            .limit(2);

        if (!jobs || jobs.length === 0) return;

        for (const job of jobs) {
            await IllustrationWorker.processJob(job.id, job.order_id, job.attempts);
        }
    }

    static async processCompilations() {
        const { data: jobs } = await supabase
            .from('order_jobs')
            .select('id, order_id, attempts')
            .eq('job_type', 'compilation')
            .eq('status', 'queued')
            .order('created_at', { ascending: true })
            .limit(3);

        if (!jobs || jobs.length === 0) return;

        for (const job of jobs) {
            await CompilationWorker.processJob(job.id, job.order_id, job.attempts);
        }
    }

    /**
     * Finds orders trapped in Yearly Preview state that have exceeded the 72-hour approval window.
     * Forces them into the Print Handoff queue.
     */
    static async processPreviewTimeouts() {
        // Query orders stuck in awaiting_preview_approval
        const { data: delayedOrders } = await supabase
            .from('orders')
            .select('id')
            .eq('status', 'awaiting_preview_approval');

        if (!delayedOrders || delayedOrders.length === 0) return;

        console.log(`[Scheduler] Scanning ${delayedOrders.length} Yearly Orders for Preview Timeout...`);

        for (const order of delayedOrders) {
            // Check the audit log for the precise deadline
            const { data: eventLog } = await supabase
                .from('event_audit_log')
                .select('details')
                .eq('order_id', order.id)
                .eq('event_type', 'preview_ready')
                .order('created_at', { ascending: false })
                .limit(1)
                .maybeSingle();

            if (!eventLog || !eventLog.details?.timeout_deadline) continue;

            const deadline = new Date(eventLog.details.timeout_deadline as string);

            if (new Date() > deadline) {
                console.warn(`[Scheduler] Order ${order.id} exceeded 72 Hr Preview Window. Auto-pushing to Print.`);

                // Approve and send to print queue
                await supabase.from('orders').update({
                    status: 'softcopy_ready',
                    error_message: 'Auto-approved due to 72h user timeout'
                }).eq('id', order.id);

                await supabase.from('event_audit_log').insert({
                    event_type: 'preview_timeout_pushed',
                    order_id: order.id,
                    details: { original_deadline: eventLog.details.timeout_deadline, action: "AUTO_PUSH_PRINT" }
                });

                await this.dispatchJob(order.id, 'print_handoff');
            }
        }
    }
}
