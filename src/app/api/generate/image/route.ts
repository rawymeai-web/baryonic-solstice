export const maxDuration = 300;

import { NextResponse } from 'next/server';
import { generateMethod4Image } from '@/services/generation/imageGenerator';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            prompt,
            stylePrompt,
            characterDescription,
            age,
            seed,
            // Support both old field name (referenceBase64) and new names (heroRawBase64/heroDNABase64)
            referenceBase64,
            heroRawBase64,
            heroDNABase64,
            secondReferenceBase64,
            secondRawBase64,
            secondDNABase64
        } = body;

        // DNA is the primary anchor; fall back to raw photo if DNA is missing
        const resolvedReference = heroDNABase64 || heroRawBase64 || referenceBase64;
        const resolvedSecondary = secondDNABase64 || secondRawBase64 || secondReferenceBase64;

        if (!prompt || !resolvedReference) {
            console.error("Missing inputs — prompt:", !!prompt, "reference:", !!resolvedReference, "body keys:", Object.keys(body));
            return NextResponse.json({ error: "Missing required inputs for image generation" }, { status: 400 });
        }

        const result = await generateMethod4Image(
            prompt,
            stylePrompt,
            resolvedReference,
            characterDescription,
            age,
            seed,
            resolvedSecondary
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

