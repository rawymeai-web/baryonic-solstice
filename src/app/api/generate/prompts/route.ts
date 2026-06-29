export const maxDuration = 300;

import { NextResponse } from 'next/server';
import { generatePrompts } from '@/services/visual/promptEngineer';
import { runIllustratorPass } from '@/services/visual/illustratorAgent';
import { getStyleProfile } from '@/services/visual/styles/styleRegistry';

/**
 * DNA-ONLY MODE (v6.0)
 * 
 * Each hero gets exactly ONE image — their approved stylized DNA reference.
 * No raw photos. No fusion. No real-photo identity anchors.
 * 
 * Image payload order: [HERO_1_DNA, HERO_2_DNA]
 * Prompt says:         Image 1 = HERO_1,  Image 2 = HERO_2
 * 
 * Simple. No ambiguity. The AI just places the character in the scene.
 */
function buildHeroProfiles(frontendHeroes: any[]) {
    let currentImageIndex = 1;

    return frontendHeroes.map((h, i) => {
        const profile = {
            hero_id: `hero_${i + 1}`,
            token: `[[HERO_${i + 1}]]`,
            name: h.name || (i === 0 ? 'Primary Hero' : 'Secondary Hero'),
            role: (h.role || (i === 0 ? 'primary' : 'secondary')) as 'primary' | 'secondary' | 'supporting',

            // DNA-only: identity_anchor is -1 (no raw photo), DNA gets the index
            identity_anchor_image_index: -1,
            stylized_dna_image_index: currentImageIndex,

            // Required by HeroProfile type
            real_photo_role: 'identity only' as const,
            likeness_rules: {
                preserve: ['facial likeness', 'face shape', 'skin tone', 'hair color', 'hairstyle', 'eye color'],
                avoid: ['pose', 'lighting', 'background', 'photographic rendering'],
                translation_rule: 'Translate every feature into the selected global art style while preserving character identity.'
            }
        };

        currentImageIndex += 1; // Exactly 1 image per hero

        return profile;
    });
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const selectedStyleId = body.selected_style_id;
        let frontendHeroes = body.heroes;

        // Extract custom visualDNA from various possible payload fields
        const visualDNA = body.visualDNA || body.technicalStyleGuide || body.selectedStylePrompt || body.themeVisualDNA;

        // Legacy order fallback: reconstruct hero list if empty
        if (!frontendHeroes || frontendHeroes.length === 0) {
            frontendHeroes = [];
            if (body.visualDNA || body.plan || body.script) {
                // Primary Hero
                frontendHeroes.push({ role: 'primary', style_dna_image_id: 'legacy_dna_1' });
                // Secondary Hero
                if (body.hasSecondHero || (body.secondCharacter && Object.keys(body.secondCharacter).length > 0)) {
                    frontendHeroes.push({ role: 'secondary', style_dna_image_id: 'legacy_dna_2' });
                }
            }
        }


        const plan = body.plan;
        const blueprint = body.blueprint;

        if (!plan) {
            return NextResponse.json({ error: "Missing required inputs for prompt engineering" }, { status: 400 });
        }

        let styleProfile = getStyleProfile(selectedStyleId);

        // CRITICAL FIX: If no hardcoded style ID is provided OR it's the default 3D style, 
        // map to soft_2d_storybook or custom dynamic profile using the visualDNA to prevent 3D defaults from polluting custom styles
        const isDefault3D = !selectedStyleId || selectedStyleId === 'premium_3d_adventure';
        if (isDefault3D && visualDNA) {
            const isWatercolor = /watercolor|painterly|storybook|pencil|gouache|2d/i.test(visualDNA);
            if (isWatercolor) {
                styleProfile = getStyleProfile("soft_2d_storybook");
            } else {
                styleProfile = {
                    style_id: "custom_dynamic",
                    style_name: "Custom Dynamic Style",
                    style_family: "custom",
                    positive_style_lock: visualDNA,
                    character_rendering_rules: "Characters must look like stylized versions of the real children matching the requested art style exactly, not realistic portraits.",
                    environment_rendering_rules: "The environment must belong to the requested art style world.",
                    lighting_rules: "",
                    color_rules: "",
                    texture_rules: "",
                    forbidden_styles: [
                        "photorealistic",
                        "real photographic depth of field"
                    ],
                    identity_translation_rule: "Use real photos only for identity cues. Preserve resemblance, but translate all features into the selected stylized style."
                } as any;
            }
        }

        const heroes = buildHeroProfiles(frontendHeroes);

        // 1. Generate Raw Prompts using the new JSON Architecture Schema Compiler
        const engineerResponse = await generatePrompts(plan, blueprint, styleProfile, heroes);

        // 2. Illustrator Pass (Advanced QA)
        // Now running properly using the structured style profile and targeted prompt elements
        const qaResponse = await runIllustratorPass(engineerResponse.result, blueprint, styleProfile, heroes);

        return NextResponse.json({
            prompts: qaResponse.result,
            logs: [engineerResponse.log, qaResponse.log]
        });

    } catch (error: any) {
        console.error("Prompt Engineering API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
