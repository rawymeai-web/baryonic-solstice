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

            A. **STANDALONE LOGIC:** Does each spread make sense by itself? If a child reads page 3 having forgotten page 2, do they still understand where the hero is, what they want, and why they are doing what they are doing?
            B. **CAUSAL CHAIN:** Is every action the hero takes preceded by a reason? No coincidences allowed.
               - Bad: "A shimmer caught his eye from the toy box." (Why is he at the toy box? What caused this?)
               - Good: "He trudged to the toy box, hoping a toy would cheer him up. As his hand dug deeper, he felt something cold and smooth."
            C. **CHARACTER INTRODUCTION:** Does every named figure (person, creature, or mythical entity) have a context bridge before they act? A reader cannot be expected to know who they are without a brief anchor.
               - Bad: "He wished he could meet the Man in the Moon." (Who is the Man in the Moon? Why does the hero know them?)
               - Good: "His grandmother always said the Man in the Moon watched over sleeping children. Tonight, the hero wondered if he was lonely too."
            D. **EMOTIONAL LOGIC:** Are the hero's emotional shifts earned? Does the reader feel the reason for the shift, or does it just happen because the plot requires it?
            E. **PACING:** Does any spread rush its emotional beat? Especially Spreads 4-6 (the darkest emotional territory) — these must breathe and stay in the feeling.
            F. **FLOW:** Read the spreads as a narrative sequence. Does each spread end in a way that logically pulls you into the next? Are there abrupt cuts that leave the reader confused about time, location, or motivation?

            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            📋 PASS 2 — BLUEPRINT VERIFICATION
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            Now compare the story against its original intent:

            **THE BLUEPRINT (Intended Story Structure):**
            ${JSON.stringify(blueprint)}

            G. **MORAL DELIVERED?** Does the story's final spread explicitly and clearly state the lesson in child-friendly language? A child must understand it. Do not assume it was "implied."
            H. **RESOLUTION CALLBACK:** Does the ending specifically reference the hero's initial situation or desire so the child sees how far the hero has come?
            I. **ARC ALIGNMENT:** Does the story achieve the intended arc? (Spread 1=Normal World, 2=Catalyst, 3=First Attempt, 4=Complication, 5=Lowest Point, 6=Insight, 7=Final Attempt, 8=Resolution)
            J. **BLUEPRINT SETTINGS:** Are the locations consistent with the Blueprint's spread-by-spread plan? If the Blueprint says "Forest Path" and the draft says "The Mountain", flag and fix it.

            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            ✍️ PASS 3 — SURGICAL REWRITE
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            Now make your edits based on all identified problems. Apply ALL of the following:

            1. **REWRITE FREELY:** You are allowed and expected to rewrite entire paragraphs or spreads that fail. Do not just polish a broken structure.
            ${customStoryText ? `**CRITICAL EXCEPTION FOR CUSTOM POEM/TEXT:** The user has provided an exact poem/text: """${customStoryText}""". Under NO circumstances should you rewrite, "fix", or change the words of this provided poem. Your ONLY job in this rewrite phase is to distribute the provided words accurately across the spreads. Do not alter the rhythm or vocabulary of the provided text.` : ''}
            2. **CAUSAL CHAIN REPAIR:** Where a character finds something or moves somewhere without a causal trigger, add the physical action that creates the discovery.
            3. **CONTEXT BRIDGE REPAIR:** Where a mythical/new figure appears without context, add a one-sentence introduction that establishes why the child knows them.
            4. **SHOW, DON'T TELL — PHYSICALLY:** Replace every emotional statement with a physical sensation.
               - Strip: "He felt sad."
               - Add: "His shoulders dropped. He pulled his knees up to his chest."
            5. **INSIGHT STRUCTURE:** Spread 6 must have TWO beats:
               - First: The hero **observes** something specific.
               - Then: The hero **internally realizes** what it means.
               - Do not rush to the solution before the realization is felt.
            6. **RHYTHM AND VOCABULARY:**
               - Write in beautiful, rhythmic storybook prose. Mix short punchy sentences with longer flowing ones.
               - STRICTLY use simple, age-appropriate words (${childAge} years old). No archaic or complex vocabulary.
            7. **LANGUAGE:** All output text MUST be in ${targetLang}. Arabic MUST NOT contain Tashkeel (vowel diacritics).
            8. **HERO NAME:** You MUST use the exact name "${childName}" throughout. Do NOT change it.
            9. **PAGE BUDGET:** You MUST return EXACTLY ${draft.length} spreads. Do not add or remove pages.
            10. **WORD COUNT:** ${wordCountRule.min}-${wordCountRule.max} words per spread.
            11. **NO PHYSICAL DESCRIPTIONS:** Do NOT invent clothing, physical features, or skin color for the hero. Let the illustrations do that.

            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            THE ROUGH DRAFT (Apply all three passes to this):
            ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
            ${JSON.stringify(draft)}

            OUTPUT JSON SCHEMA (return EXACTLY ${draft.length} items — no more, no less):
            [
                { "spreadNumber": 1, "text": "Polished text..." },
                ...
            ]
            `;

            const model = ai().getGenerativeModel({
                model: 'gemini-2.0-flash',
                generationConfig: { responseMimeType: "application/json" }
            });

            const response = await model.generateContent(prompt);
            const editedDraft = JSON.parse(cleanJsonString(response.response.text()));

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
