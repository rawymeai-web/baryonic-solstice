
import React, { useMemo } from 'react';
import type { Language } from '@/types';

interface SpreadLayoutPanelProps {
    spreadIndex: number;
    illustrationUrl?: string;
    textSide: 'left' | 'right';
    language: Language;
    textOffsetX?: number;
    textOffsetY?: number;
    imageOffsetX?: number;
    imageOffsetY?: number;
    imageScale?: number;
    onTextOffsetXChange: (v: number) => void;
    onTextOffsetYChange: (v: number) => void;
    onImageOffsetXChange: (v: number) => void;
    onImageOffsetYChange: (v: number) => void;
    onImageScaleChange: (v: number) => void;
}

// Mirrors the PDF coordinate math in fileService.ts exactly
const PDF_W = 400; // mm â€” spread page (2 Ã— 20cm)
const PDF_H = 200; // mm
const TEXT_W = PDF_W * 0.40; // 160mm â€” matches rectW in fileService

const SliderRow: React.FC<{
    label: string;
    unit: string;
    value: number;
    min: number;
    max: number;
    step: number;
    color: string;
    onChange: (v: number) => void;
}> = ({ label, unit, value, min, max, step, color, onChange }) => (
    <div className="space-y-1">
        <div className="flex justify-between items-center">
            <span className="text-[9px] font-bold text-gray-500 uppercase tracking-widest">{label}</span>
            <div className="flex items-center gap-1">
                <input
                    type="number"
                    value={value}
                    min={min}
                    max={max}
                    step={step}
                    onChange={e => onChange(Number(e.target.value))}
                    className="w-16 text-right text-[10px] font-mono font-bold py-0.5 px-1.5 rounded-md border border-gray-200 bg-white outline-none focus:ring-1 focus:ring-indigo-300"
                    style={{ color }}
                />
                <span className="text-[9px] text-gray-400 font-mono">{unit}</span>
            </div>
        </div>
        <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={e => onChange(Number(e.target.value))}
            className="w-full h-1.5 rounded-full appearance-none cursor-pointer"
            style={{
                background: `linear-gradient(to right, ${color} 0%, ${color} ${((value - min) / (max - min)) * 100}%, #e5e7eb ${((value - min) / (max - min)) * 100}%, #e5e7eb 100%)`
            }}
        />
    </div>
);

const SpreadLayoutPanel: React.FC<SpreadLayoutPanelProps> = ({
    spreadIndex,
    illustrationUrl,
    textSide,
    language,
    textOffsetX,
    textOffsetY,
    imageOffsetX = 0,
    imageOffsetY = 0,
    imageScale = 100,
    onTextOffsetXChange,
    onTextOffsetYChange,
    onImageOffsetXChange,
    onImageOffsetYChange,
    onImageScaleChange,
}) => {
    // Compute default text box position (mirrors fileService logic)
    const textOnLeft = textSide === 'left';
    const defaultX = textOnLeft ? PDF_W * 0.05 : PDF_W * 0.55;
    const TEXT_H_EST = TEXT_W * 0.6; // rough estimate
    const defaultY = (PDF_H / 2) - (TEXT_H_EST / 2);

    const activeX = textOffsetX !== undefined ? textOffsetX : defaultX;
    const activeY = textOffsetY !== undefined ? textOffsetY : defaultY;
    const activeImgOffset = imageOffsetX;
    const activeImgOffsetY = imageOffsetY;

    // For the minimap: scale PDF mm to % of container
    const toPercX = (mm: number) => (mm / PDF_W) * 100;
    const toPercY = (mm: number) => (mm / PDF_H) * 100;
    const textBoxW_perc = (TEXT_W / PDF_W) * 100;
    const textBoxH_perc = (TEXT_H_EST / PDF_H) * 100;

    const imgSrc = useMemo(() => {
        if (!illustrationUrl) return '';
        return illustrationUrl.startsWith('http') || illustrationUrl.startsWith('data:')
            ? illustrationUrl
            : `data:image/jpeg;base64,${illustrationUrl}`;
    }, [illustrationUrl]);

    return (
        <div className="mt-4 p-4 rounded-[1.5rem] bg-gradient-to-br from-indigo-50 to-slate-50 border border-indigo-100 space-y-4">
            <h5 className="text-[9px] font-black text-indigo-500 uppercase tracking-widest flex items-center gap-1.5">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9 20l-5.447-2.724A1 1 0 013 16.382V5.618a1 1 0 011.447-.894L9 7m0 13l6-3m-6 3V7m6 10l4.553 2.276A1 1 0 0021 18.382V7.618a1 1 0 00-.553-.894L15 4m0 13V4m0 0L9 7" />
                </svg>
                Spread {spreadIndex} Layout Map
            </h5>

            {/* Minimap */}
            <div
                className="relative w-full rounded-xl overflow-hidden border border-gray-200 shadow-inner bg-gray-100"
                style={{ aspectRatio: '2 / 1' }}
            >
                {/* Blurred background fill â€” visible only when zoomed out below 100% */}
                {imgSrc && imageScale < 100 && (
                    <img
                        src={imgSrc}
                        aria-hidden="true"
                        className="absolute inset-0 w-full h-full object-cover opacity-60"
                        style={{ filter: 'blur(18px)', transform: 'scale(1.1)' }}
                        alt=""
                    />
                )}

                {/* Illustration */}
                {imgSrc ? (
                    <img
                        src={imgSrc}
                        className="absolute inset-0 w-full h-full object-cover opacity-75"
                        style={{ transform: `scale(${imageScale / 100}) translate(${activeImgOffset}%, ${activeImgOffsetY}%)`, transition: 'transform 0.2s ease' }}
                        alt=""
                    />
                ) : (
                    <div className="absolute inset-0 flex items-center justify-center text-[9px] text-gray-400 font-mono">No image yet</div>
                )}

                {/* Spine line */}
                <div className="absolute top-0 bottom-0 left-1/2 w-px bg-white/60" />

                {/* Text box overlay */}
                <div
                    className="absolute border-2 border-yellow-400 bg-yellow-300/20 rounded flex items-center justify-center transition-all duration-150"
                    style={{
                        left: `${toPercX(activeX)}%`,
                        top: `${toPercY(activeY)}%`,
                        width: `${textBoxW_perc}%`,
                        height: `${textBoxH_perc}%`,
                        minHeight: '8px',
                    }}
                >
                    <span className="text-[6px] font-black text-yellow-900 bg-yellow-300/60 px-1 rounded">TEXT</span>
                </div>

                {/* Image shift indicator */}
                {activeImgOffset !== 0 && (
                    <div className="absolute top-1.5 left-1.5 bg-black/60 text-white text-[7px] font-mono px-1.5 py-0.5 rounded-full">
                        img {activeImgOffset > 0 ? '+' : ''}{activeImgOffset}%
                    </div>
                )}
                <div className="absolute bottom-1 right-1.5 bg-black/40 text-white text-[7px] font-mono px-1.5 py-0.5 rounded-full">
                    {PDF_W}Ã—{PDF_H} mm
                </div>
            </div>

            {/* Stats row */}
            <div className="grid grid-cols-2 gap-2">
                <div className="bg-white/80 rounded-xl p-2.5 border border-indigo-100 space-y-1 font-mono text-[9px]">
                    <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Text Box (mm)</p>
                    <div className="flex justify-between"><span className="text-gray-400">X</span><span className="font-bold text-indigo-600">{activeX.toFixed(1)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Y</span><span className="font-bold text-indigo-600">{activeY.toFixed(1)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">W</span><span className="font-bold text-indigo-600">{TEXT_W.toFixed(1)}</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">H â‰ˆ</span><span className="font-bold text-indigo-600">{TEXT_H_EST.toFixed(1)}</span></div>
                </div>
                <div className="bg-white/80 rounded-xl p-2.5 border border-indigo-100 space-y-1 font-mono text-[9px]">
                    <p className="text-[8px] font-black text-indigo-400 uppercase tracking-widest mb-1">Image Pan & Zoom</p>
                    <div className="flex justify-between"><span className="text-gray-400">Zoom</span><span className="font-bold text-green-500">{imageScale}%</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">Pan</span><span className="font-bold text-orange-500">X:{activeImgOffset}% Y:{activeImgOffsetY}%</span></div>
                    <div className="flex justify-between"><span className="text-gray-400">PDF Res</span><span className="font-bold text-indigo-600">{PDF_W}Ã—{PDF_H}</span></div>
                </div>
            </div>

            {/* Controls */}
            <div className="space-y-3">
                <SliderRow label="Text X (left edge)" unit="mm" value={Math.round(activeX * 10) / 10} min={0} max={PDF_W - TEXT_W} step={1} color="#6366f1" onChange={onTextOffsetXChange} />
                <SliderRow label="Text Y (top edge)" unit="mm" value={Math.round(activeY * 10) / 10} min={5} max={PDF_H - 40} step={1} color="#6366f1" onChange={onTextOffsetYChange} />
                <SliderRow label="Image Zoom / Scale" unit="%" value={imageScale} min={10} max={200} step={1} color="#22c55e" onChange={onImageScaleChange} />
                <SliderRow label="Image Pan X" unit="%" value={activeImgOffset} min={-40} max={40} step={1} color="#f97316" onChange={onImageOffsetXChange} />
                <SliderRow label="Image Pan Y" unit="%" value={activeImgOffsetY} min={-40} max={40} step={1} color="#f97316" onChange={onImageOffsetYChange} />
                
                {/* Reset button */}
                {(textOffsetX !== undefined || textOffsetY !== undefined || imageOffsetX !== 0 || imageOffsetY !== 0 || imageScale !== 100) && (
                    <button
                        onClick={() => {
                            onTextOffsetXChange(defaultX);
                            onTextOffsetYChange(defaultY);
                            onImageOffsetXChange(0);
                            onImageOffsetYChange(0);
                            onImageScaleChange(100);
                        }}
                        className="w-full text-[9px] font-black uppercase text-gray-400 hover:text-red-500 transition-colors py-1 mt-2 block"
                    >
                        â†º Reset to defaults
                    </button>
                )}
            </div>
        </div>
    );
};

export default SpreadLayoutPanel;

