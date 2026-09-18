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
     * Reclaims stale/crashed jobs and advances any stuck orders.
     */
    static async executeTick() {
        const hasLock = await this.acquireDistributedLock();
        if (!hasLock) return;

        try {
            await this.reclaimStaleJobs();
            await this.advanceOrphanedOrders();
            await this.checkSystemHealth();
            await this.processQueuedOrders();
            await this.processBlueprintGenerations();
            await this.processCharacterGenerations();
            await this.processStoryGenerations();
            await this.processIllustrationGenerations();
            await this.processCompilations();
            await this.processPreviewTimeouts();
        } catch (e: any) {
            console.error(`[Scheduler] Error during tick execution:`, e);
        } finally {
            // Best effort release
            try {
                await supabase.from('system_locks').delete().eq('lock_name', 'master_scheduler');
            } catch (e) {}
        }
    }

    /**
     * Reclaims jobs that were marked 'running' but never finished due to process restarts or timeouts.
     */
    static async reclaimStaleJobs() {
        try {
            const staleThreshold = new Date(Date.now() - 6.5 * 60 * 1000).toISOString(); // 6.5 minutes
            const { data: staleJobs, error } = await supabase
                .from('order_jobs')
                .select('*')
                .eq('status', 'running')
                .lt('started_at', staleThreshold);

            if (error || !staleJobs || staleJobs.length === 0) return;

            console.warn(`[Scheduler] Found ${staleJobs.length} stale/interrupted running jobs. Reclaiming...`);

            for (const job of staleJobs) {
                if ((job.attempts || 0) < 3) {
                    console.log(`[Scheduler] Resetting stale job ${job.id} (${job.job_type}) for order ${job.order_id} back to queued`);
                    await supabase
                        .from('order_jobs')
                        .update({
                            status: 'queued',
                            started_at: null,
                            attempts: (job.attempts || 0) + 1
                        })
                        .eq('id', job.id);

                    // Re-dispatch in background immediately
                    this.spawnWorker(job.id, job.order_id, job.job_type, (job.attempts || 0) + 1);
                } else {
                    console.error(`[Scheduler] Job ${job.id} (${job.job_type}) for order ${job.order_id} exceeded max attempts (3). Marking failed.`);
                    await supabase
                        .from('order_jobs')
                        .update({
                            status: 'failed',
                            error_message: 'Stale job exceeded maximum retry attempts (3)'
                        })
                        .eq('id', job.id);

                    await supabase
                        .from('orders')
                        .update({
                            status: 'on_hold',
                            error_message: `Generation interrupted: ${job.job_type} job stalled`
                        })
                        .eq('order_number', job.order_id);
                }
            }
        } catch (err: any) {
            console.warn('[Scheduler] Error reclaiming stale jobs:', err);
        }
    }

    /**
     * Finds any order stuck in an intermediate stage that lacks an active queued/running job,
     * and automatically dispatches the appropriate worker.
     */
    static async advanceOrphanedOrders() {
        try {
            const activeStatuses = [
                'queued',
                'paid_confirmed',
                'blueprint_generating',
                'blueprint_ready',
                'character_generating',
                'character_ready',
                'story_generating',
                'story_ready',
                'illustrations_generating',
                'illustrations_ready',
                'compiling'
            ];

            const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
            const { data: orders, error } = await supabase
                .from('orders')
                .select('order_number, status, subscription_id')
                .in('status', activeStatuses)
                .gte('created_at', sevenDaysAgo)
                .order('created_at', { ascending: false })
                .limit(50);

            if (error || !orders || orders.length === 0) return;

            for (const order of orders) {
                const { data: jobs } = await supabase
                    .from('order_jobs')
                    .select('id, job_type, status')
                    .eq('order_id', order.order_number);

                const hasActiveJob = jobs?.some(j => ['queued', 'running'].includes(j.status));
                if (hasActiveJob) continue; // Currently active, do not disturb

                console.log(`[Scheduler] Order ${order.order_number} is in status '${order.status}' without active job. Advancing...`);

                switch (order.status) {
                    case 'queued':
                    case 'paid_confirmed':
                    case 'blueprint_generating':
                        await supabase.from('orders').update({ status: 'blueprint_generating' }).eq('order_number', order.order_number);
                        await this.dispatchJob(order.order_number, 'blueprint');
                        break;
                    case 'blueprint_ready':
                    case 'character_generating':
                        await supabase.from('orders').update({ status: 'character_generating' }).eq('order_number', order.order_number);
                        await this.dispatchJob(order.order_number, 'character');
                        break;
                    case 'character_ready':
                    case 'story_generating':
                        await supabase.from('orders').update({ status: 'story_generating' }).eq('order_number', order.order_number);
                        await this.dispatchJob(order.order_number, 'story');
                        break;
                    case 'story_ready':
                    case 'illustrations_generating':
                        await supabase.from('orders').update({ status: 'illustrations_generating' }).eq('order_number', order.order_number);
                        await this.dispatchJob(order.order_number, 'illustration');
                        break;
                    case 'illustrations_ready':
                    case 'compiling':
                        await supabase.from('orders').update({ status: 'compiling' }).eq('order_number', order.order_number);
                        await this.dispatchJob(order.order_number, 'compilation');
                        break;
                    default:
                        break;
                }
            }
        } catch (err: any) {
            console.warn('[Scheduler] Error advancing orphaned orders:', err);
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
        }
        if ((failedJobs || 0) > 10) {
            console.error(`[ALERT] HIGH FAILURE RATE! ${failedJobs} jobs in terminal failure state requiring admin intervention.`);
        }
    }

    /**
     * Prevents multiple crons or worker nodes from executing the same cycle simultaneously.
     */
    static async acquireDistributedLock(): Promise<boolean> {
        const now = new Date();
        const lockExpiry = new Date(now.getTime() + (60 * 1000)); // 60s lock

        try {
            const { data: existing } = await supabase.from('system_locks').select('locked_until').eq('lock_name', 'master_scheduler').maybeSingle();

            if (existing && new Date(existing.locked_until) > now) {
                return false;
            }

            const { error } = await supabase.from('system_locks').upsert({
                lock_name: 'master_scheduler',
                locked_until: lockExpiry.toISOString()
            });

            if (error) {
                // If system_locks table doesn't exist or transient DB lock error, allow execution
                return true;
            }
            return true;
        } catch (e) {
            return true;
        }
    }

    /**
     * Finds orders that are 'queued' (Paid successfully) and assigns them a theme,
     * transitioning them to 'story_generating' if successful.
     */
    static async processQueuedOrders() {
        const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString();
        const { data: orders } = await supabase
            .from('orders')
            .select('order_number, subscription_id, story_data')
            .in('status', ['queued', 'paid_confirmed'])
            .gte('created_at', sevenDaysAgo)
            .order('created_at', { ascending: false })
            .limit(10);

        if (!orders || orders.length === 0) return;

        console.log(`[Scheduler] Found ${orders.length} queued orders to process.`);

        for (const order of orders) {
            try {
                if (order.subscription_id) {
                    const { data: sub } = await supabase.from('subscriptions').select('hero_id').eq('id', order.subscription_id).single();
                    if (!sub?.hero_id) {
                        console.error(`Subscription ${order.subscription_id} missing hero_id`);
                        await supabase.from('orders').update({ status: 'on_hold', error_message: 'Missing hero_id' }).eq('order_number', order.order_number);
                        continue;
                    }

                    const result = await ThemeAssignmentEngine.assignThemeForOrder(order.order_number, order.subscription_id, sub.hero_id);

                    if (result.success && result.themeId) {
                        await this.dispatchJob(order.order_number, 'story');
                    }
                } else {
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
     * Spawns a worker asynchronously to execute the job immediately.
     */
    static spawnWorker(jobId: string, orderId: string, jobType: string, attempts: number = 0) {
        (async () => {
            try {
                switch (jobType) {
                    case 'blueprint':
                        await BlueprintWorker.processJob(jobId, orderId, attempts);
                        break;
                    case 'character':
                        await CharacterWorker.processJob(jobId, orderId, attempts);
                        break;
                    case 'story':
                        await StoryWorker.processJob(jobId, orderId, attempts);
                        break;
                    case 'illustration':
                        await IllustrationWorker.processJob(jobId, orderId, attempts);
                        break;
                    case 'compilation':
                        await CompilationWorker.processJob(jobId, orderId, attempts);
                        break;
                    default:
                        break;
                }
            } catch (bgErr) {
                console.error(`[Scheduler] Autonomous worker execution error for ${jobType} on order ${orderId}:`, bgErr);
            }
        })().catch(() => {});
    }

    /**
     * Queueing logic to populate the target worker queue.
     * Prevents duplicate active jobs by checking status.
     */
    static async dispatchJob(orderId: string, jobType: 'blueprint' | 'character' | 'story' | 'illustration' | 'compilation' | 'print_handoff') {
        const { data: existing } = await supabase
            .from('order_jobs')
            .select('id, status, started_at')
            .eq('order_id', orderId)
            .eq('job_type', jobType);

        // Check if there is an active job that isn't stale
        const now = Date.now();
        const activeJob = existing?.find(j => {
            if (j.status === 'queued') return true;
            if (j.status === 'running') {
                const started = j.started_at ? new Date(j.started_at).getTime() : now;
                return (now - started) < (6.5 * 60 * 1000); // Only treat as active if under 6.5 min
            }
            return false;
        });

        if (activeJob) {
            console.log(`[Scheduler] Job ${jobType} already actively running for ${orderId}`);
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

        // AUTONOMOUS BACKGROUND EXECUTION TRIGGER
        this.spawnWorker(jobId, orderId, jobType, 0);
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

        await Promise.allSettled(
            jobs.map(job => BlueprintWorker.processJob(job.id, job.order_id, job.attempts))
        );
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

        await Promise.allSettled(
            jobs.map(job => CharacterWorker.processJob(job.id, job.order_id, job.attempts))
        );
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

        await Promise.allSettled(
            jobs.map(job => StoryWorker.processJob(job.id, job.order_id, job.attempts))
        );
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

        // Fast Production Mode: 2 controlled concurrent workers
        await Promise.allSettled(
            jobs.map(job => IllustrationWorker.processJob(job.id, job.order_id, job.attempts))
        );
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

        await Promise.allSettled(
            jobs.map(job => CompilationWorker.processJob(job.id, job.order_id, job.attempts))
        );
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

// ============================================================================
// AUTONOMOUS BACKGROUND SCHEDULER HEARTBEAT (Node / Local Backend Server)
// Runs continuously every 12 seconds so orders progress 100% unattended
// without requiring any admin dashboard or customer browser tab to stay open.
// ============================================================================
let schedulerInterval: any = null;

export function ensureBackgroundScheduler() {
    if (typeof window !== 'undefined') return; // Server only
    if (schedulerInterval) return;

    console.log('[MasterScheduler] Autonomous background heartbeat started (12s interval).');
    schedulerInterval = setInterval(() => {
        MasterScheduler.executeTick().catch(err => {
            // Silently handle tick exceptions so server loop never dies
            console.warn('[BackgroundScheduler] Heartbeat tick notice:', err?.message || err);
        });
    }, 12000);

    // Run initial tick immediately on startup
    setTimeout(() => {
        MasterScheduler.executeTick().catch(() => {});
    }, 1500);
}

// Auto-activate on server import
try {
    ensureBackgroundScheduler();
} catch (e) {}
