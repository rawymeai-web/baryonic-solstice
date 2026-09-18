import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';
import { QualityAgent } from '@/services/visual/qualityAgent';
import { buildGenerationManifest, buildQualityCheckParams } from '@/services/visual/manifestBuilder';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id: orderId } = await context.params;
        const body = await req.json();
        const {
            spreadIndex,
            illustrationUrl,
            targetPrompt,
            spreadText,
            currentTextSide = 'left'
        } = body;

        if (spreadIndex === undefined || spreadIndex === null) {
            return NextResponse.json({ error: 'spreadIndex is required' }, { status: 400 });
        }

        // 1. Fetch Order from DB
        const { data: order, error: orderErr } = await supabase
            .from('orders')
            .select('*')
            .eq('order_number', orderId)
            .single();

        if (orderErr || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const storyData = typeof order.story_data === 'string' ? JSON.parse(order.story_data) : order.story_data;
        const numericIndex = spreadIndex === 'cover' ? 0 : Number(spreadIndex);
        const spread = numericIndex === 0 
            ? (storyData.spreads?.[0] || { illustrationUrl: storyData.coverImageUrl, text: storyData.title, actualPrompt: storyData.actualCoverPrompt })
            : storyData.spreads?.[numericIndex];

        const resolvedImageUrl = illustrationUrl || spread?.illustrationUrl || storyData.coverImageUrl;
        if (!resolvedImageUrl) {
            return NextResponse.json({ error: 'No image found for this spread to evaluate' }, { status: 400 });
        }

        // 2. Fetch Character DNA References
        const { data: dnaRecords } = await supabase
            .from('order_dna')
            .select('*')
            .eq('order_id', order.order_number);

        // 3. Build Authoritative Generation Manifest (allow missing DNA for draft QA inspection if needed)
        const manifest = buildGenerationManifest(storyData, order.order_number, dnaRecords || undefined, { allowMissingDnaForDraft: true });

        // 4. Determine Iteration Number
        const { data: existingLogs } = await supabase
            .from('generation_quality_logs')
            .select('iteration_number')
            .eq('order_id', order.order_number)
            .eq('spread_number', numericIndex)
            .order('iteration_number', { ascending: false })
            .limit(1);

        const nextIteration = (existingLogs?.[0]?.iteration_number || 0) + 1;

        console.log(`[RerunQA] Running QA Evaluation for Order ${order.order_number} Spread ${numericIndex} (Iteration ${nextIteration})...`);

        // 5. Construct QualityCheck Params from Manifest
        const qcParams = buildQualityCheckParams(manifest, numericIndex, resolvedImageUrl, nextIteration);
        if (targetPrompt) qcParams.targetPrompt = targetPrompt;
        if (spreadText) {
            qcParams.spreadText = spreadText;
            qcParams.storyText = spreadText;
        }
        if (currentTextSide) {
            qcParams.currentTextSide = currentTextSide;
            qcParams.layoutPlanSide = currentTextSide;
        }

        // 6. Run QualityAgent Evaluation
        const qcResult = await QualityAgent.evaluateImage(qcParams);

        console.log(`[RerunQA] Result: OverallLikeness=${qcResult.overallLikenessScore}/10, Style=${qcResult.styleConsistencyStatus}, Location=${qcResult.locationConsistencyStatus || 'n/a'}, Narrative=${qcResult.narrativeAdherenceStatus}, Decision=${qcResult.overallDecision}`);

        // 7. Insert to generation_quality_logs
        const logEntry = {
            order_id: order.order_number,
            spread_number: numericIndex,
            iteration_number: nextIteration,
            image_url: resolvedImageUrl,
            character_consistency_status: qcResult.characterConsistencyStatus,
            character_reasoning: `[Overall Likeness: ${qcResult.overallLikenessScore}/10] [Visual: ${qcResult.visualDescription}] [Narrative Check: ${qcResult.narrativeAdherenceStatus}] [Location: ${qcResult.locationConsistencyStatus || 'n/a'}] ${qcResult.characterReasoning}`,
            style_consistency_status: qcResult.styleConsistencyStatus,
            style_reasoning: qcResult.styleReasoning,
            text_clearance_status: qcResult.textClearanceStatus,
            text_reasoning: qcResult.textReasoning,
            recommended_text_side: qcResult.recommendedTextSide,
            overall_decision: qcResult.overallDecision
        };

        const { data: insertedLog, error: insertErr } = await supabase
            .from('generation_quality_logs')
            .insert(logEntry)
            .select()
            .single();

        if (insertErr) {
            console.error('[RerunQA] Failed to insert QA log:', insertErr);
        }

        // 8. Update Story Data qcStatus
        const mappedStatus = qcResult.overallDecision === 'pass' ? 'passed' : 'flagged';
        if (storyData.spreads?.[numericIndex]) {
            storyData.spreads[numericIndex].qcStatus = mappedStatus;
            storyData.spreads[numericIndex].textSide = qcResult.recommendedTextSide?.toLowerCase() || storyData.spreads[numericIndex].textSide;
        }
        if (numericIndex > 0 && storyData.pages?.[numericIndex - 1]) {
            storyData.pages[numericIndex - 1].qcStatus = mappedStatus;
            storyData.pages[numericIndex - 1].textSide = qcResult.recommendedTextSide?.toLowerCase() || storyData.pages[numericIndex - 1].textSide;
        }

        await supabase
            .from('orders')
            .update({ story_data: storyData })
            .eq('order_number', order.order_number);

        return NextResponse.json({
            success: true,
            qcResult,
            logEntry: insertedLog || logEntry
        });

    } catch (error: any) {
        console.error('[RerunQA] Server error:', error);
        return NextResponse.json({ error: error.message || 'QA evaluation failed' }, { status: 500 });
    }
}

