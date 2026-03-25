
import { NextResponse } from 'next/server';
import { generateTechnicalStyleGuide } from '@/services/generation/imageGenerator';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { imageBase64, stylePrompt } = body;

        if (!imageBase64 || !stylePrompt) {
            return NextResponse.json({ error: "Missing required inputs for style guide" }, { status: 400 });
        }

        const guide = await generateTechnicalStyleGuide(imageBase64, stylePrompt);

        return NextResponse.json({ guide });

    } catch (error: any) {
        console.error("Style Guide API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
