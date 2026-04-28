import React, { useState } from 'react';
import { StoryData } from '@/types';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { backendApi } from '@/services/backendApi';

interface DNAManagerModalProps {
    storyData: StoryData;
    onClose: () => void;
    onUpdateDNA: (mainDNA?: string, secondDNA?: string) => Promise<void>;
}

export const DNAManagerModal: React.FC<DNAManagerModalProps> = ({ storyData, onClose, onUpdateDNA }) => {
    const [isRegenerating, setIsRegenerating] = useState(false);
    const [mainDNA, setMainDNA] = useState<string | undefined>(
        storyData.styleReferenceImageBase64 || storyData.mainCharacter?.imageDNA?.[0]
    );
    const [secondDNA, setSecondDNA] = useState<string | undefined>(
        storyData.secondCharacter?.imageDNA?.[0] || storyData.secondCharacterImageBase64
    );

    const mainRaw = storyData.mainCharacter?.imageRawUrl || storyData.mainCharacter?.imageBases64?.[0];
    const secondRaw = storyData.secondCharacter?.imageRawUrl || storyData.secondCharacter?.imageBases64?.[0];

    const handleUpload = (type: 'main' | 'second') => {
        const input = document.createElement('input');
        input.type = 'file';
        input.accept = 'image/jpeg, image/png, image/webp';
        input.onchange = (e: any) => {
            const file = e.target.files?.[0];
            if (!file) return;
            const reader = new FileReader();
            reader.onload = (event) => {
                const base64 = (event.target?.result as string).split(',')[1];
                if (type === 'main') setMainDNA(base64);
                else setSecondDNA(base64);
            };
            reader.readAsDataURL(file);
        };
        input.click();
    };

    const handleRegenerate = async () => {
        setIsRegenerating(true);
        try {
            const data: any = await backendApi.generateDna({
                mainCharacter: storyData.mainCharacter,
                secondCharacter: storyData.secondCharacter,
                theme: storyData.theme,
                style: storyData.selectedStylePrompt || "high quality illustration",
                age: storyData.childAge
            });

            if (data.error) {
                throw new Error(data.error);
            }

            if (data.artifiedHeroBase64) setMainDNA(data.artifiedHeroBase64);
            if (data.secondArtifiedHeroBase64) setSecondDNA(data.secondArtifiedHeroBase64);
        } catch (e: any) {
            console.error(e);
            alert(`Failed to regenerate DNA: ${e.message}`);
        } finally {
            setIsRegenerating(false);
        }
    };

    const handleSave = async () => {
        await onUpdateDNA(mainDNA, secondDNA);
        onClose();
    };

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
            <div className="bg-gray-900 border border-gray-700 rounded-xl max-w-4xl w-full flex flex-col max-h-[90vh]">
                <div className="p-6 border-b border-gray-800 flex justify-between items-center">
                    <div>
                        <h2 className="text-xl font-bold text-white">Visual DNA Manager</h2>
                        <p className="text-gray-400 text-sm mt-1">Manage the generated watercolor/art style references (DNA) that drive the storybook illustrations.</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-white transition-colors p-2">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12"></path></svg>
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 space-y-8">
                    {/* Primary Hero */}
                    <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                        <h3 className="text-lg font-semibold text-white mb-4">Primary Hero ({storyData.childName})</h3>
                        <div className="grid grid-cols-2 gap-6">
                            <div>
                                <p className="text-sm text-gray-400 mb-2">Original Raw Photo (Identity)</p>
                                {mainRaw ? (
                                    <img src={mainRaw.startsWith('http') || mainRaw.startsWith('data:') ? mainRaw : `data:image/jpeg;base64,${mainRaw}`} alt="Raw" className="w-full h-48 object-contain bg-gray-900 rounded-lg border border-gray-700" />
                                ) : (
                                    <div className="w-full h-48 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-center text-gray-500">No raw photo</div>
                                )}
                            </div>
                            <div>
                                <p className="text-sm text-amber-400 mb-2 font-medium">Generated Visual DNA (Style Anchor)</p>
                                {mainDNA ? (
                                    <img src={mainDNA.startsWith('http') || mainDNA.startsWith('data:') ? mainDNA : `data:image/jpeg;base64,${mainDNA}`} alt="DNA" className="w-full h-48 object-contain bg-gray-900 rounded-lg border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]" />
                                ) : (
                                    <div className="w-full h-48 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-center text-gray-500">No DNA generated</div>
                                )}
                                <div className="flex gap-2 mt-3">
                                    <Button variant="secondary" onClick={() => handleUpload('main')} className="flex-1 py-1.5 text-xs">Upload Custom</Button>
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Secondary Hero (If exists) */}
                    {storyData.useSecondCharacter && storyData.secondCharacter && (
                        <div className="bg-gray-800/50 rounded-xl p-6 border border-gray-700">
                            <h3 className="text-lg font-semibold text-white mb-4">Secondary Subject ({storyData.secondCharacter.name})</h3>
                            <div className="grid grid-cols-2 gap-6">
                                <div>
                                    <p className="text-sm text-gray-400 mb-2">Original Raw Photo (Identity)</p>
                                    {secondRaw ? (
                                        <img src={secondRaw.startsWith('http') || secondRaw.startsWith('data:') ? secondRaw : `data:image/jpeg;base64,${secondRaw}`} alt="Raw 2" className="w-full h-48 object-contain bg-gray-900 rounded-lg border border-gray-700" />
                                    ) : (
                                        <div className="w-full h-48 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-center text-gray-500">No raw photo</div>
                                    )}
                                </div>
                                <div>
                                    <p className="text-sm text-amber-400 mb-2 font-medium">Generated Visual DNA (Style Anchor)</p>
                                    {secondDNA ? (
                                        <img src={secondDNA.startsWith('http') || secondDNA.startsWith('data:') ? secondDNA : `data:image/jpeg;base64,${secondDNA}`} alt="DNA 2" className="w-full h-48 object-contain bg-gray-900 rounded-lg border border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.1)]" />
                                    ) : (
                                        <div className="w-full h-48 bg-gray-800 rounded-lg border border-gray-700 flex items-center justify-center text-gray-500">No DNA generated</div>
                                    )}
                                    <div className="flex gap-2 mt-3">
                                        <Button variant="secondary" onClick={() => handleUpload('second')} className="flex-1 py-1.5 text-xs">Upload Custom</Button>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                <div className="p-6 border-t border-gray-800 bg-gray-800/30 flex justify-between items-center rounded-b-xl">
                    <Button 
                        variant="secondary" 
                        onClick={handleRegenerate}
                        disabled={isRegenerating}
                        className="flex items-center gap-2 border-indigo-500/30 hover:border-indigo-500 text-indigo-400"
                    >
                        {isRegenerating ? <Spinner size="sm" /> : <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" /></svg>}
                        Auto-Regenerate DNA using Backend
                    </Button>
                    
                    <div className="flex gap-3">
                        <Button variant="secondary" onClick={onClose}>Cancel</Button>
                        <Button 
                            variant="primary" 
                            onClick={handleSave}
                            disabled={isRegenerating}
                        >
                            Save & Restart Pipeline
                        </Button>
                    </div>
                </div>
            </div>
        </div>
    );
};
