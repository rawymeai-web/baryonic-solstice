import { ai, cleanJsonString, withRetry } from '../generation/modelGateway';
import { Validator } from '../rules/validator';
import { getWordCountForAge } from '../rules/guidebook';
import { StoryBlueprint, WorkflowLog, Language } from '../../types';

export async function runEditorPass(
    draft: { text: string }[],
    blueprint: StoryBlueprint,
    language: Language,
    childName: string,
    childAge: number,
    secondCharacter?: any,
    customStoryText?: string
): Promise<{ result: { text: string }[], log: WorkflowLog }> {

    const startTime = Date.now();

    const isDual = !!(
        (blueprint as any)?.heroMode === 'dual' ||
        (secondCharacter && secondCharacter.name && secondCharacter.type !== 'object')
    );
    const heroNameA = childName;
    const heroNameB = secondCharacter?.name || (blueprint as any)?.heroNameB || 'Friend';

    const languageMap: Record<Language, string> = {
        'en': 'English',
        'ar': 'Arabic (Modern Standard / Fusha)',
        'de': 'German (Deutsch)',
        'es': 'Spanish (Español)',
        'fr': 'French (Français)',
        'pt': 'Portuguese (Português)',
        'it': 'Italian (Italiano)',
        'ru': 'Russian (Русский)',
        'ja': 'Japanese (日本語)',
        'tr': 'Turkish (Türkçe)'
    };

    const targetLang = languageMap[language] || 'English';

    try {
        return await withRetry(async () => {
            const wordCountRule = getWordCountForAge(childAge);
            const primaryAnchor = blueprint.foundation?.primaryVisualAnchor || 'None';
            const hasAnchor = primaryAnchor.toLowerCase() !== 'none';
            const heroDesire = blueprint.foundation?.heroDesire || '';
            const activeAnchorRule = blueprint.foundation?.anchorTriggerRule || '';

            const prompt = `
            ROLE: Senior Children's Picture-Book Editor & Literary Stylist.
            LANGUAGE: ${targetLang}
            AGE GROUP: ${childAge} years old
            ${isDual ? `HEROES: Dual-Hero story featuring "${heroNameA}" and "${heroNameB}". Both heroes are indispensable co-protagonists.` : `HERO: Single-Hero story featuring "${childName}".`}
            
            ${heroDesire ? `HERO CORE DESIRE: "${heroDesire}"` : ''}
            ${hasAnchor ? `ANCHOR OBJECT RULE: "${activeAnchorRule}"` : 'SETTING: Everyday/Social/Natural adventure without a mechanical anchor prop.'}
            
            PRIMARY EDITORIAL OBJECTIVE:
            Protect and elevate childlike delight, sensory joy, rhythmic musicality, and emotional warmth.
            ❌ NEVER compress playful or imaginative draft lines into dry, robotic, telegram-style fragments (e.g. NEVER write "Tray needs flat spot" or "Lina's tray stood still") just to satisfy word limits.
            If word count is tight, trim filler words while preserving the fun nouns, active verbs, and musical cadence.

            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            📖 PASS 1 — COLD READ & LITERARY CHARM
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            A. **WARM GROUNDING:** Does Spread 1 establish the child's starting Home Base (play spot, bedroom rug, garden) and a warm personal desire?
               ${isDual ? `- Spread 1 MUST establish BOTH "${heroNameA}" and "${heroNameB}" together!` : ''}
            B. **RHYTHM & DELIGHT:** Is the language enjoyable to read aloud? Does it retain sensory details (colors, playful actions, childlike humor)?
            C. **SEAMLESS RETURN & CLOSURE:** Spread ${draft.length} must return to the Home Base and end on a cozy character moment.
            D. **AGE VOCABULARY (AGE ${childAge}):**
               ${childAge <= 3 ? `- Use simple verbs, simple nouns, and primary emotions (happy, sad, mad, calm, proud, scared, mixed up, safe). Keep sentences complete and musical.` : `- Use clear everyday words without adult/academic jargon.`}
            E. **COMPLETE SENTENCES:** Zero grammatical fragments (no dropped verbs like "${childName} content").

            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            📋 PASS 2 — BLUEPRINT & LOGIC VERIFICATION
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            **THE BLUEPRINT:**
            ${JSON.stringify(blueprint)}

            F. **PROMISE-VERSUS-PAYOFF (STRICT):** 
               - What was promised in the Title, Premise, or Spread 1 MUST be genuinely delivered in Spread 7.
               - If the title promises "Island Gold" or "Treasure", deliver real pirate treasure or gold—not an unrelated paper card trick!
            G. **OBJECT PHYSICS & MATERIAL LOGIC:**
               - Object transformations must obey physical reality. A paper wrapper cannot plausibly become a ship's canvas sail without crafting.
            ${isDual ? `H. **DUAL-HERO AGENCY:**
               - Does Spread 7 (Climax) feature an indispensable physical or cognitive action from BOTH "${heroNameA}" and "${heroNameB}"? If one hero merely watches or points while the other does everything, REWRITE Spread 7 so BOTH contribute.` : ''}
            I. **ANTI-PREACHY CLOSING (STRICT):**
               - Spread ${draft.length} MUST NOT preach or state an adult proverb (NEVER write "Patience is...", "He learned that...", "الصبر هو أفضل سر").
               - End on a scene-based character action (hugging, holding a keepsake, laughing, tucking in a toy, cozy bedtime smile).
            J. **ORGANIC SOUNDS (0–4 TOTAL):**
               - Sound words are optional and organic (maximum 4 across the entire story). Never force sounds on every spread.
               - ❌ Ban parenthetical emotional cries ("(وااااه!)", "(وخزة!)") and unnatural transliterations ("فر").

            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            ✍️ PASS 3 — SURGICAL REWRITE
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            ${customStoryText ? `**CRITICAL EXCEPTION FOR CUSTOM SCRIPT:** The user provided an exact text: """${customStoryText}""". DO NOT alter, rewrite, or replace the provided words. Your ONLY job is to distribute them cleanly across the ${draft.length} spreads.` : `
            Apply all necessary rewrites to fix logical gaps, elevate charm, and satisfy constraints:
            1. Target Word Count: Strictly ${wordCountRule.min}–${wordCountRule.max} visible words per spread.
            2. ${language === 'ar' ? 'Arabic Output: 100% free of Tashkeel diacritics. Use natural, warm children\'s Fusha (no literal English translations).' : (childAge <= 5 ? `Ages 1–5 Pronoun Policy: Avoid 3rd-person pronouns ("it", "he", "she", "him", "her", "his"). Use hero\'s name or active verbs.` : 'Natural grammar matching character genders.')}
            3. Hero Names: Use exact names throughout.
            4. Climax Payoff: Deliver the promised resolution with active agency.
            5. Warm Ending: Scene-based emotional closure without moral sermons.
            `}

            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            🔁 PASS 4 — MANDATORY CHECKLIST
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            - [ ] Home Base Grounding in Spread 1 ${isDual ? `for BOTH heroes` : ''}.
            - [ ] Complete sentences (no missing verbs or telegraphic fragments).
            - [ ] Word count strictly ${wordCountRule.min}–${wordCountRule.max} per spread.
            - [ ] Zero adult moral proverbs in Spread ${draft.length}.
            - [ ] Zero Tashkeel if Arabic.
            - [ ] Promise in title fulfilled in climax.
            ${isDual ? `- [ ] Both heroes perform an active action in Spread 7.` : ''}

            THE ROUGH DRAFT:
            ${JSON.stringify(draft)}

            OUTPUT JSON SCHEMA (EXACTLY ${draft.length} items):
            [
                { "spreadNumber": 1, "text": "Polished rhythmic text..." },
                ...
            ]
            `;

            const model = ai().getGenerativeModel({
                model: 'gemini-2.5-flash',
                generationConfig: { responseMimeType: "application/json" }
            });

            const response = await model.generateContent(prompt);
            const rawDraft = JSON.parse(cleanJsonString(response.response.text()));
            const editedDraft = Array.isArray(rawDraft) ? rawDraft.map(item => ({
                text: typeof item === 'string' ? item : item.text || ''
            })) : [];

            if (!Validator.validateDraft(editedDraft)) {
                throw new Error("Editor generated insufficient pages.");
            }

            if (editedDraft.length !== draft.length) {
                console.warn(`Editor returned ${editedDraft.length} pages instead of ${draft.length}. Length mismatch.`);
                if (editedDraft.length < draft.length) throw new Error("Editor dropped pages.");
            }

            // Step 1: Apply deterministic vocabulary sanitizer for young ages
            let refinedDraft = Validator.sanitizeDraft(editedDraft, childAge, language);

            // Step 2: Run deterministic quality validation
            let validation = Validator.validateDraftQuality(refinedDraft, {
                expectedLength: draft.length,
                childAge,
                childName,
                secondCharacterName: secondCharacter?.name,
                isDual,
                language,
                anchorTriggerRule: hasAnchor ? activeAnchorRule : undefined,
                primaryVisualAnchor: hasAnchor ? primaryAnchor : undefined,
                customStoryText
            });

            // Step 3: Surgical repair loop (up to 2 rounds if hard violations exist)
            for (let round = 1; round <= 2 && !customStoryText && !validation.valid; round++) {
                const failingSpreads: { index: number; spreadNumber: number; currentText: string; issues: string[] }[] = [];
                refinedDraft.forEach((s, idx) => {
                    const issues: string[] = [];
                    const wc = Validator.countVisibleWords(s.text);
                    if (wc < wordCountRule.min || wc > wordCountRule.max) {
                        issues.push(`Word count is ${wc} words (must be strictly ${wordCountRule.min}–${wordCountRule.max} words). Target: exactly ${Math.floor((wordCountRule.min + wordCountRule.max) / 2)} words.`);
                    }
                    if (language === 'ar') {
                        const tashkeel = Validator.checkArabicTashkeel(s.text);
                        if (!tashkeel.pass) {
                            issues.push(`Contains ${tashkeel.tashkeelCount} Arabic Tashkeel/harakat diacritics. Remove all Tashkeel.`);
                        }
                    }
                    if (childAge <= 5 && language !== 'ar') {
                        const pCheck = Validator.checkPronounGuard(s.text, childAge, language);
                        if (!pCheck.pass) {
                            issues.push(`Avoid 3rd-person pronouns [${pCheck.matchedPronouns.join(', ')}]. Use hero possessive ('${childName}'s item') or active verbs.`);
                        }
                    }
                    const gCheck = Validator.checkGrammarFragments([s.text]);
                    if (!gCheck.pass) {
                        issues.push(`Fix grammar fragment / missing verb.`);
                    }
                    if (idx === refinedDraft.length - 1) {
                        const preachyCheck = Validator.checkAntiPreachy(s.text, language);
                        if (!preachyCheck.pass && preachyCheck.error) {
                            issues.push(preachyCheck.error);
                        }
                    }
                    if (issues.length > 0) {
                        failingSpreads.push({
                            index: idx,
                            spreadNumber: idx + 1,
                            currentText: s.text,
                            issues
                        });
                    }
                });

                if (failingSpreads.length === 0) break;

                try {
                    const surgicalPrompt = `
ROLE: Senior Children's Book Editor (Surgical Fix - Round ${round}).
LANGUAGE: ${targetLang}
AGE GROUP: ${childAge} years old
${isDual ? `HEROES: "${heroNameA}" and "${heroNameB}"` : `HERO NAME: "${childName}"`}

Fix ONLY the following specific spreads to resolve the listed violations:
${failingSpreads.map(f => `Spread ${f.spreadNumber}:
- Current Text: "${f.currentText}"
- Issues to Fix: ${f.issues.join('; ')}`).join('\n\n')}

MANDATORY RULES:
1. Target Word Count: Strictly ${wordCountRule.min}–${wordCountRule.max} visible words per spread. DO NOT EXCEED ${wordCountRule.max} words!
2. Maintain charming, musical children's book cadence. DO NOT reduce text to dry, telegraphic fragments!
3. ${language === 'ar' ? 'Arabic Output: 100% free of Tashkeel/Harakat diacritics.' : (childAge <= 5 ? `Age 1–5 Pronoun Policy: Do NOT use "it", "its", "he", "she", "him", "her", "his". Replace with character name, object possessive ("${childName}'s item"), or active verbs.` : 'Natural grammar and gender matching.')}
4. Complete sentences only.
5. If fixing the final spread: end on a scene-based character action or cozy feeling, NEVER a preachy proverb.
6. Output JSON array containing ONLY the fixed spreads:
[
  ${failingSpreads.map(f => `{ "spreadNumber": ${f.spreadNumber}, "text": "Fixed rhythmic text..." }`).join(',\n  ')}
]
`;
                    const fixResponse = await model.generateContent(surgicalPrompt);
                    const fixJson = JSON.parse(cleanJsonString(fixResponse.response.text()));
                    if (Array.isArray(fixJson)) {
                        fixJson.forEach((item: any) => {
                            const spNum = item.spreadNumber;
                            if (typeof spNum === 'number' && spNum >= 1 && spNum <= refinedDraft.length && item.text) {
                                let fixedText = item.text;
                                if (language === 'ar') {
                                    fixedText = Validator.stripArabicTashkeel(fixedText);
                                }
                                refinedDraft[spNum - 1] = { text: Validator.sanitizeVocabulary(fixedText, childAge, language) };
                            }
                        });
                    }

                    // Re-validate after surgical repair
                    validation = Validator.validateDraftQuality(refinedDraft, {
                        expectedLength: draft.length,
                        childAge,
                        childName,
                        secondCharacterName: secondCharacter?.name,
                        isDual,
                        language,
                        anchorTriggerRule: hasAnchor ? activeAnchorRule : undefined,
                        primaryVisualAnchor: hasAnchor ? primaryAnchor : undefined,
                        customStoryText
                    });
                } catch (repairErr) {
                    console.warn(`[EditorAgent] Surgical repair round ${round} failed:`, repairErr);
                }
            }

            // Comparative Diff Telemetry: Raw vs Edited
            const wordCountDeltas = refinedDraft.map((s, idx) => {
                const rawWc = Validator.countVisibleWords(draft[idx]?.text || '');
                const editedWc = Validator.countVisibleWords(s.text);
                return { spread: idx + 1, raw: rawWc, edited: editedWc, delta: editedWc - rawWc };
            });

            const status = validation.valid ? 'Success' : 'Failed';

            return {
                result: refinedDraft,
                log: {
                    stage: 'QA',
                    timestamp: startTime,
                    inputs: { draftLength: draft.length },
                    outputs: { 
                        pageCount: refinedDraft.length,
                        validationValid: validation.valid,
                        qualityWarnings: validation.warnings,
                        qualityErrors: validation.errors,
                        wordCountDeltas
                    },
                    status,
                    durationMs: Date.now() - startTime
                }
            };
        });
    } catch (e: any) {
        console.error("[EditorAgent] Pass failed:", e);
        return {
            result: draft,
            log: {
                stage: 'QA',
                timestamp: startTime,
                inputs: {},
                outputs: { 
                    error: e.message, 
                    fallback: true,
                    validationValid: false 
                },
                status: 'Failed',
                durationMs: Date.now() - startTime
            }
        };
    }
}
