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

            **NARRATIVE ARC REQUIREMENTS (${spreadCount} SPREADS — MASTER STORY ARCHITECTURE):**
            - You MUST generate EXACTLY ${spreadCount} spread objects.
            - Do NOT produce fewer or more than ${spreadCount}.
            1. **Spread 1 (Normal World, Home Base Framing & Personal Motive Origin):** 
               - Establish the hero's name, their ONE key internal trait, and their starting **Home Base** (e.g., sunny play nook, bedroom rug, cozy garden porch).
               - **World Framing Bridge:** Always ground the child's home base so the story has a clear starting reality before any magical or outdoor exploration begins.
               - **Personal Motive Origin (NO Arbitrary Missions):** The hero's desire MUST spring from a warm, personal origin—a favorite activity, a deep love for animals/stars, a cherished gift, or gentle curiosity. NEVER drop an ungrounded mission statement (e.g., *"dreaming of helping desert friends sleep"* without explaining why this matters to the child).
               - **Physical Cause-First Anchor Prop Rule (STRICT v4.0 MANDATE):** If a recurring anchor prop (pebble, compass, lantern, astrolabe, toy tool) is used, state its concrete PHYSICAL CAUSE-FIRST OPERATIONAL RULE in 1 clear sentence (e.g., *"The brass lantern shutter opened wide only when the latch clicked into the top notch away from sand"*, or *"The compass needle pointed true only when held flat and away from iron buckles"*).
                 ❌ **STRICTLY FORBIDDEN:** ABSOLUTELY NO mood-ring, psychic, or emotion-reading magic (e.g. NEVER write *"the pebble glowed when happy and dimmed when sad"*, *"the lantern shined with his curiosity"*). The prop must obey concrete, observable physical actions!
               - Set a clear physical ANCHOR IMAGE (location + object) — this will be returned to and echoed in Spread ${spreadCount}.
            2. **Spread 2 (Catalyst & Co-Hero Intentional Onboarding):** 
               - The problem/obstacle appears and directly targets the hero's flaw. The hero's desire is now blocked.
               - **Sensory Bridge into Adventure:** Show the physical trigger (sound, movement, doorway) leading from the Spread 1 Home Base into the adventure space.
               - ${storyData.useSecondCharacter && storyData.secondCharacter && storyData.secondCharacter.type !== 'object' ? `**DUAL-HERO ONBOARDING:** Give the companion (${storyData.secondCharacter.name}) a deliberate, warm on-screen entrance here if not in Spread 1. Establish their distinct personality, complementary skill (e.g., quiet observer vs eager explorer), and their own agency/motive.` : ''}
               - If an environment or entity is personified as a testing force (e.g. *"The pyramid loved tricky games"*), establish it as an active presence that will be paid off later.
            3. **Spread 3 (First Attempt & Causal Action):** 
               - Hero tries their default approach. It fails or makes things worse BECAUSE of their internal flaw.
               - **Strict Causal Continuity:** The hero's opening action must directly respond to the obstacle from Spread 2 (no teleporting or solving problems off-screen).
               - **Named Emotional Beat:** Name the child's exact feeling (e.g., "Frustrated", "Surprised") alongside the physical action.
            4. **Spread 4 (Complication & Dynamic Duo Interaction):** 
               - The situation escalates. ${storyData.useSecondCharacter && storyData.secondCharacter && storyData.secondCharacter.type !== 'object' ? `The co-hero actively contributes their perspective/skills.` : `A supporting character or natural sign may appear.`} Things get harder, not easier.
               - **Named Emotional Beat:** Name the emotional state (e.g., "Confused", "Puzzled").
            5. **Spread 5 (Near-Quit Beat — CRITICAL):** 
               - The hero's lowest emotional point. They MUST explicitly consider giving up. This beat must be written as: (a) the physical result of the failure (drooping shoulders, sitting down), (b) a quiet moment where the hero sits/stops and nearly decides to quit, and (c) the explicit named emotion ("Sad", "Disappointed"). If an anchor prop is present, it remains stuck, unlatched, or unresponsive due to the incorrect physical approach from Spread 3. The solution MUST NOT appear here.
            6. **Spread ${Math.ceil(spreadCount * 0.75)} (Insight & Observation):** 
               - The "Aha!" moment. Something small the hero NOTICES (not something told to them) triggers a realization. This must be a direct logical response to the flaw revealed in Spread 3. The hero realizes the correct physical adjustment needed to operate the anchor prop or solve the obstacle.
               - **Theme–Premise Dramatization:** If the theme involves communicating with animals or nature, explicitly show the hero interpreting animal sounds, postures, or silence as a meaningful message (e.g., realizing a soft whimper is asking for quiet stillness).
               - **Named Emotional Beat:** Name the shift ("Relieved", "Hopeful").
            7. **Spread ${spreadCount - 1} (Climax, Success & Title Secret Reveal):** 
               - Hero uses their new approach/insight. They succeed through their own effort (and teamwork).
               - **Deliver the Title's Promise & Theme:** If the title or theme promises a secret, treasure, or language, reveal the actual secret or artifact here.
               - **Named Emotional Beat:** Name the triumph ("Proud", "Delighted").
            8. **Spread ${spreadCount} (Seamless Return Journey + Home Base Payoff):** 
               - **Return Journey Bridge (NO Teleporting):** Include an explicit bridging clause describing how the hero transitions smoothly from the adventure space back to the Spread 1 Home Base (e.g., *"Lana gently carried her sleepy new friend home, back to her cozy play nook..."*).
               - Echo the familiar setting/anchor from Spread 1, showing the transformation through the hero's proud, happy body language and the successfully placed/held anchor tool. Explicitly state the earned emotional realization ("Content", "Safe", "Loved") in a simple, child-friendly closing line.

            **HERO DESIRE & MOTIVE CONSISTENCY (REQUIRED):**
            - The hero's desire and inciting motive from Spread 1 MUST be the exact thing resolved in Spread ${spreadCount - 1} or ${spreadCount}.
            - Do NOT change the hero's core goal mid-story. The "Moral" is what they LEARN; the "Desire" is what they WANT.
            - The moral MUST be the direct answer to the hero's internal flaw, not a generic life lesson.

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
            - **RECURRING ASSET INVARIANCE:** The story may have at most ONE primary recurring physical asset/vessel (e.g., The Starlight Bed-Boat, A Brass Compass, A Wooden Wagon, A Magic Lantern). This object MUST be declared in the "recurringAsset" foundation block with exhaustive physical details so a dedicated canonical reference image can be generated and passed to all spreads where it appears.

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
                    "primaryVisualAnchor": "The object that stays with hero (e.g. The Starlight Bed-Boat or A Brass Explorer Lantern)",
                    "anchorTriggerRule": "MANDATORY NON-EMPTY: Concrete physical cause-first trigger rule with observable physics (e.g. 'The brass lantern shutter opened wide only when the latch clicked into the top notch away from sand; rushed pulling jams the latch')",
                    "recurringAsset": {
                        "name": "Canonical name of the recurring prop/vehicle (e.g. 'The Starlight Bed-Boat')",
                        "description": "Exhaustive isolated physical visual description: exact materials, wood grain finish, trim colors, carvings, geometric shapes, canopy/cushion fabric, isolated on clean neutral studio backdrop with studio lighting (no background room).",
                        "appearancesSpreads": [1, 2, 3, 4, 5, 6, 7, 8],
                        "isGlobalObject": true,
                        "generateAssetImage": true
                    },
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
                if (!blueprint.foundation.anchorTriggerRule) {
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
