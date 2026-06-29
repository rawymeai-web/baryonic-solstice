import { NextRequest, NextResponse } from 'next/server';
import { sanitizePrompt } from '../../../../services/generation/imageGenerator';
import { ai as getAi } from '../../../../services/generation/modelGateway';

export const maxDuration = 300;

/**
 * POST /api/generate/outpaint
 *
 * Accepts a padded/scaled spread illustration with empty (white) borders and
 * uses gemini-2.5-flash-image (the IMAGE EDITING model) to seamlessly fill the
 * empty areas by extending the existing scene.
 *
 * Uses the EXACT same pattern as /api/generate/edit-image which works correctly:
 *   - Image(s) as raw inlineData first (no text label before them)
 *   - Text prompt last
 *   - gemini-2.5-flash-image model
 *
 * Body:
 *   imageBase64  — padded image as base64 (no data: prefix needed)
 *   stylePrompt  — art style string
 *   childDNA?    — optional Hero A DNA reference
 *   secondDNA?   — optional Hero B DNA reference
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
        console.error('[Outpaint] Error converting image to base64:', err);
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { imageBase64, stylePrompt, childDNA, secondDNA } = body;

        if (!imageBase64) {
            return NextResponse.json({ error: 'imageBase64 is required' }, { status: 400 });
        }

        const safeStyle = sanitizePrompt(stylePrompt || "Painterly children's book illustration style");

        // ── Build contents array — IMAGE FIRST, TEXT LAST (edit-image pattern) ──
        const contents: any[] = [];

        // Slot 1: The padded spread that needs empty space filled
        const rawSpread = await toRawBase64(imageBase64);
        if (!rawSpread) {
            return NextResponse.json({ error: 'Failed to process spread image' }, { status: 400 });
        }
        contents.push({ inlineData: { mimeType: 'image/jpeg', data: rawSpread } });

        // Optional character references (helps model keep faces consistent in filled areas)
        const rawChild = await toRawBase64(childDNA);
        if (rawChild) {
            contents.push({ inlineData: { mimeType: 'image/jpeg', data: rawChild } });
        }

        const rawSecond = await toRawBase64(secondDNA);
        if (rawSecond) {
            contents.push({ inlineData: { mimeType: 'image/jpeg', data: rawSecond } });
        }

        // ── Outpaint prompt ────────────────
        const editPrompt = `You are a professional children's book illustrator. Your task is to perform a GENERATIVE ZOOM OUT (outpainting) on the provided scene.

**THE SCENE (IMAGE 1):** See Attached Image 1. This image contains central artwork surrounded by a SOLID WHITE BORDER. This is because the camera has zoomed out, leaving the edges of the 16:9 canvas blank.

**YOUR TASK — EXTEND THE SCENE:**
You must recreate this exact scene, but ZOOMED OUT to fill the entire 16:9 canvas. 
You must replace the solid white borders by naturally extending the landscape, environment, sky, ground, or background outward.

**STRICT RULES:**
- DO NOT CROP: Do not just return the central image. You must generate a wider field of view that fills the white borders with new background content.
- PRESERVE THE CENTER: Keep the characters, objects, and central composition exactly as they appear in the original artwork.
- EXTEND THE EDGES: Paint over the white borders. If there is sky at the top, paint more sky. If there is grass at the bottom, paint more grass.
- SEAMLESS: The final output must be a single, complete illustration with NO white borders remaining.
- STYLE MATCH: Match the existing art style exactly — "${safeStyle}".
- NO TEXT: Zero letters, words, or typography.`;

        contents.push({ text: editPrompt });

        console.log(`[Outpaint] Calling gemini-3-pro-image-preview with ${contents.length} parts`);

        // ── Use gemini-3-pro-image-preview ────────────────
        const model = getAi().getGenerativeModel({
            model: 'gemini-3-pro-image-preview',
        });

        const response = await model.generateContent(contents);

        // Extract edited image from response
        let imageBase64Result: string | null = null;
        const parts = response.response.candidates?.[0]?.content?.parts || [];

        for (const part of parts) {
            if (part.inlineData?.mimeType?.startsWith('image/')) {
                imageBase64Result = part.inlineData.data;
                break;
            }
        }

        if (!imageBase64Result) {
            console.error('[Outpaint] No image in response. Parts:', JSON.stringify(
                parts.map((p: any) => ({ hasInlineData: !!p.inlineData, text: p.text?.slice?.(0, 200) }))
            ));
            return NextResponse.json(
                { error: 'Gemini did not return a filled image. The model may have refused or returned text only. Try again.' },
                { status: 500 }
            );
        }

        console.log(`[Outpaint] ✅ Success — filled image returned (${imageBase64Result.length} chars)`);
        return NextResponse.json({ success: true, imageBase64: imageBase64Result });

    } catch (error: any) {
        console.error('[Outpaint] Fatal error:', error);
        return NextResponse.json(
            { error: error.message || 'Failed to outpaint image' },
            { status: 500 }
        );
    }
}
