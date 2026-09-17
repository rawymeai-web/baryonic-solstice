import React, { useState, useRef, useEffect, useMemo, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/Button';
import { Watermark } from '@/components/ui/Watermark';
import type { StoryData, Language, Spread, ProductSize } from '@/types';
import { Spinner } from '@/components/ui/Spinner';
import { motion, AnimatePresence } from 'framer-motion';

const ShareComponent = lazy(() => import('@/components/ui/ShareComponent'));

const formatStoryTextHTML = (text: string, childName: string): string => {
    if (!text || typeof text !== 'string') return '';
    const childFirstName = childName?.trim().split(/\s+/)[0] || '';
    const escapedName = childFirstName ? childFirstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') : '';
    const nameRegex = escapedName ? new RegExp(`(?<=^|[^\\p{L}\\p{N}_])(${escapedName})(?=[^\\p{L}\\p{N}_]|$)`, 'gu') : null;
    let formatted = text.split('\n\n').map(p => `<p class="mb-[0.8cqw] last:mb-0 leading-relaxed">${p.trim()}</p>`).join('');
    if (nameRegex) {
        formatted = formatted.replace(nameRegex, `<span style="color: #F78F50; font-weight: 800; font-size: 1.05em;">$1</span>`);
    }
    return formatted;
};

const CoverView: React.FC<{ storyData: StoryData, language: Language, isPurchased?: boolean, onTitleChange: (v: string) => void }> = ({ storyData, language, isPurchased, onTitleChange }) => {
    const isAr = language === 'ar';
    const isEn = language === 'en';
    const coverSpread = storyData.spreads?.[0];

    const PDF_W = 400;
    const PDF_H = 200;
    const tw = PDF_W * 0.4; // 160 mm

    const side = storyData.coverTextSide || (isAr ? 'left' : 'right');
    const defaultTx = side === 'left'
        ? (PDF_W * 0.25) - (tw / 2)
        : (PDF_W * 0.75) - (tw / 2);
    const defaultTy = PDF_H * 0.08;

    const tx = coverSpread?.textOffsetX !== undefined && coverSpread?.textOffsetX !== null
        ? coverSpread.textOffsetX
        : defaultTx;
    const ty = coverSpread?.textOffsetY !== undefined && coverSpread?.textOffsetY !== null
        ? coverSpread.textOffsetY
        : defaultTy;

    // Load fonts
    useEffect(() => {
        if (!document.querySelector('link[data-title-fonts]')) {
            const fontLink = document.createElement('link');
            fontLink.setAttribute('data-title-fonts', 'true');
            fontLink.href = 'https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Tajawal:wght@400;700;900&family=Nunito:wght@900&display=swap';
            fontLink.rel = 'stylesheet';
            document.head.appendChild(fontLink);
        }
    }, []);

    const fontFamily = isAr ? "'Tajawal', sans-serif" : (isEn ? "'Luckiest Guy', cursive" : "'Nunito', sans-serif");
    const letterSpacing = isAr ? 'normal' : '0.08cqw';
    const transform = isAr ? 'none' : 'rotate(-2deg)';
    
    // Scale outline stroke and shadows based on container width
    const textShadow = isAr
        ? '0.12cqw 0.12cqw 0 #203A72, -0.06cqw -0.06cqw 0 #203A72, 0.06cqw -0.06cqw 0 #203A72, -0.06cqw 0.06cqw 0 #203A72, 0.06cqw 0.06cqw 0 #203A72, 0 0.3cqw 0.5cqw rgba(0,0,0,0.3)'
        : '0.15cqw 0.15cqw 0 #203A72, -0.08cqw -0.08cqw 0 #203A72, 0.08cqw -0.08cqw 0 #203A72, -0.08cqw 0.08cqw 0 #203A72, 0.08cqw 0.08cqw 0 #203A72, 0 0.3cqw 0.6cqw rgba(0,0,0,0.3)';

    const titleStyle: React.CSSProperties = {
        fontFamily,
        fontWeight: 900,
        color: '#FFFFFF',
        textShadow,
        lineHeight: 1.15,
        letterSpacing,
        transform,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        textAlign: 'center',
        width: '100%',
        textTransform: 'uppercase',
    };

    const coverSrc = storyData.coverImageUrl
        ? (storyData.coverImageUrl.startsWith('http') || storyData.coverImageUrl.startsWith('data:'))
            ? storyData.coverImageUrl
            : `data:image/jpeg;base64,${storyData.coverImageUrl}`
        : '';

    const subtitle = storyData.coverSubtitle || '';

    return (
        <div className="w-full h-full relative overflow-hidden flex shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] rounded-[3rem] border-[12px] border-white ring-1 ring-black/5"
            style={{
                backgroundImage: coverSrc ? `url(${coverSrc})` : undefined,
                backgroundSize: 'cover',
                backgroundPosition: 'center',
                containerType: 'inline-size', // ENABLE CONTAINER QUERIES!
            }}>
            {/* Absolute positioning container for the title block */}
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                className="absolute flex flex-col items-center justify-center pointer-events-none"
                style={{
                    left: `${(tx / PDF_W) * 100}%`,
                    top: `${(ty / PDF_H) * 100}%`,
                    width: `${(tw / PDF_W) * 100}%`,
                    borderRadius: '1.2cqw',
                    padding: '1.2cqw 1.8cqw',
                }}
            >
                <h1 style={titleStyle} className="text-[2.2cqw]">
                    {storyData.title}
                </h1>
                {subtitle && (
                    <div 
                        style={{
                            fontFamily,
                            fontWeight: 700,
                            lineHeight: 1.2,
                            opacity: 0.95,
                            textShadow,
                            letterSpacing,
                            transform,
                        }}
                        className="text-[1.1cqw] mt-[0.5cqw] text-white text-center uppercase"
                    >
                        {subtitle}
                    </div>
                )}
            </motion.div>
            {storyData.coverQcStatus === 'flagged' && (
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md z-40 flex items-center justify-center p-4 sm:p-6 pointer-events-auto">
                    <div className="bg-white/95 backdrop-blur-xl border border-amber-300/80 shadow-2xl rounded-3xl p-5 sm:p-7 text-center max-w-[92%] sm:max-w-md space-y-3 ring-1 ring-black/10 animate-fade-in">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-brand-orange flex items-center justify-center mx-auto shadow-inner border border-amber-300/40">
                            <span className="material-symbols-outlined text-2xl animate-spin">palette</span>
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm sm:text-base font-black text-brand-navy tracking-tight">
                                {isAr 
                                    ? `✨ لا تقلق! نحن نعمل على تجهيز هذا المشهد` 
                                    : `✨ Don't worry! We're working on this scene`}
                            </h4>
                            <p className="text-[11px] sm:text-xs text-brand-navy/70 leading-relaxed font-medium">
                                {isAr
                                    ? `فريقنا الفني يضع لمساته السحرية الأخيرة على الغلاف لـ ${storyData.childName || 'بطلكم'}. تابع تصفح باقي صفحات القصة بكل متعة، وسنقوم بتحديث هذا المشهد فور اكتماله!`
                                    : `Our Art Team is putting magical touches on the cover for ${storyData.childName || 'your hero'}. Feel free to keep browsing the rest of the book — we'll update this scene shortly!`}
                            </p>
                        </div>
                        <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
                            <a
                                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                                    isAr 
                                        ? `مرحباً فريق راوي، أود الاستفسار عن غلاف قصة ${storyData.childName || ''}` 
                                        : `Hello Rawy team, inquiring about the cover for ${storyData.childName || ''}'s story`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-navy hover:bg-brand-navy/90 text-white rounded-xl text-[10px] sm:text-[11px] font-black transition-all shadow-md active:scale-95"
                            >
                                <span className="material-symbols-outlined text-xs text-brand-coral">support_agent</span>
                                <span>{isAr ? 'تواصل مع فريق راوي' : 'Contact Rawy Team'}</span>
                            </a>
                        </div>
                    </div>
                </div>
            )}
            {!isPurchased && <Watermark />}
        </div>
    );
};

export const StorybookSkeleton: React.FC<{ language: Language; onBack?: () => void }> = ({ language, onBack }) => {
    const isAr = language === 'ar';
    return (
        <div className="w-full max-w-5xl mx-auto p-4 sm:p-8 flex flex-col items-center justify-center min-h-[550px] animate-fade-in text-brand-navy">
            {/* Top Bar Skeleton */}
            <div className="w-full flex justify-between items-center mb-6">
                {onBack ? (
                    <button onClick={onBack} className="p-3 bg-white rounded-2xl border border-gray-200 shadow-sm text-brand-navy hover:scale-105 transition-all">
                        <span className="material-symbols-outlined">{isAr ? 'arrow_forward' : 'arrow_back'}</span>
                    </button>
                ) : (
                    <div className="h-10 w-24 bg-gray-200/80 rounded-2xl animate-pulse"></div>
                )}
                <div className="h-8 w-40 sm:w-56 bg-gray-200/80 rounded-2xl animate-pulse"></div>
                <div className="h-10 w-24 bg-gray-200/80 rounded-2xl animate-pulse"></div>
            </div>

            {/* 3D Open Book Skeleton Frame */}
            <div className="w-full aspect-[2/1] bg-gradient-to-br from-white via-amber-50/40 to-slate-100 rounded-[3rem] shadow-2xl border-[12px] border-white relative overflow-hidden flex ring-1 ring-black/5">
                {/* Center Book Spine */}
                <div className="absolute inset-y-0 left-1/2 w-[2px] bg-black/10 z-20"></div>
                
                {/* Left Page Skeleton */}
                <div className="w-1/2 p-6 sm:p-12 flex flex-col justify-end space-y-3 z-10">
                    <div className="h-6 w-3/4 bg-gray-200/90 rounded-xl animate-pulse"></div>
                    <div className="h-4 w-full bg-gray-200/70 rounded-lg animate-pulse"></div>
                    <div className="h-4 w-5/6 bg-gray-200/70 rounded-lg animate-pulse"></div>
                </div>

                {/* Right Page Skeleton */}
                <div className="w-1/2 p-6 sm:p-12 flex items-center justify-center z-10">
                    <div className="w-20 h-20 sm:w-24 sm:h-24 rounded-3xl bg-brand-orange/10 flex items-center justify-center shadow-inner">
                        <span className="material-symbols-outlined text-4xl text-brand-orange animate-spin">auto_stories</span>
                    </div>
                </div>

                {/* Shimmer Sweep Animation */}
                <div className="absolute inset-0 bg-gradient-to-r from-transparent via-white/50 to-transparent animate-[shimmer_2s_infinite] -translate-x-full"></div>
            </div>

            {/* Loading Message */}
            <div className="mt-8 text-center space-y-2">
                <div className="flex items-center justify-center gap-2 text-brand-orange font-black text-sm uppercase tracking-widest">
                    <span className="material-symbols-outlined text-lg animate-bounce">magic_button</span>
                    <span>{isAr ? 'جاري فتح كتابك السحري وتحميل المغامرة...' : 'Opening your magical storybook...'}</span>
                </div>
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider">
                    {isAr ? 'نحضر لك الرسوم والصفحات بأعلى جودة' : 'Loading high-definition illustrations & story'}
                </p>
            </div>
        </div>
    );
};

const SpreadView: React.FC<{ spread: Spread, storyData: StoryData, language: Language, isPurchased?: boolean }> = ({ spread, storyData, language, isPurchased }) => {
    const isAr = language === 'ar';
    const [isImgLoaded, setIsImgLoaded] = useState(false);

    const spreadSrc = spread.illustrationUrl
        ? (spread.illustrationUrl.startsWith('http') || spread.illustrationUrl.startsWith('data:'))
            ? spread.illustrationUrl
            : `data:image/jpeg;base64,${spread.illustrationUrl}`
        : '';

    useEffect(() => {
        if (!spreadSrc) {
            setIsImgLoaded(false);
            return;
        }
        const img = new Image();
        img.src = spreadSrc;
        img.onload = () => setIsImgLoaded(true);
    }, [spreadSrc]);

    // Determine which side carries the text.
    const textSide: 'left' | 'right' = spread.textSide
        || (spread.rightText && !spread.leftText ? 'right' : 'left');

    const narrativeText = [spread.leftText, spread.rightText].filter(Boolean).join(' ') || (spread as any).text || '';

    // Mirror SpreadLayoutPanel / PDF math (PDF_W=400mm, PDF_H=200mm, TEXT_W=160mm)
    const PDF_W = 400;
    const PDF_H = 200;
    const TEXT_W = 160; // 40% of spread width

    const textOnLeft = textSide === 'left';
    const defaultX = textOnLeft ? (PDF_W * 0.05) : (PDF_W * 0.55); // 20mm or 220mm
    const defaultY = PDF_H * 0.12; // 24mm from top

    let activeX = defaultX;
    if (spread.textOffsetX !== undefined && spread.textOffsetX !== null) {
        // Guard against coordinate/side mismatch (e.g. text moved to Right, but old Left offset persisted)
        if (textOnLeft && spread.textOffsetX < (PDF_W * 0.5)) {
            activeX = spread.textOffsetX;
        } else if (!textOnLeft && spread.textOffsetX >= (PDF_W * 0.5)) {
            activeX = spread.textOffsetX;
        } else {
            activeX = defaultX;
        }
    }

    const activeY = spread.textOffsetY !== undefined && spread.textOffsetY !== null
        ? spread.textOffsetY
        : defaultY;

    const leftPercent = (activeX / PDF_W) * 100;
    const topPercent = (activeY / PDF_H) * 100;
    const widthPercent = (TEXT_W / PDF_W) * 100;

    return (
        <div className="w-full h-full flex shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] rounded-2xl sm:rounded-[2.5rem] md:rounded-[3rem] overflow-hidden relative border-2 sm:border-[8px] md:border-[12px] border-white ring-1 ring-black/5 bg-gradient-to-br from-slate-100 via-amber-50/30 to-slate-100"
            style={{ 
                backgroundImage: isImgLoaded && spreadSrc ? `url(${spreadSrc})` : undefined,
                backgroundSize: 'cover', 
                backgroundPosition: 'center',
                containerType: 'inline-size', // ENABLE CONTAINER QUERIES!
            }}>
            
            {/* Shimmer Placeholder while high-res image loads */}
            {!isImgLoaded && spreadSrc && (
                <div className="absolute inset-0 flex items-center justify-center bg-slate-100/90 backdrop-blur-sm z-10">
                    <div className="flex flex-col items-center gap-3">
                        <div className="w-14 h-14 rounded-2xl bg-brand-orange/10 flex items-center justify-center">
                            <span className="material-symbols-outlined text-2xl text-brand-orange animate-spin">auto_stories</span>
                        </div>
                        <span className="text-[11px] font-black uppercase tracking-widest text-brand-navy/60">
                            {isAr ? 'جاري تجهيز الرسمة...' : 'Rendering Illustration...'}
                        </span>
                    </div>
                </div>
            )}

            {narrativeText && (
                <div 
                    className="absolute z-20 transition-all duration-300 pointer-events-none"
                    style={{
                        left: `${leftPercent}%`,
                        top: `${topPercent}%`,
                        width: `${widthPercent}%`,
                        maxHeight: '88%',
                    }}
                >
                    <div 
                        className="bg-white/95 backdrop-blur-xl border border-white/90 shadow-[0_12px_40px_rgba(0,26,64,0.12)] rounded-[1.4cqw] sm:rounded-[1.8cqw] p-[1.4cqw] sm:p-[2cqw] text-brand-navy max-w-full"
                        style={{
                            boxShadow: '0 12px 40px rgba(0, 26, 64, 0.12), 0 2px 6px rgba(0,0,0,0.06)',
                        }}
                    >
                        <div
                            style={{
                                fontSize: 'clamp(11px, 1.65cqw, 20px)',
                                lineHeight: 1.55,
                                fontFamily: isAr ? "'Tajawal', sans-serif" : "'Nunito', sans-serif",
                                color: '#001A40',
                            }}
                            className={`font-bold ${isAr ? 'text-right' : 'text-left'}`}
                            dangerouslySetInnerHTML={{ __html: formatStoryTextHTML(narrativeText, storyData.childName) }}
                        />
                    </div>
                </div>
            )}

            {spread.qcStatus === 'flagged' && (
                <div className="absolute inset-0 bg-slate-950/40 backdrop-blur-md z-40 flex items-center justify-center p-4 sm:p-6 pointer-events-auto">
                    <div className="bg-white/95 backdrop-blur-xl border border-amber-300/80 shadow-2xl rounded-3xl p-5 sm:p-7 text-center max-w-[92%] sm:max-w-md space-y-3 ring-1 ring-black/10 animate-fade-in">
                        <div className="w-12 h-12 rounded-2xl bg-amber-500/10 text-brand-orange flex items-center justify-center mx-auto shadow-inner border border-amber-300/40">
                            <span className="material-symbols-outlined text-2xl animate-spin">palette</span>
                        </div>
                        <div className="space-y-1">
                            <h4 className="text-sm sm:text-base font-black text-brand-navy tracking-tight">
                                {isAr 
                                    ? `✨ لا تقلق! نحن نعمل على تجهيز هذا المشهد` 
                                    : `✨ Don't worry! We're working on this scene`}
                            </h4>
                            <p className="text-[11px] sm:text-xs text-brand-navy/70 leading-relaxed font-medium">
                                {isAr
                                    ? `فريقنا الفني يضع لمساته السحرية الأخيرة على هذا المشهد لـ ${storyData.childName || 'بطلكم'}. تابع تصفح باقي صفحات القصة بكل متعة، وسنقوم بتحديث هذا المشهد فور اكتماله!`
                                    : `Our Art Team is putting magical touches on this scene for ${storyData.childName || 'your hero'}. Feel free to keep browsing the rest of the book — we'll update this scene shortly!`}
                            </p>
                        </div>
                        <div className="pt-1 flex flex-wrap items-center justify-center gap-2">
                            <a
                                href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                                    isAr 
                                        ? `مرحباً فريق راوي، أود الاستفسار عن قصة ${storyData.childName || ''} (المشهد رقم ${spread.spreadNumber})` 
                                        : `Hello Rawy team, inquiring about ${storyData.childName || ''}'s story (Spread ${spread.spreadNumber})`
                                )}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1.5 px-4 py-2 bg-brand-navy hover:bg-brand-navy/90 text-white rounded-xl text-[10px] sm:text-[11px] font-black transition-all shadow-md active:scale-95"
                            >
                                <span className="material-symbols-outlined text-xs text-brand-coral">support_agent</span>
                                <span>{isAr ? 'تواصل مع فريق راوي' : 'Contact Rawy Team'}</span>
                            </a>
                        </div>
                    </div>
                </div>
            )}

            <div className="absolute inset-y-0 left-1/2 w-[2px] bg-black/10 z-30 shadow-xl pointer-events-none"></div>
            {!isPurchased && <Watermark />}
        </div>
    );
};

export interface PreviewScreenProps {
    storyData: StoryData;
    onOrder: () => void;
    onDownloadPreview: () => void;
    onRestart: () => void;
    onTitleChange: (v: string) => void;
    onRegenerate: (feedback: string) => void;
    language: Language;
    onBack: () => void;
    isPurchased?: boolean;
}

const PreviewScreen: React.FC<PreviewScreenProps> = (props) => {
    const [viewIndex, setViewIndex] = useState(0);
    const [direction, setDirection] = useState<number>(1);
    const [viewMode, setViewMode] = useState<'presentation' | 'scroll'>('scroll');
    const [isSpeaking, setIsSpeaking] = useState(false);

    const isPurchased = props.isPurchased ?? Boolean(
        props.storyData?.orderId ||
        (props.storyData as any)?.orderNumber ||
        (props.storyData as any)?.isPurchased ||
        (props.storyData as any)?.isPaid ||
        ['confirmed', 'shipped', 'delivered', 'awaiting_preview_approval', 'softcopy_ready'].includes((props.storyData as any)?.status)
    );
    const t = (ar: string, en: string) => props.language === 'ar' ? ar : en;
    const isAr = props.language === 'ar';

    const sortedSpreads = useMemo(() => {
        const s = [...(props.storyData?.spreads || [])].sort((a, b) => a.spreadNumber - b.spreadNumber);
        return s;
    }, [props.storyData?.spreads]);

    const views = useMemo(() => {
        return [
            { type: 'cover' as const },
            ...sortedSpreads.filter(s => s.spreadNumber > 0).map(s => ({ type: 'spread' as const, data: s }))
        ];
    }, [sortedSpreads]);

    const flaggedSpreadsCount = useMemo(() => {
        let count = 0;
        if (props.storyData?.coverQcStatus === 'flagged') count++;
        if (props.storyData?.spreads) {
            props.storyData.spreads.forEach((s: any) => {
                if (s.spreadNumber > 0 && s.qcStatus === 'flagged') count++;
            });
        }
        return count;
    }, [props.storyData]);

    // If story data is not loaded yet, show magical storybook skeleton
    if (!props.storyData || (!props.storyData.spreads && !props.storyData.coverImageUrl && !props.storyData.title)) {
        return <StorybookSkeleton language={props.language} onBack={props.onBack} />;
    }

    const goNext = () => {
        if (viewIndex < views.length - 1) {
            setDirection(1);
            setViewIndex(i => i + 1);
        }
    };

    const goPrev = () => {
        if (viewIndex > 0) {
            setDirection(-1);
            setViewIndex(i => i - 1);
        }
    };

    // AI Audio Story Narration
    const handleToggleAudioReader = () => {
        if (typeof window === 'undefined' || !window.speechSynthesis) return;

        if (isSpeaking) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
            return;
        }

        const currentView = views[viewIndex];
        let textToRead = '';

        if (currentView.type === 'cover') {
            textToRead = `${props.storyData.title}. ${props.storyData.coverSubtitle || ''}`;
        } else if (currentView.data) {
            textToRead = [currentView.data.leftText, currentView.data.rightText].filter(Boolean).join('. ') || (currentView.data as any).text || '';
        }

        if (!textToRead) return;

        window.speechSynthesis.cancel();
        const cleanText = textToRead.replace(/<[^>]*>/g, '');
        const utterance = new SpeechSynthesisUtterance(cleanText);
        utterance.lang = props.language === 'ar' ? 'ar-SA' : 'en-US';
        utterance.rate = 0.88; // Gentle storybook pace

        const voices = window.speechSynthesis.getVoices();
        const langPrefix = props.language === 'ar' ? 'ar' : 'en';
        const langVoices = voices.filter(v => v.lang.toLowerCase().startsWith(langPrefix));

        // Prioritize Natural, Neural, Enhanced, Google, and Siri voices if installed on device
        const bestVoice = langVoices.find(v => 
            /natural|neural|enhanced|premium|siri|google/i.test(v.name)
        ) || langVoices.find(v => !v.localService) || langVoices[0];

        if (bestVoice) utterance.voice = bestVoice;

        utterance.onstart = () => setIsSpeaking(true);
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);

        window.speechSynthesis.speak(utterance);
    };

    // Cancel speech on slide change
    useEffect(() => {
        if (typeof window !== 'undefined' && window.speechSynthesis) {
            window.speechSynthesis.cancel();
            setIsSpeaking(false);
        }
    }, [viewIndex]);

    // 3D Flip Variants
    const flipVariants = {
        initial: (dir: number) => ({
            opacity: 0,
            rotateY: dir > 0 ? (isAr ? 35 : -35) : (isAr ? -35 : 35),
            transformOrigin: dir > 0 ? (isAr ? 'right center' : 'left center') : (isAr ? 'left center' : 'right center'),
            scale: 0.96,
            filter: 'blur(1px)',
        }),
        animate: {
            opacity: 1,
            rotateY: 0,
            scale: 1,
            filter: 'blur(0px)',
            transition: {
                duration: 0.65,
                ease: [0.25, 1, 0.5, 1] as any
            }
        },
        exit: (dir: number) => ({
            opacity: 0,
            rotateY: dir > 0 ? (isAr ? -35 : 35) : (isAr ? 35 : -35),
            transformOrigin: dir > 0 ? (isAr ? 'left center' : 'right center') : (isAr ? 'right center' : 'left center'),
            scale: 0.96,
            filter: 'blur(1px)',
            transition: {
                duration: 0.45,
                ease: [0.5, 0, 0.75, 0] as any
            }
        })
    };

    const [touchStartX, setTouchStartX] = useState<number | null>(null);

    const handleTouchStart = (e: React.TouchEvent) => {
        setTouchStartX(e.touches[0].clientX);
    };

    const handleTouchEnd = (e: React.TouchEvent) => {
        if (touchStartX === null) return;
        const touchEndX = e.changedTouches[0].clientX;
        const diffX = touchStartX - touchEndX;

        // Threshold of 50px
        if (Math.abs(diffX) > 50) {
            if (diffX > 0) {
                // Swiped left
                if (isAr) goPrev(); else goNext();
            } else {
                // Swiped right
                if (isAr) goNext(); else goPrev();
            }
        }
        setTouchStartX(null);
    };

    const currentSpread = views[viewIndex]?.type === 'spread' ? views[viewIndex].data : null;
    const currentSpreadText = currentSpread ? ([currentSpread.leftText, currentSpread.rightText].filter(Boolean).join(' ') || (currentSpread as any).text || '') : '';

    return (
        <div className="min-h-screen bg-[#FFF9F0] pb-20 px-3 sm:px-6 relative overflow-hidden">
            {/* Background Blobs */}
            <div className="blob-bg opacity-20 pointer-events-none">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
                <div className="blob blob-3"></div>
            </div>

            {/* Header Controls */}
            <div className="max-w-7xl mx-auto pt-3 md:pt-8 mb-6 md:mb-12 relative z-50">
                <div className="flex flex-col md:flex-row justify-between items-center gap-4 md:gap-8 glass-panel p-4 md:p-6 rounded-2xl md:rounded-[2.5rem] shadow-xl border-white/60">
                    <div className="flex flex-wrap items-center justify-between md:justify-start w-full md:w-auto gap-2 sm:gap-4">
                        <button 
                            onClick={props.onBack} 
                            className="w-10 h-10 md:w-12 md:h-12 rounded-xl md:rounded-2xl glass-panel hover:bg-white flex items-center justify-center text-brand-navy transition-all active:scale-90 shadow-sm"
                        >
                            <span className="material-symbols-outlined font-black text-lg md:text-xl">{isAr ? 'arrow_forward' : 'arrow_back'}</span>
                        </button>
                        
                        <div className="flex gap-1 p-1 bg-brand-navy/5 rounded-xl md:rounded-2xl">
                            <button 
                                onClick={() => setViewMode('presentation')} 
                                className={`px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-wider transition-all ${viewMode === 'presentation' ? 'bg-white text-brand-orange shadow-md scale-102' : 'text-brand-navy/40 hover:text-brand-navy'}`}
                            >
                                {t('عرض القصة', 'Presentation')}
                            </button>
                            <button 
                                onClick={() => setViewMode('scroll')} 
                                className={`px-4 md:px-6 py-2 md:py-2.5 rounded-lg md:rounded-xl text-[10px] md:text-[11px] font-black uppercase tracking-wider transition-all ${viewMode === 'scroll' ? 'bg-white text-brand-orange shadow-md scale-102' : 'text-brand-navy/40 hover:text-brand-navy'}`}
                            >
                                {t('قائمة الصفحات', 'Scroll View')}
                            </button>
                        </div>

                        {/* Audio Narrator Button */}
                        <button
                            onClick={handleToggleAudioReader}
                            className={`px-3.5 md:px-5 py-2 md:py-2.5 rounded-xl md:rounded-2xl text-[10px] md:text-[11px] font-black uppercase tracking-wider transition-all flex items-center gap-1.5 shadow-md ${
                                isSpeaking 
                                    ? 'bg-emerald-500 text-white animate-pulse shadow-emerald-500/30' 
                                    : 'bg-brand-teal text-white hover:bg-brand-teal/90 shadow-brand-teal/20'
                            }`}
                        >
                            <span className="material-symbols-outlined text-base">
                                {isSpeaking ? 'pause_circle' : 'volume_up'}
                            </span>
                            <span>{isSpeaking ? t('إيقاف', 'Pause') : t('🔊 اقرأ لي', '🔊 Read to Me')}</span>
                        </button>
                    </div>

                    <div className="flex gap-2.5 w-full md:w-auto">
                        <button 
                            onClick={props.onRestart} 
                            className="flex-1 md:flex-none px-4 md:px-7 py-2.5 md:py-3.5 rounded-xl md:rounded-full font-bold text-brand-navy border border-brand-navy/15 hover:bg-white transition-all uppercase text-[10px] md:text-[11px] tracking-wider"
                        >
                            {t('إعادة البداية', 'Restart')}
                        </button>
                        <button 
                            onClick={props.onOrder} 
                            className="flex-[1.5] md:flex-none px-5 md:px-8 py-2.5 md:py-3.5 rounded-xl md:rounded-full font-black text-white bg-brand-orange shadow-lg shadow-brand-orange/30 hover:scale-102 transition-all uppercase text-[10px] md:text-[11px] tracking-wider"
                        >
                            {t('اطلب كتابك الآن!', 'Print My Book!')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto relative z-10">
                {/* Flagged Spreads Warm Reassurance Banner */}
                {flaggedSpreadsCount > 0 && (
                    <div className="max-w-6xl mx-auto mb-6 p-4 sm:p-5 bg-gradient-to-r from-amber-50/95 via-orange-50/90 to-amber-50/95 border border-amber-300/80 rounded-2xl md:rounded-3xl shadow-lg text-amber-950 flex flex-col sm:flex-row items-center justify-between gap-4 animate-fade-in ring-1 ring-amber-400/20">
                        <div className="flex items-center gap-3 text-center sm:text-left rtl:sm:text-right">
                            <div className="w-11 h-11 rounded-2xl bg-brand-orange/15 border border-brand-orange/30 flex items-center justify-center shrink-0 shadow-inner">
                                <span className="material-symbols-outlined text-brand-orange text-2xl animate-pulse">palette</span>
                            </div>
                            <div>
                                <h4 className="text-xs sm:text-sm font-black text-amber-950">
                                    {t(
                                        `✨ قصتك الرائعة جاهزة للمعاينة! فريقنا يُجري لمسات فنية أخيرة على ${flaggedSpreadsCount} صفحة`,
                                        `✨ Your story is ready to preview! Our team is putting final touches on ${flaggedSpreadsCount} page(s)`
                                    )}
                                </h4>
                                <p className="text-[11px] sm:text-xs text-amber-900/80 font-medium leading-relaxed mt-0.5">
                                    {t(
                                        `يمكنك تصفح وقراءة القصة بالكامل الآن. فريق التصميم في راوي يقوم بإتقان الصفحات المحددة وسنقوم بإشعارك فور اعتمادها.`,
                                        `You can flip through the entire story right now. Our art directors are perfecting the flagged page(s) and we will notify you once complete.`
                                    )}
                                </p>
                            </div>
                        </div>
                        <a
                            href={`https://api.whatsapp.com/send?text=${encodeURIComponent(
                                isAr 
                                    ? `مرحباً فريق راوي، أود الاستفسار عن قصة ${props.storyData.childName || ''} (رقم الطلب: ${props.storyData.orderId || ''})` 
                                    : `Hello Rawy team, inquiring about ${props.storyData.childName || ''}'s story (Order: ${props.storyData.orderId || ''})`
                            )}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="shrink-0 px-5 py-2.5 bg-brand-navy hover:bg-brand-navy/90 text-white rounded-xl md:rounded-2xl text-xs font-black flex items-center gap-2 transition-all shadow-md active:scale-95"
                        >
                            <span className="material-symbols-outlined text-base text-brand-coral">support_agent</span>
                            <span>{t('تواصل مع فريق راوي', 'Contact Rawy Team')}</span>
                        </a>
                    </div>
                )}

                {/* View Mode Switcher Pill */}
                <div className="flex justify-center mb-6">
                    <div className="inline-flex items-center bg-white/95 backdrop-blur-md p-1.5 rounded-2xl shadow-lg border border-amber-200/80 ring-1 ring-black/5 text-xs font-black">
                        <button 
                            onClick={() => setViewMode('scroll')}
                            className={`flex items-center gap-1.5 px-4 sm:px-6 py-2.5 rounded-xl transition-all ${viewMode === 'scroll' ? 'bg-brand-navy text-white shadow-md' : 'text-brand-navy/60 hover:text-brand-navy'}`}
                        >
                            <span className="material-symbols-outlined text-sm">view_stream</span>
                            <span>{t('📜 قراءة متواصلة (كل الصفحات)', '📜 Continuous Scroll (All Pages)')}</span>
                        </button>
                        <button 
                            onClick={() => setViewMode('presentation')}
                            className={`flex items-center gap-1.5 px-4 sm:px-6 py-2.5 rounded-xl transition-all ${viewMode === 'presentation' ? 'bg-brand-navy text-white shadow-md' : 'text-brand-navy/60 hover:text-brand-navy'}`}
                        >
                            <span className="material-symbols-outlined text-sm">auto_stories</span>
                            <span>{t('📖 صفحة بصفحة (تقليب)', '📖 Flip Book (Single Page)')}</span>
                        </button>
                    </div>
                </div>

                <AnimatePresence mode="wait">
                    {viewMode === 'presentation' ? (
                        <motion.div 
                            key="presentation"
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -20 }}
                            className="relative"
                        >
                            <div className="flex items-center justify-center gap-4 md:gap-8">
                                <button 
                                    onClick={goPrev} 
                                    disabled={viewIndex === 0} 
                                    className="hidden md:flex w-16 h-16 rounded-full glass-panel shadow-xl text-brand-navy hover:scale-110 disabled:opacity-20 transition-all items-center justify-center group"
                                >
                                    <span className="material-symbols-outlined text-3xl font-black group-hover:-translate-x-0.5 transition-transform">{isAr ? 'chevron_right' : 'chevron_left'}</span>
                                </button>
                                
                                <div 
                                    className="w-full aspect-[2/1.1] max-w-6xl [perspective:1800px] touch-pan-y"
                                    onTouchStart={handleTouchStart}
                                    onTouchEnd={handleTouchEnd}
                                >
                                    <AnimatePresence mode="wait" custom={direction}>
                                        <motion.div
                                            key={viewIndex}
                                            custom={direction}
                                            variants={flipVariants}
                                            initial="initial"
                                            animate="animate"
                                            exit="exit"
                                            className="w-full h-full transform-gpu"
                                            style={{ transformStyle: 'preserve-3d' }}
                                        >
                                            {views[viewIndex].type === 'cover' ? (
                                                <CoverView storyData={props.storyData} language={props.language} isPurchased={isPurchased} onTitleChange={props.onTitleChange} />
                                            ) : (
                                                <SpreadView spread={views[viewIndex].data!} storyData={props.storyData} language={props.language} isPurchased={isPurchased} />
                                            )}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>

                                <button 
                                    onClick={goNext} 
                                    disabled={viewIndex === views.length - 1} 
                                    className="hidden md:flex w-16 h-16 rounded-full glass-panel shadow-xl text-brand-navy hover:scale-110 disabled:opacity-20 transition-all items-center justify-center group"
                                >
                                    <span className="material-symbols-outlined text-3xl font-black group-hover:translate-x-0.5 transition-transform">{isAr ? 'chevron_left' : 'chevron_right'}</span>
                                </button>
                            </div>

                            {/* Mobile Dedicated Story Reader Card (Clear, Large, High-Contrast Typography for Phones) */}
                            {views[viewIndex].type === 'spread' && currentSpreadText && (
                                <div className="block md:hidden mt-4 p-5 bg-white/95 backdrop-blur-md rounded-3xl shadow-xl border border-amber-100/80 ring-1 ring-black/5 text-brand-navy animate-fade-in">
                                    <div className="flex items-center justify-between mb-3 border-b border-slate-100 pb-2">
                                        <div className="flex items-center gap-2">
                                            <span className="w-2 h-2 rounded-full bg-brand-orange animate-pulse"></span>
                                            <span className="text-[11px] font-black uppercase tracking-wider text-brand-navy/60">
                                                {isAr 
                                                    ? `📖 صفحة ${views[viewIndex].data?.spreadNumber} من ${sortedSpreads.filter(s => s.spreadNumber > 0).length}` 
                                                    : `📖 Page ${views[viewIndex].data?.spreadNumber} of ${sortedSpreads.filter(s => s.spreadNumber > 0).length}`}
                                            </span>
                                        </div>
                                        <button
                                            onClick={handleToggleAudioReader}
                                            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 text-brand-orange text-[11px] font-bold hover:bg-amber-100 transition-all"
                                        >
                                            <span className="material-symbols-outlined text-sm">
                                                {isSpeaking ? 'pause' : 'volume_up'}
                                            </span>
                                            <span>{isSpeaking ? (isAr ? 'إيقاف' : 'Pause') : (isAr ? 'استمع' : 'Listen')}</span>
                                        </button>
                                    </div>
                                    <div 
                                        className={`text-[16px] leading-[1.8] font-medium ${isAr ? 'text-right' : 'text-left'}`}
                                        style={{ fontFamily: isAr ? "'Tajawal', sans-serif" : "'Nunito', sans-serif" }}
                                        dangerouslySetInnerHTML={{ __html: formatStoryTextHTML(currentSpreadText, props.storyData.childName) }}
                                    />
                                </div>
                            )}

                            {/* Mobile Navigation Buttons */}
                            <div className="flex md:hidden justify-between mt-5 gap-4">
                                <button 
                                    onClick={goPrev} 
                                    disabled={viewIndex === 0} 
                                    className="flex-1 py-3.5 glass-panel rounded-2xl font-black uppercase text-[11px] tracking-wider text-brand-navy disabled:opacity-30 flex items-center justify-center gap-1 shadow-sm"
                                >
                                    <span className="material-symbols-outlined text-base">{isAr ? 'arrow_forward' : 'arrow_back'}</span>
                                    <span>{t('السابق', 'Previous')}</span>
                                </button>
                                <button 
                                    onClick={goNext} 
                                    disabled={viewIndex === views.length - 1} 
                                    className="flex-1 py-3.5 bg-brand-navy text-white rounded-2xl font-black uppercase text-[11px] tracking-wider disabled:opacity-30 flex items-center justify-center gap-1 shadow-md shadow-brand-navy/20"
                                >
                                    <span>{t('الصفحة التالية', 'Next Page')}</span>
                                    <span className="material-symbols-outlined text-base">{isAr ? 'arrow_back' : 'arrow_forward'}</span>
                                </button>
                            </div>

                            {/* Pagination Indicators */}
                            <div className="flex justify-center items-center gap-3 mt-6 md:mt-12">
                                <p className="text-[10px] md:text-[11px] font-black text-brand-navy/40 uppercase tracking-[0.15em]">{viewIndex + 1} / {views.length}</p>
                                <div className="flex gap-1.5">
                                    {views.map((_, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => setViewIndex(i)}
                                            className={`h-2 rounded-full transition-all duration-300 ${i === viewIndex ? 'w-8 bg-brand-orange shadow-md shadow-brand-orange/40' : 'w-2 bg-brand-navy/15 hover:bg-brand-navy/30'}`}
                                        />
                                    ))}
                                </div>
                            </div>

                            {/* Mobile Quick Switch to Continuous Scroll */}
                            <div className="flex md:hidden justify-center mt-5">
                                <button 
                                    onClick={() => setViewMode('scroll')}
                                    className="px-4 py-2.5 rounded-xl bg-amber-500/10 border border-amber-300/40 text-[11px] font-black text-amber-950 flex items-center gap-2 shadow-xs active:scale-95 transition-all"
                                >
                                    <span className="material-symbols-outlined text-sm text-brand-orange">view_stream</span>
                                    <span>{t('📜 اعرض جميع صفحات القصة معاً (تمرير عمودي)', '📜 View All Pages Together (Continuous Scroll)')}</span>
                                </button>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="scroll"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-16 md:space-y-24"
                        >
                            <div className="aspect-[2/1.1] max-w-6xl mx-auto">
                                <CoverView storyData={props.storyData} language={props.language} isPurchased={isPurchased} onTitleChange={props.onTitleChange} />
                            </div>
                            {sortedSpreads.filter(s => s.spreadNumber > 0).map((s, i) => {
                                const spreadText = (s as any).text || [s.leftText, s.rightText].filter(Boolean).join(' ') || '';
                                return (
                                    <div key={i} className="max-w-6xl mx-auto group">
                                        <div className="mb-3 flex justify-between items-end px-4">
                                           <span className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.3em]">SPREAD {s.spreadNumber}</span>
                                        </div>
                                        <div className="aspect-[2/1.1] w-full">
                                            <SpreadView spread={s} storyData={props.storyData} language={props.language} isPurchased={isPurchased} />
                                        </div>
                                        {/* Dedicated Mobile Story Card for flawless readability */}
                                        {spreadText && (
                                            <div className="block md:hidden mt-3 p-4 bg-white/95 backdrop-blur-md rounded-2xl shadow-md border border-amber-100/80 ring-1 ring-black/5 text-brand-navy">
                                                <div className="flex items-center justify-between mb-2 border-b border-slate-100 pb-1.5">
                                                    <div className="flex items-center gap-1.5">
                                                        <span className="w-1.5 h-1.5 rounded-full bg-brand-orange animate-pulse"></span>
                                                        <span className="text-[10px] font-black uppercase tracking-wider text-brand-navy/60">
                                                            {isAr 
                                                                ? `📖 المشهد ${s.spreadNumber} من ${sortedSpreads.filter(sp => sp.spreadNumber > 0).length}` 
                                                                : `📖 Scene ${s.spreadNumber} of ${sortedSpreads.filter(sp => sp.spreadNumber > 0).length}`}
                                                        </span>
                                                    </div>
                                                </div>
                                                <div 
                                                    className={`text-[15px] leading-[1.7] font-medium ${isAr ? 'text-right' : 'text-left'}`}
                                                    style={{ fontFamily: isAr ? "'Tajawal', sans-serif" : "'Nunito', sans-serif" }}
                                                    dangerouslySetInnerHTML={{ __html: formatStoryTextHTML(spreadText, props.storyData.childName) }}
                                                />
                                            </div>
                                        )}
                                    </div>
                                );
                            })}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="mt-20 md:mt-32">
                    <Suspense fallback={<Spinner />}>
                        <ShareComponent storyData={props.storyData} language={props.language} />
                    </Suspense>
                </div>
            </div>
        </div>
    );
};

export default PreviewScreen;