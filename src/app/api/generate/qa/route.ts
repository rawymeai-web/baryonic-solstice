import { NextResponse } from 'next/server';
import { runImageQACheck } from '../../../../services/visual/qaAgent';
import { supabase } from '../../../../utils/supabaseClient';

export const maxDuration = 300;

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { 
            orderId, 
            spreadIndex, 
            imageUrl, 
            blueprintJson, 
            dnaImages, 
            iterationNumber,
            
            // Legacy/pipeline base64 payload fields
            generatedImageBase64,
            heroRawBase64,
            heroDNABase64,
            pageType,
            currentTextSide,
            targetPrompt,
            secondRawBase64,
            secondDNABase64
        } = body;

        let resultImageBase64 = "";
        let finalDnaImages: { base64: string, label: string }[] = [];
        let finalBlueprintJson = blueprintJson;

        const isLegacyFormat = !!generatedImageBase64;

        if (isLegacyFormat) {
            resultImageBase64 = generatedImageBase64;
            
            // Build DNA reference images list
            if (heroDNABase64) {
                finalDnaImages.push({ base64: heroDNABase64, label: "Hero DNA Reference" });
            } else if (heroRawBase64) {
                finalDnaImages.push({ base64: heroRawBase64, label: "Hero Raw Reference" });
            }
            if (secondDNABase64) {
                finalDnaImages.push({ base64: secondDNABase64, label: "Second Hero DNA Reference" });
            } else if (secondRawBase64) {
                finalDnaImages.push({ base64: secondRawBase64, label: "Second Hero Raw Reference" });
            }

            // Construct fallback blueprint description
            if (!finalBlueprintJson) {
                finalBlueprintJson = JSON.stringify({
                    page_type: pageType || "Spread",
                    image_prompt: targetPrompt || "",
                    text_placement: currentTextSide || "right"
                });
            }
        } else {
            // Standard format requires these inputs
            if (!orderId || typeof spreadIndex !== 'number' || !imageUrl || !dnaImages) {
                return NextResponse.json({ error: "Missing required inputs for QA check" }, { status: 400 });
            }

            // Fetch the generated image and convert to base64
            const imgResponse = await fetch(imageUrl);
            if (!imgResponse.ok) throw new Error("Failed to download generated image for QA check");
            const arrayBuffer = await imgResponse.arrayBuffer();
            resultImageBase64 = Buffer.from(arrayBuffer).toString('base64');
            finalDnaImages = dnaImages;
        }

        // Run the QA check using Gemini Vision
        const qaResult = await runImageQACheck(finalBlueprintJson, resultImageBase64, finalDnaImages);

        // Save the result to the database if order ID and spread index are provided
        let savedData = null;
        const targetOrderId = orderId || body.orderId;
        const targetSpreadIndex = typeof spreadIndex === 'number' ? spreadIndex : body.spreadIndex;

        if (targetOrderId && typeof targetSpreadIndex === 'number') {
            try {
                const { data, error } = await supabase
                    .from('generation_quality_logs')
                    .insert({
                        order_id: targetOrderId,
                        spread_number: targetSpreadIndex,
                        iteration_number: iterationNumber || 1,
                        image_url: imageUrl || null,
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
                } else {
                    savedData = data;
                }
            } catch (dbErr) {
                console.error("Error writing to database for QA log:", dbErr);
            }
        }

        // Return unified payload with both snake_case and camelCase keys
        const responsePayload = {
            ...(savedData || {}),
            ...qaResult,
            overallDecision: qaResult.overall_decision || qaResult.overallDecision,
            recommendedTextSide: qaResult.recommended_text_side || qaResult.recommendedTextSide,
            characterConsistencyStatus: qaResult.character_consistency_status || qaResult.characterConsistencyStatus,
            styleConsistencyStatus: qaResult.style_consistency_status || qaResult.styleConsistencyStatus,
            textClearanceStatus: qaResult.text_clearance_status || qaResult.textClearanceStatus,
            characterReasoning: qaResult.character_reasoning || qaResult.characterReasoning,
            styleReasoning: qaResult.style_reasoning || qaResult.styleReasoning,
            textReasoning: qaResult.text_reasoning || qaResult.textReasoning
        };

        return NextResponse.json(responsePayload);

    } catch (error: any) {
        console.error("QA Generation API Error:", error);
        return NextResponse.json(
            { error: error.message || "Unknown server error during QA generation" },
            { status: 500 }
        );
    }
}
