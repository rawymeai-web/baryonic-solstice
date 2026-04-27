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
    total?: number;
}

const LANGUAGE_MAP: Record<string, string> = {
    'en': 'English',
    'ar': 'Ø§Ù„Ø¹Ø±Ø¨ÙŠØ© (Arabic)',
    'de': 'Deutsch (German)',
    'es': 'EspaÃ±ol (Spanish)',
    'fr': 'FranÃ§ais (French)',
    'pt': 'PortuguÃªs (Portuguese)',
    'it': 'Italiano (Italian)',
    'ru': 'Ð ÑƒÑÑÐºÐ¸Ð¹ (Russian)',
    'ja': 'æ—¥æœ¬èªž (Japanese)',
    'tr': 'TÃ¼rkÃ§e (Turkish)'
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
    total
}) => {
    // Pipeline Hook
    const {
        runPipeline,
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
    const coverPrompt = storyData.actualCoverPrompt || storyData.finalPrompts?.[0] || '';
    const masterDNA = storyData.styleReferenceImageUrl || storyData.styleReferenceImageBase64 || storyData.mainCharacter?.imageDNA?.[0] || (storyData.mainCharacter?.imageBases64 && storyData.mainCharacter.imageBases64[0]);
    const masterDNA2 = storyData.secondCharacter?.imageDNA?.[0] || storyData.secondCharacterImageBase64 || storyData.secondCharacter?.imageBases64?.[0];
    // Raw original photos â€” identity source (separate from styled DNA)
    const masterRaw = storyData.mainCharacter?.imageRawUrl || (storyData.mainCharacter?.imageBases64?.[0] && storyData.mainCharacter.imageBases64[0]);
    const masterRaw2 = storyData.secondCharacter?.imageRawUrl || storyData.secondCharacter?.imageBases64?.[0];

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

    // Smart auto-computed subtitle â€” single hero vs double hero
    const isAr = language === 'ar';
    const hasSecondHero = !!(storyData.useSecondCharacter && storyData.secondCharacter?.name);
    const computedSubtitle = hasSecondHero
        ? `${storyData.childName} ${isAr ? 'Ùˆ' : '&'} ${storyData.secondCharacter!.name}`
        : isAr
            ? `Ù‚ØµØ© ${storyData.childName}`
            : `A Story for ${storyData.childName}`;
    // Active subtitle: override if enabled, else auto
    const localSubtitle = useSubtitleOverride ? localSubtitleOverride : computedSubtitle;

    // Helper to safely extract prompt
    const getPromptForIndex = (pageIndex: number, pageData: any) => {
        if (pageData?.actualPrompt) return pageData.actualPrompt;
        const spreadIndex = Math.floor(pageIndex / 2);
        const fp = storyData.finalPrompts as any;
        if (!fp) return '';
        if (Array.isArray(fp) && fp.length > 0 && typeof fp[0] === 'object') {
            return fp[spreadIndex]?.imagePrompt || '';
        }
        if (Array.isArray(fp)) {
           return fp[pageIndex + 1] || ''; 
        }
        return '';
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

    useEffect(() => {
        if (!coverEdit && coverPrompt) {
            setCoverEdit(coverPrompt);
        }
    }, [coverPrompt]);

    // Bug 3: Helper to get the display text of a spread (combines leftText + rightText)
    const getSpreadText = (spread: any): string => {
        if (!spread) return '';
        // Support new Spread model (leftText/rightText) and legacy fallback
        if (spread.leftText || spread.rightText) {
            return [spread.leftText, spread.rightText].filter(Boolean).join(' ');
        }
        return spread.text || '';
    };

    const handleTextChange = (index: number, newText: string) => {
        setPageEdits(prev => ({
            ...prev,
            [index]: { ...(prev[index] || { text: getSpreadText(spreads[index]), prompt: getPromptForIndex(index, spreads[index]), textSide: spreads[index]?.textSide }), text: newText }
        }));
    };

    const handlePromptChange = (index: number, newPrompt: string) => {
        setPageEdits(prev => ({
            ...prev,
            [index]: { ...(prev[index] || { text: getSpreadText(spreads[index]), prompt: getPromptForIndex(index, spreads[index]), textSide: spreads[index]?.textSide }), prompt: newPrompt }
        }));
    };

    const handleTextSideChange = (index: number, newSide: 'left' | 'right') => {
        setPageEdits(prev => ({
            ...prev,
            [index]: { ...(prev[index] || { text: getSpreadText(spreads[index]), prompt: getPromptForIndex(index, spreads[index]) }), textSide: newSide }
        }));
        // We trigger an immediate save for UX snappiness (debounced)
        debouncedSave(100);
    };

    const handleLayoutOffsetChange = (index: number, field: 'textOffsetX' | 'textOffsetY' | 'imageOffsetX' | 'imageOffsetY' | 'imageScale', value: number) => {
        setPageEdits(prev => ({
            ...prev,
            [index]: { ...(prev[index] || { text: getSpreadText(spreads[index]), prompt: getPromptForIndex(index, spreads[index]) }), [field]: value }
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
            const masterDNA = storyData.styleReferenceImageUrl || storyData.styleReferenceImageBase64 || storyData.mainCharacter?.imageDNA?.[0] || (storyData.mainCharacter?.imageBases64 && storyData.mainCharacter.imageBases64[0]);
        // Bug 5: never embed themeVisualDNA â€” use only the art style
            let visualDNA = storyData.selectedStylePrompt || 'Painterly, flat 2D illustrated children\'s book style';

            let promptToUse = '';
            if (index === 'cover') {
                promptToUse = coverEdit;
            } else {
                promptToUse = pageEdits[index]?.prompt || getPromptForIndex(index, spreads[index]);
            }

            // COMPRESS payloads to prevent Vercel 4.5MB Serverless Payload limit errors!
            const compressedMaster = await compressBase64Image(masterDNA, 1024, 0.85);
            let compressedSecond = undefined;
            if (storyData.useSecondCharacter && storyData.secondCharacterImageBase64 && storyData.secondCharacter?.type !== 'object') {
                compressedSecond = await compressBase64Image(storyData.secondCharacterImageBase64, 1024, 0.85);
            }

            const imgRes: any = await backendApi.generateImage({
                prompt: promptToUse,
                stylePrompt: visualDNA,
                referenceBase64: compressedMaster,
                characterDescription: storyData.mainCharacter?.description || "",
                age: storyData.childAge,
                secondReferenceBase64: compressedSecond
            });

            if (index === 'cover') {
                const newStory = {
                    ...storyData,
                    coverImageUrl: imgRes.imageBase64,
                    actualCoverPrompt: imgRes.fullPrompt || promptToUse
                };
                onUpdateStory({
                    coverImageUrl: imgRes.imageBase64,
                    actualCoverPrompt: imgRes.fullPrompt || promptToUse
                });
                await adminService.saveOrder(storyData.orderId || 'RWY-UNKNOWN', newStory, shippingDetails || {});
            } else {
                const newSpreads = [...spreads];
                newSpreads[index] = {
                    ...newSpreads[index],
                    illustrationUrl: imgRes.imageBase64,
                    actualPrompt: imgRes.fullPrompt || promptToUse
                };
                const newStory = { ...storyData, spreads: newSpreads };
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
            const reader = new FileReader();
            reader.onload = async (event) => {
                const base64 = (event.target?.result as string).split(',')[1];
                let newStoryData = { ...storyData };
                
                if (index === 'cover') {
                    newStoryData = { ...storyData, coverImageUrl: base64 };
                    onUpdateStory({ coverImageUrl: base64 });
                } else {
                    const newSpreads = [...spreads];
                    newSpreads[index] = {
                        ...newSpreads[index],
                        illustrationUrl: base64
                    };
                    newStoryData = { ...storyData, spreads: newSpreads };
                    onUpdateStory({ spreads: newSpreads });
                }
                
                // Immediately save the upload to the database!
                if (storyData.orderId) {
                    try {
                        await adminService.saveOrder(storyData.orderId, newStoryData, shippingDetails || {});
                    } catch (err) {
                        console.error('Failed to save uploaded image to DB', err);
                    }
                }
            };
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

    // â”€â”€ Global AI Edit state â”€â”€
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
            const mainDNARef = storyData.styleReferenceImageUrl || storyData.styleReferenceImageBase64 || storyData.mainCharacter?.imageDNA?.[0] || storyData.mainCharacter?.imageBases64?.[0];
            const visualDNA = storyData.selectedStylePrompt || 'Painterly children\'s book illustration style';
            let compressedSecond = undefined;
            if (storyData.useSecondCharacter && storyData.secondCharacterImageBase64 && storyData.secondCharacter?.type !== 'object') {
                compressedSecond = await compressBase64Image(storyData.secondCharacterImageBase64, 1024, 0.85);
            }
            const compressedMaster = await compressBase64Image(mainDNARef, 1024, 0.85);
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
                        newSpreads[i] = { ...newSpreads[i], illustrationUrl: imgRes.imageBase64 };
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
                                finalSpreads[i] = { ...finalSpreads[i], leftText: editedText, rightText: '' };
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

            await onFinalize(finalStoryData);
        } catch (error) {
            console.error("Finalize error:", error);
            alert("Error finalizing order: " + (error as any).message);
        } finally {
            setIsFinalizing(false);
        }
    };

    const handleSilentSave = async () => {
        if (!storyData.orderId) return;
        const finalSpreads = [...spreads];
        for (let i = 0; i < finalSpreads.length; i++) {
            const editedText = pageEdits[i]?.text;
            const currentText = getSpreadText(finalSpreads[i]);
            if (editedText !== undefined && editedText !== currentText) {
                finalSpreads[i] = { ...finalSpreads[i], leftText: editedText, rightText: '' };
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
        try {
            await adminService.saveOrder(storyData.orderId as string, { ...storyData, spreads: finalSpreads, actualCoverPrompt: coverEdit, title: localTitle, coverSubtitle: localSubtitle, coverTextSide: localCoverTextSide }, shippingDetails || {});
        } catch(e) {
            console.error("Silent save failed", e);
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
                                {t('Ø§Ù„ØµÙˆØ±Ø© Ø§Ù„Ù…Ø±Ø¬Ø¹ÙŠØ© Ù„Ù„Ø¹Ù…ÙŠÙ„', 'Customer Locked DNA')}
                            </h4>
                            <Button variant="secondary" className="text-[10px] py-1 px-2 h-auto" onClick={() => setIsDNAManagerOpen(true)}>Manage DNA</Button>
                        </div>

                        {/* Hero A â€” Raw Photo + DNA side by side */}
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
                                                title="Original raw photo â€” identity source"
                                            />
                                            <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest text-center">ðŸ“· Original Photo</span>
                                        </div>
                                    )}
                                    {masterDNA && (
                                        <div className="flex-1 flex flex-col gap-1">
                                            <img
                                                src={masterDNA.startsWith('http') ? masterDNA : `data:image/jpeg;base64,${masterDNA}`}
                                                alt="DNA Style Anchor"
                                                className="w-full rounded-xl shadow-sm border-2 border-orange-200 object-cover aspect-square"
                                                title="DNA watercolor â€” art style source"
                                            />
                                            <span className="text-[8px] font-black text-brand-orange uppercase tracking-widest text-center">ðŸŽ¨ DNA Style</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}

                        {/* Hero B â€” Raw Photo + DNA side by side */}
                        {(masterRaw2 || masterDNA2) && (
                            <div>
                                <p className="text-[9px] font-black text-gray-400 uppercase tracking-widest mb-1.5">Hero B</p>
                                <div className="flex gap-2 w-full">
                                    {masterRaw2 && (
                                        <div className="flex-1 flex flex-col gap-1">
                                            <img
                                                src={masterRaw2.startsWith('http') ? masterRaw2 : `data:image/jpeg;base64,${masterRaw2}`}
                                                alt="Raw Original Photo B"
                                                className="w-full rounded-xl shadow-sm border-2 border-blue-200 object-cover aspect-square"
                                                title="Original raw photo â€” identity source"
                                            />
                                            <span className="text-[8px] font-black text-blue-500 uppercase tracking-widest text-center">ðŸ“· Original Photo</span>
                                        </div>
                                    )}
                                    {masterDNA2 && (
                                        <div className="flex-1 flex flex-col gap-1">
                                            <img
                                                src={masterDNA2.startsWith('http') ? masterDNA2 : `data:image/jpeg;base64,${masterDNA2}`}
                                                alt="DNA Style Anchor B"
                                                className="w-full rounded-xl shadow-sm border-2 border-orange-200 object-cover aspect-square"
                                                title="DNA watercolor â€” art style source"
                                            />
                                            <span className="text-[8px] font-black text-brand-orange uppercase tracking-widest text-center">ðŸŽ¨ DNA Style</span>
                                        </div>
                                    )}
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* 3. STORY BLUEPRINT BLOCK */}
                <div className="flex justify-between items-center mb-4 mt-2">
                    <h2 className="text-xl font-bold text-brand-navy uppercase tracking-tighter">{t('Ù…Ø®Ø·Ø· Ø§Ù„Ù‚ØµØ©', 'Story Blueprint')}</h2>
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
                    <p className="text-gray-400 italic">{t('Ø¬Ø§Ø±ÙŠ Ø§Ù„Ù…Ø¹Ø§Ù„Ø¬Ø©...', 'Architecting story...')}</p>
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
                        <h2 className="text-2xl font-black text-brand-navy shrink-0 uppercase tracking-tighter">{t('Ù…Ø­Ø±Ø± Ø§Ù„ØµÙØ­Ø§Øª', 'Spread Editor')}</h2>
                        {(isAnyGenerating || currentError || isBackendProcessing) && (
                            <div className="p-2.5 px-5 rounded-2xl flex items-center gap-4 border bg-orange-50/80 border-orange-200/50 shadow-sm animate-in fade-in zoom-in duration-300">
                                <Spinner size="sm" color="text-brand-orange" />
                                <span className="text-xs font-black text-brand-navy uppercase tracking-widest">
                                    {isBackendProcessing ? backendStatusText : (currentError ? `Error: ${currentError}` : (currentStatus || t('Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªÙˆÙ„ÙŠØ¯...', 'Generating...')))}
                                </span>
                            </div>
                        )}
                    </div>
                    <div className="flex gap-2 lg:gap-3 flex-nowrap lg:flex-wrap overflow-x-auto pb-2 px-1 w-full lg:w-auto scroller-thin shrink-0 snap-x">
                        <Button onClick={() => setShowTerminal(!showTerminal)} variant="outline" className={`shrink-0 snap-start !py-2 !px-4 lg:!py-2.5 lg:!px-6 border-2 transition-all ${showTerminal ? 'bg-brand-navy text-white border-brand-navy' : 'border-gray-200 text-gray-500 hover:border-brand-navy hover:text-brand-navy'}`}>
                            {showTerminal ? t('Ø¥Ø®ÙØ§Ø¡ Ø§Ù„Ø³Ø¬Ù„', 'Hide Logs') : t('Ø¹Ø±Ø¶ Ø§Ù„Ø³Ø¬Ù„', 'Show Logs')}
                        </Button>
                        <Button onClick={handleMassUploadText} variant="outline" className="shrink-0 snap-start !py-2 !px-3 lg:!py-2.5 lg:!px-4 border-2 border-gray-200 text-gray-500 hover:border-brand-teal hover:text-brand-teal text-[10px] lg:text-xs">
                            Upload Script
                        </Button>
                        <Button onClick={handleDownloadText} variant="outline" className="shrink-0 snap-start !py-2 !px-3 lg:!py-2.5 lg:!px-4 border-2 border-gray-200 text-gray-500 hover:border-brand-navy hover:text-brand-navy text-[10px] lg:text-xs">
                            Export Script
                        </Button>
                        <div className="flex gap-2 lg:gap-4 shrink-0 snap-start">
                            <Button onClick={() => runPipeline(false)} disabled={isAnyGenerating} variant="secondary" className="!py-2 !px-3 lg:!py-2.5 lg:!px-4 border-2 border-pink-500 text-pink-500 hover:bg-pink-500 hover:text-white transition-all font-black uppercase text-[9px] lg:text-[10px]">
                                {t('Ø¥Ø¹Ø§Ø¯Ø© Ø§Ù„Ù…Ø¹Ø§Ù„Ø¬Ø©', 'Restart Pipeline')}
                            </Button>
                            <Button onClick={() => runPipeline(true)} disabled={isAnyGenerating} variant="secondary" className="!py-2 !px-3 lg:!py-2.5 lg:!px-4 border-2 border-brand-teal text-brand-teal hover:bg-brand-teal hover:text-white transition-all shadow-lg font-black uppercase text-[9px] lg:text-[10px]">
                                {t('Ø¥Ø³ØªÙƒÙ…Ø§Ù„ Ø§Ù„Ù…Ø¹Ø§Ù„Ø¬Ø©', 'Continue Pipeline')}
                            </Button>
                            <Button onClick={handleSilentSave} disabled={isAnyGenerating || isFinalizing} variant="secondary" className="!py-2 !px-4 lg:!py-2.5 lg:!px-6 border-2 border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white transition-all font-black uppercase text-[9px] lg:text-[10px] flex items-center justify-center gap-2">
                                ðŸ’¾ {t('Ø­ÙØ¸', 'Save to DB')}
                            </Button>
                            <Button onClick={applyAllEditsAndFinalize} disabled={isAnyGenerating || isFinalizing} className="!py-2 !px-4 lg:!py-2.5 lg:!px-6 shadow-xl shadow-brand-orange/30 font-black uppercase text-[9px] lg:text-[10px] flex items-center justify-center gap-2">
                                {isFinalizing ? <><Spinner size="sm" color="text-white" /> {t('Ø¬Ø§Ø±ÙŠ Ø§Ù„Ø¥Ù†Ù‡Ø§Ø¡...', 'Finalizing...')}</> : t('Ø¥Ù†Ù‡Ø§Ø¡ ÙˆØ­ÙØ¸', 'Finalize')}
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
                                {t('Ø§Ù„ØºÙ„Ø§Ù', 'Cover Design')}
                                {storyData.coverQcStatus === 'flagged' && (
                                    <span className="ml-auto text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full font-bold border border-red-200">
                                        âš ï¸ QA Flagged for Intervention
                                    </span>
                                )}
                            </h3>
                            <div className="flex flex-col xl:flex-row gap-10">
                                <div className="w-full xl:w-1/2 flex flex-col gap-4">
                                    <div className="aspect-[16/9] relative bg-gray-50 rounded-[2rem] overflow-hidden shadow-inner flex items-center justify-center border-2 border-dashed border-gray-200 group">
                                        {coverUrl ? <img src={coverUrl.startsWith('http') ? coverUrl : `data:image/jpeg;base64,${coverUrl}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" /> : <Spinner size="md" color="text-brand-orange" />}
                                        <div className="absolute inset-0 bg-brand-navy/0 group-hover:bg-brand-navy/5 transition-colors duration-300 pointer-events-none"></div>
                                    </div>
                                    <div className="flex gap-2">
                                        <Button variant="secondary" onClick={() => handleUploadImage('cover')} className="flex-[2] text-xs py-3 font-black uppercase tracking-widest px-2">{t('Ø±ÙØ¹ ØµÙˆØ±Ø©', 'Upload Art')}</Button>
                                        <Button variant="outline" onClick={handleFlipCover} disabled={regeneratingIndex === 'cover' || !coverUrl} className="flex-1 text-xs py-3 font-black uppercase tracking-widest px-1 text-gray-500 border-gray-200">
                                            {regeneratingIndex === 'cover' ? <Spinner size="sm" /> : t('Ù‚Ù„Ø¨ â†”', 'Flip â†”')}
                                        </Button>
                                        <Button onClick={() => handleRegenerateImage('cover')} disabled={regeneratingIndex === 'cover'} className="flex-[2] text-xs py-3 font-black uppercase tracking-widest shadow-lg shadow-brand-orange/20 px-2">
                                            {regeneratingIndex === 'cover' ? <Spinner size="sm" /> : t('Ø¥Ø¹Ø§Ø¯Ø© ØªÙˆÙ„ÙŠØ¯', 'Paint Art')}
                                        </Button>
                                    </div>
                                    
                                    {/* QA Agent Logs Panel for Cover */}
                                    {storyData.orderId && (
                                        <QALogPanel 
                                            orderId={storyData.orderId} 
                                            spreadIndex={0} 
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
                                                 {storyData.useSecondCharacter ? 'ðŸ‘¥ Hero Names' : 'ðŸŒŸ Hero Name'}
                                             </label>
                                             <button
                                                 onClick={() => { setUseSubtitleOverride(v => !v); debouncedSave(100); }}
                                                 className={`text-[8px] font-black uppercase px-2 py-1 rounded-lg transition-all ${
                                                     useSubtitleOverride
                                                         ? 'bg-brand-orange text-white'
                                                         : 'bg-gray-100 text-gray-400 hover:bg-gray-200'
                                                 }`}
                                             >
                                                 {useSubtitleOverride ? 'âœï¸ Custom' : 'âœ¨ Auto'}
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
                                                 <span className="text-base">{storyData.useSecondCharacter ? 'ðŸ‘¥' : 'â­'}</span>
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

                                     <label className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-1 mt-2">Cover Art AI Prompt (JSON)</label>
                                     <textarea value={cleanupPromptText(coverEdit)} onChange={(e) => setCoverEdit(e.target.value)} onBlur={handleSilentSave} className="w-full p-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] text-xs flex-1 min-h-[200px] resize-none focus:ring-2 focus:ring-brand-orange/10 outline-none transition-all font-mono leading-relaxed" spellCheck={false} />
                                </div>
                            </div>
                            {/* Cover Gemini AI Edit Panel */}
                            <div className="mt-6">
                                <SpreadGeminiEditPanel
                                    spreadIndex={0}
                                    illustrationUrl={coverUrl}
                                    stylePrompt={storyData.selectedStylePrompt || 'Painterly children\'s book illustration style'}
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

                        {/* â”€â”€ GLOBAL AI INSTRUCTION BAR â”€â”€ */}
                        <div className="bg-gradient-to-br from-violet-950 to-indigo-900 p-8 rounded-[2.5rem] shadow-xl border border-violet-700/40">
                            <h3 className="text-sm font-black text-white uppercase tracking-widest flex items-center gap-3 mb-2">
                                <div className="w-8 h-8 bg-violet-500/30 rounded-lg flex items-center justify-center shrink-0">
                                    <svg className="w-4 h-4 text-violet-300" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                                </div>
                                Global AI Edit â€” Apply to All Spreads
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
                                        : 'ðŸŽ¨ Apply to All Spreads'}
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

                        {/* Spreads â€” start at index 1; index 0 is the cover rendered above */}
                        {Array.from({ length: storyData.spreadCount || Math.max(8, spreads.length - 1) }).map((_, idx) => {
                        const i = idx + 1; // spreads[0] = cover, spreads[1..N] = inner spreads
                        return (
                            <div key={i} className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-gray-100 hover:shadow-md transition-shadow duration-300">
                                <h3 className="text-xl font-black mb-6 text-brand-navy uppercase tracking-tighter flex items-center gap-3">
                                    <div className="w-8 h-8 bg-brand-orange/10 text-brand-orange rounded-lg flex items-center justify-center text-xs">{i}</div>
                                    {t('ØµÙØ­Ø©', 'Spread')} {i}
                                    {spreads[i]?.qcStatus === 'flagged' && (
                                        <span className="ml-auto text-xs bg-red-100 text-red-600 px-3 py-1 rounded-full font-bold border border-red-200">
                                            âš ï¸ QA Flagged for Intervention
                                        </span>
                                    )}
                                </h3>
                                <div className="flex flex-col xl:flex-row gap-10">
                                    <div className="w-full xl:w-1/2 flex flex-col gap-4">
                                        <div className="aspect-[16/9] relative bg-gray-50 rounded-[2rem] overflow-hidden shadow-inner flex items-center justify-center border-2 border-dashed border-gray-200 group">
                                            {spreads[i]?.illustrationUrl ? (
                                                <img src={spreads[i].illustrationUrl.startsWith('http') ? spreads[i].illustrationUrl : `data:image/jpeg;base64,${spreads[i].illustrationUrl}`} className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-105" />
                                            ) : (
                                                <div className="flex flex-col items-center gap-4 text-gray-300">
                                                    {isAnyGenerating ? (
                                                        <div className="flex flex-col items-center gap-3">
                                                            <Spinner size="md" color="text-brand-orange" />
                                                            <span className="text-[10px] font-black uppercase tracking-widest text-brand-orange animate-pulse">Painting...</span>
                                                        </div>
                                                    ) : <span className="text-sm font-medium">{t('Ø¬Ø§Ø±ÙŠ Ø§Ù„ØªØ¬Ù‡ÙŠØ²...', 'Ready to Paint')}</span>}
                                                </div>
                                            )}
                                        </div>
                                        <div className="flex gap-3">
                                            <Button variant="secondary" onClick={() => handleUploadImage(i)} className="flex-1 text-xs py-3 font-black uppercase tracking-widest">{t('Ø±ÙØ¹', 'Manual Upload')}</Button>
                                            <Button onClick={() => handleRegenerateImage(i)} disabled={regeneratingIndex === i} className="flex-1 text-xs py-3 font-black uppercase tracking-widest shadow-lg shadow-brand-orange/20">
                                                {regeneratingIndex === i ? <Spinner size="sm" /> : t('Ø¥Ø¹Ø§Ø¯Ø©', 'Paint Spread')}
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
                                        />
                                        
                                        {/* QA Agent Logs Panel */}
                                        {storyData.orderId && (
                                            <QALogPanel 
                                                orderId={storyData.orderId} 
                                                spreadIndex={i} 
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
                                            <textarea value={pageEdits[i]?.text !== undefined ? pageEdits[i].text : getSpreadText(spreads[i])} onChange={(e) => handleTextChange(i, e.target.value)} onBlur={handleSilentSave} className="w-full p-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] text-sm h-32 focus:ring-2 focus:ring-brand-teal/10 outline-none transition-all font-medium leading-relaxed" />
                                        </div>
                                        <div className="space-y-2">
                                            <label className="text-[10px] font-black text-brand-navy uppercase tracking-widest px-1">Illustration Technical Prompt (JSON)</label>
                                            <textarea value={cleanupPromptText(pageEdits[i]?.prompt !== undefined ? pageEdits[i].prompt : getPromptForIndex(i, spreads[i]))} onChange={(e) => handlePromptChange(i, e.target.value)} onBlur={handleSilentSave} className="w-full p-5 bg-gray-50 border border-gray-100 rounded-[1.5rem] text-xs h-64 focus:ring-2 focus:ring-brand-navy/10 outline-none transition-all font-mono leading-relaxed" spellCheck={false} />
                                        </div>
                                    </div>
                                    {/* Gemini Image Edit Panel â€” collapsible, spans full width */}
                                    <div className="col-span-full">
                                        <SpreadGeminiEditPanel
                                            spreadIndex={i}
                                            illustrationUrl={spreads[i]?.illustrationUrl}
                                            stylePrompt={storyData.selectedStylePrompt || 'Painterly children\'s book illustration style'}
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
                                    <div className={`${log.includes('ERROR') || log.includes('FATAL') ? 'text-red-400 bg-red-400/5 p-2 rounded-xl border border-red-400/20' : log.includes('âœ“') ? 'text-brand-teal font-bold' : log.includes('âš ï¸') ? 'text-orange-300' : 'text-gray-400'} leading-relaxed flex items-start gap-3`}>
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

