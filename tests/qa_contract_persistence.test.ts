import { 
    buildGenerationManifest, 
    buildQualityCheckParams, 
    recomputeSpreadContracts,
    mergeSpreadContracts,
    compilePromptFromResolvedContract
} from '../src/services/visual/manifestBuilder';

export async function runQAContractPersistenceTests(): Promise<{ passed: number; failed: number }> {
    console.log('================================================================');
    console.log('🧪 RUNNING QA CONTRACT PERSISTENCE & DATABASE RELOAD SUITE');
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

    const mockDnaRecords = [
        { hero_label: 'Hero A', image_type: 'Stylized DNA', image_url: 'https://cdn.example.com/hero_a_dna.jpg' },
        { hero_label: 'Hero B', image_type: 'Stylized DNA', image_url: 'https://cdn.example.com/hero_b_dna.jpg' },
        { hero_label: 'Prop Asset', image_type: 'Canonical Asset', image_url: 'https://cdn.example.com/prop.jpg' }
    ];

    // Mock database storage
    const simulatedDatabase: Record<string, any> = {};

    function mockSaveOrder(orderId: string, storyData: any) {
        // Deep clone to simulate real JSON serialization into database
        simulatedDatabase[orderId] = JSON.parse(JSON.stringify(storyData));
    }

    function mockLoadOrder(orderId: string) {
        if (!simulatedDatabase[orderId]) return null;
        return JSON.parse(JSON.stringify(simulatedDatabase[orderId]));
    }

    // -------------------------------------------------------------------------
    // 1. Single Spread Edit -> DB Save -> DB Reload -> QA Contract Equality
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Single Spread Edit, DB Persistence & QA Equality ---');
    {
        const orderId = 'ORD-PERSIST-101';
        const initialStory: any = {
            orderId,
            childName: 'Tariq',
            mainCharacter: { name: 'Tariq', gender: 'boy', description: 'Curious boy with curly hair' },
            useSecondCharacter: true,
            secondCharacter: { name: 'Farah', gender: 'girl', description: 'Adventurous girl with braids', type: 'human' },
            blueprint: {
                foundation: {
                    recurringAsset: { name: 'Lantern of Wonders', appearancesSpreads: [1, 2] }
                },
                visualAnchors: {
                    recurringLocations: {
                        'Ancient Library': { architecture: 'Stone arches with endless bookshelves' },
                        'Secret Garden': { architecture: 'Lush courtyard with blooming wisteria' }
                    }
                },
                structure: {
                    spreads: [
                        { spreadNumber: 1, specificLocation: 'Ancient Library', charactersPresent: ['Tariq', 'Farah'] },
                        { spreadNumber: 2, specificLocation: 'Ancient Library', charactersPresent: ['Tariq'] }
                    ]
                }
            },
            prompts: [
                {
                    spreadNumber: 1,
                    imagePrompt: 'Tariq and Farah in Ancient Library reading a glowing book with [[PROP_ASSET]].',
                    activeHeroTokens: ['[[HERO_1]]', '[[HERO_2]]'],
                    activeHeroIds: ['hero_1', 'hero_2'],
                    includesProp: true,
                    locationKey: 'Ancient Library'
                }
            ],
            spreads: [
                {},
                { spreadNumber: 1, illustrationUrl: 'https://cdn.example.com/initial_1.jpg', text: 'They opened the book.' }
            ]
        };

        // User edits Spread 1 in Editor: remove Farah and remove Prop, move to Secret Garden
        const editedPrompt = 'Tariq is alone in Secret Garden without [[HERO_2]]. without [[PROP_ASSET]].';
        const recomputedContracts = recomputeSpreadContracts(editedPrompt, initialStory, 1);

        // Verify contract recomputed properly on frontend
        assert(recomputedContracts.activeHeroTokens.length === 1 && recomputedContracts.activeHeroTokens[0] === '[[HERO_1]]', 'Front-end contract: Hero 1 only');
        assert(recomputedContracts.includesProp === false, 'Front-end contract: Prop excluded');
        assert(recomputedContracts.locationKey === 'Secret Garden', 'Front-end contract: Location is Secret Garden');

        // Update prompts array with recomputed contracts
        const currentPrompts = [...initialStory.prompts];
        const pIdx = currentPrompts.findIndex(p => p.spreadNumber === 1);
        currentPrompts[pIdx] = {
            ...currentPrompts[pIdx],
            imagePrompt: editedPrompt,
            activeHeroTokens: recomputedContracts.activeHeroTokens,
            activeHeroIds: recomputedContracts.activeHeroIds,
            includesProp: recomputedContracts.includesProp,
            locationKey: recomputedContracts.locationKey
        };

        const newStoryToSave = {
            ...initialStory,
            prompts: currentPrompts,
            spreads: [
                {},
                { spreadNumber: 1, illustrationUrl: 'https://cdn.example.com/updated_1.jpg', text: 'Tariq walked into the garden alone.' }
            ]
        };

        // Persist to database
        mockSaveOrder(orderId, newStoryToSave);

        // Server-side QA rerun simulation: Server fetches order from DB and evaluates QA
        const dbStory = mockLoadOrder(orderId);
        assert(!!dbStory, 'Database loaded order successfully');
        assert(dbStory.prompts[0].locationKey === 'Secret Garden', 'Database contains updated locationKey');
        assert(dbStory.prompts[0].includesProp === false, 'Database contains updated includesProp=false');
        assert(dbStory.prompts[0].activeHeroTokens.length === 1, 'Database contains single hero token');

        // Build server-side QA parameters from database story
        const serverManifest = buildGenerationManifest(dbStory, orderId, mockDnaRecords);
        const serverQAParams = buildQualityCheckParams(serverManifest, 1, 'https://cdn.example.com/updated_1.jpg');

        const activeHeroesInQC = serverQAParams.heroes.filter((h: any) => h.isVisibleInScene);
        assert(activeHeroesInQC.length === 1, 'Server QA expected 1 active hero (Tariq)');
        assert(activeHeroesInQC[0].name === 'Tariq', 'Server QA expected character name matches Tariq');
        assert(serverQAParams.propAssetImageUrl === undefined, 'Server QA expected NO prop');
        assert(serverQAParams.locationRecord?.name === 'Secret Garden', 'Server QA expected location is Secret Garden');
    }

    // -------------------------------------------------------------------------
    // 2. Reverse Transition: Solo to Dual Hero & Prop Added
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Reverse Transition (Solo -> Dual + Prop Added) QA Contract ---');
    {
        const orderId = 'ORD-PERSIST-102';
        const initialStorySolo: any = {
            orderId,
            childName: 'Sami',
            mainCharacter: { name: 'Sami', gender: 'boy' },
            useSecondCharacter: true,
            secondCharacter: { name: 'Dina', gender: 'girl', type: 'human' },
            blueprint: {
                foundation: {
                    recurringAsset: { name: 'Silver Key', appearancesSpreads: [] }
                },
                visualAnchors: {
                    recurringLocations: {
                        'Clock Tower': { architecture: 'Tower with giant brass clock face' }
                    }
                }
            },
            prompts: [
                {
                    spreadNumber: 1,
                    imagePrompt: 'Sami alone in Clock Tower.',
                    activeHeroTokens: ['[[HERO_1]]'],
                    activeHeroIds: ['hero_1'],
                    includesProp: false,
                    locationKey: 'Clock Tower'
                }
            ]
        };

        // User updates Spread 1 to include Dina and the Silver Key
        const updatedPrompt = 'Sami and Dina holding the Silver Key [[PROP_ASSET]] in Clock Tower.';
        const contracts = recomputeSpreadContracts(updatedPrompt, initialStorySolo, 1);

        const updatedPrompts = [{
            spreadNumber: 1,
            imagePrompt: updatedPrompt,
            activeHeroTokens: contracts.activeHeroTokens,
            activeHeroIds: contracts.activeHeroIds,
            includesProp: contracts.includesProp,
            locationKey: contracts.locationKey
        }];

        mockSaveOrder(orderId, { ...initialStorySolo, prompts: updatedPrompts });

        // QA re-evaluates from DB
        const reloaded = mockLoadOrder(orderId);
        const manifest = buildGenerationManifest(reloaded, orderId, mockDnaRecords);
        const qaParams = buildQualityCheckParams(manifest, 1, 'https://cdn.example.com/updated_2.jpg');

        const activeHeroesInQC = qaParams.heroes.filter((h: any) => h.isVisibleInScene);
        assert(activeHeroesInQC.length === 2, 'Server QA now expects both characters (Sami and Dina)');
        assert(qaParams.propAssetImageUrl === 'https://cdn.example.com/prop.jpg', 'Server QA now expects Silver Key prop image URL');
        assert(qaParams.stylizedDnaImages.length === 2, 'Server QA contains reference DNA images for both heroes');
    }

    console.log('\n================================================================');
    console.log(`🏁 QA CONTRACT PERSISTENCE SUITE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    return { passed, failed };
}
