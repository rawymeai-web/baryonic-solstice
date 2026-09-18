import { supabase } from "@/utils/supabaseClient";
import { generateMethod4Image } from "@/services/generation/imageGenerator";
import { QualityAgent, HeroQCRef, isDefiniteHardFailure, rankCandidates } from "../visual/qualityAgent";
import { buildStyleContract, buildGenerationManifest, buildGenerationPayload, buildQualityCheckParams, MissingDnaError } from "../visual/manifestBuilder";
import { WorkerUtils } from "./workerUtils";
import { MasterScheduler } from "./scheduler";
import { EmailService } from "../notifications/emailService";
import { v4 as uuidv4 } from "uuid";

interface GenerationCandidate {
  attemptNumber: number;
  imageUrl: string;
  imageBase64: string;
  qcResult: any;
  compositeScore: number;
}

interface SpreadState {
  index: number;
  isCover: boolean;
  pageIdx: number;
  promptBlock: any;
  authoritativeSpreadText: string;
  resolvedStyleDNA: string;
  heroImagesArray: string[];
  secondaryImagesArray?: string[];
  propImagesArray?: string[];
  heroesQC: HeroQCRef[];
  firstPassUrl?: string;
  firstPassB64?: string;
  isSkipped: boolean;
  candidates: GenerationCandidate[];
  qcParams?: any;
  qaPromise?: Promise<any>;
}

export class IllustrationWorker {
  /**
   * Fast Production Mode: Executes an Illustration Generation job pulled from the queue.
   * 1. Pre-caches reference DNA images into memory once for the entire order.
   * 2. Generates all first-pass images (Cover + Spreads) with overlapping background QA.
   * 3. Executes at most one targeted retry (Attempt 2) for spreads with definite hard failures.
   * 4. Selects the non-regressive best candidate and finalizes the order.
   */
  static async processJob(jobId: string, orderId: string, attempts: number) {
    console.log(
      `[IllustrationWorker] Initiating Job ${jobId} for Order ${orderId} (Fast Production Mode)`,
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
      const childDesc = storyData.mainCharacter?.description || "";

      // Fetch modern DNA references from database
      const { data: dnaRecords } = await supabase
        .from('order_dna')
        .select('*')
        .eq('order_id', orderId)
        .order('created_at', { ascending: false });

      // Authoritative Generation Manifest (Fails closed if required stylized DNA is missing)
      const manifest = buildGenerationManifest(storyData, orderId, dnaRecords || undefined);

      // ------------------------------------------------------------------
      // DNA PRE-CACHING: Fetch and convert references to Base64 ONCE in memory
      // ------------------------------------------------------------------
      console.log(`[IllustrationWorker] Pre-caching DNA reference images into memory for Order ${orderId}...`);

      const resolveToBase64 = async (str: string | undefined): Promise<string | undefined> => {
        if (!str) return undefined;
        if (str.startsWith('http://') || str.startsWith('https://')) {
          try {
            const resp = await fetch(str);
            if (!resp.ok) {
              console.warn(`[IllustrationWorker] Preload fetch returned HTTP ${resp.status} for: ${str}`);
              return undefined;
            }
            const buf = await resp.arrayBuffer();
            return Buffer.from(buf).toString('base64');
          } catch (e) {
            console.error(`[IllustrationWorker] Failed to preload image from URL: ${str}`, e);
            return undefined;
          }
        }
        return str.replace(/^data:image\/\w+;base64,/, '');
      };

      const heroA = manifest.heroes[0];
      const heroB = manifest.heroes[1];
      const propAsset = manifest.propAsset;

      const [heroAStyleB64, heroARawB64, heroBStyleB64, heroBRawB64, propB64] = await Promise.all([
        resolveToBase64(heroA?.stylizedDnaUrl),
        resolveToBase64(heroA?.rawPhotoUrl),
        resolveToBase64(heroB?.stylizedDnaUrl),
        resolveToBase64(heroB?.rawPhotoUrl),
        resolveToBase64(propAsset?.canonicalImageUrl)
      ]);

      if (heroA) {
        if (heroAStyleB64) heroA.stylizedDnaBase64 = heroAStyleB64;
        if (heroARawB64) heroA.rawPhotoUrl = heroARawB64;
      }
      if (heroB) {
        if (heroBStyleB64) heroB.stylizedDnaBase64 = heroBStyleB64;
        if (heroBRawB64) heroB.rawPhotoUrl = heroBRawB64;
      }
      if (propAsset && propB64) {
        propAsset.canonicalImageBase64 = propB64;
      }

      // Composite scoring formula for non-regressive candidate selection
      const computeCompositeScore = (qc: any): number => {
        return (Number(qc.overallLikenessScore ?? qc.likenessScore ?? 0) * 10) +
          (qc.characterConsistencyStatus === 'pass' ? 20 : 0) +
          (qc.styleConsistencyStatus === 'pass' ? 20 : 0) +
          (qc.narrativeAdherenceStatus === 'pass' ? 20 : 0) +
          (qc.propConsistencyStatus === 'pass' || qc.propConsistencyStatus === 'na' ? 20 : 0) +
          (qc.locationConsistencyStatus === 'pass' || qc.locationConsistencyStatus === 'na' ? 10 : 0) +
          (qc.wardrobeConsistencyStatus === 'pass' ? 10 : 0) +
          (qc.textClearanceStatus === 'pass' ? 10 : 0);
      };

      // Event Tracker: Start
      await supabase.from("event_audit_log").insert({
        event_type: "illustrations_started",
        order_id: orderId,
        details: {
          timestamp: new Date(),
          target_spreads: storyData.prompts.length,
          fast_production_mode: true,
        },
      });

      let allCompleted = true;
      let pagesUpdated = 0;
      const spreadStates: SpreadState[] = [];
      const bucket = "images";

      // ------------------------------------------------------------------
      // PHASE 1: FIRST-PASS GENERATION LOOP WITH CONCURRENT BACKGROUND QA
      // ------------------------------------------------------------------
      console.log(`[IllustrationWorker] [Fast Mode Phase 1] Generating first-pass illustrations for ${storyData.prompts.length} spreads...`);

      for (let i = 0; i < storyData.prompts.length; i++) {
        const promptBlock = storyData.prompts[i];
        const isCover = i === 0;
        const pageIdx = isCover ? -1 : i - 1;
        const spreadManifest = manifest.spreads.find(s => s.spreadNumber === i) || manifest.spreads[i];
        const existingUrl = isCover
          ? storyData.coverImageUrl
          : (storyData.spreads?.[i]?.illustrationUrl || storyData.pages?.[pageIdx]?.illustrationUrl || storyData.pages?.[pageIdx]?.imageUrl);

        // Idempotency check: skip if already valid
        const isUrlValid =
          existingUrl &&
          existingUrl.length > 50 &&
          !existingUrl.includes("error") &&
          !existingUrl.endsWith("...");

        const generationPayload = buildGenerationPayload(manifest, i);
        const resolvedStyleDNA = generationPayload.stylePrompt;
        const authoritativeSpreadText = generationPayload.storyText;

        const heroImagesArray: string[] = [heroA?.stylizedDnaBase64 || heroA?.stylizedDnaUrl].filter(Boolean) as string[];
        const isHeroBActive = spreadManifest ? spreadManifest.activeHeroes.some(h => h.heroToken === '[[HERO_2]]') : !!heroB;
        const secondaryImagesArray: string[] | undefined = (heroB && isHeroBActive)
          ? [heroB.stylizedDnaBase64 || heroB.stylizedDnaUrl].filter(Boolean) as string[]
          : undefined;

        const isPropInSpread = spreadManifest ? spreadManifest.includesProp : false;
        const propImagesArray: string[] | undefined = (isPropInSpread && propAsset)
          ? [propAsset.canonicalImageBase64 || propAsset.canonicalImageUrl].filter(Boolean) as string[]
          : undefined;

        const heroesQC: HeroQCRef[] = [
          {
            heroToken: '[[HERO_1]]',
            label: 'Hero A',
            name: heroA?.name || storyData.childName || 'Hero A',
            dnaBase64OrUrl: heroA?.stylizedDnaBase64 || heroA?.stylizedDnaUrl,
            rawBase64OrUrl: heroA?.rawPhotoUrl,
            isVisibleInScene: true,
          }
        ];

        if (heroB) {
          heroesQC.push({
            heroToken: '[[HERO_2]]',
            label: 'Hero B',
            name: heroB.name || 'Hero B',
            dnaBase64OrUrl: heroB.stylizedDnaBase64 || heroB.stylizedDnaUrl,
            rawBase64OrUrl: heroB.rawPhotoUrl,
            isVisibleInScene: isHeroBActive,
          });
        }

        const state: SpreadState = {
          index: i,
          isCover,
          pageIdx,
          promptBlock,
          authoritativeSpreadText,
          resolvedStyleDNA,
          heroImagesArray,
          secondaryImagesArray,
          propImagesArray,
          heroesQC,
          isSkipped: false,
          candidates: []
        };

        if (isUrlValid) {
          console.log(
            `[IllustrationWorker] Spread ${i + 1} (${isCover ? "Cover" : "Page " + (pageIdx + 1)}) already exists. Skipping generation.`,
          );
          state.isSkipped = true;
          state.firstPassUrl = existingUrl;
          spreadStates.push(state);
          continue;
        }

        console.log(
          `[IllustrationWorker] [Fast Mode Phase 1] Generating Image ${i + 1}/${storyData.prompts.length} (${isCover ? "Cover" : "Page " + (pageIdx + 1)})`,
        );

        try {
          const imgRes = await WorkerUtils.withTimeout(
            generateMethod4Image(
              generationPayload.prompt,
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
          }

          state.firstPassUrl = iterationUrl;
          state.firstPassB64 = base64Out;

          // Safe immediate update to storyData for live UI display
          if (!isCover && pageIdx >= 0) {
            if (!storyData.pages) storyData.pages = [];
            while (storyData.pages.length <= pageIdx) storyData.pages.push({});
            storyData.pages[pageIdx] = {
              ...storyData.pages[pageIdx],
              pageNumber: pageIdx + 1,
              text: storyData.pages[pageIdx]?.text || promptBlock.storyText,
              imageUrl: iterationUrl,
              illustrationUrl: iterationUrl,
              promptDetails: promptBlock,
              textSide: (promptBlock.textSide || "right").toLowerCase(),
              qcStatus: "pending",
            };
          }
          if (isCover) {
            storyData.coverImageUrl = iterationUrl;
            storyData.coverTextSide = (promptBlock.textSide || "Right").toLowerCase();
            storyData.coverQcStatus = "pending";
          }

          if (!storyData.spreads) storyData.spreads = [];
          while (storyData.spreads.length <= i) storyData.spreads.push({});
          const resolvedTextSide = (promptBlock.textSide || (promptBlock.mainContentSide === 'left' ? 'right' : 'left') || "right").toLowerCase();
          storyData.spreads[i] = {
            ...storyData.spreads[i],
            spreadNumber: i,
            illustrationUrl: iterationUrl,
            text: isCover ? '' : authoritativeSpreadText,
            leftText: isCover ? '' : (resolvedTextSide === 'left' ? authoritativeSpreadText : ''),
            rightText: isCover ? '' : (resolvedTextSide === 'right' ? authoritativeSpreadText : ''),
            textSide: resolvedTextSide,
            textOffsetX: storyData.spreads[i]?.textOffsetX !== undefined ? storyData.spreads[i].textOffsetX : (resolvedTextSide === 'left' ? 20 : 220),
            textOffsetY: storyData.spreads[i]?.textOffsetY !== undefined ? storyData.spreads[i].textOffsetY : 24,
            actualPrompt: promptBlock.imagePrompt,
            promptDetails: {
              mainContentSide: promptBlock.mainContentSide,
              textSide: resolvedTextSide,
            },
            qcStatus: "pending",
          };

          pagesUpdated++;

          // Dispatch asynchronous background Vision QA via authoritative buildQualityCheckParams
          const qcParams = buildQualityCheckParams(manifest, i, base64Out, 1);
          state.qcParams = qcParams;
          state.qaPromise = QualityAgent.evaluateImage(qcParams).then(async (qcRes) => {
            console.log(
              `[QCAgent] Result for Spread ${i + 1} (Attempt 1 Background): Overall Likeness ${qcRes.overallLikenessScore}/10, Style: ${qcRes.styleConsistencyStatus}, Prop: ${qcRes.propConsistencyStatus || 'n/a'}, Narrative: ${qcRes.narrativeAdherenceStatus}, Location: ${qcRes.locationConsistencyStatus || 'n/a'}, Decision: ${qcRes.overallDecision}`,
            );

            await supabase.from("generation_quality_logs").insert({
              order_id: orderId,
              spread_number: i,
              iteration_number: 1,
              image_url: iterationUrl,
              character_consistency_status: qcRes.characterConsistencyStatus,
              character_reasoning: `[Overall Likeness: ${qcRes.overallLikenessScore}/10] [Prop: ${qcRes.propConsistencyStatus || 'n/a'} - ${qcRes.propReasoning || ''}] [Location: ${qcRes.locationConsistencyStatus || 'n/a'} - ${qcRes.locationReasoning || ''}] [Visual: ${qcRes.visualDescription}] [Narrative Check: ${qcRes.narrativeAdherenceStatus} - ${qcRes.narrativeAdherenceReasoning}] ${qcRes.characterReasoning}`,
              style_consistency_status: qcRes.styleConsistencyStatus,
              style_reasoning: qcRes.styleReasoning,
              text_clearance_status: qcRes.textClearanceStatus,
              text_reasoning: qcRes.textReasoning,
              recommended_text_side: qcRes.recommendedTextSide,
              overall_decision: qcRes.overallDecision,
            });

            return qcRes;
          }).catch(err => {
            console.error(`[QCAgent] Background QA failed on Spread ${i + 1}:`, err);
            return null;
          });

          // Sync intermediate state to DB
          try {
            await supabase.from("orders").update({ story_data: storyData }).eq("order_number", orderId);
          } catch (syncErr) {
            console.warn(`[IllustrationWorker] Intermediate DB sync notice for spread ${i + 1}:`, syncErr);
          }

        } catch (imgError: any) {
          console.error(`[IllustrationWorker] Failed on First-Pass Spread ${i + 1}`, imgError);
          allCompleted = false;
          await supabase.from("event_audit_log").insert({
            event_type: "error",
            order_id: orderId,
            details: {
              error: imgError.message || String(imgError),
              spread_number: i + 1,
              context: "fast_mode_first_pass",
            },
          });
        }

        spreadStates.push(state);
      }

      // Wait for all concurrent QA evaluations to finish
      console.log(`[IllustrationWorker] [Fast Mode] First-pass batch generated. Awaiting background QA evaluations...`);
      await Promise.allSettled(spreadStates.map(s => s.qaPromise));

      // ------------------------------------------------------------------
      // PHASE 2: TARGETED SINGLE-ATTEMPT HARD-FAILURE RETRIES
      // ------------------------------------------------------------------
      console.log(`[IllustrationWorker] [Fast Mode Phase 2] Evaluating QA results for targeted hard-failure retries...`);

      for (const state of spreadStates) {
        if (state.isSkipped || !state.firstPassUrl || !state.firstPassB64) continue;

        const i = state.index;
        const isCover = state.isCover;
        const pageIdx = state.pageIdx;
        let qcResult = await state.qaPromise;

        if (!qcResult) {
          console.warn(`[IllustrationWorker] QA result unavailable for Spread ${i + 1}, failing closed to flagged.`);
          qcResult = {
            overallDecision: 'flagged',
            overallLikenessScore: 0,
            likenessScore: 0,
            characterConsistencyStatus: 'flagged',
            styleConsistencyStatus: 'flagged',
            narrativeAdherenceStatus: 'flagged',
            propConsistencyStatus: 'na',
            locationConsistencyStatus: 'na',
            textClearanceStatus: 'flagged',
            characterReasoning: 'Background QA result unavailable or timed out.'
          };
        }

        state.candidates.push({
          attemptNumber: 1,
          imageUrl: state.firstPassUrl,
          imageBase64: state.firstPassB64,
          qcResult,
          compositeScore: computeCompositeScore(qcResult)
        });

        // Strict Hard-Failure Check: only definite failures trigger Attempt 2
        const hasHardFailure = isDefiniteHardFailure(qcResult);

        if (hasHardFailure) {
          console.log(
            `[IllustrationWorker] Spread ${i + 1} experienced DEFINITE HARD FAILURE (Likeness: ${qcResult.overallLikenessScore ?? qcResult.likenessScore}/10, Char: ${qcResult.characterConsistencyStatus}, Style: ${qcResult.styleConsistencyStatus}, Prop: ${qcResult.propConsistencyStatus || 'n/a'}). Executing Single Targeted Retry (Attempt 2)...`,
          );

          // Build targeted steering prompt
          let targetedPrompt = state.promptBlock.imagePrompt;
          const steeringNotes: string[] = [];
          if (qcResult.characterConsistencyStatus === 'fail' || (qcResult.overallLikenessScore ?? qcResult.likenessScore) < 7) {
            steeringNotes.push(`CRITICAL CHARACTER LIKENESS FIX: ${qcResult.characterReasoning}`);
          }
          if (qcResult.styleConsistencyStatus === 'fail') {
            steeringNotes.push(`CRITICAL STYLE CONSISTENCY FIX: ${qcResult.styleReasoning || 'Strictly match target style medium and dimensionality.'}`);
          }
          if (qcResult.propConsistencyStatus === 'fail') {
            steeringNotes.push(`CRITICAL RECURRING PROP INVARIANCE FIX: ${qcResult.propReasoning || qcResult.regenerationReason || 'Match the canonical prop reference image exactly.'}`);
          }
          if (qcResult.locationConsistencyStatus === 'fail') {
            steeringNotes.push(`CRITICAL LOCATION CONTINUITY FIX: ${qcResult.locationReasoning || 'Ensure architecture and materials match location contract.'}`);
          }
          if (qcResult.narrativeAdherenceStatus === 'fail') {
            steeringNotes.push(`CRITICAL SCENE ACTION FIX: Ensure the scene directly depicts: ${state.authoritativeSpreadText}. Avoid incorrect actions.`);
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
                state.resolvedStyleDNA,
                state.heroImagesArray,
                childDesc,
                childAge,
                Math.floor(Math.random() * 100000) + 1,
                state.secondaryImagesArray,
                undefined,
                state.propImagesArray
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
                console.log(`[IllustrationWorker] Spread ${i + 1} repainted (Attempt 2). Running QA Evaluation...`);

                const regenQcParams = buildQualityCheckParams(manifest, i, base64OutRegen, 2);
                regenQcParams.targetPrompt = targetedPrompt;

                const qcRegenResult = await QualityAgent.evaluateImage(regenQcParams);

                console.log(
                  `[QCAgent] Result for Spread ${i + 1} (Attempt 2): Likeness ${qcRegenResult.overallLikenessScore}/10, Style: ${qcRegenResult.styleConsistencyStatus}, Prop: ${qcRegenResult.propConsistencyStatus || 'n/a'}, Decision: ${qcRegenResult.overallDecision}`,
                );

                state.candidates.push({
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
                  character_reasoning: `[Overall Likeness: ${qcRegenResult.overallLikenessScore}/10] [Visual (Iter 2): ${qcRegenResult.visualDescription}] [Narrative Check: ${qcRegenResult.narrativeAdherenceStatus}] [Location: ${qcRegenResult.locationConsistencyStatus || 'n/a'}] ${qcRegenResult.characterReasoning}`,
                  style_consistency_status: qcRegenResult.styleConsistencyStatus,
                  style_reasoning: qcRegenResult.styleReasoning,
                  text_clearance_status: qcRegenResult.textClearanceStatus,
                  text_reasoning: qcRegenResult.textReasoning,
                  recommended_text_side: qcRegenResult.recommendedTextSide,
                  overall_decision: qcRegenResult.overallDecision,
                });
              }
            }
          } catch (regenErr) {
            console.error(`[IllustrationWorker] Failed during targeted retry for Spread ${i + 1}:`, regenErr);
          }
        } else {
          console.log(
            `[IllustrationWorker] Spread ${i + 1} QA: Likeness ${qcResult.overallLikenessScore || qcResult.likenessScore}/10 (${qcResult.overallDecision === 'pass' ? 'PASSED' : 'FLAGGED'}). No retry needed.`,
          );
        }

        // ------------------------------------------------------------------
        // BEST-CANDIDATE SELECTION: Non-regressive choice between Attempt 1 & 2 via rankCandidates
        // ------------------------------------------------------------------
        state.candidates.sort((a, b) => rankCandidates(a, b));
        const bestCandidate = state.candidates[0];
        const finalFinalUrl = bestCandidate.imageUrl;
        const finalQc = bestCandidate.qcResult;
        const overallDecision = bestCandidate.qcResult.overallDecision;
        const mappedQcStatus = overallDecision === "pass" ? "passed" : "flagged";
        const firstAttemptUrl = state.candidates.find(c => c.attemptNumber === 1)?.imageUrl;
        const originalUrl = bestCandidate.attemptNumber > 1 ? firstAttemptUrl : undefined;

        console.log(
          `[IllustrationWorker] Spread ${i + 1} Final Selection: Attempt ${bestCandidate.attemptNumber} (Decision: ${overallDecision}, Likeness: ${finalQc.overallLikenessScore ?? finalQc.likenessScore})`,
        );

        if (!isCover && pageIdx >= 0 && storyData.pages && storyData.pages[pageIdx]) {
          storyData.pages[pageIdx].qcStatus = mappedQcStatus;
          storyData.pages[pageIdx].textSide = finalQc.recommendedTextSide?.toLowerCase() || "right";
          storyData.pages[pageIdx].imageUrl = finalFinalUrl;
          storyData.pages[pageIdx].illustrationUrl = finalFinalUrl;
          if (originalUrl) {
            storyData.pages[pageIdx].qcOriginalUrl = originalUrl;
          }
        }

        if (storyData.spreads && storyData.spreads[i]) {
          const resolvedTextSide = (state.promptBlock.textSide || (state.promptBlock.mainContentSide === 'left' ? 'right' : 'left') || "right").toLowerCase();
          storyData.spreads[i] = {
            ...storyData.spreads[i],
            spreadNumber: i,
            illustrationUrl: finalFinalUrl,
            qcOriginalUrl: originalUrl || storyData.spreads[i].qcOriginalUrl || undefined,
            text: isCover ? '' : state.authoritativeSpreadText,
            leftText: isCover ? '' : (resolvedTextSide === 'left' ? state.authoritativeSpreadText : ''),
            rightText: isCover ? '' : (resolvedTextSide === 'right' ? state.authoritativeSpreadText : ''),
            textSide: resolvedTextSide,
            textOffsetX: storyData.spreads[i].textOffsetX !== undefined ? storyData.spreads[i].textOffsetX : (resolvedTextSide === 'left' ? 20 : 220),
            textOffsetY: storyData.spreads[i].textOffsetY !== undefined ? storyData.spreads[i].textOffsetY : 24,
            actualPrompt: state.promptBlock.imagePrompt,
            promptDetails: {
              mainContentSide: state.promptBlock.mainContentSide,
              textSide: resolvedTextSide,
            },
            qcStatus: mappedQcStatus,
          };
        }

        if (isCover) {
          storyData.coverImageUrl = finalFinalUrl;
          storyData.coverOriginalUrl = originalUrl || storyData.coverOriginalUrl || undefined;
          storyData.actualCoverPrompt = state.promptBlock.imagePrompt;
          storyData.coverTextSide = (state.promptBlock.textSide || "Right").toLowerCase();
          storyData.coverQcStatus = mappedQcStatus;
        }

        // Dispatch Admin QA Alert Email for flagged spreads (routes to admin review queue)
        if (mappedQcStatus === "flagged") {
          console.warn(`[QCAgent] Spread ${i + 1} flagged for admin review. Dispatching Admin QA Email Alert.`);
          EmailService.sendAdminQaAlert(orderId, isCover ? 'cover' : i, {
            childName: storyData.childName,
            likenessScore: finalQc.overallLikenessScore ?? finalQc.likenessScore,
            characterConsistency: finalQc.characterConsistencyStatus,
            reason: finalQc.regenerationReason || finalQc.characterReasoning || finalQc.styleReasoning || 'Borderline likeness/clearance requirement flagged for review.',
            illustrationUrl: finalFinalUrl,
            attemptCount: state.candidates.length
          }).catch(emailErr => console.error('[QCAgent] Failed to dispatch Admin QA email:', emailErr));
        }
      }

      // Final sync of storyData to the database
      await supabase
        .from("orders")
        .update({ story_data: storyData })
        .eq("order_number", orderId);

      if (!allCompleted) {
        throw new Error(
          "TRANSIENT_BATCH_INCOMPLETE: One or more illustrations failed during generation loop. Will retry missing spreads.",
        );
      }

      // --------------------------------------------------------
      // 3. SUCCESS COMPLETION
      // --------------------------------------------------------
      console.log(
        `[IllustrationWorker] Completed Job ${jobId}. All illustrations processed in Fast Production Mode.`,
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
          fast_production_mode: true,
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
      if (error instanceof MissingDnaError || error?.name === 'MissingDnaError') {
        console.error(`[IllustrationWorker] Fail-closed: Missing DNA error for order ${orderId}: ${error.message}`);
        await supabase.from("orders").update({ status: "dna_missing" }).eq("order_number", orderId);
        await supabase.from("event_audit_log").insert({
          event_type: "illustration_generation_failed",
          order_id: orderId,
          details: {
            error: error.message,
            missingHero: error.missingHero,
            failClosed: true
          }
        });
      }
      console.error(
        `[IllustrationWorker] Fatal Error executing job ${jobId}:`,
        error,
      );
      await WorkerUtils.handleJobFailure(jobId, orderId, error, attempts);
    }
  }
}
