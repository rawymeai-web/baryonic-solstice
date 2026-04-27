import React, { useState, useEffect } from 'react';
import { Button } from '../ui/Button';
import { backendApi } from '../../services/backendApi';
import * as adminService from '../../services/adminService';
import type { AdminOrder, Language, Page } from '../../types';
interface LegacyProcessModalProps {
    order: AdminOrder;
    onClose: () => void;
    onSuccess: () => void;
    language: Language;
}

export const LegacyProcessModal: React.FC<LegacyProcessModalProps> = ({ order, onClose, onSuccess, language }) => {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('Idle');
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);
    
    const t = (ar: string, en: string) => language === 'ar' ? ar : en;

    const logMsg = (msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    };

    const [fullOrder, setFullOrder] = useState<AdminOrder | null>(null);

    useEffect(() => {
        logMsg(`Legacy Process started for Protocol: ${order.orderNumber}`);
        adminService.getOrderById(order.orderNumber).then(full => {
            if (full) {
                logMsg(`Order data loaded successfully from Database.`);
                setFullOrder(full);
            } else {
                console.error("LegacyProcessModal could not find order in DB:", order.orderNumber);
                setError("Failed to load order data from DB.");
            }
        }).catch(err => {
            console.error("LegacyProcessModal fetch error:", err);
            setError("Error fetching order: " + err.message);
        });
    }, [order.orderNumber]);

    const ensureSafeString = (str: any, defaultStr: string) => (typeof str === 'string' && str.trim()) ? str : defaultStr;

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
                storyData = { language: language, childName: "Hero" };
            }
            const lang = storyData.language || language || 'en';

            logMsg(`Starting Phase 1: Visual DNA & Character Profiling`);
            // Step 1: DNA & Character
            setStatus(t('معالجة الهوية البصرية...', 'Processing Visual DNA...'));
            const mainChar = storyData.mainCharacter || {};
            if (!mainChar.imageDNA || mainChar.imageDNA.length === 0) {
                logMsg(`Character DNA not found. Calling Vision AI API... (This may take 15-30 seconds)`);
                const dnaPayload = {
                    mainCharacter: mainChar,
                    theme: ensureSafeString(storyData.theme, "Neutral Setting"),
                    style: ensureSafeString(storyData.selectedStylePrompt, "Painterly illustration"),
                    age: ensureSafeString(storyData.childAge, "5")
                };
                
                try {
                    const dnaRes = await backendApi.generateDna(dnaPayload) as any;
                    if (dnaRes.error) throw new Error(dnaRes.error as string);
                    
                    storyData.mainCharacter = {
                        ...mainChar,
                        description: dnaRes.physicalDescription,
                        imageDNA: [dnaRes.artifiedHeroBase64]
                    };
                    await adminService.saveOrder(order.orderNumber, storyData, order.shippingDetails, activeOrder.total);
                } catch(e:any) {
                    throw new Error("DNA Phase Error: " + (e.message || JSON.stringify(e)));
                }
            }
            setProgress(15);

            // Step 2: Story Blueprint & Script
            setStatus(t('كتابة القصة...', 'Writing the Story...'));
            const isScriptEmpty = !storyData.script || (Array.isArray(storyData.script) && storyData.script.every((s:any) => !s.text || s.text.length < 5));
            if (!storyData.blueprint || isScriptEmpty) {
                try {
                    logMsg(`Calling Writer AI API with Theme: ${ensureSafeString(storyData.theme, 'Birthday')}...`);
                    const storyRes = await backendApi.generateStory({ storyData, language: lang }) as any;
                    if (storyRes.error) throw new Error(storyRes.error);

                    storyData = { 
                        ...storyData, 
                        blueprint: storyRes.blueprint, 
                        script: storyRes.script || storyRes.rawScript 
                    };
                    await adminService.saveOrder(order.orderNumber, storyData, order.shippingDetails, activeOrder.total);
                } catch(e:any) {
                    throw new Error("Story Phase Error: " + (e.message || JSON.stringify(e)));
                }
            } else {
                logMsg(`Story details already exist, skipping Writer AI.`);
            }
            setProgress(30);

            // Step 3: Visual Plan
            setStatus(t('تخطيط المشاهد...', 'Planning Visual Layouts...'));
            if (!storyData.spreadPlan) {
                try {
                    logMsg(`Calling Cinematographer AI API...`);
                    const planRes = await backendApi.generateVisualPlan({ 
                        script: storyData.script, 
                        blueprint: storyData.blueprint, 
                        visualDNA: storyData.selectedStylePrompt || "Painterly illustration"
                    }) as any;
                    if (planRes.error) throw new Error(planRes.error);

                    logMsg(`Cinematographer AI mapped 8 scenes successfully.`);
                    storyData = { ...storyData, spreadPlan: planRes.plan };
                    await adminService.saveOrder(order.orderNumber, storyData, order.shippingDetails, activeOrder.total);
                    logMsg(`Visual Plan saved to database.`);
                } catch(e:any) {
                    logMsg(`ERROR in Visual Plan Phase: ${e.message}`);
                    throw new Error("Visual Plan Phase Error: " + (e.message || JSON.stringify(e)));
                }
            } else {
                logMsg(`Visual Plan already exists, skipping Cinematographer AI.`);
            }
            setProgress(45);

            // Step 4: Engineering Prompts
            logMsg(`Starting Phase 4: AI Prompt Engineering`);
            setStatus(t('هندسة الأوامر الذكية...', 'Engineering AI Prompts...'));
            const isPromptsEmpty = !storyData.finalPrompts || (Array.isArray(storyData.finalPrompts) && storyData.finalPrompts.every((p:any) => {
                if (typeof p === 'string') return p.length < 5;
                if (typeof p === 'object' && p !== null) return !p.prompt && !p.imagePrompt;
                return true;
            }));

            if (isPromptsEmpty) {
                try {
                    logMsg(`Calling Prompt Engineer AI... translating narrative to technical parameters.`);
                    const promptsRes = await backendApi.generatePrompts({ 
                        plan: storyData.spreadPlan, 
                        blueprint: storyData.blueprint, 
                        visualDNA: storyData.selectedStylePrompt || "Painterly illustration",
                        childAge: storyData.childAge, 
                        childDescription: storyData.mainCharacter?.description || "A child", 
                        childName: storyData.childName, 
                        secondCharacter: storyData.secondCharacter, 
                        language: lang
                    }) as any;
                    if (promptsRes.error) throw new Error(promptsRes.error);

                    logMsg(`Prompt Engineer generated prompt templates accurately.`);
                    storyData = { ...storyData, finalPrompts: promptsRes.prompts };
                    await adminService.saveOrder(order.orderNumber, storyData, order.shippingDetails, activeOrder.total);
                    logMsg(`Prompts saved to database.`);
                } catch(e:any) {
                    logMsg(`ERROR in Prompt Phase: ${e.message}`);
                    throw new Error("Prompt Phase Error: " + (e.message || JSON.stringify(e)));
                }
            } else {
                logMsg(`Prompts already engineered, skipping Prompt AI.`);
            }
            setProgress(55);

            // Step 5: Iterative Image Generation
            logMsg(`Starting Phase 5: Image Generation Pipeline (Painting 8 Spreads)`);
            const prompts = storyData.finalPrompts || [];
            if (!prompts || prompts.length === 0) throw new Error("No prompts found to generate images.");
            
            let pages: Page[] = storyData.pages || [];
            // Ensure pages array has all required spots, even if partially filled
            for (let i = 0; i < prompts.length; i++) {
                const txt1 = storyData.script?.[i * 2]?.text?.replace(/{name}/g, storyData.childName) || "";
                const txt2 = storyData.script?.[i * 2 + 1]?.text?.replace(/{name}/g, storyData.childName) || "";
                const side = storyData.spreadPlan?.spreads?.[i]?.mainContentSide?.toLowerCase().includes('left') ? 'left' : 'right';
                const opp = side === 'left' ? 'right' : 'left';
                
                if (!pages[i * 2]) {
                    pages[i * 2] = { pageNumber: i * 2 + 1, text: txt1, textSide: opp, illustrationUrl: '', textBlocks: [{text:txt1, position:{top:20,left:10,width:35},alignment:'center'}] };
                }
                if (!pages[i * 2 + 1]) {
                    pages[i * 2 + 1] = { pageNumber: i * 2 + 2, text: txt2, textSide: opp, illustrationUrl: '', textBlocks: [{text:txt2, position:{top:20,left:55,width:35},alignment:'center'}] };
                }
            }

            for (let i = 0; i < prompts.length; i++) {
                setStatus(t(`رسم المشهد ${i + 1}/${prompts.length}...`, `Painting Scene ${i + 1}/${prompts.length}...`));
                const pageIndex = i * 2;
                const existingUrl = pages[pageIndex].illustrationUrl;
                const isCorrupted = existingUrl && (existingUrl.endsWith('...') || existingUrl.length < 55);

                if (!existingUrl || isCorrupted) {
                    if (isCorrupted) logMsg(`Detected corrupted image backup for Scene ${i+1}. Repainting...`);
                    logMsg(`--> Painting Scene ${i+1}/${prompts.length}...`);
                    try {
                        const rawPrompt = prompts[i];
                        const imagePrompt = typeof rawPrompt === 'string' ? rawPrompt : (rawPrompt?.imagePrompt || rawPrompt?.prompt);

                        // DUAL-REFERENCE: raw photo = identity, DNA = style
                        const heroRaw = storyData.mainCharacter?.imageRawUrl || storyData.mainCharacter?.imageBases64?.[0];
                        const heroDNA = storyData.mainCharacter?.imageDNA?.[0] || heroRaw;

                        // DEBUG LOG
                        console.log(`Processing Scene ${i+1}:`, {
                            hasPrompt: !!imagePrompt,
                            promptLength: imagePrompt?.length,
                            hasHeroRaw: !!heroRaw,
                            hasHeroDNA: !!heroDNA,
                            pageIndex
                        });

                        if (!imagePrompt || !heroRaw) {
                            console.warn(`Scene ${i+1} missing inputs. Prompt: ${!!imagePrompt}, HeroRaw: ${!!heroRaw}`);
                            // If we have raw photo but no prompt, use a fallback
                            if (heroRaw && !imagePrompt) {
                                console.log("Using fallback prompt for Scene", i+1);
                                logMsg(`Missing formal AI Prompt for Scene ${i+1}. Using Fallback Prompt...`);
                                const fallbackPrompt = `A beautiful painterly illustration of ${storyData.childName} in ${storyData.theme}, ${storyData.selectedStylePrompt}`;
                                
                                logMsg(`[FALLBACK] Sending fallback prompt to Image AI. This may take 60 seconds...`);
                                const imgRes = await backendApi.generateImage({
                                    prompt: fallbackPrompt,
                                    stylePrompt: storyData.selectedStylePrompt,
                                    heroRawBase64: heroRaw,
                                    heroDNABase64: heroDNA,
                                    characterDescription: storyData.mainCharacter?.description,
                                    age: storyData.childAge || "5"
                                }) as any;

                                if (imgRes.imageBase64 || imgRes.data?.imageBase64) {
                                    logMsg(`Fallback Image successfully generated and received.`);
                                    const b64 = imgRes.imageBase64 || imgRes.data?.imageBase64;
                                    pages[pageIndex].illustrationUrl = b64;
                                    pages[pageIndex+1].illustrationUrl = b64;
                                    pages[pageIndex].actualPrompt = fallbackPrompt;
                                    pages[pageIndex+1].actualPrompt = fallbackPrompt;
                                    storyData = { ...storyData, pages };
                                    await adminService.saveOrder(order.orderNumber, storyData, order.shippingDetails, activeOrder.total);
                                    continue;
                                }
                            }
                            throw new Error(`Missing required inputs for Scene ${i+1}. Clear browser cache and try again.`);
                        }

                        logMsg(`Sending exact AI Prompt to Image API for Scene ${i+1}. This paints the actual image and may take 45-60+ seconds...`);

                        // Second hero dual references
                        const secondHeroRaw = storyData.useSecondCharacter && storyData.secondCharacter?.type !== 'object'
                            ? (storyData.secondCharacter?.imageRawUrl || storyData.secondCharacter?.imageBases64?.[0])
                            : undefined;
                        const secondHeroDNA = storyData.useSecondCharacter && storyData.secondCharacter?.type !== 'object'
                            ? (storyData.secondCharacter?.imageDNA?.[0] || secondHeroRaw)
                            : undefined;

                        const imgRes = await backendApi.generateImage({
                            prompt: imagePrompt,
                            stylePrompt: storyData.selectedStylePrompt,
                            heroRawBase64: heroRaw,
                            heroDNABase64: heroDNA,
                            characterDescription: storyData.mainCharacter?.description,
                            age: storyData.childAge || "5",
                            secondRawBase64: secondHeroRaw,
                            secondDNABase64: secondHeroDNA
                        }) as any;
                        
                        if (imgRes.imageBase64 || imgRes.data?.imageBase64) {
                            logMsg(`✓ Image ${i+1} perfectly generated and downloaded.`);
                            const b64 = imgRes.imageBase64 || imgRes.data?.imageBase64;
                            pages[pageIndex].illustrationUrl = b64;
                            pages[pageIndex + 1].illustrationUrl = b64;
                            pages[pageIndex].actualPrompt = imagePrompt;
                            pages[pageIndex + 1].actualPrompt = imagePrompt;
                            storyData = { ...storyData, pages };
                            await adminService.saveOrder(order.orderNumber, storyData, order.shippingDetails, activeOrder.total);
                            logMsg(`Saved Image ${i+1} to Cloud Database.`);
                        } else {
                            throw new Error(`Failed to extract imageBase64 from response: ${JSON.stringify(imgRes).substring(0,100)}`);
                        }
                    } catch(e:any) {
                        logMsg(`[FATAL] Painting Phase Error at Scene ${i+1}: ${e.message}`);
                        throw new Error(`Painting Phase Error at Scene ${i+1}: ` + (e.message || JSON.stringify(e)));
                    }
                } else {
                    logMsg(`Scene ${i+1} image already exists. Skipping.`);
                }
                setProgress(55 + (40 * ((i + 1) / prompts.length)));
            }
            
            // Mark Status as generating/complete
            logMsg(`All phases complete! Finalizing status...`);
            await adminService.updateOrderStatus(order.orderNumber, 'Processing' as any);
            
            setProgress(100);
            logMsg(`Order fully compiled. Process complete! Launching Editor.`);
            setStatus(t('اكتمل بنجاح!', 'Complete!'));
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
            logsEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [logs]);

    return (
        <div style={{ zIndex: 999999 }} className="fixed inset-0 bg-brand-navy/90 flex items-center justify-center p-4 overflow-y-auto">
            <div style={{ backgroundColor: 'white', borderRadius: '40px', padding: '40px', maxWidth: '800px', width: '100%', position: 'relative', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)' }} className="space-y-8 flex flex-col max-h-[90vh]">
                <button 
                    onClick={() => {
                        console.log("Terminal close clicked");
                        onClose();
                    }} 
                    disabled={isProcessing} 
                    className="absolute top-6 right-6 text-gray-400 hover:text-red-500 disabled:opacity-30 p-2"
                >
                    <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" /></svg>
                </button>
                
                <div className="text-center space-y-2 pt-4">
                    <h3 className="text-2xl font-black text-brand-navy uppercase tracking-tighter">Legacy Terminal</h3>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-widest">Protocol: {order.orderNumber}</p>
                </div>
                
                {error && (
                    <div className="p-4 bg-red-50 text-red-600 rounded-2xl text-[11px] font-bold border-2 border-red-100 max-h-40 overflow-y-auto whitespace-pre-wrap">
                        SYSTEM ERROR: {error}
                    </div>
                )}

                <div className="space-y-4 bg-gray-50 p-6 rounded-[2rem] border border-gray-100">
                    <div className="flex justify-between items-center text-[10px] font-black uppercase text-brand-navy tracking-widest">
                        <span>{status}</span>
                        <span className="bg-brand-orange text-white px-2 py-0.5 rounded-md">{Math.round(progress)}%</span>
                    </div>
                    <div className="h-4 bg-gray-200 rounded-full overflow-hidden w-full relative shadow-inner">
                        <div 
                            className="absolute top-0 left-0 h-full bg-gradient-to-r from-brand-orange via-brand-coral to-orange-400 transition-all duration-700 ease-out"
                            style={{ width: `${progress}%` }}
                        ></div>
                    </div>
                </div>

                {/* Real-Time Logs Window */}
                <div className="bg-brand-navy rounded-2xl p-4 h-64 overflow-y-auto font-mono text-xs text-white flex flex-col gap-1 shadow-inner border-[4px] border-brand-navy/50">
                    <div className="text-gray-300 font-bold mb-2 uppercase tracking-widest sticky top-0 bg-brand-navy pb-2 border-b border-gray-700">Audit & Diagnostic Logs</div>
                    {logs.map((log, i) => (
                        <div key={i} className={`whitespace-pre-wrap ${log.includes('ERROR') || log.includes('FATAL') ? 'text-red-400 font-bold' : log.includes('✓') ? 'text-green-400 font-bold' : 'text-gray-200'}`}>
                            {log}
                        </div>
                    ))}
                    {isProcessing && (
                        <div className="text-gray-500 animate-pulse mt-1">_</div>
                    )}
                    <div ref={logsEndRef} />
                </div>

                <div className="flex justify-center pt-2">
                    {!isProcessing && progress < 100 && (
                        <button 
                            onClick={() => {
                                console.log("Start Processing clicked");
                                startProcessing();
                            }}
                            disabled={!fullOrder}
                            style={{ backgroundColor: !fullOrder ? '#cbd5e1' : '#F05A28', color: 'white', fontWeight: 900, borderRadius: '20px' }}
                            className={`w-full py-5 shadow-2xl ${!fullOrder ? 'cursor-not-allowed' : 'shadow-brand-orange/40 transform hover:brightness-110 active:scale-95'} text-sm uppercase tracking-[0.2em] transition-all`}
                        >
                            {!fullOrder ? 'LOADING ORDER DATA...' : 'Execute Pipeline'}
                        </button>
                    )}
                    {progress === 100 && (
                        <button 
                            onClick={onSuccess} 
                            style={{ backgroundColor: '#10b981', color: 'white', fontWeight: 900, borderRadius: '20px' }}
                            className="w-full py-5 shadow-2xl shadow-green-500/40 text-sm uppercase tracking-[0.2em] transform active:scale-95 transition-all"
                        >
                            Sequence Complete • Open Editor
                        </button>
                    )}
                </div>

                {isProcessing && (
                    <div className="flex justify-center">
                        <div className="animate-spin rounded-full h-8 w-8 border-4 border-brand-orange border-t-transparent"></div>
                    </div>
                )}
            </div>
        </div>
    );
};
