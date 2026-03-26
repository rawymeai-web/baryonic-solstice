
import { ai, cleanJsonString, withRetry } from '../generation/modelGateway';
import { Validator } from '../rules/validator';
import { StoryData, StoryBlueprint, WorkflowLog } from '../../types';

export async function generateBlueprint(
    storyData: StoryData,
    language: 'en' | 'ar'
): Promise<{ result: StoryBlueprint, log: WorkflowLog }> {

    const startTime = Date.now();

    try {
        const languageMap: Record<string, string> = {
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

        return await withRetry(async () => {
            const prompt = `
            ROLE: Master Story Architect.
            TASK: Create a structural BLUEPRINT for a story.
            
            INPUT DATA:
            - Target Language: ${targetLang}
            - Child: ${storyData.childName} (${storyData.childAge} years old).
            - Base Appearance (MUST RESPECT): ${storyData.mainCharacter?.description || "Not provided"}.
            - Theme: ${storyData.theme}.
            - Moral/Goal: ${storyData.customGoal || "Standard theme goal"}.
            - Challenge: ${storyData.customChallenge || "Standard theme challenge"}.

            **LANGUAGE RULE:**
            - The "title", "storyCore", "moral", "heroDesire", and "mainChallenge" fields MUST be strictly in **${targetLang}**.
            - EVERYTHING ELSE MUST BE IN ENGLISH ONLY! This includes ALL visual properties: "narrative" summaries, "setting", "timeOfDay", "highlightAction", "visualFocus", and especially the "primaryVisualAnchor". These fields are fed directly to an English-only Image Generation AI, so they must not contain ${targetLang} unless that is English.
            - Ensure the title is catchy and evocative in ${targetLang}.
            
            ${storyData.occasion ? `**SPECIAL OCCASION (CRITICAL):**
            - This story is celebrating a special occasion: **${storyData.occasion}**. 
            - The core goal, climax, and resolution MUST heavily weave in the emotions surrounding this event.
            ` : ''}
            
            ${storyData.useSecondCharacter && storyData.secondCharacter ? `**DUAL-HERO / BUDDY DYNAMIC (CRITICAL MUST USE):**
            - The Hero (${storyData.childName}) has a companion: **${storyData.secondCharacter.name}**.
            - Companion Type: **${storyData.secondCharacter.type}**.
            - Relationship/Age: ${storyData.secondCharacter.relationship || 'Friend/Companion'} ${storyData.secondCharacter.age ? `(Age: ${storyData.secondCharacter.age})` : ''}.
            - The story MUST be a Dual-Hero Buddy Adventure where ${storyData.childName} and ${storyData.secondCharacter.name} work together to overcome the obstacle.
            - Ensure ${storyData.secondCharacter.name} is included in the "supportingRoles" JSON array and appears consistently across the narrative.` : `
            **IMMEDIATE FAMILY RESTRICTION (CRITICAL):**
            - Do NOT include real-life immediate family members: mother, father, siblings, grandparents, aunts, uncles, cousins.
            - *Reason:* These roles are personal to the child. We must not misreality.
            - **Exceptions:** You MAY include generic adults (guides, shopkeepers, owls, neighbors) ONLY IF they are NOT presented as family and do NOT act as saviors.
            - **Rule:** Adults may guide or observe, but the **HERO MUST SOLVE THE PROBLEM**.
            `}

            ${storyData.selectedStylePrompt === 'PORTALS_OF_WONDER_DYNAMIC' ? `**PORTALS OF WONDER THEME (CRITICAL NARRATIVE RULE):**
            - The plot MUST revolve around discovering and traveling through magical portals.
            - At the end of EVERY scene, the hero(es) must discover, touch, or step through a new glowing portal that transports them to a completely different, wild, and unpredictable universe (e.g., from a Candyland to a Cyberpunk city, to an Underwater realm).
            - The visual setting MUST change drastically in every single spread.` : ''}

            **HERO VISUALS (CRITICAL):**
            - **SPECIES LOCK:** You MUST NOT change the biological species of the main character.
            - Use the "Base Appearance" as the immutable core.
            - You MAY add accessories if the Theme requires it.

            **VISUAL CONTINUITY RULES (NON-NEGOTIABLE):**
            1. **PRIMARY VISUAL ANCHOR (THE HERO OBJECT):** Choose ONE critical object (e.g., a cardboard box, a wooden kite, a brass compass) that is central to the story. 
               - You MUST define it physically: shape, material, color, and size.
               - Bad: "An ordinary object that has amazing powers."
               - Good: "A brown corrugated cardboard box, slightly dented on the left corner, large enough for a child to sit inside."
            2. **LOCATION PROGRESSION:** Do NOT redraw the same full background unless it's the final resolution.
               - *Good Flow:* Room -> Path -> Forest Edge -> Clearing -> Hill -> Home.
               - *Bad Flow:* Room -> Room -> Room -> Room.
            3. **CHARACTER CONTINUITY:** Supporting characters should appear in consecutive spreads. Avoid random appearing/disappearing.
            
            **PERSONALITY-CONFLICT LOCK (CRITICAL — DO THIS FIRST):**
            - Before writing anything, identify ONE specific internal trait or flaw of the hero from their INPUT DATA.
            - The central conflict/obstacle MUST directly attack or expose that specific trait.
            - The MORAL must be the direct resolution of that trait.
            - Example: Hero is impatient → Obstacle requires waiting → Moral is about patience.
            - Example: Hero is afraid to ask for help → Obstacle can only be solved with help → Moral is about courage to ask.
            - DO NOT invent a conflict unrelated to who the hero IS internally.

            **NARRATIVE ARC REQUIREMENTS (8 SPREADS — STRICT SKELETON):**
            1. **Spread 1 (Normal World):** Establish the hero's name, their ONE key internal trait, and a specific desire. MUST show the hero in their most comfortable, familiar setting. Set a clear physical ANCHOR IMAGE (location + object) — this will be echoed in Spread 8.
            2. **Spread 2 (Catalyst):** The problem/obstacle appears and directly targets the hero's flaw. The hero's desire is now blocked.
            3. **Spread 3 (First Attempt):** Hero tries their default approach. It fails or makes things worse BECAUSE of their internal flaw.
            4. **Spread 4 (Complication):** The situation escalates. A supporting character may appear. Things get harder, not easier.
            5. **Spread 5 (Near-Quit Beat — CRITICAL):** The hero's lowest emotional point. They MUST explicitly consider giving up. This beat must be written as: (a) the physical result of the failure, and (b) a quiet moment where the hero sits/stops and nearly decides to quit. The solution MUST NOT appear here.
            6. **Spread 6 (Insight):** The "Aha!" moment. Something small the hero NOTICES (not something told to them) triggers a realization. This must be a direct logical response to the flaw revealed in Spread 3.
            7. **Spread 7 (Final Attempt):** Hero uses their new approach/insight. They succeed through their own effort. The supporting character may assist but CANNOT be the one who solves it.
            8. **Spread 8 (Resolution + Echo):** MUST return to the EXACT same location/setting as Spread 1 (the anchor image), but SHOW THE CHANGE through the hero's body language and environment. Explicitly state the moral in a simple, earned final sentence.

            **HERO DESIRE CONSISTENCY (REQUIRED):**
            - The hero's desire from Spread 1 MUST be the thing resolved in Spread 7 or 8.
            - Do NOT change the hero's core goal mid-story. The "Moral" is what they LEARN; the "Desire" is what they WANT.
            - The moral MUST be the direct answer to the hero's internal flaw, not a generic life lesson.

            **RHYTHMIC SIMPLICITY & PLOT AMBITION (CRITICAL FIX):**
            - The plot MUST be EXTREMELY SIMPLE and physically localized to ONE core action.
            - Do not invent complex societal stakes, multiple concurrent problems, or over-complicated sequences (no "understanding animals and racing cheetahs" at the same time).
            - Keep the action grounded, direct, and focused strictly on the age group. The simpler, the better!
            - The conflict must be personal to the child and easily solvable within an 8-point physical progression.
            
            **CHARACTER ROLE RULES:**
            - **Limit:** Max 1 Support Character introduced per spread.
            - **Constraint:** Max 2 Support Characters TOTAL for Age < 6.
            - **Function:** Must be Helper, Obstacle, or Companion.
            
            **CHARACTER CONSISTENCY MANDATE (CRITICAL):**
            - **Personality Focus:** You MUST define the hero entirely through their internal traits, emotions, and what they like to do (e.g., curious, dreamy, loves to explore).
            - **NO PHYSICAL TRAITS:** STRICTLY DO NOT invent, describe, or discuss any physical attributes, clothing, or color palettes for the character. The visual appearance is handled by a separate system fed by user photos.
            
            **SINGLE-USE VISUAL GUARANTEE & SETTING LOCK (STRICT INSTRUCTION):**
            - Image AIs hallucinate non-hero characters across multiple pages. To prevent this:
            - **DISPOSABLE SUB-CHARACTERS:** Supporting characters (like animals, villagers, guides) MUST belong to a single setting. When the hero leaves that location in the next spread, the secondary character DOES NOT go with them. Do NOT drag random sub-characters across multiple settings.
            - Therefore, supporting characters should only physically appear visually in EXACTLY ONE or TWO continuous spreads (appearancesSpreads = [X, Y]).
            - Their influence can span the story (influenceSpreads = [X, Y]), but they cannot travel with the hero.
            - The same applies to specific story items (other than the primaryVisualAnchor). They should be featured significantly on the specific page where they are relevant, rather than carried around.

            **COGNITIVE LOAD & PACING:**
            - **ONE ACTION PER SPREAD.**
            - **ONE EMOTION PER SPREAD.**
            - **TEXT BUDGET (Narrative Summary):** 
                - Age < 6: 1-2 short sentences.
                - Age 6-7: 2-3 sentences.
                - Age 8+: 3-4 sentences.

            **EMOTIONAL PACING & LAYERING (CRITICAL FOR EARNED DEPTH):**
            - The story must not feel like a rushed checklist of plot points.
            - You MUST build in "breathing room" for the character to process emotions internally.
            - The **Lowest Point** (Spread 5) MUST be dedicated entirely to dramatizing the emotional impact of the failure. Do NOT rush to introduce the solution here. Let the character sit in the struggle.
            - The **Insight** (Spread 6) MUST focus on the internal realization or observation. Make the logic of the transformation clear and felt by the reader.
            - Plot transitions (A -> B -> C) must include the internal, emotional processing that justifies the character's next choice.

            **TIME CONTINUITY RULE (CRITICAL):**
            - The story must progress through continuous action and consequence.
            - Do NOT use time-skip framing such as "the next day", "later that week", or similar shortcuts.
            - Time may only pass if the waiting passage itself is part of the tension.
            - **Chronological Setting Rule:** Your chosen \`timeOfDay\` MUST follow a logical forward progression (e.g., Morning -> Afternoon -> Dusk -> Night). You absolutely cannot jump from Night back to Morning mid-story.
            - **Environment Continuity:** If entering an indoor/enclosed space (like a Cave), the \`timeOfDay\` or \`lighting\` MUST reflect that enclosed environment contextually in the subsequent spreads until they exit.
            
            **DYNAMIC VANTAGE POINT & LOCATION SHIFTS (CRITICAL FOR LAYOUT):**
            - You MUST change the location or the *vantage point* (where we are looking from) between spreads to keep the visual flow dynamic, depending on what the story needs.
            - **STRICT WIDE ANGLE MANDATE:** The composition (\`cameraAngle\`) MUST ALWAYS be a wide, spacious establishing shot. ABSOLUTELY NO close-ups, extreme close-ups, or tight framing. The illustration MUST have expansive negative space and open areas.
            - The \`highlightAction\` MUST truly capture the most important physical event happening on that spread (the main verb/action).

            **TRANSITION QUALITY RULE (CRITICAL):**
            - A transition hook must create anticipation, tension, or curiosity.
            - Invalid hooks include time jumps ("The next day..."), summaries, or passive statements.
            - Each hook must answer: "Why must the reader turn the page?"

            **CONTENT SAFETY & APPROPRIATENESS BAN (STRICT):**
            - ABSOLUTELY NO skulls, skeletons, weapons, violence, or truly scary monsters. 
            - ABSOLUTELY NO rainbows. Do not write or prompt rainbows.
            - ONLY USE FICTIONAL SUPPORTING CHARACTERS (e.g., wizards, talking animals, aliens). DO NOT use real-world grounded figures.
            - If writing a mystery or adventure, use kid-friendly props like compasses, maps, glowing crystals, or keys.

            ${storyData.useSecondCharacter && storyData.secondCharacter ? `**SECONDARY CHARACTER PACING (CRITICAL SCREEN-TIME RULE):**
            - This is a Dual-Hero book. You MUST officially introduce the companion (${storyData.secondCharacter.name}) no later than **Spread 2**.
            - The companion MUST actively influence the story and help solve the problem. Do not make them a passive bystander.
            - The companion MUST NOT appear in the \`visualFocus\` or \`newCharacters\` array of any spread *before* their official introduction.` : ''}

            OUTPUT JSON FORMAT:
            {
                "foundation": {
                    "title": "Story Title",
                    "targetAge": "${storyData.childAge}",
                    "storyCore": "1 sentence summary",
                    "heroDesire": "What they want",
                    "mainChallenge": "What stops them",
                    "primaryVisualAnchor": "The object that stays with hero (e.g. Red Scarf)",
                    "moral": "The lesson",
                    "failedAttemptSpread": 3,
                    "insightSpread": 6,
                    "finalSolutionMethod": "How they fixed it"
                },
                "characters": {
                    "heroProfile": "Personality, emotions, and internal traits ONLY (e.g., curious, dreamy). STRICTLY NO PHYSICAL TRAITS OR CLOTHING.",
                    "supportingRoles": [
                        { "name": "Name", "role": "Helper/Obstacle/Companion", "functionType": "Why they exist", "appearanceSpreads": [4], "influenceSpreads": [4, 5, 8], "visualKey": "Visual traits including outfit" }
                    ]
                },
                "structure": {
                    "arcSummary": "3 sentence plot summary covering the full arc from desire to lesson",
                    "spread1AnchorImage": "DESCRIBE the exact physical scene of Spread 1 in one sentence (location + hero + mood) — this will be mirrored in Spread 8",
                    "spreads": [
                        { 
                            "spreadNumber": 1, 
                            "purpose": "Normal World — Establish hero's name, core trait, and desire",
                            "narrative": "REQUIRED: State hero's name explicitly. Describe the setting. Show hero's dominant emotion or trait through an action, NOT through a label. End on their desire/want.",
                            "transitionHook": "A specific event or sound that disrupts the normal world and forces the reader to turn the page (NO time-skips, NO summaries)",
                            "visualFocus": "The primary visual element that fills the foreground (e.g. 'the closed gate to the garden')",
                            "highlightAction": "The single most important physical action happening (a verb phrase, e.g. 'Hero pressing nose against the window')",
                            "cameraAngle": "Wide Establishing Shot (Mandatory — NO close-ups)",
                            "emotionalBeat": "MUST be ONE of: [Hopeful, Curious, Excited, Sad, Scared, Frustrated, Determined, Relieved, Proud, Lonely]",
                            "specificLocation": "Named specific real place (e.g. 'The Yellow Kitchen', 'The Old Oak Tree in the backyard')",
                            "environmentType": "Indoor OR Outdoor",
                            "timeOfDay": "Morning / Midday / Afternoon / Dusk / Night",
                            "newCharacters": ["Only NEW characters appearing FOR THE FIRST TIME. Use 'None' if no new characters."]
                        }
                    ]
                }
            }
            `;

            const model = ai().getGenerativeModel({
                model: 'gemini-2.0-flash',
                generationConfig: { responseMimeType: "application/json" }
            });

            const response = await model.generateContent(prompt);
            const text = response.response.text();
            if (!text) throw new Error("No response from AI");

            const blueprint = JSON.parse(cleanJsonString(text));

            if (!Validator.validateBlueprint(blueprint)) {
                throw new Error("Invalid Blueprint Structure generated.");
            }

            return {
                result: blueprint,
                log: {
                    stage: 'Blueprint',
                    timestamp: startTime,
                    inputs: { theme: storyData.theme, age: storyData.childAge },
                    outputs: { title: blueprint.foundation.title },
                    status: 'Success',
                    durationMs: Date.now() - startTime
                }
            };
        });
    } catch (e: any) {
        return {
            result: {} as StoryBlueprint,
            log: {
                stage: 'Blueprint',
                timestamp: startTime,
                inputs: { theme: storyData.theme },
                outputs: { error: e.message },
                status: 'Failed',
                durationMs: Date.now() - startTime
            }
        };
    }
}
