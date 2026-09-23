import { selectArcForStory, ArcRecord } from './arcCatalog';
import { ai, cleanJsonString, withRetry } from '../generation/modelGateway';
import { Validator } from '../rules/validator';
import { StoryData, StoryBlueprint, WorkflowLog } from '../../types';
import { getGuidelineComponentsForTheme } from '../storyGuidelines';

export async function generateBlueprint(
    storyData: StoryData,
    language: 'en' | 'ar',
    spreadCount: number = 8
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
        const targetAgeNum = parseInt(storyData.childAge || "5", 10);
        const selectedArc = selectArcForStory(
            storyData.themeId || storyData.theme || '',
            targetAgeNum,
            (storyData as any).preferredArcId,
            (storyData as any).orderId || (storyData as any).id
        );

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

            ${selectedArc ? `
            **CANONICAL 8-SPREAD STORY ARCHITECTURE (ARC: ${selectedArc.arcId} — "${selectedArc.title}"):**
            - **Premise / Core Fun:** ${selectedArc.premise}
            - **Named Anchor & Observable Physical Rule:** ${selectedArc.anchorAndRule}
            - **Cast & Location-Lock Plan:** ${selectedArc.castPlan}
            ${storyData.useSecondCharacter && storyData.secondCharacter && storyData.secondCharacter.type !== 'object' ? `- **Dual-Hero Dynamic:** ${selectedArc.dualAdaptation}` : ''}
            ${storyData.useSecondCharacter && storyData.secondCharacter && storyData.secondCharacter.type === 'object' ? `- **Personal-Item Dynamic:** ${selectedArc.itemAdaptation}` : ''}
            - **Canonical 8-Spread Story Beats (You MUST structure your 8 spreads faithfully around these beats):**
${selectedArc.beats.map(b => `              Spread ${b.spread}: ${b.text}`).join('\n')}
            - **CREATIVE FREEDOM MANDATE:** Follow the canonical arc's beats and physical mechanics faithfully; your creative freedom is in vivid child-appropriate dialogue, sensory details, and pacing—NOT in altering the core plot beats or inventing a different conflict.
            ` : `
            **CRITICAL VARIETY RULE (CUSTOM THEME):**
            - You MUST be highly creative and unpredictable. Invent a fresh, engaging, and original challenge and goal for this custom theme.
            `}

            **LANGUAGE RULE:**
            - The "title", "storyCore", "moral", "heroDesire", and "mainChallenge" fields MUST be strictly in **${targetLang}**.
            - EVERYTHING ELSE MUST BE IN ENGLISH ONLY!
            - **TITLE CREATIVITY:** The title MUST be catchy, evocative, and ORIGINAL. 
            - DO NOT simply use the theme name (e.g., if theme is "Birthday", do not name it "The Birthday").
            - DO NOT use cliché structures like "The Adventure of [Name]" or "[Name] and the [Object]".
            - **ANTI-REPETITION:** Every title must be unique. Avoid starting every title with "The". Try using verbs, adjectives, or metaphors.
            - **CREATIVE STRATEGY:** Use one of these styles randomly: 
                a) Alliteration (e.g., "Brave Billy's Blue Balloon")
                b) Abstract/Poetic (e.g., "Where the Whispering Wind Wanders")
                c) Action-Oriented (e.g., "Racing the Midnight Moon")
                d) Emotional/Thematic (e.g., "A Heart Full of Stardust")
            - Ensure the title is evocative in ${targetLang}.
            
            ${storyData.customStoryText ? `**CUSTOM STORY TEXT / POEM (CRITICAL MUST USE):**
            - The user provided a specific text/poem to be used as the backbone of the story:
            """
            ${storyData.customStoryText}
            """
            - **MANDATORY DIRECTIVE:** You MUST structure the blueprint spreads explicitly to match the events, sequence, emotional beats, and logic provided in this custom text. Do NOT invent a completely different plot. Shape the Blueprint's Arc to fit this text perfectly across the ${spreadCount} spreads.` : ''}
            
            ${storyData.occasion ? `**SPECIAL OCCASION (CRITICAL):**
            - This story is celebrating a special occasion: **${storyData.occasion}**. 
            - The core goal, climax, and resolution MUST heavily weave in the emotions surrounding this event.
            ` : ''}
            
            ${storyData.useSecondCharacter && storyData.secondCharacter && storyData.secondCharacter.type === 'object' ? `**SPECIAL ITEM ANCHOR (CRITICAL MUST USE):**
            - The user provided a special object to feature in the story: **${storyData.secondCharacter.name || 'Special Item'}**.
            - Description/Nature: ${storyData.secondCharacter.description || 'A special item'}.
            - You MUST set this EXACT object description as the "primaryVisualAnchor" in the foundation.
            - The story MUST be a SINGLE-HERO adventure, but the hero must use, carry, or interact with this specific object throughout the journey.` : ''}
            
            ${storyData.useSecondCharacter && storyData.secondCharacter && storyData.secondCharacter.type !== 'object' ? `**DUAL-HERO / BUDDY DYNAMIC (CRITICAL MUST USE):**
            - The Hero (${storyData.childName}) has a companion: **${storyData.secondCharacter.name}**.
            - Companion Type: **${storyData.secondCharacter.type}**.
            - Relationship/Age: ${storyData.secondCharacter.relationship || 'Friend/Companion'} ${storyData.secondCharacter.age ? `(Age: ${storyData.secondCharacter.age})` : ''}.
            - The story MUST be a Dual-Hero Buddy Adventure where ${storyData.childName} and ${storyData.secondCharacter.name} work together to overcome the obstacle.
            - Ensure ${storyData.secondCharacter.name} is included in the "supportingRoles" JSON array and appears consistently across the narrative.` : ''}

            **CHILD-LED IMAGINATIVE WORLD (CRITICAL STORYTELLING PRINCIPLE):**
            - The story centers entirely on the child's own agency, discovery, and imagination.
            - Keep domestic family figures (parents, grandparents) off-screen so the child is the true hero who solves their own challenges.
            - Friendly fictional or narrative adults and mentors are welcome (e.g., an ancient astronomer, a kind clockmaker, a gentle baker, or a forest sprite) to guide the child's discovery.
            - ${(!storyData.useSecondCharacter || !storyData.secondCharacter || storyData.secondCharacter.type === 'object') ? `Keep the journey focused on the child and their friendly animal/storybook companions.` : `The journey centers on ${storyData.childName} and their trusted companion ${storyData.secondCharacter.name}.`}

            ${storyData.selectedStylePrompt === 'PORTALS_OF_WONDER_DYNAMIC' ? `**PORTALS OF WONDER THEME (CRITICAL NARRATIVE RULE):**
            - The plot MUST revolve around discovering and traveling through magical portals.
            - At the end of EVERY scene, the hero(es) must discover, touch, or step through a new glowing portal that transports them to a completely different, wild, and unpredictable universe (e.g., from a Candyland to a Cyberpunk city, to an Underwater realm).
            - The visual setting MUST change drastically in every single spread.` : ''}

            **HERO VISUALS (CRITICAL):**
            - **SPECIES LOCK:** You MUST NOT change the biological species of the main character.
            - Use the "Base Appearance" as the immutable core.
            - You MAY add accessories if the Theme requires it.

            **VISUAL CONTINUITY RULES (NON-NEGOTIABLE):**
            1. **PRIMARY VISUAL ANCHOR (OPTIONAL STORY TOOL):** 
               - If the story naturally centers on a specific physical keepsake, tool, or toy (e.g. wooden kite, brass compass, berry basket), define it physically in "primaryVisualAnchor" (shape, material, color) and specify its operational mechanism in "anchorTriggerRule".
               - If the story is interpersonal/social (e.g. making friends at school), exploratory, or naturalistic, set "primaryVisualAnchor": "None" and "anchorTriggerRule": "None".
               - DO NOT force an artificial mechanical gadget where everyday play or human interaction is the focus!
            2. **LOCATION PROGRESSION:** Do NOT redraw the same full background unless it's the final resolution.
               - *Good Flow:* Room -> Path -> Forest Edge -> Clearing -> Hill -> Home.
               - *Bad Flow:* Room -> Room -> Room -> Room.
            3. **CHARACTER CONTINUITY:** Supporting characters should appear in consecutive spreads. Avoid random appearing/disappearing.
            
            **PERSONALITY & CONFLICT DIVERSITY (CRITICAL):**
            - Avoid the cliché "hero is impatient -> obstacle requires slow patience" loop unless specifically called for.
            - Explore diverse child-centered conflicts:
              a) Social / Friendship / Empathy: Overcoming shyness, asking to join play, sharing, listening.
              b) Curiosity / Mystery / Deduction: Finding clues, discovering how things work, tracking a secret path.
              c) Teamwork / Synergy: Two friends bringing distinct complementary skills to solve a shared challenge.
              d) Everyday Joy / Playful Wonder: A cozy toddler picnic, building a block tower, baking, gentle bedtime exploration.
            - The conflict must be personal to the child and easily solvable within an ${spreadCount}-point physical progression.

            **NARRATIVE ARC REQUIREMENTS (${spreadCount} SPREADS — MASTER STORY ARCHITECTURE):**
            - You MUST generate EXACTLY ${spreadCount} spread objects.
            - Do NOT produce fewer or more than ${spreadCount}.
            1. **Spread 1 (Normal World, Home Base Framing & Personal Motive Origin):** 
               - Establish the hero's name, their starting **Home Base** (e.g., sunny play nook, bedroom rug, cozy garden porch), and their warm personal motive.
               ${storyData.useSecondCharacter && storyData.secondCharacter && storyData.secondCharacter.type !== 'object' ? `- **DUAL-HERO GROUNDING:** Ground BOTH "${storyData.childName}" and "${storyData.secondCharacter.name}" in their shared starting location from Spread 1!` : ''}
               - **World Framing Bridge:** Always ground the child's home base so the story has a clear starting reality before any magical or outdoor exploration begins.
               - **Personal Motive Origin (NO Arbitrary Missions):** The hero's desire MUST spring from a warm, personal origin—a favorite activity, a deep love for animals/stars, a cherished gift, or gentle curiosity.
               - **Anchor Prop (If Used):** If an anchor prop is used, state its concrete PHYSICAL CAUSE-FIRST OPERATIONAL RULE. If no anchor prop is needed, focus on the child's playful desire and setting.
            2. **Spread 2 (Catalyst & Co-Hero Intentional Onboarding):** 
               - The problem, mystery, or play invitation appears.
               - **Sensory Bridge into Adventure:** Show the physical trigger (sound, movement, doorway) leading from the Spread 1 Home Base into the adventure space.
               - ${storyData.useSecondCharacter && storyData.secondCharacter && storyData.secondCharacter.type !== 'object' ? `**DUAL-HERO ONBOARDING:** Establish ${storyData.secondCharacter.name}'s distinct personality, complementary skill (e.g., quiet observer vs eager explorer), and their own active stake.` : ''}
            3. **Spread 3 (First Attempt & Causal Action):** 
               - Hero(es) try their default approach. It encounters an unexpected snag or complication.
               - **Strict Causal Continuity:** The opening action must directly respond to the obstacle from Spread 2.
               - **Named Emotional Beat:** Name the child's exact feeling (e.g., "Puzzled", "Shy", "Surprised") alongside the physical action.
            4. **Spread 4 (Complication & Dynamic Interaction):** 
               - The challenge deepens. ${storyData.useSecondCharacter && storyData.secondCharacter && storyData.secondCharacter.type !== 'object' ? `The co-hero actively contributes their perspective/skills.` : `An environmental sign or friendly helper may appear.`}
               - **Named Emotional Beat:** Name the emotional state (e.g., "Curious", "Determined", "Hesitant").
            5. **Spread 5 (Near-Quit / Low Point Beat):** 
               - The emotional pause. The hero(es) pause and feel discouraged or stuck. Name the feeling plainly ("felt sad", "felt shy"). The solution MUST NOT appear here.
            6. **Spread ${Math.ceil(spreadCount * 0.75)} (Insight & Shared Realization):** 
               - The "Aha!" moment. Something small noticed in the environment or a supportive connection between characters triggers a realization.
               - ${storyData.useSecondCharacter && storyData.secondCharacter && storyData.secondCharacter.type !== 'object' ? `Both heroes connect their ideas together.` : `The hero discovers the right approach.`}
               - **Named Emotional Beat:** Name the shift ("Relieved", "Hopeful").
            7. **Spread ${spreadCount - 1} (Climax, Success & Title Promise Payoff):** 
               - **Deliver the Title's Promise:** If the title or premise promises treasure, a secret, or finding a lost item, reveal the actual promised payoff here with coherent physical logic.
               - ${storyData.useSecondCharacter && storyData.secondCharacter && storyData.secondCharacter.type !== 'object' ? `**INDISPENSABLE DUAL-HERO ACTION (MANDATORY):** BOTH ${storyData.childName} and ${storyData.secondCharacter.name} MUST perform an indispensable physical or cognitive action. If either hero were removed, the success could not happen!` : `The hero succeeds through their own effort and insight.`}
               - **Named Emotional Beat:** Name the triumph ("Proud", "Delighted").
            8. **Spread ${spreadCount} (Seamless Return Journey + Home Base Payoff):** 
               - **Return Journey Bridge:** Smooth transition bridging the adventure space back to the Spread 1 Home Base.
               - **Warm Scene-Based Closure (ANTI-PREACHY):** End on a cozy character moment (holding a keepsake, laughing together, tucking into bed, a warm hug). STRICTLY FORBIDDEN: Do NOT state an adult moral proverb (e.g. NEVER write "He learned that patience is the secret").
               - State the earned emotional feeling ("Content", "Safe", "Happy").

            **HERO DESIRE & MOTIVE CONSISTENCY (REQUIRED):**
            - The hero's desire and inciting motive from Spread 1 MUST be the exact thing resolved in Spread ${spreadCount - 1} or ${spreadCount}.
            - Do NOT change the hero's core goal mid-story. The "Moral" is the internal feeling/insight; the "Desire" is what they wanted to do.

            **CAUSAL CHAIN & NO OFF-SCREEN TELEPORTS (STRICT):**
            - Every obstacle introduced in Spread N must have a physical, causal resolution or navigation action in Spread N+1 before moving to the next challenge.
            - Characters must make a deliberate choice or action to overcome an obstacle rather than teleporting to the next set piece.
            - Returning home in Spread ${spreadCount} MUST have an explicit physical transition sentence bridging the adventure realm back to the home base.

            **RHYTHMIC SIMPLICITY & PLOT AMBITION (CRITICAL FIX):**
            - The plot MUST be EXTREMELY SIMPLE and physically localized to ONE core action.
            - Do not invent complex societal stakes, multiple concurrent problems, or over-complicated sequences.
            - Keep the action grounded, direct, and focused strictly on the age group. The simpler, the better!
            - The conflict must be personal to the child and easily solvable within a ${spreadCount}-point physical progression.

            **ORIGINAL PLOT INVENTIVENESS & CLICHÉ BAN (STRICT):**
            - ❌ **STRICTLY BANNED TROPES:** Do NOT write cliché "fear of the dark" or "scary shadows in the bedroom that turn out to be ordinary toys/clothes" stories.
            - ✅ **REQUIRED:** Invent fresh, magical, wonder-filled, and proactive adventures that engage the child's natural curiosity and active exploration.

            ${Number(storyData.childAge) <= 3 ? `**AGE 1-3 TODDLER COGNITIVE BOUNDARIES (STRICT MANDATE):**
            - For toddlers (Age 1-3), the plot MUST be concrete, sensory, and emotionally tender.
            - ❌ **STRICTLY FORBIDDEN:** ABSOLUTELY NO complex multi-part machines, mechanical devices, dials, tubes, gadgets, or abstract contraptions (e.g. NEVER invent "dust collectors", "generators", "engines", "gearboxes", "scientific apparatus").
            - ✅ **REQUIRED TODDLER THEMES:** Focus on cozy sensory discoveries, daily routines, and gentle wonder (e.g., catching a giggling star, putting a sleepy moon to sleep under a soft cloud blanket, jumping on bouncy soft craters, following a glowing butterfly, finding a lost little starlet).
            - Actions must be physical and tangible: clapping hands, reaching, hugging, smiling, tip-toeing, laughing, tucking into bed.
            ` : ''}
            
            **CHARACTER ROLE RULES:**
            - **Limit:** Max 1 Support Character introduced per spread.
            - **Constraint:** Max 2 Support Characters TOTAL for Age < 6.
            - **Function:** Must be Helper, Obstacle, or Companion.
            
            **CHARACTER CONSISTENCY MANDATE (CRITICAL):**
            - **Personality Focus:** You MUST define the hero entirely through their internal traits, emotions, and what they like to do (e.g., curious, dreamy, loves to explore).
            - **NO PHYSICAL TRAITS:** STRICTLY DO NOT invent, describe, or discuss any physical attributes, clothing, or color palettes for the character. The visual appearance is handled by a separate system fed by user photos.
            
            **SINGLE-USE VISUAL GUARANTEE & DISPOSABLE SUB-ITEMS (STRICT INSTRUCTION):**
            - Image AIs hallucinate non-hero characters and secondary objects when they cross multiple pages. To prevent this:
            - **DISPOSABLE SUB-CHARACTERS:** Supporting characters (like animals, villagers, guides) MUST belong to a single setting. When the hero leaves that location in the next spread, the secondary character DOES NOT go with them. Do NOT drag random sub-characters across multiple settings. They physically appear visually in EXACTLY ONE or TWO continuous spreads (appearancesSpreads = [X, Y]).
            - **DISPOSABLE SUB-ITEMS:** Any minor tools, small toys, plants, or background set pieces introduced in Spread N are strictly disposable. They MUST NOT carry over to subsequent spreads.
            - **RECURRING ASSET INVARIANCE (THRESHOLD >= 2 SPREADS):**
              * The story may have at most ONE primary recurring physical asset/vessel (e.g., The Starlight Bed-Boat, A Brass Compass, A Wooden Wagon, A Magic Lantern).
              * RECURRENCE THRESHOLD: Declare a recurringAsset ONLY when a physical object/vehicle recurs across at least TWO spreads (appearancesSpreads length >= 2). Single-spread items are disposable and must not be declared as recurring assets.
              * NARRATIVE & VISUAL ANCHOR UNIFICATION: When the story's primaryVisualAnchor is a persistent physical vehicle, vessel, or tool, the "recurringAsset" foundation block MUST describe this EXACT SAME canonical object with exhaustive physical details (materials, wood grain, colors, geometry, isolated on clean neutral studio backdrop) so a dedicated canonical reference image can be generated and passed to all spreads where it appears.

            **DYNAMIC VANTAGE POINT, SUB-LOCATION FRAMING & PERSPECTIVE SHIFTS (CRITICAL):**
            - Do NOT redraw the same static background perspective.
            - Even if multiple spreads take place in the same general environment (e.g., the child's bedroom, a forest, or an ancient archive):
              * **Change the Vantage Point:** Shift between low-angle looking toward the starry window, wide overhead shot looking down at the play rug, or dramatic profile shot across the bookshelf.
              * **Change the Sub-Location Framing:** Move the hero from the cozy bed-boat corner to the open doorway, to the center floor, or next to the garden patio.
              * **Dynamic Lighting & Mood:** Reflect time of day or magical transformation through shifting shadows, glowing dust particles, or starlight beams.
            - **STRICT WIDE ANGLE MANDATE:** The composition ('cameraAngle') MUST ALWAYS be a wide, spacious establishing shot. ABSOLUTELY NO close-ups, extreme close-ups, or tight framing. The illustration MUST have expansive negative space for text placement.

            OUTPUT JSON FORMAT:
            {
                "foundation": {
                    "title": "[MUST BE IN ${targetLang}]",
                    "targetAge": "${storyData.childAge}",
                    "arcId": "${selectedArc ? selectedArc.arcId : 'custom'}",
                    "storyCore": "[MUST BE IN ${targetLang}]",
                    "heroDesire": "[MUST BE IN ${targetLang}]",
                    "mainChallenge": "[MUST BE IN ${targetLang}]",
                    "primaryVisualAnchor": "The object that stays with hero (e.g. 'The Starlight Bed-Boat') OR 'None' if social/everyday story without a special prop",
                    "anchorTriggerRule": "Concrete physical trigger rule OR 'None'",
                    "recurringAsset": null, // OR { name, description, appearancesSpreads, isGlobalObject, generateAssetImage } ONLY if a real recurring vehicle/prop is needed
                    "moral": "[MUST BE IN ${targetLang}]",
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
                    "cover": {
                        "spreadNumber": 0,
                        "purpose": "Cover Scene — Establish the theme and excitement of the adventure",
                        "storyText": "The actual title of the book and an engaging subtitle.",
                        "transitionHook": "None",
                        "visualFocus": "The main hero in a dynamic pose related to the story's core action.",
                        "highlightAction": "A dynamic, exciting action representing the adventure.",
                        "cameraAngle": "Wide Establishing Shot",
                        "emotionalBeat": "Excited",
                        "specificLocation": "The most iconic location of the story",
                        "environmentType": "Indoor OR Outdoor",
                        "timeOfDay": "Morning / Midday / Afternoon / Dusk / Night",
                        "newCharacters": ["Only NEW characters appearing FOR THE FIRST TIME."]
                    },
                    "spreads": [
                        { 
                            "spreadNumber": 1, 
                            "purpose": "Normal World — Establish hero's name, core trait, and desire",
                            "narrative": "REQUIRED: State hero's name explicitly. Describe the setting. Show hero's dominant emotion or trait through an action, NOT through a label. End on their desire/want.",
                            "storyText": "REQUIRED: Write the FINAL, actual children's book text to be printed on this page (2-3 sentences). Must be engaging, rhythmic, and age-appropriate.",
                            "transitionHook": "A specific event or sound that disrupts the normal world and forces the reader to turn the page (NO time-skips, NO summaries)",
                            "visualFocus": "The primary visual element that fills the foreground (e.g. 'the closed gate to the garden')",
                            "highlightAction": "The single most important physical action happening (a verb phrase, e.g. 'Hero pressing nose against the window')",
                            "cameraAngle": "Wide Establishing Shot (Mandatory — NO close-ups)",
                            "emotionalBeat": "MUST be ONE of: [Hopeful, Curious, Excited, Sad, Worried, Frustrated, Determined, Relieved, Proud, Lonely]",
                            "specificLocation": "Named specific real place (e.g. 'The Yellow Kitchen', 'The Old Oak Tree in the backyard')",
                            "environmentType": "Indoor OR Outdoor",
                            "timeOfDay": "Morning / Midday / Afternoon / Dusk / Night",
                            "newCharacters": ["Only NEW characters appearing FOR THE FIRST TIME. Use 'None' if no new characters."]
                        },
                        {
                            "spreadNumber": 2,
                            "purpose": "..."
                        }
                        // CRITICAL INSTRUCTION: YOU MUST OUTPUT EXACTLY ${spreadCount} SPREAD OBJECTS (SPREADS 1 THROUGH ${spreadCount}) IN THIS ARRAY.
                    ]
                }
            }
            `;

            const model = ai().getGenerativeModel({
                model: 'gemini-2.5-flash',
                generationConfig: { 
                    responseMimeType: "application/json",
                    temperature: 1.0, 
                    topP: 0.95
                }
            });

            const response = await model.generateContent(prompt);
            const text = response.response.text();
            if (!text) throw new Error("No response from AI");

            const blueprint = JSON.parse(cleanJsonString(text));

            if (selectedArc) {
                blueprint.foundation.arcId = selectedArc.arcId;
                blueprint.foundation.selectedArc = selectedArc;
                if (!blueprint.foundation.anchorTriggerRule && selectedArc.anchorAndRule && selectedArc.anchorAndRule.toLowerCase() !== 'none' && blueprint.foundation.primaryVisualAnchor?.toLowerCase() !== 'none') {
                    blueprint.foundation.anchorTriggerRule = selectedArc.anchorAndRule;
                }
            }

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
