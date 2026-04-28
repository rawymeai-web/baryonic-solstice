
import React, { useState, useRef, useEffect, useCallback } from 'react';
import type { Language } from '@/types';
import { toPng } from 'html-to-image';

interface TitlePreviewPanelProps {
    title: string;
    subtitle?: string;
    language: Language;
    coverTextSide: 'left' | 'right';
    coverImageUrl?: string;
}

/**
 * Renders the title using the exact same style as createTextImage in fileService.ts
 * KEY FIX: The element must be in-viewport (even if tiny) for html-to-image / toPng to work.
 * We render it into a fixed element at viewport edge with overflow:hidden clipping.
 */
async function renderTitleToDataUrl(title: string, subtitle: string, lang: Language): Promise<string> {
    const isAr = lang === 'ar';
    const isEn = lang === 'en';
    const fontFamily = isAr ? "'Tajawal', sans-serif" : (isEn ? "'Luckiest Guy', cursive" : "'Nunito', sans-serif");
    const letterSpacing = isAr ? 'normal' : '2px';
    const textShadow = '4px 4px 0 #203A72, -2px -2px 0 #203A72, 2px -2px 0 #203A72, -2px 2px 0 #203A72, 2px 2px 0 #203A72, 0 8px 15px rgba(0,0,0,0.3)';
    const transform = isAr ? 'none' : 'rotate(-2deg)';

    // Load Google Fonts
    if (!document.querySelector('link[data-title-fonts]')) {
        const fontLink = document.createElement('link');
        fontLink.setAttribute('data-title-fonts', 'true');
        fontLink.href = 'https://fonts.googleapis.com/css2?family=Luckiest+Guy&family=Tajawal:wght@400;700;900&family=Nunito:wght@900&display=swap';
        fontLink.rel = 'stylesheet';
        document.head.appendChild(fontLink);
    }
    await document.fonts.ready;
    try {
        await Promise.race([
            document.fonts.load(`900 90px '${isAr ? 'Tajawal' : (isEn ? 'Luckiest Guy' : 'Nunito')}'`),
            new Promise(r => setTimeout(r, 3000))
        ]);
    } catch (_) {
        await new Promise(r => setTimeout(r, 500));
    }

    // Create a fixed-position clip container at (0, 0) so html-to-image can see it
    // but it's visually clipped to 1x1 (invisible to the user)
    const clipper = document.createElement('div');
    clipper.style.cssText = `
        position: fixed;
        top: 0;
        left: 0;
        width: 1px;
        height: 1px;
        overflow: visible;
        z-index: -9999;
        pointer-events: none;
    `;

    const container = document.createElement('div');
    container.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        font-family: ${fontFamily};
        color: #FFFFFF;
        background: rgba(0,0,0,0.35);
        border-radius: 24px;
        text-shadow: ${textShadow};
        padding: 28px 40px;
        text-align: center;
        width: 1000px;
        text-transform: uppercase;
        letter-spacing: ${letterSpacing};
        transform: ${transform};
        display: flex;
        flex-direction: column;
        align-items: center;
    `;
    container.dir = lang === 'ar' ? 'rtl' : 'ltr';
    container.innerHTML = `
        <div style="font-weight:900;line-height:1.1;font-size:90px;">${title || '&nbsp;'}</div>
        ${subtitle ? `<div style="font-weight:700;line-height:1.2;font-size:45px;margin-top:20px;opacity:0.95;">${subtitle}</div>` : ''}
    `;

    clipper.appendChild(container);
    document.body.appendChild(clipper);

    // Small delay to let browser layout & paint
    await new Promise(r => setTimeout(r, 100));

    const dataUrl = await toPng(container, {
        pixelRatio: 2,
        backgroundColor: undefined,
        // Force include fonts
        fontEmbedCSS: undefined,
    });

    document.body.removeChild(clipper);
    return dataUrl;
}

const TitlePreviewPanel: React.FC<TitlePreviewPanelProps> = ({
    title,
    subtitle,
    language,
    coverTextSide,
    coverImageUrl
}) => {
    const [titleDataUrl, setTitleDataUrl] = useState<string>('');
    const [isRendering, setIsRendering] = useState(false);
    const [renderError, setRenderError] = useState('');
    const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

    // PDF coordinate calculation (mirrors fileService logic exactly)
    // PDF page is 400mm wide x 200mm tall for a 20x20 book spread
    const PDF_W = 400; // mm
    const PDF_H = 200; // mm
    const tw = PDF_W * 0.4;
    const titleAspect = 1000 / 200;
    const th = tw / titleAspect;
    const ty = PDF_H * 0.08;
    const isAr = language === 'ar';
    const side = coverTextSide || (isAr ? 'left' : 'right');
    const tx = side === 'left'
        ? (PDF_W * 0.25) - (tw / 2)
        : (PDF_W * 0.75) - (tw / 2);

    const rerender = useCallback(async () => {
        if (!title.trim()) {
            setTitleDataUrl('');
            setRenderError('');
            return;
        }
        setIsRendering(true);
        setRenderError('');
        try {
            const url = await renderTitleToDataUrl(title, subtitle || '', language);
            setTitleDataUrl(url);
        } catch (e: any) {
            console.error('Title render failed', e);
            setRenderError(e?.message || 'Render failed');
        } finally {
            setIsRendering(false);
        }
    }, [title, subtitle, language]);

    // Debounce re-renders as user types
    useEffect(() => {
        if (debounceRef.current) clearTimeout(debounceRef.current);
        debounceRef.current = setTimeout(rerender, 700);
        return () => { if (debounceRef.current) clearTimeout(debounceRef.current); };
    }, [rerender]);

    const handleDownload = () => {
        if (!titleDataUrl) return;
        const link = document.createElement('a');
        link.href = titleDataUrl;
        link.download = `title_${encodeURIComponent(title.replace(/\s+/g, '_'))}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    return (
        <div className="mt-6 p-5 rounded-[1.5rem] bg-gradient-to-br from-indigo-50 to-purple-50 border border-indigo-100 shadow-sm space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-2">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    Title PNG Preview
                </h4>
                {titleDataUrl && !isRendering && (
                    <button
                        onClick={handleDownload}
                        className="text-[9px] font-black uppercase text-white bg-indigo-500 hover:bg-indigo-600 px-3 py-1.5 rounded-lg transition-all shadow-sm active:scale-95"
                    >
                        ↓ Save PNG
                    </button>
                )}
            </div>

            {/* PNG Preview Area — checkered bg shows transparency clearly */}
            <div
                className="relative w-full rounded-xl overflow-hidden flex items-center justify-center border border-gray-200 shadow-inner"
                style={{
                    minHeight: '80px',
                    // Checkered pattern to show alpha transparency
                    backgroundImage: 'repeating-conic-gradient(#ccc 0% 25%, #fff 0% 50%)',
                    backgroundSize: '20px 20px',
                }}
            >
                {isRendering ? (
                    <div className="flex flex-col items-center gap-2 py-6 text-gray-500">
                        <div className="w-5 h-5 border-2 border-indigo-400 border-t-transparent rounded-full animate-spin" />
                        <span className="text-[9px] font-mono uppercase tracking-widest">Rendering...</span>
                    </div>
                ) : renderError ? (
                    <div className="py-4 px-3 text-center">
                        <span className="text-[9px] text-red-500 font-mono">{renderError}</span>
                    </div>
                ) : titleDataUrl ? (
                    <img
                        src={titleDataUrl}
                        className="w-full h-auto object-contain"
                        alt="Title overlay PNG"
                        style={{ maxHeight: '160px' }}
                    />
                ) : (
                    <span className="py-6 text-[10px] text-gray-400 font-mono italic">
                        Type a title to see preview
                    </span>
                )}
                <div className="absolute top-1.5 right-1.5 bg-black/50 text-white text-[7px] font-mono px-1.5 py-0.5 rounded-full">
                    Transparent PNG
                </div>
            </div>

            {/* Coordinate Info */}
            <div className="grid grid-cols-2 gap-3">
                <div className="bg-white/80 rounded-xl p-3 border border-indigo-100">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">PDF Placement (mm)</p>
                    <div className="space-y-1 font-mono text-[10px] text-gray-700">
                        <div className="flex justify-between">
                            <span className="text-gray-400">X (left edge)</span>
                            <span className="font-bold text-indigo-600">{tx.toFixed(1)} mm</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Y (top edge)</span>
                            <span className="font-bold text-indigo-600">{ty.toFixed(1)} mm</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Width</span>
                            <span className="font-bold text-indigo-600">{tw.toFixed(1)} mm</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Height (≈)</span>
                            <span className="font-bold text-indigo-600">{th.toFixed(1)} mm</span>
                        </div>
                    </div>
                </div>
                <div className="bg-white/80 rounded-xl p-3 border border-indigo-100">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest mb-2">Position</p>
                    <div className="space-y-1 font-mono text-[10px] text-gray-700">
                        <div className="flex justify-between">
                            <span className="text-gray-400">Cover Side</span>
                            <span className={`font-bold uppercase ${side === 'right' ? 'text-orange-500' : 'text-teal-500'}`}>{side}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Center at</span>
                            <span className="font-bold text-indigo-600">{side === 'left' ? '25%' : '75%'} of PDF</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Language</span>
                            <span className="font-bold text-indigo-600">{language === 'ar' ? 'AR (RTL)' : 'EN (LTR)'}</span>
                        </div>
                        <div className="flex justify-between">
                            <span className="text-gray-400">Full PDF W</span>
                            <span className="font-bold text-indigo-600">{PDF_W} mm</span>
                        </div>
                    </div>
                </div>
            </div>

            {/* Cover Map Visualizer */}
            {coverImageUrl && (
                <div className="space-y-1.5">
                    <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">Cover Map</p>
                    <div className="relative w-full aspect-[2/1] bg-gray-200 rounded-xl overflow-hidden border border-gray-300 shadow-sm">
                        <img
                            src={coverImageUrl.startsWith('http') ? coverImageUrl : `data:image/jpeg;base64,${coverImageUrl}`}
                            className="w-full h-full object-cover opacity-80"
                            alt="Cover"
                        />
                        {/* Spine line */}
                        <div className="absolute top-0 bottom-0 left-1/2 w-0.5 bg-white/70" />

                        {/* Title zone, with actual PNG overlaid if available */}
                        <div
                            className="absolute border-2 border-yellow-400 rounded-lg overflow-hidden flex items-center justify-center"
                            style={{
                                left: `${(tx / PDF_W) * 100}%`,
                                top: `${(ty / PDF_H) * 100}%`,
                                width: `${(tw / PDF_W) * 100}%`,
                                height: `${(th / PDF_H) * 100}%`,
                                minHeight: '12px',
                                background: 'rgba(250,204,21,0.15)',
                            }}
                        >
                            {titleDataUrl ? (
                                <img src={titleDataUrl} className="w-full h-full object-contain" alt="title pos" />
                            ) : (
                                <span className="text-[6px] font-black text-yellow-800 whitespace-nowrap">TITLE</span>
                            )}
                        </div>

                        {/* Page labels */}
                        <div className="absolute top-1.5 left-2 text-[7px] font-black text-white bg-black/60 px-1.5 py-0.5 rounded-full">
                            {isAr ? '← Front' : 'Back →'}
                        </div>
                        <div className="absolute top-1.5 right-2 text-[7px] font-black text-white bg-black/60 px-1.5 py-0.5 rounded-full">
                            {isAr ? 'Back →' : '← Front'}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default TitlePreviewPanel;
