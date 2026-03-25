
import { NextResponse } from 'next/server';
import { generateBlueprint } from '@/services/story/blueprintAgent';
import { generateStoryDraft } from '@/services/story/narrativeAgent';
import { runEditorPass } from '@/services/story/editorAgent';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { storyData, language, blueprint } = body;

        if (!storyData || !language || !blueprint) {
            return NextResponse.json({ error: "Missing story data, language, or blueprint" }, { status: 400 });
        }

        // 1. Generate Narrative (Raw Draft) using the provided Blueprint
        const narrativeResponse = await generateStoryDraft(blueprint, language, storyData.childName, storyData.childGender, storyData.secondCharacter);
        if (narrativeResponse.log.status === 'Failed') {
            return NextResponse.json({ error: "Narrative generation failed", details: narrativeResponse.log.outputs.error }, { status: 500 });
        }

        // 2. QA Editor Pass (Flow, Logic, Pacing)
        const editorResponse = await runEditorPass(
            narrativeResponse.result,
            blueprint,
            language,
            storyData.childName,
            storyData.childAge
        );

        return NextResponse.json({
            rawScript: narrativeResponse.result, // Send RAW script
            script: editorResponse.result, // Send the EDITED script
            logs: [narrativeResponse.log, editorResponse.log]
        });

    } catch (error: any) {
        console.error("Story Generation API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
