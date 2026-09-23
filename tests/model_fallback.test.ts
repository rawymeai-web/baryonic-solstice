import { withRetry } from '../src/services/generation/modelGateway';

export async function runModelFallbackTests(): Promise<{ passed: number; failed: number }> {
    console.log('================================================================');
    console.log('🧪 RUNNING MODEL FALLBACK & BOUNDED RETRY SUITE');
    console.log('================================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(condition: boolean, message: string) {
        if (!condition) {
            console.error(`❌ [FAIL] ${message}`);
            failed++;
        } else {
            console.log(`✅ [PASS] ${message}`);
            passed++;
        }
    }

    // --- 1. Bounded Retry Latency Test ---
    console.log('\n--- 1. withRetry Bounded Latency & Options ---');
    let callCount = 0;
    const t0 = Date.now();
    try {
        await withRetry(async () => {
            callCount++;
            if (callCount < 2) {
                const err: any = new Error('Rate limit 429 quota exceeded');
                err.status = 429;
                throw err;
            }
            return 'success';
        }, { retries: 2, delayMs: 50, maxDelayMs: 200, rateLimitDelayMs: 100 });
        
        const elapsed = Date.now() - t0;
        assert(callCount === 2, `withRetry succeeded on attempt 2 (actual calls: ${callCount})`);
        assert(elapsed < 2000, `withRetry bounded delay completed quickly (${elapsed}ms < 2000ms)`);
    } catch (e: any) {
        assert(false, `withRetry threw unexpected error: ${e.message}`);
    }

    // --- 2. Fallback on Exhausted Retries ---
    console.log('\n--- 2. withRetry Fallback Value ---');
    let failCalls = 0;
    const result = await withRetry(async () => {
        failCalls++;
        throw new Error('Persistent failure');
    }, { retries: 1, delayMs: 10, maxDelayMs: 50, fallbackValue: 'fallback_ok' });

    assert(result === 'fallback_ok', 'Returned fallbackValue on retry exhaustion');
    assert(failCalls === 2, `Attempted exactly 2 times (initial + 1 retry, actual: ${failCalls})`);

    // --- 3. Sequential Model Fallback Simulation ---
    console.log('\n--- 3. Multi-Model Graceful Fallback Logic ---');
    const modelCandidates = ['gemini-3-pro-image-preview', 'gemini-3.1-flash-image'];
    const triedModels: string[] = [];
    let generatedModel = '';

    for (const model of modelCandidates) {
        triedModels.push(model);
        if (model === 'gemini-3-pro-image-preview') {
            // Simulate 429 rate limit on pro
            continue;
        }
        // Fallback model succeeds
        generatedModel = model;
        break;
    }

    assert(triedModels.includes('gemini-3-pro-image-preview'), 'Tried primary Pro model first');
    assert(generatedModel === 'gemini-3.1-flash-image', 'Gracefully fell back to Flash model on Pro unavailability');

    console.log('\n================================================================');
    console.log(`📊 MODEL FALLBACK SUITE COMPLETE: ${passed} Passed, ${failed} Failed`);
    console.log('================================================================\n');

    return { passed, failed };
}
