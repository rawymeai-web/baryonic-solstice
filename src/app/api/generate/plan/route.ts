export const maxDuration = 300;

import { NextResponse } from 'next/server';
import { generateVisualPlan } from '@/services/visual/director';
import { getStyleProfile } from '@/services/visual/styles/styleRegistry';

function buildHeroProfiles(frontendHeroes: any[]) {
    return frontendHeroes.map((h, i) => ({
        hero_id: `hero_${i+1}`,
        token: `[[HERO_${i+1}]]`,
        role: h.role || (i === 0 ? "primary" : "secondary"),
        identity_anchor_image_index: h.identity_image_id ? (i * 2) + 1 : -1,
        stylized_dna_image_index: h.style_dna_image_id ? (i * 2) + 2 : undefined,
        real_photo_role: "identity only" as const,
        stylized_reference_role: "outfit and character design only" as const,
        likeness_rules: {
            preserve: ["facial likeness", "face shape", "eye spacing", "eyebrow shape", "nose proportions", "smile shape", "skin tone", "hair color", "hairstyle"],
            avoid: ["pose", "lighting", "realism level", "photographic rendering", "background", "crop"],
            translation_rule: "Preserve each hero's key identity cues from the real photo, but translate every feature into the selected global style."
        },
        clothing_lock: "Use the approved clothing from the character design reference.",
        hair_lock: undefined,
        accessory_lock: undefined
    }));
}

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const selectedStyleId = body.selected_style_id || "premium_3d_adventure";
        const visualDNA = body.visualDNA || body.technicalStyleGuide || body.selectedStylePrompt || body.themeVisualDNA;
        let frontendHeroes = body.heroes;
        
        // If the list is empty, it's a legacy order. Reconstruct the registry on the fly.
        if (!frontendHeroes || frontendHeroes.length === 0) {
            frontendHeroes = [];
            if (visualDNA || body.script) {
                // Primary Hero
                frontendHeroes.push({ role: "primary", identity_image_id: "legacy_main", style_dna_image_id: "legacy_dna" });

                // Secondary Hero
                if (body.hasSecondHero || (body.secondCharacter && Object.keys(body.secondCharacter).length > 0)) {
                    frontendHeroes.push({ role: "secondary", identity_image_id: "legacy_second", style_dna_image_id: "legacy_second_dna" });
                }
            }
        }

        const script = body.script;
        const blueprint = body.blueprint;
        const spreadCount = body.spreadCount || 8;

        if (!script || !blueprint) {
            return NextResponse.json({ error: "Missing required inputs for visual planning" }, { status: 400 });
        }

        let styleProfile = getStyleProfile(selectedStyleId);

        // Map default 3D style ID to soft_2d_storybook or custom_dynamic if visualDNA indicates watercolor/2D style
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

        const planResponse = await generateVisualPlan(script, blueprint, styleProfile, heroes, Number(spreadCount));

        return NextResponse.json({
            plan: planResponse.result,
            log: planResponse.log
        });

    } catch (error: any) {
        console.error("Visual Plan API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
