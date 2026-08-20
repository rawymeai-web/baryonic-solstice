import React, { useState, useEffect } from 'react';
import * as adminService from '@/services/adminService';
import { Spinner } from '@/components/ui/Spinner';

interface QALogPanelProps {
    orderId: string;
    spreadIndex: number;
    storyData?: any;
}

const QALogPanel: React.FC<QALogPanelProps> = ({ orderId, spreadIndex }) => {
    const [isOpen, setIsOpen] = useState(false);
    const [logs, setLogs] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchLogs = async () => {
        if (!orderId || spreadIndex === undefined) return;
        try {
            const data = await adminService.getQualityLogs(orderId, spreadIndex);
            setLogs(data || []);
        } catch (error) {
            console.error("Failed to fetch QA logs:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchLogs();
        // Poll every 3 seconds for async QA updates
        const intervalId = setInterval(fetchLogs, 3000);
        return () => clearInterval(intervalId);
    }, [orderId, spreadIndex]);

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
                <button onClick={() => setIsOpen(false)} className="text-gray-400 hover:text-gray-600">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {isLoading ? (
                <div className="flex justify-center p-4">
                    <Spinner size="md" color="text-brand-orange" />
                </div>
            ) : logs.length === 0 ? (
                <p className="text-xs text-gray-500 italic">No QA logs found for this spread.</p>
            ) : (
                <div className="space-y-6">
                    {logs.map((log, idx) => {
                        const isPass = log.overall_decision === 'pass';
                        return (
                            <div key={idx} className={`p-4 rounded-xl border ${isPass ? 'border-green-200 bg-green-50/50' : 'border-red-200 bg-red-50/50'}`}>
                                <div className="flex justify-between items-center mb-3">
                                    <span className="text-[10px] font-black text-gray-500 uppercase tracking-widest">
                                        Iteration {log.iteration_number}
                                    </span>
                                    <span className={`text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full ${isPass ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {log.overall_decision?.toUpperCase()}
                                    </span>
                                </div>
                                
                                <div className="flex flex-col md:flex-row gap-4">
                                    {log.image_url && (
                                        <div className="w-full md:w-1/3">
                                            <img 
                                                src={log.image_url.startsWith('http') ? log.image_url : `data:image/jpeg;base64,${log.image_url}`} 
                                                className="w-full rounded-lg shadow-sm object-cover"
                                                alt={`Iteration ${log.iteration_number}`}
                                            />
                                        </div>
                                    )}
                                    <div className="w-full md:w-2/3 space-y-3">
                                        {/* Character Consistency Check */}
                                        {log.character_reasoning && (
                                            <div>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                                                    👤 Character Likeness: <span className={log.character_consistency_status === 'pass' ? 'text-green-600 font-bold' : 'text-red-500 font-bold'}>{log.character_consistency_status?.toUpperCase()}</span>
                                                </p>
                                                <p className="text-xs text-gray-700 leading-relaxed bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm">
                                                    {log.character_reasoning}
                                                </p>
                                            </div>
                                        )}
                                        
                                        {/* Style Consistency Check */}
                                        {log.style_reasoning && (
                                            <div>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                                                    🎨 Art Style: <span className={log.style_consistency_status === 'pass' ? 'text-green-600' : 'text-red-500'}>{log.style_consistency_status?.toUpperCase()}</span>
                                                </p>
                                                <p className="text-xs text-gray-700 leading-relaxed bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm">
                                                    {log.style_reasoning}
                                                </p>
                                            </div>
                                        )}
                                        
                                        {/* Text Clearance Check */}
                                        {log.text_reasoning && (
                                            <div>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">
                                                    ⚠️ Text Clearance: <span className={log.text_clearance_status === 'pass' ? 'text-green-600' : 'text-red-500'}>{log.text_clearance_status?.toUpperCase()}</span>
                                                </p>
                                                <p className="text-xs text-gray-700 leading-relaxed bg-white p-2.5 rounded-lg border border-gray-100 shadow-sm">
                                                    {log.text_reasoning}
                                                </p>
                                            </div>
                                        )}

                                        {/* Layout Recommendation */}
                                        {log.recommended_text_side && (
                                            <div>
                                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-0.5">Layout Recommendation</p>
                                                <span className="text-xs font-mono font-bold text-brand-teal bg-white py-1 px-3 rounded-lg border border-gray-100 inline-block shadow-sm">
                                                    Align Text to: {log.recommended_text_side.toUpperCase()}
                                                </span>
                                            </div>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}
        </div>
    );
};

export default QALogPanel;
