export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { generateThemeStylePreview, describeSubject } from '@/services/generation/imageGenerator';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { mainCharacter, secondCharacter, theme, style, age, occasion, customGoal } = body;

        if (!mainCharacter || !mainCharacter.imageBases64 || !mainCharacter.imageBases64[0]) {
            return NextResponse.json({ error: "Missing character image" }, { status: 400 });
        }

        // 1. Get physical descriptions (for character consistency)
        const description = await describeSubject(mainCharacter.imageBases64[0]);
        let secondDescription = "";

        if (secondCharacter && secondCharacter.imageBases64 && secondCharacter.imageBases64[0]) {
            secondDescription = await describeSubject(secondCharacter.imageBases64[0]);
        }

        // 2. Generate the "Artified" DNA Preview (Isolated)
        const primaryPromise = generateThemeStylePreview(
            mainCharacter,
            undefined, // Do NOT combine them!
            theme, style, age, undefined, occasion, customGoal
        );

        let secondaryPromise: Promise<any> | null = null;
        if (secondCharacter && secondCharacter.imageBases64 && secondCharacter.imageBases64.length > 0) {
            secondaryPromise = generateThemeStylePreview(
                secondCharacter as any,
                undefined,
                theme, style, secondCharacter.age || age, undefined, occasion, customGoal
            );
        }

        const [primaryResult, secondaryResult] = await Promise.all([
            primaryPromise,
            secondaryPromise || Promise.resolve(null)
        ]);

        return NextResponse.json({
            artifiedHeroBase64: primaryResult.imageBase64,
            secondArtifiedHeroBase64: secondaryResult?.imageBase64,
            physicalDescription: description,
            secondPhysicalDescription: secondDescription,
            styleUsed: primaryResult.styleUsed,
            fullPrompt: primaryResult.prompt
        });

    } catch (error: any) {
        console.error("DNA Generation API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

