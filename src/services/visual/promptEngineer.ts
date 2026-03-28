
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
            
            // Unicode-safe Name Wrapper
            const applyNameMask = (text: string, name: string, mask: string) => {
                if (!name || name.length < 2) return text;
                try {
                    const safeName = name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
                    const r = new RegExp(`(^|[^\\p{L}])(${safeName})(?=[^\\p{L}]|$)`, 'giu');
                    return text.replace(r, `$1${mask}`);
                } catch {
                    return text.split(name).join(mask); // Fallback
                }
            };
            
            // Step 1: Replace real names with image labels
            safeAction = applyNameMask(safeAction, childName, '[IMAGE 1]');
            safeSetting = applyNameMask(safeSetting, childName, '[IMAGE 1]');
            if (secondCharacter?.name) {
                safeAction = applyNameMask(safeAction, secondCharacter.name, '[IMAGE 2]');
                safeSetting = applyNameMask(safeSetting, secondCharacter.name, '[IMAGE 2]');
            }
            // Step 2: Also replace [Hero 1]/[Hero 2] labels (from director output) with image refs
            safeAction = safeAction.replace(/\[Hero 1\]/gi, '[IMAGE 1]').replace(/\[Hero 2\]/gi, '[IMAGE 2]');
            safeSetting = safeSetting.replace(/\[Hero 1\]/gi, '[IMAGE 1]').replace(/\[Hero 2\]/gi, '[IMAGE 2]');

            const isCover = spread.spreadNumber === 0;
            // The empty space (where the title will go) MUST be the front cover.
            // English Front Cover = right. Arabic Front Cover = left.
            const emptySide = isAr ? 'left' : 'right';
            const oppSide = isCover ? emptySide : opp.toLowerCase();
            
            // The Subject (Hero) MUST be on the back cover to not overlap the title.
            // English Back Cover = left. Arabic Back Cover = right.
            const coverSubjectSide = isAr ? 'right' : 'left';
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
                    lighting: parsedStyleDNA?.global_context?.lighting || undefined,
                    // Issue 7 Fix: Ground the environment so the AI cannot drift to tropical/jungle
                    environment_constraint: (() => {
                        if (isCover) return undefined;
                        const envType = (spread.environmentType || '').toLowerCase();
                        const settingText = (safeSetting || '').toLowerCase();
                        if (envType === 'indoor') return `This is a strictly INDOOR scene (${safeSetting}). Do NOT add outdoor elements, trees, or nature.`;
                        if (settingText.includes('backyard') || settingText.includes('garden') || settingText.includes('حديقة')) {
                            return `This is a standard residential backyard: green grass lawn, simple garden plants (no exotic or tropical vegetation), a wooden fence, and a large tree. NOT a jungle, NOT a forest, NOT a tropical garden.`;
                        }
                        if (settingText.includes('forest') || settingText.includes('wood')) {
                            return `This is a temperate forest with tall oak or pine trees, fallen leaves on the ground, and dappled shade. NOT a tropical or jungle forest.`;
                        }
                        return undefined;
                    })()
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
                // Issue 5 Fix: Extract Hero 2's specific action from safeAction instead of vague fallback
                let hero2Action = "Actively participating in the scene described above";
                const img2Idx = safeAction.indexOf('[IMAGE 2]');
                if (img2Idx !== -1) {
                    // Extract the portion of the action that starts at [IMAGE 2]
                    hero2Action = safeAction.substring(img2Idx).trim();
                }
                promptJson.objects.push({
                    id: "obj_hero_2",
                    label: "[IMAGE 2]",
                    category: "Secondary Character",
                    location: { relative_position: `Also located in the ${finalSubjectSide} two-thirds` },
                    pose_orientation: hero2Action,
                    material: parsedSecondDNA?.objects?.[0]?.material || "Standard seasonal wear",
                    surface_properties: parsedSecondDNA?.objects?.[0]?.surface_properties || undefined,
                    color_details: parsedSecondDNA?.objects?.[0]?.color_details || undefined
                });
            }

            // 5. Inject Occasion / Elements
            // Bug 4: sanitize ALL text fields before embedding in the image prompt schema
            // so Arabic theme text, old anchors from previous orders, etc. cannot leak in.
            if (occasion || extraItems || theme) {
                // Issue 1 Fix: Only inject visualAnchor if it is relevant to this specific spread.
                // Prevents old-order artifacts ("Oryx", "desert flora") from leaking into unrelated scenes.
                const anchorKeyword = visualAnchor.toLowerCase();
                const isAnchorRelevantToSpread = anchorKeyword.length > 0 && (
                    safeAction.toLowerCase().includes(anchorKeyword.split(' ')[0]) ||
                    safeSetting.toLowerCase().includes(anchorKeyword.split(' ')[0]) ||
                    (spread.sceneProps || []).some((p: any) => 
                        (p.name || '').toLowerCase().includes(anchorKeyword.split(' ')[0]) ||
                        (p.physical_description || '').toLowerCase().includes(anchorKeyword.split(' ')[0])
                    )
                );
                promptJson.objects.push({
                    id: "obj_extras",
                    label: "Thematic Props",
                    category: "Props",
                    relationships: [{ type: "integrated naturally", target_object_id: "obj_hero_1" }],
                    reconstruction_notes: [
                        sanitizePrompt(theme || ""),
                        sanitizePrompt(occasion || ""),
                        sanitizePrompt(extraItems || ""),
                        isAnchorRelevantToSpread ? sanitizePrompt(visualAnchor) : ""
                    ].filter(Boolean)
                } as any);
            }

            // 6. Inject Scene Props (Rigid Object Pipeline)
            // Issue 6 Fix: Enforce minimum description quality. Reject vague props at compile time.
            if (spread.sceneProps && Array.isArray(spread.sceneProps)) {
                spread.sceneProps.forEach((prop, index) => {
                    const rawDesc = prop.physical_description || '';
                    // Enforce minimum description: must be at least 80 characters (roughly 1 sentence)
                    const isDescriptionAdequate = rawDesc.trim().length >= 80;
                    const finalDesc = isDescriptionAdequate
                        ? rawDesc
                        : `${prop.name || 'Object'} — ${rawDesc.trim() || 'present in scene'}. Draw this object with realistic physical detail matching the story context. Do not invent species or type not described here.`;
                    
                    // Also replace [Hero 1]/[Hero 2] in prop descriptions in case director used them
                    const maskedDesc = finalDesc
                        .replace(/\[Hero 1\]/gi, '[IMAGE 1]')
                        .replace(/\[Hero 2\]/gi, '[IMAGE 2]');

                    promptJson.objects.push({
                        id: `obj_scene_prop_${index}`,
                        label: prop.name || "Story Object",
                        category: "Story Prop",
                        location: { relative_position: "Integrated accurately into the scene context" },
                        material: maskedDesc,
                        reconstruction_notes: [
                            "Must perfectly match physical description above.",
                            "Do NOT invent or substitute the animal species, object type, or colors.",
                            "Draw exactly what is described — count, size, pose, and expression."
                        ]
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
