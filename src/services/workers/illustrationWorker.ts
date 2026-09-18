import { supabase } from "@/utils/supabaseClient";
import { generateMethod4Image } from "@/services/generation/imageGenerator";
import { QualityAgent, HeroQCRef } from "../visual/qualityAgent";
import { PromptDoctor } from "../visual/promptDoctor";
import { buildStyleContract } from "../visual/manifestBuilder";
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
      // Explicit staff/story_data override takes highest precedence
      if (storyData.recurringAssetImageUrl) {
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

          // STYLE DNA: Authoritative StyleContract compilation
          const styleContract = buildStyleContract(storyData);
          const resolvedStyleDNA = styleContract.compiledStylePrompt;

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

          // Candidate Pool for Non-Regressive Best-Attempt Selection
          interface GenerationCandidate {
            attemptNumber: number;
            imageUrl: string;
            imageBase64: string;
            qcResult: any;
            compositeScore: number;
          }

          const computeCompositeScore = (qc: any): number => {
            return (Number(qc.likenessScore || 0) * 10) +
              (qc.characterConsistencyStatus === 'pass' ? 20 : 0) +
              (qc.styleConsistencyStatus === 'pass' ? 20 : 0) +
              (qc.narrativeAdherenceStatus === 'pass' ? 20 : 0) +
              (qc.propConsistencyStatus === 'pass' || qc.propConsistencyStatus === 'na' ? 20 : 0) +
              (qc.wardrobeConsistencyStatus === 'pass' ? 10 : 0) +
              (qc.textClearanceStatus === 'pass' ? 10 : 0);
          };

          const candidates: GenerationCandidate[] = [];
          let overallDecision = "pending";
          let originalUrl: string | undefined = undefined;

          // Prepare Typed Heroes for Vision QA
          const heroesQC: HeroQCRef[] = [
            {
              heroToken: '[[HERO_1]]',
              label: 'Hero A',
              name: storyData.childName || storyData.mainCharacter?.name || 'Hero A',
              dnaBase64OrUrl: heroDNA,
              rawBase64OrUrl: heroRaw,
              isVisibleInScene: true,
            }
          ];

          if (storyData.useSecondCharacter && secondaryDNA) {
            const isHeroBInScene = !promptBlock.imagePrompt?.includes('[[HERO_1]] is alone') &&
              (!promptBlock.imagePrompt?.includes('Render ONLY the active hero [[HERO_1]]'));
            heroesQC.push({
              heroToken: '[[HERO_2]]',
              label: 'Hero B',
              name: storyData.secondCharacter?.name || 'Hero B',
              dnaBase64OrUrl: secondaryDNA,
              rawBase64OrUrl: hBOrigUrl || storyData.secondCharacter?.imageRawUrl || storyData.secondCharacter?.imageBases64?.[0],
              isVisibleInScene: isHeroBInScene,
            });
          }

          try {
            const authoritativeSpreadText = (!isCover && pageIdx >= 0 && storyData.pages?.[pageIdx]?.text)
              ? storyData.pages[pageIdx].text
              : (promptBlock.storyText || "");

            const qcParams = {
              generatedImageBase64: base64Out,
              heroes: heroesQC,
              rawHeroImages: heroImagesArray,
              stylizedDnaImages: heroImagesArray,
              childDescription: childDesc,
              childAge: childAge,
              targetPrompt: promptBlock.imagePrompt,
              stylePrompt: resolvedStyleDNA,
              propAssetImageBase64: propImagesArray?.[0],
              propAssetImageUrl: propAssetUrl,
              spreadNumber: i,
              isCover: isCover,
              spreadText: authoritativeSpreadText,
              storyText: authoritativeSpreadText,
              layoutPlanSide: promptBlock.textSide || "Right",
            };

            let qcResult = await QualityAgent.evaluateImage(qcParams);

            console.log(
              `[QCAgent] Result for Spread ${i} (Attempt 1): Likeness ${qcResult.likenessScore}/10, Prop: ${qcResult.propConsistencyStatus || 'n/a'}, Style: ${qcResult.styleConsistencyStatus}, Narrative: ${qcResult.narrativeAdherenceStatus}, Decision: ${qcResult.overallDecision}`,
            );

            candidates.push({
              attemptNumber: 1,
              imageUrl: iterationUrl,
              imageBase64: base64Out,
              qcResult,
              compositeScore: computeCompositeScore(qcResult)
            });

            overallDecision = qcResult.overallDecision;

            await supabase.from("generation_quality_logs").insert({
              order_id: orderId,
              spread_number: i,
              iteration_number: 1,
              image_url: iterationUrl,
              character_consistency_status: qcResult.characterConsistencyStatus,
              character_reasoning: `[Likeness: ${qcResult.likenessScore}/10] [Prop: ${qcResult.propConsistencyStatus || 'n/a'} - ${qcResult.propReasoning || ''}] [Visual: ${qcResult.visualDescription}] [Narrative Check: ${qcResult.narrativeAdherenceStatus} - ${qcResult.narrativeAdherenceReasoning}] ${qcResult.characterReasoning}`,
              style_consistency_status: qcResult.styleConsistencyStatus,
              style_reasoning: qcResult.styleReasoning,
              text_clearance_status: qcResult.textClearanceStatus,
              text_reasoning: qcResult.textReasoning,
              recommended_text_side: qcResult.recommendedTextSide,
              overall_decision: qcResult.overallDecision,
            });

            // ATTEMPT 2: TARGETED REPAINT & RE-EVALUATION (Max 2 Attempts Per Spread Cap)
            if (qcResult.overallDecision === "fail" || qcResult.overallDecision === "flagged") {
              console.log(`[QCAgent] Spread ${i} failed/flagged on Attempt 1. Triggering targeted Art Director repaint (Attempt 2)...`);
              
              // Build targeted steering prompt
              let targetedPrompt = promptBlock.imagePrompt;
              const steeringNotes: string[] = [];
              if (qcResult.characterConsistencyStatus === 'fail' || qcResult.likenessScore < 7) {
                steeringNotes.push(`CRITICAL CHARACTER LIKENESS FIX: ${qcResult.characterReasoning}`);
              }
              if (qcResult.styleConsistencyStatus === 'fail') {
                steeringNotes.push(`CRITICAL STYLE CONSISTENCY FIX: ${qcResult.styleReasoning || 'Strictly match target style medium and dimensionality.'}`);
              }
              if (qcResult.propConsistencyStatus === 'fail') {
                steeringNotes.push(`CRITICAL RECURRING PROP INVARIANCE FIX: ${qcResult.propReasoning || qcResult.regenerationReason || 'Match the canonical prop reference image exactly in materials, shape, and colors.'}`);
              }
              if (qcResult.narrativeAdherenceStatus === 'fail') {
                steeringNotes.push(`CRITICAL SCENE ACTION FIX: Ensure the scene directly depicts: ${authoritativeSpreadText}. Avoid incorrect actions.`);
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
                    Math.floor(Math.random() * 100000) + 1,
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
                    const attempt2Url = publicDataRegen.publicUrl;
                    console.log(`[QCAgent] Spread ${i} repainted (Attempt 2). Running Iteration 2 QA Re-Evaluation...`);

                    const qcRegenResult = await QualityAgent.evaluateImage({
                      ...qcParams,
                      generatedImageBase64: base64OutRegen,
                      targetPrompt: targetedPrompt,
                    });

                    console.log(
                      `[QCAgent] Result for Spread ${i} (Attempt 2): Likeness ${qcRegenResult.likenessScore}/10, Style: ${qcRegenResult.styleConsistencyStatus}, Prop: ${qcRegenResult.propConsistencyStatus || 'n/a'}, Narrative: ${qcRegenResult.narrativeAdherenceStatus}, Decision: ${qcRegenResult.overallDecision}`,
                    );

                    candidates.push({
                      attemptNumber: 2,
                      imageUrl: attempt2Url,
                      imageBase64: base64OutRegen,
                      qcResult: qcRegenResult,
                      compositeScore: computeCompositeScore(qcRegenResult)
                    });

                    await supabase.from("generation_quality_logs").insert({
                      order_id: orderId,
                      spread_number: i,
                      iteration_number: 2,
                      image_url: attempt2Url,
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
                          storyText: authoritativeSpreadText,
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
                            const attempt3Url = publicData3.publicUrl;
                            console.log(`[QCAgent] Spread ${i} (Attempt 3 / Doctor) painted. Running QA Evaluation...`);

                            const qc3Result = await QualityAgent.evaluateImage({
                              ...qcParams,
                              generatedImageBase64: base64OutAttempt3,
                              targetPrompt: promptAttempt3,
                              iterationNumber: 3
                            });

                            console.log(
                              `[QCAgent] Result for Spread ${i} (Attempt 3 / Doctor): Likeness ${qc3Result.likenessScore}/10, Style: ${qc3Result.styleConsistencyStatus}, Narrative: ${qc3Result.narrativeAdherenceStatus}, Decision: ${qc3Result.overallDecision}`,
                            );

                            candidates.push({
                              attemptNumber: 3,
                              imageUrl: attempt3Url,
                              imageBase64: base64OutAttempt3,
                              qcResult: qc3Result,
                              compositeScore: computeCompositeScore(qc3Result)
                            });

                            await supabase.from("generation_quality_logs").insert({
                              order_id: orderId,
                              spread_number: i,
                              iteration_number: 3,
                              image_url: attempt3Url,
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
                  }
                } else {
                  console.warn(`[QCAgent] Failed to upload regenerated image for Spread ${i + 1}:`, uploadErrRegen);
                }
              } catch (regenErr) {
                console.error(`[QCAgent] Failed to automatically regenerate Spread ${i + 1}:`, regenErr);
              }
            }

            // BEST-CANDIDATE SELECTION: Select the highest-scoring candidate across all attempts
            candidates.sort((a, b) => b.compositeScore - a.compositeScore);
            const bestCandidate = candidates[0];
            finalFinalUrl = bestCandidate.imageUrl;
            qcResult = bestCandidate.qcResult;
            overallDecision = bestCandidate.qcResult.overallDecision;

            console.log(
              `[IllustrationWorker] Spread ${i} selected Best Candidate: Attempt ${bestCandidate.attemptNumber} (Composite Score: ${bestCandidate.compositeScore}, Likeness: ${bestCandidate.qcResult.likenessScore}/10, Decision: ${overallDecision})`,
            );

            // Update local storyData with QC results
            const mappedQcStatus = overallDecision === "pass" ? "passed" : "flagged";
            const firstAttemptUrl = candidates.find(c => c.attemptNumber === 1)?.imageUrl;
            originalUrl = bestCandidate.attemptNumber > 1 ? firstAttemptUrl : undefined;

            if (!isCover && pageIdx >= 0 && storyData.pages && storyData.pages[pageIdx]) {
              storyData.pages[pageIdx].qcStatus = mappedQcStatus;
              storyData.pages[pageIdx].textSide = qcResult.recommendedTextSide?.toLowerCase() || "right";
              storyData.pages[pageIdx].imageUrl = finalFinalUrl;
              storyData.pages[pageIdx].illustrationUrl = finalFinalUrl;
              if (originalUrl) {
                storyData.pages[pageIdx].qcOriginalUrl = originalUrl;
              }
            }
            if (storyData.spreads && storyData.spreads[i]) {
              storyData.spreads[i].qcStatus = mappedQcStatus;
              storyData.spreads[i].textSide = qcResult.recommendedTextSide?.toLowerCase() || "right";
              if (originalUrl) {
                storyData.spreads[i].qcOriginalUrl = originalUrl;
              }
            }
            if (isCover) {
              storyData.coverTextSide = qcResult.recommendedTextSide?.toLowerCase() || "right";
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
