import React, { useState, useEffect, useRef } from "react";
import { backendApi } from "../../services/backendApi";
import * as adminService from "../../services/adminService";
import type { AdminOrder, Language, Page } from "../../types";
import { Spinner } from "../ui/Spinner";
import { useLegacyPipeline } from "../../hooks/useLegacyPipeline";

interface PipelineExecutionTerminalProps {
  order: AdminOrder;
  onClose: () => void;
  onSuccess: () => void;
  language: Language;
}

export const PipelineExecutionTerminal: React.FC<
  PipelineExecutionTerminalProps
> = ({ order, onClose, onSuccess, language }) => {
  const [fullOrder, setFullOrder] = useState<AdminOrder | null>(null);
  const [forceCleanRun, setForceCleanRun] = useState(false);
  const [isRunningQA, setIsRunningQA] = useState(false);
  const [qaComplete, setQaComplete] = useState(false);
  const [terminalLogs, setTerminalLogs] = useState<string[]>([]);
  const [terminalError, setTerminalError] = useState<string | null>(null);
  const logsEndRef = useRef<HTMLDivElement>(null);

  const t = (ar: string, en: string) => (language === "ar" ? ar : en);

  const logMsg = (msg: string) => {
    setTerminalLogs((prev) => [
      ...prev,
      `[${new Date().toLocaleTimeString()}] ${msg}`,
    ]);
  };

  const {
    runPipeline,
    stopPipeline,
    isProcessing,
    progress,
    status,
    logs,
    error,
  } = useLegacyPipeline(
    order.orderNumber,
    fullOrder?.storyData || order.storyData || {},
    order.shippingDetails || {},
    language,
    (updates) => {
      setFullOrder(prev => {
        if (!prev) return null;
        return {
          ...prev,
          storyData: {
            ...prev.storyData,
            ...updates
          }
        };
      });
    },
    order.total
  );

  const combinedLogs = [...terminalLogs, ...logs];
  const combinedError = terminalError || error;

  useEffect(() => {
    setTerminalLogs([`[${new Date().toLocaleTimeString()}] Protocol Sequence Initiated: ${order.orderNumber}`]);
    adminService
      .getOrderById(order.orderNumber)
      .then((full) => {
        if (full) {
          setTerminalLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] Registry sync complete. Data localized.`]);
          setFullOrder(full);
          
          // Auto-detect character name mismatch
          const sd = full.storyData as any;
          if (sd && sd.spreadPlan && sd.childName) {
            const planStr = JSON.stringify(sd.spreadPlan).toLowerCase();
            const childName = sd.childName.toLowerCase();
            const hasStaleNames = planStr.includes('hamad') || planStr.includes('khalda');
            const hasCurrentName = planStr.includes(childName);
            if (hasStaleNames && !hasCurrentName) {
              setForceCleanRun(true);
            }
          }
        } else {
          setTerminalError("Protocol Error: Registry synchronization failed.");
        }
      })
      .catch((err) => {
        setTerminalError(`Network Interrupt: ${err.message}`);
      });
  }, [order.orderNumber]);

  useEffect(() => {
    if (logsEndRef.current) {
      logsEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [combinedLogs]);

  useEffect(() => {
    if (progress === 100) {
      const timer = setTimeout(onSuccess, 2000);
      return () => clearTimeout(timer);
    }
  }, [progress, onSuccess]);

  const startProcessing = async () => {
    runPipeline(!forceCleanRun);
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
          {combinedError && (
            <div className="p-6 bg-brand-orange/5 border-2 border-brand-orange/20 rounded-[2rem] animate-in shake duration-500">
              <div className="flex items-center gap-4 text-brand-orange mb-2">
                <span className="material-symbols-outlined">error</span>
                <p className="text-xs font-black uppercase tracking-widest">
                  Neural Pathway Interrupted
                </p>
              </div>
              <p className="text-[11px] font-bold text-brand-orange/80 leading-relaxed ml-10">
                {combinedError}
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
              {combinedLogs.map((log, i) => (
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

        <footer className="p-10 bg-white/40 border-t border-brand-navy/5 flex flex-col gap-6 shrink-0">
          {!isProcessing && progress < 100 ? (
            <div className="w-full flex flex-col gap-6">
              <div className="flex items-center justify-between p-4 bg-brand-navy/5 border border-brand-navy/10 rounded-[2rem] shadow-inner">
                <div className="space-y-0.5 text-left">
                  <span className="text-xs font-black text-brand-navy uppercase tracking-wider">Start Sequence Fresh</span>
                  <p className="text-[9px] text-brand-navy/40 font-bold leading-normal">Ignore cached narrative and regenerate plan & prompts from scratch</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input 
                    type="checkbox" 
                    className="sr-only peer" 
                    checked={forceCleanRun}
                    onChange={(e) => setForceCleanRun(e.target.checked)}
                  />
                  <div className="w-11 h-6 bg-brand-navy/20 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand-orange"></div>
                </label>
              </div>

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
            </div>
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
