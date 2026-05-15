import { ai, cleanJsonString, withRetry } from '../generation/modelGateway';
import { Validator } from '../rules/validator';
import { GUIDEBOOK } from '../rules/guidebook';
import { StoryBlueprint, SpreadDesignPlan, WorkflowLog, StyleProfile, HeroProfile } from '../../types';

export async function generateVisualPlan(
    script: { text: string }[],
    blueprint: StoryBlueprint,
    styleProfile: StyleProfile,
    heroes: HeroProfile[],
    spreadCount: number = 8
): Promise<{ result: SpreadDesignPlan, log: WorkflowLog }> {

    const startTime = Date.now();

    try {
        return await withRetry(async () => {
            const prompt = `
            ROLE: Cinematographer / Art Director.
            TASK: Translate Story Text into Structured Visual Scene Descriptions.
    
            INPUTS:
            - Story Script: ${JSON.stringify(script)}
            - Blueprint Settings: ${JSON.stringify(blueprint.foundation)}
            - Blueprint Planned Spreads (CRITICAL): ${JSON.stringify(blueprint.structure?.spreads || [])}
            - Rules: ${JSON.stringify(GUIDEBOOK.visual)}
            - Hero Registry: ${JSON.stringify(heroes)}
            - Selected Style Profile: ${JSON.stringify(styleProfile)}
    
            INSTRUCTIONS:
            1. **DESIGN THE COVER (Spread 0):** This is the most critical art. Assign the characters to one side ("left" or "right"), and leave the other side explicitly as uncluttered negative space for the title. **CRITICAL STORYTELLING MANDATE:** The cover MUST tell a story. Do not just have the characters standing and posing. They must be actively engaged in an exciting, story-representative action.
            2. **DESIGN THE SPREADS (1-${spreadCount}):** You MUST generate a spread for EVERY text segment in the script. Total spreads needed: ${spreadCount} + 1 (Cover).
            3. **HONOR THE STYLE PROFILE:** 
                - The visual style is strictly defined by the Selected Style Profile above.
                - The color_palette, mood, and environment descriptions MUST fit naturally into this style.
                - Do not invent or substitute a different aesthetic.

            4. **VOCABULARY BAN (CLARITY TRAPS):**
               - NEVER use: "clearly visible", "waiting to be found", "readable from a distance", "spotlighted".
               - INSTEAD use: "partially obscured", "hidden amongst", "revealed by light", "blending in".

            5. **CHARACTER TOKEN RULE — VARIABLE HERO COUNT:**
               - Use ONLY the hero tokens provided in the Hero Registry (e.g., ${heroes.map(h => h.token).join(', ')}).
               - Never use real character names inside actions, setting, or props.
               - Never use vague labels like "the child", "the kids", "the group", "they", or "both" when describing a specific action.
               - Every visible hero must receive:
                 1. a clear position in the frame,
                 2. a distinct physical action,
                 3. an expression,
                 4. an eye-line or body-language relationship to the main story focus.
               - If a hero is not present in a spread, explicitly mark them as "absent".

            6. **NARRATIVE SUBJECT INCLUSION (CRITICAL):**
               - If the script text mentions a specific creature, animal, or crucial object, you MUST explicitly write that subject into the 'scene_props' for that spread. 

            7. **ACTION HIGHLIGHT ENFORCEMENT:**
               - The Story Script takes absolute precedence over the Blueprint Planned Spreads. If they contradict, draw exactly what the Script describes.

            8. **SETTING AND TIME SYNC:**
               - You MUST use the exact specific_location, environment_type, and time_of_day from the Blueprint Planned Spreads. 

            9. **FRAMING RULE (composition_view):**
               - Use a "medium-wide storybook scene" composition with enough room for background and text-safe negative space. 
               - Faces must remain readable and unobstructed. Avoid tight close-ups, but do not push characters so far back that likeness is lost. Use "wide storybook scene" ONLY when grand scale is truly necessary.

            10. **STRICT VISUAL FOCUS ALIGNMENT:**
               - Directly translate elements from the Blueprint's visualFocus into the hero_actions and scene_props.

            11. **RIGID SCENE PROPS — MANDATORY MINIMUM DETAIL:**
               - List every single prop AND every animal required in the scene in the scene_props array.
               - Every prop MUST have a physical_description of at least 3 full sentences covering: (1) exact material/species, (2) specific size/scale, (3) color/texture details AND specific pose or action.
               - Evaluate the 'text_risk' (none, low, high) of each prop. If high (like a book, sign, shirt), provide a text_safe_rendering instruction (e.g. "Abstract symbols only, no readable words").

            12. **NO REPETITION ALLOWED:**
               - The hero_actions MUST distinctly change from spread to spread. Do not copy-paste poses.

            13. **FACE VISIBILITY MANDATE:**
               - Do not write actions where characters' hands, arms, or objects obscure their faces (e.g., no "covering face with hands").

            14. **MILD EMOTIONS & GROUNDED ACTIONS:**
               - Do not use extreme emotions like "terrified", "shocked", or "screaming". Use milder expressions: "worried", "confused", "pensive". Keep physical actions grounded.

            OUTPUT JSON SCHEMA:
            {
                "visualAnchors": { 
                    "heroTraits": "...",
                    "signatureItems": "...",
                    "recurringLocations": "...",
                    "persistentprops": "...",
                    "spatialLogic": "..."
                },
                "spreads": [
                    { 
                        "spread_index": 0,
                        "spread_type": "cover",
                        "story_beat": "Cover Scene",
                        "setting": {
                            "specific_location": "...",
                            "environment_type": "outdoor",
                            "time_of_day": "Day",
                            "lighting": "...",
                            "color_palette": "...",
                            "mood": "..."
                        },
                        "composition": {
                            "aspect_ratio": "16:9",
                            "composition_view": "medium-wide storybook scene",
                            "text_zone_side": "left",
                            "text_zone_percentage": 40,
                            "action_zone_side": "right",
                            "negative_space_description": "..."
                        },
                        "hero_actions": [
                            {
                                "hero_id": "hero_1",
                                "token": "[[HERO_1]]",
                                "presence": "visible",
                                "position": "right",
                                "action": "...",
                                "expression": "...",
                                "eye_line": "...",
                                "face_visibility": "clear",
                                "interaction_with": []
                            }
                        ],
                        "scene_props": [
                            { 
                                "name": "Wooden compass", 
                                "physical_description": "...",
                                "text_risk": "none",
                                "text_safe_rendering": ""
                            }
                        ],
                        "background_details": {
                            "required_elements": [],
                            "forbidden_elements": [],
                            "text_risk_elements": []
                        },
                        "continuity_notes": {
                            "avoid_repetition_note": "..."
                        }
                    }
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
                result: { ...plan, characters: blueprint.characters },
                log: {
                    stage: 'Visual Plan',
                    timestamp: startTime,
                    inputs: { scriptLength: script.length, style: styleProfile.style_id },
                    outputs: { spreadCount: plan.spreads?.length || 0 },
                    status: 'Success',
                    durationMs: Date.now() - startTime
                }
            };
        });
    } catch (e: any) {
        console.error("Visual Plan Generation Failed:", e);

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
