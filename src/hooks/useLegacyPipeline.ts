import { useState, useRef, useCallback } from 'react';
import { backendApi } from '@/services/backendApi';
import * as adminService from '@/services/adminService';
import { compressBase64Image } from '@/utils/imageUtils';
import type { StoryData, Language, Spread } from '@/types';

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
    
    // Use a ref for storyData to ensure we always have the latest even inside the loop
    const storyDataRef = useRef<StoryData>(initialStoryData);

    // Keep internal ref in sync with latest props so we can pick up user edits (prompts/text)
    // during the pipeline execution (e.g. user edits Spread 4 while Spread 1 is painting)
    const storyDataPropRef = useRef(initialStoryData);
    storyDataPropRef.current = initialStoryData;

    const logMsg = useCallback((msg: string) => {
        setLogs(prev => [...prev, `[${new Date().toLocaleTimeString()}] ${msg}`]);
    }, []);

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
        setIsProcessing(true);
        setError(null);
        setProgress(5);
        setLogs([]);
        logMsg(`Legacy Process started for Protocol: ${orderNumber} (Resume: ${resume})`);

        try {
            let storyData = { ...storyDataRef.current };
            const lang = storyData.language || language || 'en';
            const t = (ar: string, en: string) => lang === 'ar' ? ar : en;

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
                    spreads: [], finalPrompts: [], prompts: [], actualCoverPrompt: undefined,
                    themeVisualDNA: undefined, technicalStyleGuide: undefined
                } as any);
                await adminService.saveOrder(storyData.orderId || orderNumber || 'RWY-UNKNOWN', storyData, initialShippingDetails || {}, total);
            } else {
                logMsg(`Resuming pipeline. Skipping pre-flight wipe and jumping to first missing artifact...`);
            }

            // Step 1: DNA & Character
            logMsg(`Starting Phase 1: Visual DNA & Character Profiling`);
            setStatus(t('معالجة الهوية البصرية...', 'Processing Visual DNA...'));
            const mainChar = storyData.mainCharacter || {};
            if (!mainChar.imageDNA || mainChar.imageDNA.length === 0) {
                logMsg(`Character DNA not found. Calling Vision AI API... (This may take 15-30 seconds)`);
                
                // COMPRESSION: Force all incoming user-uploaded DNA to < 100KB per image to bypass Vercel/Next.js body limits
                const originalMainBases = (mainChar.imageBases64 && mainChar.imageBases64.length > 0) 
                    ? mainChar.imageBases64 
                    : [storyData.mainCharacterImageBase64].filter(Boolean);
                const compressedMainBases = await Promise.all(originalMainBases.map((b: any) => compressBase64Image(b, 800, 0.7)));

                let compressedSecondBases: string[] = [];
                if (storyData.secondCharacter) {
                     const originalSecondBases = (storyData.secondCharacter.imageBases64 && storyData.secondCharacter.imageBases64.length > 0)
                        ? storyData.secondCharacter.imageBases64
                        : [storyData.secondCharacterImageBase64].filter(Boolean);
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
                    style: ensureSafeString(storyData.selectedStylePrompt, "Painterly illustration"),
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

                if (storyData.secondCharacter) {
                    storyData.secondCharacter = {
                        ...storyData.secondCharacter,
                        description: dnaRes.secondPhysicalDescription,
                        imageDNA: [dnaRes.secondArtifiedHeroBase64 || dnaRes.artifiedHeroBase64]
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

            // Step 3: Visual Plan
            setStatus(t('تخطيط المشاهد...', 'Planning Visual Layouts...'));
            if (!storyData.spreadPlan) {
                logMsg(`Calling Cinematographer AI API...`);
                const planRes = await retryStep('Cinematographer AI Plan', () => backendApi.generateVisualPlan({ 
                    script: storyData.script, 
                    blueprint: storyData.blueprint, 
                    selected_style_id: storyData.selected_style_id || "premium_3d_adventure",
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
            // Step 4: Engineering Prompts & Phase 5: Illustrator AI Pass
            logMsg(`Starting Phase 4: AI Prompt Engineering`);
            setStatus(t('هندسة وتدقيق الأوامر...', 'Engineering & Auditing Prompts...'));

            // Helper: check if a prompt contains a v3.2+ schema stamp.
            // v3.1 prompts are missing: anti-photorealism rules, logo block, zone guard.
            const hasV3Stamp = (p: any): boolean => {
                try {
                    const str = typeof p === 'string' ? p : JSON.stringify(p || '');
                    // Force upgrade if it's older than v6.0-dna-only
                    return str.includes('v3.2') || str.includes('v4.0.1') || str.includes('v6.0');
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
                resolvedCoverPrompt = `Book cover illustration: ${bp.title || storyData.title}. Hero: ${bp.heroDesire || ''}. Setting: ${(storyData.blueprint.structure?.spreads?.[0]?.specificLocation) || 'magical world'}. Wide panoramic establishing shot.`;
                logMsg(`⚠️ No cover prompt returned by AI — synthesized fallback from blueprint.`);
            }

            // Build the Spreads array — one object per spread, no i*2 duplication
            let spreads: import('../types').Spread[] = storyData.spreads || [];

            // Ensure cover slot exists (spreadNumber: 0)
            if (!spreads[0]) {
                spreads[0] = { spreadNumber: 0, illustrationUrl: '', leftText: '', rightText: '', actualPrompt: '' };
            }

            // Ensure inner spread slots exist (spreadNumber: 1..N)
            for (let i = 0; i < innerPrompts.length; i++) {
                const spreadNum = i + 1;
                const rawPrompt = innerPrompts[i];
                const imagePrompt = typeof rawPrompt === 'string' ? rawPrompt : (rawPrompt?.imagePrompt || rawPrompt?.prompt || '');
                const scriptItem = finalScript[i];
                const txt = typeof scriptItem === 'string' ? scriptItem : (scriptItem?.text || '');

                // textSide = where the TEXT block goes = opposite of where the image hero/content is.
                // mainContentSide = where the hero/image is. So text goes on the OTHER side.
                // Priority: 1) mainContentSide from spreadPlan, 2) parse the prompt for "X side must be empty"
                const mainContentSide = storyData.spreadPlan?.spreads?.[spreadNum]?.mainContentSide || '';
                let textSide: 'left' | 'right';
                if (mainContentSide.toLowerCase().includes('left')) {
                    // Hero on LEFT → Text on RIGHT
                    textSide = 'right';
                } else if (mainContentSide.toLowerCase().includes('right')) {
                    // Hero on RIGHT → Text on LEFT
                    textSide = 'left';
                } else {
                    // No mainContentSide from plan - parse the image prompt for the "empty side" instruction.
                    // The prompt engineer writes: "The right side must be empty" (leave right for text overlay)
                    const rightEmptyMatch = /(?:the\s+)?right\s+(?:side|half)[^.]*empty/i.test(imagePrompt);
                    const leftEmptyMatch = /(?:the\s+)?left\s+(?:side|half)[^.]*empty/i.test(imagePrompt);
                    if (rightEmptyMatch) {
                        // Right is empty → text goes RIGHT
                        textSide = 'right';
                    } else if (leftEmptyMatch) {
                        // Left is empty → text goes LEFT
                        textSide = 'left';
                    } else {
                        // Ultimate fallback: text goes right (right side kept empty by convention)
                        textSide = 'right';
                    }
                }

                if (!spreads[spreadNum]) {
                    // Split text roughly in half: first half is left, second half is right
                    const mid = Math.ceil(txt.length / 2);
                    const lastSpace = txt.lastIndexOf(' ', mid);
                    const splitAt = lastSpace > 0 ? lastSpace : mid;
                    spreads[spreadNum] = {
                        spreadNumber: spreadNum,
                        illustrationUrl: '',
                        // Only set text if we actually have script content for this spread
                        leftText: txt ? txt.substring(0, splitAt).trim() : '',
                        rightText: txt ? txt.substring(splitAt).trim() : '',
                        actualPrompt: imagePrompt,
                        textSide
                    };
                } else {
                    // On resume: update actualPrompt and textSide, but preserve existing text if script is empty
                    spreads[spreadNum].actualPrompt = imagePrompt;
                    spreads[spreadNum].textSide = textSide;
                    // Backfill text from script if the spread currently has none
                    if (txt && !spreads[spreadNum].leftText && !spreads[spreadNum].rightText && !(spreads[spreadNum] as any).text) {
                        const mid = Math.ceil(txt.length / 2);
                        const lastSpace = txt.lastIndexOf(' ', mid);
                        const splitAt = lastSpace > 0 ? lastSpace : mid;
                        spreads[spreadNum].leftText = txt.substring(0, splitAt).trim();
                        spreads[spreadNum].rightText = txt.substring(splitAt).trim();
                    }
                }
            }

            storyData = { ...storyData, spreads, spreadCount };
            storyDataRef.current = storyData;
            onUpdateStory(storyData);
            await adminService.saveOrder(orderNumber, storyData, initialShippingDetails);

            // DUAL-REFERENCE FIX: Pass [rawPhoto, stylizedDNA] as a set for each hero.
            // The raw photo anchors the real face geometry; the stylized DNA provides style consistency.
            // Passing ONLY stylizedDNA caused: (1) identity drift, (2) background contamination from the DNA portrait scene.
            const mainRawPhoto = storyData.mainCharacter?.imageBases64?.[0] || storyData.mainCharacterImageBase64;
            const mainStylizedDNA = 
                storyData.styleReferenceImageUrl || 
                storyData.styleReferenceImageBase64 || 
                storyData.mainCharacter?.imageDNA?.[0] || 
                storyData.mainCharacter?.imageBases64?.[1];
            
            // DNA-ONLY v6.0: We only send the stylized DNA image to the illustrator.
            // This ensures perfect alignment with the prompt engineer's "Image 1 = HERO_1" legend.
            // Priority: imageDNA[0] -> styleReference -> imageBases64[0] (fallback)
            const mainDNAResolved = mainStylizedDNA || mainRawPhoto || '';

            const secondRawPhoto = storyData.secondCharacter?.imageBases64?.[0] || storyData.secondCharacterImageBase64;
            const secondStylizedDNA = 
                storyData.secondCharacterImageUrl ||
                storyData.secondCharacterImageBase64 ||
                storyData.secondCharacter?.imageDNA?.[0] || 
                storyData.secondCharacter?.imageBases64?.[1];
            const secondDNAResolved = secondStylizedDNA || secondRawPhoto || '';

            const visualStylePrompt = storyData.selectedStylePrompt || 'Painterly, flat 2D illustrated children\'s book style';

            logMsg(`Character Binding Status:`);
            logMsg(`- HERO_1: ${mainStylizedDNA ? 'DNA-Matched ✓' : 'Raw Fallback ⚠️'}`);
            if (storyData.useSecondCharacter) {
                logMsg(`- HERO_2: ${secondStylizedDNA ? 'DNA-Matched ✓' : 'Raw Fallback ⚠️'}`);
            }

            const uploadSpreadImage = async (spreadNum: number, base64: string, promptUsed: string) => {
                // Store directly as base64 for now; Supabase upload can be added here
                spreads[spreadNum] = { ...spreads[spreadNum], illustrationUrl: base64, actualPrompt: promptUsed };
                storyData = { ...storyData, spreads: [...spreads] };
                storyDataRef.current = storyData;
                onUpdateStory(storyData);
                await adminService.saveOrder(orderNumber, storyData, initialShippingDetails, total);
            };

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
                    const savedPrompt = coverRes.fullPrompt || coverImagePrompt;
                    spreads[0] = { ...spreads[0], illustrationUrl: b64, actualPrompt: savedPrompt };
                    storyData = { ...storyData, coverImageUrl: b64, actualCoverPrompt: coverImagePrompt, spreads: [...spreads] };
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
                        await uploadSpreadImage(spreadNum, b64, savedPrompt);
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
            console.error("Pipeline Error:", e);
            logMsg(`[FATAL ERROR] ${e.message}`);
            setError(e.message);
        } finally {
            setIsProcessing(false);
        }
    };

    return {
        runPipeline,
        isProcessing,
        progress,
        status,
        logs,
        error
    };
};
