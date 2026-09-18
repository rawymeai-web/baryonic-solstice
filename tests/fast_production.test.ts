import { isDefiniteHardFailure, QualityCheckResult } from '../src/services/visual/qualityAgent';

export async function runFastProductionTests(): Promise<{ passed: number; failed: number }> {
    console.log('================================================================');
    console.log('🧪 RUNNING FAST PRODUCTION MODE CONTRACT TESTS');
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

    // 1. Hard Failure vs Borderline Classification
    const passQC: QualityCheckResult = {
        visualDescription: 'A child smiling in a garden.',
        overallLikenessScore: 8,
        likenessScore: 8,
        characterConsistencyStatus: 'pass',
        characterReasoning: 'Great match.',
        wardrobeConsistencyStatus: 'pass',
        wardrobeReasoning: 'Matches outfit.',
        styleConsistencyStatus: 'pass',
        styleReasoning: 'Matches style.',
        propConsistencyStatus: 'pass',
        propReasoning: 'Prop is accurate.',
        textClearanceStatus: 'pass',
        textReasoning: 'Clear text side.',
        recommendedTextSide: 'Right',
        narrativeAdherenceStatus: 'pass',
        narrativeAdherenceReasoning: 'Matches story beat.',
        overallDecision: 'pass',
        heroResults: [
            {
                heroToken: '[[HERO_1]]',
                label: 'Hero A',
                name: 'Hero A',
                likenessScore: 8,
                characterConsistencyStatus: 'pass',
                reasoning: 'Great match.'
            }
        ]
    };

    assert(!isDefiniteHardFailure(passQC), 'Clean passing QC is NOT a hard failure');

    // Likeness below threshold (< 7)
    const lowLikenessQC: QualityCheckResult = {
        ...passQC,
        likenessScore: 6,
        characterConsistencyStatus: 'fail',
        overallDecision: 'fail'
    };
    assert(isDefiniteHardFailure(lowLikenessQC), 'LikenessScore < 7 is classified as a definite hard failure');

    // Severe Style Mutation
    const styleFailQC: QualityCheckResult = {
        ...passQC,
        styleConsistencyStatus: 'fail',
        overallDecision: 'fail'
    };
    assert(isDefiniteHardFailure(styleFailQC), 'StyleConsistency fail is classified as a definite hard failure');

    // Severe Prop Mutation
    const propFailQC: QualityCheckResult = {
        ...passQC,
        propConsistencyStatus: 'fail',
        overallDecision: 'fail'
    };
    assert(isDefiniteHardFailure(propFailQC), 'PropConsistency fail is classified as a definite hard failure');

    // Contradictory Narrative Scene Action
    const narrativeFailQC: QualityCheckResult = {
        ...passQC,
        narrativeAdherenceStatus: 'fail',
        overallDecision: 'fail'
    };
    assert(isDefiniteHardFailure(narrativeFailQC), 'NarrativeAdherence fail is classified as a definite hard failure');

    // Cosmetic / Borderline: Wardrobe Mismatch Only (Should NOT trigger automated retry)
    const wardrobeOnlyQC: QualityCheckResult = {
        ...passQC,
        wardrobeConsistencyStatus: 'fail',
        overallDecision: 'fail'
    };
    assert(!isDefiniteHardFailure(wardrobeOnlyQC), 'Wardrobe mismatch alone is NOT a hard failure (routed to admin review)');

    // Cosmetic / Layout: Text Clearance Issue Only (Should NOT trigger automated retry)
    const clearanceOnlyQC: QualityCheckResult = {
        ...passQC,
        textClearanceStatus: 'fail',
        overallDecision: 'fail'
    };
    assert(!isDefiniteHardFailure(clearanceOnlyQC), 'Text clearance issue alone is NOT a hard failure (handled via layout offset)');

    // Borderline Needs Review with Likeness >= 7
    const needsReviewQC: QualityCheckResult = {
        ...passQC,
        likenessScore: 7,
        characterConsistencyStatus: 'needs_review',
        overallDecision: 'flagged'
    };
    assert(!isDefiniteHardFailure(needsReviewQC), 'Needs review with likeness >= 7 is NOT an automated hard failure');

    // Dual-Hero: Hero B Failure is correctly detected
    const dualHeroFailBQC: QualityCheckResult = {
        ...passQC,
        heroResults: [
            {
                heroToken: '[[HERO_1]]',
                label: 'Hero A',
                name: 'Hero A',
                likenessScore: 8,
                characterConsistencyStatus: 'pass',
                reasoning: 'Good match.'
            },
            {
                heroToken: '[[HERO_2]]',
                label: 'Hero B',
                name: 'Hero B',
                likenessScore: 5,
                characterConsistencyStatus: 'fail',
                reasoning: 'Hero B distorted.'
            }
        ],
        characterConsistencyStatus: 'fail',
        overallDecision: 'fail'
    };
    assert(isDefiniteHardFailure(dualHeroFailBQC), 'Hero B low likeness (<7) or fail status triggers hard failure');

    // Biometric subcriteria failure (e.g. hairColor failure) triggers hard failure
    const biometricFailQC: QualityCheckResult = {
        ...passQC,
        heroResults: [
            {
                heroToken: '[[HERO_1]]',
                label: 'Hero A',
                name: 'Hero A',
                likenessScore: 8,
                characterConsistencyStatus: 'fail',
                hairConsistency: 'fail',
                reasoning: 'Hair color wrong.'
            }
        ],
        characterConsistencyStatus: 'fail',
        overallDecision: 'fail'
    };
    assert(isDefiniteHardFailure(biometricFailQC), 'Biometric subcriterion fail triggers hard failure');

    console.log(`\n================================================================`);
    console.log(`📊 FAST PRODUCTION SUITE COMPLETE: ${passed} Passed, ${failed} Failed`);
    console.log(`================================================================\n`);

    return { passed, failed };
}
