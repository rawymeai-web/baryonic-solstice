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
    customStoryText?: string
): Promise<{ result: { text: string }[], log: WorkflowLog }> {

    const startTime = Date.now();

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

            const prompt = `
            ROLE: Senior Children's Book Editor — brutally honest literary critic and skilled rewriter.
            LANGUAGE: ${targetLang}
            AGE GROUP: ${childAge} years old
            
            You will receive a rough draft of a children's book. Your job is to apply a strict, professional three-pass editorial review and return a polished, coherent manuscript.
            You are NOT a proofreader. You are a STORY DOCTOR. You have FULL PERMISSION to rewrite entire spreads if they are broken.

            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            📖 PASS 1 — COLD READ (No Blueprint)
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            First, read the draft as a completely uninformed reader. You do NOT have the blueprint yet. Ask these questions spread by spread:

            A. **STANDALONE LOGIC & PERSONAL MOTIVE ORIGIN:** Does Spread 1 establish the child's starting **Home Base** (play nook, bedroom rug, garden) and a warm, personal reason for their desire? 
               - ❌ **FLAG & FIX:** If Spread 1 drops a flat, ungrounded mission statement (e.g., *"dreaming of helping desert friends sleep"* without saying who ${childName} is or why she loves animals), REWRITE IT to give the desire a personal, warm origin.
            B. **WORLD-LOGIC & HOME-BASE FRAME AUDIT:** Is the child's setting grounded in Spread 1 so that returning to it in Spread ${draft.length} ("back in her play space / bedroom") makes complete sense to a parent reading aloud?
            C. **MAGICAL ANCHOR DEVICE TRIGGER AUDIT:** If a recurring anchor object (glowing pebble, compass, lantern) changes state (e.g. glowing warm $\rightarrow$ growing cold $\rightarrow$ glowing warm), was its simple physical trigger rule stated in Spread 1 upon first introduction? If not, ADD IT to Spread 1.
            D. **SEAMLESS RETURN TRANSITION & RESOLUTION (SPREAD ${draft.length - 1} TO ${draft.length}):** Is there an explicit bridging sentence explaining how the child (and any friend) traveled smoothly from the wild/adventure setting back to the Spread 1 Home Base?
               - ❌ **FLAG & FIX:** If Spread ${draft.length} abruptly opens with a jump cut (e.g., *"Back in her play space"* with no bridge from the desert/forest), ADD A BRIDGING CLAUSE (e.g., *"${childName} gently carried her sleepy new friend home, back to her cozy play nook..."*).
            E. **CAUSAL CHAIN & NO OFF-SCREEN SOLVES:** Is every action preceded by a reason? If an obstacle blocks them in Spread 2, is it causally addressed in Spread 3 rather than vanishing off-screen?
            F. **CHARACTER INTRODUCTION (DUAL HERO AUDIT):** Does every named figure (especially a co-hero companion) have an intentional, warm on-screen entrance? A co-hero cannot suddenly appear mid-sentence in Spread 2 without an introduction.
            G. **CO-HERO AGENCY & INTERIOR LIFE:** Does the companion have their own voice, observations, and active role, or are they just an empty helper?
            H. **EMOTIONAL SENSORY & NAMING AUDIT (AGE ${childAge}):** For young children (ages 1–5), are physical sensations paired with **direct named emotion words** (*confused, disappointed, worried, relieved, proud, happy*)? If emotional states are only conveyed through vague mood phrases ("felt all wrong", "quiet magic"), ADD the direct emotion names!

            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            📋 PASS 2 — BLUEPRINT & THEME VERIFICATION
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            Now compare the story against its original intent:

            **THE BLUEPRINT (Intended Story Structure):**
            ${JSON.stringify(blueprint)}

            I. **THEME–PREMISE DRAMATIZATION:** Does the story actually dramatize the marketed theme? (e.g., if the theme is "Understanding animal language", does ${childName} explicitly learn to interpret the animal's quiet sounds or stillness as their message?).
            J. **THEMATIC & TITLE PROMISE PAYOFF:** Does the climax reveal the secret, treasure, or language promised in the Title?
            K. **PERSONIFICATION PAYOFF:** If the setting was personified (e.g. "The pyramid loved tricky games"), did it pay off as a testing guide that rewards their patience?
            L. **WARM COZY ENDING (ANTI-PREACHY CHECK):** Does the final spread deliver an emotional, cozy resolution (bedtime comfort, a hug, drawing in a book, whispering goodnight)?
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
            2. **GROUND SPREAD 1 & RESOLVE SPREAD ${draft.length}:** Ensure Spread 1 grounds the Home Base and personal motive, and Spread ${draft.length} smoothly bridges the journey home.
            3. **CAUSAL CHAIN & SENSORY BRIDGE REPAIR:** Where a character finds something, moves somewhere, or enters a new scene, add the physical sensory trigger.
            4. **STRIP ADULT PREACHING:** Rewrite any essay-like moral sentence into a child's sensory action, happy bedtime whisper, or comforting feeling.
            5. **DUAL EMOTIONAL SENSORY + NAMING:** Combine physical gestures with direct child-friendly emotion words for young readers.
            6. **INSIGHT STRUCTURE:** Spread 6 must have TWO beats:
               - First: The hero **observes** a specific clue or animal communication.
               - Then: The hero **internally realizes** what it means.
               - Do not rush to the solution before the realization is felt.
            7. **RHYTHM, CONCISENESS AND VOCABULARY:**
               - Keep text punchy, crisp, and within target: **${wordCountRule.min}–${wordCountRule.max} words per spread**.
               - STRICTLY use simple, concrete, everyday words (${childAge} years old). ❌ Ban adult words ("nook", "endeavor", "observation", "haste", "foster").
               ${childAge <= 5 ? `- For age ${childAge}, ensure action spreads have fun, capitalized sound words (*CRUNCH!*, *FLAP-FLAP!*, *TWEET!*, *SHHH...*, *CLICK!*).` : ''}
            8. **LANGUAGE:** All output text MUST be in ${targetLang}. Arabic MUST NOT contain Tashkeel (vowel diacritics).
            9. **HERO NAME:** You MUST use the exact name "${childName}" throughout. Do NOT change it.
            10. **PAGE BUDGET:** You MUST return EXACTLY ${draft.length} spreads. Do not add or remove pages.
            11. **WORD COUNT:** ${wordCountRule.min}-${wordCountRule.max} words per spread.
            12. **NO PHYSICAL DESCRIPTIONS:** Do NOT invent clothing, physical features, or skin color for the hero. Let the illustrations do that.

            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            🔁 PASS 4 — VERIFICATION RE-READ (MANDATORY)
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            Before producing your final JSON output, re-audit your Pass 3 rewritten spreads against this mandatory checklist. If ANY check fails, fix that spread immediately:
            - [ ] **Home Base Grounding:** Spread 1 explicitly grounds ${childName} in their Home Base (play spot, room, rug, garden) and establishes a personal emotional origin for their desire.
            - [ ] **Anchor Item Rule:** If an anchor object is used, Spread 1 explicitly states its physical behavior rule (e.g. glowing warm when happy, cooling when worried).
            - [ ] **Return Journey Bridge:** Spread ${draft.length} contains an explicit bridging clause showing how ${childName} travels smoothly back from the adventure setting to the Spread 1 Home Base.
            - [ ] **Pronoun Policy Guard (Age ${childAge}):** ${childAge <= 5 ? `Strictly NO third-person pronouns (he/she/him/her/his/hers) refer to ${childName} or named companion. Restructure sentences with articles ('a', 'the') and active verbs without awkward repetition.` : `Pronouns correctly match character genders.`}
            - [ ] **Emotion Words:** ${childAge <= 5 ? `Spreads 3 through ${draft.length} pair physical sensations with direct named emotion words (happy, sad, worried, proud, surprised, relieved, confused, disappointed).` : `Emotions are clearly felt.`}
            - [ ] **Banned Words & Beat Preservation:** No archaic/academic words ("nook", "endeavor", "observation", "haste", "foster", "fatigue", "apparatus"). Any replaced word preserves the story beat using an approved substitute.
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

            return {
                result: editedDraft,
                log: {
                    stage: 'QA',
                    timestamp: startTime,
                    inputs: { draftLength: draft.length },
                    outputs: { pageCount: editedDraft.length },
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
