
import React, { useState } from 'react';
import { backendApi } from '@/services/backendApi';
import { compressBase64Image } from '@/utils/imageUtils';
import { Spinner } from '@/components/ui/Spinner';

interface SpreadGeminiEditPanelProps {
    spreadIndex: number;
    illustrationUrl?: string;          // current spread image (base64 or URL)
    stylePrompt: string;               // art style string for consistency
    childDNA?: string;                 // main character reference base64
    secondDNA?: string;                // second character reference base64
    onImageEdited: (newBase64: string) => void; // callback: replace the spread image
}

const SpreadGeminiEditPanel: React.FC<SpreadGeminiEditPanelProps> = ({
    spreadIndex,
    illustrationUrl,
    stylePrompt,
    childDNA,
    secondDNA,
    onImageEdited,
}) => {
    const [isOpen, setIsOpen] = useState(false);
    const [instruction, setInstruction] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [editError, setEditError] = useState('');
    const [lastResult, setLastResult] = useState('');

    const handleApplyEdit = async () => {
        if (!instruction.trim()) return;
        if (!illustrationUrl) {
            setEditError('No image available to edit for this spread yet.');
            return;
        }

        setIsEditing(true);
        setEditError('');
        setLastResult('');

        try {
            // Resolve image to base64 if it's a URL
            let imageBase64 = illustrationUrl;
            if (illustrationUrl.startsWith('http')) {
                const resp = await fetch(illustrationUrl);
                const blob = await resp.blob();
                imageBase64 = await new Promise<string>((res) => {
                    const reader = new FileReader();
                    reader.onloadend = () => res(reader.result as string);
                    reader.readAsDataURL(blob);
                });
                imageBase64 = imageBase64.split(',')[1];
            } else if (illustrationUrl.includes(',')) {
                imageBase64 = illustrationUrl.split(',')[1];
            }

            // Compress to stay under payload limit
            const compressedImage = await compressBase64Image(imageBase64, 1280, 0.88);
            const compressedChild = childDNA ? await compressBase64Image(childDNA, 512, 0.80) : undefined;
            const compressedSecond = secondDNA ? await compressBase64Image(secondDNA, 512, 0.80) : undefined;

            const result = await backendApi.editSpreadImage({
                imageBase64: compressedImage,
                editInstruction: instruction,
                stylePrompt,
                childDNA: compressedChild || undefined,
                secondDNA: compressedSecond || undefined,
            });

            if (!result.imageBase64) throw new Error('No image returned from server.');

            setLastResult(result.imageBase64);
            onImageEdited(result.imageBase64);
        } catch (e: any) {
            console.error('Gemini edit failed:', e);
            setEditError(e.message || 'Edit failed. Please try rephrasing.');
        } finally {
            setIsEditing(false);
        }
    };

    return (
        <div className="mt-3 rounded-[1.5rem] border border-purple-100 overflow-hidden">
            {/* Collapsible Header */}
            <button
                onClick={() => setIsOpen(v => !v)}
                className="w-full flex items-center justify-between px-5 py-3 bg-gradient-to-r from-purple-50 to-indigo-50 hover:from-purple-100 hover:to-indigo-100 transition-colors group"
            >
                <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-lg bg-purple-500/10 flex items-center justify-center">
                        <svg className="w-3.5 h-3.5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.347.347a3.5 3.5 0 01-4.95 0l-.347-.347z" />
                        </svg>
                    </div>
                    <span className="text-[10px] font-black text-purple-600 uppercase tracking-widest">
                        Gemini Image Fix
                    </span>
                    {!illustrationUrl && (
                        <span className="text-[8px] text-gray-400 font-mono">(generate image first)</span>
                    )}
                </div>
                <svg
                    className={`w-4 h-4 text-purple-400 transition-transform duration-200 ${isOpen ? 'rotate-180' : ''}`}
                    fill="none" viewBox="0 0 24 24" stroke="currentColor"
                >
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
            </button>

            {/* Panel Body */}
            {isOpen && (
                <div className="p-5 bg-white space-y-4">
                    {/* Before / After thumbnails */}
                    {(illustrationUrl || lastResult) && (
                        <div className="grid grid-cols-2 gap-3">
                            {illustrationUrl && (
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-gray-400 uppercase tracking-widest">Before</p>
                                    <div className="aspect-[16/9] rounded-xl overflow-hidden bg-gray-100 border border-gray-200">
                                        <img
                                            src={illustrationUrl.startsWith('http') || illustrationUrl.startsWith('data:') ? illustrationUrl : `data:image/jpeg;base64,${illustrationUrl}`}
                                            className="w-full h-full object-cover"
                                            alt="before"
                                        />
                                    </div>
                                </div>
                            )}
                            {lastResult && (
                                <div className="space-y-1">
                                    <p className="text-[8px] font-black text-teal-500 uppercase tracking-widest">After ✓</p>
                                    <div className="aspect-[16/9] rounded-xl overflow-hidden bg-gray-100 border-2 border-teal-300">
                                        <img
                                            src={lastResult.startsWith('data:') ? lastResult : `data:image/jpeg;base64,${lastResult}`}
                                            className="w-full h-full object-cover"
                                            alt="after"
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Instruction input */}
                    <div className="space-y-2">
                        <label className="text-[9px] font-black text-purple-500 uppercase tracking-widest">
                            Describe what to fix
                        </label>
                        <textarea
                            value={instruction}
                            onChange={e => setInstruction(e.target.value)}
                            placeholder={'e.g. "Make the sky golden sunset colors"\n"Remove the extra person on the left"\n"Change the background to a cozy indoor room"'}
                            rows={3}
                            disabled={isEditing}
                            className="w-full p-3 bg-purple-50 border border-purple-100 rounded-xl text-sm focus:ring-2 focus:ring-purple-200 outline-none font-medium leading-relaxed resize-none disabled:opacity-50"
                        />
                        <p className="text-[8px] text-gray-400 font-mono">
                            Characters, poses, and layout are preserved. Only the described change is applied.
                        </p>
                    </div>

                    {/* Error */}
                    {editError && (
                        <div className="p-3 rounded-xl bg-red-50 border border-red-200 text-[10px] text-red-600 font-mono">
                            ⚠ {editError}
                        </div>
                    )}

                    {/* Actions */}
                    <div className="flex gap-3">
                        <button
                            onClick={handleApplyEdit}
                            disabled={isEditing || !instruction.trim() || !illustrationUrl}
                            className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-purple-600 hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed text-white text-[10px] font-black uppercase tracking-widest rounded-xl transition-all shadow-sm active:scale-95"
                        >
                            {isEditing ? (
                                <>
                                    <Spinner size="sm" />
                                    <span>Editing...</span>
                                </>
                            ) : (
                                <>
                                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
                                    </svg>
                                    Apply Edit
                                </>
                            )}
                        </button>
                        {lastResult && (
                            <button
                                onClick={() => {
                                    setLastResult('');
                                    setInstruction('');
                                    setEditError('');
                                }}
                                className="px-4 py-3 border border-gray-200 text-[10px] font-black uppercase tracking-widest text-gray-500 hover:text-red-500 hover:border-red-200 rounded-xl transition-all"
                            >
                                Clear
                            </button>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
};

export default SpreadGeminiEditPanel;
