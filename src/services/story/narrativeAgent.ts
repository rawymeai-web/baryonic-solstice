
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
    spreadCount: number = 8,
    customStoryText?: string
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
            
            ${customStoryText ? `**CUSTOM SCRIPT OVERRIDE (CRITICAL MUST FOLLOW):**
            - The user has provided an exact poem or text for the story:
            """
            ${customStoryText}
            """
            - **MANDATORY DIRECTIVE:** You MUST use this provided text across the spreads as the foundation of the story verbatim, or adapt it cleanly if needed to match the ${spreadCount} spreads. 
            - Do NOT invent new plots that deviate from this text.` : ''}
            
            7. **NATIVE LANGUAGE & CULTURAL TRANSLATION:** 
               - The final text MUST be in **${targetLang}**.
               - **NO TASHKEEL/HARAKAT:** If writing in Arabic, ABSOLUTELY DO NOT use any vowel marks or diacritics (Tashkeel). Write in plain, clean Arabic text only.
               - **NATURAL FLOW & LYRICAL CADENCE:** Do not write choppy, disjointed, or "robotic" bullet-point sentences. Connect your thoughts beautifully using natural conjunctions (و، فـ، ثم، لكن، لأن) so the text flows like a real bedtime story.
               - **ARABIC CHILD APPEAL & VOCABULARY BAN:**
                 - ❌ **STRICTLY BANNED PHRASES:** Never use adult fatigue, grim expressions, or heavy emotional words (e.g., NEVER write "زفر بتعب" [sighed with exhaustion], "أرهقه التفكير", "شعر بالعجز", "عقد حاجبيه بغضب").
                 - ✅ **REQUIRED TONE:** Keep the tone warm, melodic, and joyful (نغمة هادئة، دافئة، ومحببة كأنشودة لطيفة). Use sweet, endearing expressions of childlike curiosity (e.g. "تساءل ${childName} بابتسامة لطيفة", "أمال رأسه بحيرة جميلة", "فكر قليلاً ثم رفرفت عيناه بالفرح").
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
            - **Spread 2 (Catalyst / The Interruption):** A sudden external sound, sight, or disruption physically breaks into the Hero's quiet world (e.g., a sharp tap at the glass, a loud chirp outside).
            - **Spread 3 (First Attempt):** Show the Hero eagerly rushing in to solve the problem and failing/struggling.
            - **Spread 4 (Complication):** The situation gets trickier or the obstacle moves further away.
            - **Spread 5 (Lowest Point):** The hardest emotional beat. Physicalize the sadness (drooping shoulders, heavy sigh).
            - **Spread ${Math.ceil(spreadCount * 0.75)} (Insight / Epiphany):** The "Aha!" moment. The Hero pauses, quietly observes a specific natural clue or animal guide, and realizes what to do.
            - **Spread ${spreadCount - 1} (Final Attempt):** The Hero applies the quiet/clever lesson and succeeds!
            - **Spread ${spreadCount} (Warm Emotional Payoff & Bedtime Comfort):** End with a comforting, cozy, heartwarming resolution (snuggling under the blanket, drawing the adventure in a book, whispering a bedtime goodnight, a warm hug).
              - ❌ **STRICTLY FORBIDDEN:** NEVER state the moral as an adult proverb, thesis statement, or essay conclusion (e.g. NEVER write: "He knew: patience and observation achieve more than hurried effort").
              - ✅ **REQUIRED:** Show the child feeling happy, safe, loved, and proud of themselves.
    
            **CRITICAL QUALITY GUIDELINES (Must Follow):**
            1. **CONCISE & PUNCHY STORYBOOK PROSE:**
               - Parents prefer crisp, beautiful, easy-to-read lines that leave room for the illustrations to shine.
               - Keep strictly within target: **${wordCountRule.min}–${wordCountRule.max} words per spread**.
               - Mix short, energetic sentences with smooth, rhythmic lines.
               - **VOCABULARY LOCK FOR AGE ${age}:**
                 ${age <= 3 ? `
                 - **TODDLER VOCABULARY PURITY (Ages 1–3):** Use ONLY simple words a 3-year-old and second-language parents easily follow.
                   - ❌ **STRICTLY BANNED COMPLEX VERBS:** No "scurried", "slumped", "sank", "swayed", "drifted", "fluttered", "peered", "observed", "retreated", "inquired", "approached".
                   - ✅ **APPROVED REPLACEMENTS:** Use "ran", "hid", "sat down", "moved", "blew", "looked", "peeked", "asked", "walked up".
                   - ❌ **NO OBSCURE BIOLOGICAL NAMES:** Do not write "fennec fox" or "canopy". Write "little fox" and "big trees".
                   - ❌ **NO ADVANCED EMOTIONS:** Do NOT use "frustrated", "confused", "disappointed", "relieved".
                   - ✅ **APPROVED PRIMARY EMOTIONS:** Use "mad", "upset", "mixed up", "sad", "calm", "safe", "happy", "proud", "scared", "cozy".
                 ` : `
                 - **AGE-APPROPRIATE VOCABULARY (Ages ${age}):** STRICTLY use clear, concrete everyday words. ABSOLUTELY NO archaic, academic, or adult literary words (❌ No "nook", "endeavor", "observation", "haste", "foster", "fatigue", "apparatus"). Use concrete child words (✅ "play spot", "room", "bed", "blanket", "rug", "puddle", "branches", "window").
                 `}

            2. **THE PAGE-TURN SENSORY BRIDGE RULE (APPLIES ACROSS ALL SPREADS):**
               - Every spread must end with a natural setup, and the next spread must start by continuing that exact physical action or sensory event.
               - **No Teleporting:** If the hero is in their play spot in Spread 1, they cannot suddenly be in the desert in Spread 2 without stepping out the door or hearing a sound outside.
               - **No Unearned Names:** The hero cannot magically know an unfamiliar animal's name in Spread 2 before meeting it.
               - **Sensory Triggers:** Link page turns with sounds, visual flashes, or physical motions (e.g., *Spread 1 ends with quiet $\rightarrow$ Spread 2 starts with a soft cry outside $\rightarrow$ Spread 3 starts with ${childName} running outside*).

            3. **INTUITIVE SOUND WORDS (ONOMATOPOEIA) ONLY:**
               - ${age <= 5 ? `
               - **UNIVERSAL SOUND EFFECT MANDATE:** For age ${age}, every action spread MUST include at least one fun, intuitive, recognizable sound effect in capital letters.
               - ✅ **APPROVED SOUNDS:** *CRUNCH!*, *SHHH...*, *SNIFF SNIFF!*, *SIGH...*, *SNORE!*, *SPLASH!*, *ROAR!*, *BEEP BEEP!*, *TAP TAP!*, *FLAP FLAP!*, *TWEET TWEET!*, *ZOOM!*, *GIGGLE GIGGLE!*, *SQUEAK!*, *CLAP CLAP!*, *DRIP DROP!*.
               - ❌ **STRICTLY BANNED INVENTED SOUNDS:** NEVER invent unpronounceable spellings like "WHIMP-WHIMP" or "WHISPER-WHISP".
               - **CONCRETE SENSORY OVER ABSTRACT:** Never write abstract descriptions like "quick, happy sounds". Write concrete actions and real sounds: "The little fox wiggled. GIGGLE GIGGLE!".
               ` : `
               - **ACTIVE DIALOGUE & CLEVERNESS:** Include lively spoken dialogue and show the hero actively making smart choices.
               `}

            4. **OBJECT CONTINUITY & THE PRONOUN RULE ("${childName}'s pebble", NOT "a pebble"):**
               - When referring to the hero's special item across spreads, NEVER swap it to "a pebble" (which sounds like a brand-new object).
               - ✅ **USE HERO POSSESSIVE:** Always write "${childName}'s pebble", "${childName}'s compass", "${childName}'s toy". This satisfies zero third-person pronouns while maintaining 100% object permanence and continuity!

            5. **CAUSE-FIRST ANCHOR LOGIC:**
               - Always state the cause BEFORE the effect.
               - ❌ *Bad (Backwards):* "Glowed warm for happy ${childName}."
               - ✅ *Good (Cause First):* "${childName} felt happy and calm. ${childName}'s pebble glowed warm."

            6. **MENTOR / HELPER ANIMAL PURPOSE:**
               - If a helper or mentor animal appears (e.g., an owl, turtle, or lizard), explicitly state what quality they embody:
               - *Spread 4:* "An owl blinked, slow and calm."
               - *Spread 6 Callback:* "${childName} thought of the slow owl. ${childName} sat very still." (Earned and meaningful callback!).

            7. **WARM CHILD-VOICE CLOSING TAKEAWAY (NO PREACHING, BUT NO ABRUPT STOP):**
               - Spread ${spreadCount} MUST conclude with a comforting bedtime realization in the child's own voice:
               - *Example:* "Quiet and slow was the best kind of magic."
               - *Example:* "Being gentle made the warmest kind of friendship."
               - ❌ Do NOT preach adult thesis statements (e.g. "Patience achieves more than haste").
               - ❌ Do NOT abruptly stop without stating what made the ending happy and safe.

            8. **COMPLETE GRAMMATICAL SENTENCES:**
               - Never drop essential verbs to dodge pronouns.
               - ❌ *Bad (Fragment):* "${childName} content."
               - ✅ *Good:* "${childName} felt calm and happy."

            **5. INTRODUCTION PROTOCOL & CONCRETE OPENING FORMULA (CRITICAL):**
            - **Spread 1 (The Hero, Home Base & Personal Motive Origin):** Open with a VIVID SCENE, ACTION, or EMOTION grounded in the child's starting **Home Base** (e.g., cozy play spot, bedroom rug, sunny garden). The hero's name (${childName}) MUST appear naturally within the first 1-2 sentences, but NEVER as the subject of the very first sentence as a bare factual introduction.
            - **MANDATORY CONCRETE OPENING TEMPLATE FOR SPREAD 1:**
              "${childName} played in ${childName}'s play spot. ${childName}'s special pebble glowed warm. ${childName} loved helping animal friends fall asleep."
            - **Grounded Home Base Mandate:** Spread 1 MUST explicitly ground the child's starting location so the parent reader understands where the adventure begins (and so Spread ${spreadCount}'s return journey makes complete sense).
            - **Personal Motive Origin (NO Arbitrary Missions):** The hero's desire MUST have a clear personal, emotional origin (e.g., love for animals, a cherished gift, bedtime wonder). NEVER drop an ungrounded mission statement onto the character without explaining why it matters to them.
            - Focus on their personality and emotions (e.g., curious, dreamy). STRICTLY DO NOT discuss ANY physical body traits, clothing, or skin colors.
            
            ${secondCharacter && secondCharacter.name ? `**DUAL HERO PROTOCOL (STRICT ONBOARDING & AGENCY):**
            - The companion ${secondCharacter.name} MUST be explicitly introduced by name in Spread 1 or opening of Spread 2.
            - **WARM ENTRANCE:** Write a clear, warm welcome sentence establishing their presence and 1-2 personality traits (e.g., "And right by ${childName}'s side was ${secondCharacter.name} — the quiet observer who noticed every little clue.").
            - **ACTIVE AGENCY & INTERIOR LIFE:** Do NOT make ${secondCharacter.name} a silent helper or generic bystander. ${secondCharacter.name} must have distinct dialogue, complementary skills, and real emotional reactions throughout the journey.` : ''}

            **MAGICAL ANCHOR / EMOTIONAL BAROMETER RULE (CRITICAL):**
            - If the story features a special anchor object (e.g., compass, glowing pebble, lantern), you MUST state its simple physical behavior rule in Spread 1 upon first introduction:
              - *Example:* "${childName}'s special pebble glowed warm when ${childName} felt calm and happy, but felt cold when ${childName} was worried."
            - Pay this off consistently across the beats (glowing in Spread 1-2, feeling cold/dim at the low point in Spread 5, glowing warm and bright at the insight/success in Spreads 6-8).

            **CAUSAL CONTINUITY & RETURN TRANSITIONS (NO TELEPORTS):**
            - Every spread must open by directly resolving or responding to the previous spread's obstacle.
            - **Spread ${spreadCount} Return Journey Bridge:** You MUST include an explicit bridging clause showing how the hero (and any friend) travels smoothly from the wild/adventure space back to the Spread 1 Home Base (e.g., *"${childName} carried the sleepy new friend back to ${childName}'s cozy play spot..."*). Never jump-cut across settings without a physical bridge.

            **THEMATIC SECRET REVEAL & CLIMAX PAYOFF:**
            - The climax (Spread ${spreadCount - 1}) and resolution (Spread ${spreadCount}) MUST directly deliver on the promise of the Title and Theme.

            ${age <= 5 ? `
            **AGE ${age} PRONOUN POLICY GUARD (MANDATORY RESTRICTION):**
            - The final text must NOT use third-person pronouns (he, she, him, her, his, hers, it, its) to refer to the hero or a named companion.
            - **HOW TO COMPLY NATURALLY:**
              1. Use hero's name possessive for objects and settings: "${childName}'s pebble", "${childName}'s play spot".
              2. Use natural active verbs and complete sentences: "${childName} sat down in the sand. ${childName}'s pebble felt cold. ${childName} felt sad. SIGH...".
            ` : childGender ? `
            **AGE ${age} PRONOUN GUIDANCE (CRITICAL):**
            - The main hero (${childName}) is a **${childGender}**.
            ${secondCharacter?.gender ? `- The companion (${secondCharacter.name}) is a **${secondCharacter.gender}**.` : ''}
            - When using pronouns, you MUST correctly use gendered pronouns ("He/His", "She/Her", or their equivalents in the target language) matching their respective genders.
            ` : `
            **AGE ${age} PRONOUN RULE — GENDER UNKNOWN (CRITICAL):**
            - The hero's gender is **not known**. ALWAYS refer to the hero by their name: "${childName}".
            `}

            **EMOTIONAL & CAUSALITY RULES (CRITICAL):**
            1. **DUAL EMOTIONAL SENSORY & NAMING RULE (AGE-AWARE):**
               - For young children (especially ages 1–5), combine physical sensations with direct, simple emotion words:
                 - ❌ *Bad (Vague mood only):* "Her shoulders dropped low and the world felt all wrong."
                 - ❌ *Bad (Overly complex for age 3):* "${childName} felt frustrated and disappointed."
                 - ✅ *Good (Age 1–3):* "${childName} sat down in the sand. ${childName}'s pebble felt cold. ${childName} felt sad. SIGH..."
                 - ✅ *Good (Climax/Success):* "${childName} smiled and jumped up. ${childName} felt proud!"
                 - ❌ *Bad (Flat assertion only):* "${childName} was sad."
                 - ✅ *Good (Physical + Named Emotion):* "${childName}'s shoulders dropped low. ${childName} sat down in the soft sand, feeling confused and disappointed."
                 - ✅ *Good (Climax/Success):* "${childName} smiled, jumping up with a proud, happy giggle!"
               - Use clear, relatable feelings: *happy, sad, worried, proud, surprised, scared, relieved, cozy, content, loved, confused, disappointed*.
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
               - **NO PARENTS/ADULTS VISUALLY:** Even if the custom poem mentions parents ("Mama", "Dad"), treat them as OFF-SCREEN voices or presences. The visual focus AND the active narrative problem-solving MUST remain solely on the children. Do not write action beats that would require drawing an adult.
               - ONLY use completely fictional supporting characters (e.g., talking animals, wizards) if needed.
               - This is a children's book. Even for "adventure" themes, use kid-friendly props like glowing crystals, ancient maps, compasses, or colorful keys instead.

            OUTPUT JSON SCHEMA:
            [
                { 
                    "spreadNumber": 1, 
                    "text": "String", 
                    "spread1Checklist": { 
                        "homeBaseNamed": true, 
                        "personalMotiveOrigin": true, 
                        "anchorTriggerStated": true 
                    } 
                },
                { "spreadNumber": 2, "text": "String" },
                ... (${spreadCount} items total, spreadNumber 1 through ${spreadCount})
            ]
            `;

            const model = ai().getGenerativeModel({
                model: 'gemini-2.5-flash',
                generationConfig: { responseMimeType: "application/json" }
            });

            const response = await model.generateContent(prompt);
            const rawDraft = JSON.parse(cleanJsonString(response.response.text()));
            const draft = Array.isArray(rawDraft) ? rawDraft.map(item => ({
                text: typeof item === 'string' ? item : item.text || ''
            })) : [];

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
