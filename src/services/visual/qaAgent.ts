import { ai, cleanJsonString, withRetry } from '../generation/modelGateway';
import { supabase } from '../../utils/supabaseClient';
import { extractBiometrics } from './promptEngineer';

export interface ImageQAResult {
    likeness_score: number;
    character_consistency_status: 'pass' | 'fail';
    character_reasoning: string;
    wardrobe_consistency_status: 'pass' | 'fail';
    wardrobe_reasoning: string;
    style_consistency_status: 'pass' | 'fail';
    style_reasoning: string;
    text_clearance_status: 'pass' | 'fail';
    text_reasoning: string;
    recommended_text_side: 'Right' | 'Left';
    recommended_text_offset_x?: number;
    recommended_text_offset_y?: number;
    request_regeneration: boolean;
    regeneration_reason?: string;
    overall_decision: 'pass' | 'fail' | 'flagged';
    visual_description?: string;
}

export async function runImageQACheck(
    blueprintJson: string,
    resultImageBase64: string,
    dnaImages: { base64: string, label: string }[],
    spreadText?: string,
    childDescription?: any
): Promise<ImageQAResult> {
    return withRetry(async () => {
        const parts: any[] = [];

        const cleanB64 = (str: string) => (str || '').replace(/^data:image\/\w+;base64,/, '');
        const getMime = (str: string) => {
            if (str?.startsWith('data:image/png') || str?.startsWith('iVBORw')) return 'image/png';
            if (str?.startsWith('data:image/webp') || str?.startsWith('UklGR')) return 'image/webp';
            return 'image/jpeg';
        };

        // Add DNA Reference Images
        dnaImages.forEach(img => {
            if (img.base64) {
                parts.push({ text: `Reference DNA Image: ${img.label}` });
                parts.push({ inlineData: { mimeType: getMime(img.base64), data: cleanB64(img.base64) } });
            }
        });

        // Add Result Image
        if (resultImageBase64) {
            parts.push({ text: "FINAL GENERATED SPREAD IMAGE (To be evaluated):" });
            parts.push({ inlineData: { mimeType: getMime(resultImageBase64), data: cleanB64(resultImageBase64) } });
        }

        let childAge = "5";
        let parsedBlueprint: any = null;
        try {
            parsedBlueprint = typeof blueprintJson === 'string' ? JSON.parse(blueprintJson) : blueprintJson;
            const rawAge = parsedBlueprint?.childAge || parsedBlueprint?.age || parsedBlueprint?.foundation?.age || "5";
            const numMatch = String(rawAge).match(/\d+/);
            if (numMatch) childAge = numMatch[0];
        } catch (e) {}

        const biometrics = extractBiometrics(childDescription || parsedBlueprint?.childDescription || parsedBlueprint?.mainCharacter?.description || parsedBlueprint);

        // Add Instructions
        const prompt = `You are a strict, uncompromising Art Director and Quality Assurance Inspector for a high-end personalized children's book publishing house.
Your highest priority is CHARACTER LIKENESS AND IDENTITY INTEGRITY. A parent is paying for a book featuring THEIR specific child; if the character's face drifts or looks like a random child, the customer will return the book.

Compare the "FINAL GENERATED SPREAD IMAGE" directly against the "Reference DNA Images", the biometric profile, and the narrative text.

MANDATORY BIOMETRIC TARGET PROFILE:
- Target Age: ${childAge} years old
- Mandatory Eye Color: ${biometrics.eyeColor}
- Mandatory Hair Color & Style: ${biometrics.hairColor} (${biometrics.hairStyle})
- Mandatory Skin Tone: ${biometrics.skinTone}

Story Text for this Spread:
"${spreadText || 'No text context provided'}"

Blueprint (JSON) for this spread:
${typeof blueprintJson === 'string' ? blueprintJson : JSON.stringify(blueprintJson, null, 2)}

CRITICAL EVALUATION CRITERIA:

1. Character Facial Likeness & Biometric Color Integrity (TARGET AGE: ${childAge} YEARS OLD):
   - Compare facial landmarks and proportions between the Reference DNA Image and the character in the generated spread:
     a) Face & Jaw Shape: Head shape, cheek roundness/fullness, and chin geometry.
     b) Eyes & Eyebrows: Eye shape, eyelid fold, pupil/iris color, eyebrow arch, and eye-to-head proportion scale.
     c) Nose & Mouth: Nose bridge/tip width and mouth shape.
     d) Hair: Hair color, wave/curl texture, volume, and hairline.

   - MANDATORY BIOMETRIC FAIL RULES (ZERO TOLERANCE FOR EYE/HAIR COLOR MUTATION):
     * EYE COLOR CHECK: Look closely at the character's irises/eyes in the generated image. If the target is Dark Brown (${biometrics.eyeColor}), but the generated character has GREEN, HAZEL, LIGHT BROWN, AMBER, or BLUE eyes (even if caused by ambient lighting or lantern glow reflections), this is an UNACCEPTABLE identity hallucination.
       -> You MUST set "character_consistency_status": "fail"
       -> Set "likeness_score": 4 (or less than 6)
       -> Set "request_regeneration": true and "overall_decision": "fail"
       -> In "regeneration_reason", state: "Biometric Failure: Character rendered with incorrect eye color instead of mandatory ${biometrics.eyeColor}. Eyes must be deep ${biometrics.eyeColor}."
     * HAIR COLOR & SILHOUETTE: If the character's hair color is lightened (e.g. reddish, strawberry blonde, light brown) when target is Dark Brown (${biometrics.hairColor}), or if the haircut mutates into an unprompted fade/undercut when reference is curly/wavy, you MUST set "character_consistency_status": "fail", "overall_decision": "fail", and "request_regeneration": true.
     * SKIN TONE & PROPORTIONS: Skin tone must match the reference without unprompted bleaching or ethnic distortion.

   - Scoring Guide:
     * 9-10: Flawless, unmistakable identity match to the reference child with accurate anatomical/stylization scale.
     * 7-8: Clear, recognizable likeness with natural expression adaptation and accurate eye/hair colors.
     * 5-6: Generic caricature, distorted proportions, mutated eye/hair colors, or stylization drift — FAILS parent recognition.
     * 1-4: Wrong child, imposter, or complete identity loss.
   - MANDATORY FAIL RULE: Any likeness score below 7/10 is an AUTOMATIC FAIL.

2. Character Wardrobe & Footwear Consistency:
   - Check the character's clothing and footwear across poses:
     a) Top/Shirt: Consistent shirt/top style and palette.
     b) Bottom/Pants: Consistent bottoms as defined in the character sheet.
     c) Footwear: Consistent shoes/sneakers unless swimming/sleeping.
   - Set "wardrobe_consistency_status": "fail" only if there is a severe unexplained wardrobe contradiction.

3. Narrative Logic & Action:
   - Does the character action and setting align with the story beat described in the narrative?

4. Style, Medium & Dimensionality Consistency:
   - Does the illustration match the exact artistic medium, rendering dimensionality, brushwork/textures, and lighting quality of the Reference DNA Image?
   - FORBIDDEN STYLE DRIFT: The illustration must NOT drift into contrasting artistic media or incompatible stylization levels (e.g., painterly realism shifting to 3D CGI plastic or flat vector, 3D animated shifting to flat 2D or realistic photo, watercolor shifting to digital glossy CGI).
   - MANDATORY FAIL RULE: If the illustration mutates into a contrasting artistic medium or different dimensionality/stylization level, set "style_consistency_status": "fail", "overall_decision": "fail", and specify the exact observed drift and target requirement in "regeneration_reason".

5. Text Zone Clearance:
   - Check if the designated side is clear of the character's face.
   - If the character is on the designated side, set "recommended_text_side" to the opposite side ("Left" or "Right") and recommend shifting the text. Do NOT fail the entire image or request regeneration if simply placing text on the other side provides perfect clearance.

Return a strictly valid JSON object matching exactly this structure:
{
    "likeness_score": number,
    "character_consistency_status": "pass" | "fail",
    "character_reasoning": "Detailed breakdown of face shape, eyes (including iris color), nose, hair, and specific reasons for the score...",
    "wardrobe_consistency_status": "pass" | "fail",
    "wardrobe_reasoning": "Detailed explanation of top, bottom pants/shorts, and footwear consistency...",
    "style_consistency_status": "pass" | "fail",
    "style_reasoning": "Detailed explanation of style match...",
    "text_clearance_status": "pass" | "fail",
    "text_reasoning": "Detailed explanation of text layout or overlap...",
    "recommended_text_side": "Right" | "Left",
    "recommended_text_offset_x": number,
    "recommended_text_offset_y": number,
    "request_regeneration": boolean,
    "regeneration_reason": "Clear, specific correction instruction for the image generator on repaint",
    "overall_decision": "pass" | "fail" | "flagged"
}`;

        parts.push({ text: prompt });

        const model = ai().getGenerativeModel({
            model: 'gemini-2.5-flash',
            generationConfig: {
                temperature: 0.2,
                responseMimeType: "application/json",
            }
        });

        const response = await model.generateContent(parts);
        const rawText = response.response.text();
        const cleaned = cleanJsonString(rawText);
        const qaResult: ImageQAResult = JSON.parse(cleaned);

        // Enforce schema integrity: if likeness < 7 or any critical check failed, overall decision MUST be fail
        if (qaResult.likeness_score < 7 || qaResult.character_consistency_status === 'fail' || qaResult.style_consistency_status === 'fail') {
            qaResult.overall_decision = 'fail';
            qaResult.request_regeneration = true;
        }

        return qaResult;
    }, 3, 3000, {
        likeness_score: 5,
        character_consistency_status: 'fail',
        character_reasoning: 'QA agent encountered transient vision timeout/error during automated check.',
        wardrobe_consistency_status: 'pass',
        wardrobe_reasoning: 'Default fallback applied.',
        style_consistency_status: 'pass',
        style_reasoning: 'Default fallback applied.',
        text_clearance_status: 'pass',
        text_reasoning: 'Default text clearance applied.',
        recommended_text_side: 'Right',
        recommended_text_offset_x: 0,
        recommended_text_offset_y: 0,
        request_regeneration: false,
        overall_decision: 'flagged',
        regeneration_reason: 'Transient QA error. Flagged for manual review.'
    });
}
