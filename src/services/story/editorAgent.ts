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
            const primaryAnchor = blueprint.foundation?.primaryVisualAnchor || 'Special Object';
            const heroDesire = blueprint.foundation?.heroDesire || '';
            const fallbackTrigger = `When ${isDual ? `${heroNameA} and ${heroNameB} operate` : `${childName} operates`} the ${primaryAnchor} with calm, steady patience, it works smoothly. When rushed, pulled hard, or tilted, it stops or resets.`;
            const activeAnchorRule = blueprint.foundation?.anchorTriggerRule || fallbackTrigger;

            const prompt = `
            ROLE: Senior Children's Book Editor — brutally honest literary critic and skilled rewriter.
            LANGUAGE: ${targetLang}
            AGE GROUP: ${childAge} years old
            ${isDual ? `HEROES: Dual-Hero story featuring "${heroNameA}" and "${heroNameB}". Both heroes are co-protagonists.` : `HERO: Single-Hero story featuring "${childName}".`}
            
            ${heroDesire ? `HERO CORE DESIRE: "${heroDesire}" (Spread 1 must ground this motive in the child's home base)` : ''}
            ANCHOR OBJECT RULE: "${activeAnchorRule}"
            
            You will receive a rough draft of a children's book. Your job is to apply a strict, professional three-pass editorial review and return a polished, coherent manuscript.
            You are NOT a proofreader. You are a STORY DOCTOR. You have FULL PERMISSION to rewrite entire spreads if they are broken.

            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            📖 PASS 1 — COLD READ (No Blueprint)
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            First, read the draft as a completely uninformed reader. You do NOT have the blueprint yet. Ask these questions spread by spread:

            A. **STANDALONE LOGIC & PERSONAL MOTIVE ORIGIN:** Does Spread 1 establish the child's starting **Home Base** (play spot, bedroom rug, garden) and a warm, personal reason for their desire? 
               ${isDual ? `- **DUAL HERO GROUNDING:** Spread 1 MUST establish BOTH "${heroNameA}" and "${heroNameB}" in their shared starting location. DO NOT remove "${heroNameB}" from Spread 1!` : `- ❌ **FLAG & FIX:** If Spread 1 drops a flat, ungrounded mission statement without saying who ${childName} is, REWRITE IT to give the desire a personal, warm origin.`}
            B. **WORLD-LOGIC & HOME-BASE FRAME AUDIT:** Is the setting grounded in Spread 1 so that returning to it in Spread ${draft.length} makes complete sense to a parent reading aloud?
            C. **MAGICAL ANCHOR CONTINUITY & CAUSE-FIRST LOGIC:** 
               - Is the anchor item established as special from first mention?
               - Does the text maintain object continuity by writing "${isDual ? 'their [item]' : childName + '\'s [item]'}" instead of "a [item]"?
               - Is cause stated before effect with observable physics? (❌ "Glowed warm for happy ${childName}" → ✅ "${childName} held the tray level and tapped the lid. The lantern clicked open.").
            D. **SEAMLESS RETURN TRANSITION & WARM RESOLUTION TAKEAWAY (SPREAD ${draft.length}):**
               - Is there an explicit bridging sentence explaining how ${isDual ? `${heroNameA} and ${heroNameB}` : childName} traveled back from the adventure setting to the Spread 1 Home Base?
               - Does the final spread conclude with a warm, comforting takeaway in the child's own voice (e.g., *"Quiet and slow was the best kind of magic."*) instead of abruptly stopping?
            E. **MENTOR / HELPER ANIMAL PURPOSE AUDIT:** If a helper animal appears (e.g., an owl, turtle, or lizard), is their presence given a clear quality (e.g., *"An owl blinked, slow and calm."*) so later callbacks make immediate sense?
            F. **AGE-TIERED VOCABULARY AUDIT (AGE ${childAge}):**
               ${childAge <= 3 ? `
               - **TODDLER VOCABULARY & SIMPLICITY (Ages 1–3):**
                 - **STRICT WORD COUNT:** Every spread must be strictly **${wordCountRule.min}–${wordCountRule.max} words**.
                 - **ONE IDEA PER SPREAD:** Avoid cramming action + description + emotion into a single spread. Keep it spare and let the art do the work.
                 - **ZERO SUBORDINATE CLAUSES:** Eliminate "because", "so that", "in order to", or chained compound sentences. Keep sentences short, musical, and direct.
                 - ❌ **FLAG & FIX OVERLY COMPLEX VERBS:** "scurried" → "ran/hid", "slumped/sank" → "sat down", "swayed" → "moved", "drifted/fluttered" → "blew/flew", "peered/observed" → "looked/peeked".
                 - ❌ **FLAG & FIX OBSCURE NOUNS:** "nook" → "cozy spot" or "play spot", "fennec fox" → "little fox", "canopy" → "big trees".
                 - ❌ **FLAG & FIX ADVANCED EMOTIONS:** "frustrated" → "mad/upset", "confused" → "mixed up", "disappointed" → "sad", "relieved" → "calm/safe".
                 - ✅ **APPROVED PRIMARY EMOTIONS:** "happy", "sad", "mad", "calm", "proud", "scared", "mixed up", "safe", "cozy".
               ` : `
               - **CLEAR EVERYDAY WORDS (Ages ${childAge}):** Ban academic/adult words ("nook", "endeavor", "observation", "haste", "foster", "fatigue", "apparatus"). Use concrete child words.
               `}
            G. **INTUITIVE SOUND EFFECTS (ONOMATOPOEIA) AUDIT:**
               - Are sound words universally recognizable (*CRUNCH*, *SHHH...*, *SNIFF SNIFF*, *SIGH...*, *SNORE!*, *SPLASH!*, *ROAR!*, *BEEP BEEP*, *TAP TAP*, *FLAP FLAP*, *TWEET TWEET*, *ZOOM!*, *GIGGLE GIGGLE*, *SQUEAK!*)?
               - ❌ **FLAG & FIX INVENTED SPELLINGS:** If you see unreadable or bizarre sound spellings like "WHIMP-WHIMP" or "WHISPER-WHISP", replace them with intuitive sounds or concrete actions.
            H. **COMPLETE SENTENCES & GRAMMAR FRAGMENTS:**
               - Ensure no verbs are dropped to dodge pronouns (❌ "${childName} content" → ✅ "${childName} felt calm and happy").

            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            📋 PASS 2 — BLUEPRINT & THEME VERIFICATION
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            Now compare the story against its original intent:

            **THE BLUEPRINT (Intended Story Structure):**
            ${JSON.stringify(blueprint)}

            I. **THEME–PREMISE DRAMATIZATION:** Does the story actually dramatize the marketed theme?
            J. **THEMATIC & TITLE PROMISE PAYOFF:** Does the climax reveal the secret, treasure, or language promised in the Title?
            K. **PERSONIFICATION PAYOFF:** If the setting was personified (e.g. "The pyramid loved tricky games"), did it pay off as a testing guide that rewards their patience?
            L. **WARM COZY ENDING (ANTI-PREACHY, BUT NEVER SILENT):** Does the final spread deliver an emotional, cozy resolution and child-voice takeaway (e.g. bedtime comfort, a warm realization)?
               - ❌ **FLAG & FIX:** If the draft states the moral like an adult proverb (e.g. "He knew: patience achieves more than hurried effort"), REWRITE IT IMMEDIATELY into a warm child action or happy bedtime realization.
            M. **RESOLUTION CALLBACK:** Does the ending specifically reference the hero's initial situation or desire so the child sees how far the hero has come?
            N. **PAGE-TURN SENSORY BRIDGES:** Check transitions between all spreads. Link page turns with sounds, physical actions, or visual cues.
            O. **ENTITY PERSISTENCE:** Did the story stay consistent with its helper animals/tools?

            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            ✍️ PASS 3 — SURGICAL REWRITE
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            Now make your edits based on all identified problems. Apply ALL of the following:

            1. **REWRITE FREELY:** You are allowed and expected to rewrite entire paragraphs or spreads that fail. Do not just polish a broken structure.
            ${customStoryText ? `**CRITICAL EXCEPTION FOR CUSTOM POEM/TEXT:** The user has provided an exact poem/text: """${customStoryText}""". Under NO circumstances should you rewrite, "fix", or change the words of this provided poem. Your ONLY job in this rewrite phase is to distribute the provided words accurately across the spreads. Do not alter the rhythm or vocabulary of the provided text.` : ''}
            2. **GROUND SPREAD 1 & RESOLVE SPREAD ${draft.length}:** Ensure Spread 1 grounds the Home Base and personal motive ${isDual ? `for BOTH "${heroNameA}" and "${heroNameB}"` : `for "${childName}"`}, and Spread ${draft.length} smoothly bridges the journey home with a warm child-voice takeaway.
            3. **OBJECT CONTINUITY:** Use possessive for special items ("${childName}'s [item]" or "their [item]") to ensure continuous identity across pages.
            4. **APPLY AGE-TIERED VOCABULARY WHITELIST (Age ${childAge}):**
               ${childAge <= 3 ? `- Use ONLY simple verbs (ran, hid, sat down, moved, blew, looked), simple nouns (little fox, play spot), and primary emotions (happy, sad, mad, calm, proud, scared, mixed up, safe).` : `- Use clear, everyday concrete words.`}
            5. **UNIVERSAL INTUITIVE SOUNDS:** Use recognizable sounds (*CRUNCH*, *SHHH...*, *SNIFF SNIFF*, *SIGH...*, *SNORE!*, *GIGGLE GIGGLE*).
            6. **CAUSE-FIRST ANCHOR LOGIC & ZERO MOOD-RING TOLERANCE:** Strictly ban emotion-reading objects (no "the pebble glowed when happy and dimmed when sad" or "the lantern shone with his curiosity"). The anchor object must obey observable physical mechanisms (e.g. clicking a latch, setting a dial, winding a key, holding level away from metal).
            7. **ORIGINALITY & CLICHÉ BAN:** Ban cliché "fear of the dark" or "scary shadows turning out to be ordinary toys" plots. Ensure active, proactive, wonder-filled child exploration.
            8. **READ-ALOUD ONOMATOPOEIA:** Ensure every spread includes at least one engaging sound word (*CRUNCH*, *SHHH...*, *CLICK!*, *SPLASH!*, *SIGH...*, *HUMMM...* in English; *طَقْ طَقْ!*, *ووووش!*, *زَقْزَقَ!*, *تِكْ تِكْ!*, *خَرِير!*, *هَفْ...* in Arabic).
            9. **EMOTION-ACTION NON-REDUNDANCY:** Do NOT redundantly state an emotion and then describe an object reaction in consecutive sentences. Narrate feelings and physical mechanics cleanly.
            10. **INSIGHT STRUCTURE:** Spread 6 must have TWO beats (observe clue → realize meaning).
            11. **RHYTHM, CONCISENESS AND VOCABULARY:**
                - Keep text punchy, crisp, and within target: **${wordCountRule.min}–${wordCountRule.max} words per spread**.
            12. **LANGUAGE:** All output text MUST be in ${targetLang}. Arabic MUST NOT contain Tashkeel (vowel diacritics).
            13. **HERO NAMES:** ${isDual ? `You MUST feature BOTH "${heroNameA}" and "${heroNameB}" throughout. Spread 3 must show mismatch friction, Spread 5 must give each hero their own named feeling, and Spread 7 must have both heroes act together.` : `You MUST use the exact name "${childName}" throughout. Do NOT change it.`}
            14. **PAGE BUDGET:** You MUST return EXACTLY ${draft.length} spreads. Do not add or remove pages.
            15. **WORD COUNT:** ${wordCountRule.min}-${wordCountRule.max} words per spread.
            16. **NO PHYSICAL DESCRIPTIONS:** Do NOT invent clothing, physical features, or skin color for the hero. Let the illustrations do that.

            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            🔁 PASS 4 — VERIFICATION RE-READ (MANDATORY)
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            Before producing your final JSON output, re-audit your Pass 3 rewritten spreads against this mandatory checklist. If ANY check fails, fix that spread immediately:
            - [ ] **Home Base Grounding:** Spread 1 explicitly grounds ${isDual ? `BOTH ${heroNameA} and ${heroNameB}` : childName} in their Home Base and establishes a personal emotional origin for their desire.
            - [ ] **Object Continuity:** Special items use possessives rather than generic articles ("a [item]").
            - [ ] **Anchor Item Rule:** Anchor item trigger is stated cause-first (concrete physical action operating the tool; rushed action jams/resets it). ZERO emotion-reading magic.
            - [ ] **Cliché Check:** Zero "fear of the dark / shadows turn into toys" clichés.
            - [ ] **Onomatopoeia Check:** Every spread contains at least one vivid sound word.
            - [ ] **Return Journey Bridge & Warm Takeaway:** Spread ${draft.length} contains a smooth return bridge and ends with a warm child-voice takeaway.
            - [ ] **Helper Animal Meaning:** Helper creatures are given a clear meaning on introduction so callbacks are earned.
            - [ ] **Simple Vocabulary Whitelist (Age ${childAge}):** ${childAge <= 3 ? `Zero complex verbs and zero adult emotions. Pure simple words.` : `Zero academic/adult words.`}
            - [ ] **Intuitive Sounds:** Only recognizable onomatopoeia (*CRUNCH*, *SHHH...*, *SNIFF SNIFF*, *SIGH...*, *SNORE!*). Zero invented spellings.
            - [ ] **Complete Sentences:** Zero grammatical fragments.
            - [ ] **Pronoun Policy Guard (Age ${childAge}):** ${childAge <= 5 ? `For ages 1–5: avoid 3rd-person pronouns ("it", "its", "he", "she", "him", "her", "his"). Use the hero's name possessive ('${childName}'s [item]'), the animal's name ('The little fox'), or active verbs.` : `Pronouns correctly match character genders.`}
            - [ ] **Arabic Diacritics:** Zero Tashkeel if writing Arabic.
            - [ ] **Word Count:** Every spread is strictly within ${wordCountRule.min}–${wordCountRule.max} words.

            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            THE ROUGH DRAFT (Apply all four passes to this):
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            ${JSON.stringify(draft)}

            OUTPUT JSON SCHEMA (return EXACTLY ${draft.length} items — no more, no less):
            [
                { "spreadNumber": 1, "text": "Polished text..." },
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

            // Ensure we got exactly the same number of spreads back
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
                language,
                anchorTriggerRule: activeAnchorRule,
                primaryVisualAnchor: primaryAnchor
            });

            // Step 3: Surgical repair for word count bounds, Arabic tashkeel, pronouns (ages 1-5), or grammar fragments
            if (!customStoryText) {
                const failingSpreads: { index: number; spreadNumber: number; currentText: string; issues: string[] }[] = [];
                refinedDraft.forEach((s, idx) => {
                    const issues: string[] = [];
                    const wc = Validator.countVisibleWords(s.text);
                    if (wc < wordCountRule.min || wc > wordCountRule.max) {
                        issues.push(`Word count is ${wc} words (must be strictly ${wordCountRule.min}–${wordCountRule.max} words).`);
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
                            issues.push(`Avoid 3rd-person pronouns [${pCheck.matchedPronouns.join(', ')}]. Use hero possessive ('${childName}'s [item]') or active verbs.`);
                        }
                    }
                    const gCheck = Validator.checkGrammarFragments([s.text]);
                    if (!gCheck.pass) {
                        issues.push(`Fix grammar fragment / missing verb.`);
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

                if (failingSpreads.length > 0) {
                    try {
                        const surgicalPrompt = `
ROLE: Senior Picture-Book Editor (Surgical Fix).
LANGUAGE: ${targetLang}
AGE GROUP: ${childAge} years old
${isDual ? `HEROES: "${heroNameA}" and "${heroNameB}"` : `HERO NAME: "${childName}"`}

Fix ONLY the following specific spreads to resolve the listed violations:
${failingSpreads.map(f => `Spread ${f.spreadNumber}:
- Current Text: "${f.currentText}"
- Issues to Fix: ${f.issues.join('; ')}`).join('\n\n')}

MANDATORY RULES:
1. Target Word Count: Strictly ${wordCountRule.min}–${wordCountRule.max} visible words per spread.
2. ${language === 'ar' ? 'Arabic Output: 100% free of Tashkeel/Harakat diacritics.' : (childAge <= 5 ? `Age 1–5 Pronoun Policy: Do NOT use "it", "its", "he", "she", "him", "her", "his". Replace with character name, object possessive ("${childName}'s pebble"), or active verbs.` : 'Natural grammar and gender matching.')}
3. Complete sentences only (no missing verbs).
4. Output JSON array containing ONLY the fixed spreads:
[
  ${failingSpreads.map(f => `{ "spreadNumber": ${f.spreadNumber}, "text": "Fixed text..." }`).join(',\n  ')}
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
                            language,
                            anchorTriggerRule: activeAnchorRule,
                            primaryVisualAnchor: primaryAnchor
                        });
                    } catch (repairErr) {
                        console.warn("[EditorAgent] Surgical repair pass skipped:", repairErr);
                    }
                }
            }

            return {
                result: refinedDraft,
                log: {
                    stage: 'QA',
                    timestamp: startTime,
                    inputs: { draftLength: draft.length },
                    outputs: { 
                        pageCount: refinedDraft.length,
                        validationValid: validation.valid,
                        qualityWarnings: validation.warnings 
                    },
                    status: 'Success',
                    durationMs: Date.now() - startTime
                }
            };
        });
    } catch (e: any) {
        // If the editor fails, return the original draft rather than breaking the whole flow
        console.error("Editor Agent Failed, falling back to original draft:", e);
        return {
            result: draft,
            log: {
                stage: 'QA',
                timestamp: startTime,
                inputs: {},
                outputs: { error: e.message, fallback: true },
                status: 'Failed',
                durationMs: Date.now() - startTime
            }
        };
    }
}
