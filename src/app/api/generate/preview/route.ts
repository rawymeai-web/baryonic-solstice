export const maxDuration = 60;

import { NextResponse } from 'next/server';
import { generateThemeStylePreview } from '@/services/generation/imageGenerator';
import { Character } from '@/types';
import { INITIAL_THEMES } from '@/constants';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { character, secondCharacter, themeDescription, themeId, stylePrompt, age } = body;

        // DEBUG: Log raw incoming data
        console.log("=== PREVIEW API ROUTE DEBUG ===");
        console.log("Raw body keys:", Object.keys(body));
        console.log("Character received:", {
            name: character?.name,
            hasImages: !!character?.imageBases64,
            imageCount: character?.imageBases64?.length || 0,
            firstImageLength: character?.imageBases64?.[0]?.length || 0
        });
        console.log("Theme ID:", themeId);
        console.log("Theme Description:", themeDescription);
        console.log("Style Prompt:", stylePrompt);
        console.log("Age:", age);

        // Lookup visual DNA if themeId is provided
        const selectedTheme = themeId ? INITIAL_THEMES.find(t => t.id === themeId) : null;
        const visualDNA = selectedTheme?.visualDNA || "";
        const finalThemeDescription = themeDescription + (visualDNA ? ` (Visual Style: ${visualDNA})` : "");

        console.log("--- PROCESSED DATA ---");
        console.log(`Selected Theme Object:`, selectedTheme ? { id: selectedTheme.id, title: selectedTheme.title } : 'None');
        console.log(`Visual DNA: ${visualDNA}`);
        console.log(`Final Theme Desc: ${finalThemeDescription}`);
        console.log("=== END API DEBUG ===");

        if (!character || !themeDescription || !stylePrompt) {
            console.error("VALIDATION ERROR: Missing required inputs");
            return NextResponse.json({ error: "Missing required inputs for theme preview" }, { status: 400 });
        }

        // Generate primary character preview
        const primaryPromise = generateThemeStylePreview(
            character as Character,
            undefined,
            finalThemeDescription,
            stylePrompt,
            age || "5"
        );

        let secondaryPromise: Promise<{ imageBase64: string; prompt: string }> | null = null;
        if (secondCharacter && secondCharacter.imageBases64 && secondCharacter.imageBases64.length > 0) {
            console.log("=== INITIATING SECONDARY CHARACTER PREVIEW ===");
            secondaryPromise = generateThemeStylePreview(
                secondCharacter as Character,
                undefined,
                finalThemeDescription,
                stylePrompt,
                secondCharacter.age || age || "5"
            );
        }

        const [primaryResult, secondaryResult] = await Promise.all([
            primaryPromise,
            secondaryPromise ? secondaryPromise : Promise.resolve(null)
        ]);

        console.log("=== PREVIEW GENERATION SUCCESS ===");
        console.log("Primary image length:", primaryResult.imageBase64.length);
        if (secondaryResult) {
            console.log("Secondary image length:", secondaryResult.imageBase64.length);
        }

        return NextResponse.json({
            imageBase64: primaryResult.imageBase64,
            prompt: primaryResult.prompt,
            secondImageBase64: secondaryResult?.imageBase64,
            secondPrompt: secondaryResult?.prompt
        });

    } catch (error: any) {
        console.error("=== THEME PREVIEW API ERROR ===");
        console.error("Error message:", error.message);
        console.error("Error stack:", error.stack);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

