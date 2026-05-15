import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/Button";
import { backendApi } from "@/services/backendApi";
import * as adminService from "@/services/adminService";
import type { AdminOrder, Language, Page } from "@/types";

interface LegacyProcessModalProps {
  order: AdminOrder;
  onClose: () => void;
  onSuccess: () => void;
  language: Language;
}

export const LegacyProcessModal: React.FC<LegacyProcessModalProps> = ({
  order,
  onClose,
  onSuccess,
  language,
}) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Idle");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);

  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const logMsg = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const [fullOrder, setFullOrder] = useState<AdminOrder | null>(null);

  useEffect(() => {
    logMsg(`Legacy Process started for Protocol: ${order.orderNumber}`);
    adminService
      .getOrderById(order.orderNumber)
      .then((full) => {
        if (full) {
          logMsg(`Order data loaded successfully from Database.`);
          setFullOrder(full);
        } else {
          console.error(
            "LegacyProcessModal could not find order in DB:",
            order.orderNumber,
          );
          setError("Failed to load order data from DB.");
        }
      })
      .catch((err) => {
        console.error("LegacyProcessModal fetch error:", err);
        setError("Error fetching order: " + err.message);
      });
  }, [order.orderNumber]);

  const ensureSafeString = (str: any, defaultStr: string) =>
    typeof str === "string" && str.trim() ? str : defaultStr;

  const startProcessing = async () => {
    setIsProcessing(true);
    setError(null);
    setProgress(5);
    try {
      const activeOrder = fullOrder || order;
      if (!activeOrder) throw new Error("Order data is completely missing!");
      let storyData = activeOrder.storyData as any;
      if (!storyData || Object.keys(storyData).length === 0) {
        // Initial fallback structure if storyData is totally empty
        storyData = { language: language, childName: "Auto" };
      }

      const lang = storyData.language || language || "en";

      logMsg(`Starting Phase 1: Visual DNA & Character Profiling`);
      // Step 1: DNA & Character
      setStatus(t("معالجة الهوية البصرية...", "Processing Visual DNA..."));
      const mainChar = storyData.mainCharacter || {};
      if (!mainChar.imageDNA || mainChar.imageDNA.length === 0) {
        logMsg(
          `Character DNA not found. Calling Vision AI API... (This may take 15-30 seconds)`,
        );
        const dnaPayload = {
          mainCharacter: mainChar,
          theme: ensureSafeString(storyData.theme, "Neutral Setting"),
          style: ensureSafeString(
            storyData.selectedStylePrompt,
            "Painterly illustration",
          ),
          age: ensureSafeString(storyData.childAge, "5"),
        };

        try {
          const dnaRes = (await backendApi.generateDna(dnaPayload)) as any;
          if (dnaRes.error) throw new Error(dnaRes.error as string);

          storyData.mainCharacter = {
            ...mainChar,
            description: dnaRes.physicalDescription,
            imageDNA: [dnaRes.artifiedHeroBase64],
          };
          await adminService.saveOrder(
            order.orderNumber,
            storyData,
            order.shippingDetails,
            activeOrder.total,
          );
        } catch (e: any) {
          throw new Error(
            "DNA Phase Error: " + (e.message || JSON.stringify(e)),
          );
        }
      }
      setProgress(15);

      // Step 2: Story Blueprint & Script
      setStatus(t("كتابة القصة...", "Writing the Story..."));
      const isScriptEmpty =
        !storyData.script ||
        (Array.isArray(storyData.script) &&
          storyData.script.every((s: any) => !s.text || s.text.length < 5));
      if (!storyData.blueprint || isScriptEmpty) {
        try {
          logMsg(
            `Calling Writer AI API with Theme: ${ensureSafeString(storyData.theme, "Birthday")}...`,
          );
          const storyRes = (await backendApi.generateStory({
            storyData,
            language: lang,
          })) as any;
          if (storyRes.error) throw new Error(storyRes.error);

          storyData = {
            ...storyData,
            blueprint: storyRes.blueprint,
            script: storyRes.script || storyRes.rawScript,
            // FIX: Prioritize AI-generated title
            title: storyRes.blueprint?.foundation?.title || storyData.title,
          };
          await adminService.saveOrder(
            order.orderNumber,
            storyData,
            order.shippingDetails,
            activeOrder.total,
          );
        } catch (e: any) {
          throw new Error(
            "Story Phase Error: " + (e.message || JSON.stringify(e)),
          );
        }
      } else {
        logMsg(`Story details already exist, skipping Writer AI.`);
      }
      setProgress(30);

      // Step 3: Visual Plan
      setStatus(t("تخطيط المشاهد...", "Planning Visual Layouts..."));
      if (!storyData.spreadPlan) {
        try {
          logMsg(`Calling Cinematographer AI API...`);
          const planRes = (await backendApi.generateVisualPlan({
            script: storyData.script,
            blueprint: storyData.blueprint,
            visualDNA:
              storyData.selectedStylePrompt || "Painterly illustration",
          })) as any;
          if (planRes.error) throw new Error(planRes.error);

          logMsg(`Cinematographer AI mapped 8 scenes successfully.`);
          storyData = { ...storyData, spreadPlan: planRes.plan };
          await adminService.saveOrder(
            order.orderNumber,
            storyData,
            order.shippingDetails,
            activeOrder.total,
          );
          logMsg(`Visual Plan saved to database.`);
        } catch (e: any) {
          logMsg(`ERROR in Visual Plan Phase: ${e.message}`);
          throw new Error(
            "Visual Plan Phase Error: " + (e.message || JSON.stringify(e)),
          );
        }
      } else {
        logMsg(`Visual Plan already exists, skipping Cinematographer AI.`);
      }
      setProgress(45);

      // Step 4: Engineering Prompts
      logMsg(`Starting Phase 4: AI Prompt Engineering`);
      setStatus(t("هندسة الأوامر الذكية...", "Engineering AI Prompts..."));
      const isPromptsEmpty =
        !storyData.finalPrompts ||
        (Array.isArray(storyData.finalPrompts) &&
          storyData.finalPrompts.every((p: any) => {
            if (typeof p === "string") return p.length < 5;
            if (typeof p === "object" && p !== null)
              return !p.prompt && !p.imagePrompt;
            return true;
          }));

      if (isPromptsEmpty) {
        try {
          logMsg(
            `Calling Prompt Engineer AI... translating narrative to technical parameters.`,
          );
          const promptsRes = (await backendApi.generatePrompts({
            plan: storyData.spreadPlan,
            blueprint: storyData.blueprint,
            visualDNA:
              storyData.selectedStylePrompt || "Painterly illustration",
            childAge: storyData.childAge,
            childDescription: storyData.mainCharacter?.description || "A child",
            childName: storyData.childName,
            secondCharacter: storyData.secondCharacter,
            language: lang,
          })) as any;
          if (promptsRes.error) throw new Error(promptsRes.error);

          logMsg(`Prompt Engineer generated prompt templates accurately.`);
          storyData = { ...storyData, finalPrompts: promptsRes.prompts };
          await adminService.saveOrder(
            order.orderNumber,
            storyData,
            order.shippingDetails,
            activeOrder.total,
          );
          logMsg(`Prompts saved to database.`);
        } catch (e: any) {
          logMsg(`ERROR in Prompt Phase: ${e.message}`);
          throw new Error(
            "Prompt Phase Error: " + (e.message || JSON.stringify(e)),
          );
        }
      } else {
        logMsg(`Prompts already engineered, skipping Prompt AI.`);
      }
      setProgress(55);

      // Step 5: Iterative Image Generation
      logMsg(
        `Starting Phase 5: Image Generation Pipeline (Painting 8 Spreads)`,
      );
      const prompts = storyData.finalPrompts || [];
      if (!prompts || prompts.length === 0)
        throw new Error("No prompts found to generate images.");

      let pages: Page[] = storyData.pages || [];
      // Ensure pages array has all required spots, even if partially filled
      for (let i = 0; i < prompts.length; i++) {
        const txt1 =
          storyData.script?.[i * 2]?.text?.replace(
            /{name}/g,
            storyData.childName,
          ) || "";
        const txt2 =
          storyData.script?.[i * 2 + 1]?.text?.replace(
            /{name}/g,
            storyData.childName,
          ) || "";
        const side = storyData.spreadPlan?.spreads?.[i]?.mainContentSide
          ?.toLowerCase()
          .includes("left")
          ? "left"
          : "right";
        const opp = side === "left" ? "right" : "left";

        if (!pages[i * 2]) {
          pages[i * 2] = {
            pageNumber: i * 2 + 1,
            text: txt1,
            textSide: opp,
            illustrationUrl: "",
            textBlocks: [
              {
                text: txt1,
                position: { top: 20, left: 10, width: 35 },
                alignment: "center",
              },
            ],
          };
        }
        if (!pages[i * 2 + 1]) {
          pages[i * 2 + 1] = {
            pageNumber: i * 2 + 2,
            text: txt2,
            textSide: opp,
            illustrationUrl: "",
            textBlocks: [
              {
                text: txt2,
                position: { top: 20, left: 55, width: 35 },
                alignment: "center",
              },
            ],
          };
        }
      }

      for (let i = 0; i < prompts.length; i++) {
        setStatus(
          t(
            `رسم المشهد ${i + 1}/${prompts.length}...`,
            `Painting Scene ${i + 1}/${prompts.length}...`,
          ),
        );
        const pageIndex = i * 2;
        const existingUrl = pages[pageIndex].illustrationUrl;
        const isCorrupted =
          existingUrl &&
          (existingUrl.endsWith("...") || existingUrl.length < 55);

        if (!existingUrl || isCorrupted) {
          if (isCorrupted)
            logMsg(
              `Detected corrupted image backup for Scene ${i + 1}. Repainting...`,
            );
          logMsg(`--> Painting Scene ${i + 1}/${prompts.length}...`);
          try {
            const rawPrompt = prompts[i];
            const imagePrompt =
              typeof rawPrompt === "string"
                ? rawPrompt
                : rawPrompt?.imagePrompt || rawPrompt?.prompt;

            // DUAL-REFERENCE: raw photo = identity, DNA = style
            const heroRaw =
              storyData.mainCharacter?.imageRawUrl ||
              storyData.mainCharacter?.imageBases64?.[0] ||
              storyData.mainCharacterImageBase64 ||
              storyData.heroImageBase64 ||
              storyData.firstCharacterImageBase64 ||
              storyData.heroImageUrl ||
              storyData.firstCharacterImageUrl;
            const heroDNA =
              storyData.mainCharacter?.imageDNA?.[0] ||
              storyData.styleReferenceImageBase64 ||
              storyData.styleReferenceImageUrl ||
              heroRaw;

            // DEBUG LOG
            console.log(`Processing Scene ${i + 1}:`, {
              hasPrompt: !!imagePrompt,
              promptLength: imagePrompt?.length,
              hasHeroRaw: !!heroRaw,
              hasHeroDNA: !!heroDNA,
              pageIndex,
            });

            if (!imagePrompt || !heroRaw) {
              console.warn(
                `Scene ${i + 1} missing inputs. Prompt: ${!!imagePrompt}, HeroRaw: ${!!heroRaw}`,
              );
              // If we have raw photo but no prompt, use a fallback
              if (heroRaw && !imagePrompt) {
                console.log("Using fallback prompt for Scene", i + 1);
                logMsg(
                  `Missing formal AI Prompt for Scene ${i + 1}. Using Fallback Prompt...`,
                );
                const fallbackPrompt = `A beautiful painterly illustration of ${storyData.childName} in ${storyData.theme}, ${storyData.selectedStylePrompt}`;

                logMsg(
                  `[FALLBACK] Sending fallback prompt to Image AI. This may take 60 seconds...`,
                );
                const imgRes = (await backendApi.generateImage({
                  prompt: fallbackPrompt,
                  stylePrompt: storyData.selectedStylePrompt,
                  heroRawBase64: heroRaw,
                  heroDNABase64: heroDNA,
                  characterDescription: storyData.mainCharacter?.description,
                  age: storyData.childAge || "5",
                })) as any;

                if (imgRes.imageBase64 || imgRes.data?.imageBase64) {
                  logMsg(`Fallback Image successfully generated and received.`);
                  const b64 = imgRes.imageBase64 || imgRes.data?.imageBase64;
                  pages[pageIndex].illustrationUrl = b64;
                  pages[pageIndex + 1].illustrationUrl = b64;
                  pages[pageIndex].actualPrompt = fallbackPrompt;
                  pages[pageIndex + 1].actualPrompt = fallbackPrompt;
                  storyData = { ...storyData, pages };
                  await adminService.saveOrder(
                    order.orderNumber,
                    storyData,
                    order.shippingDetails,
                    activeOrder.total,
                  );
                  continue;
                }
              }
              throw new Error(
                `Missing required inputs for Scene ${i + 1}. Clear browser cache and try again.`,
              );
            }

            logMsg(
              `Sending exact AI Prompt to Image API for Scene ${i + 1}. This paints the actual image and may take 45-60+ seconds...`,
            );

            // Second hero dual references
            const secondHeroRaw =
              storyData.useSecondCharacter &&
              storyData.secondCharacter?.type !== "object"
                ? storyData.secondCharacter?.imageRawUrl ||
                  storyData.secondCharacter?.imageBases64?.[0]
                : undefined;
            const secondHeroDNA =
              storyData.useSecondCharacter &&
              storyData.secondCharacter?.type !== "object"
                ? storyData.secondCharacter?.imageDNA?.[0] || secondHeroRaw
                : undefined;

            const imgRes = (await backendApi.generateImage({
              prompt: imagePrompt,
              stylePrompt: storyData.selectedStylePrompt,
              heroRawBase64: heroRaw,
              heroDNABase64: heroDNA,
              characterDescription: storyData.mainCharacter?.description,
              age: storyData.childAge || "5",
              secondRawBase64: secondHeroRaw,
              secondDNABase64: secondHeroDNA,
            })) as any;

            if (imgRes.imageBase64 || imgRes.data?.imageBase64) {
              logMsg(`✓ Image ${i + 1} perfectly generated and downloaded.`);
              const b64 = imgRes.imageBase64 || imgRes.data?.imageBase64;
              pages[pageIndex].illustrationUrl = b64;
              pages[pageIndex + 1].illustrationUrl = b64;
              pages[pageIndex].actualPrompt = imagePrompt;
              pages[pageIndex + 1].actualPrompt = imagePrompt;
              storyData = { ...storyData, pages };
              await adminService.saveOrder(
                order.orderNumber,
                storyData,
                order.shippingDetails,
                activeOrder.total,
              );
              logMsg(`Saved Image ${i + 1} to Cloud Database.`);
            } else {
              throw new Error(
                `Failed to extract imageBase64 from response: ${JSON.stringify(imgRes).substring(0, 100)}`,
              );
            }
          } catch (e: any) {
            logMsg(
              `[FATAL] Painting Phase Error at Scene ${i + 1}: ${e.message}`,
            );
            throw new Error(
              `Painting Phase Error at Scene ${i + 1}: ` +
                (e.message || JSON.stringify(e)),
            );
          }
        } else {
          logMsg(
            `Scene ${i + 1} image already exists (Source: ${existingUrl?.substring(0, 30)}...). Skipping.`,
          );
        }
        setProgress(55 + 40 * ((i + 1) / prompts.length));
      }

      // Mark Status as generating/complete
      await adminService.updateOrderStatus(
        order.orderNumber,
        "Processing" as any,
      );

      setProgress(100);
      logMsg(`Order fully compiled. Process complete! Launching Editor.`);
      setStatus(t("اكتمل بنجاح!", "Complete!"));
      setTimeout(() => {
        onSuccess();
      }, 3000); // Wait 3 seconds so they can read the logs
    } catch (e: any) {
      console.error("Legacy Processing Error:", e);
      logMsg(`[PROCESS ABORTED] ${e.message}`);
      setError(e.message || "An unknown error occurred");
    } finally {
      setIsProcessing(false);
    }
  };

  // Need a ref to auto-scroll logs
  const logsEndRef = React.useRef<HTMLDivElement>(null);
  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  return (
    <div
      style={{ zIndex: 999999 }}
      className="fixed inset-0 bg-brand-navy/60 backdrop-blur-2xl flex items-center justify-center p-6 overflow-y-auto animate-in fade-in duration-500"
    >
      <div className="glass-panel max-w-[900px] w-full p-12 rounded-[4rem] border-white/60 shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden group">
        {/* Visual Accent */}
        <div className="absolute top-0 left-0 w-full h-[4px] bg-gradient-to-r from-brand-orange via-brand-navy to-brand-teal"></div>

        <button
          onClick={onClose}
          disabled={isProcessing}
          className="absolute top-8 right-8 w-12 h-12 flex items-center justify-center rounded-2xl bg-white/40 border border-white/60 text-brand-navy/30 hover:text-brand-orange hover:rotate-90 transition-all disabled:opacity-20"
        >
          <span className="material-symbols-outlined text-2xl">close</span>
        </button>

        <div className="text-center space-y-3 mb-10">
          <h3 className="text-3xl font-black text-brand-navy uppercase tracking-tighter">
            {t("وحدة التحكم اليدوية", "Manual Control Unit")}
          </h3>
          <div className="flex items-center justify-center gap-3">
            <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse"></span>
            <p className="text-[10px] font-black text-brand-navy/40 uppercase tracking-[0.3em]">
              Protocol Identity: {order.orderNumber}
            </p>
          </div>
        </div>

        {error && (
          <div className="mb-8 p-6 bg-red-50/50 backdrop-blur-md text-red-600 rounded-[2rem] text-[11px] font-bold border-2 border-red-100/50 shadow-inner animate-in slide-in-from-top duration-300">
            <div className="flex items-center gap-3 mb-2">
              <span className="material-symbols-outlined">report</span>
              <span className="uppercase tracking-widest">
                System Breach Detected
              </span>
            </div>
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        <div className="space-y-6 mb-10">
          <div className="flex justify-between items-end px-2">
            <div className="space-y-1">
              <span className="text-[9px] font-black text-brand-navy/30 uppercase tracking-[0.2em]">
                Engine State
              </span>
              <h4 className="text-xs font-black text-brand-navy uppercase tracking-widest">
                {status}
              </h4>
            </div>
            <span className="text-lg font-black text-brand-orange">
              {Math.round(progress)}%
            </span>
          </div>
          <div className="h-6 bg-white/40 rounded-full border border-white/60 p-1 shadow-inner relative overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-brand-orange via-brand-navy to-brand-teal rounded-full transition-all duration-1000 ease-out shadow-lg"
              style={{ width: `${progress}%` }}
            >
              <div className="w-full h-full opacity-20 bg-[url('https://www.transparenttextures.com/patterns/carbon-fibre.png')]"></div>
            </div>
          </div>
        </div>

        {/* Real-Time Logs Window */}
        <div className="flex-1 flex flex-col bg-brand-navy/[0.03] border border-brand-navy/10 rounded-[2.5rem] overflow-hidden shadow-inner mb-10 relative">
          <div className="px-8 py-4 bg-brand-navy/5 border-b border-brand-navy/5 flex justify-between items-center sticky top-0 backdrop-blur-md z-10">
            <span className="text-[9px] font-black text-brand-navy/40 uppercase tracking-widest">
              Diagnostic Stream
            </span>
            <span className="text-[8px] font-mono text-brand-navy/20">
              STDOUT_LOG_V4
            </span>
          </div>
          <div className="flex-1 overflow-y-auto p-8 font-mono text-[11px] scroller-thin">
            <div className="space-y-2">
              {logs.map((log, i) => (
                <div
                  key={i}
                  className={`flex gap-4 group/log ${log.includes("ERROR") || log.includes("FATAL") ? "text-red-500 font-bold" : log.includes("✓") ? "text-brand-teal font-bold" : "text-brand-navy/60"}`}
                >
                  <span className="opacity-20 shrink-0 select-none">
                    [{i + 1}]
                  </span>
                  <span className="leading-relaxed">{log}</span>
                </div>
              ))}
              {isProcessing && (
                <div className="flex gap-4 text-brand-orange animate-pulse">
                  <span className="opacity-20 shrink-0">
                    [{logs.length + 1}]
                  </span>
                  <span className="font-bold">_</span>
                </div>
              )}
            </div>
            <div ref={logsEndRef} />
          </div>
        </div>

        <div className="mt-auto">
          {!isProcessing && progress < 100 && (
            <button
              onClick={startProcessing}
              disabled={!fullOrder}
              className={`w-full py-6 rounded-3xl font-black uppercase text-[11px] tracking-[0.3em] transition-all flex items-center justify-center gap-3 shadow-2xl ${!fullOrder ? "bg-brand-navy/5 text-brand-navy/20 cursor-not-allowed" : "bg-brand-orange text-white hover:scale-[1.02] active:scale-95 shadow-brand-orange/30"}`}
            >
              <span className="material-symbols-outlined text-xl">
                {!fullOrder ? "sync" : "bolt"}
              </span>
              {!fullOrder
                ? "Awaiting Data Sync..."
                : "Initiate Execution Sequence"}
            </button>
          )}
          {progress === 100 && (
            <button
              onClick={onSuccess}
              className="w-full py-6 rounded-3xl bg-brand-teal text-white shadow-2xl shadow-brand-teal/30 font-black uppercase text-[11px] tracking-[0.3em] flex items-center justify-center gap-3 hover:scale-[1.02] active:scale-95 transition-all"
            >
              <span className="material-symbols-outlined text-xl">
                check_circle
              </span>
              Sequence Validated • Deploy Editor
            </button>
          )}
          {isProcessing && (
            <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-500">
              <div className="w-16 h-1 bg-brand-navy/10 rounded-full overflow-hidden relative">
                <div className="absolute inset-0 bg-brand-orange animate-shimmer"></div>
              </div>
              <span className="text-[9px] font-black text-brand-navy/30 uppercase tracking-[0.4em]">
                Engine Warm
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LegacyProcessModal;
