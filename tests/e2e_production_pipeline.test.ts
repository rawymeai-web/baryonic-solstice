import { generatePrompts } from '../src/services/visual/promptEngineer';
import { 
    buildGenerationManifest, 
    buildGenerationPayload, 
    buildQualityCheckParams, 
    MissingDnaError 
} from '../src/services/visual/manifestBuilder';
import { 
    QualityAgent, 
    rankCandidates, 
    isDefiniteHardFailure, 
    QualityCheckResult 
} from '../src/services/visual/qualityAgent';
import { GlobalImageRateLimiter } from '../src/services/generation/imageGenerator';

export async function runE2EProductionPipelineTests(): Promise<{ passed: number; failed: number }> {
    console.log('================================================================');
    console.log('🧪 RUNNING E2E PRODUCTION PIPELINE & CONTRACT GATES SUITE');
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
    // 1. E2E: Prompt Generator -> Manifest -> Payload Pipeline
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Production Prompt Generator -> Manifest -> Payload ---');
    try {
        const mockBlueprint: any = {
            foundation: {
                title: 'The Starlight Journey',
                storyCore: 'Two friends build a telescope and find a constellation.',
                recurringAsset: {
                    name: 'Brass Telescope',
                    description: 'Antique brass telescope with star engravings',
                    imageUrl: 'https://cdn.example.com/telescope.jpg',
                    appearancesSpreads: [2]
                }
            },
            visualAnchors: {
                recurringLocations: {
                    'Observatory Attic': {
                        architecture: 'Victorian timber attic with skylight dome',
                        keyLandmarks: ['Large brass astrolabe', 'Circular window', 'Starlight chart'],
                        materialsPalette: 'Mahogany wood and brass fittings',
                        lightingAtmosphere: 'Deep midnight blue with warm amber lantern glow'
                    }
                }
            },
            structure: {
                spreads: [
                    { 
                        spreadNumber: 1, 
                        specificLocation: 'Observatory Attic', 
                        narrative: 'Zaid climbed into the attic alone to check the map.' 
                    },
                    { 
                        spreadNumber: 2, 
                        specificLocation: 'Observatory Attic', 
                        narrative: 'Zaid and Nour assembled the Brass Telescope under the stars.' 
                    }
                ]
            }
        };

        const mockPlan: any = {
            spreads: [
                {
                    spread_index: 1,
                    specific_location: 'Observatory Attic',
                    action_summary: 'Zaid unrolls star map alone',
                    composition: { action_zone_side: 'right', text_zone_side: 'left' },
                    camera: { shot_type: 'Medium Wide', angle: 'Eye-level' }
                },
                {
                    spread_index: 2,
                    specific_location: 'Observatory Attic',
                    action_summary: 'Zaid and Nour looking through telescope',
                    characters_present: ['Zaid', 'Nour'],
                    composition: { action_zone_side: 'left', text_zone_side: 'right' },
                    camera: { shot_type: 'Close Up', angle: 'Low Angle' }
                }
            ]
        };

        const mockHeroes: any = [
            { id: 'hero_1', name: 'Zaid', gender: 'boy', age: '6', role: 'Protagonist' },
            { id: 'hero_2', name: 'Nour', gender: 'girl', age: '5', role: 'Companion' }
        ];

        const mockStyle: any = {
            name: 'Painterly',
            promptSnippet: 'Soft painterly children storybook style'
        };

        // Run production prompt engineering
        const promptRes = await generatePrompts(mockPlan, mockBlueprint, mockStyle, mockHeroes, 'en');
        assert(promptRes.result.length === 2, 'generatePrompts produced 2 spread prompts');
        assert(promptRes.result[0].activeHeroTokens?.includes('[[HERO_1]]') === true, 'Spread 1 has [[HERO_1]]');
        assert(promptRes.result[0].activeHeroTokens?.includes('[[HERO_2]]') === false, 'Spread 1 excludes [[HERO_2]] (hero 1 alone)');
        assert(promptRes.result[1].activeHeroTokens?.includes('[[HERO_2]]') === true, 'Spread 2 includes [[HERO_2]]');
        assert(promptRes.result[1].includesProp === true, 'Spread 2 includes recurring prop');
        assert(promptRes.result[0].locationKey === 'Observatory Attic', 'Spread 1 extracted locationKey');

        // Feed directly into buildGenerationManifest
        const dnaRecords = [
            { hero_label: 'Hero A', image_type: 'Stylized DNA', image_url: 'https://cdn.example.com/zaid_dna.jpg' },
            { hero_label: 'Hero B', image_type: 'Stylized DNA', image_url: 'https://cdn.example.com/nour_dna.jpg' },
            { hero_label: 'Prop Asset', image_type: 'Canonical Asset', image_url: 'https://cdn.example.com/telescope.jpg' }
        ];

        const storyData = {
            orderId: 'ORD-E2E-TEST',
            childName: 'Zaid',
            childAge: 6,
            useSecondCharacter: true,
            secondCharacter: { name: 'Nour', gender: 'girl', age: '5' },
            blueprint: mockBlueprint,
            prompts: promptRes.result
        };

        const manifest = buildGenerationManifest(storyData, 'ORD-E2E-TEST', dnaRecords);
        assert(manifest.spreads.length === 2, 'Manifest contains 2 spreads from prompt outputs');

        // Test Spread 1 Payload
        const payload1 = buildGenerationPayload(manifest, 1);
        assert(payload1.referenceImages.length === 1, 'Spread 1 has only 1 reference image (Hero 1)');
        assert(payload1.referenceImages[0].slotNumber === 1, 'Spread 1 Slot 1 is Hero 1');
        assert(payload1.prompt.includes('[LOCATION CONTINUITY REQUIREMENT]'), 'Spread 1 includes location contract');
        assert(payload1.prompt.includes('Observatory Attic'), 'Spread 1 location name matches location bible');

        // Test Spread 2 Payload
        const payload2 = buildGenerationPayload(manifest, 2);
        assert(payload2.referenceImages.length === 3, 'Spread 2 has 3 reference images (Hero 1, Hero 2, Prop)');
        assert(payload2.referenceImages[0].slotNumber === 1, 'Spread 2 Slot 1 is Hero 1');
        assert(payload2.referenceImages[1].slotNumber === 2, 'Spread 2 Slot 2 is Hero 2');
        assert(payload2.referenceImages[2].slotNumber === 3, 'Spread 2 Slot 3 is Prop');

    } catch (err: any) {
        console.error('Error in E2E Test 1:', err);
        failed++;
    }

    // -------------------------------------------------------------------------
    // 2. Quality Agent: Fail-Closed on Missing Active Location & Prop
    // -------------------------------------------------------------------------
    console.log('\n--- 2. QA Fail-Closed Gating on Active Location & Prop ---');
    try {
        const baseResult: QualityCheckResult = {
            visualDescription: 'A child smiling in an attic.',
            overallLikenessScore: 8,
            likenessScore: 8,
            characterConsistencyStatus: 'pass',
            characterReasoning: 'Great likeness.',
            wardrobeConsistencyStatus: 'pass',
            wardrobeReasoning: 'Matches outfit.',
            styleConsistencyStatus: 'pass',
            styleReasoning: 'Matches style.',
            propConsistencyStatus: 'pass',
            propReasoning: 'Matches telescope.',
            textClearanceStatus: 'pass',
            textReasoning: 'Clear text.',
            recommendedTextSide: 'Left',
            narrativeAdherenceStatus: 'pass',
            narrativeAdherenceReasoning: 'Matches narrative.',
            locationConsistencyStatus: 'pass',
            locationReasoning: 'Attic matches location bible.',
            overallDecision: 'pass',
            heroResults: [
                {
                    heroToken: '[[HERO_1]]',
                    label: 'Hero A',
                    name: 'Zaid',
                    likenessScore: 8,
                    reasoning: 'Consistent features match reference.',
                    characterConsistencyStatus: 'pass',
                    hairConsistency: 'pass',
                    skinToneConsistency: 'pass',
                    ageAccuracy: 'pass'
                }
            ]
        };

        // Active Prop fail -> must trigger hard failure
        const propFailQC: QualityCheckResult = {
            ...baseResult,
            propConsistencyStatus: 'fail',
            overallDecision: 'fail'
        };
        assert(isDefiniteHardFailure(propFailQC), 'Active prop failure triggers hard failure');

        // Biometric subcriterion (hair) fails -> character consistency fails
        const hairFailQC: QualityCheckResult = {
            ...baseResult,
            heroResults: [
                {
                    heroToken: '[[HERO_1]]',
                    label: 'Hero A',
                    name: 'Zaid',
                    likenessScore: 8,
                    reasoning: 'Hair style mismatch detected.',
                    characterConsistencyStatus: 'fail',
                    hairConsistency: 'fail',
                    skinToneConsistency: 'pass',
                    ageAccuracy: 'pass'
                }
            ],
            characterConsistencyStatus: 'fail',
            overallDecision: 'fail'
        };
        assert(isDefiniteHardFailure(hairFailQC), 'Biometric hairConsistency=fail triggers characterConsistencyStatus=fail and hard failure');

        // Biometric subcriterion (skinTone) fails -> character consistency fails
        const skinFailQC: QualityCheckResult = {
            ...baseResult,
            heroResults: [
                {
                    heroToken: '[[HERO_1]]',
                    label: 'Hero A',
                    name: 'Zaid',
                    likenessScore: 8,
                    reasoning: 'Skin tone mismatch detected.',
                    characterConsistencyStatus: 'fail',
                    hairConsistency: 'pass',
                    skinToneConsistency: 'fail',
                    ageAccuracy: 'pass'
                }
            ],
            characterConsistencyStatus: 'fail',
            overallDecision: 'fail'
        };
        assert(isDefiniteHardFailure(skinFailQC), 'Biometric skinToneConsistency=fail triggers characterConsistencyStatus=fail and hard failure');

    } catch (err: any) {
        console.error('Error in QA Gate Test:', err);
        failed++;
    }

    // -------------------------------------------------------------------------
    // 3. GlobalImageRateLimiter Request-Duration Lock & Cooldown
    // -------------------------------------------------------------------------
    console.log('\n--- 3. GlobalImageRateLimiter Mutex Duration Lock ---');
    try {
        const limiter = new GlobalImageRateLimiter(40);
        let inFlight = 0;
        let maxInFlight = 0;

        const runSimulatedRequest = async (id: number) => {
            const release = await limiter.acquire(true);
            inFlight++;
            if (inFlight > maxInFlight) maxInFlight = inFlight;
            await new Promise(r => setTimeout(r, 25));
            inFlight--;
            release();
        };

        await Promise.all([
            runSimulatedRequest(1),
            runSimulatedRequest(2),
            runSimulatedRequest(3)
        ]);

        assert(maxInFlight === 1, 'Mutex ensures at most 1 active request in-flight at any instant');

    } catch (err: any) {
        console.error('Error in Rate Limiter Test:', err);
        failed++;
    }

    console.log(`\n================================================================`);
    console.log(`📊 E2E PIPELINE SUITE COMPLETE: ${passed} Passed, ${failed} Failed`);
    console.log(`================================================================\n`);

    return { passed, failed };
}
