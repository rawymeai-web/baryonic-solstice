import { NextResponse } from 'next/server';
import { runImageQACheck } from '../../../../services/visual/qaAgent';
import { supabase } from '../../../../utils/supabaseClient';

export const maxDuration = 300;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { orderId, spreadIndex, imageUrl, blueprintJson, dnaImages, iterationNumber } = body;

        if (!orderId || typeof spreadIndex !== 'number' || !imageUrl || !dnaImages) {
            return NextResponse.json({ error: "Missing required inputs for QA check" }, { status: 400 });
        }

        // Fetch the generated image and convert to base64
        const imgResponse = await fetch(imageUrl);
        if (!imgResponse.ok) throw new Error("Failed to download generated image for QA check");
        const arrayBuffer = await imgResponse.arrayBuffer();
        const resultImageBase64 = Buffer.from(arrayBuffer).toString('base64');

        // Run the QA check using Gemini Vision
        const qaResult = await runImageQACheck(blueprintJson, resultImageBase64, dnaImages);

        // Save the result to the database
        const { data, error } = await supabase
            .from('generation_quality_logs')
            .insert({
                order_id: orderId,
                spread_number: spreadIndex,
                iteration_number: iterationNumber || 1,
                image_url: imageUrl,
                character_consistency_status: qaResult.character_consistency_status,
                character_reasoning: qaResult.character_reasoning,
                style_consistency_status: qaResult.style_consistency_status,
                style_reasoning: qaResult.style_reasoning,
                text_clearance_status: qaResult.text_clearance_status,
                text_reasoning: qaResult.text_reasoning,
                recommended_text_side: qaResult.recommended_text_side,
                overall_decision: qaResult.overall_decision
            })
            .select()
            .single();

        if (error) {
            console.error("Supabase insert error for QA log:", error);
            throw new Error("Failed to save QA log to database");
        }

        return NextResponse.json(data);

    } catch (error: any) {
        console.error("QA Generation API Error:", error);
        return NextResponse.json(
            { error: error.message || "Unknown server error during QA generation" },
            { status: 500 }
        );
    }
}
