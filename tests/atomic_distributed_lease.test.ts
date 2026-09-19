import { 
    DistributedLeaseManager, 
    DistributedLeaseError, 
    sharedInMemoryLeaseStore 
} from '../src/services/generation/distributedLeaseManager';

export async function runAtomicDistributedLeaseTests(): Promise<{ passed: number; failed: number }> {
    console.log('================================================================');
    console.log('🧪 RUNNING ATOMIC DISTRIBUTED LEASE & CONCURRENCY SUITE');
    console.log('================================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(condition: boolean, testName: string, detail?: string) {
        if (condition) {
            console.log(`✅ [PASS] ${testName}`);
            passed++;
        } else {
            console.error(`❌ [FAIL] ${testName}${detail ? ` - ${detail}` : ''}`);
            failed++;
        }
    }

    // -------------------------------------------------------------------------
    // 1. Multi-Instance Upfront Atomic Slot Pacing
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Atomic Slot Pacing Across Independent Instances ---');
    {
        // Reset shared store
        sharedInMemoryLeaseStore.clear();

        const minIntervalMs = 150;
        const maxConcurrent = 3;

        // Simulate two independent limiter instances in separate serverless/worker contexts
        const instance1 = new DistributedLeaseManager({
            resourceKey: 'test-resource-pacing',
            minIntervalMs,
            maxConcurrent,
            leaseTimeoutMs: 5000,
            maxQueueWaitMs: 10000
        });

        const instance2 = new DistributedLeaseManager({
            resourceKey: 'test-resource-pacing',
            minIntervalMs,
            maxConcurrent,
            leaseTimeoutMs: 5000,
            maxQueueWaitMs: 10000
        });

        const startTime = Date.now();

        // Launch 3 requests simultaneously across the two instances
        const [lease1, lease2, lease3] = await Promise.all([
            instance1.acquireLease('req-1'),
            instance2.acquireLease('req-2'),
            instance1.acquireLease('req-3')
        ]);

        assert(!!lease1.leaseId && !!lease2.leaseId && !!lease3.leaseId, 'All 3 leases successfully acquired');

        // Check scheduled start times
        const scheduled = [lease1.scheduledStartTime, lease2.scheduledStartTime, lease3.scheduledStartTime].sort((a, b) => a - b);
        const diff1 = scheduled[1] - scheduled[0];
        const diff2 = scheduled[2] - scheduled[1];

        assert(diff1 >= minIntervalMs - 10, `Interval between slot 1 and 2 is at least ${minIntervalMs}ms (actual: ${diff1}ms)`);
        assert(diff2 >= minIntervalMs - 10, `Interval between slot 2 and 3 is at least ${minIntervalMs}ms (actual: ${diff2}ms)`);

        // Clean up leases
        await lease1.release();
        await lease2.release();
        await lease3.release();
    }

    // -------------------------------------------------------------------------
    // 2. Concurrency Limit Enforcement & Slot Release
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Concurrency Limit Enforcement & Slot Release ---');
    {
        sharedInMemoryLeaseStore.clear();

        const manager = new DistributedLeaseManager({
            resourceKey: 'test-resource-concurrency',
            minIntervalMs: 50,
            maxConcurrent: 2,
            leaseTimeoutMs: 5000,
            maxQueueWaitMs: 400
        });

        const l1 = await manager.acquireLease('conc-1');
        const l2 = await manager.acquireLease('conc-2');

        assert(!!l1 && !!l2, 'Acquired maximum 2 concurrent active leases');

        // Attempting to acquire a 3rd lease while 2 are held should time out on queue wait
        let rejected = false;
        try {
            await manager.acquireLease('conc-3');
        } catch (err: any) {
            if (err instanceof DistributedLeaseError) {
                rejected = true;
            }
        }
        assert(rejected, 'Rejected 3rd acquisition when maxConcurrent=2 and all slots held');

        // Release one slot
        await l1.release();

        // Now acquisition should succeed immediately
        const l3 = await manager.acquireLease('conc-3');
        assert(!!l3.leaseId, 'Acquired lease immediately after releasing a slot');

        await l2.release();
        await l3.release();
    }

    // -------------------------------------------------------------------------
    // 3. Crash Recovery via Lease Timeout Expiration
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Crash Recovery via Lease Timeout Expiration ---');
    {
        sharedInMemoryLeaseStore.clear();

        const shortTimeoutManager = new DistributedLeaseManager({
            resourceKey: 'test-resource-crash',
            minIntervalMs: 20,
            maxConcurrent: 1,
            leaseTimeoutMs: 120, // 120ms timeout
            maxQueueWaitMs: 1000
        });

        // Worker 1 acquires lease and "crashes" (never calls release())
        const crashLease = await shortTimeoutManager.acquireLease('crashed-worker');
        assert(!!crashLease.leaseId, 'Crashed worker acquired lease');

        // Worker 2 attempts to acquire. Should wait until Worker 1 lease times out (120ms) then succeed
        const worker2Start = Date.now();
        const recoveredLease = await shortTimeoutManager.acquireLease('recovery-worker');
        const elapsed = Date.now() - worker2Start;

        assert(!!recoveredLease.leaseId, 'Recovery worker successfully acquired slot after lease timeout');
        assert(elapsed >= 100, `Recovery occurred after crash timeout elapsed (${elapsed}ms >= 100ms)`);

        await recoveredLease.release();
    }

    console.log('\n================================================================');
    console.log(`🏁 ATOMIC DISTRIBUTED LEASE SUITE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    return { passed, failed };
}
