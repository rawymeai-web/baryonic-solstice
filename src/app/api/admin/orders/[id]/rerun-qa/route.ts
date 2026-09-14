import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';
import { QualityAgent } from '@/services/visual/qualityAgent';

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
        const spread = spreadIndex === 0 || spreadIndex === 'cover' 
            ? (storyData.spreads?.[0] || { illustrationUrl: storyData.coverImageUrl, text: storyData.title, actualPrompt: storyData.actualCoverPrompt })
            : storyData.spreads?.[spreadIndex];

        const resolvedImageUrl = illustrationUrl || spread?.illustrationUrl || storyData.coverImageUrl;
        const resolvedPrompt = targetPrompt || spread?.actualPrompt || storyData.actualCoverPrompt || '';
        const resolvedText = spreadText || spread?.text || storyData.title || '';
        const resolvedSide = currentTextSide || spread?.textSide || 'left';

        if (!resolvedImageUrl) {
            return NextResponse.json({ error: 'No image found for this spread to evaluate' }, { status: 400 });
        }

        // 2. Fetch Character DNA References
        const { data: dnaRecords } = await supabase
            .from('order_dna')
            .select('*')
            .eq('order_id', order.order_number);

        const heroADNA = dnaRecords?.find((r: any) => r.hero_label === 'Hero A' && r.image_type === 'Stylized DNA')?.image_url
            || storyData.mainCharacter?.imageDNA?.[0]
            || storyData.styleReferenceImageUrl;

        const heroARaw = dnaRecords?.find((r: any) => r.hero_label === 'Hero A' && r.image_type === 'Original Photo')?.image_url
            || storyData.mainCharacter?.imageRawUrl
            || storyData.mainCharacter?.imageBases64?.[0];

        const heroBDNA = dnaRecords?.find((r: any) => r.hero_label === 'Hero B' && r.image_type === 'Stylized DNA')?.image_url
            || storyData.secondCharacter?.imageDNA?.[0];

        const heroBRaw = dnaRecords?.find((r: any) => r.hero_label === 'Hero B' && r.image_type === 'Original Photo')?.image_url
            || storyData.secondCharacter?.imageRawUrl;

        // 3. Determine Iteration Number
        const numericIndex = spreadIndex === 'cover' ? 0 : Number(spreadIndex);
        const { data: existingLogs } = await supabase
            .from('generation_quality_logs')
            .select('iteration_number')
            .eq('order_id', order.order_number)
            .eq('spread_number', numericIndex)
            .order('iteration_number', { ascending: false })
            .limit(1);

        const nextIteration = (existingLogs?.[0]?.iteration_number || 0) + 1;

        console.log(`[RerunQA] Running QA Evaluation for Order ${order.order_number} Spread ${numericIndex} (Iteration ${nextIteration})...`);

        // 4. Run QualityAgent Evaluation
        const qcResult = await QualityAgent.evaluateImage({
            generatedImageBase64: resolvedImageUrl,
            heroRawBase64: heroARaw,
            heroDNABase64: heroADNA,
            secondRawBase64: heroBRaw,
            secondDNABase64: heroBDNA,
            pageType: numericIndex === 0 ? 'Cover' : 'Spread',
            currentTextSide: resolvedSide,
            targetPrompt: resolvedPrompt,
            orderId: order.order_number,
            spreadIndex: numericIndex,
            spreadText: resolvedText,
            iterationNumber: nextIteration,
            childAge: storyData.childAge || '4'
        });

        console.log(`[RerunQA] Result: Likeness=${qcResult.likenessScore}/10, Style=${qcResult.styleConsistencyStatus}, Narrative=${qcResult.narrativeAdherenceStatus}, Decision=${qcResult.overallDecision}`);

        // 5. Insert to generation_quality_logs
        const logEntry = {
            order_id: order.order_number,
            spread_number: numericIndex,
            iteration_number: nextIteration,
            image_url: resolvedImageUrl,
            character_consistency_status: qcResult.characterConsistencyStatus,
            character_reasoning: `[Likeness: ${qcResult.likenessScore}/10] [Visual: ${qcResult.visualDescription}] [Narrative Check: ${qcResult.narrativeAdherenceStatus}] ${qcResult.characterReasoning}`,
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

        // 6. Update Story Data qcStatus
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
