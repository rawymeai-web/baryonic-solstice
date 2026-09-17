import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import { sanitizePrompt } from '../../../../services/generation/imageGenerator';
import { ai as getAi } from '../../../../services/generation/modelGateway';

export const maxDuration = 300;

async function toBuffer(input: string): Promise<Buffer | null> {
    if (!input) return null;
    try {
        if (input.startsWith('http')) {
            const res = await fetch(input);
            if (!res.ok) throw new Error(`Failed to fetch image: ${res.statusText}`);
            const arrayBuffer = await res.arrayBuffer();
            return Buffer.from(arrayBuffer);
        }
        const b64 = input.includes(',') ? input.split(',')[1] : input;
        return Buffer.from(b64, 'base64');
    } catch (err) {
        console.error('[Outpaint] Error converting image to buffer:', err);
        return null;
    }
}

export async function POST(req: NextRequest) {
    try {
        const body = await req.json();
        const { imageBase64, imageUrl, scale, offsetX, offsetY, stylePrompt, childDNA, secondDNA } = body;

        const rawInput = imageUrl || imageBase64;
        if (!rawInput) {
            return NextResponse.json({ error: 'imageUrl or imageBase64 is required' }, { status: 400 });
        }

        const safeStyle = sanitizePrompt(stylePrompt || "Painterly children's book illustration style");

        // 1. Convert input image to buffer
        const inputBuf = await toBuffer(rawInput);
        if (!inputBuf) {
            return NextResponse.json({ error: 'Failed to process input image' }, { status: 400 });
        }

        // 2. Prepare 2:1 Panoramic Canvas (1600x800) with white borders using Sharp
        const targetW = 1600;
        const targetH = 800;

        let paddedBuffer: Buffer;
        const effectiveScale = scale !== undefined ? Number(scale) : 100;
        const effectiveOffsetX = offsetX !== undefined ? Number(offsetX) : 0;
        const effectiveOffsetY = offsetY !== undefined ? Number(offsetY) : 0;

        // If scale or offsets are provided (or if raw image is not already padded), build clean white canvas
        const meta = await sharp(inputBuf).metadata();
        const imgW = meta.width || 1376;
        const imgH = meta.height || 768;
        const ratio = imgW / imgH;

        const normalizedScale = (effectiveScale === 100 && effectiveOffsetX === 0 && effectiveOffsetY === 0)
            ? 0.78 // Default to 78% for instant headroom if unscaled
            : (effectiveScale / 100);

        const scaledW = Math.max(100, Math.min(targetW, Math.round(targetW * normalizedScale)));
        const scaledH = Math.max(100, Math.min(targetH, Math.round(scaledW / ratio)));

        const panX = Math.round((effectiveOffsetX / 100) * targetW);
        const panY = (effectiveScale === 100 && effectiveOffsetX === 0 && effectiveOffsetY === 0)
            ? Math.round(0.10 * targetH) // default +10% pan Y headroom
            : Math.round((effectiveOffsetY / 100) * targetH);

        const left = Math.max(0, Math.min(targetW - scaledW, Math.round((targetW - scaledW) / 2 + panX)));
        const top = Math.max(0, Math.min(targetH - scaledH, Math.round((targetH - scaledH) / 2 + panY)));

        console.log(`[Outpaint] Server-side Sharp padding — Canvas: ${targetW}x${targetH}, Image: ${scaledW}x${scaledH} at (${left}, ${top})`);

        const resizedBuf = await sharp(inputBuf)
            .resize(scaledW, scaledH, { fit: 'inside' })
            .toBuffer();

        paddedBuffer = await sharp({
            create: {
                width: targetW,
                height: targetH,
                channels: 3,
                background: { r: 255, g: 255, b: 255 }
            }
        })
        .composite([{ input: resizedBuf, left, top }])
        .jpeg({ quality: 95 })
        .toBuffer();

        const rawSpreadBase64 = paddedBuffer.toString('base64');

        // ── Build contents array — IMAGE FIRST, TEXT LAST (edit-image pattern) ──
        const contents: any[] = [];
        contents.push({ inlineData: { mimeType: 'image/jpeg', data: rawSpreadBase64 } });

        // Optional character references
        if (childDNA) {
            const childBuf = await toBuffer(childDNA);
            if (childBuf) {
                contents.push({ inlineData: { mimeType: 'image/jpeg', data: childBuf.toString('base64') } });
            }
        }

        if (secondDNA) {
            const secondBuf = await toBuffer(secondDNA);
            if (secondBuf) {
                contents.push({ inlineData: { mimeType: 'image/jpeg', data: secondBuf.toString('base64') } });
            }
        }

        // ── Outpaint prompt ────────────────
        const editPrompt = `You are a professional children's book illustrator. Your task is to perform a GENERATIVE ZOOM OUT (outpainting) on the provided scene.

**THE SCENE (IMAGE 1):** See Attached Image 1. This image contains central artwork surrounded by SOLID WHITE BORDERS around the canvas (top, bottom, left, and/or right).

**YOUR TASK — EXPAND & EXTEND THE SCENE:**
You must recreate this exact scene, but ZOOMED OUT so the entire canvas is filled with lush, seamless artwork with generous atmospheric space.
You must replace all solid white borders by naturally extending the environment outward in all directions:
- TOP BORDER: If there is white space at the top, naturally extend the sky, upper atmosphere, ceiling, or high tree canopies upwards to create generous, expansive vertical headroom above the characters.
- BOTTOM BORDER: If there is white space at the bottom, naturally extend the ground, road, grass, or flooring downwards.
- LEFT & RIGHT BORDERS: Naturally continue the landscape, buildings, and horizon seamlessly.

**STRICT RULES:**
- PRESERVE THE CENTRAL ARTWORK: Keep the character(s), their pose, action, face, and clothing exactly as they appear in the original artwork. Do not enlarge, distort, or move them.
- ZERO WHITE BORDERS: The final output must be 100% filled with seamless artwork matching the scene.
- STYLE MATCH: Match the existing art style exactly — "${safeStyle}".
- NO TEXT: Strictly no words, letters, typography, or watermarks.`;

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
