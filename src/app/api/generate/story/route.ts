export const maxDuration = 300;
import { NextResponse } from 'next/server';
import { generateStoryDraft } from '@/services/story/narrativeAgent';
import { runEditorPass } from '@/services/story/editorAgent';
import { ServerLogger } from '@/utils/serverLogger';

export async function POST(req: Request) {
    const startTime = Date.now();
    try {
        const body = await req.json();
        const { storyData, language, blueprint, spreadCount = 8 } = body;

        ServerLogger.log('STORY_GENERATION_START', {
            childName: storyData?.childName,
            language,
            spreadCount,
            hasBlueprint: !!blueprint
        });

        if (!storyData || !language || !blueprint) {
            return NextResponse.json({ error: "Missing story data, language, or blueprint" }, { status: 400 });
        }

        // 1. Generate Narrative (Raw Draft)
        ServerLogger.log('STORY_PHASE_1_DRAFTING');
        const narrativeResponse = await generateStoryDraft(blueprint, language, storyData.childName, storyData.childGender, storyData.secondCharacter, Number(spreadCount), storyData.customStoryText);
        
        if (narrativeResponse.log.status === 'Failed') {
            ServerLogger.error('STORY_DRAFT_FAILED', new Error(narrativeResponse.log.outputs.error));
            return NextResponse.json({ error: "Narrative generation failed", details: narrativeResponse.log.outputs.error }, { status: 500 });
        }

        // 2. QA Editor Pass (Flow, Logic, Pacing)
        ServerLogger.log('STORY_PHASE_2_EDITING', { draftPages: narrativeResponse.result?.length });
        const editorResponse = await runEditorPass(
            narrativeResponse.result,
            blueprint,
            language,
            storyData.childName,
            storyData.childAge,
            storyData.secondCharacter,
            storyData.customStoryText
        );

        if (editorResponse.log.status === 'Failed' || editorResponse.log.outputs?.validationValid === false) {
            ServerLogger.error('STORY_VALIDATION_FAILED', new Error("Editor validation failed"));
            return NextResponse.json({
                error: "Story failed editor quality validation",
                details: editorResponse.log.outputs?.qualityErrors || editorResponse.log.outputs?.error || "Invalid manuscript",
                validationErrors: editorResponse.log.outputs?.qualityErrors,
                logs: [narrativeResponse.log, editorResponse.log]
            }, { status: 422 });
        }

        const duration = Date.now() - startTime;
        ServerLogger.log('STORY_GENERATION_COMPLETE', { durationMs: duration });

        return NextResponse.json({
            rawScript: narrativeResponse.result,
            script: editorResponse.result,
            story_engine: 'v2-master-writer',
            story_generated_at: new Date().toISOString(),
            logs: [narrativeResponse.log, editorResponse.log]
        });

    } catch (error: any) {
        ServerLogger.error('STORY_GENERATION_CRASH', error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}

