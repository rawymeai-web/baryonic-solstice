export const maxDuration = 300;

import { NextResponse } from 'next/server';
import { generateStoryDraft } from '@/services/story/narrativeAgent';
import { runEditorPass } from '@/services/story/editorAgent';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { storyData, language, blueprint, spreadCount = 8 } = body;

        if (!storyData || !language || !blueprint) {
            return NextResponse.json({ error: "Missing story data, language, or blueprint" }, { status: 400 });
        }

        // 1. Generate Narrative (Raw Draft) using the provided Blueprint
        const narrativeResponse = await generateStoryDraft(blueprint, language, storyData.childName, storyData.childGender, storyData.secondCharacter, Number(spreadCount), storyData.customStoryText);
        if (narrativeResponse.log.status === 'Failed') {
            return NextResponse.json({ error: "Narrative generation failed", details: narrativeResponse.log.outputs.error }, { status: 500 });
        }

        // 2. QA Editor Pass (Flow, Logic, Pacing)
        const editorResponse = await runEditorPass(
            narrativeResponse.result,
            blueprint,
            language,
            storyData.childName,
            storyData.childAge,
            storyData.customStoryText
        );

        return NextResponse.json({
            rawScript: narrativeResponse.result,
            script: editorResponse.result,
            logs: [narrativeResponse.log, editorResponse.log]
        });

    } catch (error: any) {
        console.error("Story Generation API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
