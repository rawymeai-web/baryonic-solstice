export const maxDuration = 300;

import { NextResponse } from 'next/server';
import { generateThemeStylePreview, describeSubject, describeObjectProp, generateObjectStylePreview } from '@/services/generation/imageGenerator';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { mainCharacter, secondCharacter, theme, style: styleId, age, occasion, customGoal } = body;
        const { getStyleProfile } = require('@/services/visual/styles/styleRegistry');
        const styleProfile = getStyleProfile(styleId || 'premium_3d_adventure');
        const stylePrompt = styleProfile.positive_style_lock;

        if (!mainCharacter || !mainCharacter.imageBases64 || !mainCharacter.imageBases64[0]) {
            return NextResponse.json({ error: "Missing character image" }, { status: 400 });
        }

        const hasSecond = !!(secondCharacter && secondCharacter.imageBases64 && secondCharacter.imageBases64[0]);

        // Run ALL calls fully in parallel — descriptions + multi-angle renders for each character concurrently.
        const [
            heroA_Front, heroA_34, heroA_Body,
            heroB_Front, heroB_34, heroB_Body,
            description, secondDescription
        ] = await Promise.all([
            // 1. Hero A DNA Set
            generateThemeStylePreview(mainCharacter, undefined, theme, stylePrompt, age, 'front', undefined, occasion, customGoal),
            generateThemeStylePreview(mainCharacter, undefined, theme, stylePrompt, age, 'three_quarter', undefined, occasion, customGoal),
            generateThemeStylePreview(mainCharacter, undefined, theme, stylePrompt, age, 'full_body', undefined, occasion, customGoal),
            
            // 2. Hero B DNA Set (if present)
            hasSecond && secondCharacter.type !== 'object'
                ? generateThemeStylePreview(secondCharacter as any, undefined, theme, stylePrompt, secondCharacter.age || age, 'front', undefined, occasion, customGoal)
                : Promise.resolve(null),
            hasSecond && secondCharacter.type !== 'object'
                ? generateThemeStylePreview(secondCharacter as any, undefined, theme, stylePrompt, secondCharacter.age || age, 'three_quarter', undefined, occasion, customGoal)
                : Promise.resolve(null),
            hasSecond && secondCharacter.type !== 'object'
                ? generateThemeStylePreview(secondCharacter as any, undefined, theme, stylePrompt, secondCharacter.age || age, 'full_body', undefined, occasion, customGoal)
                : Promise.resolve(null),

            // 3. Describe Hero A
            describeSubject(mainCharacter.imageBases64[0]),

            // 4. Describe Hero B or Object
            hasSecond
                ? (secondCharacter.type === 'object'
                    ? describeObjectProp(secondCharacter.imageBases64[0])
                    : describeSubject(secondCharacter.imageBases64[0]))
                : Promise.resolve(""),
        ]);

        const heroADNA = [heroA_Front.imageBase64, heroA_34.imageBase64, heroA_Body.imageBase64];
        const heroBDNA = (heroB_Front && heroB_34 && heroB_Body) 
            ? [heroB_Front.imageBase64, heroB_34.imageBase64, heroB_Body.imageBase64]
            : (hasSecond && secondCharacter.type === 'object' ? [secondCharacter.imageBases64[0]] : []);

        return NextResponse.json({
            artifiedHeroBase64: heroA_Front.imageBase64, // Keep for legacy
            heroADNA,
            heroBDNA,
            physicalDescription: description,
            secondPhysicalDescription: secondDescription,
            styleUsed: heroA_Front.styleUsed,
            fullPrompt: heroA_Front.prompt
        });

    } catch (error: any) {
        console.error("DNA Generation API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
