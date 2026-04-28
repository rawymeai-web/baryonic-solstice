export const maxDuration = 300;
import { NextResponse } from 'next/server';
import { generateBlueprint } from '@/services/story/blueprintAgent';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { storyData, language, spreadCount = 8 } = body;

        if (!storyData || !language) {
            return NextResponse.json({ error: "Missing story data or language" }, { status: 400 });
        }

        const blueprintResponse = await generateBlueprint(storyData, language as 'en' | 'ar', Number(spreadCount));
        if (blueprintResponse.log.status === 'Failed') {
            return NextResponse.json({ error: "Blueprint generation failed", details: blueprintResponse.log.outputs.error }, { status: 500 });
        }

        return NextResponse.json({
            blueprint: blueprintResponse.result,
            log: blueprintResponse.log
        });

    } catch (error: any) {
        console.error("Blueprint API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
