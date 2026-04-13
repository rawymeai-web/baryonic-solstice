
import { ai, cleanJsonString, withRetry } from '../generation/modelGateway';
import { sanitizePrompt } from '../generation/imageGenerator';
import { GUIDEBOOK } from '../rules/guidebook';
import { SpreadDesignPlan, StoryBlueprint, WorkflowLog, Language, VisionPromptSchema, VisionPersonEntitySchema, VisionPropEntitySchema } from '../../types';

// ============================================================
// EMOTION EXPANSION MAP
// Maps Blueprint emotionalBeat labels to cinematic descriptions
// that the image model can directly translate to facial/body cues.
// ============================================================
const EMOTION_MAP: Record<string, string> = {
    'Hopeful':     'soft upward gaze, gentle closed-mouth smile, shoulders relaxed and open',
    'Curious':     'wide bright eyes, head tilted slightly to one side, one eyebrow subtly raised',
    'Excited':     'open beaming smile, eyes wide and sparkling, body leaning eagerly forward',
    'Sad':         'downcast eyes looking at the floor, small pressed lips, slumped shoulders, heavy posture',
    'Scared':      'eyes wide and tense, jaw tight, body pulled slightly inward and hunched',
    'Frustrated':  'tight lips pressed together, brow furrowed, hands balled at sides',
    'Determined':  'firm set jaw, steady forward gaze, chin slightly raised, chest forward',
    'Relieved':    'eyes gently closed in exhale, warm soft smile, visibly relaxed posture',
    'Proud':       'head lifted high, wide genuine grin, standing tall with open chest',
    'Lonely':      'eyes unfocused and distant, very still body, small and quiet — withdrawn posture',
};

function safeParseJSON(text: string): any {
    if (!text) return null;
    try { return JSON.parse(text); }
    catch { return null; }
}

// ============================================================
// ENTITY BUILDER
// Builds a strongly-typed entity object for the JSON prompt.
// Branches on character type: 'person' vs 'object'.
// ============================================================
function buildEntity(
    charDNA: any,
    token: string,
    imageIndex: number,
    spatialAnchor: string,
    action: string,
    emotion: string,
    charType: 'person' | 'object'
): VisionPersonEntitySchema | VisionPropEntitySchema {

    if (charType === 'object') {
        const propEntity: VisionPropEntitySchema = {
            id: token.toLowerCase().replace(/[\[\]]/g, ''),
            unique_token_name: token,
            entity_type: 'prop_entity',
            source_reference: {
                image_input: `inlineData[${imageIndex}] — Attached Image ${imageIndex + 1}`,
                binding_instruction: `${token} IS this specific object. Match its exact shape, color, texture, and material as seen in the photo. Do not substitute a different object type.`,
                weight: '1.0 — MATCH EXACTLY'
            },
            spatial_anchor: spatialAnchor,
            physical_description: charDNA?.objects?.[0]?.material || 'Match the attached photo exactly — exact shape and color',
            color_details: charDNA?.objects?.[0]?.color_details || undefined,
            current_variables: { pose_action: action }
        };
        return propEntity;
    }

    const sensitivityFactors = Array.isArray(charDNA?.reconstruction_notes?.sensitivity_factors)
        ? charDNA.reconstruction_notes.sensitivity_factors.join('; ')
        : (charDNA?.reconstruction_notes?.sensitivity_factors || 'As visible in photo');

    const mandatoryElements = Array.isArray(charDNA?.reconstruction_notes?.mandatory_elements_for_recreation)
        ? charDNA.reconstruction_notes.mandatory_elements_for_recreation.join('; ')
        : 'Match attached photo exactly';

    const hairHex = charDNA?.objects?.[0]?.color_details?.base_color_hex || '';
    const hairTexture = charDNA?.objects?.[0]?.surface_properties?.texture || '';
    const hairDesc = [hairTexture, hairHex ? `Hex: ${hairHex}` : ''].filter(Boolean).join(' | ');

    const personEntity: VisionPersonEntitySchema = {
        id: token.toLowerCase().replace(/[\[\]]/g, ''),
        unique_token_name: token,
        entity_type: 'person_entity',
        source_reference: {
            image_input: `inlineData[${imageIndex}] — Attached Image ${imageIndex + 1}`,
            binding_instruction: `IDENTITY LOCK: ${token} IS the person in this specific photo. The photo is the absolute ground truth. You MUST perfectly preserve the resemblance. Use the provided facial structural geometry to replicate the exact eye spacing, nose shape, lip thickness, and jawline seen in the reference photo. This is a strict rotoscope requirement. Do NOT fall back on generic structural defaults.`,
            weight: '1.0 — IDENTITY IS NON-NEGOTIABLE'
        },
        spatial_anchor: spatialAnchor,
        immutable_identity: {
            facial_structure: mandatoryElements,
            hair_style_and_color: hairDesc || 'Match attached photo',
            distinct_marks: sensitivityFactors
        },
        current_variables: {
            pose_action: action,
            attire: charDNA?.objects?.[0]?.material || 'Consistent with prior spreads — do not invent new clothing',
            emotion: emotion
        }
    };
    return personEntity;
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

            // Resolve emotion from Blueprint emotionalBeat
            const rawEmotionalBeat = bpSpread?.emotionalBeat || 'Curious';
            const resolvedEmotion = EMOTION_MAP[rawEmotionalBeat] || `${rawEmotionalBeat.toLowerCase()} expression`;

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
                    return text.split(name).join(mask);
                }
            };

            // Determine the Workflow Branch
            const isSingleHeroItem = secondCharacter && secondCharacter.type === 'object';
            const isDualHeroPerson = secondCharacter && secondCharacter.type === 'person';

            // Determine dynamic token for the second input
            const secondToken = isSingleHeroItem ? '[[OBJECT_A]]' : '[[HERO_B]]';

            // Replace real names with photo-bound tokens
            safeAction = applyNameMask(safeAction, childName, '[[HERO_A]]');
            safeSetting = applyNameMask(safeSetting, childName, '[[HERO_A]]');
            if (secondCharacter?.name) {
                safeAction = applyNameMask(safeAction, secondCharacter.name, secondToken);
                safeSetting = applyNameMask(safeSetting, secondCharacter.name, secondToken);
            }
            // Also replace legacy [Hero 1]/[Hero 2] labels
            safeAction = safeAction.replace(/\[Hero 1\]/gi, '[[HERO_A]]').replace(/\[Hero 2\]/gi, secondToken);
            safeSetting = safeSetting.replace(/\[Hero 1\]/gi, '[[HERO_A]]').replace(/\[Hero 2\]/gi, secondToken);
            // Also replace legacy [IMAGE 1]/[IMAGE 2]
            safeAction = safeAction.replace(/\[IMAGE 1\]/gi, '[[HERO_A]]').replace(/\[IMAGE 2\]/gi, secondToken);
            safeSetting = safeSetting.replace(/\[IMAGE 1\]/gi, '[[HERO_A]]').replace(/\[IMAGE 2\]/gi, secondToken);

            const isCover = spread.spreadNumber === 0;
            const emptySide = isAr ? 'left' : 'right';
            const oppSide = isCover ? emptySide : opp.toLowerCase();
            const coverSubjectSide = isAr ? 'right' : 'left';
            const finalSubjectSide = isCover ? coverSubjectSide : subjectSide.toLowerCase();

            // Parse incoming DNA
            const parsedChildDNA = safeParseJSON(childDescription);
            const parsedStyleDNA = safeParseJSON(safeDNA);
            const parsedSecondDNA = secondCharacter ? safeParseJSON(secondCharacter.description) : null;

            // Determine if second character is in this scene
            const actionTextLower = safeAction.toLowerCase();
            const settingTextLower = safeSetting.toLowerCase();
            const secondNameLower = secondCharacter?.name?.toLowerCase() || '';
            const isSecondCharacterInScene = secondNameLower &&
                (actionTextLower.includes(secondNameLower) ||
                 actionTextLower.includes(secondToken.toLowerCase()) ||
                 actionTextLower.includes('they') ||
                 actionTextLower.includes('together') ||
                 actionTextLower.includes('companion') ||
                 settingTextLower.includes(secondNameLower));

            // Build scene_dynamics sentence (natural-language cinematic directive)
            let sceneDynamics: string;
            if (secondCharacter && isSecondCharacterInScene) {
                if (isSingleHeroItem) {
                    sceneDynamics = `SCENE DYNAMICS: [[HERO_A]] is interacting with ${secondToken}. ${safeAction}.`;
                } else {
                    sceneDynamics = `SCENE DYNAMICS: [[HERO_A]] and ${secondToken} are ${safeAction}. Their bodies and expressions must reflect active, natural engagement with each other — not two subjects standing stiffly side by side.`;
                }
            } else {
                sceneDynamics = `SCENE DYNAMICS: [[HERO_A]] is ${safeAction}.`;
            }

            // Build entities array
            const entities: (import('../../types').VisionPersonEntitySchema | import('../../types').VisionPropEntitySchema)[] = [];

            // 1. Primary hero entity (Always present)
            entities.push(buildEntity(
                parsedChildDNA,
                '[[HERO_A]]',
                0,
                `The ${finalSubjectSide} two-thirds of the frame`,
                safeAction,
                resolvedEmotion,
                'person'
            ));

            // 2. Secondary entity (Conditional based on Workflow Branch)
            if (isDualHeroPerson && isSecondCharacterInScene) {
                let hero2Action = "Actively participating in the scene";
                const img2Idx = safeAction.indexOf(secondToken);
                if (img2Idx !== -1) {
                    hero2Action = safeAction.substring(img2Idx).trim();
                }
                const secondEmotion = EMOTION_MAP[rawEmotionalBeat] || resolvedEmotion;
                entities.push(buildEntity(
                    parsedSecondDNA,
                    secondToken,
                    1,
                    `Also in the ${finalSubjectSide} two-thirds, facing [[HERO_A]]`,
                    hero2Action,
                    secondEmotion,
                    'person'
                ));
            } else if (isSingleHeroItem && isSecondCharacterInScene) {
                entities.push(buildEntity(
                    parsedSecondDNA,
                    secondToken,
                    1,
                    `Integrated naturally with [[HERO_A]]`,
                    "In use or present in the scene",
                    "Neutral",
                    'object'
                ));
            }

            const dynamicStyleType = safeDNA.length > 5 ? safeDNA : "Stylized illustration";
            const dynamicQuality = "High quality masterpiece, perfectly faithful to the selected art style.";

            // Build the Schema Object
            const promptJson: VisionPromptSchema = {
                meta: {
                    image_quality: dynamicQuality,
                    image_type: dynamicStyleType,
                },
                entities,
                global_context: {
                    scene_description: isCover ? "Panoramic book cover layout" : safeSetting,
                    environment_type: spread.environmentType || "Unknown",
                    time_of_day: spread.timeOfDay || "Day",
                    weather_atmosphere: spread.mood || "Wonder",
                    color_palette: parsedStyleDNA?.global_context?.color_palette || {
                        contrast_level: (spread.timeOfDay || 'day').toLowerCase() === 'night' ? 'Cool, soft ambient palette' : 'Warm color palette'
                    },
                    lighting: parsedStyleDNA?.global_context?.lighting || undefined,
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
                    depth_of_field: "Shallow — subjects in sharp focus, background in soft painterly blur",
                    focal_point: isSecondCharacterInScene ? `[[HERO_A]] and ${secondToken}` : "[[HERO_A]]",
                    symmetry_type: "Asymmetric — subject(s) weighted to one side, open negative space on the other",
                    rule_of_thirds_alignment: `The ${oppSide} side must be completely open and empty background space. Do NOT generate text, lettering, or words in this space.`
                },
                objects: [],
                background_details: parsedStyleDNA?.background_details || {
                    texture: "Painterly brushwork, soft linework, consistent with art style.",
                    additional_elements: spread.sceneProps?.map((p: any) => p.name).filter(Boolean) || []
                },
                foreground_elements: parsedStyleDNA?.foreground_elements || {},
                reconstruction_notes: {
                    mandatory_elements_for_recreation: [
                        "Absolutely NO text, typography, fonts, or words generated anywhere in the image.",
                        "Strictly adhere to the selected art style. Avoid photographic realism unless explicitly requested.",
                        ...(parsedChildDNA?.reconstruction_notes?.mandatory_elements_for_recreation || []),
                        ...(parsedStyleDNA?.reconstruction_notes?.mandatory_elements_for_recreation || [])
                    ],
                    sensitivity_factors: [
                        ...(parsedChildDNA?.reconstruction_notes?.sensitivity_factors || []),
                        ...(parsedSecondDNA?.reconstruction_notes?.sensitivity_factors || [])
                    ].filter(Boolean)
                }
            };

            // Inject Occasion / Theme props into objects (not entities — these are not photo-bound)
            if (occasion || extraItems || theme) {
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
                    relationships: [{ type: "integrated naturally", target_object_id: "hero_a" }],
                    material: [
                        sanitizePrompt(theme || ""),
                        sanitizePrompt(occasion || ""),
                        sanitizePrompt(extraItems || ""),
                        isAnchorRelevantToSpread ? sanitizePrompt(visualAnchor) : ""
                    ].filter(Boolean).join('. ')
                } as any);
            }

            // Inject Scene Props
            if (spread.sceneProps && Array.isArray(spread.sceneProps)) {
                spread.sceneProps.forEach((prop, index) => {
                    const rawDesc = prop.physical_description || '';
                    const isDescriptionAdequate = rawDesc.trim().length >= 80;
                    const finalDesc = isDescriptionAdequate
                        ? rawDesc
                        : `${prop.name || 'Object'} — ${rawDesc.trim() || 'present in scene'}. Draw this object with detail matching the style context.`;

                    const maskedDesc = finalDesc
                        .replace(/\[Hero 1\]/gi, '[[HERO_A]]')
                        .replace(/\[Hero 2\]/gi, secondToken)
                        .replace(/\[IMAGE 1\]/gi, '[[HERO_A]]')
                        .replace(/\[IMAGE 2\]/gi, secondToken);

                    promptJson.objects.push({
                        id: `obj_scene_prop_${index}`,
                        label: prop.name || "Story Object",
                        category: "Story Prop",
                        location: { relative_position: "Integrated accurately into the scene context" },
                        material: maskedDesc,
                        reconstruction_notes: [
                            "Must perfectly match physical description above.",
                            "Do NOT invent or substitute the object type or colors.",
                            "Draw exactly what is described — count, size, and layout."
                        ]
                    } as any);
                });
            }

            // Serialize the prompt JSON
            const stringifiedSchema = JSON.stringify(promptJson, null, 2);

            // Build double-bound preamble
            let heroPreamble = `**PHOTO-BOUND TOKENS:**\n- [[HERO_A]] → Attached Image 1 (inlineData[0]). This token IS that specific child. Derive ALL appearance strictly from this photo. DO NOT apply name-based ethnic defaults. Replicate face, hair, skin tone, and proportions exactly as seen in the photo.`;

            if (isDualHeroPerson) {
                heroPreamble += `\n- ${secondToken} → Attached Image 2 (inlineData[1]). Same strict rules apply as [[HERO_A]]. Match the second photo exactly.`;
            } else if (isSingleHeroItem) {
                heroPreamble += `\n- ${secondToken} → Attached Image 2 (inlineData[1]). ${secondToken} IS this specific object. Match its exact shape, style, and material.`;
            }

            const imagePrompt = `${heroPreamble}

${sceneDynamics}

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
                outputs: { promptCount: prompts.length, method: 'Vision Blueprint V2 — Entities + Emotion + Double-Bound Tokens' },
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
