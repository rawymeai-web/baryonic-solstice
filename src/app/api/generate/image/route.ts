export const maxDuration = 300;

import { NextResponse } from 'next/server';
import { generateMethod4Image } from '@/services/generation/imageGenerator';
import { ServerLogger } from '@/utils/serverLogger';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const {
            prompt,
            stylePrompt,
            characterDescription,
            age,
            seed,
            // DNA-ONLY (v6.0): Only these two fields matter.
            // heroDNABase64    = HERO_1 approved stylized DNA image (Image 1 in prompt)
            // secondDNABase64  = HERO_2 approved stylized DNA image (Image 2 in prompt)
            // Raw photo fields are accepted in the body but intentionally NOT used.
            heroDNABase64,
            secondDNABase64,
            secondCharacterDescription,
            // Legacy field aliases (kept for backwards compatibility with old frontend calls)
            referenceBase64,
            secondReferenceBase64,
        } = body;

        // DNA-ONLY: Always exactly 1 image per hero.
        // Fall back to referenceBase64 / secondReferenceBase64 only for legacy callers.
        const resolvedHeroA: string | string[] = heroDNABase64 || referenceBase64;
        const resolvedHeroB: string | string[] | undefined = secondDNABase64 || secondReferenceBase64 || undefined;

        ServerLogger.log('IMAGE_GENERATION_REQUEST', {
            mode: 'DNA-Only v6.0',
            heroA_hasImage: !!resolvedHeroA,
            heroA_imageCount: Array.isArray(resolvedHeroA) ? resolvedHeroA.length : (resolvedHeroA ? 1 : 0),
            heroB_hasImage: !!resolvedHeroB,
            heroB_imageCount: Array.isArray(resolvedHeroB) ? resolvedHeroB.length : (resolvedHeroB ? 1 : 0),
            promptLength: prompt?.length,
            warning: body.heroRawBase64 ? 'RAW PHOTO WAS SENT BUT IGNORED (DNA-only mode)' : undefined,
        });


        if (!prompt || !resolvedHeroA) {
            ServerLogger.error('IMAGE_GENERATION_VALIDATION_FAILED', new Error("Missing required inputs"), { bodyKeys: Object.keys(body) });
            return NextResponse.json({ error: "Missing required inputs for image generation" }, { status: 400 });
        }

        const result = await generateMethod4Image(
            prompt,
            stylePrompt,
            resolvedHeroA,
            characterDescription,
            age,
            seed,
            resolvedHeroB,
            secondCharacterDescription
        );

        ServerLogger.log('IMAGE_GENERATION_SUCCESS', {
            returnedBase64Length: result.imageBase64?.length,
            returnedFullPromptLength: result.fullPrompt?.length,
        });

        return NextResponse.json({
            imageBase64: result.imageBase64,
            fullPrompt: result.fullPrompt,   // Actual prompt sent to Gemini
            seedPrompt: result.seedPrompt,   // Original raw seed (v4.0 JSON)
            modelUsed: result.modelUsed
        });

    } catch (error: any) {
        ServerLogger.error('IMAGE_GENERATION_CRASH', error);
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
