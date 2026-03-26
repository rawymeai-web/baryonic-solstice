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

        // 1. Prepare Promises: Run physical descriptions and rendering completely in parallel to save time.
        const desc1Promise = describeSubject(mainCharacter.imageBases64[0]);
        
        const desc2Promise = (secondCharacter && secondCharacter.imageBases64 && secondCharacter.imageBases64[0]) 
            ? describeSubject(secondCharacter.imageBases64[0]) 
            : Promise.resolve("");

        const primaryPromise = generateThemeStylePreview(
            mainCharacter,
            undefined, // Do NOT combine them!
            theme, style, age, undefined, occasion, customGoal
        );

        const secondaryPromise = (secondCharacter && secondCharacter.imageBases64 && secondCharacter.imageBases64.length > 0)
            ? generateThemeStylePreview(
                secondCharacter as any,
                undefined,
                theme, style, secondCharacter.age || age, undefined, occasion, customGoal
            )
            : Promise.resolve(null);

        // Await all 4 promises concurrently (cuts time from ~50s down to ~20s)
        const [description, secondDescription, primaryResult, secondaryResult] = await Promise.all([
            desc1Promise,
            desc2Promise,
            primaryPromise,
            secondaryPromise
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
