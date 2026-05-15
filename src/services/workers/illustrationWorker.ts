import { supabase } from "@/utils/supabaseClient";
import { generateMethod4Image } from "@/services/generation/imageGenerator";
import { QualityAgent } from "../visual/qualityAgent";
import { WorkerUtils } from "./workerUtils";
import { MasterScheduler } from "./scheduler";
import { v4 as uuidv4 } from "uuid";

export class IllustrationWorker {
  /**
   * Executes a single Illustration Generation job pulled from the queue.
   * Iteratively processes all missing images in the StoryData prompts block.
   */
  static async processJob(jobId: string, orderId: string, attempts: number) {
    console.log(
      `[IllustrationWorker] Initiating Job ${jobId} for Order ${orderId}`,
    );

    try {
      // Lock the job to 'running' using an atomic conditional update
      const { data: lockResult, error: lockErr } = await supabase
        .from("order_jobs")
        .update({ status: "running", started_at: new Date().toISOString() })
        .eq("id", jobId)
        .eq("status", "queued") // Concurrency lock
        .select();

      if (lockErr || !lockResult || lockResult.length === 0) {
        console.warn(
          `[IllustrationWorker] Job ${jobId} already grabbed by another worker. Aborting.`,
        );
        return;
      }

      // Fetch the Order and the current payload
      const { data: order, error } = await supabase
        .from("orders")
        .select("story_data, generation_snapshot, order_number")
        .eq("order_number", orderId)
        .single();

      if (error || !order || !order.story_data)
        throw new Error("Order data missing");

      const storyData = order.story_data as any;
      const snapshot = (order.generation_snapshot as any) || {};

      // Ensure we have prompts to process
      if (!storyData.prompts || !Array.isArray(storyData.prompts)) {
        throw new Error("Missing prompts array. Cannot run illustration loop.");
      }

      const childAge = snapshot.age || storyData.childAge;
      const styleRef =
        snapshot.style_reference_image_url ||
        storyData.styleReferenceImageBase64;
      const childDesc = storyData.mainCharacter?.description || "";
      const secondRef = storyData.secondCharacter?.imageBases64?.[0]; // If using second character

      // Pre-seed tracking for idempotency
      let allCompleted = true;
      let pagesUpdated = 0;

      console.log(
        `[IllustrationWorker] Processing ${storyData.prompts.length} spreads...`,
      );

      // Event Tracker: Start
      await supabase.from("event_audit_log").insert({
        event_type: "illustration_batch_started",
        order_id: orderId,
        details: {
          timestamp: new Date(),
          target_spreads: storyData.prompts.length,
        },
      });

      // Process each prompt payload
      for (let i = 0; i < storyData.prompts.length; i++) {
        const promptBlock = storyData.prompts[i];
        const existingPage = storyData.pages?.[i];

        // Idempotency: skip if already successfully generated
        const isUrlValid =
          existingPage &&
          existingPage.illustrationUrl &&
          existingPage.illustrationUrl.length > 50 &&
          !existingPage.illustrationUrl.includes("error") &&
          !existingPage.illustrationUrl.endsWith("...");

        if (isUrlValid) {
          console.log(
            `[IllustrationWorker] Spread ${i + 1} (${i === 0 ? "Cover" : "Page"}) already exists and is valid. Skipping generation.`,
          );
          continue;
        } else if (existingPage?.illustrationUrl) {
          console.log(
            `[IllustrationWorker] Spread ${i + 1} has a phantom or invalid URL ("${existingPage.illustrationUrl.substring(0, 30)}..."). Forcing regeneration.`,
          );
        }

        console.log(
          `[IllustrationWorker] Generating Image ${i + 1}/${storyData.prompts.length}`,
        );

        try {
          const heroRaw =
            storyData.mainCharacter?.imageRawUrl ||
            storyData.mainCharacter?.imageBases64?.[0] ||
            storyData.mainCharacterImageBase64 ||
            storyData.heroImageBase64 ||
            storyData.firstCharacterImageBase64 ||
            storyData.heroImageUrl ||
            storyData.firstCharacterImageUrl;

          // DNA-ONLY (v6.0): Resolve the character's visual DNA.
          // Priority order must match what the Editor left panel shows as "DNA STYLE":
          //   1. styleReferenceImageUrl/Base64 = customer's chosen stylized DNA image (highest authority)
          //   2. mainCharacter.imageDNA[0]     = auto-generated character portrait (fallback)
          //   3. heroRaw                        = raw photo (last resort)
          // WARNING: imageDNA[0] is set by generateThemeStylePreview — it is a Gemini-generated
          // portrait, NOT the customer's selected illustration. Always prefer styleReference first.
          const heroDNA =
            storyData.styleReferenceImageUrl ||
            storyData.styleReferenceImageBase64 ||
            storyData.mainCharacter?.imageDNA?.[0] ||
            heroRaw;  // last resort — no DNA of any kind uploaded yet


          let secondaryDNA: string | undefined =
            storyData.secondCharacter?.imageDNA?.[0] ||
            storyData.secondCharacter?.imageBases64?.[0] ||
            storyData.secondCharacterImageBase64 ||
            storyData.secondCharacterImageUrl;

          if (storyData.secondCharacter?.type === "object") {
            secondaryDNA = undefined;
          }


          let isFlagged = false;
          let finalFinalUrl = "";
          let finalRecommendedSide = promptBlock.textSide || "Right";

          console.log(
            `[IllustrationWorker] Spread ${i + 1} - Generating Image`,
          );

          // STYLE DNA: Priority chain mirrors StoryWorker — must use the same source.
          // technicalStyleGuide = the locked art style from the frontend StyleSelectionScreen
          const baseStyleDNA: string =
            storyData.selectedStyleNames?.[0] ||
            storyData.technicalStyleGuide ||
            (storyData.selectedStylePrompt?.includes('**TASK:**') ? undefined : storyData.selectedStylePrompt) ||
            storyData.themeVisualDNA ||
            "high quality painterly children's book illustration";
            
          const is3DStyle = baseStyleDNA.toLowerCase().includes('3d') || baseStyleDNA.toLowerCase().includes('pixar');
          const resolvedStyleDNA = is3DStyle ?
            `${baseStyleDNA}. Extremely high quality 3D render, Unreal Engine 5, octane render, volumetric lighting, subsurface scattering on skin, glossy 3D materials, deep depth of field, vibrant cinematic colors, masterpiece 3D artwork.` :
            baseStyleDNA;

          // DNA-ONLY payload: send exactly 1 image per hero.
          // Image 1 = HERO_1 DNA, Image 2 = HERO_2 DNA (if present).
          // This MUST match what the prompt text says. No raw photos mixed in.
          const heroImagesArray: string[] = [heroDNA].filter(Boolean) as string[];
          const secondaryImagesArray: string[] | undefined = secondaryDNA
            ? [secondaryDNA]
            : undefined;

          const imgRes = await WorkerUtils.withTimeout(
            generateMethod4Image(
              promptBlock.imagePrompt,
              resolvedStyleDNA,
              heroImagesArray,
              childDesc,
              childAge,
              Math.floor(Math.random() * 100000),
              secondaryImagesArray,
            ),
            120000,
          );

          const base64Out = imgRes.imageBase64;
          const bucket = "images";
          const fileName = `${orderId}/spread_${i + 1}_${Date.now()}.jpg`;
          const buffer = Buffer.from(base64Out, "base64");
          const { error: uploadErr } = await supabase.storage
            .from(bucket)
            .upload(fileName, buffer, {
              contentType: "image/jpeg",
              upsert: true,
            });

          let iterationUrl = `data:image/jpeg;base64,${base64Out}`;
          if (!uploadErr) {
            const { data: publicData } = supabase.storage
              .from(bucket)
              .getPublicUrl(fileName);
            if (publicData?.publicUrl) iterationUrl = publicData.publicUrl;
          } else {
            console.warn(
              `[IllustrationWorker] Failed to upload Spread ${i + 1} to bucket, falling back to base64.`,
              uploadErr,
            );
          }

          finalFinalUrl = iterationUrl;

          // 2. Patch storyData.pages safely
          if (!storyData.pages) storyData.pages = [];
          const safeExistingPage = storyData.pages[i] || {};

          storyData.pages[i] = {
            ...safeExistingPage,
            pageNumber: i + 1,
            text: safeExistingPage.text || promptBlock.storyText,
            illustrationUrl: finalFinalUrl,
            promptDetails: promptBlock,
            textSide: promptBlock.textSide || "right",
            qcStatus: "pending",
          };

          // Run Quality Agent Evaluation (Await to prevent state overwriting)
          try {
            const toBase64 = async (
              url: string | undefined,
            ): Promise<string> => {
              if (!url) return "";
              if (url.startsWith("data:")) return url.split(",")[1] || url;
              try {
                const res = await fetch(url);
                const buffer = await res.arrayBuffer();
                return Buffer.from(buffer).toString("base64");
              } catch (e) {
                console.error(
                  "[IllustrationWorker] Failed to fetch image to base64",
                  url,
                  e,
                );
                return "";
              }
            };

            const heroRawBase64 = await toBase64(heroRaw);
            const heroDNABase64 = await toBase64(heroDNA);
            const secondaryRawBase64 = secondaryDNA
              ? await toBase64(secondaryDNA)
              : undefined;
            const secondaryDNABase64 = secondaryDNA
              ? await toBase64(secondaryDNA)
              : undefined;

            const qcResult = await QualityAgent.evaluateImage(
              base64Out,
              heroRawBase64,
              heroDNABase64,
              i === 0 ? "Cover" : "Spread",
              promptBlock.textSide || "Right",
              promptBlock.imagePrompt,
              secondaryRawBase64,
              secondaryDNABase64,
            );

            console.log(
              `[QCAgent] Result for Spread ${i + 1}: ${qcResult.overallDecision}`,
            );

            await supabase.from("generation_quality_logs").insert({
              order_id: orderId,
              spread_number: i + 1,
              iteration_number: 1,
              image_url: iterationUrl,
              character_consistency_status: qcResult.characterConsistencyStatus,
              character_reasoning: `[Visual: ${qcResult.visualDescription}] ${qcResult.characterReasoning}`,
              style_consistency_status: qcResult.styleConsistencyStatus,
              style_reasoning: qcResult.styleReasoning,
              text_clearance_status: qcResult.textClearanceStatus,
              text_reasoning: qcResult.textReasoning,
              recommended_text_side: qcResult.recommendedTextSide,
              overall_decision: qcResult.overallDecision,
            });

            // Update local storyData with QC results
            if (storyData.pages && storyData.pages[i]) {
              storyData.pages[i].qcStatus =
                qcResult.overallDecision === "pass" ? "passed" : "flagged";
              storyData.pages[i].textSide =
                qcResult.recommendedTextSide.toLowerCase();
            }
            if (storyData.spreads && storyData.spreads[i]) {
              storyData.spreads[i].qcStatus =
                qcResult.overallDecision === "pass" ? "passed" : "flagged";
              storyData.spreads[i].textSide =
                qcResult.recommendedTextSide.toLowerCase();
            }
            if (i === 0) {
              storyData.coverTextSide =
                qcResult.recommendedTextSide.toLowerCase();
            }
          } catch (err) {
            console.error(`[QCAgent] Failed to evaluate spread ${i + 1}`, err);
          }

          // SYNC TO SPREADS FOR FRONTEND COMPATIBILITY
          if (!storyData.spreads) storyData.spreads = [];
          // Ensure the array is long enough (it might be empty if this is a purely backend generated order)
          while (storyData.spreads.length <= i) {
            storyData.spreads.push({});
          }
          const safeExistingSpread = storyData.spreads[i] || {};
          storyData.spreads[i] = {
            ...safeExistingSpread,
            spreadNumber: i, // Legacy format often used 0-indexed spreadNumber for Cover
            illustrationUrl: finalFinalUrl,
            text: safeExistingPage.text || promptBlock.storyText,
            actualPrompt: promptBlock.imagePrompt,
            textSide: (promptBlock.textSide || "Right").toLowerCase(),
            qcStatus: "pending",
          };

          if (i === 0) {
            storyData.coverImageUrl = finalFinalUrl;
            storyData.actualCoverPrompt = promptBlock.imagePrompt;
            storyData.coverTextSide = (
              promptBlock.textSide || "Right"
            ).toLowerCase();
          }

          pagesUpdated++;
        } catch (imgError: any) {
          console.error(
            `[IllustrationWorker] Failed on Spread ${i + 1}`,
            imgError,
          );
          allCompleted = false;

          // Log specific failure to audit log for visibility
          await supabase.from("event_audit_log").insert({
            event_type: "error",
            order_id: orderId,
            details: {
              error: imgError.message || String(imgError),
              spread_number: i + 1,
              context: "illustration_generation",
            },
          });
        }

        // Sleep to respect LLM rate limits / backpressure
        await new Promise((resolve) => setTimeout(resolve, 2000));
      }

      // Sync Partial/Full progress back to the database
      await supabase
        .from("orders")
        .update({ story_data: storyData })
        .eq("order_number", orderId);

      if (!allCompleted) {
        // Not all spreads finished. We throw an error to trigger the WorkerUtils retry backoff.
        throw new Error(
          "DETERMINISTIC: One or more illustrations failed to generate during the batch loop.",
        );
      }

      // --------------------------------------------------------
      // 3. SUCCESS COMPLETION
      // --------------------------------------------------------
      console.log(
        `[IllustrationWorker] Completed Job ${jobId}. All illustrations processed.`,
      );

      await supabase
        .from("orders")
        .update({ status: "illustrations_ready" })
        .eq("order_number", orderId);

      await supabase.from("event_audit_log").insert({
        event_type: "illustration_batch_completed",
        order_id: orderId,
        details: {
          timestamp: new Date(),
          successfully_generated: pagesUpdated,
        },
      });

      await supabase
        .from("order_jobs")
        .update({
          status: "completed",
          finished_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      // Dispatch Compilation Queue
      await MasterScheduler.dispatchJob(orderId, "compilation");
    } catch (error: any) {
      console.error(
        `[IllustrationWorker] Fatal Error executing job ${jobId}:`,
        error,
      );
      await WorkerUtils.handleJobFailure(jobId, orderId, error, attempts);
    }
  }
}
