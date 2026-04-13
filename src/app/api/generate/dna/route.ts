export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { generateThemeStylePreview, describeSubject, describeObjectProp, generateObjectStylePreview } from '@/services/generation/imageGenerator';

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
            ? (secondCharacter.type === 'object' ? describeObjectProp(secondCharacter.imageBases64[0]) : describeSubject(secondCharacter.imageBases64[0]))
            : Promise.resolve("");

        // Step 1: Generate textual physical descriptions concurrently (2 API calls)
        const [description, secondDescription] = await Promise.all([
            desc1Promise,
            desc2Promise
        ]);

        // Step 2: Generate rendering previews concurrently AFTER identity is done (2 API calls)
        // This avoids hitting Google API with 4 massive concurrent multimodal requests which causes throttling/504s.
        const [primaryResult, secondaryResult] = await Promise.all([
            generateThemeStylePreview(
                mainCharacter,
                undefined, // Do NOT combine them!
                theme, style, age, undefined, occasion, customGoal
            ),
            (secondCharacter && secondCharacter.imageBases64 && secondCharacter.imageBases64.length > 0)
                ? (secondCharacter.type === 'object' 
                    ? generateObjectStylePreview(secondCharacter.imageBases64[0], style, secondDescription)
                    : generateThemeStylePreview(
                        secondCharacter as any,
                        undefined,
                        theme, style, secondCharacter.age || age, undefined, occasion, customGoal
                    ))
                : Promise.resolve(null)
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
