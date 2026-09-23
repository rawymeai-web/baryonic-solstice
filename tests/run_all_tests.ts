import { runArchitectureTests } from './architecture.test';
import { runFastProductionTests } from './fast_production.test';
import { runGenerationContractTests } from './generation_contracts.test';
import { runE2EProductionPipelineTests } from './e2e_production_pipeline.test';
import { runGlobalOverridePrecedenceTests } from './global_override_precedence.test';
import { runQAContractPersistenceTests } from './qa_contract_persistence.test';
import { runAtomicDistributedLeaseTests } from './atomic_distributed_lease.test';
import { runRegexSafetyTests } from './regex_safety.test';
import { runModelFallbackTests } from './model_fallback.test';

async function main() {
    console.log('\n================================================================');
    console.log('🚀 MASTER PRODUCTION QUALITY ASSURANCE & ARCHITECTURE SUITE');
    console.log('================================================================\n');

    let totalPassed = 0;
    let totalFailed = 0;

    const res1 = await runArchitectureTests();
    totalPassed += res1.passed;
    totalFailed += res1.failed;

    const res2 = await runFastProductionTests();
    totalPassed += res2.passed;
    totalFailed += res2.failed;

    const res3 = await runGenerationContractTests();
    totalPassed += res3.passed;
    totalFailed += res3.failed;

    const res4 = await runE2EProductionPipelineTests();
    totalPassed += res4.passed;
    totalFailed += res4.failed;

    const res5 = await runGlobalOverridePrecedenceTests();
    totalPassed += res5.passed;
    totalFailed += res5.failed;

    const res6 = await runQAContractPersistenceTests();
    totalPassed += res6.passed;
    totalFailed += res6.failed;

    const res7 = await runAtomicDistributedLeaseTests();
    totalPassed += res7.passed;
    totalFailed += res7.failed;

    const res8 = await runRegexSafetyTests();
    totalPassed += res8.passed;
    totalFailed += res8.failed;

    const res9 = await runModelFallbackTests();
    totalPassed += res9.passed;
    totalFailed += res9.failed;

    console.log('================================================================');
    console.log(`🏁 GRAND TOTAL: ${totalPassed} PASSED, ${totalFailed} FAILED`);
    console.log('================================================================\n');

    if (totalFailed > 0) {
        console.error(`❌ Suite failed with ${totalFailed} errors.`);
        process.exit(1);
    } else {
        console.log(`✅ All ${totalPassed} master architectural assertions passed with 100% compliance.`);
        process.exit(0);
    }
}

main().catch((err) => {
    console.error('Fatal test execution failure:', err);
    process.exit(1);
});
