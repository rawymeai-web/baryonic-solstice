import { useState, useRef, useCallback } from 'react';
import { backendApi } from '@/services/backendApi';
import * as adminService from '@/services/adminService';
import { compressBase64Image } from '@/utils/imageUtils';
import type { StoryData, Language, Spread } from '@/types';

const urlToBase64 = async (url: string): Promise<string> => {
    const resp = await fetch(url);
    if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
    const blob = await resp.blob();
    return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                resolve(reader.result);
            } else {
                reject(new Error('Failed to convert blob to DataURL'));
            }
        };
        reader.onerror = () => reject(reader.error);
        reader.readAsDataURL(blob);
    });
};

export const useLegacyPipeline = (
    orderNumber: string,
    initialStoryData: StoryData,
    initialShippingDetails: any,
    language: Language,
    onUpdateStory: (updates: Partial<StoryData>) => void,
    total?: number
) => {
    const [progress, setProgress] = useState(0);
    const [status, setStatus] = useState('Idle');
    const [error, setError] = useState<string | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);
    const [logs, setLogs] = useState<string[]>([]);

    const logMsg = useCallback((msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    }, []);
    
    const abortRef = useRef(false);

    const stopPipeline = useCallback(() => {
        abortRef.current = true;
        setIsProcessing(false);
        setStatus('Stopped');
        logMsg('🛑 Pipeline execution stopped by user.');
    }, [logMsg]);

    const checkAborted = () => {
        if (abortRef.current) {
            const err = new Error('Pipeline stopped by user');
            err.name = 'AbortError';
            throw err;
        }
    };
    
    // Use a ref for storyData to ensure we always have the latest even inside the loop
    const storyDataRef = useRef<StoryData>(initialStoryData);

    // Keep internal ref in sync with latest props so we can pick up user edits (prompts/text)
    // during the pipeline execution (e.g. user edits Spread 4 while Spread 1 is painting)
    const storyDataPropRef = useRef(initialStoryData);
    storyDataPropRef.current = initialStoryData;

    const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

    const retryStep = async <T>(stepName: string, operation: () => Promise<T>, retries = 2): Promise<T> => {
        let lastError: any;
        for (let i = 0; i <= retries; i++) {
            try {
                if (i > 0) logMsg(`Retrying ${stepName} (Attempt ${i + 1}/${retries + 1})...`);
                return await operation();
            } catch (e: any) {
                lastError = e;
                const is429 = e.message?.includes('429') || e.message?.toLowerCase().includes('quota');
                const delay = is429 ? 25000 : 5000;
                logMsg(`⚠️ ${stepName} failed: ${e.message}. Waiting ${delay/1000}s...`);
                await sleep(delay);
            }
        }
        throw lastError;
    };

    const ensureSafeString = (str: any, defaultStr: string) => (typeof str === 'string' && str.trim()) ? str : defaultStr;

    const runPipeline = async (resume: boolean = false) => {
        abortRef.current = false;
        setIsProcessing(true);
        setError(null);
        setProgress(5);
        setLogs([]);
        logMsg(`Legacy Process started for Protocol: ${orderNumber} (Resume: ${resume})`);

        try {
            let storyData = { ...storyDataRef.current, orderId: orderNumber };
            const lang = storyData.language || language || 'en';
            const t = (ar: string, en: string) => lang === 'ar' ? ar : en;

            const childName = (storyData.childName || '').toLowerCase();
            let hasMismatch = false;
            if (storyData.spreadPlan && childName) {
                const planStr = JSON.stringify(storyData.spreadPlan).toLowerCase();
                const hasStaleNames = planStr.includes('hamad') || planStr.includes('khalda');
                const hasCurrentName = planStr.includes(childName);
                if (hasStaleNames && !hasCurrentName) {
                    hasMismatch = true;
                    logMsg(`⚠️ Stale characters detected in cached visual plan (found Hamad/Khalda, missing '${storyData.childName}').`);
                }
            }

            if (resume && hasMismatch) {
                logMsg(`⚠️ Mismatch detected (cached plan contains Hamad/Khalda, missing '${storyData.childName}'), but continuing with resume = true as requested.`);
            }

            if (!resume) {
                // [PRE-FLIGHT] Auto-Wipe generated artifacts to start fresh...
                
            }
            
            // Helper to prevent Vercel 4.5MB payload limit errors by stripping heavy base64 images from JSON text requests
            const getCleanStoryDataForTextApi = (sd: any) => {
                const clean = { ...sd };
                if (clean.mainCharacter) clean.mainCharacter = { ...clean.mainCharacter, imageBases64: [], imageDNA: [], images: [] };
                if (clean.secondCharacter) clean.secondCharacter = { ...clean.secondCharacter, imageBases64: [], imageDNA: [], images: [] };
                clean.styleReferenceImageBase64 = undefined;
                clean.mainCharacterImageBase64 = undefined;
                clean.secondCharacterImageBase64 = undefined;
                clean.styleReferenceImageUrl = undefined;
                clean.coverImageUrl = undefined;
                clean.pages = undefined;
                clean.spreads = undefined;
                clean.coverDebugImages = undefined;
                return clean;
            };

            if (!resume) {
                // [PRE-FLIGHT] Auto-Wipe generated artifacts to start fresh, preserving only customer/DNA data
                logMsg(`Pre-flight: Wiping old intermediate data for clean run...`);
                storyData.blueprint = undefined;
                storyData.script = [];
                storyData.rawScript = undefined;       // Bug 5: clear stale raw script
                storyData.spreadPlan = undefined;
                storyData.spreads = [];
                storyData.pages = [];
                storyData.finalPrompts = [];
                storyData.prompts = [];
                storyData.actualCoverPrompt = undefined;
                storyData.coverImageUrl = undefined;
                storyData.title = ""; // Bug 6: Wipe title on restart so Creative Writer can think of a new one
                storyData.themeVisualDNA = undefined;  // Bug 5: wipe old Oryx/anchor visual DNA
                storyData.technicalStyleGuide = undefined; // Bug 5: wipe old style guide
                
                storyDataRef.current = storyData;
                storyDataPropRef.current = storyData;
                onUpdateStory({ 
                    blueprint: undefined, script: [], rawScript: undefined, spreadPlan: undefined, 
                    spreads: [], pages: [], finalPrompts: [], prompts: [], actualCoverPrompt: undefined,
                    themeVisualDNA: undefined, technicalStyleGuide: undefined
                } as any);
                await adminService.saveOrder(orderNumber, storyData, initialShippingDetails || {}, total);
            } else {
                logMsg(`Resuming pipeline. Skipping pre-flight wipe and jumping to first missing artifact...`);
                
                // Synchronize pages array with existing spreads
                let pages = [...(storyData.pages || [])];
                const spreads = storyData.spreads || [];
                let modified = false;
                spreads.forEach((spread, spreadNum) => {
                    if (spreadNum > 0 && spread.illustrationUrl) {
                        const pageIndex = (spreadNum - 1) * 2;
                        if (!pages[pageIndex]) {
                            pages[pageIndex] = { pageNumber: pageIndex + 1, text: spread.leftText || '', textSide: spread.textSide || 'right', illustrationUrl: '' };
                            modified = true;
                        }
                        if (!pages[pageIndex + 1]) {
                            pages[pageIndex + 1] = { pageNumber: pageIndex + 2, text: spread.rightText || '', textSide: spread.textSide || 'right', illustrationUrl: '' };
                            modified = true;
                        }
                        if (pages[pageIndex].illustrationUrl !== spread.illustrationUrl) {
                            pages[pageIndex].illustrationUrl = spread.illustrationUrl;
                            modified = true;
                        }
                        if (pages[pageIndex + 1].illustrationUrl !== spread.illustrationUrl) {
                            pages[pageIndex + 1].illustrationUrl = spread.illustrationUrl;
                            modified = true;
                        }
                        if (pages[pageIndex].actualPrompt !== spread.actualPrompt) {
                            pages[pageIndex].actualPrompt = spread.actualPrompt;
                            pages[pageIndex + 1].actualPrompt = spread.actualPrompt;
                            pages[pageIndex].generationModel = spread.generationModel;
                            pages[pageIndex + 1].generationModel = spread.generationModel;
                            pages[pageIndex].qcStatus = spread.qcStatus;
                            pages[pageIndex + 1].qcStatus = spread.qcStatus;
                            pages[pageIndex].textSide = spread.textSide;
                            pages[pageIndex + 1].textSide = spread.textSide;
                            modified = true;
                        }
                    }
                });
                if (modified) {
                    logMsg(`Sync: Synchronized pages array with existing spreads.`);
                    storyData = { ...storyData, pages };
                    storyDataRef.current = storyData;
                    onUpdateStory(storyData);
                    await adminService.saveOrder(orderNumber, storyData, initialShippingDetails, total);
                }
            }

            checkAborted();
            // Step 1: DNA & Character
            logMsg(`Starting Phase 1: Visual DNA & Character Profiling`);
            setStatus(t('معالجة الهوية البصرية...', 'Processing Visual DNA...'));
            const mainChar = storyData.mainCharacter || {};
            
            let isLegacyDescription = true;
            if (mainChar.description && typeof mainChar.description === 'string') {
                try {
                    const parsed = JSON.parse(mainChar.description);
                    if (parsed.identity && 
                        parsed.identity.eye_color && 
                        parsed.identity.skin && 
                        parsed.identity.skin.tone) {
                        isLegacyDescription = false;
                    }
                } catch (e) {
                    // Not valid JSON
                }
            }

            if (!mainChar.imageDNA || mainChar.imageDNA.length === 0 || isLegacyDescription) {
                if (isLegacyDescription && mainChar.imageDNA && mainChar.imageDNA.length > 0) {
                    logMsg(`⚠️ Stored character description is legacy (missing skin.tone or eye_color). Forcing regeneration of Visual DNA...`);
                } else {
                    logMsg(`Character DNA not found. Calling Vision AI API... (This may take 15-30 seconds)`);
                }
                
                // COMPRESSION: Force all incoming user-uploaded DNA to < 100KB per image to bypass Vercel/Next.js body limits
                let originalMainBases = (mainChar.imageBases64 && mainChar.imageBases64.length > 0) 
                    ? mainChar.imageBases64 
                    : [storyData.mainCharacterImageBase64].filter(Boolean);

                if (originalMainBases.length === 0) {
                    const fallbackUrl = storyData.styleReferenceImageUrl || 
                                        mainChar.imageRawUrl || 
                                        storyData.heroImageUrl || 
                                        storyData.firstCharacterImageUrl;
                    if (fallbackUrl) {
                        logMsg(`Downloading character photo from public URL to build Visual DNA...`);
                        try {
                            const b64 = await urlToBase64(fallbackUrl);
                            originalMainBases = [b64];
                        } catch (e: any) {
                            logMsg(`⚠️ Failed to download character photo from URL: ${e.message}`);
                        }
                    }
                }

                const compressedMainBases = await Promise.all(originalMainBases.map((b: any) => compressBase64Image(b, 800, 0.7)));

                let compressedSecondBases: string[] = [];
                if (storyData.secondCharacter) {
                     let originalSecondBases = (storyData.secondCharacter.imageBases64 && storyData.secondCharacter.imageBases64.length > 0)
                        ? storyData.secondCharacter.imageBases64
                        : [storyData.secondCharacterImageBase64].filter(Boolean);

                     if (originalSecondBases.length === 0) {
                         const fallbackUrl = storyData.secondCharacterImageUrl || 
                                             storyData.secondCharacter?.imageRawUrl || 
                                             storyData.secondCharacterImageBase64;
                         if (fallbackUrl && fallbackUrl.startsWith('http')) {
                            logMsg(`Downloading second character photo from public URL to build Visual DNA...`);
                            try {
                                const b64 = await urlToBase64(fallbackUrl);
                                originalSecondBases = [b64];
                            } catch (e: any) {
                                logMsg(`⚠️ Failed to download second character photo from URL: ${e.message}`);
                            }
                         }
                     }

                     compressedSecondBases = await Promise.all(originalSecondBases.map((b: any) => compressBase64Image(b, 800, 0.7)));
                }

                const dnaPayload = {
                    mainCharacter: {
                        ...mainChar,
                        imageBases64: compressedMainBases
                    },
                    secondCharacter: storyData.secondCharacter ? {
                        ...storyData.secondCharacter,
                        imageBases64: compressedSecondBases
                    } : undefined,
                    theme: ensureSafeString(storyData.theme, "Neutral Setting"),
                    style: ensureSafeString(storyData.selectedStyleNames?.[0] || storyData.selectedStylePrompt, "Painterly illustration"),
                    age: ensureSafeString(storyData.childAge, "5"),
                    occasion: storyData.occasion,
                    customGoal: storyData.customGoal
                };
                
                const dnaRes = await retryStep('Vision AI DNA', () => backendApi.generateDna(dnaPayload)) as any;
                if (dnaRes.error) throw new Error(dnaRes.error);
                
                storyData.mainCharacter = {
                    ...mainChar,
                    description: dnaRes.physicalDescription,
                    imageDNA: [dnaRes.artifiedHeroBase64]
                };

                if (storyData.useSecondCharacter && storyData.secondCharacter) {
                    storyData.secondCharacter = {
                        ...storyData.secondCharacter,
                        description: dnaRes.secondPhysicalDescription,
                        imageDNA: dnaRes.secondArtifiedHeroBase64 ? [dnaRes.secondArtifiedHeroBase64] : undefined
                    };
                } else if (storyData.secondCharacter) {
                    storyData.secondCharacter = {
                        ...storyData.secondCharacter,
                        description: "",
                        imageDNA: []
                    };
                }
                const rawStyle = storyData.selectedStylePrompt || "A magical, painterly children's book illustration";
                storyData.selectedStylePrompt = typeof rawStyle === 'string' ? rawStyle.replace(/([A-Za-z0-9+/]{100,}=*)/g, '[REDACTED_IMAGE_STYLE]') : rawStyle;
                storyDataRef.current = storyData;
                onUpdateStory(storyData);
                await adminService.saveOrder(orderNumber, storyData, initialShippingDetails);
                logMsg(`✓ Visual DNA generated successfully.`);
            } else {
                logMsg(`Visual DNA already exists, skipping.`);
            }
            setProgress(15);

            checkAborted();
            // Step 2A: Story Blueprint (Architect AI)
            setStatus(t('تصميم المخطط...', 'Architecting the Story...'));
            if (!storyData.blueprint) {
                logMsg(`Calling Architect AI API with Theme: ${ensureSafeString(storyData.theme, 'Birthday')}...`);
                // Use stripped storyData to avoid Vercel 4.5MB payload limit crashing the text API
                const blueprintPayload = getCleanStoryDataForTextApi(storyData);
                const blueprintRes = await retryStep('Architect AI Blueprint', () => backendApi.generateBlueprint({ storyData: blueprintPayload, language: lang, spreadCount: storyData.spreadCount || 8 })) as any;
                if (blueprintRes.error) throw new Error(blueprintRes.error);

                storyData = { 
                    ...storyData, 
                    blueprint: blueprintRes.blueprint,
                    // FIX: Prioritize AI-generated title from blueprint over existing DB title to satisfy 'Creative Writer' request
                    title: blueprintRes.blueprint?.foundation?.title || storyData.title || "A Magical Story"
                };
                storyDataRef.current = storyData;
                onUpdateStory(storyData);
                await adminService.saveOrder(orderNumber, storyData, initialShippingDetails);
                logMsg(`✓ Story Blueprint constructed successfully. Title: "${storyData.title}")`);
            } else {
                logMsg(`Blueprint already exists, skipping Phase 2A.`);
            }
            setProgress(25);

            checkAborted();
            // Step 2B: Story Script (Writer AI) & Phase 3: Senior Writer Pass
            setStatus(t('كتابة القصة ومراجعتها...', 'Drafting & Polishing Script (Writer AI)...'));
            const isScriptEmpty = !storyData.script || (Array.isArray(storyData.script) && storyData.script.every((s:any) => !s.text || s.text.length < 5));
            if (isScriptEmpty) {
                logMsg(`Phase 2B: Drafting initial native-language narrative...`);
                logMsg(`Phase 3: Senior Writer Agent reviewing for grammatical perfection & logic...`);
                const storyPayload = getCleanStoryDataForTextApi(storyData);
                const storyRes = await retryStep('Writer AI Script', () => backendApi.generateStory({ storyData: storyPayload, language: lang, blueprint: storyData.blueprint, spreadCount: storyData.spreadCount || 8 })) as any;
                if (storyRes.error) throw new Error(storyRes.error);

                storyData = { ...storyData, script: storyRes.script || storyRes.rawScript };
                storyDataRef.current = storyData;
                onUpdateStory(storyData);
                await adminService.saveOrder(orderNumber, storyData, initialShippingDetails);
                logMsg(`✓ Story script written successfully.`);
            } else {
                logMsg(`Story details already exist, skipping Phase 2B.`);
            }
            setProgress(30);

            checkAborted();
            // Step 3: Visual Plan
            setStatus(t('تخطيط المشاهد...', 'Planning Visual Layouts...'));
            if (!storyData.spreadPlan) {
                logMsg(`Calling Cinematographer AI API...`);
                const planRes = await retryStep('Cinematographer AI Plan', () => backendApi.generateVisualPlan({ 
                    script: storyData.script, 
                    blueprint: storyData.blueprint, 
                    selected_style_id: storyData.selected_style_id || "premium_3d_adventure",
                    visualDNA: storyData.selectedStyleNames?.[0] || storyData.technicalStyleGuide || (storyData.selectedStylePrompt?.includes('**TASK:**') ? undefined : storyData.selectedStylePrompt) || storyData.themeVisualDNA || "Painterly illustration",
                    heroes: storyData.heroes || [],
                    hasSecondHero: !!storyData.useSecondCharacter,
                    secondCharacter: storyData.secondCharacter ? { ...storyData.secondCharacter, imageBases64: [], imageDNA: [] } : undefined,
                    spreadCount: storyData.spreadCount || 8
                })) as any;
                if (planRes.error) throw new Error(planRes.error);

                logMsg(`Cinematographer AI mapped ${storyData.spreadCount || 8} spreads successfully.`);
                storyData = { ...storyData, spreadPlan: planRes.plan };
                storyDataRef.current = storyData;
                onUpdateStory(storyData);
                await adminService.saveOrder(orderNumber, storyData, initialShippingDetails);
            } else {
                logMsg(`Visual Plan already exists, skipping.`);
            }
            setProgress(45);

            // Refresh current state from props to pick up manual user edits before Step 4
            // ONLY merge safe fields so we don't accidentally overwrite freshly generated pipeline data (like spreadPlan)
            const safeProps = storyDataPropRef.current || {} as any;
            storyData = { 
                ...storyData, 
                title: safeProps.title || storyData.title,
                coverSubtitle: safeProps.coverSubtitle || storyData.coverSubtitle,
                customIllustrationNotes: safeProps.customIllustrationNotes || storyData.customIllustrationNotes
            };
            checkAborted();
            // Step 4: Engineering Prompts & Phase 5: Illustrator AI Pass
            logMsg(`Starting Phase 4: AI Prompt Engineering`);
            setStatus(t('هندسة وتدقيق الأوامر...', 'Engineering & Auditing Prompts...'));

            // Helper: check if a prompt contains a v3.2+ schema stamp.
            // v3.1 prompts are missing: anti-photorealism rules, logo block, zone guard.
            const hasV3Stamp = (p: any): boolean => {
                try {
                    const str = typeof p === 'string' ? p : JSON.stringify(p || '');
                    // Force upgrade if it's older than v6.0-dna-only
                    return str.includes('v3.2') || str.includes('v4.0.1') || str.includes('v6.');
                } catch { return false; }
            };

            const isPromptsEmpty = !storyData.finalPrompts || (Array.isArray(storyData.finalPrompts) && storyData.finalPrompts.every((p:any) => {
                if (typeof p === 'string') return p.length < 5;
                if (typeof p === 'object' && p !== null) return !p.prompt && !p.imagePrompt;
                return true;
            }));

            // Version gate: prompts older than v3.2 are missing: logo block, zone guard, HERO_B fix.
            // CRITICAL: Use .every() not .some() — ALL prompts must be v3.2.
            // .some() caused a single regenerated spread to mask all remaining stale ones.
            const hasLegacyPrompts = !isPromptsEmpty && Array.isArray(storyData.finalPrompts) &&
                !storyData.finalPrompts.every(hasV3Stamp);

            if (isPromptsEmpty || hasLegacyPrompts) {
                if (hasLegacyPrompts) logMsg(`⚠️ Phase 4: Legacy prompts detected (no v3 schema stamp) — regenerating to latest version...`);
                else logMsg(`Phase 4: Translating narrative to technical prompt parameters...`);
                logMsg(`Phase 5: Illustrator Agent auditing prompts for typography & character consistency...`);
                const mainRawPhoto = storyData.mainCharacter?.imageBases64?.[0] || storyData.mainCharacterImageBase64;
                const heroASelectionIdx = storyData.dnaAudit?.heroA?.selectedPreviewIndex ?? 0;
                const mainStylizedDNA = 
                    storyData.mainCharacter?.imageDNA?.[heroASelectionIdx] ||
                    storyData.mainCharacter?.imageDNA?.[0] || 
                    storyData.styleReferenceImageUrl || 
                    storyData.styleReferenceImageBase64 || 
                    storyData.mainCharacter?.imageBases64?.[1];
                const mainDNA = [mainRawPhoto, mainStylizedDNA].filter(Boolean);
                
                const secondRawPhoto = storyData.secondCharacter?.imageBases64?.[0] || storyData.secondCharacterImageBase64;
                const heroBSelectionIdx = storyData.dnaAudit?.heroB?.selectedPreviewIndex ?? 0;
                const secondStylizedDNA = 
                    storyData.secondCharacter?.imageDNA?.[heroBSelectionIdx] ||
                    storyData.secondCharacter?.imageDNA?.[0] || 
                    storyData.secondCharacterImageUrl ||
                    storyData.secondCharacterImageBase64 ||
                    storyData.secondCharacter?.imageBases64?.[1];
                const secondDNA = storyData.useSecondCharacter ? [secondRawPhoto, secondStylizedDNA].filter(Boolean) : [];

                const promptsRes = await retryStep('Prompt Engineer AI', () => backendApi.generatePrompts({ 
                    plan: storyData.spreadPlan, 
                    blueprint: storyData.blueprint,  
                    selected_style_id: storyData.selected_style_id || "premium_3d_adventure",
                    visualDNA: storyData.selectedStyleNames?.[0] || storyData.technicalStyleGuide || (storyData.selectedStylePrompt?.includes('**TASK:**') ? undefined : storyData.selectedStylePrompt) || storyData.themeVisualDNA || "Painterly illustration",
                    heroes: [
                        { 
                            role: 'primary', 
                            name: storyData.childName,
                            has_real_photo: !!mainRawPhoto,
                            has_stylized_dna: !!mainStylizedDNA 
                        },
                        { 
                            role: 'secondary', 
                            name: storyData.secondCharacter?.name,
                            has_real_photo: !!secondRawPhoto,
                            has_stylized_dna: !!secondStylizedDNA 
                        }
                    ].filter(h => h.name || h.role === 'primary'),
                    hasSecondHero: !!storyData.useSecondCharacter,
                    secondCharacter: storyData.secondCharacter ? { ...storyData.secondCharacter, imageBases64: [], imageDNA: [] } : undefined
                })) as any;
                if (promptsRes.error) throw new Error(promptsRes.error);

                // X-RAY DEBUG: Log exactly what is being sent to the illustrator
                console.group(`%c 🧬 BULK PIPELINE DNA AUDIT `, 'background: #222; color: #00ff00; font-size: 14px; font-weight: bold;');
                console.log("Master DNA (Hero A):", mainDNA);
                console.log("Secondary DNA (Hero B):", secondDNA);
                console.log("Style Mandate:", storyData.selectedStylePrompt);
                console.groupEnd();

                if (!promptsRes.prompts || !Array.isArray(promptsRes.prompts) || promptsRes.prompts.length === 0) {
                    throw new Error("Prompt Engineer AI returned successfully but produced 0 prompts. Please verify your Visual Plan has spreads.");
                }

                logMsg(`Prompt Engineer generated ${promptsRes.prompts.length} prompt templates accurately.`);
                
                // CRITICAL: Wipe cached "actualPrompt" from all spreads to ensure the UI 
                // displays the fresh numeric-token prompts instead of legacy versions.
                const updatedSpreads = (storyData.spreads || []).map(s => ({
                    ...s,
                    actualPrompt: "" 
                }));

                storyData = { ...storyData, finalPrompts: promptsRes.prompts, spreads: updatedSpreads };
                storyDataRef.current = storyData;
                onUpdateStory(storyData);
                await adminService.saveOrder(orderNumber, storyData, initialShippingDetails);
                logMsg(`✓ Prompts engineered successfully (Wiped legacy UI cache).`);
            } else {
                logMsg(`Prompts already engineered (${storyData.finalPrompts?.length} prompts with v6 stamp), skipping.`);
            }
            setProgress(55);

            // Refresh current state from props to pick up manual user edits before Step 5
            const safeProps2 = storyDataPropRef.current || {} as any;
            storyData = { 
                ...storyData, 
                title: safeProps2.title || storyData.title,
                // SAFETY: If we JUST generated finalPrompts in Step 4, storyData.finalPrompts is authoritative.
                // We only pull from props if the local variable is empty or null.
                finalPrompts: (storyData.finalPrompts && storyData.finalPrompts.length > 0) 
                    ? storyData.finalPrompts 
                    : (safeProps2.finalPrompts || storyData.finalPrompts)
            };

            // Step 5: Iterative Image Generation
            const settings = await adminService.getSettings();
            const spreadCount = storyData.spreadCount || settings.defaultSpreadCount || 8;
            const delayBetweenScenes = Math.max(25000, (settings.generationDelay || 0) * 1000);
            
            logMsg(`Starting Phase 5: Image Generation Pipeline (Cover + ${spreadCount} Spreads)`);

            const prompts = storyData.finalPrompts || [];
            if (!prompts || prompts.length === 0) throw new Error("No prompts found to generate images.");
            
            // finalPrompts[0] = Cover, finalPrompts[1..N] = inner spreads
            const hasCoverPrompt = prompts.length > spreadCount;
            const coverPrompt = hasCoverPrompt ? prompts[0] : null;
            const rawInnerPrompts = hasCoverPrompt ? prompts.slice(1) : prompts;
            // Bug 1: Clamp inner prompts to exactly spreadCount — AI sometimes returns N+1
            const innerPrompts = rawInnerPrompts.slice(0, spreadCount);
            const finalScript = storyData.script || [];

            // Bug 2: If cover prompt is missing, synthesize one from the blueprint
            let resolvedCoverPrompt = coverPrompt;
            if (!resolvedCoverPrompt && storyData.blueprint?.foundation) {
                const bp = storyData.blueprint.foundation;
                resolvedCoverPrompt = `Book cover illustration: ${bp.title || storyData.title}. Hero: ${bp.heroDesire || ''}. Setting: ${(storyData.blueprint.structure?.spreads?.[0]?.specificLocation) || 'magical world'}. Medium shot focusing on [[HERO_1]] in the foreground with a warm, friendly smile, looking at the camera.`;
                logMsg(`⚠️ No cover prompt returned by AI — synthesized fallback from blueprint.`);
            }

            // Build the Spreads and Pages arrays — keep both in sync
            let spreads: import('../types').Spread[] = storyData.spreads || [];
            let pages: import('../types').Page[] = storyData.pages || [];

            // Ensure cover slot exists (spreadNumber: 0)
            if (!spreads[0]) {
                spreads[0] = { spreadNumber: 0, illustrationUrl: '', leftText: '', rightText: '', actualPrompt: '' };
            }

            // Ensure inner spread slots exist (spreadNumber: 1..N) and matching pages are populated
            for (let i = 0; i < innerPrompts.length; i++) {
                const spreadNum = i + 1;
                const rawPrompt = innerPrompts[i];
                const imagePrompt = typeof rawPrompt === 'string' ? rawPrompt : (rawPrompt?.imagePrompt || rawPrompt?.prompt || '');
                const scriptItem = finalScript[i];
                const txt = typeof scriptItem === 'string' ? scriptItem : (scriptItem?.text || '');

                // textSide = where the TEXT block goes = opposite of where the image hero/content is.
                const planSpread = storyData.spreadPlan?.spreads?.[spreadNum];
                const planTextSide = planSpread?.composition?.text_zone_side || (planSpread as any)?.textSide || '';
                const promptTextSide = (typeof rawPrompt === 'object' && rawPrompt !== null) ? (rawPrompt.textSide || '') : '';
                const promptMainContentSide = (typeof rawPrompt === 'object' && rawPrompt !== null) ? (rawPrompt.mainContentSide || '') : '';
                const planActionSide = planSpread?.composition?.action_zone_side || planSpread?.mainContentSide || '';

                let textSide: 'left' | 'right';
                if (planTextSide.toLowerCase() === 'left' || planTextSide.toLowerCase() === 'right') {
                    textSide = planTextSide.toLowerCase() as 'left' | 'right';
                } else if (promptTextSide.toLowerCase() === 'left' || promptTextSide.toLowerCase() === 'right') {
                    textSide = promptTextSide.toLowerCase() as 'left' | 'right';
                } else if (planActionSide.toLowerCase() === 'left') {
                    textSide = 'right';
                } else if (planActionSide.toLowerCase() === 'right') {
                    textSide = 'left';
                } else if (promptMainContentSide.toLowerCase() === 'left') {
                    textSide = 'right';
                } else if (promptMainContentSide.toLowerCase() === 'right') {
                    textSide = 'left';
                } else {
                    // Fallback to parsing prompt text
                    const rightEmptyMatch = /(?:the\s+)?right\s+(?:side|half)[^.]*(?:empty|negative space)/i.test(imagePrompt);
                    const leftEmptyMatch = /(?:the\s+)?left\s+(?:side|half)[^.]*(?:empty|negative space)/i.test(imagePrompt);
                    if (rightEmptyMatch) {
                        textSide = 'right';
                    } else if (leftEmptyMatch) {
                        textSide = 'left';
                    } else {
                        // Ultimate fallback: text goes right
                        textSide = 'right';
                    }
                }

                // Split text roughly in half: first half is left, second half is right
                const mid = Math.ceil(txt.length / 2);
                const lastSpace = txt.lastIndexOf(' ', mid);
                const splitAt = lastSpace > 0 ? lastSpace : mid;
                const leftText = txt ? txt.substring(0, splitAt).trim() : '';
                const rightText = txt ? txt.substring(splitAt).trim() : '';

                if (!spreads[spreadNum]) {
                    spreads[spreadNum] = {
                        spreadNumber: spreadNum,
                        illustrationUrl: '',
                        leftText,
                        rightText,
                        actualPrompt: imagePrompt,
                        textSide
                    };
                } else {
                    // On resume: update actualPrompt and textSide, but preserve existing text if script is empty
                    spreads[spreadNum].actualPrompt = imagePrompt;
                    spreads[spreadNum].textSide = textSide;
                    // Backfill text from script if the spread currently has none
                    if (txt && !spreads[spreadNum].leftText && !spreads[spreadNum].rightText && !(spreads[spreadNum] as any).text) {
                        spreads[spreadNum].leftText = leftText;
                        spreads[spreadNum].rightText = rightText;
                    }
                }

                // Sync to pages
                const pageIndex = i * 2;
                if (!pages[pageIndex]) {
                    pages[pageIndex] = {
                        pageNumber: pageIndex + 1,
                        text: spreads[spreadNum].leftText || '',
                        textSide: spreads[spreadNum].textSide || 'right',
                        illustrationUrl: '',
                        actualPrompt: imagePrompt
                    };
                } else {
                    pages[pageIndex].actualPrompt = imagePrompt;
                    if (spreads[spreadNum].leftText) pages[pageIndex].text = spreads[spreadNum].leftText;
                }

                if (!pages[pageIndex + 1]) {
                    pages[pageIndex + 1] = {
                        pageNumber: pageIndex + 2,
                        text: spreads[spreadNum].rightText || '',
                        textSide: spreads[spreadNum].textSide || 'right',
                        illustrationUrl: '',
                        actualPrompt: imagePrompt
                    };
                } else {
                    pages[pageIndex + 1].actualPrompt = imagePrompt;
                    if (spreads[spreadNum].rightText) pages[pageIndex + 1].text = spreads[spreadNum].rightText;
                }
            }

            storyData = { ...storyData, spreads, pages, spreadCount };
            storyDataRef.current = storyData;
            onUpdateStory(storyData);
            await adminService.saveOrder(orderNumber, storyData, initialShippingDetails);

            // DUAL-REFERENCE FIX: Pass [rawPhoto, stylizedDNA] as a set for each hero.
            // The raw photo anchors the real face geometry; the stylized DNA provides style consistency.
            // Passing ONLY stylizedDNA caused: (1) identity drift, (2) background contamination from the DNA portrait scene.
            const mainRawPhoto = storyData.mainCharacter?.imageBases64?.[0] || storyData.mainCharacterImageBase64;
            const mainStylizedDNA = 
                storyData.mainCharacter?.imageDNA?.[0] || 
                storyData.styleReferenceImageUrl || 
                storyData.styleReferenceImageBase64 || 
                storyData.mainCharacter?.imageBases64?.[1];
            
            // DNA-ONLY v6.0: We only send the stylized DNA image to the illustrator.
            // This ensures perfect alignment with the prompt engineer's "Image 1 = HERO_1" legend.
            // Priority: imageDNA[0] -> styleReference -> imageBases64[0] (fallback)
            const mainDNAResolved = mainStylizedDNA || mainRawPhoto || '';

            const secondRawPhoto = storyData.secondCharacter?.imageBases64?.[0] || storyData.secondCharacterImageBase64;
            const secondStylizedDNA = 
                storyData.secondCharacter?.imageDNA?.[0] || 
                storyData.secondCharacterImageUrl ||
                storyData.secondCharacterImageBase64 || 
                storyData.secondCharacter?.imageBases64?.[1];
            const secondDNAResolved = storyData.useSecondCharacter ? (secondStylizedDNA || secondRawPhoto || '') : '';

            const visualStylePrompt = storyData.selectedStylePrompt || 'Painterly, flat 2D illustrated children\'s book style';

            logMsg(`Character Binding Status:`);
            logMsg(`- HERO_1: ${mainStylizedDNA ? 'DNA-Matched ✓' : 'Raw Fallback ⚠️'}`);
            if (storyData.useSecondCharacter) {
                logMsg(`- HERO_2: ${secondStylizedDNA ? 'DNA-Matched ✓' : 'Raw Fallback ⚠️'}`);
            }

            const uploadSpreadImage = async (
                spreadNum: number, 
                base64: string, 
                promptUsed: string, 
                modelUsed?: string,
                qcStatus?: string,
                recommendedTextSide?: 'left' | 'right'
            ) => {
                logMsg(`Uploading Spread ${spreadNum} image to storage bucket...`);
                let url = base64;
                let uploadSuccess = false;
                for (let attempt = 1; attempt <= 3; attempt++) {
                    try {
                        const uploadRes = await backendApi.uploadImage({ orderNumber, spreadNum, imageBase64: base64 });
                        if (uploadRes.publicUrl) {
                            url = uploadRes.publicUrl;
                            logMsg(`✓ Spread ${spreadNum} image uploaded successfully to Storage.`);
                            uploadSuccess = true;
                            break;
                        }
                    } catch (e: any) {
                        logMsg(`⚠️ Spread ${spreadNum} image storage upload attempt ${attempt}/3 failed: ${e.message}`);
                        if (attempt < 3) {
                            await sleep(3000);
                        } else {
                            throw new Error(`Spread ${spreadNum} image upload failed after 3 attempts: ${e.message}`);
                        }
                    }
                }

                spreads[spreadNum] = { 
                    ...spreads[spreadNum], 
                    illustrationUrl: url, 
                    actualPrompt: promptUsed,
                    generationModel: modelUsed,
                    qcStatus: qcStatus || spreads[spreadNum].qcStatus,
                    textSide: recommendedTextSide || spreads[spreadNum].textSide
                };

                // Sync to pages (only for inner spreads, spreadNum > 0)
                if (spreadNum > 0) {
                    let pages = storyData.pages || [];
                    const pageIndex = (spreadNum - 1) * 2;
                    if (!pages[pageIndex]) {
                        pages[pageIndex] = { pageNumber: pageIndex + 1, text: spreads[spreadNum].leftText || '', textSide: spreads[spreadNum].textSide || 'right', illustrationUrl: '' };
                    }
                    if (!pages[pageIndex + 1]) {
                        pages[pageIndex + 1] = { pageNumber: pageIndex + 2, text: spreads[spreadNum].rightText || '', textSide: spreads[spreadNum].textSide || 'right', illustrationUrl: '' };
                    }
                    pages[pageIndex].illustrationUrl = url;
                    pages[pageIndex + 1].illustrationUrl = url;
                    pages[pageIndex].actualPrompt = promptUsed;
                    pages[pageIndex + 1].actualPrompt = promptUsed;
                    pages[pageIndex].generationModel = modelUsed;
                    pages[pageIndex + 1].generationModel = modelUsed;
                    pages[pageIndex].qcStatus = qcStatus || pages[pageIndex].qcStatus;
                    pages[pageIndex + 1].qcStatus = qcStatus || pages[pageIndex + 1].qcStatus;
                    pages[pageIndex].textSide = recommendedTextSide || pages[pageIndex].textSide;
                    pages[pageIndex + 1].textSide = recommendedTextSide || pages[pageIndex + 1].textSide;

                    storyData = { ...storyData, spreads: [...spreads], pages: [...pages] };
                } else {
                    storyData = { ...storyData, spreads: [...spreads] };
                }
                
                storyDataRef.current = storyData;
                onUpdateStory(storyData);
                await adminService.saveOrder(orderNumber, storyData, initialShippingDetails, total);
            };

            checkAborted();
            // --- Generate Cover (Spread 0) ---
            const coverUrl = storyData.coverImageUrl;
            const coverAlreadyDone = coverUrl && coverUrl.length > 55 && !coverUrl.endsWith('...');
            if (!coverAlreadyDone && resolvedCoverPrompt && mainDNAResolved) {
                setStatus(t('رسم الغلاف...', 'Painting Cover...'));
                const rawCover = storyDataPropRef.current.finalPrompts?.[0] || resolvedCoverPrompt;
                const coverImagePrompt = typeof rawCover === 'string' ? rawCover : (rawCover?.imagePrompt || rawCover?.prompt);
                logMsg(`--> Painting Cover...`);
                await sleep(delayBetweenScenes);
                const coverRes = await retryStep('Painting Cover', () => backendApi.generateImage({
                    prompt: coverImagePrompt, stylePrompt: visualStylePrompt,
                    referenceBase64: mainDNAResolved, characterDescription: storyData.mainCharacter?.description,
                    age: storyData.childAge || '5', secondReferenceBase64: secondDNAResolved,
                    secondCharacterDescription: storyData.secondCharacter?.description
                })) as any;
                if (coverRes.imageBase64 || coverRes.data?.imageBase64) {
                    const b64 = coverRes.imageBase64 || coverRes.data?.imageBase64;
                    logMsg(`✓ Cover perfectly generated.`);

                    let qcStatus = 'pending';
                    try {
                        logMsg(`[QA] Running QA evaluation for Cover...`);
                        const qaResult = await backendApi.evaluateImageQA({
                            generatedImageBase64: b64,
                            heroRawBase64: mainRawPhoto,
                            heroDNABase64: mainDNAResolved,
                            pageType: "Cover",
                            currentTextSide: "right",
                            targetPrompt: coverImagePrompt,
                            secondRawBase64: storyData.useSecondCharacter ? secondRawPhoto : undefined,
                            secondDNABase64: storyData.useSecondCharacter ? secondDNAResolved : undefined,
                            orderId: orderNumber,
                            spreadIndex: 0
                        }) as any;
                        qcStatus = qaResult.overallDecision === 'pass' ? 'passed' : 'flagged';
                        logMsg(`[QA RESULT] Cover: ${qcStatus.toUpperCase()}`);
                    } catch (qaErr: any) {
                        logMsg(`⚠️ QA evaluation failed for Cover: ${qaErr.message}`);
                    }

                    logMsg(`Uploading Cover image to storage bucket...`);
                    let url = b64;
                    let uploadSuccess = false;
                    for (let attempt = 1; attempt <= 3; attempt++) {
                        try {
                            const uploadRes = await backendApi.uploadImage({ orderNumber, spreadNum: 0, imageBase64: b64 });
                            if (uploadRes.publicUrl) {
                                url = uploadRes.publicUrl;
                                logMsg(`✓ Cover image uploaded successfully to Storage.`);
                                uploadSuccess = true;
                                break;
                            }
                        } catch (e: any) {
                            logMsg(`⚠️ Cover image storage upload attempt ${attempt}/3 failed: ${e.message}`);
                            if (attempt < 3) {
                                await sleep(3000);
                            } else {
                                throw new Error(`Cover image upload failed after 3 attempts: ${e.message}`);
                            }
                        }
                    }

                    const savedPrompt = coverRes.fullPrompt || coverImagePrompt;
                    const modelUsed = coverRes.modelUsed || coverRes.data?.modelUsed;
                    spreads[0] = { 
                        ...spreads[0], 
                        illustrationUrl: url, 
                        actualPrompt: savedPrompt,
                        generationModel: modelUsed,
                        qcStatus
                    };
                    storyData = { 
                        ...storyData, 
                        coverImageUrl: url, 
                        actualCoverPrompt: coverImagePrompt, 
                        spreads: [...spreads],
                        coverGenerationModel: modelUsed,
                        coverQcStatus: qcStatus
                    };
                    storyDataRef.current = storyData;
                    onUpdateStory(storyData);
                    await adminService.saveOrder(orderNumber, storyData, initialShippingDetails, total);
                }
            } else if (coverAlreadyDone) {
                logMsg(`Cover already exists (Source: ${coverUrl?.substring(0, 30)}...). Skipping.`);
            }
            setProgress(60);

            // --- Generate Inner Spreads (1..N) ---
            for (let i = 0; i < innerPrompts.length; i++) {
                checkAborted();
                const spreadNum = i + 1;
                setStatus(t(`رسم المشهد ${spreadNum}/${innerPrompts.length}...`, `Painting Spread ${spreadNum}/${innerPrompts.length}...`));

                const existingUrl = spreads[spreadNum]?.illustrationUrl;
                const isCorrupted = existingUrl && (existingUrl.endsWith('...') || existingUrl.length < 55);

                if (!existingUrl || isCorrupted) {
                    if (isCorrupted) logMsg(`Repainting corrupted image for Spread ${spreadNum}...`);
                    logMsg(`--> Painting Spread ${spreadNum}/${innerPrompts.length}...`);

                    const latestRaw = storyData.finalPrompts?.[hasCoverPrompt ? spreadNum : i] || innerPrompts[i];
                    const imagePrompt = typeof latestRaw === 'string' ? latestRaw : (latestRaw?.imagePrompt || latestRaw?.prompt);

                    if (!imagePrompt || !mainDNAResolved) {
                        logMsg(`⚠️ Missing prompt or character DNA for Spread ${spreadNum}, skipping.`);
                        continue;
                    }

                    logMsg(`Wait... cooling down tokens for ${delayBetweenScenes/1000}s...`);
                    await sleep(delayBetweenScenes);
                    checkAborted();

                    const imgRes = await retryStep(`Painting Spread ${spreadNum}`, () => backendApi.generateImage({
                        prompt: imagePrompt, stylePrompt: visualStylePrompt,
                        referenceBase64: mainDNAResolved, characterDescription: storyData.mainCharacter?.description,
                        age: storyData.childAge || '5', secondReferenceBase64: secondDNAResolved,
                        secondCharacterDescription: storyData.secondCharacter?.description
                    })) as any;

                    if (imgRes.imageBase64 || imgRes.data?.imageBase64) {
                        const b64 = imgRes.imageBase64 || imgRes.data?.imageBase64;
                        logMsg(`✓ Spread ${spreadNum} perfectly generated.`);
                        const savedPrompt = imgRes.fullPrompt || imagePrompt;
                        const modelUsed = imgRes.modelUsed || imgRes.data?.modelUsed;

                        let qcStatus = 'pending';
                        let recommendedTextSide = spreads[spreadNum].textSide;
                        
                        try {
                            logMsg(`[QA] Running QA evaluation for Spread ${spreadNum}...`);
                            const qaResult = await backendApi.evaluateImageQA({
                                generatedImageBase64: b64,
                                heroRawBase64: mainRawPhoto,
                                heroDNABase64: mainDNAResolved,
                                pageType: "Spread",
                                currentTextSide: spreads[spreadNum].textSide || "right",
                                targetPrompt: imagePrompt,
                                secondRawBase64: storyData.useSecondCharacter ? secondRawPhoto : undefined,
                                secondDNABase64: storyData.useSecondCharacter ? secondDNAResolved : undefined,
                                orderId: orderNumber,
                                spreadIndex: spreadNum
                            }) as any;
                            
                            qcStatus = qaResult.overallDecision === 'pass' ? 'passed' : 'flagged';
                            if (qaResult.recommendedTextSide) {
                                recommendedTextSide = qaResult.recommendedTextSide.toLowerCase() as 'left' | 'right';
                            }
                            logMsg(`[QA RESULT] Spread ${spreadNum}: ${qcStatus.toUpperCase()} (Text Side recommendation: ${recommendedTextSide})`);
                        } catch (qaErr: any) {
                            logMsg(`⚠️ QA evaluation failed for Spread ${spreadNum}: ${qaErr.message}`);
                        }

                        await uploadSpreadImage(spreadNum, b64, savedPrompt, modelUsed, qcStatus, recommendedTextSide);
                    }
                } else {
                    logMsg(`Spread ${spreadNum} already exists. Skipping.`);
                }
                setProgress(60 + (35 * (spreadNum / innerPrompts.length)));
            }

            // Phase 7: RTL layout direction
            logMsg(`Phase 7: Final Assembly & Orientation Mapping`);
            if (lang === 'ar') {
                logMsg(`Assigning Right-to-Left (RTL) Reading Direction for Arabic...`);
                storyData = { ...storyData, readingDirection: 'rtl' };
            } else {
                storyData = { ...storyData, readingDirection: 'ltr' };
            }

            storyDataRef.current = storyData;
            onUpdateStory(storyData);
            await adminService.saveOrder(orderNumber, storyData, initialShippingDetails);

            logMsg(`All phases complete!`);
            await adminService.updateOrderStatus(orderNumber, 'Processing' as any);
            setProgress(100);
            setStatus(t('اكتمل بنجاح!', 'Complete!'));

        } catch (e: any) {
            if (e.name === 'AbortError') {
                logMsg(`🛑 Pipeline stopped by user.`);
                setStatus('Stopped');
            } else {
                console.error("Pipeline Error:", e);
                logMsg(`[FATAL ERROR] ` + e.message);
                setError(e.message);
            }
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        runPipeline,
        stopPipeline,
        isProcessing,
        progress,
        status,
        logs,
        error
    };
};
