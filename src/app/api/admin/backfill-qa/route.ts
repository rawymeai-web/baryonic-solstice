import { NextRequest, NextResponse } from "next/server";
import { supabase } from "@/utils/supabaseClient";
import { QualityAgent } from "@/services/visual/qualityAgent";

/**
 * POST /api/admin/backfill-qa
 *
 * Fetches orders that already have generated images, runs the QA Agent
 * against each spread's image, and writes reports to generation_quality_logs.
 *
 * Body params (optional):
 *   orderId: string  — limit backfill to a single order
 *   limit: number    — max number of spreads to process (default 20)
 */
export async function POST(req: NextRequest) {
  const logs: string[] = [];
  const log = (msg: string) => {
    console.log(msg);
    logs.push(msg);
  };

  try {
    const body = await req.json().catch(() => ({}));
    const targetOrderId: string | undefined = body.orderId;
    const maxSpreads: number = body.limit || 20;

    log(
      `[QA Backfill] Starting. Target: ${targetOrderId || "all recent orders"}, Limit: ${maxSpreads} spreads.`,
    );

    // 1. Fetch orders that have generated pages
    let query = supabase
      .from("orders")
      .select("order_number, story_data, generation_snapshot")
      .in("status", [
        "illustrations_ready",
        "softcopy_ready",
        "delivered",
        "completed",
        "stitching",
      ])
      .order("created_at", { ascending: false })
      .limit(10);

    if (targetOrderId) {
      query = supabase
        .from("orders")
        .select("order_number, story_data, generation_snapshot")
        .eq("order_number", targetOrderId);
    }

    const { data: orders, error: fetchErr } = await query;

    if (fetchErr)
      throw new Error(`Failed to fetch orders: ${fetchErr.message}`);
    if (!orders || orders.length === 0) {
      log(`[QA Backfill] No qualifying orders found.`);
      return NextResponse.json({ success: true, logs, processed: 0 });
    }

    log(`[QA Backfill] Found ${orders.length} orders to scan.`);

    let totalProcessed = 0;
    let totalSkipped = 0;

    for (const order of orders) {
      if (totalProcessed >= maxSpreads) break;

      const storyData = order.story_data as any;
      const snapshot = (order.generation_snapshot as any) || {};

      if (!storyData?.pages || !Array.isArray(storyData.pages)) {
        log(
          `[QA Backfill] Order ${order.order_number}: No pages array found, skipping.`,
        );
        continue;
      }

      // Resolve hero references
      const heroRawUrl: string =
        storyData.mainCharacter?.imageRawUrl ||
        storyData.mainCharacter?.imageBases64?.[0] ||
        storyData.mainCharacterImageBase64 ||
        storyData.heroImageBase64 ||
        storyData.firstCharacterImageBase64 ||
        storyData.heroImageUrl ||
        storyData.firstCharacterImageUrl ||
        "";
      const heroDNAUrl: string =
        storyData.mainCharacter?.imageDNA?.[0] ||
        storyData.styleReferenceImageBase64 ||
        storyData.styleReferenceImageUrl ||
        heroRawUrl;
      const secondRawUrl: string | undefined =
        storyData.secondCharacter?.imageRawUrl ||
        storyData.secondCharacter?.imageBases64?.[0] ||
        storyData.secondCharacterImageBase64 ||
        storyData.secondCharacterImageUrl;
      const secondDNAUrl: string | undefined =
        storyData.secondCharacter?.imageDNA?.[0] ||
        storyData.secondCharacterImageBase64 ||
        storyData.secondCharacterImageUrl ||
        secondRawUrl;

      if (!heroRawUrl) {
        log(
          `[QA Backfill] Order ${order.order_number}: No hero raw image found, skipping.`,
        );
        continue;
      }

      log(
        `[QA Backfill] Processing order ${order.order_number} — ${storyData.pages.length} spreads.`,
      );

      for (let i = 0; i < storyData.pages.length; i++) {
        if (totalProcessed >= maxSpreads) break;

        const page = storyData.pages[i];
        const spreadNumber = i + 1;
        const illustrationUrl: string = page?.illustrationUrl || "";

        if (!illustrationUrl || illustrationUrl.length < 20) {
          log(`  Spread ${spreadNumber}: No valid image URL, skipping.`);
          continue;
        }

        // Check if QA log already exists for this spread/iteration
        const { data: existing } = await supabase
          .from("generation_quality_logs")
          .select("id")
          .eq("order_id", order.order_number)
          .eq("spread_number", spreadNumber)
          .limit(1);

        if (existing && existing.length > 0) {
          log(`  Spread ${spreadNumber}: QA log already exists. Skipping.`);
          totalSkipped++;
          continue;
        }

        log(`  Spread ${spreadNumber}: Fetching and analysing image...`);

        try {
          // Download images as base64 for Gemini vision
          const toBase64 = async (url: string): Promise<string> => {
            if (url.startsWith("data:")) {
              return url.split(",")[1]; // Already base64
            }
            const res = await fetch(url);
            const buffer = await res.arrayBuffer();
            return Buffer.from(buffer).toString("base64");
          };

          const [generatedBase64, heroRawBase64, heroDNABase64] =
            await Promise.all([
              toBase64(illustrationUrl),
              toBase64(heroRawUrl),
              toBase64(heroDNAUrl),
            ]);

          let secondRawBase64: string | undefined;
          let secondDNABase64: string | undefined;
          if (secondRawUrl) {
            secondRawBase64 = await toBase64(secondRawUrl);
            secondDNABase64 = secondDNAUrl
              ? await toBase64(secondDNAUrl)
              : secondRawBase64;
          }

          const promptBlock = storyData.prompts?.[i];
          const targetPrompt =
            promptBlock?.imagePrompt || "No prompt recorded.";
          const textSide = promptBlock?.mainContentSide || "Right";

          // Run the QA Agent
          const qcResult = await QualityAgent.evaluateImage(
            generatedBase64,
            heroRawBase64,
            heroDNABase64,
            i === 0 ? "Cover" : "Spread",
            textSide,
            targetPrompt,
            secondRawBase64,
            secondDNABase64,
          );

          // Write to generation_quality_logs
          const { error: insertErr } = await supabase
            .from("generation_quality_logs")
            .insert({
              order_id: order.order_number,
              spread_number: spreadNumber,
              iteration_number: 1, // Backfill = iteration 1 (the final accepted image)
              image_url: illustrationUrl,
              character_consistency_status: qcResult.characterConsistencyStatus,
              character_reasoning: `[Visual: ${qcResult.visualDescription}] ${qcResult.characterReasoning}`,
              style_consistency_status: qcResult.styleConsistencyStatus,
              style_reasoning: qcResult.styleReasoning,
              text_clearance_status: qcResult.textClearanceStatus,
              text_reasoning: qcResult.textReasoning,
              recommended_text_side: qcResult.recommendedTextSide,
              overall_decision: qcResult.overallDecision,
            });

          if (insertErr) {
            log(
              `  Spread ${spreadNumber}: DB write failed — ${insertErr.message}`,
            );
          } else {
            log(
              `  Spread ${spreadNumber}: ✅ QA logged — Decision: ${qcResult.overallDecision.toUpperCase()}`,
            );
            totalProcessed++;
          }
        } catch (spreadErr: any) {
          log(`  Spread ${spreadNumber}: ❌ Error — ${spreadErr.message}`);
        }

        // Respect Gemini rate limits between calls
        await new Promise((r) => setTimeout(r, 3000));
      }
    }

    log(
      `[QA Backfill] Complete. Processed: ${totalProcessed}, Skipped (already logged): ${totalSkipped}.`,
    );

    return NextResponse.json({
      success: true,
      processed: totalProcessed,
      skipped: totalSkipped,
      logs,
    });
  } catch (err: any) {
    console.error("[QA Backfill] Fatal error:", err);
    return NextResponse.json(
      { success: false, error: err.message, logs },
      { status: 500 },
    );
  }
}
