
import { ai, cleanJsonString, withRetry } from '../generation/modelGateway';
import { Validator } from '../rules/validator';
import { getWordCountForAge } from '../rules/guidebook';
import { StoryBlueprint, WorkflowLog, Language } from '../../types';

export async function generateStoryDraft(
    blueprint: StoryBlueprint,
    language: Language,
    childName: string,
    childGender?: 'boy' | 'girl',
    secondCharacter?: any,
    spreadCount: number = 8
): Promise<{ result: { text: string }[], log: WorkflowLog }> {

    const startTime = Date.now();
    const age = parseInt(blueprint.foundation?.targetAge || "5");

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
            const wordCountRule = getWordCountForAge(age);

            const prompt = `
            ROLE: Master Storyteller (Language: ${targetLang}).
            TASK: Write the final manuscript for individual spreads.
            
            BLUEPRINT: ${JSON.stringify(blueprint)}
            
            7. **NATIVE LANGUAGE & CULTURAL TRANSLATION:** 
               - The final text MUST be in **${targetLang}**.
               - **NO TASHKEEL/HARAKAT:** If writing in Arabic, ABSOLUTELY DO NOT use any vowel marks or diacritics (Tashkeel). Write in plain, clean Arabic text only.
               - **NATURAL FLOW:** Do not write choppy, disjointed, or "robotic" bullet-point sentences. Connect your thoughts beautifully using natural conjunctions (and, but, so, because) so the text flows like a real story.
               - Ensure natural phrasing and cultural appropriateness.
            
            **CRITICAL IDENTITY RULE:**
            - The Hero's Name is: **${childName}**.
            - You MUST use the name "${childName}" in the story.
            - DO NOT use placeholders like "Rayan", "Ahmed", "Sarah", or "The Boy". Use "${childName}".
            
            MANDATES from Guidebook:
            - Age Group: ${age} Years Old.
            - Word Count Target: ${wordCountRule.min}-${wordCountRule.max} words per spread.
            - Tone: Whimsical, Rhythmic, Engaging.
            - Structure: STRICTLY follow the Blueprint 'spreads'. Do not invent new plot points.
            - Language: ${targetLang}.
            
            **THE ${spreadCount}-PART STRUCTURAL FRAMEWORK (MANDATORY TONE GUIDES):**
            You must write the text for each spread to match its exact psychological purpose in the sequence:
            - **Spread 1 (Intro):** Establish the Normal World, Setting, and point clearly to the Hero's Desire.
            - **Spread 2 (Catalyst):** Introduce the Problem/Obstacle that disrupts the Normal World.
            - **Spread 3 (First Attempt):** Show the Hero actively trying to solve the problem and failing/struggling.
            - **Spread 4 (Complication):** The situation gets harder or a secondary issue/character arises.
            - **Spread 5 (Lowest Point):** The hardest emotional beat. The Hero feels sad, hopeless, or stuck. 
            - **Spread ${Math.ceil(spreadCount * 0.75)} (Insight):** The "Aha!" moment. A shift in strategy or realization.
            - **Spread ${spreadCount - 1} (Final Attempt):** The Hero tries the new strategy and succeeds.
            - **Spread ${spreadCount} (Resolution):** You MUST explicitly state the moral of the story in the final sentences so a child perfectly understands the lesson (e.g., "And they learned that sharing makes playing more fun!"). Callback to the beginning to show growth.
    
            **CRITICAL QUALITY GUIDELINES (Must Follow):**
            1. **STORYBOOK PROSE (BE CREATIVE & SENSORY):**
               - Write in **Rich, Beautiful Storybook Prose**.
               - Ensure beautiful, rhythmic sentence variety (mix short punchy sentences with longer flowing ones).
               - **SENSORY DETAILS:** Do not just state facts. Describe what the hero *hears, feels, and sees*. Use the environment (e.g. "the heavy air," "a soft buzz of leaves," "the warmth on her cheeks").
               - If a natural rhyme occurs and fits perfectly, use it, but NEVER sacrifice story logic just to force a rhyme.
               - **VOCABULARY LOCK:** STRICTLY use simple, common words easily understood by a ${age}-year-old. ABSOLUTELY NO archaic or complex words. No big abstract words.
            2. **ADJECTIVE BAN:** Do NOT use overly abstract adjectives (e.g. "magical", "wondrous").
               - Use Concrete Adjectives (Size, Color, Texture).
               ${age < 6 ? `
            3. **COGNITIVE LOAD (CRITICAL FOR AGE 1-5):** 
               - **ONE NEW THING PER PAGE:** A page can have a new location OR a new character, NOT BOTH.
               - Keep the action simple linear: A -> B.
               ` : `
            3. **COGNITIVE LOAD & NARRATIVE FLOW (CRITICAL FOR AGE 6+):**
               - **LOGICAL TRANSITIONS:** Ensure the narrative flows logically and smoothly from page to page.
               - **EARNED ACTION:** Transitions must be earned through the hero's actions. 
               - DO NOT produce disjointed, bullet-point sentences. Do not just summarize the blueprint. You must write a cohesive, engaging scene that expands on the blueprint naturally.
               `}
            4. **CHARACTER ROLES:** Characters must ACT, not just look. They must help solve the specific page's problem.
               - **DISPOSABLE SUB-CHARACTERS:** Any secondary characters (e.g., animals, villagers, guides) that are NOT the main hero(es) should ideally belong to a single setting. When the hero leaves that location in the next spread, leave the secondary character behind and introduce someone new if needed. Do NOT drag random sub-characters across multiple spreads.
            
            **5. INTRODUCTION PROTOCOL (CRITICAL):**
            - **Spread 1 (The Hero & World):** You MUST explicitly state the hero's name (${childName}) in the first sentence. You MUST explicitly describe the physical location/setting so the reader knows where the story begins. Focus on their emotions and personality (e.g., curious, dreamy). STRICTLY DO NOT discuss ANY physical body traits, clothing, or skin colors.
            - **New Entry:** If a later spread introduces a new character (e.g. Zara, the Town Elder), you MUST introduce them explicitly (who they are, or their relation to the hero) BEFORE they take an action. STRICTLY DO NOT invent physical traits or clothing for them either.
            
            ${secondCharacter ? `**DUAL HERO PROTOCOL (STRICT):**
            - The companion ${secondCharacter.name} MUST be explicitly introduced by name in Spread 1 or Spread 2 alongside the hero. You MUST write a clear, warm welcome sentence giving 1-2 personality traits (e.g., "And right by her side was her sister Farah — the one who always knew how to listen."). Do NOT have them silently appear mid-scene with just a comma clause.
            - The companion MUST actively say or do something that directly helps solve the page's problem. They cannot be a passive bystander.` : ''}

            **WORLD-INTRODUCTION RULES (CRITICAL — READ BEFORE WRITING SPREAD 1):**
            1. **NO STRANGER CHARACTERS IN SPREAD 1:** Every named non-hero character or mythical figure (e.g., "The Man in the Moon", "The Star Queen", "The Night Owl") MUST have a reason WHY this child already knows them. 
               - You MUST provide a maximum 5-word context bridge BEFORE the desire is stated.
               - Bad: "He wished he could meet the Man in the Moon." (Who is he? The reader has no context.)
               - Good: "His grandmother always said the Man in the Moon watched over sleeping children. Tonight, Rayan wondered if he was lonely too." (Context first → desire second.)
               - This rule applies to animals, magical figures, legends, ANY named entity that is not the main hero.
            2. **CAUSAL DISCOVERY RULE — NO FREE-FLOATING SHIMMERS:**
               - Every object that enters the story (a toy, a box, a glowing thing) MUST be discovered as the DIRECT RESULT of a physical action the hero takes.
               - The hero's emotional state is NEVER a valid cause for an object appearing. An emotion can motivate an action — the action triggers the discovery.
               - Structure: Hero feels X → Hero DOES something (specific physical action) → Hero discovers Y.
               - Bad: "He felt sad. A shimmer caught his eye from the toy box." (Random coincidence.)
               - Good: "He turned away from the window and picked through his old toys, looking for something to do. As he dug deeper into the box, his fingers touched something cold and smooth — a forgotten magnifying glass." (Action → Discovery.)

            **WRITING ANTI-PATTERNS (STRICTLY FORBIDDEN):**
            - **NO LITERAL TRANSLATION OF IDIOMS:** Do NOT translate English figures of speech or blueprint phrases literally into the target language. If the blueprint says "reach the end of the world", do NOT write "نهاية العالم" (apocalyptic). Instead, rephrase it as a child-friendly adventure goal (e.g., "discover the secret in the big old tree").
            - **NO VAGUE SUB-CHARACTER DIALOGUE:** If a sub-character (e.g., an animal) speaks to the hero, their words MUST be specific and self-explanatory. The child reader must understand what is being asked or offered. NEVER write dialogue like "لغزٌ عندي!" (I have a riddle!) without immediately following with what the riddle actually is or at least what it's about.
            - **NO ABRUPT CHARACTER APPEARANCES:** A new character must be given at least one full sentence of arrival before they speak or act. The reader must know who they are, why they are there, and their relationship to the hero before any plot action is taken by them.

            6. **SHOW, DON'T TELL:** Do not explain the lesson. Show the character making a choice.
            7. **LOGIC & TRANSITIONS (CRITICAL FIX):** Every spread MUST explain WHY the character moved to a new location or took a new action. Never abruptly cut to a new setting without an explicit text transition connecting the previous action to the new one (e.g. "To find the lost ball, he ran into the forest").
            8. **PRIMARY VISUAL ANCHOR:** The blueprint provides a "primaryVisualAnchor". You MUST mention and interact with this specific object multiple times throughout the story text as a recurring motif.
            
            ${age <= 5 ? `
            **AGE ${age} SPECIAL CONSTRAINTS (STRICT):**
            A. **NO PRONOUNS:** NEVER use "He" or "She" for the main hero. Always use the character's Name (e.g. "Zayn runs").
               - *Reason:* Young kids get confused by pronouns.
            ` : `
            **AGE ${age} PRONOUN GUIDANCE (CRITICAL):**
            - The main hero(${childName}) is a **${childGender || 'child'}**.
            ${secondCharacter?.gender ? `- The companion(${secondCharacter.name}) is a **${secondCharacter.gender}**.` : ''}
            - When using pronouns, you MUST correctly use gendered pronouns ("He/His", "She/Her", or their equivalents in the target language) matching their respective genders. Do not guess the gender.
            ` }

            **EMOTIONAL & CAUSALITY RULES (CRITICAL):**
            1. **DRAMATIZE, DON'T STATE (SHOW PHYSICALITY):**
               - Do NOT just name the emotion or state the lesson (e.g., "He was sad", "She learned that sharing is good").
               - **DESCRIBE THE PHYSICAL SENSATION:** "His tummy flipped," "Her face felt hot," "His shoulders dropped," "A small, quiet tear slid down his cheek."
               - Make the reader feel the internal logic of the change. The character must transform because of a felt, internal realization, not just because the plot requires it.
            2. **PACING & BREATHING ROOM:**
               - **Do not rush.** Let the reader live inside the moment. Do not just summarize the chronological actions. 
               - **USE PAUSES:** If a character is listening or thinking, dedicate the physical space of the sentences to that silence. Let the scene breathe.
               - If a spread is about sadness or a lowest point, stay in that emotion for the entire text of that spread. Do NOT rush to resolve it faster than the emotional tension justifies.
               - The story must feel earned, not like a checklist of plot points being crossed off.
            3. **CAUSE & EFFECT:** No coincidences. 
               - Success MUST come from the Hero's choice/action foundation.
            4. **INSIGHT MOMENT (TWO BEATS):** 
               - The "Insight" must be explicitly split into:
                 1. **Observation:** The Hero notices a specific detail (e.g., "Then he saw the tiny ant carrying the large crumb").
                 2. **Realization:** The Hero understands what it means, internalizing the lesson before acting on it.
               - *Do not rush this.*
            5. **RESOLUTION PAYOFF (CALLBACK):** 
               - The ending MUST explicitly mention or reference the **initial obstacle** to show how far they've come.
            6. **SETTING CONTINUITY (CRITICAL NARRATIVE ANCHOR):** 
               - You MUST use consistent terminology for locations based on the blueprint.
               - If the blueprint specifies the location as a "Museum", refer to it as a museum. Do not abruptly rename it to a "Tomb" or "Temple" in the next stanza unless the blueprint explicitly states the characters physically moved. Consistency prevents reader confusion.
               ${age < 6 ? `
            7. **LANGUAGE DENSITY (STRICT FOR AGE 1-5):** 
               - **MAX 1 ADJECTIVE PER NOUN:** Never stack them.
                 - *Bad:* "The big, red, shiny ball."
                 - *Good:* "The shiny red ball" (Limit) or just "The red ball."
               ` : ''}
            8. **CONTENT SAFETY & APPROPRIATENESS (STRICT BAN):**
               - ABSOLUTELY NO skulls, skeletons, weapons, violence, or truly scary monsters.
               - ABSOLUTELY NO rainbows. Do not describe rainbows.
               - ONLY use completely fictional supporting characters (e.g., talking animals, wizards).
               - This is a children's book. Even for "adventure" themes, use kid-friendly props like glowing crystals, ancient maps, compasses, or colorful keys instead.

            OUTPUT JSON SCHEMA:
            [
                { "spreadNumber": 1, "text": "String" },
                ... (${spreadCount} items total, spreadNumber 1 through ${spreadCount})
            ]
            `;

            const model = ai().getGenerativeModel({
                model: 'gemini-2.0-flash',
                generationConfig: { responseMimeType: "application/json" }
            });

            const response = await model.generateContent(prompt);
            const draft = JSON.parse(cleanJsonString(response.response.text()));

            if (!Validator.validateDraft(draft)) {
                throw new Error("Drafting generated insufficient pages.");
            }

            return {
                result: draft,
                log: {
                    stage: 'Drafting',
                    timestamp: startTime,
                    inputs: { title: blueprint.foundation.title },
                    outputs: { pageCount: draft.length },
                    status: 'Success',
                    durationMs: Date.now() - startTime
                }
            };
        });
    } catch (e: any) {
        return {
            result: [],
            log: {
                stage: 'Drafting',
                timestamp: startTime,
                inputs: {},
                outputs: { error: e.message },
                status: 'Failed',
                durationMs: Date.now() - startTime
            }
        };
    }
}
