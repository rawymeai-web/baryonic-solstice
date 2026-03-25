
import { ai, cleanJsonString, withRetry } from '../generation/modelGateway';
import { sanitizePrompt } from '../generation/imageGenerator';
import { GUIDEBOOK } from '../rules/guidebook';
import { SpreadDesignPlan, StoryBlueprint, WorkflowLog, Language, VisionPromptSchema } from '../../types';

function safeParseJSON(text: string): any {
    if (!text) return null;
    try { return JSON.parse(text); }
    catch { return null; }
}

export async function generatePrompts(
    plan: SpreadDesignPlan,
    blueprint: StoryBlueprint | undefined,
    visualDNA: string,
    childAge: string,
    childDescription: string,
    childName: string,
    secondCharacter?: any,
    language: Language = 'en',
    occasion?: string,
    extraItems?: string,
    theme?: string
): Promise<{ result: { spreadNumber: number, imagePrompt: string, storyText: string }[], log: WorkflowLog }> {

    const startTime = Date.now();
    
    // Sanitize visualDNA immediately to strip any leaked base64 or Arabic
    const safeDNA = sanitizePrompt(visualDNA);

    try {
        if (!plan || !plan.spreads || !Array.isArray(plan.spreads)) {
            throw new Error("Invalid plan structure: missing spreads array. Check AI response.");
        }

        const prompts = plan.spreads.map(spread => {
            const isAr = language === 'ar';
            const targetSideRaw = (spread.mainContentSide || 'right').toLowerCase();
            const subjectSide = isAr
                ? (targetSideRaw === 'left' ? 'Right' : 'Left')
                : (targetSideRaw === 'left' ? 'Left' : 'Right');

            const opp = subjectSide.toLowerCase() === 'left' ? 'Right' : 'Left';
            
            // Reconcile Blueprint variables
            const bpSpread = blueprint?.structure?.spreads?.find(s => s.spreadNumber === spread.spreadNumber);
            const blueprintFocus = bpSpread ? (bpSpread.highlightAction || bpSpread.visualFocus) : "";
            const finalCameraAngle = bpSpread ? (bpSpread.cameraAngle || spread.cameraAngle) : spread.cameraAngle;
            const visualAnchor = blueprint?.foundation?.primaryVisualAnchor || "";

            let safeAction = spread.keyActions || blueprintFocus || "Hero stands heroically";
            let safeSetting = spread.setting || "";
            try {
                if (childName) {
                    const r1 = new RegExp(`\\b${childName}\\b`, 'gi');
                    safeAction = safeAction.replace(r1, '[IMAGE 1]');
                    safeSetting = safeSetting.replace(r1, '[IMAGE 1]');
                }
                if (secondCharacter?.name) {
                    const r2 = new RegExp(`\\b${secondCharacter.name}\\b`, 'gi');
                    safeAction = safeAction.replace(r2, '[IMAGE 2]');
                    safeSetting = safeSetting.replace(r2, '[IMAGE 2]');
                }
            } catch (e) { }

            const isCover = spread.spreadNumber === 0;
            const oppSide = isCover ? (isAr ? 'right' : 'left') : opp.toLowerCase();
            const coverSubjectSide = isAr ? 'left' : 'right';
            const finalSubjectSide = isCover ? coverSubjectSide : subjectSide.toLowerCase();

            const secComp = secondCharacter 
                ? `[IMAGE 1] and [IMAGE 2] occupy the ${finalSubjectSide} two-thirds of the frame, angled slightly inward.` 
                : `[IMAGE 1] occupies the ${finalSubjectSide} two-thirds of the frame.`;

            // === JSON STRUCTURAL COMPILATION ===
            
            // 1. Parse incoming DNA
            const parsedChildDNA = safeParseJSON(childDescription);
            const parsedStyleDNA = safeParseJSON(safeDNA);
            const parsedSecondDNA = secondCharacter ? safeParseJSON(secondCharacter.description) : null;

            // 2. Build the Schema Object
            const promptJson: VisionPromptSchema = {
                meta: {
                    image_quality: "Ultra-high resolution, 4K quality, flawless rendering, masterpiece",
                    image_type: "Flat 2D illustrated rendering",
                },
                global_context: {
                    scene_description: isCover ? "Panoramic book cover layout" : safeSetting,
                    environment_type: spread.environmentType || "Unknown",
                    time_of_day: spread.timeOfDay || "Day",
                    weather_atmosphere: spread.mood || "Wonder",
                    color_palette: parsedStyleDNA?.global_context?.color_palette || {
                        contrast_level: (spread.timeOfDay || 'day').toLowerCase() === 'night' ? 'Cool, soft ambient palette' : 'Warm color palette'
                    },
                    lighting: parsedStyleDNA?.global_context?.lighting || undefined
                },
                composition: {
                    camera_angle: isCover ? "Eye-level" : finalCameraAngle,
                    framing: "Wide panoramic establishing shot. No dutch angles.",
                    rule_of_thirds_alignment: `The ${oppSide} side must be completely open and empty background space. Do NOT generate text, lettering, or words in this space.`
                },
                objects: [],
                background_details: parsedStyleDNA?.background_details || {
                    texture: "Painterly brushwork, soft linework, consistent with [IMAGE 1]."
                },
                foreground_elements: parsedStyleDNA?.foreground_elements || {},
                reconstruction_notes: {
                    mandatory_elements_for_recreation: [
                        "Absolutely NO text, typography, fonts, or words generated anywhere.",
                        "No photographic shadows or photorealism.",
                        ...(parsedChildDNA?.reconstruction_notes?.mandatory_elements_for_recreation || []),
                        ...(parsedStyleDNA?.reconstruction_notes?.mandatory_elements_for_recreation || [])
                    ]
                }
            };

            // 3. Inject Primary Hero (Image 1)
            promptJson.objects.push({
                id: "obj_hero_1",
                label: "[IMAGE 1]",
                category: "Primary Character",
                location: { relative_position: secComp },
                pose_orientation: safeAction,
                material: parsedChildDNA?.objects?.[0]?.material || "Standard seasonal wear",
                surface_properties: parsedChildDNA?.objects?.[0]?.surface_properties || undefined,
                color_details: parsedChildDNA?.objects?.[0]?.color_details || undefined
            });

            // 4. Inject Secondary Hero (Image 2) Dynamically
            const actionTextLower = safeAction.toLowerCase();
            const settingTextLower = safeSetting.toLowerCase();
            const secondNameLower = secondCharacter?.name?.toLowerCase() || '';

            const isSecondCharacterInScene = secondNameLower && 
                (actionTextLower.includes(secondNameLower) || 
                 actionTextLower.includes('they') || 
                 actionTextLower.includes('together') ||
                 actionTextLower.includes('companion') ||
                 actionTextLower.includes('image 2') ||
                 settingTextLower.includes(secondNameLower));

            if (secondCharacter && isSecondCharacterInScene) {
                promptJson.objects.push({
                    id: "obj_hero_2",
                    label: "[IMAGE 2]",
                    category: "Secondary Character",
                    location: { relative_position: `Also located in the ${finalSubjectSide} two-thirds` },
                    pose_orientation: "Interacting exactly as described in the blueprint action",
                    material: parsedSecondDNA?.objects?.[0]?.material || "Standard seasonal wear",
                    surface_properties: parsedSecondDNA?.objects?.[0]?.surface_properties || undefined,
                    color_details: parsedSecondDNA?.objects?.[0]?.color_details || undefined
                });
            }

            // 5. Inject Occasion / Elements
            if (occasion || extraItems || visualAnchor || theme) {
                promptJson.objects.push({
                    id: "obj_extras",
                    label: "Thematic Props",
                    category: "Props",
                    relationships: [{ type: "integrated naturally", target_object_id: "obj_hero_1" }],
                    reconstruction_notes: [theme || "", occasion || "", extraItems || "", visualAnchor || ""].filter(Boolean)
                } as any);
            }

            // 6. Inject Scene Props (Rigid Object Pipeline)
            if (spread.sceneProps && Array.isArray(spread.sceneProps)) {
                spread.sceneProps.forEach((prop, index) => {
                    promptJson.objects.push({
                        id: `obj_scene_prop_${index}`,
                        label: prop.name || "Story Object",
                        category: "Story Prop",
                        location: { relative_position: "Integrated accurately into the scene context" },
                        material: prop.physical_description || "As defined by the visual narrative",
                        reconstruction_notes: ["Must perfectly match physical description"]
                    } as any);
                });
            }

            // 6. Serialize the JSON string for the image model
            const stringifiedSchema = JSON.stringify(promptJson, null, 2);

            const imagePrompt = `**IMAGE REFERENCES:**
- [IMAGE 1]: Must perfectly match attached photo identity.
${secondCharacter ? `- [IMAGE 2]: Must perfectly match second photo identity.\n` : ""}
**VISION ARCHITECTURE BLUEPRINT:**
\`\`\`json
${stringifiedSchema}
\`\`\``;

            return {
                spreadNumber: spread.spreadNumber,
                imagePrompt: imagePrompt,
                storyText: isCover ? "" : (bpSpread?.narrative || "")
            };
        });

        return {
            result: prompts,
            log: {
                stage: 'Prompt Engineering',
                timestamp: startTime,
                inputs: { planSize: plan.spreads.length },
                outputs: { promptCount: prompts.length, method: 'Structured JSON Architecture' },
                status: 'Success',
                durationMs: Date.now() - startTime
            }
        };
    } catch (e: any) {
        return {
            result: [],
            log: {
                stage: 'Prompt Engineering',
                timestamp: startTime,
                inputs: { planSize: plan?.spreads?.length || 0 },
                outputs: { error: e.message },
                status: 'Failed',
                durationMs: Date.now() - startTime
            }
        };
    }
}
