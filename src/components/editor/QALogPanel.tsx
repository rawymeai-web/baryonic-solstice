import React, { useState, useEffect } from 'react';
import * as adminService from '@/services/adminService';
import { Spinner } from '@/components/ui/Spinner';

interface QALogPanelProps {
    orderId: string;
    spreadIndex: number;
    storyData?: any;
}

const QALogPanel: React.FC<QALogPanelProps> = ({ orderId, spreadIndex, storyData }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [isChecking, setIsChecking] = useState(false);

    useEffect(() => {
        if (isOpen && logs.length === 0) {
            fetchLogs();
        }
    }, [isOpen]);

    const fetchLogs = async () => {
        setIsLoading(true);
        try {
            const data = await adminService.getQualityLogs(orderId, spreadIndex);
            setLogs(data || []);
        } catch (e) {
            console.error("Failed to fetch QA logs:", e);
        } finally {
            setIsLoading(false);
        }
    };

    const runCheck = async () => {
        if (!storyData) return alert("Story data not found. Cannot run check.");
        
        setIsChecking(true);
        try {
            const isCover = spreadIndex === 0;
            const targetSpread = isCover ? null : storyData.spreads?.[spreadIndex - 1];
            const imageUrl = isCover ? storyData.coverImageUrl : targetSpread?.illustrationUrl;
            
            if (!imageUrl || !imageUrl.startsWith('http')) {
                return alert("This spread does not have a generated image URL yet. Please generate the image first.");
            }

            const blueprintJson = storyData.finalPrompts?.[spreadIndex]?.imagePrompt || "No blueprint found";
            
            const dnaImages: {base64: string, label: string}[] = [];
            const master = storyData.mainCharacter?.imageDNA;
            if (master && master.length > 0) {
                dnaImages.push({ base64: master[0], label: "Hero A DNA" });
            }
            const second = storyData.secondCharacter?.imageDNA;
            if (second && second.length > 0) {
                dnaImages.push({ base64: second[0], label: "Hero B DNA" });
            }

            const payload = {
                orderId,
                spreadIndex,
                imageUrl,
                blueprintJson,
                dnaImages,
                iterationNumber: logs.length + 1
            };

            await adminService.runQACheck(payload);
            await fetchLogs(); // Refresh logs after successful check

        } catch (e: any) {
            console.error(e);
            alert("Failed to run QA Check: " + e.message);
        } finally {
            setIsChecking(false);
        }
    };

    if (!isOpen) {
        return (
            <button 
                onClick={() => setIsOpen(true)}
                className="text-[10px] font-black uppercase text-brand-navy border border-gray-200 hover:border-brand-navy rounded-lg px-3 py-1.5 transition-all mt-2 flex items-center gap-2"
            >
                <span>🔍</span> View QA Iterations
            </button>
        );
    }

    return (
        <div className="mt-4 p-4 bg-gray-50 border border-gray-200 rounded-2xl w-full">
            <div className="flex justify-between items-center mb-4 border-b border-gray-200 pb-2">
                <h4 className="text-xs font-black text-brand-navy uppercase tracking-widest flex items-center gap-2">
                    <span>🔍</span> QA Agent Logs
                </h4>
                <div className="flex items-center gap-3">
                    <button 
                        onClick={runCheck}
                        disabled={isChecking}
                        className="bg-brand-navy text-white text-[10px] font-black uppercase px-3 py-1.5 rounded-lg hover:bg-opacity-90 disabled:opacity-50 transition-all flex items-center gap-2"
                    >
                        {isChecking ? <Spinner size="sm" color="text-white" /> : 'Run Image QA Check'}
                    </button>
                    <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>
            </div>

            {isLoading || isChecking ? (
                <div className="flex flex-col items-center justify-center p-6 gap-3">
                    <Spinner size="md" color="text-brand-orange" />
                    {isChecking && <p className="text-[10px] font-bold text-gray-400 uppercase tracking-widest animate-pulse">Running QA Agent Analysis...</p>}
                </div>
            ) : logs.length === 0 ? (
                <div className="flex flex-col items-center justify-center p-6 bg-white rounded-xl border border-dashed border-gray-300">
                    <p className="text-xs text-gray-500 italic mb-3">No QA logs found for this spread.</p>
                    <button onClick={runCheck} className="text-[10px] font-black uppercase tracking-widest text-brand-orange hover:text-brand-navy transition-colors">
                        Run First QA Check →
                    </button>
                </div>
            ) : (
                <div className="space-y-6">
                    {logs.map((log, idx) => (
                        <div key={idx} className={`p-4 rounded-xl border ${log.overall_decision === 'pass' ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                            <div className="flex justify-between items-center mb-3">
                                <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                    Iteration {log.iteration_number}
                                </span>
                                <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${log.overall_decision === 'pass' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                    {log.overall_decision}
                                </span>
                            </div>
                            
                            <div className="flex flex-col md:flex-row gap-4">
                                {log.image_url && (
                                    <div className="w-full md:w-1/3">
                                        <img 
                                            src={log.image_url} 
                                            className="w-full rounded-lg shadow-sm border border-gray-200 object-cover"
                                            alt={`Iteration ${log.iteration_number}`}
                                        />
                                    </div>
                                )}
                                <div className="w-full md:w-2/3 space-y-4">
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                                        <div className={`p-2 rounded-lg border ${log.character_consistency_status === 'pass' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                                            <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Character Consistency</p>
                                            <p className="text-[11px] font-medium text-gray-700">{log.character_reasoning || 'No analysis provided.'}</p>
                                        </div>
                                        <div className={`p-2 rounded-lg border ${log.style_consistency_status === 'pass' ? 'bg-green-50 border-green-100' : 'bg-red-50 border-red-100'}`}>
                                            <p className="text-[9px] font-black uppercase text-gray-400 mb-1">Style Fidelity</p>
                                            <p className="text-[11px] font-medium text-gray-700">{log.style_reasoning || 'No analysis provided.'}</p>
                                        </div>
                                    </div>

                                    <div className="flex items-center justify-between p-3 bg-white rounded-xl border border-gray-100">
                                        <div className="flex items-center gap-3">
                                            <div className={`w-2 h-2 rounded-full ${log.text_clearance_status === 'pass' ? 'bg-green-500' : 'bg-red-500'}`}></div>
                                            <div>
                                                <p className="text-[9px] font-black uppercase text-gray-400">Text Clearance</p>
                                                <p className="text-xs font-bold text-brand-navy">{log.text_reasoning || 'Verified'}</p>
                                            </div>
                                        </div>
                                        <div className="text-right">
                                            <p className="text-[9px] font-black uppercase text-gray-400">Recommended Side</p>
                                            <p className="text-xs font-black text-brand-orange uppercase">{log.recommended_text_side || 'Right'}</p>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
};

export default QALogPanel;
