import { supabase } from "@/utils/supabaseClient";
import { generateMethod4Image } from "@/services/generation/imageGenerator";
import { QualityAgent } from "../visual/qualityAgent";
import { PromptDoctor } from "../visual/promptDoctor";
import { WorkerUtils } from "./workerUtils";
import { MasterScheduler } from "./scheduler";
import { EmailService } from "../notifications/emailService";
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

      // Fetch modern DNA references from the new architecture
      let hAStyleUrl, hAOrigUrl, hBStyleUrl, hBOrigUrl, propAssetUrl;
      const { data: dnaRecords } = await supabase
        .from('order_dna')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      if (dnaRecords && dnaRecords.length > 0) {
        hAStyleUrl = dnaRecords.find(r => r.hero_label === 'Hero A' && r.image_type === 'Stylized DNA')?.image_url;
        hAOrigUrl = dnaRecords.find(r => r.hero_label === 'Hero A' && r.image_type === 'Original Photo')?.image_url;
        hBStyleUrl = dnaRecords.find(r => r.hero_label === 'Hero B' && r.image_type === 'Stylized DNA')?.image_url;
        hBOrigUrl = dnaRecords.find(r => r.hero_label === 'Hero B' && r.image_type === 'Original Photo')?.image_url;
        propAssetUrl = dnaRecords.find(r => r.hero_label === 'Prop Asset' && r.image_type === 'Canonical Asset')?.image_url;
      }
      if (!propAssetUrl && storyData.recurringAssetImageUrl) {
        propAssetUrl = storyData.recurringAssetImageUrl;
      }

      // Pre-seed tracking for idempotency
      let allCompleted = true;
      let pagesUpdated = 0;

      console.log(
        `[IllustrationWorker] Processing ${storyData.prompts.length} spreads... (Prop Asset available: ${!!propAssetUrl})`,
      );

      // Event Tracker: Start
      await supabase.from("event_audit_log").insert({
        event_type: "illustrations_started",
        order_id: orderId,
        details: {
          timestamp: new Date(),
          target_spreads: storyData.prompts.length,
        },
      });

      // Process each prompt payload
      for (let i = 0; i < storyData.prompts.length; i++) {
        const promptBlock = storyData.prompts[i];
        const isCover = i === 0;
        const pageIdx = isCover ? -1 : i - 1;
        const existingUrl = isCover
          ? storyData.coverImageUrl
          : (storyData.spreads?.[i]?.illustrationUrl || storyData.pages?.[pageIdx]?.illustrationUrl || storyData.pages?.[pageIdx]?.imageUrl);

        // Idempotency: skip if already successfully generated
        const isUrlValid =
          existingUrl &&
          existingUrl.length > 50 &&
          !existingUrl.includes("error") &&
          !existingUrl.endsWith("...");

        if (isUrlValid) {
          console.log(
            `[IllustrationWorker] Spread ${i + 1} (${isCover ? "Cover" : "Page " + (pageIdx + 1)}) already exists and is valid. Skipping generation.`,
          );
          continue;
        } else if (existingUrl) {
          console.log(
            `[IllustrationWorker] Spread ${i + 1} has a phantom or invalid URL ("${existingUrl.substring(0, 30)}..."). Forcing regeneration.`,
          );
        }

        console.log(
          `[IllustrationWorker] Generating Image ${i + 1}/${storyData.prompts.length} (${isCover ? "Cover" : "Page " + (pageIdx + 1)})`,
        );

        try {
          let heroRaw = hAOrigUrl ||
            storyData.mainCharacter?.imageRawUrl ||
            storyData.mainCharacter?.imageBases64?.[0] ||
            storyData.mainCharacterImageBase64 ||
            storyData.heroImageBase64 ||
            storyData.firstCharacterImageBase64 ||
            storyData.heroImageUrl ||
            storyData.firstCharacterImageUrl || "";

          // DNA-ONLY (v6.0): Resolve the character's visual DNA.
          // Priority order must match what the Editor left panel shows as "DNA STYLE":
          const heroDNA =
            hAStyleUrl ||
            storyData.mainCharacter?.imageDNA?.[0] ||
            storyData.styleReferenceImageUrl ||
            storyData.styleReferenceImageBase64 ||
            heroRaw;  // last resort - no DNA of any kind uploaded yet


          let secondaryDNA: string | undefined = undefined;
          if (storyData.useSecondCharacter) {
            secondaryDNA =
              hBStyleUrl ||
              storyData.secondCharacter?.imageDNA?.[0] ||
              storyData.secondCharacterImageBase64 ||
              storyData.secondCharacterImageUrl ||
              (storyData.secondCharacter?.imageBases64?.[0] || "");

            if (storyData.secondCharacter?.type === "object") {
              secondaryDNA = undefined;
            }
          }

          // Check if Recurring Prop Asset is featured in this spread or prompt
          const recurringAsset = storyData.blueprint?.foundation?.recurringAsset;
          const isPropInSpread = !!propAssetUrl && (
            promptBlock.imagePrompt?.includes('[[PROP_ASSET]]') ||
            (recurringAsset?.appearancesSpreads && Array.isArray(recurringAsset.appearancesSpreads) && recurringAsset.appearancesSpreads.includes(i)) ||
            (recurringAsset?.name && promptBlock.imagePrompt?.toLowerCase().includes(recurringAsset.name.toLowerCase()))
          );
          const propImagesArray: string[] | undefined = (isPropInSpread && propAssetUrl) ? [propAssetUrl] : undefined;

          let isFlagged = false;
          let finalFinalUrl = "";
          let finalRecommendedSide = promptBlock.textSide || "Right";

          console.log(
            `[IllustrationWorker] Spread ${i + 1} - Generating Image (Prop Asset Slot: ${!!propImagesArray})`,
          );

          // STYLE DNA: Priority chain mirrors StoryWorker — combine style name, prompt details, and technical style guide.
          const styleName = storyData.selectedStyleNames?.[0] || '';
          const stylePrompt = storyData.selectedStylePrompt?.includes('**TASK:**') ? '' : (storyData.selectedStylePrompt || '');
          let techGuideStr = '';
          if (storyData.technicalStyleGuide) {
            techGuideStr = typeof storyData.technicalStyleGuide === 'object'
              ? JSON.stringify(storyData.technicalStyleGuide)
              : storyData.technicalStyleGuide;
          }

          const baseStyleDNA: string = [
            styleName ? `Art Style: ${styleName}.` : '',
            stylePrompt ? `Style Details: ${stylePrompt}.` : '',
            techGuideStr ? `Technical Style Rules: ${techGuideStr}.` : '',
            storyData.themeVisualDNA ? `Theme DNA: ${storyData.themeVisualDNA}.` : ''
          ].filter(Boolean).join(' ') || "high quality painterly children's book illustration";
            
          const is3DStyle = baseStyleDNA.toLowerCase().includes('3d') || baseStyleDNA.toLowerCase().includes('pixar');
          const resolvedStyleDNA = is3DStyle ?
            `${baseStyleDNA}. Extremely high quality 3D render, Unreal Engine 5, octane render, volumetric lighting, subsurface scattering on skin, glossy 3D materials, deep depth of field, vibrant cinematic colors, masterpiece 3D artwork.` :
            baseStyleDNA;

          // DNA-ONLY payload: send exactly 1 image per hero + 1 prop image if present.
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
              undefined,
              propImagesArray
            ),
            300000,
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

          // 2. Patch storyData.pages safely (only for story spreads, not cover)
          if (!isCover && pageIdx >= 0) {
            if (!storyData.pages) storyData.pages = [];
            while (storyData.pages.length <= pageIdx) {
              storyData.pages.push({});
            }
            const safeExistingPage = storyData.pages[pageIdx] || {};
            storyData.pages[pageIdx] = {
              ...safeExistingPage,
              pageNumber: pageIdx + 1,
              text: safeExistingPage.text || promptBlock.storyText,
              imageUrl: finalFinalUrl,
              illustrationUrl: finalFinalUrl,
              promptDetails: promptBlock,
              textSide: (promptBlock.textSide || "right").toLowerCase(),
              qcStatus: "pending",
            };
          }

          // Run Quality Agent Evaluation (Await to prevent state overwriting)
          let overallDecision = "pending";
          let originalUrl: string | undefined = undefined;

          try {
            const qcParams = {
              generatedImageBase64: base64Out,
              rawHeroImages: heroImagesArray,
              stylizedDnaImages: heroImagesArray,
              childDescription: childDesc,
              childAge: childAge,
              targetPrompt: promptBlock.imagePrompt,
              stylePrompt: resolvedStyleDNA,
              spreadNumber: i,
              isCover: isCover,
              layoutPlanSide: promptBlock.textSide || "Right",
            };

            let qcResult = await QualityAgent.evaluateImage(qcParams);

            console.log(
              `[QCAgent] Result for Spread ${i} (Attempt 1): Likeness ${qcResult.likenessScore}/10, Narrative: ${qcResult.narrativeAdherenceStatus}, Decision: ${qcResult.overallDecision}`,
            );

            overallDecision = qcResult.overallDecision;

            await supabase.from("generation_quality_logs").insert({
              order_id: orderId,
              spread_number: i,
              iteration_number: 1,
              image_url: iterationUrl,
              character_consistency_status: qcResult.characterConsistencyStatus,
              character_reasoning: `[Likeness: ${qcResult.likenessScore}/10] [Visual: ${qcResult.visualDescription}] [Narrative Check: ${qcResult.narrativeAdherenceStatus} - ${qcResult.narrativeAdherenceReasoning}] ${qcResult.characterReasoning}`,
              style_consistency_status: qcResult.styleConsistencyStatus,
              style_reasoning: qcResult.styleReasoning,
              text_clearance_status: qcResult.textClearanceStatus,
              text_reasoning: qcResult.textReasoning,
              recommended_text_side: qcResult.recommendedTextSide,
              overall_decision: qcResult.overallDecision,
            });

            // ATTEMPT 2: TARGETED REPAINT & RE-EVALUATION (Max 2 Attempts Per Spread Cap)
            if (qcResult.overallDecision === "fail" || qcResult.overallDecision === "flagged") {
              console.log(`[QCAgent] Spread ${i} flagged. Triggering targeted Art Director repaint (Attempt 2)...`);
              originalUrl = finalFinalUrl;
              
              // Build targeted steering prompt
              let targetedPrompt = promptBlock.imagePrompt;
              const steeringNotes: string[] = [];
              if (qcResult.characterConsistencyStatus === 'fail' || qcResult.likenessScore < 5) {
                steeringNotes.push(`CRITICAL CHARACTER LIKENESS FIX: ${qcResult.characterReasoning}`);
              }
              if (qcResult.narrativeAdherenceStatus === 'fail') {
                steeringNotes.push(`CRITICAL SCENE ACTION FIX: Ensure the scene directly depicts: ${promptBlock.storyText || 'the story action'}. Avoid incorrect actions.`);
              }
              if (qcResult.regenerationReason) {
                steeringNotes.push(`CORRECTION MANDATE: ${qcResult.regenerationReason}`);
              }
              if (steeringNotes.length > 0) {
                targetedPrompt = `${targetedPrompt}. [ART DIRECTOR MANDATE: ${steeringNotes.join(' ')}]`;
              }

              try {
                const regenRes = await WorkerUtils.withTimeout(
                  generateMethod4Image(
                    targetedPrompt,
                    resolvedStyleDNA,
                    heroImagesArray,
                    childDesc,
                    childAge,
                    Math.floor(Math.random() * 100000) + 1, // New randomized seed
                    secondaryImagesArray,
                    undefined,
                    propImagesArray
                  ),
                  300000,
                );

                const base64OutRegen = regenRes.imageBase64;
                const fileNameRegen = `${orderId}/spread_${i + 1}_regen_${Date.now()}.jpg`;
                const bufferRegen = Buffer.from(base64OutRegen, "base64");
                const { error: uploadErrRegen } = await supabase.storage
                  .from(bucket)
                  .upload(fileNameRegen, bufferRegen, {
                    contentType: "image/jpeg",
                    upsert: true,
                  });

                if (!uploadErrRegen) {
                  const { data: publicDataRegen } = supabase.storage
                    .from(bucket)
                    .getPublicUrl(fileNameRegen);
                  if (publicDataRegen?.publicUrl) {
                    finalFinalUrl = publicDataRegen.publicUrl;
                    console.log(`[QCAgent] Spread ${i} repainted. Running Iteration 2 QA Re-Evaluation...`);

                    // RE-EVALUATION PASS ON REGENERATED IMAGE (Iteration 2)
                    const qcRegenResult = await QualityAgent.evaluateImage({
                      ...qcParams,
                      generatedImageBase64: base64OutRegen,
                      targetPrompt: targetedPrompt,
                    });

                    console.log(
                      `[QCAgent] Result for Spread ${i} (Attempt 2): Likeness ${qcRegenResult.likenessScore}/10, Narrative: ${qcRegenResult.narrativeAdherenceStatus}, Decision: ${qcRegenResult.overallDecision}`,
                    );

                    overallDecision = qcRegenResult.overallDecision;
                    qcResult = qcRegenResult; // Update reference for text layout & mapping

                    await supabase.from("generation_quality_logs").insert({
                      order_id: orderId,
                      spread_number: i,
                      iteration_number: 2,
                      image_url: finalFinalUrl,
                      character_consistency_status: qcRegenResult.characterConsistencyStatus,
                      character_reasoning: `[Likeness: ${qcRegenResult.likenessScore}/10] [Visual (Iter 2): ${qcRegenResult.visualDescription}] [Narrative Check: ${qcRegenResult.narrativeAdherenceStatus}] ${qcRegenResult.characterReasoning}`,
                      style_consistency_status: qcRegenResult.styleConsistencyStatus,
                      style_reasoning: qcRegenResult.styleReasoning,
                      text_clearance_status: qcRegenResult.textClearanceStatus,
                      text_reasoning: qcRegenResult.textReasoning,
                      recommended_text_side: qcRegenResult.recommendedTextSide,
                      overall_decision: qcRegenResult.overallDecision,
                    });

                    // IF ATTEMPT 2 FAILS: Invoke QA Prompt Doctor for intelligent final fix (Attempt 3)
                    if (qcRegenResult.overallDecision === "fail") {
                      console.log(`[PromptDoctor] Attempt 2 failed for Spread ${i}. Invoking QA Prompt Doctor to rewrite prompt for final fix (Attempt 3)...`);
                      try {
                        const doctorResult = await PromptDoctor.refinePrompt({
                          originalPrompt: targetedPrompt,
                          storyText: promptBlock.storyText,
                          characterDescription: childDesc,
                          childAge,
                          styleGuide: resolvedStyleDNA,
                          qcResult: qcRegenResult,
                          attemptNumber: 2
                        });

                        console.log(`[PromptDoctor] Surgical fixes applied:`, doctorResult.surgicalFixes);
                        const promptAttempt3 = doctorResult.refinedPrompt;

                        const attempt3Res = await WorkerUtils.withTimeout(
                          generateMethod4Image(
                            promptAttempt3,
                            resolvedStyleDNA,
                            heroImagesArray,
                            childDesc,
                            childAge,
                            Math.floor(Math.random() * 100000) + 1,
                            secondaryImagesArray,
                            undefined,
                            propImagesArray
                          ),
                          300000,
                        );

                        const base64OutAttempt3 = attempt3Res.imageBase64;
                        const fileNameAttempt3 = `${orderId}/spread_${i + 1}_doctor_${Date.now()}.jpg`;
                        const bufferAttempt3 = Buffer.from(base64OutAttempt3, "base64");
                        const { error: uploadErr3 } = await supabase.storage
                          .from(bucket)
                          .upload(fileNameAttempt3, bufferAttempt3, {
                            contentType: "image/jpeg",
                            upsert: true,
                          });

                        if (!uploadErr3) {
                          const { data: publicData3 } = supabase.storage
                            .from(bucket)
                            .getPublicUrl(fileNameAttempt3);
                          if (publicData3?.publicUrl) {
                            finalFinalUrl = publicData3.publicUrl;
                            console.log(`[QCAgent] Spread ${i} (Attempt 3 / Doctor) painted. Running QA Evaluation...`);

                            const qc3Result = await QualityAgent.evaluateImage({
                              ...qcParams,
                              generatedImageBase64: base64OutAttempt3,
                              targetPrompt: promptAttempt3,
                              iterationNumber: 3
                            });

                            console.log(
                              `[QCAgent] Result for Spread ${i} (Attempt 3 / Doctor): Likeness ${qc3Result.likenessScore}/10, Narrative: ${qc3Result.narrativeAdherenceStatus}, Decision: ${qc3Result.overallDecision}`,
                            );

                            overallDecision = qc3Result.overallDecision;
                            qcResult = qc3Result;

                            await supabase.from("generation_quality_logs").insert({
                              order_id: orderId,
                              spread_number: i,
                              iteration_number: 3,
                              image_url: finalFinalUrl,
                              character_consistency_status: qc3Result.characterConsistencyStatus,
                              character_reasoning: `[Likeness: ${qc3Result.likenessScore}/10] [Doctor Iter 3: ${doctorResult.explanation}] ${qc3Result.characterReasoning}`,
                              style_consistency_status: qc3Result.styleConsistencyStatus,
                              style_reasoning: qc3Result.styleReasoning,
                              text_clearance_status: qc3Result.textClearanceStatus,
                              text_reasoning: qc3Result.textReasoning,
                              recommended_text_side: qc3Result.recommendedTextSide,
                              overall_decision: qc3Result.overallDecision,
                            });
                          }
                        }
                      } catch (docErr) {
                        console.error(`[PromptDoctor] Error during Doctor Attempt 3 for Spread ${i}:`, docErr);
                      }
                    }

                    if (overallDecision === "fail") {
                      if (qcResult.likenessScore >= 5 || qcResult.characterConsistencyStatus === 'pass') {
                        console.warn(`[QCAgent] Spread ${i} flagged for minor QA note (likeness ${qcResult.likenessScore}/10). Continuing autonomous pipeline.`);
                        overallDecision = "flagged";
                      } else {
                        console.warn(`[QCAgent] Spread ${i} has low likeness score (${qcResult.likenessScore}/10) after doctor attempts. Continuing with best attempt.`);
                        overallDecision = "flagged";
                      }
                    }
                  }
                } else {
                  console.warn(`[QCAgent] Failed to upload regenerated image for Spread ${i + 1}:`, uploadErrRegen);
                }
              } catch (regenErr) {
                console.error(`[QCAgent] Failed to automatically regenerate Spread ${i + 1}:`, regenErr);
              }
            }

            // Update local storyData with QC results
            const mappedQcStatus = overallDecision === "pass" ? "passed" : "flagged";
            if (!isCover && pageIdx >= 0 && storyData.pages && storyData.pages[pageIdx]) {
              storyData.pages[pageIdx].qcStatus = mappedQcStatus;
              storyData.pages[pageIdx].textSide = qcResult.recommendedTextSide.toLowerCase();
              storyData.pages[pageIdx].imageUrl = finalFinalUrl;
              storyData.pages[pageIdx].illustrationUrl = finalFinalUrl;
              if (originalUrl) {
                storyData.pages[pageIdx].qcOriginalUrl = originalUrl;
              }
            }
            if (storyData.spreads && storyData.spreads[i]) {
              storyData.spreads[i].qcStatus = mappedQcStatus;
              storyData.spreads[i].textSide = qcResult.recommendedTextSide.toLowerCase();
              if (originalUrl) {
                storyData.spreads[i].qcOriginalUrl = originalUrl;
              }
            }
            if (isCover) {
              storyData.coverTextSide = qcResult.recommendedTextSide.toLowerCase();
              storyData.coverQcStatus = mappedQcStatus;
              storyData.coverImageUrl = finalFinalUrl;
              if (originalUrl) {
                storyData.coverOriginalUrl = originalUrl;
              }
            }

            // Dispatch Admin QA Alert Email if flagged after 3 attempts
            if (mappedQcStatus === "flagged") {
              console.warn(`[QCAgent] Spread ${i} flagged after attempts. Dispatching Admin QA Email Alert.`);
              EmailService.sendAdminQaAlert(orderId, isCover ? 'cover' : i, {
                childName: storyData.childName,
                likenessScore: qcResult.likenessScore,
                characterConsistency: qcResult.characterConsistencyStatus,
                reason: qcResult.regenerationReason || qcResult.characterReasoning || qcResult.styleReasoning || 'Likeness/Style threshold not met after Doctor rewrite.',
                illustrationUrl: finalFinalUrl,
                attemptCount: 3
              }).catch(emailErr => console.error('[QCAgent] Failed to dispatch Admin QA email:', emailErr));
            }
          } catch (err) {
            console.error(`[QCAgent] Failed to evaluate spread ${i + 1}`, err);
          }

          // SYNC TO SPREADS FOR FRONTEND COMPATIBILITY
          if (!storyData.spreads) storyData.spreads = [];
          while (storyData.spreads.length <= i) {
            storyData.spreads.push({});
          }
          const safeExistingSpread = storyData.spreads[i] || {};
          const mappedQcStatusSync = overallDecision === "pass" ? "passed" : (overallDecision === "pending" ? "pending" : "flagged");
          const resolvedTextSide = (promptBlock.textSide || (promptBlock.mainContentSide === 'left' ? 'right' : 'left') || "right").toLowerCase();
          const resolvedStoryText = isCover ? '' : (promptBlock.storyText || (pageIdx >= 0 && storyData.pages?.[pageIdx]?.text) || '');

          storyData.spreads[i] = {
            ...safeExistingSpread,
            spreadNumber: i,
            illustrationUrl: finalFinalUrl,
            qcOriginalUrl: originalUrl || safeExistingSpread.qcOriginalUrl || undefined,
            text: resolvedStoryText,
            leftText: isCover ? '' : (resolvedTextSide === 'left' ? resolvedStoryText : ''),
            rightText: isCover ? '' : (resolvedTextSide === 'right' ? resolvedStoryText : ''),
            textSide: resolvedTextSide,
            textOffsetX: safeExistingSpread.textOffsetX !== undefined ? safeExistingSpread.textOffsetX : (resolvedTextSide === 'left' ? 20 : 220),
            textOffsetY: safeExistingSpread.textOffsetY !== undefined ? safeExistingSpread.textOffsetY : 24,
            actualPrompt: promptBlock.imagePrompt,
            promptDetails: {
              mainContentSide: promptBlock.mainContentSide,
              textSide: resolvedTextSide,
            },
            qcStatus: mappedQcStatusSync,
          };

          if (isCover) {
            storyData.coverImageUrl = finalFinalUrl;
            storyData.coverOriginalUrl = originalUrl || storyData.coverOriginalUrl || undefined;
            storyData.actualCoverPrompt = promptBlock.imagePrompt;
            storyData.coverTextSide = (
              promptBlock.textSide || "Right"
            ).toLowerCase();
            storyData.coverQcStatus = mappedQcStatusSync;
          }

          pagesUpdated++;

          // Incrementally sync progress to DB after each successful spread
          try {
            await supabase
              .from("orders")
              .update({ story_data: storyData })
              .eq("order_number", orderId);
          } catch (syncErr) {
            console.warn(`[IllustrationWorker] Warning: incremental story_data sync failed for spread ${i + 1}:`, syncErr);
          }
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

      // Final sync of storyData to the database
      await supabase
        .from("orders")
        .update({ story_data: storyData })
        .eq("order_number", orderId);

      if (!allCompleted) {
        // Not all spreads finished. Throw a transient error to trigger the WorkerUtils retry backoff.
        throw new Error(
          "TRANSIENT_BATCH_INCOMPLETE: One or more illustrations failed during generation loop. Will retry missing spreads.",
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
