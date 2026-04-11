
import { ai, withRetry } from './modelGateway';
import { Character } from '../../types';

const API_KEY = process.env.GEMINI_API_KEY || '';

/**
 * Sanitizes a technical prompt by:
 * 1. Removing non-ASCII characters (e.g. Arabic names like سارة).
 * 2. Stripping character names to rely on generic identifiers (IMAGE 1/2) as requested.
 * 3. Detecting and removing large blocks of base64/binary text (>500 chars with no spaces).
 */
export function sanitizePrompt(text: string, namesToKeep: string[] = []): string {
    if (!text) return "";

    let sanitized = text;

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

// Helper to describe subject (Visual Input)
export async function describeSubject(imageBase64: string): Promise<string> {
    return withRetry(async () => {
        try {
            const model = ai().getGenerativeModel({ 
                model: 'gemini-2.0-flash',
                generationConfig: { responseMimeType: 'application/json' }
            });
            const response = await model.generateContent([
                { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
                { text: `ROLE: World-class character designer & architectural vision analyzer. 
TASK: Analyze the provided photo of the subject and extract their physical identity into a strict JSON object. 
FOCUS: Hair color/style, eye color, face shape, skin tone, unique identifiers, and material properties.

MANDATE: Output a valid JSON object following this exact schema structure:
{
  "objects": [{
    "label": "Main Character",
    "material": "Describe the clothing material if visible (e.g. Cotton, Matte)",
    "surface_properties": {
      "texture": "Describe hair texture and skin texture"
    },
    "color_details": {
      "base_color_hex": "Estimate exact hex color for hair",
      "secondary_colors": ["Estimate hex for eyes", "Estimate hex for skin tone"]
    }
  }],
  "reconstruction_notes": {
    "mandatory_elements_for_recreation": ["List 4-5 hyper-specific physical traits that MUST be preserved"],
    "sensitivity_factors": ["List physical features that, if altered, ruin the likeness"]
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
            console.error("Describe Subject JSON Payload Failed", e);
            throw e; // Rethrow to let withRetry handle it
        }
    }, 2, 5000, "{}");
}

// Fallback Model List
const MODEL_FALLBACKS = [
    "imagen-4.0-fast-generate-001",
    "imagen-4.0-generate-001",
    "imagen-3.0-generate-001"
];

// Helper to describe inanimate objects, pets, or theme items
export async function describeObjectProp(imageBase64: string): Promise<string> {
    return withRetry(async () => {
        try {
            const model = ai().getGenerativeModel({ 
                model: 'gemini-2.0-flash',
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

export async function generateImagenImage(
    prompt: string,
    aspectRatio: "1:1" | "16:9" | "9:16" = "1:1",
    sampleCount: number = 1
): Promise<{ imageBase64: string }> {
    return withRetry(async () => {
        const apiVersion = "v1beta";
        if (!API_KEY) throw new Error("Missing API Key");

        const baseUrl = 'https://generativelanguage.googleapis.com';

        let lastError: any = null;

        for (const model of MODEL_FALLBACKS) {
            const url = `${baseUrl}/${apiVersion}/models/${model}:predict?key=${API_KEY}`;
            const payload = {
                instances: [{ prompt: prompt }],
                parameters: { sampleCount, aspectRatio }
            };

            try {
                const response = await fetch(url, {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify(payload)
                });

                if (response.ok) {
                    const data = await response.json();
                    let b64 = "";
                    if (data.predictions && data.predictions[0] && data.predictions[0].bytesBase64Encoded) {
                        b64 = data.predictions[0].bytesBase64Encoded;
                    } else if (data.image && data.image.imageBytes) {
                        b64 = data.image.imageBytes;
                    } else {
                        throw new Error("Invalid Response Structure");
                    }
                    return { imageBase64: b64 };
                }
            } catch (e: any) {
                lastError = e;
            }
        }
        throw lastError || new Error("All image models failed.");
    });
}

export async function generateThemeStylePreview(
    mainCharacter: Character,
    secondCharacter: Character | undefined,
    theme: string,
    style: string,
    age: string,
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

        // EXACT VERCEL PRODUCTION PROMPT (NO MODIFICATIONS)
        const prompt = `**TASK:** Transform the reference Subject (Image 1) into the selected Art Style.
        
**REFERENCE INPUTS:**
- **Source:** See attached IMAGE 1 (The Child).
- **Style:** ${style}

**STRICT IDENTITY PRESERVATION:**
- **Likeness is Critical:** The output MUST look like the specific child in Image 1.
- **Retain:** Facial features, eye brightness, nose structure, and specific hair curl/pattern.
- **Change Only:** The rendering style (brushstrokes, lighting softness, shading logic).
- **Age Lock:** Keep them looking approx ${age || "Child"} years old.

**SCENE CONTEXT:**
- **Setting:** ${theme || "Neutral"} background.
${occasion ? `- **Special Occasion:** Incorporate subtle festive elements related to "${occasion}" in the background or character accessories.` : ""}
${customGoal ? `- **Custom Theme Goal:** Match the vibe of "${customGoal}".` : ""}
- **Shot:** Medium-Close Up (Head & Shoulders).
- **Focus:** High-impact character portrait.
- **Pose Request (CRITICAL):** The character MUST be facing directly forward, looking at the camera, with both eyes fully visible. ABSOLUTELY DO NOT generate side profiles, characters looking down, or looking away. This initial image acts as the primary facial mapping DNA for the character across an entire book. If the face is obscured, angled, or turned away, the subsequent illustrations will fail to match the child.

**TECHNICAL MANDATES:**
- 1:1 Aspect Ratio.
- No text, no frames.
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
            console.log("Model: gemini-3-pro-image-preview");
            console.log("Contents: 1 image + 1 text prompt");

            // Using the Vision-Capable Image Generation Model
            const model = ai().getGenerativeModel({
                model: 'gemini-3-pro-image-preview'
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
export async function generateMethod4Image(
    prompt: string,
    stylePrompt: string,
    referenceBase64OrUrl: string,
    characterDescription: string,
    age: string,
    seed?: number,
    secondReferenceBase64OrUrl?: string
): Promise<{ imageBase64: string; fullPrompt: string }> {
    return withRetry(async () => {
        // We use the "Verify Hero" result (referenceBase64) as the Visual Anchor.
        // This ensures the page illustrations look exactly like the approved hero.

        let referenceBase64 = referenceBase64OrUrl;

        // If it's a URL, download it first
        if (referenceBase64OrUrl && referenceBase64OrUrl.startsWith('http')) {
            const response = await fetch(referenceBase64OrUrl);
            const arrayBuffer = await response.arrayBuffer();
            referenceBase64 = Buffer.from(arrayBuffer).toString('base64');
        }

        // 1. Construct the Multi-Modal Input (Images MUST come first)
        const contents: any[] = [
            {
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: referenceBase64
                }
            }
        ];

        let secondReferenceBase64 = secondReferenceBase64OrUrl;
        if (secondReferenceBase64 && secondReferenceBase64.startsWith('http')) {
            const response = await fetch(secondReferenceBase64);
            const arrayBuffer = await response.arrayBuffer();
            secondReferenceBase64 = Buffer.from(arrayBuffer).toString('base64');
        }

        if (secondReferenceBase64) {
            contents.push({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: secondReferenceBase64
                }
            });
        }

        const sanitizedPrompt = sanitizePrompt(prompt);
        const sanitizedStyle = sanitizePrompt(stylePrompt);
        const sanitizedDesc = sanitizePrompt(characterDescription);

        // NOTE: When called from the pipeline (Phase 5), the `prompt` parameter already contains
        // the full Vision Blueprint V2 JSON with `entities` and the double-bound [[HERO_A]] preamble
        // assembled by promptEngineer.ts. The wrapper text below acts as the final generation mandate.
        const basePromptText = `**PHOTO-BOUND CHARACTER TOKEN:**
- [[HERO_A]] → Attached Image 1 (inlineData[0]). This token IS that specific child. Derive ALL appearance strictly from this photo. DO NOT apply name-based ethnic defaults, statistical averages, or training data assumptions. Replicate the face, hair style, skin tone, and body proportions exactly as they appear in the attached photo.

**STYLE LOCK:** Render this scene in the following Art Style: "${sanitizedStyle}". Maintain consistent rendering technique with the reference imagery.

**GENERATION MANDATE:**
${sanitizedPrompt}

**FINAL QUALITY REQUIREMENTS:**
- Aspect Ratio: Horizontal 16:9 panoramic image.
- Quality: Ultra-high resolution, 4K quality, sharp details, flawless rendering, masterpiece.
- NO text, words, or typography anywhere in the image.`;

        const dualPromptText = `**PHOTO-BOUND CHARACTER TOKENS:**
- [[HERO_A]] → Attached Image 1 (inlineData[0]). This token IS that specific child. Derive ALL appearance strictly from this photo. DO NOT apply name-based ethnic defaults. Replicate exactly.
- [[HERO_B]] → Attached Image 2 (inlineData[1]). Same strict rules apply as [[HERO_A]]. Match the second photo exactly — face, hair, skin tone, proportions.

**STYLE LOCK:** Render this scene in the following Art Style: "${sanitizedStyle}". Maintain consistent rendering technique across both characters.

**GENERATION MANDATE:**
${sanitizedPrompt}

**FINAL QUALITY REQUIREMENTS:**
- Aspect Ratio: Horizontal 16:9 panoramic image.
- Quality: Ultra-high resolution, 4K quality, sharp details, flawless rendering, masterpiece.
- NO text, words, or typography anywhere in the image.`;

        contents.push({
            text: `\n\n=== GENERATION INSTRUCTIONS ===\n` + (secondReferenceBase64 ? dualPromptText : basePromptText)
        });

        console.log(`Generating Page via Hybrid Vision Logic (Backend)...`);
        console.log(`- STYLE PROMPT: ${stylePrompt?.substring(0, 100)}...`);
        console.log(`- REFERENCE IMAGE: ${referenceBase64 ? 'PRESENT (' + referenceBase64.length + ' chars)' : 'MISSING'}`);
        console.log(`- SCENE PROMPT: ${prompt.substring(0, 100)}...`);

        // 2. Call Gemini Vision Model
        const model = ai().getGenerativeModel({
            model: 'gemini-3-pro-image-preview'
        });

        // Ensure generationConfig explicitly filters out invalid fields for this model version
        // gemini-3-pro-image-preview does not support 'aspectRatio' in the config block.
        const response = await model.generateContent(contents);

        // 3. Extract Image
        let b64 = "";
        if (response.response.candidates && response.response.candidates[0].content.parts) {
            for (const part of response.response.candidates[0].content.parts) {
                if (part.inlineData) b64 = part.inlineData.data;
            }
        }

        if (!b64) throw new Error("Image generation failed (No data returned from backend vision model)");

        // Return the 'clean' prompt (the original scene description) to avoid bloating the database with instructions
        return { imageBase64: b64, fullPrompt: prompt };
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
                model: 'gemini-2.0-flash',
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
