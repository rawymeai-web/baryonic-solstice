export const maxDuration = 300;

import { NextResponse } from 'next/server';
import { generateThemeStylePreview, describeSubject, describeObjectProp, generateObjectStylePreview } from '@/services/generation/imageGenerator';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { mainCharacter, secondCharacter, theme, style, age, occasion, customGoal } = body;

        if (!mainCharacter || !mainCharacter.imageBases64 || !mainCharacter.imageBases64[0]) {
            return NextResponse.json({ error: "Missing character image" }, { status: 400 });
        }

        const hasSecond = !!(secondCharacter && secondCharacter.imageBases64 && secondCharacter.imageBases64[0]);

        // Run ALL 4 calls fully in parallel — description + render for each character concurrently.
        // Previously was 2 sequential waves; this cuts total wall-clock time roughly in half.
        const [primaryResult, secondaryResult, description, secondDescription] = await Promise.all([
            // 1. Render Hero A DNA image
            generateThemeStylePreview(
                mainCharacter,
                undefined,
                theme, style, age, undefined, occasion, customGoal
            ),
            // 2. Render Hero B DNA image (if present)
            hasSecond
                ? (secondCharacter.type === 'object'
                    ? generateObjectStylePreview(secondCharacter.imageBases64[0], style, '')
                    : generateThemeStylePreview(
                        secondCharacter as any,
                        undefined,
                        theme, style, secondCharacter.age || age, undefined, occasion, customGoal
                    ))
                : Promise.resolve(null),
            // 3. Describe Hero A (for text output — used by downstream pipeline steps)
            describeSubject(mainCharacter.imageBases64[0]),
            // 4. Describe Hero B (if present)
            hasSecond
                ? (secondCharacter.type === 'object'
                    ? describeObjectProp(secondCharacter.imageBases64[0])
                    : describeSubject(secondCharacter.imageBases64[0]))
                : Promise.resolve(""),
        ]);

        return NextResponse.json({
            artifiedHeroBase64: primaryResult.imageBase64,
            secondArtifiedHeroBase64: (secondaryResult as any)?.imageBase64,
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
