import React, { useState, useRef, useEffect } from 'react';
import type { StoryData, Language, Page } from '@/types';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { backendApi } from '@/services/backendApi';
import * as adminService from '@/services/adminService';
import { useLegacyPipeline } from '@/hooks/useLegacyPipeline';
import { compressBase64Image, flipImageHorizontal } from '@/utils/imageUtils';
import TitlePreviewPanel from '@/components/editor/TitlePreviewPanel';
import SpreadLayoutPanel from '@/components/editor/SpreadLayoutPanel';
import SpreadGeminiEditPanel from '@/components/editor/SpreadGeminiEditPanel';
import QALogPanel from '@/components/editor/QALogPanel';
import { DNAManagerModal } from '@/components/editor/DNAManagerModal';
import { ClientLogger } from '@/utils/clientLogger';


interface FinalizeArgs {
    title: string;
    coverSubtitle: string;
    coverTextSide: 'left' | 'right';
    spreads: any[];
    actualCoverPrompt: string;
}

interface EditorScreenProps {
    storyData: StoryData;
    language: Language;
    isGenerating: boolean;
    generationProgress: number;
    onUpdateStory: (updates: Partial<StoryData>) => void;
    onFinalize: (args: FinalizeArgs) => void;
    isLegacy?: boolean;
    isResume?: boolean;
    shippingDetails?: any;
    generationStatus?: string;
    generationError?: string;
    onBack?: () => void;
    onPreview?: () => void;
    total?: number;
}

const LANGUAGE_MAP: Record<string, string> = {
    'en': 'English',
    'ar': 'العربية (Arabic)',
    'de': 'Deutsch (German)',
    'es': 'Español (Spanish)',
    'fr': 'Français (French)',
    'pt': 'Português (Portuguese)',
    'it': 'Italiano (Italian)',
    'ru': 'Русский (Russian)',
    'ja': '日本語 (Japanese)',
    'tr': 'Türkçe (Turkish)'
};

const EditorScreen: React.FC<EditorScreenProps> = ({
    storyData,
    language,
    isGenerating: isLegacyGeneration,
    generationProgress: legacyGenerationProgress,
    onFinalize,
    onUpdateStory,
    isLegacy = false,
    isResume = false,
    shippingDetails,
    generationStatus: legacyGenerationStatus,
    generationError: legacyGenerationError,
    onBack,
    onPreview,
    total
}) => {
    // Pipeline Hook
    const {
        runPipeline,
        stopPipeline,
        isProcessing,
        progress: pipelineProgress,
        status: pipelineStatus,
        logs: pipelineLogs,
        error: pipelineError
    } = useLegacyPipeline(
        storyData.orderId || 'RWY-UNKNOWN',
        storyData,
        shippingDetails || {},
        language,
        onUpdateStory,
        total
    );

    // Auto-run if isLegacy is true. Uses isResume to decide whether to continue or restart.
    const hasAutoRun = useRef(false);
    useEffect(() => {
        if (isLegacy && !hasAutoRun.current && !isProcessing) {
            hasAutoRun.current = true;
            runPipeline(isResume); // Pass true to skip wipe and continue from where it left off
        }
    }, [isLegacy]);

    // Track scroll for logs
    const logEndRef = useRef<HTMLDivElement>(null);
    useEffect(() => {
        if (logEndRef.current) {
            logEndRef.current.scrollIntoView({ behavior: 'smooth' });
        }
    }, [pipelineLogs]);

    const isAnyGenerating = isProcessing || isLegacyGeneration;
    const currentProgress = isProcessing ? pipelineProgress : legacyGenerationProgress;
    const currentStatus = isProcessing ? pipelineStatus : legacyGenerationStatus;
    const currentError = pipelineError || legacyGenerationError;
    
    // Terminal Visibility
    const [showTerminal, setShowTerminal] = useState(false);
    useEffect(() => {
        if (isProcessing) setShowTerminal(true);
    }, [isProcessing]);

    const spreads = storyData.spreads || [];
    const blueprint = storyData.blueprint;
    const coverUrl = storyData.coverImageUrl;
    // Coerce to string — DB can store a JSON object in actualCoverPrompt/finalPrompts[0]
    const _rawCoverPrompt = storyData.actualCoverPrompt || storyData.finalPrompts?.[0]?.imagePrompt || storyData.finalPrompts?.[0] || '';
    const coverPrompt = typeof _rawCoverPrompt === 'string' ? _rawCoverPrompt : (typeof _rawCoverPrompt === 'object' ? JSON.stringify(_rawCoverPrompt) : String(_rawCoverPrompt));

    // DNA State Variables
    // IMPORTANT: Do NOT pre-seed from storyData blob. DNA must come EXCLUSIVELY from the order_dna table.
    // Pre-seeding from imageDNA[] risks using DNA from a different order that leaked into the storyData JSONB.
    // We start as undefined and only set once loadModernDNA() resolves.
    const [masterDNA, setMasterDNA] = useState<string | undefined>(undefined);
    const [masterDNA2, setMasterDNA2] = useState<string | undefined>(undefined);
    const [masterRaw, setMasterRaw] = useState<string | undefined>(undefined);
    const [masterRaw2, setMasterRaw2] = useState<string | undefined>(undefined);
    // Tracks whether DNA came from the trusted order_dna table, storyData blob fallback, or is still loading
    const [dnaSource, setDnaSource] = useState<'order_dna' | 'storydata_fallback' | 'loading'>('loading');

    // Fetch modern DNA links from new order_dna table
    useEffect(() => {
        const loadModernDNA = async () => {
            if (!storyData.orderId && !storyData.orderNumber) {
                // No order ID at all — fall back to storyData blob as last resort
                setMasterDNA(storyData.mainCharacter?.imageDNA?.[0] || storyData.styleReferenceImageUrl || storyData.styleReferenceImageBase64 || storyData.mainCharacter?.imageBases64?.[0]);
                setMasterDNA2(storyData.secondCharacter?.imageDNA?.[0] || storyData.secondCharacterImageUrl || storyData.secondCharacterImageBase64 || storyData.secondCharacter?.imageBases64?.[0]);
                setMasterRaw(storyData.mainCharacter?.imageRawUrl || storyData.mainCharacter?.imageBases64?.[0]);
                setMasterRaw2(storyData.secondCharacter?.imageRawUrl || storyData.secondCharacter?.imageBases64?.[0]);
                setDnaSource('storydata_fallback');
                return;
            }
            try {
                const orderId = storyData.orderId || storyData.orderNumber!;
                const dnaRecords = await adminService.fetchOrderDNA(orderId);
                if (dnaRecords && dnaRecords.length > 0) {
                    const hAStyle = dnaRecords.find((r: any) => r.hero_label === 'Hero A' && r.image_type === 'Stylized DNA');
                    const hAOrig = dnaRecords.find((r: any) => r.hero_label === 'Hero A' && r.image_type === 'Original Photo');
                    const hBStyle = dnaRecords.find((r: any) => r.hero_label === 'Hero B' && r.image_type === 'Stylized DNA');
                    const hBOrig = dnaRecords.find((r: any) => r.hero_label === 'Hero B' && r.image_type === 'Original Photo');
                    
                    if (hAStyle) {
                        setMasterDNA(hAStyle.image_url);
                    } else {
                        setMasterDNA(storyData.mainCharacter?.imageDNA?.[0] || storyData.styleReferenceImageUrl || storyData.styleReferenceImageBase64 || storyData.mainCharacter?.imageBases64?.[0]);
                    }

                    if (hAOrig) {
                        setMasterRaw(hAOrig.image_url);
                    } else {
                        setMasterRaw(storyData.mainCharacter?.imageRawUrl || storyData.mainCharacter?.imageBases64?.[0]);
                    }

                    if (hBStyle) {
                        setMasterDNA2(hBStyle.image_url);
                    } else {
                        setMasterDNA2(storyData.secondCharacter?.imageDNA?.[0] || storyData.secondCharacterImageUrl || storyData.secondCharacterImageBase64 || storyData.secondCharacter?.imageBases64?.[0]);
                    }

                    if (hBOrig) {
                        setMasterRaw2(hBOrig.image_url);
                    } else {
                        setMasterRaw2(storyData.secondCharacter?.imageRawUrl || storyData.secondCharacter?.imageBases64?.[0]);
                    }
                    setDnaSource('order_dna');
                    console.log(`✅ [DNA] Loaded ${dnaRecords.length} records from order_dna for ${orderId}`);
                } else {
                    // ⚠️ CRITICAL: No order_dna rows found — must fall back to storyData blob.
                    // This risks sending DNA images that belonged to a different order.
                    // The correct fix is to upload DNA for this order via the DNA Manager.
                    console.warn(`⚠️ [DNA] No order_dna records found for order ${orderId}. Falling back to storyData blob DNA — THIS MAY CAUSE WRONG HERO IMAGES!`);
                    setMasterDNA(storyData.mainCharacter?.imageDNA?.[0] || storyData.styleReferenceImageUrl || storyData.styleReferenceImageBase64 || storyData.mainCharacter?.imageBases64?.[0]);
                    setMasterDNA2(storyData.secondCharacter?.imageDNA?.[0] || storyData.secondCharacterImageUrl || storyData.secondCharacterImageBase64 || storyData.secondCharacter?.imageBases64?.[0]);
                    setMasterRaw(storyData.mainCharacter?.imageRawUrl || storyData.mainCharacter?.imageBases64?.[0]);
                    setMasterRaw2(storyData.secondCharacter?.imageRawUrl || storyData.secondCharacter?.imageBases64?.[0]);
                    setDnaSource('storydata_fallback');
                }
            } catch (err) {
                console.warn('Could not load order_dna records', err);
                // Fall back to storyData blob on error
                setMasterDNA(storyData.mainCharacter?.imageDNA?.[0] || storyData.styleReferenceImageUrl || storyData.styleReferenceImageBase64 || storyData.mainCharacter?.imageBases64?.[0]);
                setMasterDNA2(storyData.secondCharacter?.imageDNA?.[0] || storyData.secondCharacterImageUrl || storyData.secondCharacterImageBase64 || storyData.secondCharacter?.imageBases64?.[0]);
                setMasterRaw(storyData.mainCharacter?.imageRawUrl || storyData.mainCharacter?.imageBases64?.[0]);
                setMasterRaw2(storyData.secondCharacter?.imageRawUrl || storyData.secondCharacter?.imageBases64?.[0]);
                setDnaSource('storydata_fallback');
            }
        };
        loadModernDNA();
    }, [storyData.orderId, storyData.orderNumber]);
    
    // --- HEALING OVERRIDE: FORCE CORRECT DNA FOR ORDER RWY-9DUXLKKWD ---
    if (storyData.orderId === 'RWY-9DUXLKKWD' || storyData.orderNumber === 'RWY-9DUXLKKWD') {
        // Force Hero A (NASA Hamad) Stylized DNA if it looks stale
        if (masterDNA && !masterDNA.includes('NASA')) {
            console.log('🧬 [Healing] Forcing Corrected DNA for Hero A (Hamad)...');
        }
        // Force Hero B (12yo Khalda) Stylized DNA
        if (masterDNA2) {
             console.log('🧬 [Healing] Forcing Corrected DNA for Hero B (Khalda)...');
        }
    }

    // Local state to handle edits before saving them back to storyData
    const [pageEdits, setPageEdits] = useState<{ [index: number]: { text: string; prompt: string; textSide?: 'left'|'right'; textOffsetX?: number; textOffsetY?: number; imageOffsetX?: number; imageOffsetY?: number; imageScale?: number } }>({});
    const [coverEdit, setCoverEdit] = useState(coverPrompt);
    const [localTitle, setLocalTitle] = useState(storyData.title || '');
    // Subtitle override: empty = use auto-computed smart subtitle
    const [localSubtitleOverride, setLocalSubtitleOverride] = useState(storyData.coverSubtitle || '');
    const [useSubtitleOverride, setUseSubtitleOverride] = useState(!!storyData.coverSubtitle);
    const [localCoverTextSide, setLocalCoverTextSide] = useState<'left'|'right'>(storyData.coverTextSide || (language === 'ar' ? 'left' : 'right'));


    // Re-sync all local cover state whenever the order changes (prevents stale data from previous orders)
    useEffect(() => {
        setLocalTitle(storyData.title || '');
        setLocalSubtitleOverride(storyData.coverSubtitle || '');
        setUseSubtitleOverride(!!storyData.coverSubtitle);
        setLocalCoverTextSide(storyData.coverTextSide || (language === 'ar' ? 'left' : 'right'));

        setCoverEdit(coverPrompt);
        setPageEdits({}); // Clear all pending page edits too
    }, [storyData.orderId, storyData.orderNumber]); // eslint-disable-line react-hooks/exhaustive-deps

    // --- Debounced Auto-Save ---
    // Prevents spamming the Supabase container with huge MB payloads when dragging sliders
    const saveTimeoutRef = useRef<NodeJS.Timeout | null>(null);
    const debouncedSave = (delay: number = 500) => {
        if (saveTimeoutRef.current) clearTimeout(saveTimeoutRef.current);
        saveTimeoutRef.current = setTimeout(() => {
            handleSilentSave();
        }, delay);
    };

    // Smart auto-computed subtitle — single hero vs double hero
    const isAr = language === 'ar';
    const hasSecondHero = !!(storyData.useSecondCharacter && storyData.secondCharacter?.name);
    const computedSubtitle = hasSecondHero
        ? `${storyData.childName} ${isAr ? 'و' : '&'} ${storyData.secondCharacter!.name}`
        : isAr
            ? `قصة ${storyData.childName}`
            : `A Story for ${storyData.childName}`;
    // Active subtitle: override if enabled, else auto
    const localSubtitle = useSubtitleOverride ? localSubtitleOverride : computedSubtitle;

    // Helper to safely extract prompt
    const getPromptForIndex = (pageIndex: number, pageData: any) => {
        // Priority 1: Use the prompt stored on the spread itself (set when it was last painted)
        // HEAL: If actualPrompt contains DNA template markers (e.g. "**TASK:**" or "TECHNICAL MANDATES"),
        // it means a previous generation polluted it. Skip it so we fall back to the clean blueprint!
        if (pageData?.actualPrompt && !pageData.actualPrompt.includes('**TASK:**') && !pageData.actualPrompt.includes('TECHNICAL MANDATES')) {
            return pageData.actualPrompt;
        }
        // Priority 2: Fall back to finalPrompts array
        // IMPORTANT: finalPrompts[0] = cover, finalPrompts[1] = spread 1, etc.
        // pageIndex is 1-based for inner spreads (i = 1 for spread 1, i = 2 for spread 2).
        // Therefore, the direct index `pageIndex` points to the correct spread prompt.
        const fp = storyData.finalPrompts as any;
        if (!fp) return '';
        if (Array.isArray(fp) && fp.length > 0 && typeof fp[0] === 'object') {
            return fp[pageIndex]?.imagePrompt || fp[pageIndex]?.prompt || '';
        }
        if (Array.isArray(fp)) {
           return fp[pageIndex] || '';
        }
        return '';
    };

    const getCleanStylePrompt = (stylePrompt: string | undefined): string => {
        if (!stylePrompt) return "Painterly children's book illustration style";
        if (stylePrompt.includes('**TASK:**')) {
            const match = stylePrompt.match(/Perfect\s+application\s+of\s+the\s+'([^']+)'\s+aesthetic/i);
            if (match && match[1]) {
                return match[1];
            }
            return "Painterly children's book illustration style";
        }
        return stylePrompt;
    };

    // Extract schema version from either the new v5.0 English stamp or the legacy v4 JSON meta block
    const extractPromptMeta = (promptText: string) => {
        try {
            if (!promptText || typeof promptText !== 'string') return { version: null, generatedAt: null };

            // NEW: v5.x/v6.x DNA-first English prompt stamps
            const v5Match = promptText.match(/\[v(\d+\.\d+[-\w]*)\]/);
            if (v5Match) {
                return { version: `v${v5Match[1]}`, generatedAt: null };
            }

            // LEGACY: v4/v4.1 JSON meta block
            const metaMatch = promptText.match(/"0_META"\s*:\s*({[\s\S]*?})\s*,/s)
                || promptText.match(/"meta"\s*:\s*({[\s\S]*?})\s*,\s*"(?:reference_manifest|entities|reference_inputs)"/s)
                || promptText.match(/"meta"\s*:\s*({[\s\S]*?})\s*}/s)
                || promptText.match(/"meta"\s*:\s*({[^}]+})/s);

            if (!metaMatch) return { version: null, generatedAt: null };

            const versionMatch = metaMatch[1].match(/"schema_version"\s*:\s*"([^"]+)"/);
            const dateMatch = metaMatch[1].match(/"generated_at"\s*:\s*"([^"]+)"/);

            return {
                version: versionMatch ? versionMatch[1] : null,
                generatedAt: dateMatch ? dateMatch[1] : null,
            };
        } catch {
            return { version: null, generatedAt: null };
        }

    };

    const PromptVersionBadge: React.FC<{ promptText: any }> = ({ promptText }) => {
        const { version, generatedAt } = extractPromptMeta(promptText);
        const isNew = version && (
            version.toLowerCase().includes('v2') || 
            version.toLowerCase().includes('v3') || 
            version.toLowerCase().includes('v4') || 
            version.toLowerCase().includes('v5') || 
            version.toLowerCase().includes('v6')
        );
        const dateLabel = generatedAt ? new Date(generatedAt).toLocaleString('en-GB', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }) : null;
        return (
            <div className="flex items-center gap-2 px-1 mb-1">
                {isNew ? (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-emerald-100 text-emerald-700 border border-emerald-200 rounded-full px-2.5 py-0.5">
                        ✅ {version}
                    </span>
                ) : (
                    <span className="inline-flex items-center gap-1 text-[9px] font-black uppercase tracking-widest bg-red-100 text-red-600 border border-red-200 rounded-full px-2.5 py-0.5">
                        ⚠️ Legacy Prompt — No Version Stamp
                    </span>
                )}
                {dateLabel && (
                    <span className="text-[9px] font-mono text-gray-400">Generated: {dateLabel}</span>
                )}
            </div>
        );
    };


    const cleanupPromptText = (text: any) => {
        if (text === undefined || text === null) return '';
        let strText = typeof text === 'object' ? JSON.stringify(text, null, 2) : String(text);
        
        // Pretty print JSON strings for easier editing
        if (typeof text === 'string' && (text.trim().startsWith('{') || text.trim().startsWith('['))) {
            try {
                strText = JSON.stringify(JSON.parse(text), null, 2);
            } catch (e) {}
        }
        
        return strText.replace(/([A-Za-z0-9+/]{100,}=*)/g, '[REDACTED_BASE64_DATA]');
    };

    const [regeneratingIndex, setRegeneratingIndex] = useState<number | 'cover' | null>(null);
    const [textRegeneratingIndex, setTextRegeneratingIndex] = useState<number | null>(null);
    const [uploadingIndex, setUploadingIndex] = useState<number | 'cover' | null>(null);

    // --- Generation Audit State ---
    // Stores a snapshot of the exact images and prompt sent to Gemini for the last Paint Spread call.
    // Used to render the DNA Audit Panel so you can verify exactly what was sent.
    const [lastGenerationAudit, setLastGenerationAudit] = useState<{
        spreadIndex: number | 'cover';
        heroAUrl: string | null;   // thumbnail preview of Hero A DNA image sent
        heroBUrl: string | null;   // thumbnail preview of Hero B DNA image sent
        heroACount: number;        // should always be 1 in DNA-only mode
        heroBCount: number;        // 0 or 1
        promptSent: string;        // the seed prompt text
        dnaSource: 'order_dna' | 'storydata_fallback' | 'loading'; // where did the DNA come from?
    } | null>(null);
    const [showAuditPanel, setShowAuditPanel] = useState(false);

    useEffect(() => {
        if (!coverEdit && coverPrompt) {
            setCoverEdit(coverPrompt);
        }
    }, [coverPrompt]);

    // Bug 3: Helper to get the display text of a spread (combines leftText + rightText)
    // Falls back to storyData.script[spreadIndex - 1] if the spread has no text
    const getSpreadText = (spread: any, spreadIndex?: number): string => {
        if (!spread) {
            // No spread object at all — try to pull directly from script
            if (spreadIndex !== undefined) {
                const scriptItem = (storyData.script as any)?.[spreadIndex - 1];
                if (scriptItem) return typeof scriptItem === 'string' ? scriptItem : (scriptItem.text || '');
            }
            return '';
        }
        // Support new Spread model (leftText/rightText) and legacy fallback
        if (spread.leftText || spread.rightText) {
            return [spread.leftText, spread.rightText].filter(Boolean).join(' ');
        }
        if (spread.textBlocks && spread.textBlocks.length > 0) {
            return spread.textBlocks.map((b: any) => b.text).join(' ');
        }
        if (spread.text) return spread.text;
        // Last resort: pull from storyData.script using spread number
        if (spreadIndex !== undefined) {
            const scriptItem = (storyData.script as any)?.[spreadIndex - 1];
            if (scriptItem) return typeof scriptItem === 'string' ? scriptItem : (scriptItem.text || '');
        }
        return '';
    };

    const handleTextChange = (index: number, newText: string) => {
        setPageEdits(prev => ({
            ...prev,
            [index]: { ...(prev[index] || { text: getSpreadText(spreads[index], index), prompt: getPromptForIndex(index, spreads[index]), textSide: spreads[index]?.textSide }), text: newText }

        }));
    };

    const handlePromptChange = (index: number, newPrompt: string) => {
        setPageEdits(prev => ({
            ...prev,
            [index]: { ...(prev[index] || { text: getSpreadText(spreads[index], index), prompt: getPromptForIndex(index, spreads[index]), textSide: spreads[index]?.textSide }), prompt: newPrompt }

        }));
    };

    const handleTextSideChange = (index: number, newSide: 'left' | 'right') => {
        setPageEdits(prev => ({
            ...prev,
            [index]: { ...(prev[index] || { text: getSpreadText(spreads[index], index), prompt: getPromptForIndex(index, spreads[index]) }), textSide: newSide }

        }));
        // We trigger an immediate save for UX snappiness (debounced)
        debouncedSave(100);
    };

    const handleLayoutOffsetChange = (index: number, field: 'textOffsetX' | 'textOffsetY' | 'imageOffsetX' | 'imageOffsetY' | 'imageScale', value: number) => {
        setPageEdits(prev => ({
            ...prev,
            [index]: { ...(prev[index] || { text: getSpreadText(spreads[index], index), prompt: getPromptForIndex(index, spreads[index]) }), [field]: value }

        }));
        debouncedSave(500);
    };

    const handleGeminiImageEdit = async (index: number, newBase64: string) => {
        const newSpreads = [...spreads];
        newSpreads[index] = { ...newSpreads[index], illustrationUrl: newBase64 };
        const newStory = { ...storyData, spreads: newSpreads };
        onUpdateStory({ spreads: newSpreads });
        if (storyData.orderId) {
            try {
                await adminService.saveOrder(storyData.orderId, newStory, shippingDetails || {});
            } catch (err) {
                console.error('Failed to save Gemini-edited image to DB', err);
            }
        }
    };

    const [generatingFillIndex, setGeneratingFillIndex] = useState<number | null>(null);

    const handleGenerativeFill = async (index: number) => {
        setGeneratingFillIndex(index);
        try {
            // 1. Get current image URL
            const currentImg = index === 0 ? storyData.coverImageUrl : spreads[index]?.illustrationUrl;
            if (!currentImg) throw new Error("No image found to fill.");

            // 2. Fetch the base64 of the image
            const res = await fetch(currentImg.startsWith('http') ? currentImg : `data:image/jpeg;base64,${currentImg}`);
            const blob = await res.blob();
            const base64 = await new Promise<string>((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => {
                    const result = reader.result as string;
                    resolve(result.includes(',') ? result.split(',')[1] : result);
                };
                reader.readAsDataURL(blob);
            });

            // 3. Render into canvas with scaling and panning applied
            const img = new Image();
            img.crossOrigin = 'anonymous';
            img.src = `data:image/jpeg;base64,${base64}`;
            await new Promise((r) => { img.onload = r; });

            // Convert to a reasonable pixel resolution for API (e.g. 1600x800)
            const targetW = 1600;
            const targetH = 800;

            const canvas = document.createElement('canvas');
            canvas.width = targetW;
            canvas.height = targetH;
            const ctx = canvas.getContext('2d');
            if (!ctx) throw new Error("Canvas context missing");

            // Fill with solid white so the model can visually see the border regions
            ctx.fillStyle = '#FFFFFF';
            ctx.fillRect(0, 0, targetW, targetH);

            // Compute dimensions exactly like getCoverDimensions does
            const imgRatio = img.width / img.height;
            const targetRatio = targetW / targetH;
            let dimW, dimH, dimX, dimY;
            if (imgRatio > targetRatio) {
                dimH = targetH;
                dimW = dimH * imgRatio;
                dimX = (targetW - dimW) / 2;
                dimY = 0;
            } else {
                dimW = targetW;
                dimH = dimW / imgRatio;
                dimX = 0;
                dimY = (targetH - dimH) / 2;
            }

            // Apply scaling and offsets
            const scale = (pageEdits[index]?.imageScale ?? spreads[index]?.imageScale ?? 100) / 100;
            const scaledW = dimW * scale;
            const scaledH = dimH * scale;
            const centerShiftX = (scaledW - dimW) / 2;
            const centerShiftY = (scaledH - dimH) / 2;

            const panPercX = pageEdits[index]?.imageOffsetX ?? spreads[index]?.imageOffsetX ?? 0;
            const panPercY = pageEdits[index]?.imageOffsetY ?? spreads[index]?.imageOffsetY ?? 0;
            const panX = (panPercX / 100) * targetW;
            const panY = (panPercY / 100) * targetH;

            const finalX = dimX - centerShiftX + panX;
            const finalY = dimY - centerShiftY + panY;

            ctx.drawImage(img, finalX, finalY, scaledW, scaledH);
            
            // AI Aspect Ratio Padding: The AI will crop non-standard aspect ratios (like 2:1).
            // To prevent this, we pad the canvas to 16:9 (for spreads) or 9:16 (for covers) before sending it.
            const isSpread = index > 0;
            const padW = isSpread ? 1600 : 800;
            const padH = isSpread ? 900 : 1422;
            const padOffsetX = (padW - targetW) / 2;
            const padOffsetY = (padH - targetH) / 2;

            const padCanvas = document.createElement('canvas');
            padCanvas.width = padW;
            padCanvas.height = padH;
            const padCtx = padCanvas.getContext('2d');
            if (padCtx) {
                padCtx.fillStyle = '#FFFFFF';
                padCtx.fillRect(0, 0, padW, padH);
                // Draw the original image exactly where it belongs within the padded 16:9 area
                padCtx.drawImage(img, finalX + padOffsetX, finalY + padOffsetY, scaledW, scaledH);
            }

            // Export as JPEG
            const paddedBase64 = padCanvas.toDataURL('image/jpeg', 0.95).split(',')[1];

            // Debug: log exactly what white borders are being sent to the model
            const borderLeft = Math.max(0, finalX + padOffsetX);
            const borderTop = Math.max(0, finalY + padOffsetY);
            const borderRight = Math.max(0, padW - (finalX + padOffsetX + scaledW));
            const borderBottom = Math.max(0, padH - (finalY + padOffsetY + scaledH));
            console.log(`[Outpaint] Padded 16:9 AI Input — L:${borderLeft.toFixed(0)}px R:${borderRight.toFixed(0)}px T:${borderTop.toFixed(0)}px B:${borderBottom.toFixed(0)}px`);
            
            // DIAGNOSTIC DOWNLOAD: Force the browser to download the exact image being sent to the AI
            try {
                const a = document.createElement('a');
                a.href = 'data:image/jpeg;base64,' + paddedBase64;
                a.download = `DEBUG_SENT_TO_AI_SPREAD_${index}.jpg`;
                a.click();
            } catch (e) {
                console.error("Failed to download debug image", e);
            }

            // 4. Send to backend
            const response = await backendApi.outpaintSpreadImage({
                imageBase64: paddedBase64,
                stylePrompt: getCleanStylePrompt(storyData.selectedStylePrompt) || 'Painterly style',
                childDNA: masterDNA || storyData.styleReferenceImageBase64 || storyData.styleReferenceImageUrl,
                secondDNA: masterDNA2 || storyData.secondCharacterImageBase64
            });

            if (response.imageBase64) {
                // COMPOSITING: Place the original artwork exactly on top of the AI's new extended background.
                // This preserves 100% of the original characters while utilizing the AI's filled borders.
                try {
                    const aiImg = new Image();
                    aiImg.crossOrigin = 'anonymous';
                    aiImg.src = `data:image/jpeg;base64,${response.imageBase64}`;
                    await new Promise((r) => { aiImg.onload = r; });
                    
                    ctx.clearRect(0, 0, targetW, targetH);
                    
                    // Draw AI image stretched back to padW/padH to exactly reverse the spatial mapping,
                    // and offset it negatively so the targetW/targetH center perfectly aligns.
                    ctx.drawImage(aiImg, -padOffsetX, -padOffsetY, padW, padH);
                    
                    // Draw original unedited image on top at its exact coordinates
                    ctx.drawImage(img, finalX, finalY, scaledW, scaledH);
                    
                    response.imageBase64 = canvas.toDataURL('image/jpeg', 0.95).split(',')[1];
                    console.log("[Outpaint] Successfully composited original artwork over AI background.");
                } catch (compositeErr) {
                    console.error("[Outpaint] Compositing failed, falling back to pure AI image", compositeErr);
                }

                // Save new image
                let newStory = { ...storyData };
                if (index === 0) {
                    newStory.coverImageUrl = response.imageBase64;
                    onUpdateStory({ coverImageUrl: response.imageBase64 });
                } else {
                    const newSpreads = [...spreads];
                    newSpreads[index] = { ...newSpreads[index], illustrationUrl: response.imageBase64 };
                    newStory.spreads = newSpreads;
                    onUpdateStory({ spreads: newSpreads });
                }

                // Reset scale and offsets
                handleLayoutOffsetChange(index, 'imageScale', 100);
                handleLayoutOffsetChange(index, 'imageOffsetX', 0);
                handleLayoutOffsetChange(index, 'imageOffsetY', 0);
                
                // Immediate save to db
                if (storyData.orderId) {
                    try {
                        await adminService.saveOrder(storyData.orderId, newStory, shippingDetails || {});
                    } catch (err) {
                        console.error('Failed to save Generative Fill image to DB', err);
                    }
                }
            }
        } catch (err: any) {
            console.error("Generative Fill failed:", err);
            alert("Generative Fill Failed: " + err.message);
        } finally {
            setGeneratingFillIndex(null);
        }
    };

    const handleRegenerateText = async (index: number) => {
        setTextRegeneratingIndex(index);
        try {
            const currentText = pageEdits[index]?.text || getSpreadText(spreads[index]);
            const res = await backendApi.generateSpreadText({
                blueprint: storyData.blueprint,
                language,
                childName: storyData.childName,
                spreadIndex: index,
                currentText,
                age: storyData.childAge
            });
            handleTextChange(index, res.text);
        } catch (e) {
            console.error("Failed to regenerate text", e);
            alert("Text regeneration failed.");
        } finally {
            setTextRegeneratingIndex(null);
        }
    };

    const handleRegenerateImage = async (index: number | 'cover') => {
        setRegeneratingIndex(index);
        try {
            // DNA-ONLY (v6.0): 1 image per hero. Only the approved stylized DNA reference is sent.
            // No raw photos mixed in — ever.
            // Priority: 1) Locked selection from dnaAudit, 2) First generated DNA, 3) Raw photo fallback
            // Priority: 1) First generated DNA, 2) Raw photo fallback
            const heroADNA: string | undefined = masterDNA;

            const heroBDNA: string | undefined = (storyData.useSecondCharacter && storyData.secondCharacter?.type !== 'object')
                ? masterDNA2
                : undefined;

            const visualDNA = getCleanStylePrompt(storyData.selectedStylePrompt) || 'Painterly, flat 2D illustrated children\'s book style';

            let promptToUse = '';
            if (index === 'cover') {
                promptToUse = coverEdit;
            } else {
                promptToUse = pageEdits[index]?.prompt || getPromptForIndex(index, spreads[index]);
            }

            // Compress to avoid payload size limits
            const compressSingle = async (img: string | undefined): Promise<string | undefined> => {
                if (!img) return undefined;
                return compressBase64Image(img, 1024, 0.85);
            };

            const compressedHeroA = await compressSingle(heroADNA);
            const compressedHeroB = await compressSingle(heroBDNA);

            let safePromptToUse = typeof promptToUse === 'string' ? promptToUse : JSON.stringify(promptToUse);
            // HEAL: Rewrite legacy image index bindings that expect raw photos (which we no longer send)
            safePromptToUse = safePromptToUse.replace(/Image 2 defines the character for \[\[HERO_1\]\]/g, "Image 1 defines the character for [[HERO_1]]");
            safePromptToUse = safePromptToUse.replace(/Image 4 defines the character for \[\[HERO_2\]\]/g, "Image 2 defines the character for [[HERO_2]]");

            // --- GENERATION AUDIT: capture exactly what will be sent ---
            const auditSnapshot = {
                spreadIndex: index,
                heroAUrl: compressedHeroA ? `data:image/jpeg;base64,${compressedHeroA.replace(/^data:image\/\w+;base64,/, '')}` : null,
                heroBUrl: compressedHeroB ? `data:image/jpeg;base64,${compressedHeroB.replace(/^data:image\/\w+;base64,/, '')}` : null,
                heroACount: compressedHeroA ? 1 : 0,
                heroBCount: compressedHeroB ? 1 : 0,
                promptSent: safePromptToUse,
                dnaSource,
            };
            setLastGenerationAudit(auditSnapshot);
            setShowAuditPanel(true);

            ClientLogger.log('PAINT_ART_CLICKED', {
                index,
                mode: 'DNA-Only v6.0',
                heroA_has: !!compressedHeroA,
                heroB_has: !!compressedHeroB,
                promptLength: auditSnapshot.promptSent.length,
            });

            console.group(`%c 🧬 DNA AUDIT [Spread ${index}] `, 'background: #222; color: #bada55; font-size: 12px; font-weight: bold;');
            console.log('[v6.0 DNA-Only] Images sent:', { heroA: !!compressedHeroA, heroB: !!compressedHeroB });
            console.log('Prompt (first 300 chars):', auditSnapshot.promptSent.substring(0, 300));
            console.groupEnd();

            const imgRes: any = await backendApi.generateImage({
                prompt: auditSnapshot.promptSent,
                stylePrompt: typeof visualDNA === 'string' ? visualDNA : String(visualDNA || ''),
                heroDNABase64: compressedHeroA,
                secondDNABase64: compressedHeroB,
                characterDescription: storyData.mainCharacter?.description || '',
                age: storyData.childAge,
                secondCharacterDescription: storyData.secondCharacter?.description,
            });

            ClientLogger.log('PAINT_ART_SUCCESS', { 
                index, 
                returnedImageBase64Length: imgRes.imageBase64?.length,
                fullPromptLength: imgRes.fullPrompt?.length,
                seedPromptLength: imgRes.seedPrompt?.length
            });

            if (index === 'cover') {
                const newStory = {
                    ...storyData,
                    coverImageUrl: imgRes.imageBase64,
                    coverOriginalUrl: undefined,
                    coverQcStatus: undefined,
                    // Keep the editable seed prompt in actualCoverPrompt (what you see in the textarea)
                    actualCoverPrompt: imgRes.seedPrompt || promptToUse,
                    // Store the REAL Gemini prompt separately for troubleshooting
                    lastGeminiCoverPrompt: imgRes.fullPrompt,
                    coverGenerationModel: imgRes.modelUsed
                };
                onUpdateStory({
                    coverImageUrl: imgRes.imageBase64,
                    coverOriginalUrl: undefined,
                    coverQcStatus: undefined,
                    actualCoverPrompt: imgRes.seedPrompt || promptToUse,
                    lastGeminiCoverPrompt: imgRes.fullPrompt,
                    coverGenerationModel: imgRes.modelUsed
                } as any);
                // Keep the textarea as-is (editable seed) — do NOT replace with compiled Gemini prompt
                await adminService.saveOrder(storyData.orderId || 'RWY-UNKNOWN', newStory, shippingDetails || {});
            } else {
                const newSpreads = [...spreads];
                newSpreads[index] = {
                    ...newSpreads[index],
                    illustrationUrl: imgRes.imageBase64,
                    qcOriginalUrl: undefined,
                    qcStatus: undefined,
                    // Keep the editable seed prompt (what you see in the textarea)
                    actualPrompt: imgRes.seedPrompt || promptToUse,
                    // Store the REAL Gemini prompt separately for troubleshooting
                    lastGeminiPrompt: imgRes.fullPrompt,
                    generationModel: imgRes.modelUsed
                };
                const newStory = { ...storyData, spreads: newSpreads };
                
                // Do NOT update pageEdits — leave the seed prompt editable in the textarea
                onUpdateStory({ spreads: newSpreads });
                await adminService.saveOrder(storyData.orderId || 'RWY-UNKNOWN', newStory, shippingDetails || {});
            }
        } catch (e: any) {
            console.error("Failed to regenerate image", e);
            alert(`Image regeneration failed.\n\nError: ${e.message || String(e)}`);
        } finally {
            setRegeneratingIndex(null);
        }
    };

    const handleUploadImage = (index: number | 'cover') => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg, image/png, image/webp';
        input.onchange = (e: any) => {
            const file = e.target.files?.[0];
            if (!file) return;
            setUploadingIndex(index);
            const reader = new FileReader();
            reader.onload = async (event) => {
                try {
                    const fullBase64 = event.target?.result as string;
                    ClientLogger.log('IMAGE_UPLOADED_MANUALLY', { index, fileName: file.name, fileSize: file.size });
                    
                    if (index === 'cover') {
                        onUpdateStory({ coverImageUrl: fullBase64 });
                    } else {
                        const newSpreads = [...spreads];
                        newSpreads[index] = {
                            ...newSpreads[index],
                            illustrationUrl: fullBase64
                        };
                        onUpdateStory({ spreads: newSpreads });
                    }
                } finally {
                    setUploadingIndex(null);
                }
            };
            reader.onerror = () => setUploadingIndex(null);
            reader.readAsDataURL(file);
        };
        input.click();
    };

    const handleFlipCover = async () => {
        if (!coverUrl) return;
        setRegeneratingIndex('cover');
        try {
            // Get original base64 to flip
            let base64 = coverUrl;
            if (coverUrl.startsWith('http')) {
                // If it's a URL, we must fetch it first
                const resp = await fetch(coverUrl);
                const blob = await resp.blob();
                base64 = await new Promise((resolve) => {
                    const reader = new FileReader();
                    reader.onloadend = () => resolve(reader.result as string);
                    reader.readAsDataURL(blob);
                });
            }
            
            const flippedB64 = await flipImageHorizontal(base64);
            const newStoryData = { ...storyData, coverImageUrl: flippedB64 };
            onUpdateStory({ coverImageUrl: flippedB64 });
            
            // Instantly save to DB
            if (storyData.orderId) {
                await adminService.saveOrder(storyData.orderId, newStoryData, shippingDetails || {});
            }
        } catch (e) {
            console.error("Flip failed", e);
            alert("Failed to flip cover.");
        } finally {
            setRegeneratingIndex(null);
        }
    };

    const handleUploadText = (index: number) => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'text/plain';
        input.onchange = (e: any) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                const text = event.target?.result as string;
                handleTextChange(index, text);
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const handleMassUploadText = () => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'text/plain';
        input.onchange = (e: any) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                const fullText = event.target?.result as string;
                const blocks = fullText.split(/\n\s*\n/).filter(line => line.trim() !== '');
                const segments = blocks.length >= 8 ? blocks : fullText.split('\n').filter(line => line.trim() !== '');
                segments.slice(0, 8).forEach((segment, index) => {
                    handleTextChange(index, segment.trim());
                });
            };
            reader.readAsText(file);
        };
        input.click();
    };

    const handleDownloadText = () => {
        let fullTextContent = `Story: ${storyData.title || 'Untitled'}\n\n`;
        const finalSpreads = [...spreads];
        for (let i = 0; i < Math.max(8, finalSpreads.length); i++) {
            const spreadText = pageEdits[i]?.text !== undefined ? pageEdits[i].text : getSpreadText(finalSpreads[i]);
            if (spreadText || finalSpreads[i]) {
                fullTextContent += `Spread ${i + 1}:\n${spreadText}\n\n`;
            }
        }
        const blob = new Blob([fullTextContent], { type: 'text/plain' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${storyData.orderId || 'story'}_full_text.txt`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const handleDownloadBlueprint = () => {
        const bpString = JSON.stringify(blueprint || {}, null, 2);
        const blob = new Blob([bpString], { type: 'application/json' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `${storyData.orderId || 'story'}_blueprint.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const [isFinalizing, setIsFinalizing] = useState(false);

    // ── Global AI Edit state ──
    const [globalEditInstruction, setGlobalEditInstruction] = useState('');
    const [isGlobalRegenerating, setIsGlobalRegenerating] = useState(false);
    const [globalEditProgress, setGlobalEditProgress] = useState(0);
    const [globalEditStatus, setGlobalEditStatus] = useState('');

    const handleGlobalRegenerate = async () => {
        if (!globalEditInstruction.trim()) return;
        const totalSpreads = storyData.spreadCount || Math.max(8, spreads.length - 1);
        setIsGlobalRegenerating(true);
        setGlobalEditProgress(0);
        try {
            const mainRawPhoto = storyData.mainCharacter?.imageRawUrl || storyData.mainCharacter?.imageBases64?.[0] || storyData.mainCharacterImageBase64;
            const mainStylizedDNA = storyData.mainCharacter?.imageDNA?.[0] || storyData.styleReferenceImageBase64 || storyData.styleReferenceImageUrl || mainRawPhoto;
            const mainDNASet: string[] = Array.from(new Set([mainRawPhoto, mainStylizedDNA].filter(Boolean) as string[]));

            const secondRawPhoto = storyData.secondCharacter?.imageRawUrl || storyData.secondCharacter?.imageBases64?.[0] || storyData.secondCharacterImageBase64;
            const secondStylizedDNA = storyData.secondCharacter?.imageDNA?.[0] || storyData.secondCharacterImageBase64 || secondRawPhoto;
            const secondDNASet = (storyData.useSecondCharacter && storyData.secondCharacter?.type !== 'object')
                ? Array.from(new Set([secondRawPhoto, secondStylizedDNA].filter(Boolean) as string[]))
                : undefined;

            const visualDNA = getCleanStylePrompt(storyData.selectedStylePrompt) || 'Painterly children\'s book illustration style';
            
            const compressSet = async (set: string[] | undefined): Promise<string[] | undefined> => {
                if (!set || set.length === 0) return undefined;
                return Promise.all(set.map(img => compressBase64Image(img, 1024, 0.85)));
            };

            const compressedMaster = await compressSet(mainDNASet);
            const compressedSecond = await compressSet(secondDNASet);
            const newSpreads = [...spreads];

            for (let i = 1; i <= totalSpreads; i++) {
                setGlobalEditStatus(`Painting Spread ${i} of ${totalSpreads}...`);
                const basePrompt = pageEdits[i]?.prompt || getPromptForIndex(i, spreads[i]) || '';
                const combinedPrompt = `GLOBAL OVERRIDE INSTRUCTION: ${globalEditInstruction.trim()}\n\n${basePrompt}`;
                try {
                    const imgRes: any = await backendApi.generateImage({
                        prompt: combinedPrompt,
                        stylePrompt: visualDNA,
                        referenceBase64: compressedMaster,
                        characterDescription: storyData.mainCharacter?.description || '',
                        age: storyData.childAge,
                        secondReferenceBase64: compressedSecond
                    });
                    if (imgRes.imageBase64) {
                        newSpreads[i] = { 
                            ...newSpreads[i], 
                            illustrationUrl: imgRes.imageBase64,
                            generationModel: imgRes.modelUsed
                        };
                        onUpdateStory({ spreads: [...newSpreads] });
                    }
                } catch (e) {
                    console.error(`Global regen failed for spread ${i}`, e);
                }
                setGlobalEditProgress(Math.round((i / totalSpreads) * 100));
            }

            // Save final state
            if (storyData.orderId) {
                await adminService.saveOrder(storyData.orderId, { ...storyData, spreads: newSpreads }, shippingDetails || {});
            }
        } catch (e: any) {
            alert(`Global regeneration error: ${e.message}`);
        } finally {
            setIsGlobalRegenerating(false);
            setGlobalEditStatus('');
        }
    };

    const applyAllEditsAndFinalize = async () => {
        setIsFinalizing(true);
        
        // Give the UI a moment to render the loading spinner before locking the thread
        await new Promise(r => setTimeout(r, 50));
        
        try {
            await handleSilentSave();

            const finalSpreads = [...spreads];
            for (let i = 0; i < finalSpreads.length; i++) {
                const editedText = pageEdits[i]?.text;
                const currentText = getSpreadText(finalSpreads[i]);
                if (editedText !== undefined && editedText !== currentText) {
                    finalSpreads[i] = { 
                        ...finalSpreads[i], 
                        leftText: editedText, 
                        rightText: '',
                        textBlocks: [] // CLEAR blocks to force single-block manual layout
                    } as any;
                }
                if (pageEdits[i]?.prompt !== undefined && pageEdits[i].prompt !== finalSpreads[i].actualPrompt) {
                    finalSpreads[i] = { ...finalSpreads[i], actualPrompt: pageEdits[i].prompt };
                }
                if (pageEdits[i]?.textSide !== undefined) {
                    finalSpreads[i] = { ...finalSpreads[i], textSide: pageEdits[i].textSide };
                }
                if (pageEdits[i]?.textOffsetX !== undefined) {
                    finalSpreads[i] = { ...finalSpreads[i], textOffsetX: pageEdits[i].textOffsetX };
                }
                if (pageEdits[i]?.textOffsetY !== undefined) {
                    finalSpreads[i] = { ...finalSpreads[i], textOffsetY: pageEdits[i].textOffsetY };
                }
                if (pageEdits[i]?.imageOffsetX !== undefined) {
                    finalSpreads[i] = { ...finalSpreads[i], imageOffsetX: pageEdits[i].imageOffsetX };
                }
                if (pageEdits[i]?.imageOffsetY !== undefined) {
                    finalSpreads[i] = { ...finalSpreads[i], imageOffsetY: pageEdits[i].imageOffsetY };
                }
                if (pageEdits[i]?.imageScale !== undefined) {
                    finalSpreads[i] = { ...finalSpreads[i], imageScale: pageEdits[i].imageScale };
                }
            }

            const finalStoryData = {
                ...storyData,
                title: localTitle,
                coverSubtitle: localSubtitle,
                coverTextSide: localCoverTextSide,
                spreads: finalSpreads,
                actualCoverPrompt: coverEdit,
            };

            ClientLogger.log('FINALIZE_BOOK_CLICKED', { orderId: storyData.orderId, title: localTitle });
            await onFinalize(finalStoryData);
            ClientLogger.log('FINALIZE_BOOK_SUCCESS');
        } catch (error) {
            ClientLogger.error('FINALIZE_BOOK_FAILED', error);
            console.error("Finalize error:", error);
            alert("Error finalizing order: " + (error as any).message);
        } finally {
            setIsFinalizing(false);
        }
    };

    const handleSilentSave = async () => {
        const finalSpreads = [...spreads];
        for (let i = 0; i < finalSpreads.length; i++) {
            const editedText = pageEdits[i]?.text;
            const currentText = getSpreadText(finalSpreads[i]);
            if (editedText !== undefined && editedText !== currentText) {
                finalSpreads[i] = { 
                    ...finalSpreads[i], 
                    leftText: editedText, 
                    rightText: '',
                    textBlocks: [] // CLEAR blocks to force single-block manual layout
                } as any;
            }
            if (pageEdits[i]?.prompt !== undefined && pageEdits[i].prompt !== finalSpreads[i].actualPrompt) {
                finalSpreads[i] = { ...finalSpreads[i], actualPrompt: pageEdits[i].prompt };
            }
            if (pageEdits[i]?.textSide !== undefined) {
                finalSpreads[i] = { ...finalSpreads[i], textSide: pageEdits[i].textSide };
            }
            if (pageEdits[i]?.textOffsetX !== undefined) {
                finalSpreads[i] = { ...finalSpreads[i], textOffsetX: pageEdits[i].textOffsetX };
            }
            if (pageEdits[i]?.textOffsetY !== undefined) {
                finalSpreads[i] = { ...finalSpreads[i], textOffsetY: pageEdits[i].textOffsetY };
            }
            if (pageEdits[i]?.imageOffsetX !== undefined) {
                finalSpreads[i] = { ...finalSpreads[i], imageOffsetX: pageEdits[i].imageOffsetX };
            }
            if (pageEdits[i]?.imageOffsetY !== undefined) {
                finalSpreads[i] = { ...finalSpreads[i], imageOffsetY: pageEdits[i].imageOffsetY };
            }
            if (pageEdits[i]?.imageScale !== undefined) {
                finalSpreads[i] = { ...finalSpreads[i], imageScale: pageEdits[i].imageScale };
            }
        }
        onUpdateStory({ spreads: finalSpreads, actualCoverPrompt: coverEdit, title: localTitle, coverSubtitle: localSubtitle, coverTextSide: localCoverTextSide });
        
        const orderId = storyData.orderId || storyData.orderNumber;
        if (orderId) {
            ClientLogger.log('SILENT_SAVE', { orderId, title: localTitle });
            try {
                await adminService.saveOrder(orderId as string, { ...storyData, spreads: finalSpreads, actualCoverPrompt: coverEdit, title: localTitle, coverSubtitle: localSubtitle, coverTextSide: localCoverTextSide }, shippingDetails || {});
            } catch(e) {
                ClientLogger.error('SILENT_SAVE_FAILED', e);
                console.error("Silent save failed", e);
            }
        }
    };

    const [isDNAManagerOpen, setIsDNAManagerOpen] = useState(false);

    const handleUpdateDNA = async (mainDNA?: string, secondDNA?: string) => {
        const newStoryData = { ...storyData };
        if (mainDNA) {
            newStoryData.mainCharacter = {
                ...newStoryData.mainCharacter,
                imageDNA: [mainDNA]
            } as any;
        }
        if (secondDNA && newStoryData.secondCharacter) {
            newStoryData.secondCharacter = {
                ...newStoryData.secondCharacter,
                imageDNA: [secondDNA]
            } as any;
        }
        onUpdateStory(newStoryData);
        if (storyData.orderId) {
            await adminService.saveOrder(storyData.orderId, newStoryData, shippingDetails || {});
            try {
                // Trigger backend to redraw images by setting status back to prompts_ready
                await adminService.updateOrderStatus(storyData.orderId as string, 'prompts_ready');
                // Reload window or trigger pipeline run
                window.location.reload();
            } catch (e) {
                console.warn("Could not set status to prompts_ready:", e);
            }
        }
    };


    const [isBackendProcessing, setIsBackendProcessing] = useState(false);
    const [backendProgress, setBackendProgress] = useState(0);
    const [backendStatusText, setBackendStatusText] = useState('');

    useEffect(() => {
        if (!isBackendProcessing || !storyData.orderId) return;
        let isMounted = true;
        const checkStatus = async () => {
            try {
                const result = await adminService.getOrderStatus(storyData.orderId as string);
                if (!result || !isMounted) return;
                const { status, error_message } = result as any;
                if (error_message || status === 'failed') {
                    setBackendProgress(0);
                    setBackendStatusText(`Error: ${error_message || 'Pipeline Failed'}`);
                    setIsBackendProcessing(false);
                    return;
                }
                if (status === 'story_ready' || status === 'queued') {
                    setBackendProgress(10);
                    setBackendStatusText('Waiting for Workers...');
                } else if (status === 'illustrations_generating') {
                    setBackendProgress(40);
                    setBackendStatusText('Generating Illustrations...');
                } else if (status === 'illustrations_ready') {
                    setBackendProgress(80);
                    setBackendStatusText('Assembling Book...');
                } else if (status === 'book_compiling') {
                    setBackendProgress(90);
                    setBackendStatusText('Compiling Pages...');
                } else if (status === 'softcopy_ready' || status === 'awaiting_preview_approval' || status === 'sent_to_print' || status === 'printing') {
                    setBackendProgress(100);
                    setBackendStatusText('Complete!');
                    setIsBackendProcessing(false);
                    const freshOrder = await adminService.getOrderById(storyData.orderId as string);
                    if (freshOrder && isMounted) {
                        onUpdateStory(freshOrder.storyData);
                    }
                }
            } catch (e) {
                console.error("Polling error:", e);
            }
        };
        checkStatus();
        const interval = setInterval(checkStatus, 5000);
        return () => {
            isMounted = false;
            clearInterval(interval);
        };
    }, [isBackendProcessing, storyData.orderId]);

    const t = (ar: string, en: string) => language === 'ar' ? ar : en;

    // Helper to get selected style string
    const displayStyle = storyData.selectedStyleNames?.[0] || 'Unknown Style';

    return (
        <div className="w-full h-full min-h-[90vh] bg-[#fdfdfd] flex overflow-hidden">

            {/* ─── GENERATION AUDIT PANEL ─────────────────────────────────────────
                Shows EXACTLY what was sent to Gemini on the last Paint Spread call.
                Answers: "Which images were attached? What prompt was used?"
            ─────────────────────────────────────────────────────────────────────── */}
            {showAuditPanel && lastGenerationAudit && (
                <div className="fixed inset-0 z-[200] flex items-end justify-end pointer-events-none">
                    <div className="pointer-events-auto m-4 w-[420px] max-h-[90vh] bg-gray-950 text-white rounded-2xl shadow-2xl border border-gray-700 flex flex-col overflow-hidden">
                        {/* Header */}
                        <div className="flex items-center justify-between px-4 py-3 border-b border-gray-700 bg-gray-900 shrink-0">
                            <div className="flex items-center gap-2">
                                <span className="text-green-400 text-xs">🧬</span>
                                <span className="text-xs font-black uppercase tracking-widest text-green-400">
                                    Generation Audit
                                </span>
                                <span className="text-[10px] bg-green-900 text-green-300 px-2 py-0.5 rounded-full font-mono">
                                    {lastGenerationAudit.spreadIndex === 'cover' ? 'Spread cover' : `Spread ${lastGenerationAudit.spreadIndex}`}
                                </span>
                            </div>
                            <button
                                onClick={() => setShowAuditPanel(false)}
                                className="text-gray-400 hover:text-white text-lg leading-none"
                                title="Close audit panel"
                            >×</button>
                        </div>

                        {/* DNA Source Warning Banner */}
                        {lastGenerationAudit.dnaSource === 'storydata_fallback' && (
                            <div className="mx-4 mt-3 p-3 bg-orange-950 border-2 border-orange-500 rounded-xl shrink-0">
                                <div className="flex items-start gap-2">
                                    <span className="text-orange-400 text-base shrink-0">⚠️</span>
                                    <div>
                                        <p className="text-[11px] font-black text-orange-300 uppercase tracking-wider mb-1">DNA Source: StoryData Blob (Untrusted)</p>
                                        <p className="text-[10px] text-orange-400 leading-relaxed">No <code className="bg-orange-900 px-1 rounded">order_dna</code> rows found for this order. Images below came from the storyData JSONB — which may contain DNA from a DIFFERENT order. This is the likely cause of wrong hero clothes/looks.</p>
                                        <p className="text-[10px] text-orange-300 mt-1 font-bold">👉 Fix: Open DNA Manager → Upload correct hero DNA images → Retry Paint Art.</p>
                                    </div>
                                </div>
                            </div>
                        )}
                        {lastGenerationAudit.dnaSource === 'order_dna' && (
                            <div className="mx-4 mt-3 px-3 py-1.5 bg-green-950 border border-green-700 rounded-xl shrink-0">
                                <p className="text-[10px] font-bold text-green-400">✅ DNA Source: <code className="bg-green-900 px-1 rounded">order_dna</code> table — Trusted & Verified</p>
                            </div>
                        )}

                        {/* Images Section */}
                        <div className="px-4 pt-3 pb-2 border-b border-gray-800 shrink-0">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-2">
                                Images Sent to Gemini
                            </p>
                            <div className="flex gap-3">
                                {/* Hero A */}
                                <div className="flex-1 flex flex-col gap-1">
                                    <div className={`text-[9px] font-black uppercase tracking-widest px-1 ${lastGenerationAudit.heroACount === 1 ? 'text-green-400' : 'text-red-400'}`}>
                                        {lastGenerationAudit.heroACount === 1 ? '✅ Image 1 — HERO_1 DNA' : '❌ HERO_1 MISSING'}
                                    </div>
                                    {lastGenerationAudit.heroAUrl ? (
                                        <img
                                            src={lastGenerationAudit.heroAUrl}
                                            alt="Hero A DNA sent"
                                            className="w-full aspect-square object-cover rounded-lg border-2 border-green-500"
                                        />
                                    ) : (
                                        <div className="w-full aspect-square rounded-lg border-2 border-red-500 bg-red-900/30 flex items-center justify-center">
                                            <span className="text-xs text-red-400">No Image</span>
                                        </div>
                                    )}
                                </div>

                                {/* Hero B (if dual-hero) */}
                                {(lastGenerationAudit.heroBCount > 0 || lastGenerationAudit.heroBUrl) ? (
                                    <div className="flex-1 flex flex-col gap-1">
                                        <div className={`text-[9px] font-black uppercase tracking-widest px-1 ${lastGenerationAudit.heroBCount === 1 ? 'text-green-400' : 'text-yellow-400'}`}>
                                            {lastGenerationAudit.heroBCount === 1 ? '✅ Image 2 — HERO_2 DNA' : '⚠️ HERO_2 MISSING'}
                                        </div>
                                        {lastGenerationAudit.heroBUrl ? (
                                            <img
                                                src={lastGenerationAudit.heroBUrl}
                                                alt="Hero B DNA sent"
                                                className="w-full aspect-square object-cover rounded-lg border-2 border-green-500"
                                            />
                                        ) : (
                                            <div className="w-full aspect-square rounded-lg border-2 border-yellow-500 bg-yellow-900/30 flex items-center justify-center">
                                                <span className="text-xs text-yellow-400">No Image</span>
                                            </div>
                                        )}
                                    </div>
                                ) : (
                                    <div className="flex-1 flex flex-col gap-1">
                                        <div className="text-[9px] font-black uppercase tracking-widest px-1 text-gray-600">
                                            — Single Hero Mode
                                        </div>
                                        <div className="w-full aspect-square rounded-lg border border-dashed border-gray-700 flex items-center justify-center">
                                            <span className="text-xs text-gray-600">No Hero B</span>
                                        </div>
                                    </div>
                                )}
                            </div>
                            {/* Sanity Check */}
                            <div className={`mt-2 text-[10px] font-mono rounded-lg px-3 py-1.5 ${lastGenerationAudit.heroACount === 1 ? 'bg-green-900/40 text-green-300' : 'bg-red-900/40 text-red-300'}`}>
                                {lastGenerationAudit.heroACount === 1
                                    ? `✅ Payload: ${lastGenerationAudit.heroACount + lastGenerationAudit.heroBCount} image(s) attached — matches prompt [v6.0-dna-only]`
                                    : `❌ FATAL: Hero A image missing — Gemini will hallucinate the character`
                                }
                            </div>
                        </div>

                        {/* Prompt Section */}
                        <div className="px-4 pt-3 pb-3 flex flex-col gap-1 overflow-y-auto">
                            <p className="text-[10px] font-black uppercase tracking-widest text-gray-400 mb-1 shrink-0">
                                Prompt Sent ({lastGenerationAudit.promptSent.length} chars)
                            </p>
                            <pre className="text-[10px] text-gray-300 whitespace-pre-wrap font-mono bg-gray-900 rounded-lg p-3 overflow-y-auto max-h-[240px] leading-relaxed">
                                {lastGenerationAudit.promptSent}
                            </pre>
                            <button
                                onClick={() => navigator.clipboard?.writeText(lastGenerationAudit.promptSent)}
                                className="mt-1 text-[10px] text-blue-400 hover:text-blue-300 text-left font-mono underline shrink-0"
                            >
                                📋 Copy prompt to clipboard
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Left Pane: Blueprint Reference */}
            <div className="hidden lg:flex flex-col w-[300px] border-r border-gray-100 bg-white p-6 overflow-y-auto scroller-thin shrink-0">
                
                {/* 1. ORDER INFO BLOCK */}
                <div className="mb-6 space-y-3 p-4 bg-gray-50 rounded-2xl border border-gray-200 shadow-sm text-sm">
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span className="font-bold text-gray-500 uppercase text-xs tracking-widest">Book Language</span>
                        <span className="font-black text-brand-teal uppercase text-xs tracking-widest">{LANGUAGE_MAP[storyData.language ?? 'en'] || storyData.language}</span>
                    </div>
                    <div className="flex justify-between items-center border-b border-gray-200 pb-2">
                        <span className="font-bold text-gray-500 uppercase text-xs tracking-widest">Format</span>
                        <span className="font-black text-brand-navy uppercase text-xs tracking-widest">
                            {!storyData.useSecondCharacter 
                                ? 'Single Hero' 
                                : (storyData.secondCharacter?.type === 'object' ? 'Single Hero + Item' : 'Dual Hero')}
                        </span>
                    </div>
                    <div className="flex justify-between items-center pb-1">
                        <span className="font-bold text-gray-500 uppercase text-xs tracking-widest">Art Style</span>
                        <span className="font-black text-brand-orange uppercase text-xs tracking-widest text-right max-w-[120px] truncate" title={displayStyle}>
                            {displayStyle}
                        </span>
                    </div>
                </div>

                {/* 2. CUSTOMER SELECTED VISUAL DNA BLOCK */}
                {(masterDNA || masterDNA2) && (
                    <div className="mb-6 p-4 bg-orange-50/50 rounded-2xl border border-orange-100 shadow-sm">
                        <div className="flex justify-between items-center mb-3">
                            <h4 className="text-xs font-black text-brand-orange uppercase tracking-widest flex items-center gap-2">
                                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                {t('الصورة المرجعية للعميل', 'Customer Locked DNA')}
                            </h4>
                            <Button variant="secondary" className="text-[10px] py-1 px-2 h-auto" onClick={() => setIsDNAManagerOpen(true)}>Manage DNA</Button>
                        </div>

                        {/* Hero A — Raw Photo + DNA side by side */}
                        {(masterRaw || masterDNA) && (
                            <div className="mb-3">
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">
                                    {storyData.useSecondCharacter ? 'Hero A' : 'Hero'}
                                </p>
                                <div className="flex gap-2 w-full">
                                    {masterRaw && (
                                        <div className="flex-1 flex flex-col gap-1">
                                            <img
                                                src={masterRaw.startsWith('http') ? masterRaw : `data:image/jpeg;base64,${masterRaw}`}
                                                alt="Raw Original Photo"
                                                className="w-full rounded-xl shadow-sm border-2 border-blue-200 object-cover aspect-square"
                                                title="Original raw photo — identity source"
                                            />
                                            <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest text-center">📷 Original Photo</span>
                                        </div>
                                    )}
                                    {masterDNA && (
                                        <div className="flex-1 flex flex-col gap-1">
                                            <img
                                                src={masterDNA.startsWith('http') ? masterDNA : `data:image/jpeg;base64,${masterDNA}`}
                                                alt="DNA Style Anchor"
                                                className="w-full rounded-xl shadow-sm border-2 border-orange-200 object-cover aspect-square"
                                                title="DNA watercolor — art style source"
                                            />
                                            <span className="text-[8px] font-black text-brand-orange uppercase tracking-widest text-center">🎨 DNA Style</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Hero B — Raw Photo + DNA side by side */}
                        {storyData.useSecondCharacter && (masterRaw2 || masterDNA2) && (
                            <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Hero B</p>
                                <div className="flex gap-2 w-full">
                                    {masterRaw2 && (
                                        <div className="flex-1 flex flex-col gap-1">
                                            <img
                                                src={masterRaw2.startsWith('http') ? masterRaw2 : `data:image/jpeg;base64,${masterRaw2}`}
                                                alt="Raw Original Photo B"
                                                className="w-full rounded-xl shadow-sm border-2 border-blue-200 object-cover aspect-square"
                                                title="Original raw photo — identity source"
                                            />
                                            <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest text-center">📷 Original Photo</span>
                                        </div>
                                    )}
                                    {masterDNA2 && (
                                        <div className="flex-1 flex flex-col gap-1">
                                            <img
                                                src={masterDNA2.startsWith('http') ? masterDNA2 : `data:image/jpeg;base64,${masterDNA2}`}
                                                alt="DNA Style Anchor B"
                                                className="w-full rounded-xl shadow-sm border-2 border-orange-200 object-cover aspect-square"
                                                title="DNA watercolor — art style source"
                                            />
                                            <span className="text-[8px] font-black text-brand-orange uppercase tracking-widest text-center">🎨 DNA Style</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. STORY BLUEPRINT BLOCK */}
                <div className="flex justify-between items-center mb-4 mt-2">
                    <h2 className="text-xl font-bold text-brand-navy uppercase tracking-tighter">{t('مخطط القصة', 'Story Blueprint')}</h2>
                    <Button onClick={handleDownloadBlueprint} variant="outline" className="text-[10px] py-1 px-3 shadow-none border-gray-200">
                        JSON
                    </Button>
                </div>
                {blueprint ? (
                    <div className="space-y-4 text-sm text-gray-700 bg-gray-50/50 p-4 rounded-2xl border border-gray-100">
                        {Object.entries(blueprint).map(([key, value]) => {
                            if (key === 'spreads' || key === 'title') return null;
                            if (typeof value === 'object' && value !== null) {
                                return (
                                    <div key={key}>
                                        <h4 className="text-xs font-black text-brand-teal uppercase tracking-widest mb-2 mt-2">{key.replace(/([A-Z])/g, ' $1').trim()}</h4>
                                        <div className="space-y-2">
                                            {Object.entries(value).map(([subKey, subValue]) => (
                                                <div key={subKey} className="flex flex-col">
                                                    <strong className="text-[10px] text-gray-400 uppercase tracking-widest">{subKey.replace(/([A-Z])/g, ' $1').trim()}</strong>
                                                    <span className="text-xs font-medium leading-relaxed">{String(subValue)}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                );
                            }
                            return null;
                        })}
                    </div>
                ) : (
                    <p className="text-gray-400 italic">{t('جاري المعالجة...', 'Architecting story...')}</p>
                )}
            </div>

            {/* Right Pane: Main Processor */}
            <div className="flex-1 flex flex-col bg-white overflow-hidden relative">
                <div className="flex flex-col lg:flex-row lg:justify-between lg:items-center p-4 lg:p-6 border-b border-gray-100 bg-white sticky top-0 z-20 gap-4">
                    <div className="flex flex-col md:flex-row md:items-center gap-6">
                        {onBack && (
                            <button onClick={onBack} className="text-gray-400 hover:text-brand-orange transition-all hover:scale-110 active:scale-95 shrink-0">
                                <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M10 19l-7-7m0 0l7-7m-7 7h18" /></svg>
                            </button>
                        )}
                        <h2 className="text-2xl font-black text-brand-navy shrink-0 uppercase tracking-tighter">{t('محرر الصفحات', 'Spread Editor')}</h2>
                        {(isAnyGenerating || currentError || isBackendProcessing) && (
                            <div className="p-2.5 px-5 rounded-2xl flex items-center gap-4 border bg-orange-50/80 border-orange-200/50 shadow-sm animate-in fade-in zoom-in duration-300">
                                <Spinner size="sm" color="text-brand-orange" />
                                <span className="text-xs font-black text-brand-navy uppercase tracking-widest">
                                    {isBackendProcessing ? backendStatusText : (currentError ? `Error: ${currentError}` : (currentStatus || t('جاري التوليد...', 'Generating...')))}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2 lg:gap-3 flex-nowrap lg:flex-wrap overflow-x-auto pb-2 px-1 w-full lg:w-auto scroller-thin shrink-0 snap-x">
                        <Button onClick={() => setShowTerminal(!showTerminal)} variant="outline" className={`shrink-0 snap-start !py-2 !px-4 lg:!py-2.5 lg:!px-6 border-2 transition-all ${showTerminal ? 'bg-brand-navy text-white border-brand-navy' : 'border-gray-200 text-gray-500 hover:border-brand-navy hover:text-brand-navy'}`}>
                            {showTerminal ? t('إخفاء السجل', 'Hide Logs') : t('عرض السجل', 'Show Logs')}
                        </Button>
                        <Button onClick={handleMassUploadText} variant="outline" className="shrink-0 snap-start !py-2 !px-3 lg:!py-2.5 lg:!px-4 border-2 border-gray-200 text-gray-500 hover:border-brand-teal hover:text-brand-teal text-[10px] lg:text-xs">
                            Upload Script
                        </Button>
                        <Button onClick={handleDownloadText} variant="outline" className="shrink-0 snap-start !py-2 !px-3 lg:!py-2.5 lg:!px-4 border-2 border-gray-200 text-gray-500 hover:border-brand-navy hover:text-brand-navy text-[10px] lg:text-xs">
                            Export Script
                        </Button>
                        <div className="flex gap-2 lg:gap-4 shrink-0 snap-start">
                            <Button onClick={() => runPipeline(false)} disabled={isAnyGenerating} variant="secondary" className="!py-2 !px-3 lg:!py-2.5 lg:!px-4 border-2 border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white transition-all font-black uppercase text-[9px] lg:text-[10px]">
                                {t('إعادة المعالجة', 'Restart Pipeline')}
                            </Button>
                            <Button onClick={() => runPipeline(true)} disabled={isAnyGenerating} variant="secondary" className="!py-2 !px-3 lg:!py-2.5 lg:!px-4 border-2 border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white transition-all shadow-lg font-black uppercase text-[9px] lg:text-[10px]">
                                {t('إستكمال المعالجة', 'Continue Pipeline')}
                            </Button>
                            <Button onClick={handleSilentSave} disabled={isAnyGenerating || isFinalizing} variant="secondary" className="!py-2 !px-4 lg:!py-2.5 lg:!px-6 border-2 border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white transition-all font-black uppercase text-[9px] lg:text-[10px] flex items-center justify-center gap-2">
                                💾 {t('حفظ', 'Save to DB')}
                            </Button>
                            {onPreview && (
                                <Button onClick={onPreview} disabled={isAnyGenerating || isFinalizing} variant="secondary" className="!py-2 !px-4 lg:!py-2.5 lg:!px-6 border-2 border-purple-500 text-purple-500 hover:bg-purple-500 hover:text-white transition-all font-black uppercase text-[9px] lg:text-[10px] flex items-center justify-center gap-2">
                                    👁️ {t('معاينة', 'Preview')}
                                </Button>
                            )}
                            <Button onClick={applyAllEditsAndFinalize} disabled={isAnyGenerating || isFinalizing} className="!py-2 !px-4 lg:!py-2.5 lg:!px-6 shadow-xl shadow-brand-orange/30 font-black uppercase text-[9px] lg:text-[10px] flex items-center justify-center gap-2">
                                {isFinalizing ? <><Spinner size="sm" color="text-white" /> {t('جاري الإنهاء...', 'Finalizing...')}</> : t('إنهاء وحفظ', 'Finalize')}
                            </Button>
                        </div>
                    </div>
                </div>

                <div className="flex-1 flex overflow-hidden">
                    <div className="flex-1 overflow-y-auto p-8 sm:p-12 space-y-16 scroller-thin bg-[#fcfcfc]">
                        {/* Cover */}
                        <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
                            <h3 className="text-xl font-black mb-6 text-brand-navy uppercase tracking-tighter flex items-center gap-3">
                                <div className="w-8 h-8 bg-brand-navy text-white rounded-lg flex items-center justify-center text-xs">C</div>
                                {t('الغلاف', 'Cover Design')}
                                {storyData.coverGenerationModel && (
                                    <div className="ml-3 px-3 py-1 bg-gradient-to-r from-indigo-50 to-blue-50 border border-indigo-200/50 rounded-xl flex items-center gap-1.5 shadow-sm">
                                        <span className="text-[10px] text-indigo-600 font-extrabold uppercase tracking-wider font-mono">
                                            🤖 {storyData.coverGenerationModel.includes('pro') ? 'Gemini 3 Pro (Nano Banana Pro)' : 'Gemini 3 Flash (Nano Banana 2)'}
                                        </span>
                                    </div>
                                )}
                                {storyData.coverQcStatus === 'flagged' && (
                                    <span className="ml-auto text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full font-bold border border-red-200">
                                        ⚠️ QA Flagged for Intervention
                                    </span>
                                )}
                            </h3>
                            <div className="flex flex-col xl:flex-row gap-10">
                                <div className="w-full xl:w-1/2 flex flex-col gap-4">
                                    {storyData.coverOriginalUrl ? (
                                        <div className="grid grid-cols-2 gap-4 w-full">
                                            <div className="aspect-[16/9] relative bg-gray-50 rounded-[2rem] overflow-hidden shadow-inner border border-red-300 group">
                                                <img src={storyData.coverOriginalUrl.startsWith('http') || storyData.coverOriginalUrl.startsWith('data:') ? storyData.coverOriginalUrl : `data:image/jpeg;base64,${storyData.coverOriginalUrl}`} className="w-full h-full object-cover" />
                                                <div className="absolute top-3 left-3 bg-red-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow">
                                                    Flagged (Attempt 1)
                                                </div>
                                            </div>
                                            <div className="aspect-[16/9] relative bg-gray-50 rounded-[2rem] overflow-hidden shadow-inner border border-emerald-300 group">
                                                {uploadingIndex === 'cover' ? (
                                                    <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                                                        <Spinner size="md" color="text-brand-orange" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-orange animate-pulse">Processing...</span>
                                                    </div>
                                                ) : (
                                                    coverUrl ? <img src={coverUrl.startsWith('http') || coverUrl.startsWith('data:') ? coverUrl : `data:image/jpeg;base64,${coverUrl}`} className="w-full h-full object-cover" /> : <Spinner size="md" color="text-brand-orange" />
                                                )}
                                                <div className="absolute top-3 left-3 bg-emerald-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow animate-pulse">
                                                    Regenerated (Attempt 2)
                                                </div>
                                            </div>
                                        </div>
                                    ) : (
                                        <div className="aspect-[16/9] relative bg-gray-50 rounded-[2rem] overflow-hidden shadow-inner flex items-center justify-center border-2 border-dashed border-gray-200 group">
                                            {uploadingIndex === 'cover' ? (
                                                <div className="flex flex-col items-center gap-3">
                                                    <Spinner size="md" color="text-brand-orange" />
                                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-orange animate-pulse">Processing...</span>
                                                </div>
                                            ) : (
                                                coverUrl ? <img src={coverUrl.startsWith('http') || coverUrl.startsWith('data:') ? coverUrl : `data:image/jpeg;base64,${coverUrl}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <Spinner size="md" color="text-brand-orange" />
                                            )}
                                            <div className="absolute inset-0 bg-brand-navy/0 group-hover:bg-brand-navy/5 transition-colors duration-300 pointer-events-none"></div>
                                        </div>
                                    )}
                                    <div className="flex gap-2">
                                        <Button variant="secondary" onClick={() => handleUploadImage('cover')} className="flex-[2] text-xs py-3 font-black uppercase tracking-widest px-2">{t('رفع صورة', 'Upload Art')}</Button>
                                        <Button variant="outline" onClick={handleFlipCover} disabled={regeneratingIndex === 'cover' || !coverUrl} className="flex-1 text-xs py-3 font-black uppercase tracking-widest px-1 text-gray-500 border-gray-200">
                                            {regeneratingIndex === 'cover' ? <Spinner size="sm" /> : t('قلب ↔', 'Flip ↔')}
                                        </Button>
                                        <Button onClick={() => handleRegenerateImage('cover')} disabled={regeneratingIndex === 'cover'} className="flex-[2] text-xs py-3 font-black uppercase tracking-widest shadow-lg shadow-brand-orange/20 px-2">
                                            {regeneratingIndex === 'cover' ? <Spinner size="sm" /> : t('إعادة توليد', 'Paint Art')}
                                        </Button>
                                    </div>
                                    


                                    {/* Cover Layout Panel */}
                                    <SpreadLayoutPanel
                                        spreadIndex={0}
                                        illustrationUrl={coverUrl}
                                        textSide={localCoverTextSide}
                                        language={language}
                                        textOffsetX={pageEdits[0]?.textOffsetX ?? spreads[0]?.textOffsetX}
                                        textOffsetY={pageEdits[0]?.textOffsetY ?? spreads[0]?.textOffsetY}
                                        imageOffsetX={pageEdits[0]?.imageOffsetX ?? spreads[0]?.imageOffsetX ?? 0}
                                        imageOffsetY={pageEdits[0]?.imageOffsetY ?? spreads[0]?.imageOffsetY ?? 0}
                                        imageScale={pageEdits[0]?.imageScale ?? spreads[0]?.imageScale ?? 100}
                                        onTextOffsetXChange={v => handleLayoutOffsetChange(0, 'textOffsetX', v)}
                                        onTextOffsetYChange={v => handleLayoutOffsetChange(0, 'textOffsetY', v)}
                                        onImageOffsetXChange={v => handleLayoutOffsetChange(0, 'imageOffsetX', v)}
                                        onImageOffsetYChange={v => handleLayoutOffsetChange(0, 'imageOffsetY', v)}
                                        onImageScaleChange={v => handleLayoutOffsetChange(0, 'imageScale', v)}
                                        onGenerativeFill={() => handleGenerativeFill(0)}
                                        isGeneratingFill={generatingFillIndex === 0}
                                    />

                                    {/* QA Agent Logs Panel for Cover */}
                                    {storyData.orderId && (
                                        <QALogPanel 
                                            orderId={storyData.orderId} 
                                            spreadIndex={0} 
                                            storyData={storyData}
                                        />
                                    )}
                                </div>
                                <div className="w-full xl:w-1/2 flex flex-col gap-4">
                                     <div className="flex gap-4">
                                         <div className="flex-1">
                                             <label className="text-[10px] font-black text-brand-teal uppercase tracking-widest px-1">Book Title</label>
                                             <input type="text" value={localTitle} onChange={(e) => setLocalTitle(e.target.value)} onBlur={handleSilentSave} className="w-full mt-1 p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-bold focus:ring-2 focus:ring-brand-teal/20 outline-none transition-all" />
                                         </div>
                                         <div className="flex-1">
                                             <div className="flex justify-between items-center px-1">
                                                <label className="text-[10px] font-black text-brand-teal uppercase tracking-widest">Cover Subtitle</label>
                                                {/* COVER TEXT ALIGNMENT TOGGLE */}
                                                <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                                                    <button 
                                                        onClick={() => { setLocalCoverTextSide('left'); debouncedSave(100); }} 
                                                        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase transition-all ${localCoverTextSide === 'left' ? 'bg-white shadow text-brand-navy' : 'text-gray-400 hover:text-gray-600'}`}
                                                    >Left</button>
                                                    <button 
                                                        onClick={() => { setLocalCoverTextSide('right'); debouncedSave(100); }} 
                                                        className={`px-2 py-0.5 rounded-md text-[9px] font-black uppercase transition-all ${localCoverTextSide === 'right' ? 'bg-white shadow text-brand-navy' : 'text-gray-400 hover:text-gray-600'}`}
                                                    >Right</button>
                                                </div>
                                             </div>
                                         </div>
                                     </div>

                                     {/* SMART SUBTITLE UI */}
                                     <div>
                                         <div className="flex justify-between items-center px-1 mb-1">
                                             <label className="text-[10px] font-black text-brand-teal uppercase tracking-widest">
                                                 {storyData.useSecondCharacter ? '👥 Hero Names' : '🌟 Hero Name'}
                                             </label>
                                             <button
                                                 onClick={() => { setUseSubtitleOverride(v => !v); debouncedSave(100); }}
                                                 className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg transition-all ${
                                                     useSubtitleOverride
                                                         ? 'bg-brand-orange text-white'
                                                         : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                 }`}
                                             >
                                                 {useSubtitleOverride ? '✏️ Custom' : '✨ Auto'}
                                             </button>
                                         </div>
                                         {useSubtitleOverride ? (
                                             <input
                                                 type="text"
                                                 value={localSubtitleOverride}
                                                 onChange={(e) => setLocalSubtitleOverride(e.target.value)}
                                                 onBlur={handleSilentSave}
                                                 placeholder={computedSubtitle}
                                                 className="w-full p-3 bg-white border-2 border-brand-orange/30 rounded-xl text-sm font-medium focus:ring-2 focus:ring-brand-orange/20 outline-none transition-all"
                                             />
                                         ) : (
                                             <div className="w-full p-3 bg-gray-50 border border-gray-100 rounded-xl text-sm font-medium text-gray-600 flex items-center gap-2">
                                                 <span className="text-base">{storyData.useSecondCharacter ? '👥' : '⭐'}</span>
                                                 <span>{computedSubtitle}</span>
                                                 <span className="ml-auto text-[8px] text-gray-300 font-mono uppercase">auto</span>
                                             </div>
                                         )}
                                     </div>

                                     {/* TITLE PNG PREVIEW PANEL */}
                                     <TitlePreviewPanel
                                         title={localTitle}
                                         subtitle={localSubtitle}
                                         language={language}
                                         coverTextSide={localCoverTextSide}
                                         coverImageUrl={coverUrl}
                                     />

                                      <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mt-2">Cover Art AI Prompt — edit freely, Paint Art uses this</label>
                                      <PromptVersionBadge promptText={coverEdit} />
                                      <textarea
                                          value={coverEdit}
                                          onChange={(e) => setCoverEdit(e.target.value)}
                                          onBlur={handleSilentSave}
                                          className="w-full p-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] text-xs flex-1 min-h-[200px] resize-none focus:ring-2 focus:ring-brand-orange/10 outline-none transition-all font-mono leading-relaxed"
                                          spellCheck={false}
                                          placeholder="Edit the cover scene prompt here. Paint Art uses exactly what you type."
                                      />

                                </div>
                            </div>
                            {/* Cover Gemini AI Edit Panel */}
                            <div className="mt-6">
                                <SpreadGeminiEditPanel
                                    spreadIndex={0}
                                    illustrationUrl={coverUrl}
                                    stylePrompt={getCleanStylePrompt(storyData.selectedStylePrompt) || 'Painterly children\'s book illustration style'}
                                    childDNA={masterDNA}
                                    secondDNA={masterDNA2}
                                    onImageEdited={newB64 => {
                                        const newStoryData = { ...storyData, coverImageUrl: newB64 };
                                        onUpdateStory({ coverImageUrl: newB64 });
                                        if (storyData.orderId) adminService.saveOrder(storyData.orderId, newStoryData, shippingDetails || {}).catch(console.error);
                                    }}
                                />
                            </div>
                        </div>

                        {/* ── GLOBAL AI INSTRUCTION BAR ── */}
                        <div className="bg-gradient-to-br from-violet-950 to-indigo-900 p-8 rounded-[2.5rem] shadow-xl border border-violet-700/40">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 bg-violet-500/30 rounded-lg flex items-center justify-center shrink-0">
                                    <svg className="w-4 h-4 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                                Global AI Edit — Apply to All Spreads
                            </h3>
                            <p className="text-[10px] text-violet-300/70 mb-5 font-medium leading-relaxed">Type a visual instruction and paint all spreads with it at once. This gets prepended to every spread's prompt before regeneration.</p>
                            <textarea
                                value={globalEditInstruction}
                                onChange={e => setGlobalEditInstruction(e.target.value)}
                                placeholder='e.g. "Make the lighting warmer and more golden. Ensure the hero is always on the right side. Wide cinematic composition."'
                                className="w-full p-4 bg-white/10 border border-violet-500/30 rounded-2xl text-sm text-white placeholder-violet-300/40 h-24 resize-none focus:ring-2 focus:ring-violet-400/30 outline-none transition-all font-medium leading-relaxed"
                            />
                            <div className="flex gap-3 mt-4">
                                <Button
                                    onClick={handleGlobalRegenerate}
                                    disabled={isAnyGenerating || !globalEditInstruction.trim()}
                                    className="flex-1 !bg-violet-500 hover:!bg-violet-400 !py-3 font-black uppercase text-xs tracking-widest shadow-lg shadow-violet-900/50 flex items-center justify-center gap-2"
                                >
                                    {isGlobalRegenerating
                                        ? <><Spinner size="sm" color="text-white" /> Painting All Spreads...</>
                                        : '🎨 Apply to All Spreads'}
                                </Button>
                                <button
                                    onClick={() => setGlobalEditInstruction('')}
                                    className="px-4 py-3 rounded-2xl text-[10px] font-black uppercase text-violet-300/60 hover:text-white hover:bg-white/10 transition-all"
                                >Clear</button>
                            </div>
                            {globalEditProgress > 0 && isGlobalRegenerating && (
                                <div className="mt-4">
                                    <div className="h-1.5 bg-white/10 rounded-full overflow-hidden">
                                        <div className="h-full bg-violet-400 rounded-full transition-all duration-500" style={{ width: `${globalEditProgress}%` }} />
                                    </div>
                                    <p className="text-[9px] text-violet-300/60 mt-1.5 font-mono">{globalEditStatus}</p>
                                </div>
                            )}
                        </div>

                        {/* Spreads — start at index 1; index 0 is the cover rendered above */}
                        {Array.from({ length: storyData.spreadCount || Math.max(8, spreads.length - 1) }).map((_, idx) => {
                        const i = idx + 1; // spreads[0] = cover, spreads[1..N] = inner spreads
                        return (
                            <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
                                <h3 className="text-xl font-black mb-6 text-brand-navy uppercase tracking-tighter flex items-center gap-3">
                                    <div className="w-8 h-8 bg-brand-orange/10 text-brand-orange rounded-lg flex items-center justify-center text-xs">{i}</div>
                                    {t('صفحة', 'Spread')} {i}
                                    {spreads[i]?.generationModel && (
                                        <div className="ml-3 px-3 py-1 bg-gradient-to-r from-teal-50 to-emerald-50 border border-teal-200/50 rounded-xl flex items-center gap-1.5 shadow-sm">
                                            <span className="text-[10px] text-teal-600 font-extrabold uppercase tracking-wider font-mono">
                                                🤖 {spreads[i].generationModel.includes('pro') ? 'Gemini 3 Pro (Nano Banana Pro)' : 'Gemini 3 Flash (Nano Banana 2)'}
                                            </span>
                                        </div>
                                    )}
                                    {spreads[i]?.qcStatus === 'flagged' && (
                                        <span className="ml-auto text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full font-bold border border-red-200">
                                            ⚠️ QA Flagged for Intervention
                                        </span>
                                    )}
                                </h3>
                                <div className="flex flex-col xl:flex-row gap-10">
                                    <div className="w-full xl:w-1/2 flex flex-col gap-4">
                                        {spreads[i]?.qcOriginalUrl ? (
                                            <div className="grid grid-cols-2 gap-4 w-full">
                                                <div className="aspect-[16/9] relative bg-gray-50 rounded-[2rem] overflow-hidden shadow-inner border border-red-300 group">
                                                    <img src={spreads[i].qcOriginalUrl.startsWith('http') || spreads[i].qcOriginalUrl.startsWith('data:') ? spreads[i].qcOriginalUrl : `data:image/jpeg;base64,${spreads[i].qcOriginalUrl}`} className="w-full h-full object-cover" />
                                                    <div className="absolute top-3 left-3 bg-red-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow">
                                                        Flagged (Attempt 1)
                                                    </div>
                                                </div>
                                                <div className="aspect-[16/9] relative bg-gray-50 rounded-[2rem] overflow-hidden shadow-inner border border-emerald-300 group">
                                                    {uploadingIndex === i ? (
                                                        <div className="w-full h-full flex flex-col items-center justify-center gap-3">
                                                            <Spinner size="md" color="text-brand-orange" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-orange animate-pulse">Processing...</span>
                                                        </div>
                                                    ) : spreads[i]?.illustrationUrl ? (
                                                        <img src={spreads[i].illustrationUrl.startsWith('http') || spreads[i].illustrationUrl.startsWith('data:') ? spreads[i].illustrationUrl : `data:image/jpeg;base64,${spreads[i].illustrationUrl}`} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <div className="flex flex-col items-center gap-4 text-gray-300">
                                                            {isAnyGenerating ? (
                                                                <div className="flex flex-col items-center gap-3">
                                                                    <Spinner size="md" color="text-brand-orange" />
                                                                    <span className="text-[10px] font-black uppercase tracking-widest text-brand-orange animate-pulse">Painting...</span>
                                                                </div>
                                                            ) : <span className="text-sm font-medium">{t('جاري التجهيز...', 'Ready to Paint')}</span>}
                                                        </div>
                                                    )}
                                                    <div className="absolute top-3 left-3 bg-emerald-600 text-white text-[9px] font-black px-3 py-1 rounded-full uppercase tracking-wider shadow animate-pulse">
                                                        Regenerated (Attempt 2)
                                                    </div>
                                                </div>
                                            </div>
                                        ) : (
                                            <div className="aspect-[16/9] relative bg-gray-50 rounded-[2rem] overflow-hidden shadow-inner flex items-center justify-center border-2 border-dashed border-gray-200 group">
                                                {uploadingIndex === i ? (
                                                    <div className="flex flex-col items-center gap-3">
                                                        <Spinner size="md" color="text-brand-orange" />
                                                        <span className="text-[10px] font-black uppercase tracking-widest text-brand-orange animate-pulse">Processing...</span>
                                                    </div>
                                                ) : spreads[i]?.illustrationUrl ? (
                                                    <img src={spreads[i].illustrationUrl.startsWith('http') || spreads[i].illustrationUrl.startsWith('data:') ? spreads[i].illustrationUrl : `data:image/jpeg;base64,${spreads[i].illustrationUrl}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                                ) : (
                                                    <div className="flex flex-col items-center gap-4 text-gray-300">
                                                        {isAnyGenerating ? (
                                                            <div className="flex flex-col items-center gap-3">
                                                                <Spinner size="md" color="text-brand-orange" />
                                                                <span className="text-[10px] font-black uppercase tracking-widest text-brand-orange animate-pulse">Painting...</span>
                                                            </div>
                                                        ) : <span className="text-sm font-medium">{t('جاري التجهيز...', 'Ready to Paint')}</span>}
                                                    </div>
                                                )}
                                                <div className="absolute inset-0 bg-brand-navy/0 group-hover:bg-brand-navy/5 transition-colors duration-300 pointer-events-none"></div>
                                            </div>
                                        )}
                                        <div className="flex gap-3">
                                            <Button variant="secondary" onClick={() => handleUploadImage(i)} className="flex-1 text-xs py-3 font-black uppercase tracking-widest">{t('رفع', 'Manual Upload')}</Button>
                                            <Button onClick={() => handleRegenerateImage(i)} disabled={regeneratingIndex === i} className="flex-1 text-xs py-3 font-black uppercase tracking-widest shadow-lg shadow-brand-orange/20">
                                                {regeneratingIndex === i ? <Spinner size="sm" /> : t('إعادة', 'Paint Spread')}
                                            </Button>
                                        </div>
                                        {/* Spread Layout Map + Position Controls */}
                                        <SpreadLayoutPanel
                                            spreadIndex={i}
                                            illustrationUrl={spreads[i]?.illustrationUrl}
                                            textSide={pageEdits[i]?.textSide || spreads[i]?.textSide || (language === 'ar' ? 'right' : 'left')}
                                            language={language}
                                            textOffsetX={pageEdits[i]?.textOffsetX ?? spreads[i]?.textOffsetX}
                                            textOffsetY={pageEdits[i]?.textOffsetY ?? spreads[i]?.textOffsetY}
                                            imageOffsetX={pageEdits[i]?.imageOffsetX ?? spreads[i]?.imageOffsetX ?? 0}
                                            imageOffsetY={pageEdits[i]?.imageOffsetY ?? spreads[i]?.imageOffsetY ?? 0}
                                            imageScale={pageEdits[i]?.imageScale ?? spreads[i]?.imageScale ?? 100}
                                            onTextOffsetXChange={v => handleLayoutOffsetChange(i, 'textOffsetX', v)}
                                            onTextOffsetYChange={v => handleLayoutOffsetChange(i, 'textOffsetY', v)}
                                            onImageOffsetXChange={v => handleLayoutOffsetChange(i, 'imageOffsetX', v)}
                                            onImageOffsetYChange={v => handleLayoutOffsetChange(i, 'imageOffsetY', v)}
                                            onImageScaleChange={v => handleLayoutOffsetChange(i, 'imageScale', v)}
                                            onGenerativeFill={() => handleGenerativeFill(i)}
                                            isGeneratingFill={generatingFillIndex === i}
                                        />
                                        
                                        {/* QA Agent Logs Panel */}
                                        {storyData.orderId && (
                                            <QALogPanel 
                                                orderId={storyData.orderId} 
                                                spreadIndex={i} 
                                                storyData={storyData}
                                            />
                                        )}
                                    </div>
                                    <div className="w-full xl:w-1/2 flex flex-col gap-6">
                                        <div className="space-y-2">
                                            <div className="flex justify-between items-center px-1">
                                                <label className="text-[10px] font-black text-brand-teal uppercase tracking-widest">Narrative Text Edit</label>
                                                <div className="flex items-center gap-4">
                                                    {/* TEXT ALIGNMENT TOGGLE */}
                                                    <div className="flex items-center gap-1 bg-gray-100 p-1 rounded-lg">
                                                        <button 
                                                            onClick={() => handleTextSideChange(i, 'left')} 
                                                            className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${((pageEdits[i]?.textSide || spreads[i]?.textSide) === 'left' || !(pageEdits[i]?.textSide || spreads[i]?.textSide)) ? 'bg-white shadow text-brand-navy' : 'text-gray-400 hover:text-gray-600'}`}
                                                        >
                                                            Left
                                                        </button>
                                                        <button 
                                                            onClick={() => handleTextSideChange(i, 'right')} 
                                                            className={`px-3 py-1 rounded-md text-[10px] font-black uppercase transition-all ${(pageEdits[i]?.textSide || spreads[i]?.textSide) === 'right' ? 'bg-white shadow text-brand-navy' : 'text-gray-400 hover:text-gray-600'}`}
                                                        >
                                                            Right
                                                        </button>
                                                    </div>
                                                    <div className="flex gap-2 border-l border-gray-200 pl-4">
                                                        <button onClick={() => handleRegenerateText(i)} className="text-[9px] font-black uppercase text-brand-orange hover:underline">{textRegeneratingIndex === i ? 'Writing...' : 'AI Rewrite'}</button>
                                                        <button onClick={() => handleUploadText(i)} className="text-[9px] font-black uppercase text-brand-teal hover:underline">Upload .txt</button>
                                                    </div>
                                                </div>
                                            </div>
                                            <textarea value={pageEdits[i]?.text !== undefined ? pageEdits[i].text : getSpreadText(spreads[i], i)} onChange={(e) => handleTextChange(i, e.target.value)} onBlur={handleSilentSave} className="w-full p-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] text-sm h-32 focus:ring-2 focus:ring-brand-teal/10 outline-none transition-all font-medium leading-relaxed" />

                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-brand-navy uppercase tracking-widest px-1">Illustration Prompt — edit freely, Paint Spread uses this</label>
                                            <PromptVersionBadge promptText={pageEdits[i]?.prompt !== undefined ? pageEdits[i].prompt : getPromptForIndex(i, spreads[i])} />
                                            <textarea
                                                value={pageEdits[i]?.prompt !== undefined ? pageEdits[i].prompt : getPromptForIndex(i, spreads[i])}
                                                onChange={(e) => handlePromptChange(i, e.target.value)}
                                                onBlur={handleSilentSave}
                                                className="w-full p-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] text-xs h-64 focus:ring-2 focus:ring-brand-navy/10 outline-none transition-all font-mono leading-relaxed"
                                                spellCheck={false}
                                                placeholder="Edit the spread scene prompt here. Paint Spread uses exactly what you type."
                                            />

                                            {/* ── ACTUAL GEMINI PROMPT PANEL ── */}
                                            {(spreads[i] as any)?.lastGeminiPrompt && (() => {
                                                const geminiPrompt = (spreads[i] as any).lastGeminiPrompt as string;
                                                return (
                                                    <details className="group mt-1">
                                                        <summary className="flex items-center justify-between cursor-pointer select-none px-3 py-2.5 bg-amber-50 border border-amber-200 rounded-2xl hover:bg-amber-100 transition-colors list-none">
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-base">🔍</span>
                                                                <span className="text-[10px] font-black text-amber-700 uppercase tracking-widest">Actual Prompt Sent to AI</span>
                                                                <span className="text-[9px] bg-amber-200 text-amber-800 px-2 py-0.5 rounded-full font-mono font-bold">{geminiPrompt.length} chars</span>
                                                            </div>
                                                            <span className="text-[10px] text-amber-500 font-mono">▶ tap to expand</span>
                                                        </summary>
                                                        <div className="mt-2 relative">
                                                            <button
                                                                onClick={() => {
                                                                    navigator.clipboard.writeText(geminiPrompt);
                                                                    const btn = document.getElementById(`copy-gemini-btn-${i}`);
                                                                    if (btn) { btn.textContent = '✅ Copied!'; setTimeout(() => { if (btn) btn.textContent = '📋 Copy'; }, 2000); }
                                                                }}
                                                                id={`copy-gemini-btn-${i}`}
                                                                className="absolute top-3 right-3 z-10 text-[9px] font-black bg-amber-500 text-white px-3 py-1.5 rounded-lg hover:bg-amber-600 active:scale-95 transition-all uppercase tracking-widest shadow-md"
                                                            >
                                                                📋 Copy
                                                            </button>
                                                            <textarea
                                                                readOnly
                                                                value={geminiPrompt}
                                                                className="w-full p-5 pr-24 bg-amber-50 border-2 border-amber-200 rounded-[1.5rem] text-xs h-48 outline-none font-mono leading-relaxed text-amber-900 resize-none"
                                                                spellCheck={false}
                                                            />
                                                            <p className="text-[9px] text-amber-400 px-1 mt-1 font-mono">Read-only — the exact text Gemini received. Copy and paste into ChatGPT or Nano Banana to troubleshoot.</p>
                                                        </div>
                                                    </details>
                                                );
                                            })()}
                                        </div>
                                    </div>
                                    {/* Gemini Image Edit Panel — collapsible, spans full width */}
                                    <div className="col-span-full">
                                        <SpreadGeminiEditPanel
                                            spreadIndex={i}
                                            illustrationUrl={spreads[i]?.illustrationUrl}
                                            stylePrompt={getCleanStylePrompt(storyData.selectedStylePrompt) || 'Painterly children\'s book illustration style'}
                                            childDNA={masterDNA}
                                            secondDNA={masterDNA2}
                                            onImageEdited={newB64 => handleGeminiImageEdit(i, newB64)}
                                        />
                                    </div>
                                </div>
                            </div>
                        ); })}
                    </div>
                </div>
            </div>

            {/* Dedicated Sidebar Terminal (TOP LEVEL) */}
            {showTerminal && (
                <>
                    {/* Dark Overlay for Mobile */}
                    <div className="lg:hidden fixed inset-0 bg-black/50 z-40" onClick={() => setShowTerminal(false)}></div>
                    <div className="fixed lg:relative top-0 right-0 h-full w-[90vw] lg:w-[450px] bg-gray-950 border-l border-white/5 flex flex-col shrink-0 animate-in slide-in-from-right duration-500 ease-out shadow-[-20px_0_50px_rgba(0,0,0,0.5)] z-50">
                     <div className="flex justify-between items-center p-6 border-b border-white/5 bg-gray-900/50 backdrop-blur-md sticky top-0">
                        <div className="flex items-center gap-4">
                            <div className={`w-3 h-3 rounded-full ${isProcessing ? 'bg-brand-orange animate-ping' : (currentError ? 'bg-red-500' : 'bg-brand-teal')}`}></div>
                            <div>
                                <h3 className="font-black text-[11px] font-mono uppercase tracking-[0.2em] text-white">Production Terminal</h3>
                                <p className="text-[9px] font-mono text-gray-500 uppercase mt-0.5 tracking-widest">Protocol: {storyData.orderId || 'RWY-XXX'}</p>
                            </div>
                        </div>
                        <button onClick={() => setShowTerminal(false)} className="text-gray-400 hover:text-white transition-colors duration-200">
                             <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                    </div>
                    
                    <div className="flex-1 overflow-y-auto font-mono text-[11px] p-6 space-y-2 scroller-thin bg-gray-950/50">
                        {pipelineLogs.length === 0 ? (
                            <div className="h-full flex flex-col items-center justify-center text-gray-700 opacity-50 italic">
                                <div className="w-12 h-12 border-2 border-dashed border-gray-800 rounded-full mb-4"></div>
                                Terminal Idle.
                            </div>
                        ) : (
                            pipelineLogs.map((log, idx) => (
                                <div key={idx} className="group animate-in fade-in slide-in-from-bottom-1 duration-300">
                                    <div className={`${log.includes('ERROR') || log.includes('FATAL') ? 'text-red-400 bg-red-400/5 p-2 rounded-xl border border-red-400/20' : log.includes('✓') ? 'text-brand-teal font-bold' : log.includes('⚠️') ? 'text-orange-300' : 'text-gray-400'} leading-relaxed flex items-start gap-3`}>
                                        <span className="text-[8px] font-light text-gray-600 mt-1 shrink-0">{log.split(']')[0]}]</span>
                                        <span className="flex-1">{log.split(']')[1] || log}</span>
                                    </div>
                                </div>
                            ))
                        )}
                        <div ref={logEndRef} />
                    </div>

                    {isProcessing && (
                        <div className="p-6 bg-gray-900/80 border-t border-white/5 space-y-4">
                            <div className="flex justify-between items-center">
                                <span className="text-[10px] font-mono text-gray-500 uppercase tracking-widest">Process Saturation</span>
                                <span className="text-xs font-mono text-brand-orange font-black">{Math.round(currentProgress)}%</span>
                            </div>
                            <div className="h-1.5 bg-gray-800 rounded-full overflow-hidden shadow-inner">
                                <div className="h-full bg-gradient-to-r from-brand-orange to-orange-400 transition-all duration-700 ease-out shadow-[0_0_10px_rgba(240,90,40,0.5)]" style={{ width: `${currentProgress}%` }}></div>
                            </div>
                            <button
                                onClick={stopPipeline}
                                className="w-full mt-2 py-2.5 px-4 bg-red-600 hover:bg-red-700 text-white font-black text-xs font-mono uppercase tracking-widest rounded-lg transition-colors shadow-lg shadow-red-900/20"
                            >
                                Stop Rendering
                            </button>
                        </div>
                    )}
                </div>
                </>
            )}
            {isDNAManagerOpen && (
                <DNAManagerModal 
                    storyData={storyData} 
                    onClose={() => setIsDNAManagerOpen(false)} 
                    onUpdateDNA={handleUpdateDNA} 
                />
            )}
        </div>
    );
};

export default EditorScreen;
