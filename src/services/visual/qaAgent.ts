import { ai } from '../generation/modelGateway';
import { supabase } from '../../utils/supabaseClient';

export async function runImageQACheck(
    blueprintJson: string,
    resultImageBase64: string,
    dnaImages: { base64: string, label: string }[],
    spreadText?: string
) {
    const model = ai().getGenerativeModel({
        model: 'gemini-2.5-pro',
        generationConfig: {
            temperature: 0.2,
            responseMimeType: "application/json",
        }
    });

    const parts: any[] = [];

    const cleanB64 = (str: string) => (str || '').replace(/^data:image\/\w+;base64,/, '');
    const getMime = (str: string) => {
        if (str?.startsWith('data:image/png') || str?.startsWith('iVBORw')) return 'image/png';
        if (str?.startsWith('data:image/webp') || str?.startsWith('UklGR')) return 'image/webp';
        return 'image/jpeg';
    };

    // Add DNA Images
    dnaImages.forEach(img => {
        parts.push({ text: `Reference DNA Image: ${img.label}` });
        parts.push({ inlineData: { mimeType: getMime(img.base64), data: cleanB64(img.base64) } });
    });

    // Add Result Image
    parts.push({ text: "FINAL GENERATED SPREAD IMAGE (To be evaluated):" });
    parts.push({ inlineData: { mimeType: getMime(resultImageBase64), data: cleanB64(resultImageBase64) } });

    let childAge = "5";
    try {
        const parsed = JSON.parse(blueprintJson);
        const rawAge = parsed.childAge || parsed.age || parsed.foundation?.age || "5";
        const numMatch = String(rawAge).match(/\d+/);
        if (numMatch) childAge = numMatch[0];
    } catch (e) {}

    // Add Instructions
    const prompt = `You are a human parent and reviewer performing quality control on a children's storybook.
Compare the "FINAL GENERATED SPREAD IMAGE" directly against the "Reference DNA Images" and the narrative text.

Story Text for this Spread:
"${spreadText || 'No text context provided'}"

Blueprint (JSON) for this spread:
${blueprintJson}

Evaluate the generated spread based on the following practical criteria:
1. Character Likeness & Age/Height Consistency: 
   - Be realistic and practical. In dynamic storybook illustrations, characters change angles, perspective, and facial expressions (smiling, running, surprised). Some cartoon simplification is expected and desirable.
   - If the character has the same hair color/texture, skin tone, approximate age (${childAge} years old), and recognizable identity, mark character_consistency_status as "pass".
   - ONLY fail if: The character looks like a totally different person (different gender, different ethnicity, wrong hair), appears as an adult/baby, or has severe anatomical distortions.
2. Narrative Logic: 
   - Does the action reasonably match the story beat? Minor prop variations are acceptable.
3. Style Match: 
   - Storybook illustrations will naturally vary in lighting between indoor/outdoor scenes. Minor differences in brushstroke texture or color saturation are completely normal and should PASS.
   - ONLY fail if: The image is an actual photograph, a 3D videogame render, or a flat clip-art vector.
4. Text Zone & Position: 
   - Is the designated empty side reasonably clear of main character faces or critical actions? 
   - If clear, mark text_clearance_status as "pass".
   - If a character's face is right in the text zone, recommend shifting text side or offset.

Return a strictly valid JSON object matching exactly this structure:
{
    "character_consistency_status": "pass" | "fail",
    "character_reasoning": "Detailed explanation of likeness/age/height consistency...",
    "style_consistency_status": "pass" | "fail",
    "style_reasoning": "Detailed explanation of style match...",
    "text_clearance_status": "pass" | "fail",
    "text_reasoning": "Detailed explanation of text layout or overlap...",
    "recommended_text_side": "Right" | "Left",
    "recommended_text_offset_x": number, // suggested relative horizontal shift in mm (0 if none)
    "recommended_text_offset_y": number, // suggested relative vertical shift in mm (0 if none)
    "request_regeneration": boolean, // set to true if likeness, age/height, or narrative logic failed and you need a repaint
    "regeneration_reason": "Specific direction for the AI generator to correct the character/scene on repaint (empty if request_regeneration is false)",
    "overall_decision": "pass" | "fail" | "flagged" // fail if likeness/age/height or narrative logic fails, flagged if minor issues, pass if perfect
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
