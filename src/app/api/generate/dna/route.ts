export const maxDuration = 300;

import { NextResponse } from 'next/server';
import { generateThemeStylePreview, describeSubject, describeObjectProp, generateObjectStylePreview } from '@/services/generation/imageGenerator';

import { ART_STYLE_OPTIONS } from '@/constants';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { mainCharacter, secondCharacter, theme, style: styleId, age, occasion, customGoal } = body;
        let stylePrompt = '';
        if (styleId && typeof styleId === 'string') {
            const cleanStyleId = styleId.trim();
            if (cleanStyleId.startsWith('{') || cleanStyleId.startsWith('[')) {
                try {
                    const parsed = JSON.parse(cleanStyleId);
                    const parts = [];
                    if (parsed.positive_style_lock) {
                        parts.push(parsed.positive_style_lock);
                    }
                    const profile = parsed.style_profile || parsed.styleProfile;
                    if (profile) {
                        if (profile.rendering_mode) parts.push(`Style rendering: ${profile.rendering_mode}`);
                        if (profile.line_treatment) parts.push(`Lines: ${profile.line_treatment}`);
                        if (profile.shading_treatment) parts.push(`Shading: ${profile.shading_treatment}`);
                        if (profile.texture_treatment) parts.push(`Texture: ${profile.texture_treatment}`);
                        if (profile.lighting_treatment) parts.push(`Lighting: ${profile.lighting_treatment}`);
                        if (profile.background_treatment) parts.push(`Background: ${profile.background_treatment}`);
                    }
                    const globalCtx = parsed.global_context || parsed.globalContext;
                    if (globalCtx) {
                        if (globalCtx.lighting) {
                            if (typeof globalCtx.lighting === 'string') {
                                parts.push(`Lighting: ${globalCtx.lighting}`);
                            } else if (typeof globalCtx.lighting === 'object') {
                                parts.push(`Lighting: ${Object.entries(globalCtx.lighting).map(([k, v]) => `${k} is ${v}`).join(', ')}`);
                            }
                        }
                        if (globalCtx.color_palette) {
                            const cp = globalCtx.color_palette;
                            if (cp.accent_colors && Array.isArray(cp.accent_colors)) {
                                parts.push(`Color accent: ${cp.accent_colors.join(', ')}`);
                            }
                            if (cp.contrast_level) {
                                parts.push(`Color contrast: ${cp.contrast_level}`);
                            }
                        }
                    }
                    const bgDetails = parsed.background_details || parsed.backgroundDetails;
                    if (bgDetails) {
                        if (bgDetails.texture) parts.push(`Background texture: ${bgDetails.texture}`);
                    }
                    stylePrompt = parts.join('. ') || styleId;
                } catch (e) {
                    stylePrompt = styleId;
                }
            } else {
                // 1. Look up in ART_STYLE_OPTIONS from constants
                const matchingOption = ART_STYLE_OPTIONS.find((o: any) => o.name.toLowerCase() === cleanStyleId.toLowerCase());
                if (matchingOption) {
                    stylePrompt = matchingOption.prompt;
                } else {
                    // 2. Look up in Style Registry
                    const { getAllStyles } = require('@/services/visual/styles/styleRegistry');
                    const allStyles = getAllStyles();
                    const registryStyle = allStyles.find((s: any) => s.style_id === cleanStyleId);
                    if (registryStyle) {
                        stylePrompt = registryStyle.positive_style_lock;
                    } else {
                        stylePrompt = styleId;
                    }
                }
            }
        } else {
            const { getStyleProfile } = require('@/services/visual/styles/styleRegistry');
            const styleProfile = getStyleProfile('premium_3d_adventure');
            stylePrompt = styleProfile.positive_style_lock;
        }

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
