import { NextRequest, NextResponse } from 'next/server';
import { sanitizePrompt } from '../../../../services/generation/imageGenerator';
import { ai as getAi } from '../../../../services/generation/modelGateway';

/**
 * POST /api/generate/edit-image
 *
 * Accepts an existing spread illustration + a natural-language edit instruction.
 * Passes both to Gemini with a strict "surgical edit" mandate:
 *   — Keep all characters, poses, and scene layout intact
 *   — Apply ONLY the specific change described in editInstruction
 *
 * Body:
 *   imageBase64     — current spread image as base64 (no data: prefix needed)
 *   editInstruction — plain-language fix (e.g. "make the sky golden sunset colors")
 *   stylePrompt     — art style string for style consistency
 *   childDNA?       — optional: base64 of child reference photo (keeps character consistent)
 *   secondDNA?      — optional: base64 of second character reference photo
 */

/**
 * Helper to ensure we have RAW base64 data (no data: prefix).
 * If it's a URL, it fetches it and converts to base64.
 */
async function toRawBase64(input: string): Promise<string | null> {
    if (!input) return null;
    try {
        if (input.startsWith('http')) {
            const res = await fetch(input);
            if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
            const arrayBuffer = await res.arrayBuffer();
            return Buffer.from(arrayBuffer).toString('base64');
        }
        return input.includes(',') ? input.split(',')[1] : input;
    } catch (err) {
        console.error("Error converting image to base64:", err);
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const {
            imageBase64,
            editInstruction,
            stylePrompt,
            childDNA,
            secondDNA
        } = body;

        if (!imageBase64 || !editInstruction) {
            return NextResponse.json(
                { error: 'imageBase64 and editInstruction are required' },
                { status: 400 }
            );
        }

        const safeInstruction = sanitizePrompt(editInstruction);
        const safeStyle = sanitizePrompt(stylePrompt || 'Painterly children\'s book illustration style');

        // Build multi-modal contents array
        const contents: any[] = [];

        // Normalize all inputs to RAW BASE64
        const rawSpread = await toRawBase64(imageBase64);
        if (!rawSpread) return NextResponse.json({ error: 'Failed to process spread image' }, { status: 400 });
        contents.push({ inlineData: { mimeType: 'image/jpeg', data: rawSpread } });

        const rawChild = await toRawBase64(childDNA);
        if (rawChild) {
            contents.push({ inlineData: { mimeType: 'image/jpeg', data: rawChild } });
        }

        const rawSecond = await toRawBase64(secondDNA);
        if (rawSecond) {
            contents.push({ inlineData: { mimeType: 'image/jpeg', data: rawSecond } });
        }

        const editPrompt = `You are a professional children's book illustrator performing a SURGICAL EDIT on an existing spread illustration.

**THE ORIGINAL ILLUSTRATION:** See Attached Image 1 (inlineData[0]). This is your base. Your output must be a modified version of this EXACT image.${childDNA ? `\n**CHARACTER REFERENCE A:** See Attached Image ${secondDNA ? '2' : '2'} — match this character's face, hair, and clothing exactly in the edited output.` : ''}${secondDNA ? `\n**CHARACTER REFERENCE B:** See final attached image — match this character identically.` : ''}

**EDIT INSTRUCTION (Apply this change ONLY):**
${safeInstruction}

**STRICT RULES:**
- PRESERVE: All characters, their exact positions, poses, clothing, facial features, proportions, and expressions. Do NOT move, resize, or alter the characters in any way.
- PRESERVE: The overall scene layout, composition, and spatial relationship between all elements.
- PRESERVE: The existing art style — "${safeStyle}". Do not change the rendering technique.
- CHANGE: Only what is explicitly described in the EDIT INSTRUCTION above.
- OUTPUT: A full 16:9 ultra-wide panoramic image matching the original dimensions and layout.
- NO TEXT: Zero letters, words, or typography anywhere in the output image.
- QUALITY: Ultra-high resolution, 4K quality, masterpiece children's illustration.`;

        contents.push({ text: editPrompt });

        const model = getAi().getGenerativeModel({
            model: 'gemini-3-pro-image-preview',
        });

        const response = await model.generateContent(contents);

        // Extract the generated image from the response
        let imageBase64Result: string | null = null;
        const parts = response.response.candidates?.[0]?.content?.parts || [];

        for (const part of parts) {
            if (part.inlineData?.mimeType?.startsWith('image/')) {
                imageBase64Result = part.inlineData.data;
                break;
            }
        }

        if (!imageBase64Result) {
            console.error('Edit-image: No image in response. Parts:', JSON.stringify(parts.map((p: any) => ({ hasInlineData: !!p.inlineData, text: p.text?.slice?.(0, 100) }))));
            return NextResponse.json(
                { error: 'Gemini did not return an edited image. Try rephrasing your instruction.' },
                { status: 500 }
            );
        }

        return NextResponse.json({ imageBase64: imageBase64Result });

    } catch (err: any) {
        console.error('Edit-image route error:', err);
        return NextResponse.json(
            { error: err.message || 'Unexpected server error during image edit' },
            { status: 500 }
        );
    }
}
