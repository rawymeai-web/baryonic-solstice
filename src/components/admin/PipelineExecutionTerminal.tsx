import React, { useState, useEffect, useRef } from "react";
import { backendApi } from "../../services/backendApi";
import * as adminService from "../../services/adminService";
import type { AdminOrder, Language, Page } from "../../types";
import { Spinner } from "../ui/Spinner";

interface PipelineExecutionTerminalProps {
  order: AdminOrder;
  onClose: () => void;
  onSuccess: () => void;
  language: Language;
}

export const PipelineExecutionTerminal: React.FC<
  PipelineExecutionTerminalProps
> = ({ order, onClose, onSuccess, language }) => {
  const [progress, setProgress] = useState(0);
  const [status, setStatus] = useState("Standby");
  const [error, setError] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [logs, setLogs] = useState<string[]>([]);
  const logsEndRef = useRef<HTMLDivElement>(null);
  const [isRunningQA, setIsRunningQA] = useState(false);
  const [qaComplete, setQaComplete] = useState(false);

  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const logMsg = (msg: string) => {
    setLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
  };

  const [fullOrder, setFullOrder] = useState<AdminOrder | null>(null);

  useEffect(() => {
    logMsg(`Protocol Sequence Initiated: ${order.orderNumber}`);
    adminService
      .getOrderById(order.orderNumber)
      .then((full) => {
        if (full) {
          logMsg(`Registry sync complete. Data localized.`);
          setFullOrder(full);
        } else {
          setError("Protocol Error: Registry synchronization failed.");
        }
      })
      .catch((err) => {
        setError(`Network Interrupt: ${err.message}`);
      });
  }, [order.orderNumber]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [logs]);

  const ensureSafeString = (str: any, defaultStr: string) =>
    typeof str === "string" && str.trim() ? str : defaultStr;

  const startProcessing = async () => {
    setIsProcessing(true);
    setError(null);
    setProgress(5);
    try {
      const activeOrder = fullOrder || order;
      if (!activeOrder) throw new Error("CRITICAL: DATA STREAM DISCONNECTED");

      let storyData = activeOrder.storyData as any;
      if (!storyData || Object.keys(storyData).length === 0) {
        // FIX: Set 'Auto' as default hero name
        storyData = { language: language, childName: "Auto" };
      }
      const lang = storyData.language || language || "en";

      // Step 1: DNA & Character
      logMsg(`Phase 1: Biometric DNA Extraction...`);
      setStatus(t("معالجة الهوية البصرية...", "Extracting Visual DNA..."));
      const mainChar = storyData.mainCharacter || {};
      if (!mainChar.imageDNA || mainChar.imageDNA.length === 0) {
        logMsg(`DNA deficiency detected. Calling Neural Vision Engine...`);
        const dnaPayload = {
          mainCharacter: mainChar,
          theme: ensureSafeString(storyData.theme, "Neutral Setting"),
          style: storyData.selectedStyleNames?.[0] ||
        storyData.technicalStyleGuide ||
        (storyData.selectedStylePrompt?.includes('**TASK:**') ? undefined : storyData.selectedStylePrompt) ||
        storyData.themeVisualDNA ||
        "high quality painterly children's book illustration",
          age: ensureSafeString(storyData.childAge, "5"),
        };

        const dnaRes = (await backendApi.generateDna(dnaPayload)) as any;
        if (dnaRes.error) throw new Error(dnaRes.error);

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
        logMsg(`✓ DNA successfully synthesized.`);
      }
      setProgress(15);

      // Step 2: Story Blueprint
      logMsg(`Phase 2: Narrative Blueprinting...`);
      setStatus(t("كتابة القصة...", "Writing the Story..."));
      if (!storyData.blueprint) {
        logMsg(`Narrative void detected. Engaging Script Architect...`);
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
        logMsg(`✓ Story arc stabilized.`);
      }
      setProgress(30);

      // Step 3: Visual Plan
      logMsg(`Phase 3: Scene Kinematics...`);
      setStatus(t("تخطيط المشاهد...", "Planning Visual Layouts..."));
      if (!storyData.spreadPlan) {
        logMsg(`Mapping spatial coordinates for 8 spreads...`);
        const planRes = (await backendApi.generateVisualPlan({
          script: storyData.script,
          blueprint: storyData.blueprint,
          visualDNA: storyData.selectedStylePrompt || "Painterly illustration",
        })) as any;
        if (planRes.error) throw new Error(planRes.error);

        storyData = { ...storyData, spreadPlan: planRes.plan };
        await adminService.saveOrder(
          order.orderNumber,
          storyData,
          order.shippingDetails,
          activeOrder.total,
        );
        logMsg(`✓ Scene layout logic verified.`);
      }
      setProgress(45);

      // Step 4: Engineering Prompts
      logMsg(`Phase 4: Neural Prompt Synthesis...`);
      setStatus(t("هندسة الأوامر الذكية...", "Engineering AI Prompts..."));

      // Version gate: only skip if prompts exist AND contain a v2/v3/v4 schema stamp
      const hasCurrentStamp = (p: any): boolean => {
        try {
          const str =
            typeof p === "string" ? p : p?.imagePrompt || p?.prompt || "";
          return /schema_version["']?\s*:\s*["']v[234]/i.test(str);
        } catch {
          return false;
        }
      };
      const promptsExist =
        Array.isArray(storyData.finalPrompts) &&
        storyData.finalPrompts.length > 0;
      const promptsAreCurrentVersion =
        promptsExist && storyData.finalPrompts.some(hasCurrentStamp);

      const heroRaw =
        storyData.mainCharacter?.imageRawUrl ||
        storyData.mainCharacter?.imageBases64?.[0] ||
        storyData.mainCharacterImageBase64 ||
        storyData.heroImageBase64 ||
        storyData.firstCharacterImageBase64 ||
        storyData.heroImageUrl ||
        storyData.firstCharacterImageUrl;
      const heroDNA =
        storyData.styleReferenceImageBase64 ||
        storyData.styleReferenceImageUrl ||
        storyData.mainCharacter?.imageDNA?.[0] ||
        heroRaw;
      const heroImagesArray = Array.from(
        new Set([heroRaw, heroDNA].filter(Boolean) as string[]),
      );

      const secondaryRaw =
        storyData.secondCharacter?.imageRawUrl ||
        storyData.secondCharacter?.imageBases64?.[0] ||
        storyData.secondCharacterImageBase64 ||
        storyData.secondCharacterImageUrl;
      const secondaryDNA =
        storyData.secondCharacter?.imageDNA?.[0] ||
        storyData.secondCharacterImageBase64 ||
        storyData.secondCharacterImageUrl ||
        secondaryRaw;
      const isSecondaryObject = storyData.secondCharacter?.type === "object";
      const secondaryImagesArray = isSecondaryObject
        ? []
        : Array.from(
            new Set([secondaryRaw, secondaryDNA].filter(Boolean) as string[]),
          );

      if (!promptsAreCurrentVersion) {
        if (promptsExist)
          logMsg(
            `⚠️ Legacy prompts detected (no current stamp) — regenerating to latest version...`,
          );
        else logMsg(`Converting narrative intent to technical parameters...`);
        const promptsRes = (await backendApi.generatePrompts({
          plan: storyData.spreadPlan,
          blueprint: storyData.blueprint,
          visualDNA: storyData.selectedStyleNames?.[0] || storyData.technicalStyleGuide || (storyData.selectedStylePrompt?.includes('**TASK:**') ? undefined : storyData.selectedStylePrompt) || storyData.themeVisualDNA || "Painterly illustration",
          childAge: storyData.childAge,
          childDescription: storyData.mainCharacter?.description || "A child",
          childName: storyData.childName,
          secondCharacter: storyData.secondCharacter,
          language: lang,
          heroASetSize: heroImagesArray.length,
          heroBSetSize: secondaryImagesArray.length,
        })) as any;
        if (promptsRes.error) throw new Error(promptsRes.error);

        storyData = { ...storyData, finalPrompts: promptsRes.prompts };
        await adminService.saveOrder(
          order.orderNumber,
          storyData,
          order.shippingDetails,
          activeOrder.total,
        );
        logMsg(`✓ Prompts engineered successfully.`);
      } else {
        logMsg(`Prompts already current (v2 stamp verified ✓), skipping.`);
      }
      setProgress(55);

      // Step 5: Image Generation
      logMsg(`Phase 5: Neural Painting Pipeline...`);
      const prompts = storyData.finalPrompts || [];
      let pages: Page[] = storyData.pages || [];

      logMsg(`DNA-A resolved: ${heroImagesArray.length} image(s)`);
      if (storyData.useSecondCharacter) {
        logMsg(`DNA-B resolved: ${secondaryImagesArray.length} image(s)`);
      }

      for (let i = 0; i < prompts.length; i++) {
        setStatus(
          t(
            `رسم المشهد ${i + 1}/${prompts.length}...`,
            `Painting Scene ${i + 1}/${prompts.length}...`,
          ),
        );
        const pageIndex = i * 2;
        const existingUrl = pages[pageIndex]?.illustrationUrl;
        const isCorrupted =
          existingUrl &&
          (existingUrl.endsWith("...") || existingUrl.length < 55);

        if (!existingUrl || isCorrupted) {
          logMsg(`--> Sequencing Scene ${i + 1}/${prompts.length}...`);
          const rawPrompt = prompts[i];
          const imagePrompt =
            typeof rawPrompt === "string"
              ? rawPrompt
              : rawPrompt?.imagePrompt || rawPrompt?.prompt;

            const stylePrompt =
              storyData.selectedStyleNames?.[0] ||
              storyData.technicalStyleGuide ||
              (storyData.selectedStylePrompt?.includes('**TASK:**') ? undefined : storyData.selectedStylePrompt) ||
              storyData.themeVisualDNA ||
              "high quality painterly children's book illustration";

            const imgRes = (await backendApi.generateImage({
              prompt: imagePrompt,
              stylePrompt: stylePrompt,
              referenceBase64: heroImagesArray,
              characterDescription: storyData.mainCharacter?.description,
            age: storyData.childAge || "5",
            secondReferenceBase64: secondaryImagesArray,
          })) as any;

          const b64 = imgRes.imageBase64 || imgRes.data?.imageBase64;
          if (!b64) throw new Error(`Scene ${i + 1} Render Failure`);

          if (!pages[pageIndex])
            pages[pageIndex] = {
              pageNumber: pageIndex + 1,
              text: "",
              textSide: "left",
              illustrationUrl: "",
            };
          if (!pages[pageIndex + 1])
            pages[pageIndex + 1] = {
              pageNumber: pageIndex + 2,
              text: "",
              textSide: "right",
              illustrationUrl: "",
            };

          pages[pageIndex].illustrationUrl = b64;
          pages[pageIndex + 1].illustrationUrl = b64;
          storyData = { ...storyData, pages };
          await adminService.saveOrder(
            order.orderNumber,
            storyData,
            order.shippingDetails,
            activeOrder.total,
          );
          logMsg(`✓ Scene ${i + 1} rendered and archived.`);

          // Run QA synchronously (Await to ensure state consistency)
          try {
            const qaResult = (await backendApi.evaluateImageQA({
              generatedImageBase64: b64,
              heroRawBase64: heroRaw,
              heroDNABase64: heroDNA,
              pageType: i === 0 ? "Cover" : "Spread",
              currentTextSide: pages[pageIndex]?.textSide || "left",
              targetPrompt: imagePrompt,
              secondRawBase64: storyData.useSecondCharacter
                ? secondaryRaw
                : undefined,
              secondDNABase64: storyData.useSecondCharacter
                ? secondaryDNA
                : undefined,
            })) as any;

            if (qaResult.overallDecision === "pass") {
              logMsg(
                `[QA OK - Scene ${i + 1}] Identity: Pass | Text Clearance: Pass`,
              );
            } else {
              logMsg(
                `[QA WARN - Scene ${i + 1}] ${qaResult.characterReasoning || "Identity Issue"} | ${qaResult.textReasoning || "Layout Issue"}`,
              );
            }

            // Update local storyData with QA results
            if (storyData.pages && storyData.pages[pageIndex]) {
              storyData.pages[pageIndex].qcStatus =
                qaResult.overallDecision === "pass" ? "passed" : "flagged";
              storyData.pages[pageIndex].textSide = (
                qaResult.recommendedTextSide || "right"
              ).toLowerCase();
              storyData.pages[pageIndex + 1].qcStatus =
                qaResult.overallDecision === "pass" ? "passed" : "flagged";
              storyData.pages[pageIndex + 1].textSide = (
                qaResult.recommendedTextSide || "right"
              ).toLowerCase();
            }
            // Mirror to spreads if they exist
            if (storyData.spreads && storyData.spreads[i]) {
              storyData.spreads[i].qcStatus =
                qaResult.overallDecision === "pass" ? "passed" : "flagged";
              storyData.spreads[i].textSide = (
                qaResult.recommendedTextSide || "right"
              ).toLowerCase();
            }

            await adminService.saveOrder(
              order.orderNumber,
              storyData,
              order.shippingDetails,
              activeOrder.total,
            );
          } catch (err: any) {
            logMsg(
              `[QA ERROR - Scene ${i + 1}] Could not complete QA scan: ${err.message}`,
            );
          }
        } else {
          logMsg(
            `Scene ${i + 1} image already exists (Source: ${existingUrl?.substring(0, 30)}...). Skipping.`,
          );
        }
        setProgress(55 + 45 * ((i + 1) / prompts.length));
      }

      logMsg(`Protocol Complete. Closing stream...`);
      await adminService.updateOrderStatus(
        order.orderNumber,
        "Processing" as any,
      );
      setStatus(t("اكتمل بنجاح!", "Transmission Secure"));
      setTimeout(onSuccess, 2000);
    } catch (e: any) {
      logMsg(`[FATAL] Pipeline Interrupt: ${e.message}`);
      setError(e.message);
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <div
      className="fixed inset-0 bg-brand-navy/60 backdrop-blur-2xl z-[100] flex justify-center items-center p-6 animate-in fade-in duration-500 overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-4xl rounded-[4rem] border-white/60 shadow-2xl overflow-hidden flex flex-col my-8 animate-in slide-in-from-bottom-8 duration-700"
        onClick={(e) => e.stopPropagation()}
      >
        <header className="p-10 border-b border-brand-navy/5 bg-white/40 flex justify-between items-center relative overflow-hidden shrink-0">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-orange via-brand-navy to-brand-teal"></div>
          <div>
            <div className="flex items-center gap-3 mb-1">
              <span className="material-symbols-outlined text-brand-navy/20">
                terminal
              </span>
              <h3 className="text-3xl font-black text-brand-navy uppercase tracking-tighter">
                Pipeline Execution Terminal
              </h3>
            </div>
            <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.3em]">
              Protocol: {order.orderNumber} • Auth: ADMIN_ROOT
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={isProcessing}
            className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/60 border border-white/80 text-brand-navy/30 hover:text-brand-orange hover:rotate-90 transition-all shadow-sm disabled:opacity-30"
          >
            <span className="material-symbols-outlined text-3xl">close</span>
          </button>
        </header>

        <div className="p-10 overflow-y-auto flex-1 bg-white/10 space-y-8 flex flex-col min-h-[400px]">
          {error && (
            <div className="p-6 bg-brand-orange/5 border-2 border-brand-orange/20 rounded-[2rem] animate-in shake duration-500">
              <div className="flex items-center gap-4 text-brand-orange mb-2">
                <span className="material-symbols-outlined">error</span>
                <p className="text-xs font-black uppercase tracking-widest">
                  Neural Pathway Interrupted
                </p>
              </div>
              <p className="text-[11px] font-bold text-brand-orange/80 leading-relaxed ml-10">
                {error}
              </p>
            </div>
          )}

          <div className="glass-panel p-8 rounded-[2.5rem] border-white/60 bg-white/40 shadow-xl space-y-6">
            <div className="flex justify-between items-end mb-2">
              <div className="space-y-1">
                <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest">
                  Active Process
                </p>
                <p className="text-sm font-black text-brand-navy uppercase tracking-tighter">
                  {status}
                </p>
              </div>
              <div className="px-4 py-1.5 bg-brand-navy text-white rounded-full text-[10px] font-black tracking-widest">
                {Math.round(progress)}%
              </div>
            </div>
            <div className="h-6 bg-brand-navy/5 rounded-full p-1 border border-brand-navy/5 shadow-inner">
              <div
                className="h-full rounded-full bg-gradient-to-r from-brand-orange via-brand-navy to-brand-teal transition-all duration-1000 ease-out shadow-lg shadow-brand-navy/20"
                style={{ width: `${progress}%` }}
              ></div>
            </div>
          </div>

          <div className="flex-1 flex flex-col min-h-[300px]">
            <div className="flex items-center gap-2 mb-3">
              <span className="material-symbols-outlined text-xs text-brand-teal">
                list_alt
              </span>
              <p className="text-[9px] font-black text-brand-teal uppercase tracking-widest">
                Audit & Logic Stream
              </p>
            </div>
            <div className="flex-1 bg-brand-navy/95 p-6 rounded-[2.5rem] overflow-y-auto custom-scrollbar border border-white/10 shadow-2xl font-mono text-[11px]">
              {logs.map((log, i) => (
                <div
                  key={i}
                  className={`mb-2 leading-relaxed ${log.includes("✓") ? "text-brand-teal font-bold" : log.includes("Phase") ? "text-white font-black border-l-2 border-brand-orange pl-3 my-4" : "text-white/60"}`}
                >
                  {log}
                </div>
              ))}
              {isProcessing && (
                <div className="text-brand-orange animate-pulse font-black mt-2">
                  _ SEQUENCE_RUNNING
                </div>
              )}
              <div ref={logsEndRef} />
            </div>
          </div>
        </div>

        <footer className="p-10 bg-white/40 border-t border-brand-navy/5 flex justify-center shrink-0">
          {!isProcessing && progress < 100 ? (
            <button
              onClick={startProcessing}
              disabled={!fullOrder}
              className="w-full py-8 bg-brand-navy text-white rounded-[2.5rem] font-black uppercase text-sm tracking-[0.4em] shadow-2xl shadow-brand-navy/30 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-6 group disabled:opacity-50"
            >
              <span className="material-symbols-outlined text-3xl group-hover:rotate-180 transition-transform duration-700">
                settings_suggest
              </span>
              {fullOrder ? "Execute Protocol" : "Syncing Registry..."}
            </button>
          ) : progress === 100 ? (
            <button
              onClick={onSuccess}
              className="w-full py-8 bg-brand-teal text-white rounded-[2.5rem] font-black uppercase text-sm tracking-[0.4em] shadow-2xl shadow-brand-teal/30 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-6"
            >
              <span className="material-symbols-outlined text-3xl">
                check_circle
              </span>
              Secure Terminal • Open Editor
            </button>
          ) : (
            <div className="flex flex-col items-center gap-4 py-4">
              <Spinner />
              <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.3em] animate-pulse">
                Neural Pathway Active - Do Not Abort
              </p>
            </div>
          )}
          {/* QA Backfill Button — always available once order is loaded */}
          {!isProcessing && fullOrder && (
            <button
              onClick={async () => {
                if (isRunningQA) return;
                setIsRunningQA(true);
                setQaComplete(false);
                logMsg(
                  `🔍 QA Backfill: Launching analysis for ${order.orderNumber}...`,
                );
                try {
                  const res = await fetch("/api/admin/backfill-qa", {
                    method: "POST",
                    headers: { "Content-Type": "application/json" },
                    body: JSON.stringify({
                      orderId: order.orderNumber,
                      limit: 20,
                    }),
                  });
                  const json = await res.json();
                  (json.logs || []).forEach((l: string) => logMsg(l));
                  if (json.success) {
                    logMsg(
                      `✅ QA Backfill complete — ${json.processed} spreads analysed, ${json.skipped} already logged.`,
                    );
                    setQaComplete(true);
                  } else {
                    logMsg(`❌ QA Backfill failed: ${json.error}`);
                  }
                } catch (e: any) {
                  logMsg(`❌ QA Backfill error: ${e.message}`);
                } finally {
                  setIsRunningQA(false);
                }
              }}
              disabled={isRunningQA}
              className={`mt-4 w-full py-5 rounded-[2.5rem] font-black uppercase text-sm tracking-[0.3em] transition-all flex items-center justify-center gap-4 border-2 ${
                qaComplete
                  ? "border-brand-teal text-brand-teal bg-brand-teal/10 hover:bg-brand-teal/20"
                  : "border-brand-orange/40 text-brand-orange bg-brand-orange/5 hover:bg-brand-orange/10"
              } disabled:opacity-50`}
            >
              {isRunningQA ? (
                <>
                  <Spinner size="sm" />
                  <span>Running QA Analysis...</span>
                </>
              ) : qaComplete ? (
                <>
                  <span className="material-symbols-outlined">
                    check_circle
                  </span>
                  <span>QA Logged — Open Editor to View</span>
                </>
              ) : (
                <>
                  <span className="material-symbols-outlined">search</span>
                  <span>Run QA Agent on This Order</span>
                </>
              )}
            </button>
          )}
        </footer>
      </div>
    </div>
  );
};

export default PipelineExecutionTerminal;
