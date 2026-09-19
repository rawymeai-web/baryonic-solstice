import { 
    parseGlobalOverrideInstruction, 
    mergeSpreadContracts, 
    compilePromptFromResolvedContract 
} from '../src/services/visual/manifestBuilder';

export async function runGlobalOverridePrecedenceTests(): Promise<{ passed: number; failed: number }> {
    console.log('================================================================');
    console.log('🧪 RUNNING STRUCTURED GLOBAL OVERRIDE PRECEDENCE SUITE');
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

    const baseDualStory: any = {
        childName: 'Zaid',
        mainCharacter: { name: 'Zaid', gender: 'boy' },
        useSecondCharacter: true,
        secondCharacter: { name: 'Nour', gender: 'girl', type: 'human' },
        blueprint: {
            foundation: {
                recurringAsset: { name: 'Golden Compass', appearancesSpreads: [1] }
            },
            visualAnchors: {
                recurringLocations: {
                    'Observatory Dome': { architecture: 'Glass dome' },
                    'Crystal Cave': { architecture: 'Glittering quartz cavern' }
                }
            },
            structure: {
                spreads: [
                    { spreadNumber: 1, specificLocation: 'Observatory Dome', charactersPresent: ['Zaid'] },
                    { spreadNumber: 2, specificLocation: 'Observatory Dome', charactersPresent: ['Zaid', 'Nour'] }
                ]
            }
        },
        prompts: [
            {
                spreadNumber: 1,
                imagePrompt: 'Zaid is alone in Observatory Dome. [[HERO_2]] is absent. without [[PROP_ASSET]].',
                activeHeroTokens: ['[[HERO_1]]'],
                activeHeroIds: ['hero_1'],
                includesProp: false,
                locationKey: 'Observatory Dome'
            }
        ]
    };

    // -------------------------------------------------------------------------
    // 1. "Include Hero 2" overrides old "Hero 2 is absent"
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Hero 2 Global Override Precedence ---');
    {
        const { patch, validationErrors } = parseGlobalOverrideInstruction('Please include Hero 2 in the scene', baseDualStory);
        assert(validationErrors.length === 0, 'No validation errors on valid Hero 2 inclusion');
        assert(patch.hero2 === 'include', 'Parsed hero2 as include');

        const merged = mergeSpreadContracts({
            globalPatch: patch,
            manualSpreadPrompt: baseDualStory.prompts[0].imagePrompt,
            existingContract: baseDualStory.prompts[0],
            storyData: baseDualStory,
            spreadNum: 1
        });

        assert(merged.activeHeroTokens.includes('[[HERO_2]]'), 'Merged contract includes [[HERO_2]] despite old "absent" prompt');
        assert(merged.activeHeroTokens.includes('[[HERO_1]]'), 'Merged contract retains [[HERO_1]]');

        const compiled = compilePromptFromResolvedContract(baseDualStory.prompts[0].imagePrompt, merged, 'Please include Hero 2 in the scene', baseDualStory);
        assert(!compiled.includes('[[HERO_2]] is absent'), 'Compiled prompt stripped old "[[HERO_2]] is absent" negation');
        assert(!compiled.includes('Zaid is alone'), 'Compiled prompt stripped "Zaid is alone" statement');
    }

    // -------------------------------------------------------------------------
    // 2. "Include Prop" overrides old "without [[PROP_ASSET]]"
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Prop Asset Global Override Precedence ---');
    {
        const { patch } = parseGlobalOverrideInstruction('Make sure to add the Golden Compass prop', baseDualStory);
        assert(patch.prop === 'include', 'Parsed prop as include');

        const merged = mergeSpreadContracts({
            globalPatch: patch,
            manualSpreadPrompt: baseDualStory.prompts[0].imagePrompt,
            existingContract: baseDualStory.prompts[0],
            storyData: baseDualStory,
            spreadNum: 1
        });

        assert(merged.includesProp === true, 'Merged contract has includesProp=true despite old prompt "without [[PROP_ASSET]]"');

        const compiled = compilePromptFromResolvedContract(baseDualStory.prompts[0].imagePrompt, merged, undefined, baseDualStory);
        assert(!compiled.includes('without [[PROP_ASSET]]'), 'Compiled prompt stripped obsolete "without [[PROP_ASSET]]" clause');
    }

    // -------------------------------------------------------------------------
    // 3. Location Override Precedence (independent of Location Bible object ordering)
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Location Global Override Precedence ---');
    {
        const { patch } = parseGlobalOverrideInstruction('Move scene to Crystal Cave and add magical aura', baseDualStory);
        assert(patch.locationKey === 'Crystal Cave', 'Parsed explicit locationKey as "Crystal Cave"');

        const merged = mergeSpreadContracts({
            globalPatch: patch,
            manualSpreadPrompt: 'Scene set in Observatory Dome with stars.',
            existingContract: { locationKey: 'Observatory Dome' },
            storyData: baseDualStory,
            spreadNum: 1
        });

        assert(merged.locationKey === 'Crystal Cave', 'Global override location "Crystal Cave" won over old "Observatory Dome"');
    }

    // -------------------------------------------------------------------------
    // 4. Tri-State "unchanged" Preserves Existing Contracts
    // -------------------------------------------------------------------------
    console.log('\n--- 4. Tri-State Unchanged Behavior ---');
    {
        const { patch } = parseGlobalOverrideInstruction('Add cinematic golden hour warm lighting to all pages', baseDualStory);
        assert(patch.hero1 === 'unchanged', 'Hero 1 remains unchanged');
        assert(patch.hero2 === 'unchanged', 'Hero 2 remains unchanged');
        assert(patch.prop === 'unchanged', 'Prop remains unchanged');
        assert(patch.locationKey === undefined, 'Location key remains undefined');

        const merged = mergeSpreadContracts({
            globalPatch: patch,
            manualSpreadPrompt: baseDualStory.prompts[0].imagePrompt,
            existingContract: baseDualStory.prompts[0],
            storyData: baseDualStory,
            spreadNum: 1
        });

        assert(merged.activeHeroTokens.length === 1 && merged.activeHeroTokens[0] === '[[HERO_1]]', 'Preserved single hero contract');
        assert(merged.includesProp === false, 'Preserved prop=false contract');
        assert(merged.locationKey === 'Observatory Dome', 'Preserved locationKey');
    }

    // -------------------------------------------------------------------------
    // 5. Validation Rules for Hero 1 & Contradiction Validation
    // -------------------------------------------------------------------------
    console.log('\n--- 5. Hero 1 Protagonist Rules & Contradiction Validation ---');
    {
        const singleHeroStory: any = {
            childName: 'Layla',
            mainCharacter: { name: 'Layla', gender: 'girl' },
            useSecondCharacter: false
        };

        const res1 = parseGlobalOverrideInstruction('Remove Hero 1 from all spreads', singleHeroStory);
        assert(res1.validationErrors.length > 0, 'Rejected "remove Hero 1" in single-hero book with clear validation error');

        const res2 = parseGlobalOverrideInstruction('Remove Hero A and remove Hero B from all scenes', baseDualStory);
        assert(res2.validationErrors.length > 0, 'Rejected removing both heroes simultaneously in dual-hero book');

        const res3 = parseGlobalOverrideInstruction('Remove Hero 1 and only feature Hero B', baseDualStory);
        assert(res3.validationErrors.length === 0, 'Allowed Hero-B-only scene in dual-hero story');
        assert(res3.patch.hero1 === 'exclude', 'Hero 1 marked as exclude');
        assert(res3.patch.hero2 === 'include', 'Hero 2 marked as include');

        const mergedDualSoloB = mergeSpreadContracts({
            globalPatch: res3.patch,
            manualSpreadPrompt: 'Both heroes were in the room.',
            storyData: baseDualStory,
            spreadNum: 1
        });
        assert(mergedDualSoloB.activeHeroTokens.length === 1 && mergedDualSoloB.activeHeroTokens[0] === '[[HERO_2]]', 'Contract correctly resolved to Hero B only');
    }

    console.log('\n================================================================');
    console.log(`🏁 GLOBAL OVERRIDE PRECEDENCE SUITE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    return { passed, failed };
}
