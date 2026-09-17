import React, { useState } from 'react';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

interface OutpaintReviewModalProps {
    isOpen: boolean;
    spreadIndex: number | 'cover';
    originalImageUrl: string;
    outpaintedBase64: string;
    onApply: () => Promise<void>;
    onDiscard: () => void;
    isApplying?: boolean;
    language?: string;
}

export const OutpaintReviewModal: React.FC<OutpaintReviewModalProps> = ({
    isOpen,
    spreadIndex,
    originalImageUrl,
    outpaintedBase64,
    onApply,
    onDiscard,
    isApplying = false,
    language = 'en',
}) => {
    const [viewMode, setViewMode] = useState<'sideBySide' | 'splitSlider'>('sideBySide');
    const [sliderPos, setSliderPos] = useState<number>(50);

    if (!isOpen) return null;

    const isAr = language === 'ar';
    const isCover = spreadIndex === 0 || spreadIndex === 'cover';
    const spreadLabel = isCover 
        ? (isAr ? 'غلاف الكتاب' : 'Book Cover') 
        : (isAr ? `الصفحة المزدوجة ${spreadIndex}` : `Spread ${spreadIndex}`);

    const origSrc = originalImageUrl.startsWith('http') || originalImageUrl.startsWith('data:')
        ? originalImageUrl
        : `data:image/jpeg;base64,${originalImageUrl}`;

    const outpaintSrc = outpaintedBase64.startsWith('http') || outpaintedBase64.startsWith('data:')
        ? outpaintedBase64
        : `data:image/jpeg;base64,${outpaintedBase64}`;

    return (
        <div className="fixed inset-0 z-[9999] bg-slate-950/85 backdrop-blur-md flex items-center justify-center p-3 md:p-6 animate-fadeIn">
            <div className="bg-white rounded-3xl shadow-2xl border border-slate-100 w-full max-w-6xl max-h-[92vh] flex flex-col overflow-hidden">
                
                {/* Header */}
                <div className="px-6 py-4 bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white flex items-center justify-between shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-lg shadow-indigo-500/30 text-white text-base">
                            ✨
                        </div>
                        <div>
                            <div className="flex items-center gap-2">
                                <h3 className="text-sm md:text-base font-black uppercase tracking-wider text-white">
                                    {isAr ? 'معاينة التوسيع الذكي (Outpaint Review)' : 'Outpaint Review & Comparison'}
                                </h3>
                                <span className="bg-indigo-500/30 border border-indigo-400/40 text-indigo-200 text-[10px] font-bold px-2 py-0.5 rounded-full uppercase">
                                    {spreadLabel}
                                </span>
                            </div>
                            <p className="text-[11px] text-slate-300 font-medium">
                                {isAr ? 'قارن بين الصورة الأصلية والصورة الموسعة بالأبعاد والارتفاع الجديد قبل التطبيق' : 'Compare the original composition against the AI-expanded panoramic artwork before applying.'}
                            </p>
                        </div>
                    </div>

                    {/* View mode toggle */}
                    <div className="flex items-center gap-1.5 bg-slate-800/80 p-1 rounded-xl border border-slate-700/50">
                        <button
                            onClick={() => setViewMode('sideBySide')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${viewMode === 'sideBySide' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            {isAr ? 'جنباً إلى جنب' : 'Side by Side'}
                        </button>
                        <button
                            onClick={() => setViewMode('splitSlider')}
                            className={`px-3 py-1 rounded-lg text-xs font-bold transition-all ${viewMode === 'splitSlider' ? 'bg-indigo-600 text-white shadow' : 'text-slate-400 hover:text-white'}`}
                        >
                            {isAr ? 'مقارنة بالسحب' : 'Split Slider'}
                        </button>
                    </div>
                </div>

                {/* Main Content Area */}
                <div className="flex-1 p-6 overflow-y-auto bg-slate-50/50 flex flex-col justify-center items-center gap-4">
                    {viewMode === 'sideBySide' ? (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-5xl">
                            {/* Original */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-slate-400"></span>
                                        {isAr ? 'الصورة الحالية (قبل التوسيع)' : 'Original (Before)'}
                                    </span>
                                </div>
                                <div className="aspect-[2/1] rounded-2xl overflow-hidden bg-slate-200 border-2 border-slate-200 shadow-sm relative group">
                                    <img 
                                        src={origSrc} 
                                        alt="Original" 
                                        className="w-full h-full object-cover" 
                                    />
                                    <div className="absolute top-2 left-2 bg-slate-900/70 text-white text-[9px] font-mono px-2 py-0.5 rounded-md backdrop-blur-xs">
                                        Current
                                    </div>
                                </div>
                            </div>

                            {/* Outpainted */}
                            <div className="flex flex-col gap-2">
                                <div className="flex items-center justify-between px-1">
                                    <span className="text-[11px] font-black uppercase tracking-wider text-indigo-600 flex items-center gap-1.5">
                                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                                        {isAr ? '✨ الصورة الموسعة (مساحة علوية وأفقية إضافية)' : '✨ AI Outpainted (Expanded Headroom & View)'}
                                    </span>
                                </div>
                                <div className="aspect-[2/1] rounded-2xl overflow-hidden bg-slate-900 border-2 border-indigo-400 shadow-xl ring-4 ring-indigo-500/10 relative group">
                                    <img 
                                        src={outpaintSrc} 
                                        alt="Outpainted" 
                                        className="w-full h-full object-cover" 
                                    />
                                    <div className="absolute top-2 left-2 bg-indigo-600 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full shadow-md">
                                        ✨ Ready to Apply
                                    </div>
                                </div>
                            </div>
                        </div>
                    ) : (
                        /* Interactive Split Slider */
                        <div className="w-full max-w-4xl flex flex-col items-center gap-3">
                            <div 
                                className="relative w-full aspect-[2/1] rounded-2xl overflow-hidden shadow-xl border-2 border-indigo-200 select-none cursor-ew-resize bg-slate-900"
                                onMouseMove={(e) => {
                                    if (e.buttons === 1) {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const x = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
                                        setSliderPos((x / rect.width) * 100);
                                    }
                                }}
                                onTouchMove={(e) => {
                                    const touch = e.touches[0];
                                    if (touch) {
                                        const rect = e.currentTarget.getBoundingClientRect();
                                        const x = Math.max(0, Math.min(rect.width, touch.clientX - rect.left));
                                        setSliderPos((x / rect.width) * 100);
                                    }
                                }}
                            >
                                {/* Outpainted (Base) */}
                                <img 
                                    src={outpaintSrc} 
                                    alt="Outpainted" 
                                    className="absolute inset-0 w-full h-full object-cover" 
                                />

                                {/* Original (Clipped Top Layer) */}
                                <div 
                                    className="absolute inset-0 overflow-hidden border-r-2 border-white shadow-2xl"
                                    style={{ width: `${sliderPos}%` }}
                                >
                                    <img 
                                        src={origSrc} 
                                        alt="Original" 
                                        className="absolute inset-0 w-full h-full object-cover max-w-none"
                                        style={{ width: '100%', height: '100%' }}
                                    />
                                </div>

                                {/* Divider handle */}
                                <div 
                                    className="absolute top-0 bottom-0 w-1 bg-white shadow-lg pointer-events-none flex items-center justify-center"
                                    style={{ left: `${sliderPos}%` }}
                                >
                                    <div className="w-7 h-7 bg-white text-indigo-700 rounded-full shadow-xl flex items-center justify-center text-[10px] font-bold border border-indigo-100">
                                        ↔
                                    </div>
                                </div>

                                <div className="absolute top-3 left-3 bg-slate-900/80 text-white text-[9px] font-bold px-2 py-0.5 rounded-md backdrop-blur-xs">
                                    Original
                                </div>
                                <div className="absolute top-3 right-3 bg-indigo-600 text-white text-[9px] font-bold px-2 py-0.5 rounded-md shadow">
                                    ✨ Outpaint
                                </div>
                            </div>
                            <span className="text-[11px] text-slate-400 font-medium">
                                {isAr ? 'اسحب المقبض يميناً ويساراً للمقارنة المباشرة' : 'Drag the slider horizontally to compare original vs outpainted version.'}
                            </span>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="px-6 py-4 bg-white border-t border-slate-100 flex flex-col sm:flex-row items-center justify-between gap-3 shrink-0">
                    <div className="text-[11px] text-slate-500 flex items-center gap-2">
                        <span className="text-base">💡</span>
                        <span>
                            {isAr 
                                ? 'عند الضغط على تطبيق، سيتم استبدال الصورة تلقائياً وإعادة ضبط مقياس الزووم والإزاحة إلى 100% وحفظها في قاعدة البيانات.' 
                                : 'Applying will set this new image as the spread illustration, reset zoom/pan sliders to 100% full-bleed, and save automatically.'}
                        </span>
                    </div>

                    <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
                        <Button
                            variant="secondary"
                            onClick={onDiscard}
                            disabled={isApplying}
                            className="text-xs py-2.5 px-4 font-bold text-slate-600 hover:bg-slate-100"
                        >
                            {isAr ? '❌ إلغاء والإبقاء على الأصلية' : '❌ Discard & Keep Original'}
                        </Button>

                        <Button
                            onClick={onApply}
                            disabled={isApplying}
                            className="bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white text-xs py-2.5 px-6 font-black uppercase tracking-wider shadow-lg shadow-indigo-500/20 flex items-center gap-2"
                        >
                            {isApplying ? (
                                <>
                                    <Spinner size="sm" color="text-white" />
                                    <span>{isAr ? 'جاري التطبيق والحفظ...' : 'Applying & Saving...'}</span>
                                </>
                            ) : (
                                <>
                                    <span>✅</span>
                                    <span>{isAr ? 'تطبيق الصورة الموسعة' : 'Apply Outpainted Image'}</span>
                                </>
                            )}
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default OutpaintReviewModal;