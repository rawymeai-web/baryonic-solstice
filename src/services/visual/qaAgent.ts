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

    // Add DNA Images
    dnaImages.forEach(img => {
        parts.push({ text: `Reference DNA Image: ${img.label}` });
        parts.push({ inlineData: { mimeType: 'image/jpeg', data: img.base64 } });
    });

    // Add Result Image
    parts.push({ text: "FINAL GENERATED SPREAD IMAGE (To be evaluated):" });
    parts.push({ inlineData: { mimeType: 'image/jpeg', data: resultImageBase64 } });

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

Evaluate the generated spread based on the following criteria:
1. Character Likeness & Age/Height Consistency: 
   - Be realistic and fair. Do NOT fail the likeness just because it is a cartoon illustration instead of a photo. Some simplification and artistic style compromise is expected in drawings.
   - However, you MUST verify that the hero maintains a consistent age and relative height across the book spreads. The character must look like a child of the correct age (around ${childAge} years old) and maintain consistent body proportions.
   - FAIL the check if the character looks like a completely different person, looks like a teenager or an adult instead of a child, looks like a baby, or has wildly inconsistent height/anatomy compared to the reference child.
2. Narrative Logic: Look at the action and objects in the image. Does it match the story text? (e.g. if the text mentions a character sitting with a book or holding a cat, is the character doing that? Do the characters' expressions and poses make logical sense?)
3. Style Match: Be realistic and fair. Minor variations in texture softness, colors, or lighting are acceptable. Only FAIL the style if there is a massive style mismatch (e.g., a flat vector icon style instead of painterly illustration, or a high-contrast 3D render instead of a drawing).
4. Text Zone & Position: Based on the blueprint, is the designated text zone completely free of visual clutter, limbs, and characters? 
   - If the text overlays on top of a character's face, body, or important action, you MUST recommend moving the text.
   - Specify which side (Left or Right) is best to avoid clutter.
   - Also recommend manual horizontal/vertical offset adjustments in millimeters (e.g., recommend shifting X by -20 to move left, or Y by -30 to move up).

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
