import { runArchitectureTests } from './architecture.test';
import { runFastProductionTests } from './fast_production.test';
import { runGenerationContractTests } from './generation_contracts.test';
import { runE2EProductionPipelineTests } from './e2e_production_pipeline.test';

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
