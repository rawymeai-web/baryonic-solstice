import { ai, withRetry } from './modelGateway';
import { Character } from '../../types';
import { ServerLogger } from '@/utils/serverLogger';

const API_KEY = process.env.GEMINI_API_KEY || '';

/**
 * Sanitizes a technical prompt by:
 * 1. Removing non-ASCII characters (e.g. Arabic names like سارة).
 * 2. Stripping character names to rely on generic identifiers (IMAGE 1/2) as requested.
 * 3. Detecting and removing large blocks of base64/binary text (>500 chars with no spaces).
 */
export function sanitizePrompt(text: any, namesToKeep: string[] = []): string {
    if (!text) return "";
    // Coerce non-string values (e.g. accidental JSON objects stored as cover prompts)
    if (typeof text !== 'string') {
        text = typeof text === 'object' ? JSON.stringify(text) : String(text);
    }

    let sanitized = text;

    // 0. Strip legacy validator error blocks that might be cached in the database
    sanitized = sanitized.replace(/\[VALIDATOR_ERRORS:[^\]]+\]/g, '');

    // 1. Remove generic Base64/Binary leakage (strings > 100 chars with no spaces)
    // We look for patterns of long contiguous alphanumeric/slash/plus/equals characters.
    // We replace with empty string to keep the prompt clean for the model.
    sanitized = sanitized.replace(/[A-Za-z0-9+/=]{100,}/g, '');

    // 2. Remove common Data URI prefixes if any leaked
    sanitized = sanitized.replace(/data:image\/[a-zA-Z]*;base64,/g, '');

    // 3. Remove non-ASCII characters (this catches Arabic and other symbols that crash some models)
    sanitized = sanitized.replace(/[^\x00-\x7F]/g, '');
    
    // 3.5. Strip solitary punctuation that gets left behind (e.g. Arabic phrase with an English period leaves a single '.')
    sanitized = sanitized.replace(/^[.,\s]+|[.,\s]+$/g, '');

    // 4. Remove common character names if they exist in the prompt text
    // (User requested sticking to IMAGE 1 / IMAGE 2 to reduce confusion)
    const namesToStrip = [...namesToKeep, "Sarah", "Farah", "سارة", "فرح", "Ameera", "Salma", "Ameera", "Salma"];
    namesToStrip.forEach(name => {
        if (name && name.length > 2) {
            const regex = new RegExp(`\\b${name}\\b`, 'gi');
            sanitized = sanitized.replace(regex, '[SUBJECT]');
        }
    });

    // 5. Cleanup whitespace
    return sanitized.replace(/\s+/g, ' ').trim();
}

export function getFlattenedDescription(description: string | undefined): string {
    if (!description || typeof description !== 'string' || description.trim().length === 0) {
        return "";
    }
    try {
        const parsed = JSON.parse(description);
        const parts: string[] = [];
        
        if (parsed.identity) {
            const id = parsed.identity;
            if (id.face_shape) parts.push(`Face shape: ${id.face_shape}`);
            if (id.eye_shape) parts.push(`Eye shape: ${id.eye_shape}`);
            if (id.eye_color) parts.push(`Eye color: ${id.eye_color}`);
            if (id.eyebrows) parts.push(`Eyebrows: ${id.eyebrows}`);
            if (id.nose) parts.push(`Nose: ${id.nose}`);
            if (id.mouth_lips) parts.push(`Mouth/lips: ${id.mouth_lips}`);
            
            if (id.hair) {
                const h = id.hair;
                const hairDesc: string[] = [];
                if (h.style) hairDesc.push(h.style);
                if (h.color) hairDesc.push(h.color);
                if (h.texture) hairDesc.push(h.texture);
                if (h.length) hairDesc.push(h.length);
                if (hairDesc.length > 0) {
                    parts.push(`Hair: ${hairDesc.join(', ')}`);
                }
            }
            
            if (id.skin) {
                const s = id.skin;
                const skinDesc: string[] = [];
                if (s.tone) skinDesc.push(s.tone);
                if (s.undertone) skinDesc.push(s.undertone);
                if (skinDesc.length > 0) {
                    parts.push(`Skin: ${skinDesc.join(', ')}`);
                }
            }
            
            if (id.stable_identifiers && Array.isArray(id.stable_identifiers) && id.stable_identifiers.length > 0) {
                parts.push(`Stable features: ${id.stable_identifiers.join(', ')}`);
            }
        }
        
        if (parsed.identity_preservation_priorities && Array.isArray(parsed.identity_preservation_priorities) && parsed.identity_preservation_priorities.length > 0) {
            parts.push(`Preserve priorities: ${parsed.identity_preservation_priorities.join(', ')}`);
        }
        
        if (parts.length > 0) {
            return parts.join(", ");
        }
        
        return description;
    } catch (e) {
        return description;
    }
}

// Helper to describe subject (Visual Input)
export async function describeSubject(imageBase64: string): Promise<string> {
    return withRetry(async () => {
        try {
            const model = ai().getGenerativeModel({ 
                model: 'gemini-2.5-flash',
                generationConfig: { responseMimeType: 'application/json' }
            });
            const response = await model.generateContent([
                { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
                { text: `ROLE: Expert character designer and facial-identity analyst.

TASK:
Analyze the provided subject photo and extract only the stable physical identity traits needed to recreate the same child consistently in stylized storybook artwork.

FOCUS:
Face shape, jaw/chin structure, cheek fullness, eye shape, spacing and color, eyebrow shape, nose proportions, mouth/lip proportions, hair color/style/texture, skin tone under neutral lighting, body proportions if visible, and stable identifiers such as glasses or permanent features.

EXCLUDE:
Do not preserve background, lighting artifacts, shadows, camera distortion, temporary facial expression, pose, hand gestures, clothing logos, printed text, temporary accessories, or scene-specific objects.

COLOR RULE:
Estimate normalized base color ranges under neutral lighting. Provide natural-language descriptions of colors (e.g. eye color, hair color, skin tone like "fair", "light olive", "warm tan") as well as approximate hex values for hair, eyes, and skin. Do not sample shadows or highlights as base colors.

OUTPUT:
Return valid JSON only using this structure:
{
  "identity": {
    "face_shape": "",
    "jaw_chin": "",
    "cheeks": "",
    "eye_shape": "",
    "eye_spacing": "",
    "eye_color": "",
    "eyebrows": "",
    "nose": "",
    "mouth_lips": "",
    "ears": "",
    "hair": {
      "color": "",
      "base_color_hex": "",
      "style": "",
      "length": "",
      "texture": "",
      "hairline": ""
    },
    "skin": {
      "tone": "",
      "base_tone_hex": "",
      "undertone": ""
    },
    "body_proportions": "",
    "stable_identifiers": []
  },
  "excluded_photo_noise": {
    "background": "",
    "lighting_artifacts": "",
    "temporary_expression": "",
    "temporary_pose": "",
    "logos_or_text": [],
    "temporary_accessories": []
  },
  "identity_preservation_priorities": []
}
Output ONLY valid JSON. No markdown formatting.` }
            ]);
            
            const rawText = response.response.text().trim();
            // Gemini sometimes wraps JSON in markdown blocks even with responseMimeType, so clean it safely
            let cleaned = rawText;
            if (cleaned.startsWith('\`\`\`json')) cleaned = cleaned.replace(/^\`\`\`json\n/, '').replace(/\n\`\`\`$/, '');
            else if (cleaned.startsWith('\`\`\`')) cleaned = cleaned.replace(/^\`\`\`\n/, '').replace(/\n\`\`\`$/, '');
            
            return JSON.stringify(JSON.parse(cleaned));
        } catch (e) {
            console.error("Describe Subject JSON Payload Failed", e);
            throw e; // Rethrow to let withRetry handle it
        }
    }, 2, 5000, "{}");
}


// Helper to describe inanimate objects, pets, or theme items
export async function describeObjectProp(imageBase64: string): Promise<string> {
    return withRetry(async () => {
        try {
            const model = ai().getGenerativeModel({ 
                model: 'gemini-2.5-flash',
                generationConfig: { responseMimeType: 'application/json' }
            });
            const response = await model.generateContent([
                { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
                { text: `ROLE: Props & Assets Analyst. 
TASK: Analyze the provided photo of an object (or pet/item) and extract its physical identity into a strict JSON object.
FOCUS: Material, shape, color, apparent scale, texture, and distinguishing marks.

MANDATE: Output a valid JSON object following this exact schema structure:
{
  "objects": [{
    "label": "The Object",
    "material": "Describe the main material/substance (e.g. fluffy wool, matte plastic, worn leather)",
    "surface_properties": {
      "texture": "Describe the exact texture, wear and tear, or pattern"
    },
    "color_details": {
      "base_color_hex": "Estimate exact hex color for the main body",
      "secondary_colors": ["Estimate hex for secondary details"]
    }
  }],
  "reconstruction_notes": {
    "mandatory_elements_for_recreation": ["List 4-5 hyper-specific physical traits (shape, labels, unique structural quirks) that MUST be preserved"],
    "sensitivity_factors": ["List physical features that, if altered, ruin the likeness of this specific object or item"]
  }
}
Output ONLY valid JSON. No markdown formatting.` }
            ]);
            
            const rawText = response.response.text().trim();
            // Gemini sometimes wraps JSON in markdown blocks even with responseMimeType, so clean it safely
            let cleaned = rawText;
            if (cleaned.startsWith('\`\`\`json')) cleaned = cleaned.replace(/^\`\`\`json\n/, '').replace(/\n\`\`\`$/, '');
            else if (cleaned.startsWith('\`\`\`')) cleaned = cleaned.replace(/^\`\`\`\n/, '').replace(/\n\`\`\`$/, '');
            
            return JSON.stringify(JSON.parse(cleaned));
        } catch (e) {
            console.error("Describe Object JSON Payload Failed", e);
            throw e; // Rethrow to let withRetry handle it
        }
    }, 2, 5000, "{}");
}


export async function generateThemeStylePreview(
    mainCharacter: Character,
    secondCharacter: Character | undefined,
    theme: string,
    style: string,
    age: string,
    pose: 'front' | 'three_quarter' | 'full_body' = 'front',
    seed?: number,
    occasion?: string,
    customGoal?: string
): Promise<{ imageBase64: string; prompt: string; styleUsed: string }> {
    return withRetry(async () => {
        // DEBUG: Log incoming parameters
        console.log("=== GENERATE THEME STYLE PREVIEW DEBUG ===");
        console.log("Theme:", theme);
        console.log("Style:", style);
        console.log("Age:", age);
        console.log("Occasion:", occasion);
        console.log("Custom Goal:", customGoal);
        console.log("Seed:", seed);
        console.log("Main Character Image Available:", !!mainCharacter.imageBases64?.[0]);
        console.log("Second Character Available:", !!secondCharacter);

        // Hardcoded guardrails from the "Bible"
        const masterGuardrails = "MANDATE: Output safe, G-rated content only. No nudity, violence, or gore.";

        // Determine Style Family for specific identity rules
        const is3D = /\b(3d|pixar|unreal|octane|clay|realistic)\b/i.test(style);
        const is2D = /\b(2d|flat|vector|cel|minimal)\b/i.test(style);
        const isPainterly = /\b(watercolor|gouache|oil|painterly|sketch)\b/i.test(style);

        let identityRule = "Preserve a clearly recognizable likeness of the specific child while faithfully adapting the face into the selected art style. Do not invent a generic child.";
        if (is3D) {
            identityRule = "Preserve a strong facial resemblance and natural proportions. The character should look like a high-quality stylized 3D version of the child in Image 1, capturing their unique essence while adhering to the 3D aesthetic.";
        } else if (is2D) {
            identityRule = "Preserve identity through silhouette, hair shape, and key facial proportions. Use simplified shapes without losing the child's recognizable likeness. Ensure the character remains distinct and identifiable as the child in Image 1.";
        } else if (isPainterly) {
            identityRule = "Preserve recognizable identity cues while simplifying details into artistic brushwork. Maintain the child's unique facial proportions and hairline accurately within the painterly style.";
        }

        let poseInstruction = "";
        if (pose === 'front') {
            poseInstruction = "Create a neutral, dead-on front-facing upper body portrait. The face should look directly at the viewer with a calm neutral expression. Keep the head level, both eyes visible, and facial features symmetrical enough to serve as a downstream identity reference. Ensure a wide enough medium-shot framing so that the entire head, full hairstyle, and all hair details (including braids, pigtails, locks) are fully contained within the image without any cropping at the top, bottom, or sides. Do not crop the hair.";
        } else if (pose === 'three_quarter') {
            poseInstruction = "Create a 3/4 face view upper body portrait. The character should be turned slightly away from the camera while still clearly showing their facial identity. Make sure their shoulders, chest, and full hair details are visible in the frame.";
        } else if (pose === 'full_body') {
            poseInstruction = "Create a full-body standing reference shot. Show the character's height, clothing style, and general proportions in the selected art style. Simple, clean background.";
        }

        // Determine age instructions for child likeness based on developmental stages
        const ageNum = parseInt(age, 10);
        let ageInstructions = "";
        if (!isNaN(ageNum)) {
            if (ageNum >= 1 && ageNum <= 3) {
                // Toddler/Baby Stage (e.g., age 1)
                ageInstructions = `\n\n**AGE PORTRAYAL:**\nThe character must be depicted as a ${age}-year-old toddler. Ensure the face has soft, chubby baby-like cheeks, a tiny rounded nose, large innocent baby eyes, and a very young toddler's face structure. Avoid rendering older child or adult facial structures.`;
            } else if (ageNum >= 4 && ageNum <= 8) {
                // Young Kid Stage (e.g., ages 5, 7)
                ageInstructions = `\n\n**AGE PORTRAYAL:**\nThe character must be depicted as a ${age}-year-old child. Ensure the face has soft, rounded childish facial features, large expressive curious eyes, and a friendly, youthful child's face structure. Avoid rendering mature, sharp, or chiseled adult facial structures.`;
            } else if (ageNum >= 9 && ageNum <= 12) {
                // Pre-teen Stage (e.g., age 10)
                ageInstructions = `\n\n**AGE PORTRAYAL:**
The character must be depicted as a ${age}-year-old child. Ensure they have soft, rounded childish facial features, a soft jawline, and youthful proportions. Strictly avoid any teenager, adolescent, or mature facial structures. Absolutely no makeup, mature expressions, or defined adult cheekbones/jawline. They must look like a young pre-pubescent child/schoolchild, not a teenager or young adult.`;
            } else {
                // Teenager/Adult Stage (ages 13+)
                ageInstructions = `\n\n**AGE PORTRAYAL:**\nThe character must be depicted as a ${age}-year-old. Ensure facial features represent a ${age}-year-old accurately.`;
            }
        }
        const descText = getFlattenedDescription(mainCharacter.description);

        const prompt = `**TASK:** Create a stylized character DNA portrait of the subject in Image 1 using the selected art style.

**PURPOSE:** This image is the primary visual reference for character identity, style treatment, color palette, and facial proportion consistency across all story spreads.

**IDENTITY ANCHOR:**
The facial features in Image 1 are the ONLY source of truth. Preserve the unique eye shape, nose structure, mouth curvature, and face silhouette exactly. Do not shift to a generic "Pixar" or "Cartoon" face. The output character must look like the SAME child as in the photo, just rendered in the requested medium.${ageInstructions}${descText ? '\n- Specific physical traits to preserve: ' + descText : ""}
- **HAIRSTYLE & DETAILS:** You must preserve the hairstyle, color, length, and texture exactly as described (e.g. pigtails, braids, curls, etc.). The hairstyle must be clearly visible, fully rendered, and styled exactly like the subject's hair. Do not hide or simplify the hair details; render the hairstyle naturally and cleanly according to the reference.

**STYLE ADAPTATION:**
${identityRule}
Apply the selected art style ONLY to rendering technique, line treatment, texture, shading, and lighting. Keep the child’s identity recognizable within that style.

**PHOTO NOISE REMOVAL:**
Do not copy the original photo background, room lighting, shadows, camera distortion, logos, text, hand gestures, or temporary accessories. Render the subject in a clean, professional character-design environment.


**POSE:**
${poseInstruction}

**SCENE CONTEXT:**
- **Setting:** ${theme || "Neutral"} background.
- **Shot:** ${pose === 'full_body' ? 'Full Body' : (pose === 'front' || pose === 'three_quarter' ? 'Upper Body Shot (Head, Shoulders, and Chest)' : 'Medium-Close Up (Head & Shoulders)')}.
${occasion ? `- **Special Occasion:** Incorporate subtle festive elements related to "${occasion}" in the background or character accessories.` : ""}
${customGoal ? `- **Custom Theme Goal:** Match the vibe of "${customGoal}".` : ""}

**TECHNICAL MANDATES:**
- 1:1 Aspect Ratio.
- No text, no frames. No extra characters. No props.
- Perfect application of the '${style}' aesthetic.
${masterGuardrails}`;

        const sanitizedPrompt = sanitizePrompt(prompt);

        const contents: any[] = [
            { inlineData: { mimeType: 'image/jpeg', data: mainCharacter.imageBases64[0] } },
            { text: sanitizedPrompt }
        ];

        if (secondCharacter && secondCharacter.imageBases64 && secondCharacter.imageBases64[0]) {
            contents.push({ inlineData: { mimeType: 'image/jpeg', data: secondCharacter.imageBases64[0] } });
            contents[1].text += `\n**SECONDARY SUBJECT:** See IMAGE 2. Ensure they are featured alongside IMAGE 1 in the same style while preserving their unique face and identity from the photo.`;
            console.log("DEBUG: Secondary character image added to contents");
        }

        // DEBUG: Log contents structure (without full base64)
        console.log("=== CONTENTS STRUCTURE ===");
        console.log("Number of content items:", contents.length);
        contents.forEach((item, idx) => {
            if (item.inlineData) {
                console.log(`Item ${idx}: Image (${item.inlineData.mimeType}, ${item.inlineData.data.length} chars)`);
            } else if (item.text) {
                console.log(`Item ${idx}: Text (${item.text.length} chars)`);
            }
        });

        try {
            console.log("=== ATTEMPTING PRIMARY MODEL (VERIFIED CONFIG) ===");
            console.log("Model: gemini-2.5-flash-image");
            console.log("Contents: 1 image + 1 text prompt");

            // Using the Vision-Capable Image Generation Model
            const model = ai().getGenerativeModel({
                model: 'gemini-2.5-flash-image'
            });

            console.log("Calling model.generateContent...");
            const response = await model.generateContent(contents);
            console.log("Response received!");

            let b64 = "";
            if (response.response.candidates && response.response.candidates[0].content.parts) {
                for (const part of response.response.candidates[0].content.parts) {
                    if (part.inlineData) b64 = part.inlineData.data;
                }
            }

            console.log("Extracted image data length:", b64.length);
            if (!b64) throw new Error("Primary model returned no data");

            console.log("=== PRIMARY MODEL SUCCESS ===");
            return { imageBase64: b64, prompt, styleUsed: style };

        } catch (error: any) {
            console.error("=== PRIMARY MODEL FAILED ===");
            console.error("Error name:", error.name);
            console.error("Error message:", error.message);
            // NO FALLBACK - Throwing error directly to expose issues
            throw error;
        }
    });
}

// UPGRADED: Hybrid Vision Strategy for Pages (Ported from Frontend)
let lastProCallTimestamp = 0;

export async function generateMethod4Image(
    prompt: string,
    stylePrompt: string,
    referenceBase64OrSet: string | string[],
    characterDescription: string,
    age: string,
    seed?: number,
    secondReferenceBase64OrSet?: string | string[],
    secondCharacterDescription?: string
): Promise<{ imageBase64: string; fullPrompt: string; seedPrompt: string; modelUsed: string }> {
    return withRetry(async () => {
        // [HEAL] Sanitize polluted stylePrompt that contains DNA character portrait tasks
        let cleanStylePrompt = stylePrompt;
        if (stylePrompt && stylePrompt.includes('**TASK:**')) {
            console.log("[HEAL] Detected polluted stylePrompt containing DNA task. Sanitizing...");
            const match = stylePrompt.match(/Perfect\s+application\s+of\s+the\s+'([^']+)'\s+aesthetic/i);
            if (match && match[1]) {
                cleanStylePrompt = match[1];
                console.log("[HEAL] Successfully extracted original style aesthetic:", cleanStylePrompt);
            } else {
                cleanStylePrompt = "high quality painterly children's book illustration style";
                console.log("[HEAL] Fallback to default style aesthetic.");
            }
        }

        // 1. Resolve Hero A references
        const heroASet = Array.isArray(referenceBase64OrSet) ? referenceBase64OrSet : [referenceBase64OrSet];
        const heroAImages: string[] = [];
        for (const item of heroASet) {
            if (item && item.startsWith('http')) {
                const response = await fetch(item);
                const arrayBuffer = await response.arrayBuffer();
                heroAImages.push(Buffer.from(arrayBuffer).toString('base64'));
            } else if (item) {
                heroAImages.push(item);
            }
        }

        // 2. Resolve Hero B references
        const heroBSet = Array.isArray(secondReferenceBase64OrSet) ? secondReferenceBase64OrSet : (secondReferenceBase64OrSet ? [secondReferenceBase64OrSet] : []);
        const heroBImages: string[] = [];
        for (const item of heroBSet) {
            if (item && item.startsWith('http')) {
                const response = await fetch(item);
                const arrayBuffer = await response.arrayBuffer();
                heroBImages.push(Buffer.from(arrayBuffer).toString('base64'));
            } else if (item) {
                heroBImages.push(item);
            }
        }

        // 3. Construct Multi-Modal Input
        const contents: any[] = [];
        const stripPrefix = (str: string) => str.replace(/^data:image\/\w+;base64,/, '');
        
        const getMimeType = (b64: string): string => {
            const clean = stripPrefix(b64);
            if (clean.startsWith('/9j/')) return 'image/jpeg';
            if (clean.startsWith('iVBORw')) return 'image/png';
            if (clean.startsWith('UklGR')) return 'image/webp';
            return 'image/jpeg'; // Fallback
        };

        heroAImages.forEach((b64, idx) => {
            contents.push({ text: `[IMAGE 1 - [[HERO_1]] EXACT LIKENESS REFERENCE]:` });
            contents.push({ inlineData: { mimeType: getMimeType(b64), data: stripPrefix(b64) } });
        });
        heroBImages.forEach((b64, idx) => {
            contents.push({ text: `[IMAGE 2 - [[HERO_2]] EXACT LIKENESS REFERENCE]:` });
            contents.push({ inlineData: { mimeType: getMimeType(b64), data: stripPrefix(b64) } });
        });
        
        let unifiedPromptText = sanitizePrompt(prompt);

        // 4. Input Consistency Validation (Anti-Hallucination Guard)
        const imageRefs = unifiedPromptText.match(/Image\s+(\d+)/gi);
        if (imageRefs) {
            let maxImageRef = 0;
            imageRefs.forEach(ref => {
                const match = ref.match(/\d+/);
                if (match) {
                    const num = parseInt(match[0], 10);
                    if (num > maxImageRef) maxImageRef = num;
                }
            });
            
            if (maxImageRef > contents.length) {
                const errorMsg = `[FATAL BINDING ERROR] The generated prompt explicitly references up to "Image ${maxImageRef}", but only ${contents.length} images were passed in the payload array. This usually happens when a Dual-Hero prompt is used for a Single-Hero order. Aborting to prevent identity drift.`;
                console.error(errorMsg);
                throw new Error(errorMsg);
            }
        }

        // DNA-ONLY LEGEND (v6.0): Sequential numbering.
        // This MUST match the prompt body exactly — no contradiction allowed.
        const legendLines: string[] = ['CHARACTER IDENTITY REFERENCES:'];
        let currentIdx = 1;

        heroAImages.forEach((_, i) => {
            legendLines.push(`- Image ${currentIdx}: [[HERO_1]] — approved character reference.`);
            currentIdx += 1;
        });

        heroBImages.forEach((_, i) => {
            legendLines.push(`- Image ${currentIdx}: [[HERO_2]] — approved character reference.`);
            currentIdx += 1;
        });

        // Transparent WYSIWYG Mode: Use the prompt exactly as passed.
        let finalPromptText = unifiedPromptText;
        
        // Inject Age and Description Guardrails
        let ageInstructions = "";
        const ageNum = parseInt(age, 10);
        if (!isNaN(ageNum)) {
            if (ageNum >= 1 && ageNum <= 3) {
                ageInstructions = `[[HERO_1]] must be depicted as a ${age}-year-old toddler. Ensure they have chubby baby-like cheeks, a tiny rounded nose, large innocent baby eyes, and a very young toddler face structure. Avoid rendering older child or adult facial structures.`;
            } else if (ageNum >= 4 && ageNum <= 8) {
                ageInstructions = `[[HERO_1]] must be depicted as a ${age}-year-old young child. Ensure they have soft, rounded childish facial features, large expressive curious eyes, and a youthful child face structure. Avoid rendering mature, sharp, or chiseled adult facial structures.`;
            } else if (ageNum >= 9 && ageNum <= 12) {
                ageInstructions = `[[HERO_1]] must be depicted as a ${age}-year-old schoolchild/older child. Ensure they have the facial proportions and body structure of a typical ${age}-year-old pre-teen child. They should have a slightly more defined face shape than a toddler, but still look like a young pre-pubescent schoolchild (not a teenager or young adult). Strictly avoid toddler-like features (no baby-like chubby cheeks or baby proportions) and avoid adult features (no makeup or adult cheekbones).`;
            } else {
                ageInstructions = `[[HERO_1]] must be depicted as a ${age}-year-old.`;
            }
        }

        let skinToneStr = "";
        let eyeColorStr = "";
        let hairColorStr = "";
        try {
            const parsed = JSON.parse(characterDescription);
            if (parsed.identity) {
                if (parsed.identity.skin?.tone) {
                    skinToneStr = parsed.identity.skin.tone;
                }
                if (parsed.identity.eye_color) {
                    eyeColorStr = parsed.identity.eye_color;
                }
                if (parsed.identity.hair?.color) {
                    hairColorStr = parsed.identity.hair.color;
                }
            }
        } catch (e) {
            // Not JSON or missing fields
        }

        // Regex fallbacks for string representation
        if (!skinToneStr && characterDescription) {
            const match = characterDescription.match(/Skin tone \(([^)]+)\)/i);
            if (match) skinToneStr = match[1];
        }
        if (!eyeColorStr && characterDescription) {
            const match = characterDescription.match(/eye color \(([^)]+)\)/i) || characterDescription.match(/"eye_color":\s*"([^"]+)"/i);
            if (match) eyeColorStr = match[1];
        }

        let ageAndDescBlock = `\n\n**CHARACTER IDENTITY & LIKENESS:**
- **[[HERO_1]] IDENTITY:** Replicate the exact facial features, hairstyle, and clothing of [[HERO_1]] shown in their reference image (Image 1). The character must look identical to the person in Image 1. Do not alter their recognizable features.
- [[HERO_1]] is a ${age}-year-old child. ${ageInstructions}
- **[[HERO_1]] EXPRESSION:** Keep their unique face shape and features recognizable from Image 1 when showing different expressions.
- **[[HERO_1]] LIGHTING:** Keep their face and features clean, clear, and recognizable in all environments and lighting.`;

        if (secondReferenceBase64OrSet) {
            ageAndDescBlock += `\n- **[[HERO_2]] IDENTITY:** Replicate the exact facial features, hairstyle, and clothing of [[HERO_2]] shown in their reference image (Image 2). The character must look identical to the person in Image 2.`;
        }

        finalPromptText = finalPromptText + ageAndDescBlock;

        if (cleanStylePrompt) {
            finalPromptText += `\n\n**ART STYLE REQUIREMENT:**
- **STYLE:** Render this illustration in the following style: ${cleanStylePrompt}. Make sure the colors, lighting, rendering technique, brushwork, and background style align perfectly with this description.`;
        }
 
        contents.push({
            text: finalPromptText
        });


        // Coerce to string to guard against JSON objects accidentally passed from DB
        const toSafeStr = (v: any): string => {
            if (typeof v === 'string') return v;
            if (v === null || v === undefined) return '';
            return typeof v === 'object' ? JSON.stringify(v) : String(v);
        };
        console.log(`Generating Page via Hybrid Vision Logic (Backend)...`);
        console.log(`- STYLE PROMPT: ${toSafeStr(cleanStylePrompt).substring(0, 100)}...`);
        console.log(`- HERO A IMAGES SENT: ${heroAImages.length} (Expected: 1 for photo, 1 for DNA style)`);
        console.log(`- HERO B IMAGES SENT: ${heroBImages.length} (Expected: 1 for photo, 1 for DNA style)`);
        console.log(`- SCENE PROMPT (Length): ${unifiedPromptText.length} characters`);

        try {
            const fs = require('fs');
            const debugPayload = {
                timestamp: new Date().toISOString(),
                totalImages: contents.length - 1, // minus text part
                heroAImages: heroAImages.length,
                heroBImages: heroBImages.length,
                promptText: unifiedPromptText
            };
            
            ServerLogger.log('GEMINI_API_CALL_PAYLOAD', debugPayload);
            
            // ── VISUAL CONTACT SHEET ──────────────────────────────────────────────
            // Opens in browser. Shows EXACTLY what Gemini receives, in slot order.
            // Check this file after any generation to verify image binding.
            // File: /last_gemini_contact_sheet.html
            // ─────────────────────────────────────────────────────────────────────
            try {
                const imageSlots = [
                    ...heroAImages.map((b64, i) => ({
                        slot: i + 1,
                        label: `[[HERO_1]] — Slot ${i + 1} (DNA reference, sole identity authority)`,
                        b64,
                    })),
                    ...heroBImages.map((b64, i) => ({
                        slot: heroAImages.length + i + 1,
                        label: `[[HERO_2]] — Slot ${heroAImages.length + i + 1} (DNA reference, sole identity authority)`,
                        b64,
                    })),
                ];

                const cards = imageSlots.map(slot => `
                    <div style="border:2px solid #333;border-radius:12px;padding:12px;background:#1a1a2e;min-width:220px">
                        <div style="font-size:11px;font-weight:900;color:#00ff88;letter-spacing:2px;margin-bottom:6px;text-transform:uppercase">
                            IMAGE ${slot.slot} — SENT TO GEMINI
                        </div>
                        <img src="data:image/jpeg;base64,${slot.b64.substring(0, 200000)}"
                            style="width:200px;height:200px;object-fit:cover;border-radius:8px;border:2px solid #00ff88;display:block;margin-bottom:8px"
                            onerror="this.style.background='#333';this.alt='[image too large to preview]'"
                        />
                        <div style="font-size:10px;color:#aaa;line-height:1.4">${slot.label}</div>
                        <div style="font-size:9px;color:#666;margin-top:4px">base64 length: ${slot.b64.length} chars</div>
                    </div>
                `).join('');

                const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<title>Gemini Payload Contact Sheet — ${new Date().toISOString()}</title>
<style>
  body { background:#0d0d1a; color:#eee; font-family:monospace; margin:0; padding:24px; }
  h1 { color:#00ff88; font-size:14px; letter-spacing:3px; text-transform:uppercase; margin-bottom:4px; }
  .meta { font-size:11px; color:#666; margin-bottom:20px; }
  .slots { display:flex; gap:16px; flex-wrap:wrap; margin-bottom:32px; }
  .prompt-box { background:#111;border:1px solid #333;border-radius:8px;padding:16px;white-space:pre-wrap;font-size:11px;line-height:1.6;color:#ccc;max-height:600px;overflow-y:auto; }
  .section-title { font-size:11px; font-weight:900; color:#ff9900; letter-spacing:2px; text-transform:uppercase; margin:20px 0 8px; }
  .verdict { background:#002200;border:1px solid #00ff88;border-radius:8px;padding:12px;font-size:11px;line-height:1.7;color:#00ff88;margin-bottom:20px; }
</style>
</head>
<body>
<h1>🧬 Gemini Payload Contact Sheet</h1>
<div class="meta">Generated: ${new Date().toISOString()} &nbsp;|&nbsp; Total images: ${imageSlots.length} &nbsp;|&nbsp; Pipeline: v6.0-dna-only</div>

<div class="verdict">
✅ Binding check: ${imageSlots.length} image(s) attached<br>
${imageSlots.map(s => '→ Image ' + s.slot + ' maps to: ' + s.label).join('<br>')}
</div>

<div class="section-title">Images Sent (in slot order — must match prompt references)</div>
<div class="slots">${cards}</div>

<div class="section-title">Full Prompt Text Sent to Gemini (${unifiedPromptText.length} chars)</div>
<div class="prompt-box">${finalPromptText.replace(/</g,'&lt;').replace(/>/g,'&gt;')}</div>
</body>
</html>`;

                fs.writeFileSync('last_gemini_contact_sheet.html', html, 'utf8');
                fs.writeFileSync('last_gemini_payload_debug.json', JSON.stringify(debugPayload, null, 2));
                console.log(`[DEBUG] Contact sheet saved → last_gemini_contact_sheet.html (${imageSlots.length} image slots)`);
            } catch (e) {
                console.error("Failed to write contact sheet", e);
            }

        } catch (e) {
            console.error("Failed to write debug payload", e);
        }

        // 2. Call Gemini Multimodal Image Model (Nano Banana Pro)
        const modelName = process.env.NEXT_PUBLIC_TARGET_MODEL || 'gemini-3-pro-image-preview';
        const isPro = modelName.includes('pro');
        let finalModelName = modelName;
        let b64 = "";

        if (isPro) {
            const elapsed = Date.now() - lastProCallTimestamp;
            if (elapsed < 30000) {
                const waitTime = 30000 - elapsed;
                console.log(`[COOLDOWN] Waiting ${(waitTime / 1000).toFixed(1)}s before calling Gemini 3 Pro to prevent 429...`);
                await new Promise(resolve => setTimeout(resolve, waitTime));
            }
            lastProCallTimestamp = Date.now();
        }

        try {
            console.log(`Calling Gemini Multimodal Image Model: ${finalModelName}...`);
            const model = ai().getGenerativeModel({ model: finalModelName });
            const response = await model.generateContent(contents);

            // Extract Image
            const candidates = response.response.candidates || [];
            if (candidates.length > 0 && candidates[0].content?.parts) {
                for (const part of candidates[0].content.parts) {
                    if (part.inlineData?.data) {
                        b64 = part.inlineData.data;
                        break;
                    }
                }
            }

            if (!b64) {
                throw new Error(`Vision Model Error: No image data returned. (Model: ${finalModelName})`);
            }
        } catch (error: any) {
            if (isPro) {
                console.warn(`[FALLBACK] Primary model ${modelName} failed. Message: ${error.message || error}. SILENTLY FALLING BACK TO NANO BANANA 2 (gemini-3-flash-image-preview)...`);
                finalModelName = 'gemini-3-flash-image-preview';
                
                try {
                    console.log(`Calling Fallback Gemini Multimodal Image Model: ${finalModelName}...`);
                    const model = ai().getGenerativeModel({ model: finalModelName });
                    const response = await model.generateContent(contents);

                    // Extract Image
                    const candidates = response.response.candidates || [];
                    if (candidates.length > 0 && candidates[0].content?.parts) {
                        for (const part of candidates[0].content.parts) {
                            if (part.inlineData?.data) {
                                b64 = part.inlineData.data;
                                break;
                            }
                        }
                    }

                    if (!b64) {
                        throw new Error(`Vision Model Error: No image data returned on fallback model: ${finalModelName}`);
                    }
                } catch (fallbackError: any) {
                    console.error(`[FALLBACK FAILED] Fallback model ${finalModelName} also failed: ${fallbackError.message || fallbackError}`);
                    throw fallbackError;
                }
            } else {
                throw error;
            }
        }

        return { 
            imageBase64: b64, 
            fullPrompt: finalPromptText, 
            seedPrompt: unifiedPromptText,
            modelUsed: finalModelName
        };
    });
}

/**
 * Generates a technical style description for a given image to maintain 
 * style consistency across different generations using JSON extraction.
 */
export async function generateTechnicalStyleGuide(imageBase64: string, stylePrompt: string): Promise<string> {
    return withRetry(async () => {
        try {
            const model = ai().getGenerativeModel({ 
                model: 'gemini-2.5-flash',
                generationConfig: { responseMimeType: 'application/json' }
            });
            const prompt = `**TASK:** Analyze the attached image and extract its "Technical Style Guide" into a strict JSON architecture.
        
**OBJECTIVE:** Extract the precise lighting, brushstrokes, color temperature, and textural rendering logic of this specific image. 
**CONTEXT:** This image uses the core style: "${stylePrompt}". Define how this style is unique in THIS specific rendering.

MANDATE: Output a valid JSON object following this exact schema structure:
{
  "global_context": {
    "lighting": {
      "source": "e.g., Soft directional, Diffused, Ambient",
      "direction": "e.g., Side-lit, Top-down, Backlit",
      "quality": "e.g., Soft, Hard, Diffused",
      "color_temperature": "e.g., Warm, Cool, Neutral, Golden"
    },
    "color_palette": {
      "accent_colors": ["List 2-3 prominent mood colors"]
    }
  },
  "background_details": {
    "texture": "Describe the rendering style (e.g. Painterly brushstrokes, Flat vector, Watercolor wash)"
  }
}
Output ONLY valid JSON. No markdown formatting.`;

            const response = await model.generateContent([
                { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
                { text: prompt }
            ]);

            const rawText = response.response.text().trim();
            let cleaned = rawText;
            if (cleaned.startsWith('\`\`\`json')) cleaned = cleaned.replace(/^\`\`\`json\n/, '').replace(/\n\`\`\`$/, '');
            else if (cleaned.startsWith('\`\`\`')) cleaned = cleaned.replace(/^\`\`\`\n/, '').replace(/\n\`\`\`$/, '');
            
            return JSON.stringify(JSON.parse(cleaned));
        } catch (e) {
            console.error("Style Guide JSON Generation Failed", e);
            throw e;
        }
    }, 2, 3000, "{}");
}

/**
 * Transforms an object/prop strictly into the target art style to prevent 
 * photorealistic bleed when used alongside characters.
 */
export async function generateObjectStylePreview(
    objectBase64: string,
    style: string,
    description: string
): Promise<{ imageBase64: string }> {
    return withRetry(async () => {
        console.log("=== GENERATE OBJECT STYLE PREVIEW ===");
        
        const contents: any[] = [
            { inlineData: { mimeType: 'image/jpeg', data: objectBase64 } },
            { text: `**TASK:** Transform the reference Object (Image 1) into the selected Art Style.
            
**REFERENCE INPUTS:**
- **Source:** See attached IMAGE 1 (The Object).
- **Style:** ${style}
- **Description:** ${description || "An object"}

**STRICT IDENTITY AND STYLE LOCK:**
- **Likeness:** The output MUST look like the specific object in Image 1.
- **Retain Structural Geometry:** You MUST perfectly preserve the shape, unique details, and material properties.
- **Change Only:** The rendering style (brushstrokes, lighting softness, shading logic). The geometry of the object MUST NOT CHANGE.
- **Isolation:** Completely isolate it on a plain white or very simple, deeply blurred background. Do NOT add humans or external scenes.

**TECHNICAL MANDATES:**
- 1:1 Aspect Ratio.
- No text, no frames.
- Perfect application of the '${style}' aesthetic.` }
        ];

        try {
            const model = ai().getGenerativeModel({
                model: 'gemini-2.5-flash-image'
            });

            console.log("Calling model.generateContent for Object Styling...");
            const response = await model.generateContent(contents);

            let b64 = "";
            if (response.response.candidates && response.response.candidates[0].content.parts) {
                for (const part of response.response.candidates[0].content.parts) {
                    if (part.inlineData) b64 = part.inlineData.data;
                }
            }

            if (!b64) throw new Error("Object styling generation failed (No data returned from model)");

            return { imageBase64: b64 };
        } catch (e: any) {
            console.error("=== OBJECT STYLE GENERATION ERROR ===", e.status, e.message);
            throw e;
        }
    });
}
