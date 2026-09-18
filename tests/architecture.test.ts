import { 
    buildGenerationManifest, 
    buildGenerationPayload, 
    buildQualityCheckParams, 
    buildStyleContract, 
    MissingDnaError 
} from '../src/services/visual/manifestBuilder';
import { 
    QualityAgent, 
    rankCandidates, 
    countHardFailures, 
    isDefiniteHardFailure, 
    QualityCheckResult 
} from '../src/services/visual/qualityAgent';
import { GlobalImageRateLimiter } from '../src/services/generation/imageGenerator';

export async function runArchitectureTests(): Promise<{ passed: number; failed: number }> {
    console.log('================================================================');
    console.log('🧪 RUNNING MASTER ARCHITECTURAL ENFORCEMENT SUITE');
    console.log('================================================================\n');

    let passed = 0;
    let failed = 0;

    function assert(condition: boolean, testName: string) {
        if (condition) {
            console.log(`✅ PASS: ${testName}`);
            passed++;
        } else {
            console.error(`❌ FAIL: ${testName}`);
            failed++;
        }
    }

    // -------------------------------------------------------------------------
    // TEST 1: Fail-Closed DNA Contracts (Missing Hero A / Missing Hero B)
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Fail-Closed DNA Contracts ---');
    try {
        const singleHeroMissingDna = {
            childName: 'Tariq',
            childAge: 6,
            prompts: [{ spreadNumber: 1, imagePrompt: 'Tariq running in park' }]
        };
        try {
            buildGenerationManifest(singleHeroMissingDna, 'ORD-FAIL-1', []);
            assert(false, 'Should throw MissingDnaError when Hero A stylized DNA is missing');
        } catch (e: any) {
            assert(e instanceof MissingDnaError && e.missingHero === 'Hero A', 'Throws MissingDnaError for Hero A when DNA missing');
        }

        const dualHeroMissingHeroB = {
            childName: 'Tariq',
            childAge: 6,
            useSecondCharacter: true,
            secondCharacter: { name: 'Laila', gender: 'girl', age: '5' },
            prompts: [{ spreadNumber: 1, imagePrompt: 'Tariq and Laila playing' }]
        };
        const dnaHeroAOnly = [
            { hero_label: 'Hero A', image_type: 'Stylized DNA', image_url: 'https://cdn.example.com/dna-a.jpg' }
        ];
        try {
            buildGenerationManifest(dualHeroMissingHeroB, 'ORD-FAIL-2', dnaHeroAOnly);
            assert(false, 'Should throw MissingDnaError when Hero B stylized DNA is missing in dual-hero order');
        } catch (e: any) {
            assert(e instanceof MissingDnaError && e.missingHero === 'Hero B', 'Throws MissingDnaError for Hero B in dual-hero order');
        }

        // Draft mode override
        const draftManifest = buildGenerationManifest(dualHeroMissingHeroB, 'ORD-DRAFT', dnaHeroAOnly, { allowMissingDnaForDraft: true });
        assert(draftManifest.orderId === 'ORD-DRAFT', 'Allows missing DNA in draft/preview mode when explicit flag passed');

    } catch (err: any) {
        console.error('Unexpected error in Test 1:', err);
        failed++;
    }

    // -------------------------------------------------------------------------
    // TEST 2: Authoritative Manifest & Reference Slot Ordering
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Authoritative Manifest & Slot Ordering ---');
    try {
        const fullStoryData = {
            orderId: 'ORD-SUCCESS-100',
            childName: 'Omar',
            childAge: 5,
            useSecondCharacter: true,
            secondCharacter: { name: 'Maya', gender: 'girl', age: '4' },
            selectedStyleNames: ['Painterly'],
            selectedStylePrompt: 'Painterly storybook illustration style, soft lighting',
            blueprint: {
                foundation: {
                    recurringAsset: {
                        name: 'Golden Compass',
                        description: 'An antique brass compass with glowing needle',
                        imageUrl: 'https://cdn.example.com/compass.jpg',
                        appearancesSpreads: [2]
                    }
                },
                visualAnchors: {
                    recurringLocations: {
                        'Crystal Forest': {
                            architecture: 'Bioluminescent ancient canopy',
                            keyLandmarks: ['Glowing crystal arch', 'Silver stream'],
                            materialsPalette: 'Emerald moss and sapphire stone',
                            lightingAtmosphere: 'Soft radiant twilight glow'
                        }
                    }
                },
                structure: {
                    spreads: [
                        { spreadNumber: 1, specificLocation: 'Crystal Forest', narrative: 'Omar explored alone.' },
                        { spreadNumber: 2, specificLocation: 'Crystal Forest', narrative: 'Omar and Maya found the compass.' }
                    ]
                }
            },
            prompts: [
                {
                    spreadNumber: 1,
                    imagePrompt: 'Omar walks quietly. [[HERO_1]] is alone in the forest.',
                    storyText: 'Omar explored alone.',
                    activeHeroTokens: ['[[HERO_1]]'],
                    locationKey: 'Crystal Forest'
                },
                {
                    spreadNumber: 2,
                    imagePrompt: 'Omar and Maya hold the compass. [[HERO_1]] and [[HERO_2]] discover [[PROP_ASSET]].',
                    storyText: 'Omar and Maya found the compass.',
                    activeHeroTokens: ['[[HERO_1]]', '[[HERO_2]]'],
                    includesProp: true,
                    locationKey: 'Crystal Forest'
                }
            ]
        };

        const dnaRecords = [
            { hero_label: 'Hero A', image_type: 'Stylized DNA', image_url: 'https://cdn.example.com/omar-dna.jpg' },
            { hero_label: 'Hero B', image_type: 'Stylized DNA', image_url: 'https://cdn.example.com/maya-dna.jpg' },
            { hero_label: 'Prop Asset', image_type: 'Canonical Asset', image_url: 'https://cdn.example.com/compass.jpg' }
        ];

        const manifest = buildGenerationManifest(fullStoryData, 'ORD-SUCCESS-100', dnaRecords);
        assert(manifest.heroes.length === 2, 'Manifest records both Hero A and Hero B');
        assert(manifest.propAsset?.name === 'Golden Compass', 'Manifest records canonical prop asset');
        assert(manifest.locationBible.locations['Crystal Forest'] !== undefined, 'Manifest records Location Bible entry');

        // Check Spread 1: Only Hero 1 active, no prop
        const payload1 = buildGenerationPayload(manifest, 1);
        assert(payload1.referenceImages.length === 1, 'Spread 1 payload attaches only Hero 1 DNA');
        assert(payload1.referenceImages[0].slotNumber === 1, 'Hero 1 is assigned Slot 1');
        assert(payload1.prompt.includes('[LOCATION CONTINUITY REQUIREMENT]'), 'Location contract injected into Spread 1 prompt');
        assert(payload1.prompt.includes('Crystal Forest'), 'Location name present in prompt');

        // Check Spread 2: Hero 1 + Hero 2 + Prop active
        const payload2 = buildGenerationPayload(manifest, 2);
        assert(payload2.referenceImages.length === 3, 'Spread 2 payload attaches Hero 1, Hero 2, and Prop Asset');
        assert(payload2.referenceImages[0].slotNumber === 1, 'Slot 1 is Hero 1');
        assert(payload2.referenceImages[1].slotNumber === 2, 'Slot 2 is Hero 2');
        assert(payload2.referenceImages[2].slotNumber === 3, 'Slot 3 is Prop Asset');

        // Check QA Params derivation
        const qaParams = buildQualityCheckParams(manifest, 2, 'https://cdn.example.com/gen2.jpg', 1);
        assert(qaParams.heroes.length === 2, 'QA Params include both heroes');
        assert(qaParams.heroes[0].isVisibleInScene === true, 'Hero 1 marked visible in scene');
        assert(qaParams.heroes[1].isVisibleInScene === true, 'Hero 2 marked visible in scene');
        assert(qaParams.locationRecord?.name === 'Crystal Forest', 'QA Params include location record');
        assert(qaParams.propAssetImageUrl === 'https://cdn.example.com/compass.jpg', 'QA Params include prop reference');

    } catch (err: any) {
        console.error('Unexpected error in Test 2:', err);
        failed++;
    }

    // -------------------------------------------------------------------------
    // TEST 3: Deterministic Candidate Ranking Comparator
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Candidate Ranking Comparator ---');
    try {
        const passingCandidate = {
            candidateIndex: 1,
            qcResult: {
                overallDecision: 'pass' as const,
                overallLikenessScore: 8,
                likenessScore: 8,
                characterConsistencyStatus: 'pass' as const,
                wardrobeConsistencyStatus: 'pass' as const,
                styleConsistencyStatus: 'pass' as const,
                propConsistencyStatus: 'pass' as const,
                textClearanceStatus: 'pass' as const,
                narrativeAdherenceStatus: 'pass' as const,
                heroResults: [
                    { heroToken: '[[HERO_1]]', label: 'Hero A', name: 'Omar', likenessScore: 8, characterConsistencyStatus: 'pass' as const }
                ]
            }
        };

        const failingCandidateWithHighScore = {
            candidateIndex: 2,
            qcResult: {
                overallDecision: 'fail' as const,
                overallLikenessScore: 10,
                likenessScore: 10,
                characterConsistencyStatus: 'fail' as const, // Character failed
                wardrobeConsistencyStatus: 'pass' as const,
                styleConsistencyStatus: 'fail' as const, // Style failed
                propConsistencyStatus: 'pass' as const,
                textClearanceStatus: 'pass' as const,
                narrativeAdherenceStatus: 'pass' as const,
                heroResults: [
                    { heroToken: '[[HERO_1]]', label: 'Hero A', name: 'Omar', likenessScore: 5, characterConsistencyStatus: 'fail' as const }
                ]
            }
        };

        const ranking = rankCandidates(passingCandidate, failingCandidateWithHighScore);
        assert(ranking < 0, 'Passing candidate beats failing candidate even if failing has higher nominal scores');

        const fail1 = {
            candidateIndex: 1,
            qcResult: {
                overallDecision: 'fail' as const,
                overallLikenessScore: 7,
                likenessScore: 7,
                characterConsistencyStatus: 'fail' as const,
                wardrobeConsistencyStatus: 'pass' as const,
                styleConsistencyStatus: 'pass' as const,
                propConsistencyStatus: 'pass' as const,
                textClearanceStatus: 'pass' as const,
                narrativeAdherenceStatus: 'pass' as const,
                heroResults: [{ heroToken: '[[HERO_1]]', label: 'Hero A', name: 'Omar', likenessScore: 6, characterConsistencyStatus: 'fail' as const }]
            }
        };

        const fail2 = {
            candidateIndex: 2,
            qcResult: {
                overallDecision: 'fail' as const,
                overallLikenessScore: 6,
                likenessScore: 6,
                characterConsistencyStatus: 'fail' as const,
                wardrobeConsistencyStatus: 'fail' as const,
                styleConsistencyStatus: 'fail' as const, // 2 hard failures
                propConsistencyStatus: 'pass' as const,
                textClearanceStatus: 'pass' as const,
                narrativeAdherenceStatus: 'pass' as const,
                heroResults: [{ heroToken: '[[HERO_1]]', label: 'Hero A', name: 'Omar', likenessScore: 5, characterConsistencyStatus: 'fail' as const }]
            }
        };

        const failRanking = rankCandidates(fail1, fail2);
        assert(failRanking < 0, 'Candidate with fewer hard failures beats candidate with more failures');

    } catch (err: any) {
        console.error('Unexpected error in Test 3:', err);
        failed++;
    }

    // -------------------------------------------------------------------------
    // TEST 4: Central FIFO Rate Limiter Mutex
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Central FIFO Rate Limiter Mutex ---');
    try {
        const limiter = new GlobalImageRateLimiter(50); // Use 50ms interval for fast test execution

        let executionOrder: number[] = [];

        const task1 = async () => {
            const release = await limiter.acquire(true);
            executionOrder.push(1);
            await new Promise(r => setTimeout(r, 20));
            release();
        };

        const task2 = async () => {
            const release = await limiter.acquire(true);
            executionOrder.push(2);
            await new Promise(r => setTimeout(r, 10));
            release();
        };

        const task3 = async () => {
            const release = await limiter.acquire(true);
            executionOrder.push(3);
            release();
        };

        // Fire all concurrently
        await Promise.all([task1(), task2(), task3()]);

        assert(
            executionOrder[0] === 1 && executionOrder[1] === 2 && executionOrder[2] === 3,
            `FIFO Rate limiter executes requests strictly sequentially in order [${executionOrder.join(', ')}]`
        );

    } catch (err: any) {
        console.error('Unexpected error in Test 4:', err);
        failed++;
    }

    console.log(`\n================================================================`);
    console.log(`📊 ARCHITECTURE SUITE COMPLETE: ${passed} Passed, ${failed} Failed`);
    console.log(`================================================================\n`);

    return { passed, failed };
}
