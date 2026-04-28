export const maxDuration = 300;

import { NextResponse } from 'next/server';
import { describeSubject } from '@/services/generation/imageGenerator';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { imageBase64 } = body;

        if (!imageBase64) {
            return NextResponse.json({ error: "Missing required input for subject description" }, { status: 400 });
        }

        const description = await describeSubject(imageBase64);

        return NextResponse.json({ description });

    } catch (error: any) {
        console.error("Describe Subject API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

