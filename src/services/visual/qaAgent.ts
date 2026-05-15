import { ai } from '../generation/modelGateway';
import { supabase } from '../../utils/supabaseClient';

export async function runImageQACheck(
    blueprintJson: string,
    resultImageBase64: string,
    dnaImages: { base64: string, label: string }[]
) {
    const model = ai().getGenerativeModel({
        model: 'gemini-1.5-pro-latest',
        generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
        }
    });

    const parts: any[] = [];

    // Add DNA Images
    dnaImages.forEach(img => {
        parts.push({ text: `Reference DNA Image: ${img.label}` });
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: img.base64 } });
    });

    // Add Result Image
    parts.push({ text: "FINAL GENERATED SPREAD IMAGE (To be evaluated):" });
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: resultImageBase64 } });

    // Add Instructions
    const prompt = `You are an expert Art Director and QA Agent. 
Your job is strictly to evaluate the "FINAL GENERATED SPREAD IMAGE" against the "Reference DNA Images" and the provided Blueprint.
You DO NOT write prompts. You are an Image Checker.

Here is the Blueprint (JSON) for this spread:
${blueprintJson}

Evaluate the generated spread based on the following criteria:
1. Character Consistency: Does the character in the spread closely match the facial features and identity of the Reference DNA Images? (Pay special attention to skin tone, hair, and facial structure).
2. Style Fidelity: Does the overall art style match the intended look?
3. Text Clearance: Based on the blueprint, is the designated text zone completely free of visual clutter, limbs, and characters? Which side is recommended for text?

Return a strictly valid JSON object matching exactly this structure:
{
    "character_consistency_status": "pass" | "fail",
    "character_reasoning": "Detailed explanation...",
    "style_consistency_status": "pass" | "fail",
    "style_reasoning": "Detailed explanation...",
    "text_clearance_status": "pass" | "fail",
    "text_reasoning": "Detailed explanation...",
    "recommended_text_side": "Right" | "Left",
    "overall_decision": "pass" | "fail" | "flagged"
}`;

    parts.push({ text: prompt });

    try {
        const response = await model.generateContent(parts);
        let resultText = response.response.text();
        // clean up potential markdown
        resultText = resultText.replace(/```json/g, '').replace(/```/g, '').trim();
        
        const qaResult = JSON.parse(resultText);
        return qaResult;
    } catch (error) {
        console.error("QA Agent Error:", error);
        throw new Error("Failed to evaluate image.");
    }
}
