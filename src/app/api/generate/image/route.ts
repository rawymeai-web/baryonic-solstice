export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { generateMethod4Image } from '@/services/generation/imageGenerator';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { prompt, stylePrompt, referenceBase64, characterDescription, age, seed, secondReferenceBase64 } = body;

        if (!prompt || !referenceBase64) {
            return NextResponse.json({ error: "Missing required inputs for image generation" }, { status: 400 });
        }

        const result = await generateMethod4Image(
            prompt,
            stylePrompt,
            referenceBase64,
            characterDescription,
            age,
            seed,
            secondReferenceBase64
        );

        return NextResponse.json(result);

    } catch (error: any) {
        console.error("Image Generation API Error:", error);
        console.error("Stack:", error.stack);
        try {
            const fs = require('fs');
            fs.appendFileSync('latest_crash.txt', `\n--- CRASH AT ${new Date().toISOString()} ---\n${error.stack || error.message}\n`);
        } catch (e) { }
        return NextResponse.json(
            { error: error.message || "Unknown server error during image generation" },
            { status: 500 }
        );
    }
}

