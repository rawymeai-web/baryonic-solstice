import { supabase } from "@/utils/supabaseClient";
import { generateMethod4Image } from "@/services/generation/imageGenerator";
import { QualityAgent, HeroQCRef, isDefiniteHardFailure } from "../visual/qualityAgent";
import { buildStyleContract } from "../visual/manifestBuilder";
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

      let heroRaw = hAOrigUrl ||
        storyData.mainCharacter?.imageRawUrl ||
        storyData.mainCharacter?.imageBases64?.[0] ||
        storyData.mainCharacterImageBase64 ||
        storyData.heroImageBase64 ||
        storyData.firstCharacterImageBase64 ||
        storyData.heroImageUrl ||
        storyData.firstCharacterImageUrl || "";

      const heroDNA =
        hAStyleUrl ||
        storyData.mainCharacter?.imageDNA?.[0] ||
        storyData.styleReferenceImageUrl ||
        storyData.styleReferenceImageBase64 ||
        heroRaw;

      let secondaryDNA: string | undefined = undefined;
      let secondaryRaw: string | undefined = undefined;
      if (storyData.useSecondCharacter) {
        secondaryDNA =
          hBStyleUrl ||
          storyData.secondCharacter?.imageDNA?.[0] ||
          storyData.secondCharacterImageBase64 ||
          storyData.secondCharacterImageUrl ||
          (storyData.secondCharacter?.imageBases64?.[0] || "");

        secondaryRaw =
          hBOrigUrl ||
          storyData.secondCharacter?.imageRawUrl ||
          storyData.secondCharacter?.imageBases64?.[0] ||
          storyData.secondCharacterImageBase64 ||
          storyData.secondCharacterImageUrl || "";

        if (storyData.secondCharacter?.type === "object") {
          secondaryDNA = undefined;
          secondaryRaw = undefined;
        }
      }

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

      const [heroDnaB64, heroRawB64, secDnaB64, secRawB64, propAssetB64] = await Promise.all([
        resolveToBase64(heroDNA),
        resolveToBase64(heroRaw),
        resolveToBase64(secondaryDNA),
        resolveToBase64(secondaryRaw),
        resolveToBase64(propAssetUrl)
      ]);

      const cachedHeroDNA = heroDnaB64 || heroDNA;
      const cachedHeroRaw = heroRawB64 || heroRaw;
      const cachedSecDNA = secDnaB64 || secondaryDNA;
      const cachedSecRaw = secRawB64 || secondaryRaw;
      const cachedPropAsset = propAssetB64 || propAssetUrl;

      // Composite scoring formula for non-regressive candidate selection
      const computeCompositeScore = (qc: any): number => {
        return (Number(qc.likenessScore || 0) * 10) +
          (qc.characterConsistencyStatus === 'pass' ? 20 : 0) +
          (qc.styleConsistencyStatus === 'pass' ? 20 : 0) +
          (qc.narrativeAdherenceStatus === 'pass' ? 20 : 0) +
          (qc.propConsistencyStatus === 'pass' || qc.propConsistencyStatus === 'na' ? 20 : 0) +
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
        const existingUrl = isCover
          ? storyData.coverImageUrl
          : (storyData.spreads?.[i]?.illustrationUrl || storyData.pages?.[pageIdx]?.illustrationUrl || storyData.pages?.[pageIdx]?.imageUrl);

        // Idempotency check: skip if already valid
        const isUrlValid =
          existingUrl &&
          existingUrl.length > 50 &&
          !existingUrl.includes("error") &&
          !existingUrl.endsWith("...");

        const recurringAsset = storyData.blueprint?.foundation?.recurringAsset;
        const isPropInSpread = !!cachedPropAsset && (
          promptBlock.imagePrompt?.includes('[[PROP_ASSET]]') ||
          (recurringAsset?.appearancesSpreads && Array.isArray(recurringAsset.appearancesSpreads) && recurringAsset.appearancesSpreads.includes(i)) ||
          (recurringAsset?.name && promptBlock.imagePrompt?.toLowerCase().includes(recurringAsset.name.toLowerCase()))
        );
        const propImagesArray: string[] | undefined = (isPropInSpread && cachedPropAsset) ? [cachedPropAsset] : undefined;

        const styleContract = buildStyleContract(storyData);
        const resolvedStyleDNA = styleContract.compiledStylePrompt;

        const heroImagesArray: string[] = [cachedHeroDNA].filter(Boolean) as string[];
        const secondaryImagesArray: string[] | undefined = cachedSecDNA ? [cachedSecDNA] : undefined;

        const authoritativeSpreadText = (!isCover && pageIdx >= 0 && storyData.pages?.[pageIdx]?.text)
          ? storyData.pages[pageIdx].text
          : (promptBlock.storyText || "");

        const heroesQC: HeroQCRef[] = [
          {
            heroToken: '[[HERO_1]]',
            label: 'Hero A',
            name: storyData.childName || storyData.mainCharacter?.name || 'Hero A',
            dnaBase64OrUrl: cachedHeroDNA,
            rawBase64OrUrl: cachedHeroRaw,
            isVisibleInScene: true,
          }
        ];

        if (storyData.useSecondCharacter && cachedSecDNA) {
          const isHeroBInScene = !promptBlock.imagePrompt?.includes('[[HERO_1]] is alone') &&
            (!promptBlock.imagePrompt?.includes('Render ONLY the active hero [[HERO_1]]'));
          heroesQC.push({
            heroToken: '[[HERO_2]]',
            label: 'Hero B',
            name: storyData.secondCharacter?.name || 'Hero B',
            dnaBase64OrUrl: cachedSecDNA,
            rawBase64OrUrl: cachedSecRaw,
            isVisibleInScene: isHeroBInScene,
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

          // Dispatch asynchronous background Vision QA (Non-blocking!)
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

          state.qcParams = qcParams;
          state.qaPromise = QualityAgent.evaluateImage(qcParams).then(async (qcRes) => {
            console.log(
              `[QCAgent] Result for Spread ${i + 1} (Attempt 1 Background): Likeness ${qcRes.likenessScore}/10, Style: ${qcRes.styleConsistencyStatus}, Prop: ${qcRes.propConsistencyStatus || 'n/a'}, Narrative: ${qcRes.narrativeAdherenceStatus}, Decision: ${qcRes.overallDecision}`,
            );

            await supabase.from("generation_quality_logs").insert({
              order_id: orderId,
              spread_number: i,
              iteration_number: 1,
              image_url: iterationUrl,
              character_consistency_status: qcRes.characterConsistencyStatus,
              character_reasoning: `[Likeness: ${qcRes.likenessScore}/10] [Prop: ${qcRes.propConsistencyStatus || 'n/a'} - ${qcRes.propReasoning || ''}] [Visual: ${qcRes.visualDescription}] [Narrative Check: ${qcRes.narrativeAdherenceStatus} - ${qcRes.narrativeAdherenceReasoning}] ${qcRes.characterReasoning}`,
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
          console.warn(`[IllustrationWorker] QA result unavailable for Spread ${i + 1}, retaining first-pass image.`);
          continue;
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
            `[IllustrationWorker] Spread ${i + 1} experienced DEFINITE HARD FAILURE (Likeness: ${qcResult.likenessScore}/10, Char: ${qcResult.characterConsistencyStatus}, Style: ${qcResult.styleConsistencyStatus}, Prop: ${qcResult.propConsistencyStatus || 'n/a'}). Executing Single Targeted Retry (Attempt 2)...`,
          );

          // Build targeted steering prompt
          let targetedPrompt = state.promptBlock.imagePrompt;
          const steeringNotes: string[] = [];
          if (qcResult.characterConsistencyStatus === 'fail' || qcResult.likenessScore < 7) {
            steeringNotes.push(`CRITICAL CHARACTER LIKENESS FIX: ${qcResult.characterReasoning}`);
          }
          if (qcResult.styleConsistencyStatus === 'fail') {
            steeringNotes.push(`CRITICAL STYLE CONSISTENCY FIX: ${qcResult.styleReasoning || 'Strictly match target style medium and dimensionality.'}`);
          }
          if (qcResult.propConsistencyStatus === 'fail') {
            steeringNotes.push(`CRITICAL RECURRING PROP INVARIANCE FIX: ${qcResult.propReasoning || qcResult.regenerationReason || 'Match the canonical prop reference image exactly.'}`);
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

                const qcRegenResult = await QualityAgent.evaluateImage({
                  ...state.qcParams,
                  generatedImageBase64: base64OutRegen,
                  targetPrompt: targetedPrompt,
                  iterationNumber: 2
                });

                console.log(
                  `[QCAgent] Result for Spread ${i + 1} (Attempt 2): Likeness ${qcRegenResult.likenessScore}/10, Style: ${qcRegenResult.styleConsistencyStatus}, Prop: ${qcRegenResult.propConsistencyStatus || 'n/a'}, Decision: ${qcRegenResult.overallDecision}`,
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
                  character_reasoning: `[Likeness: ${qcRegenResult.likenessScore}/10] [Visual (Iter 2): ${qcRegenResult.visualDescription}] [Narrative Check: ${qcRegenResult.narrativeAdherenceStatus}] ${qcRegenResult.characterReasoning}`,
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
            `[IllustrationWorker] Spread ${i + 1} QA: Likeness ${qcResult.likenessScore}/10 (${qcResult.overallDecision === 'pass' ? 'PASSED' : 'FLAGGED'}). No retry needed.`,
          );
        }

        // ------------------------------------------------------------------
        // BEST-CANDIDATE SELECTION: Non-regressive choice between Attempt 1 & 2
        // ------------------------------------------------------------------
        state.candidates.sort((a, b) => b.compositeScore - a.compositeScore);
        const bestCandidate = state.candidates[0];
        const finalFinalUrl = bestCandidate.imageUrl;
        const finalQc = bestCandidate.qcResult;
        const overallDecision = bestCandidate.qcResult.overallDecision;
        const mappedQcStatus = overallDecision === "pass" ? "passed" : "flagged";
        const firstAttemptUrl = state.candidates.find(c => c.attemptNumber === 1)?.imageUrl;
        const originalUrl = bestCandidate.attemptNumber > 1 ? firstAttemptUrl : undefined;

        console.log(
          `[IllustrationWorker] Spread ${i + 1} Final Selection: Attempt ${bestCandidate.attemptNumber} (Score: ${bestCandidate.compositeScore}, Decision: ${overallDecision})`,
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
            likenessScore: finalQc.likenessScore,
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
      console.error(
        `[IllustrationWorker] Fatal Error executing job ${jobId}:`,
        error,
      );
      await WorkerUtils.handleJobFailure(jobId, orderId, error, attempts);
    }
  }
}
