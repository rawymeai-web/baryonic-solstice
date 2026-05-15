import { supabase } from "@/utils/supabaseClient";
import { generateStoryDraft } from "@/services/story/narrativeAgent";
import { runEditorPass } from "@/services/story/editorAgent";
import { generateVisualPlan } from "@/services/visual/director";
import { generatePrompts } from "@/services/visual/promptEngineer";
import { runQualityAssurance } from "@/services/visual/qualityAssurance";
import { WorkerUtils } from "./workerUtils";
import { MasterScheduler } from "./scheduler";

export class StoryWorker {
  /**
   * Executes a single Story Generation job pulled from the queue
   */
  static async processJob(jobId: string, orderId: string, attempts: number) {
    console.log(`[StoryWorker] Initiating Job ${jobId} for Order ${orderId}`);

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
          `[StoryWorker] Job ${jobId} already grabbed by another worker. Aborting.`,
        );
        return;
      }

      const { data: order, error: orderError } = await supabase
        .from("orders")
        .select("story_data, generation_snapshot, order_number")
        .eq("order_number", orderId)
        .single();

      if (orderError || !order)
        throw new Error("Order not found or database error");

      const storyData = order.story_data as any; // The initial blob
      const snapshot = (order.generation_snapshot as any) || {};

      // Extract the frozen inputs from the pre-flight snapshot
      const childAge = snapshot.age || storyData.childAge;
      const childName = storyData.childName;
      const childGender = storyData.childGender;
      const secondCharacter = storyData.secondCharacter;
      const language = storyData.language || "en";

      // CRITICAL FIX: Build the correct art-style DNA priority chain.
      // The frontend locks the customer's chosen style in `technicalStyleGuide` during StyleSelectionScreen.
      // `storyData.visualDNA` was the old/wrong field — it is never set by the frontend pipeline.
      // Priority: 1) technicalStyleGuide (locked preview DNA), 2) selectedStylePrompt, 3) themeVisualDNA, 4) safe fallback.
      const visualDNA: string =
        storyData.technicalStyleGuide ||
        storyData.selectedStylePrompt ||
        storyData.themeVisualDNA ||
        "high quality painterly children's book illustration";

      console.log(
        `[StoryWorker] Resolved visualDNA source: ${
          storyData.technicalStyleGuide
            ? "technicalStyleGuide"
            : storyData.selectedStylePrompt
              ? "selectedStylePrompt"
              : storyData.themeVisualDNA
                ? "themeVisualDNA"
                : "FALLBACK"
        } — Preview: ${String(visualDNA).substring(0, 80)}...`,
      );

      // --------------------------------------------------------
      // 1. GENERATE STORY (Blueprint already exists)
      // --------------------------------------------------------
      if (!storyData.blueprint) {
        throw new Error("Blueprint missing in StoryData. Sequence error.");
      }
      const blueprint = storyData.blueprint;

      console.log(`[StoryWorker] Generating Narrative Draft...`);
      const narRes = await WorkerUtils.withTimeout(
        generateStoryDraft(
          blueprint,
          language,
          childName,
          childGender,
          secondCharacter,
        ),
      );
      if (narRes.log.status === "Failed")
        throw new Error(narRes.log.outputs.error);

      console.log(`[StoryWorker] Running Editor Pass...`);
      const edRes = await WorkerUtils.withTimeout(
        runEditorPass(narRes.result, blueprint, language, childName, childAge),
      );
      const script = edRes.result;

      // --------------------------------------------------------
      // 2. GENERATE VISUAL PLAN & PROMPTS
      // --------------------------------------------------------
      console.log(`[StoryWorker] Resolving Style and Heroes...`);
      const { getStyleProfile } = require("@/services/visual/styles/styleRegistry");
      const styleId = storyData.selected_style_id || "premium_3d_adventure";
      const styleProfile = getStyleProfile(styleId);

      const heroes: any[] = [];
      
      const heroRaw = storyData.mainCharacter?.imageRawUrl || storyData.mainCharacter?.imageBases64?.[0] || storyData.mainCharacterImageBase64 || storyData.heroImageBase64 || storyData.firstCharacterImageBase64 || storyData.heroImageUrl || storyData.firstCharacterImageUrl;
      const heroDNA =
        storyData.styleReferenceImageUrl ||
        storyData.styleReferenceImageBase64 ||
        storyData.mainCharacter?.imageDNA?.[0] ||
        heroRaw;
      
      if (heroRaw || heroDNA) {
          heroes.push({
              hero_id: "hero_1",
              token: "[[HERO_1]]",
              role: "primary",
              identity_anchor_image_index: 1, // Mapped locally
              stylized_dna_image_index: heroDNA ? 2 : undefined,
              real_photo_role: "identity anchor only",
              stylized_reference_role: "character design reference only",
              likeness_rules: {
                  preserve: ["facial likeness", "face shape", "eye spacing", "eyebrow shape", "nose proportions", "smile shape", "skin tone", "hair color", "hairstyle"],
                  avoid: ["pose", "lighting", "realism level", "photographic rendering", "background", "crop"],
                  translation_rule: "Preserve each hero's key identity cues from the real photo, but translate every feature into the selected global style."
              },
              clothing_lock: "Use the approved clothing from the character design reference."
          });
      }

      const secondaryRaw = storyData.secondCharacter?.imageRawUrl || storyData.secondCharacter?.imageBases64?.[0] || storyData.secondCharacterImageBase64 || storyData.secondCharacterImageUrl;
      const secondaryDNA =
        storyData.secondCharacter?.imageDNA?.[0] ||
        storyData.secondCharacterImageBase64 ||
        storyData.secondCharacterImageUrl ||
        secondaryRaw;
      const isSecondaryObject = storyData.secondCharacter?.type === "object";
      
      if (!isSecondaryObject && (secondaryRaw || secondaryDNA)) {
          heroes.push({
              hero_id: "hero_2",
              token: "[[HERO_2]]",
              role: "secondary",
              identity_anchor_image_index: 3,
              stylized_dna_image_index: secondaryDNA ? 4 : undefined,
              real_photo_role: "identity anchor only",
              stylized_reference_role: "character design reference only",
              likeness_rules: {
                  preserve: ["facial likeness", "face shape", "eye spacing", "eyebrow shape", "nose proportions", "smile shape", "skin tone", "hair color", "hairstyle"],
                  avoid: ["pose", "lighting", "realism level", "photographic rendering", "background", "crop"],
                  translation_rule: "Preserve each hero's key identity cues from the real photo, but translate every feature into the selected global style."
              },
              clothing_lock: "Use the approved clothing from the character design reference."
          });
      }

      console.log(`[StoryWorker] Generating Visual Plan...`);
      const planRes = await WorkerUtils.withTimeout(
        generateVisualPlan(script, blueprint, styleProfile, heroes)
      );
      if (planRes.log.status === "Failed") throw new Error(planRes.log.outputs.error);
      const plan = planRes.result;

      console.log(`[StoryWorker] Generating Prompts...`);
      const promptRes = await WorkerUtils.withTimeout(
        generatePrompts(plan, blueprint, styleProfile, heroes)
      );

      // Replaced Quality Assurance pass with the Illustrator Agent
      console.log(`[StoryWorker] Running QA on Prompts...`);
      const { runIllustratorPass } = require("@/services/visual/illustratorAgent");
      const qaRes = await WorkerUtils.withTimeout(
        runIllustratorPass(promptRes.result, blueprint, styleProfile, heroes)
      ) as any;
      const prompts = qaRes.result;


      // --------------------------------------------------------
      // 3. COMPILE AND PERSIST
      // --------------------------------------------------------
      console.log(`[StoryWorker] Saving Artifacts to Database...`);

      // Reconstruct the deep merged story data object
      const updatedStoryData = {
        ...order.story_data,
        blueprint: blueprint,
        rawScript: narRes.result,
        script: script,
        pages: script.map((p: any, i: number) => ({
          pageNumber: i,
          text: p.text,
        })),
        finalPrompts: script.map(() => ""), // initialize empty prompts to match length
        visualPlan: plan,
        prompts: prompts,
        // Add tracking metadata
        prompt_version: "v4-agentic-worker-1",
      };

      // Save to DB
      await supabase
        .from("orders")
        .update({
          story_data: updatedStoryData as any,
          status: "story_ready", // Advance the main state machine
        })
        .eq("order_number", orderId);

      // Log event progress block
      await supabase.from("event_audit_log").insert({
        event_type: "story_generation_completed",
        order_id: orderId,
        details: { timestamp: new Date(), prompts_generated: prompts.length },
      });

      // Mark job complete
      await supabase
        .from("order_jobs")
        .update({
          status: "completed",
          finished_at: new Date().toISOString(),
        })
        .eq("id", jobId);

      // Trigger the next stage automatically (Illustration)
      await MasterScheduler.dispatchJob(orderId, "illustration");
    } catch (error: any) {
      console.error(`[StoryWorker] Error executing job ${jobId}:`, error);
      await WorkerUtils.handleJobFailure(jobId, orderId, error, attempts);
    }
  }
}
