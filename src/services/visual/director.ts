
import { ai, cleanJsonString, withRetry } from '../generation/modelGateway';
import { Validator } from '../rules/validator';
import { GUIDEBOOK } from '../rules/guidebook';
import { StoryBlueprint, SpreadDesignPlan, WorkflowLog } from '../../types';

export async function generateVisualPlan(
    script: { text: string }[],
    blueprint: StoryBlueprint,
    visualDNA: string,
    spreadCount: number = 8
): Promise<{ result: SpreadDesignPlan, log: WorkflowLog }> {

    const startTime = Date.now();

    try {
        return await withRetry(async () => {
            const prompt = `
            ROLE: Cinematographer / Art Director.
            TASK: Translate Story Text into Visual Scene Descriptions.
    
            INPUTS:
            - Story Script: ${JSON.stringify(script)}
            - Visual DNA (The Global Style): "${visualDNA}"
            - Blueprint Settings: ${JSON.stringify(blueprint.foundation)}
            - Blueprint Planned Spreads (CRITICAL): ${JSON.stringify(blueprint.structure?.spreads || [])}
            - Rules: ${JSON.stringify(GUIDEBOOK.visual)}
    
            INSTRUCTIONS:
            1. **DESIGN THE COVER (Spread 0):** This is the most critical art. It must be a continuous 16:9 panoramic scene. Assign the characters to one side ("Right" or "Left"), and leave the other side explicitly as uncluttered negative space for the title. **CRITICAL STORYTELLING MANDATE:** The cover MUST tell a story. Do not just have the characters standing and posing. They must be actively engaged in an exciting, story-representative action (e.g., exploring, running from danger, casting a spell).
            2. **DESIGN THE SPREADS (1-${spreadCount}):** You MUST generate a spread for EVERY text segment in the script. Total spreads needed: ${spreadCount} + 1 (Cover).
            3. **INJECT Visual DNA:** If DNA says "Space/Neon", the scene MUST be "Space/Neon".
                - **Follow Visual DNA:** The plan MUST prioritize the rendering technique and mood defined in the "Visual DNA" input.
                - **Cohesive Mood:** Ensure the emotional resonance matches the story beat while staying within the selected art style.
           
            4. **VOCABULARY BAN (CLARITY TRAPS & STYLE POISON):**
               - NEVER use: "clearly visible", "waiting to be found", "readable from a distance", "spotlighted".
               - NEVER use: "cinematic", "photorealistic", "depth-of-field", "lens", "camera angle", "wide angle".
               - INSTEAD use: "partially obscured", "hidden amongst", "revealed by light", "blending in", "illustration view", "painterly depth".

            5. **CHARACTER NAMING — ABSOLUTE RULE (CRITICAL):**
               - You MUST NEVER use character names (such as "Sarah", "Farah", or any name from the script) anywhere in \`keyActions\`, \`sceneProps\`, or \`setting\`.
               - The ONLY allowed references to characters are: \`[Hero 1]\` for the primary character and \`[Hero 2]\` for the secondary character (if present).
               - *WRONG:* "Sarah points at the map while Farah looks on."
               - *CORRECT:* "[Hero 1] points at the map while [Hero 2] looks on with wide eyes."
               - This rule exists because the image AI does not know who "Sarah" is — it only knows [Hero 1] and [Hero 2] from the provided reference images.

            6. **DUAL CHARACTER ACTION MAPPING (CRITICAL FOR MULTI-HERO):**
               - When writing \`keyActions\`, you MUST explicitly state WHICH character is performing WHICH action using \`[Hero 1]\` and \`[Hero 2]\`.
               - Do not use ambiguous terms like "they", "the kids", "the children", or "both" when describing specific object interactions.
               - Every character in the scene must have their own clearly described, distinct action.
               - *WRONG:* "The hero points at the map while the other child looks on."
               - *CORRECT:* "[Hero 1] holds up a glowing lantern at arm's length while [Hero 2] kneels on the ground, pressing one ear against a hollow tree trunk."

            7. **NARRATIVE SUBJECT INCLUSION (CRITICAL):**
               - If the script text ('script[index]') mentions a specific creature, animal, or crucial object (e.g., "a cat", "a glowing orb"), you MUST explicitly write that subject into the 'keyActions' or 'props' for that spread. 
               - The illustrator AI will ONLY draw what is explicitly described in the 'keyActions'. If it's in the story but you leave it out of the action description, it will be missing from the book!

            8. **ACTION HIGHLIGHT ENFORCEMENT (CRITICAL):**
               - The Story Script takes absolute precedence. You MUST make the physical focal point of your \`keyActions\` match exactly what is happening in the provided Script for that spread. 
               - If the Blueprint's planned highlightAction contradicts the final Script, ignore the Blueprint and draw exactly what the Script describes.
               - Do not default to passive, static poses if an action is occurring.

            9. **SETTING AND TIME SYNC (MANDATORY):**
               - You MUST use the exact \`specificLocation\`, \`environmentType\`, and \`timeOfDay\` strictly as defined in the **Blueprint Planned Spreads**. 
               - If the blueprint says "Night", the scene \`lighting\` and \`timeOfDay\` must be Night. If it says "Inside a Cave", it must be an enclosed cave.
               - The \`setting\` field must be a short English description of the physical environment. Be specific and grounded: e.g. "A simple residential backyard with a green lawn, a wooden fence, and a large oak tree" — NOT just "Backyard". Derive this from Blueprint's \`specificLocation\` and \`environmentType\`.

            10. **STRICT WIDE ANGLE / VANTAGE POINT MANDATE (CRITICAL LAYOUT RULE):**
               - The \`cameraAngle\` MUST ALWAYS be a wide, spacious establishing shot. 
               - ABSOLUTELY NO close-ups, extreme close-ups, or tight framing on faces or objects. 
               - The illustration MUST have expansive negative space and open areas.
               - To keep the scene dynamic, you may change the *location* or the *vantage point* (where we are looking from), but the composition must remain WIDE.

            11. **NO TEXT:** Description is for IMAGES only.
            
            12. **STRICT VISUAL FOCUS ALIGNMENT:**
               - The **Blueprint Planned Spreads** explicitly define a \`visualFocus\` for each page. 
               - You MUST directly translate the exact elements mentioned in the \`visualFocus\` (e.g., characters holding specific props, specific emotional reactions) into your final \`keyActions\` and \`sceneProps\`. Do not ignore or overwrite the planned visual focus.

            13. **RIGID SCENE PROPS — MANDATORY MINIMUM DETAIL (CRITICAL):**
               - You MUST list every single prop AND every animal required in the scene in a dedicated \`sceneProps\` JSON array.
               - **MINIMUM DESCRIPTION STANDARD:** Every single prop MUST have a \`physical_description\` of at least 3 full sentences covering: (1) exact material/species, (2) specific size/scale relative to the children, (3) color/texture details AND specific pose or action.
               - DO NOT use abstract, conceptual definitions. Every prop must be a concrete, physically observable object.
               - **BAD PROP (too vague):** \`{ "name": "Animals", "physical_description": "The animals are looking at the kids." }\`
               - **GOOD PROP (fully described):** \`{ "name": "Wolves", "physical_description": "Two medium-sized grey wolves with silver-tipped fur and warm amber eyes. Each wolf is roughly the size of a large dog, about half the height of the children. They sit on all fours with ears perked forward and heads tilted curiously toward [Hero 1] and [Hero 2], tails curled around their paws, expressions gentle and encouraging." }\`
               - **BAD PROP (too vague):** \`{ "name": "Fireflies", "physical_description": "Glowing fireflies." }\`
               - **GOOD PROP (fully described):** \`{ "name": "Fireflies", "physical_description": "Dozens of tiny fireflies no larger than a fingernail, each emitting a soft warm yellow-green glow. They drift lazily through the air at knee-to-head height around the children, creating floating dots of light scattered throughout the scene. Their glow pulses gently, like breathing." }\`
               - The Primary Visual Anchor (${blueprint.foundation?.primaryVisualAnchor || "Hero's item"}) MUST be explicitly included in this array if it is present in the scene.

            14. **ANIMAL SPECIES CONSTRAINT (MANDATORY):**
               - ALL animals in the story MUST be consistent with the story world and the hero's desire.
               - The blueprint defines the story world's creatures. If the hero's desire mentions a "wolf pack", ALL outdoor animal scenes MUST feature wolves — NEVER leopards, lions, cats, or other unrelated species unless the script explicitly introduces them.
               - Story Hero Desire: "${blueprint.foundation?.heroDesire || ''}"
               - Story Core: "${blueprint.foundation?.storyCore || ''}"
               - You MUST read these to identify which animals belong in this story world, then only use those animals in your \`sceneProps\`.
               - Every animal entry in \`sceneProps\` MUST specify: species, count, coat/color description, size relative to the children, pose, and expression/demeanor.

            15. **NO REPETITION ALLOWED (CRITICAL VISUAL PROGRESSION):**
               - The \`keyActions\` MUST distinctly change and progress from spread to spread.
               - DO NOT copy-paste the same \`keyActions\` or \`pose_orientation\` across multiple spreads. 
               - Every single spread MUST showcase a distinctly unique physical action based on its respective script segment. If the hero is sitting in spread 1, they should be doing something different in spread 2.

            OUTPUT JSON (Must contain exactly ${spreadCount + 1} items in "spreads" array: Cover [0] + Spreads 1–${spreadCount}):
            {
                "visualAnchors": {
                    "heroTraits": "...",
                    "signatureItems": "...",
                    "recurringLocations": "...",
                    "persistentProps": "...",
                    "spatialLogic": "..."
                },
                "spreads": [
                    { 
                        "spreadNumber": 0,
                        "setting": "Cover Scene",
                        "environmentType": "Cover Illustration",
                        "timeOfDay": "...", 
                        "lighting": "Style-Consistent",
                        "mainContentSide": "Right", 
                        "keyActions": "[Hero 1] looking confident...",
                        "mood": "Magical/Inviting",
                        "emotion": "Wonder",
                        "cameraAngle": "Natural View",
                        "colorPalette": "Inherited from DNA",
                        "sceneProps": [
                            { "name": "Wooden compass", "physical_description": "A pocket-sized circular compass carved from dark mahogany wood with a cracked glass face. It is small enough to fit in a child's palm. The needle is tarnished bronze and points slightly off-center, giving it a worn, well-used appearance." }
                        ],
                        "continuityNotes": "Title placed on Left (Empty Space)" 
                    },
                    {
                        "spreadNumber": 1,
                        "setting": "..."
                    }
                    // CRITICAL: YOU MUST OUTPUT EXACTLY ${spreadCount + 1} SPREAD OBJECTS (COVER [0] + SPREADS 1 THROUGH ${spreadCount}) IN THIS ARRAY. DO NOT TRUNCATE OR DUPLICATE THEM.
                ]
            }
            `;

            const model = ai().getGenerativeModel({
                model: 'gemini-2.0-flash',
                generationConfig: { responseMimeType: "application/json" }
            });

            const response = await model.generateContent(prompt);
            const rawText = response.response.text();
            console.log("Raw Director Response Length:", rawText.length);

            const plan = JSON.parse(cleanJsonString(rawText));

            console.log("Parsed Plan Spreads:", plan.spreads?.length || 0);
            console.log("Expected Spreads:", script.length);

            if (!Validator.validateVisualPlan(plan, spreadCount)) {
                console.error("Validation Failed. Plan:", JSON.stringify(plan, null, 2));
                throw new Error("Visual Plan has insufficient spreads.");
            }

            return {
                result: { ...plan, characters: blueprint.characters }, // Pass through characters for PromptEngineer
                log: {
                    stage: 'Visual Plan',
                    timestamp: startTime,
                    inputs: { scriptLength: script.length, dna: visualDNA },
                    outputs: { spreadCount: plan.spreads.length },
                    status: 'Success',
                    durationMs: Date.now() - startTime
                }
            };
        });
    } catch (e: any) {
        console.error("Visual Plan Generation Failed:", e);
        console.error("Visual Plan Error Details:", JSON.stringify(e, Object.getOwnPropertyNames(e)));

        return {
            result: {} as SpreadDesignPlan,
            log: {
                stage: 'Visual Plan',
                timestamp: startTime,
                inputs: { scriptLength: script.length },
                outputs: { error: e.message || "Unknown Error" },
                status: 'Failed',
                durationMs: Date.now() - startTime
            }
        };
    }
}
