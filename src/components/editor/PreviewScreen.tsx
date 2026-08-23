import React, { useState, useRef, useEffect, useMemo, lazy, Suspense } from 'react';
import { Button } from '@/components/ui/Button';
import { Watermark } from '@/components/ui/Watermark';
import type { StoryData, Language, Spread, ProductSize } from '@/types';
import { Spinner } from '@/components/ui/Spinner';
import { motion, AnimatePresence } from 'framer-motion';

const ShareComponent = lazy(() => import('@/components/ui/ShareComponent'));

const formatStoryTextHTML = (text: string, childName: string): string => {
    if (!text || typeof text !== 'string') return '';
    const childFirstName = childName.trim().split(/\s+/)[0];
    const escapedName = childFirstName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const nameRegex = new RegExp(`\\b(${escapedName})\\b`, 'gi');
    let formatted = text.split('\n\n').map(p => `<p class="mb-6 last:mb-0 leading-relaxed">${p.trim()}</p>`).join('');
    if (childFirstName) {
        formatted = formatted.replace(nameRegex, `<span class="font-black text-brand-orange">$1</span>`);
    }
    return formatted;
};

const PageWrapper: React.FC<{ children: React.ReactNode, side: 'left' | 'right' }> = ({ children, side }) => {
    return (
        <div className={`w-1/2 h-full relative overflow-hidden ${side === 'left' ? 'border-r border-black/5' : ''}`}>
            {children}
        </div>
    );
};

const TextOverlay: React.FC<{ text: string, spread: Spread, storyData: StoryData, language: Language, side: 'left' | 'right' }> = ({ text, spread, storyData, language, side }) => {
    if (!text) return null;
    const isAr = language === 'ar';
    
    const offsetX = spread.textOffsetX ?? 0;
    const offsetY = spread.textOffsetY ?? 0;

    return (
        <div className={`absolute inset-0 z-20 p-12 flex flex-col justify-center ${side === 'left' ? 'items-start' : 'items-end'}`}
             style={{ transform: `translate(${offsetX}px, ${offsetY}px)` }}>
            <div className="glass-panel p-10 rounded-[2.5rem] shadow-2xl border-white/60 text-brand-navy max-w-[90%] transform transition-all duration-500 hover:scale-[1.03] hover:shadow-brand-orange/10">
                <div
                    className={`${parseInt(storyData.childAge) <= 4 ? 'text-2xl font-black' : 'text-xl font-bold'} ${isAr ? 'text-right font-tajawal' : 'text-left font-nunito'}`}
                    dangerouslySetInnerHTML={{ __html: formatStoryTextHTML(text, storyData.childName) }}
                />
            </div>
        </div>
    );
};

const CoverView: React.FC<{ storyData: StoryData, language: Language, onTitleChange: (v: string) => void }> = ({ storyData, language, onTitleChange }) => {
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
    const letterSpacing = isAr ? 'normal' : '0.2cqw';
    const transform = isAr ? 'none' : 'rotate(-2deg)';
    
    // Scale outline stroke and shadows based on container width
    const textShadow = isAr
        ? '3px 3px 0 #203A72, -1.5px -1.5px 0 #203A72, 1.5px -1.5px 0 #203A72, -1.5px 1.5px 0 #203A72, 1.5px 1.5px 0 #203A72, 0 6px 10px rgba(0,0,0,0.3)'
        : '0.4cqw 0.4cqw 0 #203A72, -0.2cqw -0.2cqw 0 #203A72, 0.2cqw -0.2cqw 0 #203A72, -0.2cqw 0.2cqw 0 #203A72, 0.2cqw 0.2cqw 0 #203A72, 0 0.8cqw 1.5cqw rgba(0,0,0,0.3)';

    const titleStyle: React.CSSProperties = {
        fontFamily,
        fontWeight: 900,
        color: '#FFFFFF',
        textShadow,
        lineHeight: 1.1,
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
                    background: 'rgba(0,0,0,0.35)',
                    borderRadius: '2.4cqw',
                    padding: '2.8cqw 4cqw',
                }}
            >
                <h1 style={titleStyle} className="text-[9cqw]">
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
                        className="text-[4.5cqw] mt-[2cqw] text-white text-center uppercase"
                    >
                        {subtitle}
                    </div>
                )}
            </motion.div>
            <Watermark />
        </div>
    );
};

const SpreadView: React.FC<{ spread: Spread, storyData: StoryData, language: Language }> = ({ spread, storyData, language }) => {
    const spreadSrc = spread.illustrationUrl
        ? (spread.illustrationUrl.startsWith('http') || spread.illustrationUrl.startsWith('data:'))
            ? spread.illustrationUrl
            : `data:image/jpeg;base64,${spread.illustrationUrl}`
        : '';

    // Determine which side carries the text. Use textSide from the spread,
    // fall back to leftText/rightText presence, then default to 'left'.
    const textSide: 'left' | 'right' = spread.textSide
        || (spread.rightText && !spread.leftText ? 'right' : 'left');

    // Combine leftText and rightText to display the full narrative on the designated page side
    const narrativeText = [spread.leftText, spread.rightText].filter(Boolean).join(' ') || (spread as any).text || '';

    return (
        <div className="w-full h-full flex shadow-[0_40px_80px_-20px_rgba(0,0,0,0.3)] rounded-[3rem] overflow-hidden relative border-[12px] border-white ring-1 ring-black/5"
            style={{ 
                backgroundImage: spreadSrc ? `url(${spreadSrc})` : undefined,
                backgroundSize: 'cover', 
                backgroundPosition: 'center' 
            }}>
            {/* Only render text on the designated side — illustration side stays clean */}
            <PageWrapper side="left">
                {textSide === 'left' && (
                    <TextOverlay text={narrativeText} spread={spread} storyData={storyData} language={language} side="left" />
                )}
            </PageWrapper>
            <PageWrapper side="right">
                {textSide === 'right' && (
                    <TextOverlay text={narrativeText} spread={spread} storyData={storyData} language={language} side="right" />
                )}
            </PageWrapper>
            <div className="absolute inset-y-0 left-1/2 w-[2px] bg-black/10 z-30 shadow-xl"></div>
            <Watermark />
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
}

const PreviewScreen: React.FC<PreviewScreenProps> = (props) => {
    const [viewIndex, setViewIndex] = useState(0);
    const [viewMode, setViewMode] = useState<'presentation' | 'scroll'>('presentation');
    const t = (ar: string, en: string) => props.language === 'ar' ? ar : en;

    const sortedSpreads = useMemo(() => {
        const s = [...(props.storyData.spreads || [])].sort((a, b) => a.spreadNumber - b.spreadNumber);
        return s;
    }, [props.storyData.spreads]);

    const views = useMemo(() => {
        return [
            { type: 'cover' as const },
            ...sortedSpreads.filter(s => s.spreadNumber > 0).map(s => ({ type: 'spread' as const, data: s }))
        ];
    }, [sortedSpreads]);

    const goNext = () => setViewIndex(i => Math.min(i + 1, views.length - 1));
    const goPrev = () => setViewIndex(i => Math.max(i - 1, 0));

    return (
        <div className="min-h-screen bg-[#FFF9F0] pb-24 px-6 relative overflow-hidden">
            {/* Background Blobs */}
            <div className="blob-bg opacity-20">
                <div className="blob blob-1"></div>
                <div className="blob blob-2"></div>
                <div className="blob blob-3"></div>
            </div>

            {/* Header Controls */}
            <div className="max-w-7xl mx-auto pt-10 mb-16 relative z-50">
                <div className="flex flex-col md:flex-row justify-between items-center gap-8 glass-panel p-8 rounded-[3rem] shadow-2xl border-white/60 sticky top-8">
                    <div className="flex items-center gap-8">
                        <button 
                            onClick={props.onBack} 
                            className="w-14 h-14 rounded-2xl glass-panel hover:bg-white flex items-center justify-center text-brand-navy transition-all active:scale-90"
                        >
                            <span className="material-symbols-outlined font-black">arrow_back</span>
                        </button>
                        <div className="flex gap-2 p-2 bg-brand-navy/5 rounded-[1.5rem]">
                            <button 
                                onClick={() => setViewMode('presentation')} 
                                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'presentation' ? 'bg-white text-brand-orange shadow-xl scale-105' : 'text-brand-navy/40 hover:text-brand-navy'}`}
                            >
                                {t('عرض القصة', 'Presentation')}
                            </button>
                            <button 
                                onClick={() => setViewMode('scroll')} 
                                className={`px-8 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${viewMode === 'scroll' ? 'bg-white text-brand-orange shadow-xl scale-105' : 'text-brand-navy/40 hover:text-brand-navy'}`}
                            >
                                {t('قائمة الصفحات', 'Scroll View')}
                            </button>
                        </div>
                    </div>

                    <div className="flex gap-4 w-full md:w-auto">
                        <button 
                            onClick={props.onRestart} 
                            className="flex-1 md:flex-none px-10 py-4 rounded-full font-bold text-brand-navy border-2 border-brand-navy/10 hover:bg-white transition-all uppercase text-[10px] tracking-widest"
                        >
                            {t('إعادة البداية', 'Restart')}
                        </button>
                        <button 
                            onClick={props.onOrder} 
                            className="flex-[2] md:flex-none px-12 py-4 rounded-full font-black text-white bg-brand-orange shadow-2xl shadow-brand-orange/30 hover:-translate-y-1 transition-all uppercase text-[10px] tracking-[0.2em]"
                        >
                            {t('اطلب كتابك الآن!', 'Print My Book!')}
                        </button>
                    </div>
                </div>
            </div>

            {/* Content Area */}
            <div className="max-w-7xl mx-auto relative z-10">
                <AnimatePresence mode="wait">
                    {viewMode === 'presentation' ? (
                        <motion.div 
                            key="presentation"
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -30 }}
                            className="relative"
                        >
                            <div className="flex items-center justify-center gap-8">
                                <button 
                                    onClick={goPrev} 
                                    disabled={viewIndex === 0} 
                                    className="hidden md:flex w-20 h-20 rounded-full glass-panel shadow-2xl text-brand-navy hover:scale-110 disabled:opacity-20 transition-all items-center justify-center group"
                                >
                                    <span className="material-symbols-outlined text-4xl font-black group-hover:-translate-x-1 transition-transform">chevron_left</span>
                                </button>
                                
                                <div className="w-full aspect-[2/1.1] max-w-6xl">
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={viewIndex}
                                            initial={{ opacity: 0, scale: 0.98 }}
                                            animate={{ opacity: 1, scale: 1 }}
                                            exit={{ opacity: 0, scale: 1.02 }}
                                            transition={{ duration: 0.6, ease: [0.22, 1, 0.36, 1] }}
                                            className="w-full h-full"
                                        >
                                            {views[viewIndex].type === 'cover' ? (
                                                <CoverView storyData={props.storyData} language={props.language} onTitleChange={props.onTitleChange} />
                                            ) : (
                                                <SpreadView spread={views[viewIndex].data!} storyData={props.storyData} language={props.language} />
                                            )}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>

                                <button 
                                    onClick={goNext} 
                                    disabled={viewIndex === views.length - 1} 
                                    className="hidden md:flex w-20 h-20 rounded-full glass-panel shadow-2xl text-brand-navy hover:scale-110 disabled:opacity-20 transition-all items-center justify-center group"
                                >
                                    <span className="material-symbols-outlined text-4xl font-black group-hover:translate-x-1 transition-transform">chevron_right</span>
                                </button>
                            </div>

                            {/* Mobile Nav */}
                            <div className="flex md:hidden justify-between mt-12 gap-6">
                                <button onClick={goPrev} disabled={viewIndex === 0} className="flex-1 py-5 glass-panel rounded-2xl font-black uppercase text-[10px] tracking-widest disabled:opacity-30">Previous</button>
                                <button onClick={goNext} disabled={viewIndex === views.length - 1} className="flex-1 py-5 bg-brand-navy text-white rounded-2xl font-black uppercase text-[10px] tracking-widest disabled:opacity-30">Next Page</button>
                            </div>

                            {/* Pagination */}
                            <div className="flex justify-center items-center gap-4 mt-16">
                                <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.2em]">{viewIndex + 1} / {views.length}</p>
                                <div className="flex gap-2">
                                    {views.map((_, i) => (
                                        <button 
                                            key={i} 
                                            onClick={() => setViewIndex(i)}
                                            className={`h-2 rounded-full transition-all duration-500 ${i === viewIndex ? 'w-12 bg-brand-orange shadow-lg shadow-brand-orange/40' : 'w-2 bg-brand-navy/10 hover:bg-brand-navy/20'}`}
                                        />
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                    ) : (
                        <motion.div 
                            key="scroll"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-24"
                        >
                            <div className="aspect-[2/1.1] max-w-6xl mx-auto">
                                <CoverView storyData={props.storyData} language={props.language} onTitleChange={props.onTitleChange} />
                            </div>
                            {sortedSpreads.filter(s => s.spreadNumber > 0).map((s, i) => (
                                <div key={i} className="aspect-[2/1.1] max-w-6xl mx-auto group">
                                    <div className="mb-4 flex justify-between items-end px-4">
                                       <span className="text-[10px] font-black text-brand-navy/20 uppercase tracking-[0.4em]">SPREAD {s.spreadNumber}</span>
                                    </div>
                                    <SpreadView spread={s} storyData={props.storyData} language={props.language} />
                                </div>
                            ))}
                        </motion.div>
                    )}
                </AnimatePresence>

                <div className="mt-32">
                    <Suspense fallback={<Spinner />}>
                        <ShareComponent storyData={props.storyData} language={props.language} />
                    </Suspense>
                </div>
            </div>
        </div>
    );
};

export default PreviewScreen;