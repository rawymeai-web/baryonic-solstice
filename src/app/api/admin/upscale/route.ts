import { NextRequest, NextResponse } from 'next/server';
import sharp from 'sharp';
import fs from 'fs';
import path from 'path';
import os from 'os';
import { execFile } from 'child_process';
import { promisify } from 'util';

const execFileAsync = promisify(execFile);
export const maxDuration = 180;

function getRealEsrganExecutablePath(): { path: string | null; engine: 'real-esrgan' | 'sharp'; reason?: string } {
    const configuredPath = process.env.REAL_ESRGAN_PATH;
    if (configuredPath && fs.existsSync(configuredPath)) {
        return { path: configuredPath, engine: 'real-esrgan' };
    }
    const localRelativePath = path.join(process.cwd(), 'tools', 'realesrgan', process.platform === 'win32' ? 'realesrgan-ncnn-vulkan.exe' : 'realesrgan-ncnn-vulkan');
    if (fs.existsSync(localRelativePath)) {
        return { path: localRelativePath, engine: 'real-esrgan' };
    }
    return {
        path: null,
        engine: 'sharp',
        reason: configuredPath ? `Configured REAL_ESRGAN_PATH (${configuredPath}) not found on disk.` : 'REAL_ESRGAN_PATH environment variable not configured.'
    };
}

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
        console.error('[Upscale] Error converting image to buffer:', err);
        return null;
    }
}

/**
 * POST /api/admin/upscale
 * 
 * Performs 4X AI Neural Super-Resolution using Real-ESRGAN (Anime/Illustration tuned model)
 * running locally on the GPU with zero token costs ($0.00).
 * Falls back to Sharp Lanczos3 if binary is unavailable.
 */
export async function POST(req: NextRequest) {
    const tempFilesToClean: string[] = [];
    try {
        const body = await req.json();
        const { imageUrl, imageBase64, model = 'realesrgan-x4plus-anime', scaleFactor = 4, density = 300, quality = 96 } = body;

        const rawInput = imageUrl || imageBase64;
        if (!rawInput) {
            return NextResponse.json({ error: 'imageUrl or imageBase64 is required' }, { status: 400 });
        }

        const inputBuf = await toBuffer(rawInput);
        if (!inputBuf) {
            return NextResponse.json({ error: 'Failed to read input image' }, { status: 400 });
        }

        // Check if Real-ESRGAN standalone executable is available
        const esrganInfo = getRealEsrganExecutablePath();
        if (esrganInfo.path) {
            const tempDir = os.tmpdir();
            const tempInput = path.join(tempDir, `upscale_in_${Date.now()}_${Math.random().toString(36).slice(2)}.jpg`);
            const tempOutput = path.join(tempDir, `upscale_out_${Date.now()}_${Math.random().toString(36).slice(2)}.png`);
            tempFilesToClean.push(tempInput, tempOutput);

            await fs.promises.writeFile(tempInput, inputBuf);

            console.log(`[Upscale AI] Executing Real-ESRGAN 4X Super-Resolution with model ${model} at ${esrganInfo.path}...`);
            await execFileAsync(esrganInfo.path, [
                '-i', tempInput,
                '-o', tempOutput,
                '-n', model,
                '-s', String(scaleFactor || 4)
            ]);

            if (fs.existsSync(tempOutput)) {
                const upscaledBuf = await fs.promises.readFile(tempOutput);
                const finalJpg = await sharp(upscaledBuf)
                    .withMetadata({ density: Number(density) })
                    .jpeg({ quality: Number(quality), chromaSubsampling: '4:4:4' })
                    .toBuffer();

                const meta = await sharp(finalJpg).metadata();
                console.log(`[Upscale AI] ✅ Success: ${meta.width}x${meta.height} (${(finalJpg.length / 1024).toFixed(0)} KB)`);

                return NextResponse.json({
                    success: true,
                    engine: 'Real-ESRGAN AI Neural (GPU)',
                    imageBase64: finalJpg.toString('base64'),
                    width: meta.width,
                    height: meta.height,
                    density: Number(density),
                    sizeBytes: finalJpg.length
                });
            }
        }

        // Fallback to Sharp Lanczos3 if Real-ESRGAN executable is not found
        console.log(`[Upscale AI] Falling back to Sharp Lanczos3. Reason: ${esrganInfo.reason || 'Executable not available'}`);
        const meta = await sharp(inputBuf).metadata();
        const srcW = meta.width || 1376;
        const srcH = meta.height || 768;
        const targetW = Math.round(srcW * Number(scaleFactor || 3));
        const targetH = Math.round(srcH * Number(scaleFactor || 3));

        const fallbackBuffer = await sharp(inputBuf)
            .resize(targetW, targetH, { kernel: sharp.kernel.lanczos3, fit: 'fill' })
            .sharpen({ sigma: 1.2, m1: 1.5, m2: 0.7, x1: 2, y2: 10, y3: 20 })
            .withMetadata({ density: Number(density) })
            .jpeg({ quality: Number(quality), chromaSubsampling: '4:4:4' })
            .toBuffer();

        return NextResponse.json({
            success: true,
            engine: 'Sharp Lanczos3',
            imageBase64: fallbackBuffer.toString('base64'),
            width: targetW,
            height: targetH,
            density: Number(density),
            sizeBytes: fallbackBuffer.length
        });

    } catch (error: any) {
        console.error('[Upscale] Error:', error);
        return NextResponse.json({ error: error.message || 'Failed to upscale image' }, { status: 500 });
    } finally {
        for (const f of tempFilesToClean) {
            try { if (fs.existsSync(f)) await fs.promises.unlink(f); } catch (_) {}
        }
    }
}
