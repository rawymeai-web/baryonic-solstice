import { escapeRegExp } from '../src/utils/regexUtils';
import { 
    parseGlobalOverrideInstruction, 
    mergeSpreadContracts, 
    buildGenerationManifest 
} from '../src/services/visual/manifestBuilder';
import { generatePrompts } from '../src/services/visual/promptEngineer';

export async function runRegexSafetyTests(): Promise<{ passed: number; failed: number }> {
    console.log('================================================================');
    console.log('🧪 RUNNING REGEX SAFETY & SPECIAL CHARACTER HANDLING SUITE');
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
    // 1. Core escapeRegExp Utility
    // -------------------------------------------------------------------------
    console.log('\n--- 1. Core escapeRegExp Utility ---');
    {
        const raw = 'Alex (Hero) [Special] + *Star* ^ $ . ? {1} | \\';
        const escaped = escapeRegExp(raw);
        const regex = new RegExp(escaped);
        assert(regex.test(raw), 'Escaped regex safely matches complex meta-character string');
        assert(!regex.test('Alex Hero Special'), 'Does not match arbitrary unescaped string');
    }

    // -------------------------------------------------------------------------
    // 2. Complex Names & Special Characters in Manifest & Contracts
    // -------------------------------------------------------------------------
    console.log('\n--- 2. Special Characters in Story Data & Contract Merging ---');
    {
        const complexStory: any = {
            childName: 'Sami (The Explorer) [Jr.]',
            mainCharacter: { name: 'Sami (The Explorer) [Jr.]', gender: 'boy' },
            useSecondCharacter: true,
            secondCharacter: { name: 'Dr. Zaid + Nour?', gender: 'girl', type: 'human' },
            blueprint: {
                foundation: {
                    recurringAsset: { name: 'Compass (Golden) *v2*', appearancesSpreads: [1] }
                },
                visualAnchors: {
                    recurringLocations: {
                        'Observatory [Room #4] (Top Floor)': { architecture: 'Victorian glass attic' },
                        'Secret Lab (B-12)': { architecture: 'High-tech lab' }
                    }
                },
                structure: {
                    spreads: [
                        { spreadNumber: 1, specificLocation: 'Observatory [Room #4] (Top Floor)', narrative: 'Looking at stars' }
                    ]
                }
            },
            prompts: [
                {
                    spreadNumber: 1,
                    imagePrompt: 'Sami (The Explorer) [Jr.] with Compass (Golden) *v2* at Observatory [Room #4] (Top Floor).',
                    activeHeroTokens: ['[[HERO_1]]'],
                    activeHeroIds: ['hero_1'],
                    includesProp: true,
                    locationKey: 'Observatory [Room #4] (Top Floor)'
                }
            ]
        };

        // Parse global override referencing complex characters and symbols
        let noCrash = true;
        try {
            const { patch } = parseGlobalOverrideInstruction(
                'Include Dr. Zaid + Nour? and move scene to Secret Lab (B-12)',
                complexStory
            );

            assert(patch.hero2 === 'include', 'Parsed Hero 2 with special characters as include');
            assert(patch.locationKey === 'Secret Lab (B-12)', 'Parsed location with parentheses as "Secret Lab (B-12)"');

            const merged = mergeSpreadContracts({
                globalPatch: patch,
                manualSpreadPrompt: complexStory.prompts[0].imagePrompt,
                existingContract: complexStory.prompts[0],
                storyData: complexStory,
                spreadNum: 1
            });

            assert(merged.activeHeroTokens.includes('[[HERO_2]]'), 'Merged contract includes Hero 2');
            assert(merged.locationKey === 'Secret Lab (B-12)', 'Merged contract contains correct location');
        } catch (err: any) {
            noCrash = false;
            console.error('Crash during special character contract processing:', err);
        }
        assert(noCrash, 'Zero regex syntax errors or crashes with complex punctuation in character and location names');
    }

    // -------------------------------------------------------------------------
    // 3. Arabic & Non-Latin Character Safety
    // -------------------------------------------------------------------------
    console.log('\n--- 3. Arabic & Non-Latin Character Safety ---');
    {
        const arabicStory: any = {
            childName: 'طارق بن زياد',
            mainCharacter: { name: 'طارق بن زياد', gender: 'boy' },
            useSecondCharacter: true,
            secondCharacter: { name: 'سارة (الأميرة)', gender: 'girl', type: 'human' },
            blueprint: {
                foundation: {
                    recurringAsset: { name: 'المصباح السحري [الذهبي]', appearancesSpreads: [1] }
                },
                visualAnchors: {
                    recurringLocations: {
                        'قلعة النجوم (البرج العالي)': { architecture: 'Islamic architecture' }
                    }
                },
                structure: {
                    spreads: [
                        { spreadNumber: 1, specificLocation: 'قلعة النجوم (البرج العالي)', narrative: 'في القلعة' }
                    ]
                }
            },
            prompts: []
        };

        let arabicOk = true;
        try {
            const { patch } = parseGlobalOverrideInstruction('include سارة (الأميرة) and with المصباح السحري [الذهبي]', arabicStory);
            assert(patch.hero2 === 'include', 'Parsed Arabic hero name inclusion');
            assert(patch.prop === 'include', 'Parsed Arabic prop name inclusion');

            const merged = mergeSpreadContracts({
                globalPatch: patch,
                manualSpreadPrompt: 'طارق وسارة في قلعة النجوم (البرج العالي)',
                storyData: arabicStory,
                spreadNum: 1
            });

            assert(merged.activeHeroTokens.length === 2, 'Arabic characters both resolved as active');
            assert(merged.includesProp === true, 'Arabic prop resolved as active');
            assert(merged.locationKey === 'قلعة النجوم (البرج العالي)', 'Arabic location resolved correctly');
        } catch (err) {
            arabicOk = false;
            console.error('Arabic regex error:', err);
        }
        assert(arabicOk, 'Arabic and Non-Latin strings handled flawlessly without encoding/regex issues');
    }

    console.log('\n================================================================');
    console.log(`🏁 REGEX SAFETY SUITE: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    return { passed, failed };
}
