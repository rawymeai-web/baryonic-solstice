import React, { useState, useEffect, useRef } from 'react';
import type { Language, StoryTheme, Character } from '@/types';
import * as adminService from '@/services/adminService';
import { backendApi } from '@/services/backendApi';
import { getGuidelineComponentsForTheme } from '@/services/storyGuidelines';
import { ART_STYLE_OPTIONS } from '@/constants';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

// @ts-ignore - JSZip is loaded from CDN
const JSZip = typeof window !== 'undefined' ? (window as any).JSZip : null;

interface PreviewResult {
    styleName: string;
    themeName: string;
    imageBase64: string;
    prompt?: string;
    heritageContext?: string;
}

type GenerationStatus = 'pending' | 'loading' | 'done' | 'error';
type PreviewMode = 'singleTheme' | 'multiTheme';

const LabGlassSection: React.FC<{ title: string; icon: string; children: React.ReactNode; color?: string }> = ({ title, icon, children, color = 'text-brand-navy' }) => (
    <div className="glass-panel p-10 rounded-[3.5rem] border-white/60 bg-white/40 shadow-xl space-y-8 relative overflow-hidden">
        <div className="flex items-center gap-4 border-b border-brand-navy/5 pb-6">
            <div className={`w-12 h-12 rounded-2xl bg-white flex items-center justify-center ${color} shadow-sm border border-white/60`}>
                <span className="material-symbols-outlined text-2xl">{icon}</span>
            </div>
            <h3 className="text-sm font-black uppercase tracking-[0.2em] text-brand-navy">{title}</h3>
        </div>
        <div className="space-y-6">
            {children}
        </div>
    </div>
);

export const ThemePreviewView: React.FC<{ language: Language }> = ({ language }) => {
    const [characterImage, setCharacterImage] = useState<{ file: File, base64: string } | null>(null);
    const [themes, setThemes] = useState<StoryTheme[]>([]);

    const [previewMode, setPreviewMode] = useState<PreviewMode>('singleTheme');
    const [selectedThemeId, setSelectedThemeId] = useState<string>('');
    const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>([]);

    const [generatedPreviews, setGeneratedPreviews] = useState<PreviewResult[]>([]);
    const [isGenerating, setIsGenerating] = useState(false);
    const [statuses, setStatuses] = useState<Record<string, GenerationStatus>>({});
    const fileInputRef = useRef<HTMLInputElement>(null);

    useEffect(() => {
        adminService.getThemes().then(allThemes => {
            setThemes(allThemes);
            if (allThemes.length > 0) {
                setSelectedThemeId(allThemes[0].id);
            }
        });
    }, []);

    const t = (ar: string, en: string) => language === 'ar' ? ar : en;

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.files && e.target.files[0]) {
            const file = e.target.files[0];
            const reader = new FileReader();
            reader.onload = () => {
                const base64 = (reader.result as string).split(',')[1];
                setCharacterImage({ file, base64 });
            };
            reader.readAsDataURL(file);
        }
    };

    const handleGenerate = async () => {
        if (!characterImage) return;
        setIsGenerating(true);
        setGeneratedPreviews([]);

        const initialStatuses: Record<string, GenerationStatus> = {};
        ART_STYLE_OPTIONS.forEach(style => {
            initialStatuses[style.name] = 'loading';
        });
        setStatuses(initialStatuses);

        const mockCharacter: Character = {
            name: 'Test',
            type: 'person',
            images: [characterImage.file],
            imageBases64: [characterImage.base64],
            description: 'A test character'
        };

        if (previewMode === 'singleTheme') {
            const selectedTheme = themes.find(t => t.id === selectedThemeId);
            if (!selectedTheme) {
                setIsGenerating(false);
                return;
            }

            const heritageData = getGuidelineComponentsForTheme(selectedTheme.id);
            const themeDescription = selectedTheme.description[language];
            const themeName = selectedTheme.title.en;

            for (const [index, style] of ART_STYLE_OPTIONS.entries()) {
                if (index > 0) await new Promise(resolve => setTimeout(resolve, 5000));

                const enrichedDescription = heritageData
                    ? `${themeDescription}. Cultural Setting: ${heritageData.goal}. Visual Notes: ${heritageData.illustrationNotes}`
                    : themeDescription;

                await generateSinglePreview(mockCharacter, enrichedDescription || '', themeName, style.prompt, style.name, heritageData?.goal);
            }
        } else {
            const selectedThemes = themes.filter(t => selectedThemeIds.includes(t.id));
            if (selectedThemes.length === 0) {
                setIsGenerating(false);
                return;
            }
            const shuffledThemes = [...selectedThemes].sort(() => 0.5 - Math.random());

            for (let i = 0; i < ART_STYLE_OPTIONS.length; i++) {
                if (i > 0) await new Promise(resolve => setTimeout(resolve, 5000));

                const style = ART_STYLE_OPTIONS[i];
                const themeForThisStyle = shuffledThemes[i % shuffledThemes.length];

                const heritageData = getGuidelineComponentsForTheme(themeForThisStyle.id);
                const themeDescription = themeForThisStyle.description[language];
                const enrichedDescription = heritageData
                    ? `${themeDescription}. Setting: ${heritageData.goal}. Visuals: ${heritageData.illustrationNotes}`
                    : themeDescription;

                const themeName = themeForThisStyle.title.en;
                await generateSinglePreview(mockCharacter, enrichedDescription || '', themeName, style.prompt, style.name, heritageData?.goal);
            }
        }

        setIsGenerating(false);
    };

    const generateSinglePreview = async (
        character: Character,
        themeDescription: string,
        themeName: string,
        stylePrompt: string,
        styleName: string,
        heritageContext?: string
    ) => {
        try {
            const { imageBase64, prompt } = await backendApi.generatePreview({
                character,
                themeDescription,
                stylePrompt,
                age: "5"
            }) as any;
            setGeneratedPreviews(prev => [...prev, {
                styleName: styleName,
                themeName: themeName.replace(/\s/g, '_'),
                imageBase64,
                prompt,
                heritageContext
            }]);
            setStatuses(prev => ({ ...prev, [styleName]: 'done' }));
        } catch (error: any) {
            console.error(`Failed to generate for style ${styleName}:`, error);
            setStatuses(prev => ({ ...prev, [styleName]: 'error' }));
        }
    };

    const handleToggleTheme = (themeId: string) => {
        setSelectedThemeIds(prev =>
            prev.includes(themeId)
                ? prev.filter(id => id !== themeId)
                : [...prev, themeId]
        );
    };

    const handleDownloadZip = async () => {
        if (generatedPreviews.length === 0) return;
        const zip = new JSZip();

        const themeName = previewMode === 'singleTheme'
            ? themes.find(t => t.id === selectedThemeId)?.title.en.replace(/[^a-zA-Z0-9]/g, '_') || 'single_theme'
            : 'multi_theme_mix';

        generatedPreviews.forEach(preview => {
            const styleName = preview.styleName.replace(/[^a-zA-Z0-9]/g, '_');
            const fileName = `${styleName}_${preview.themeName}.jpeg`;
            zip.file(fileName, preview.imageBase64, { base64: true });
            if (preview.prompt) {
                zip.file(`${styleName}_${preview.themeName}_prompt.txt`, preview.prompt);
            }
        });

        const content = await zip.generateAsync({ type: 'blob' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(content);
        link.download = `Albumii_Style_Previews_${themeName}.zip`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
    };

    const isGenerateDisabled = !characterImage || isGenerating ||
        (previewMode === 'singleTheme' && !selectedThemeId) ||
        (previewMode === 'multiTheme' && selectedThemeIds.length === 0);
    const showDownloadButton = generatedPreviews.length > 0 && !isGenerating;

    return (
        <div className="max-w-7xl mx-auto space-y-12 animate-in fade-in duration-700 pb-20">
            <div className="text-center space-y-4">
                <div className="inline-flex items-center gap-3 px-6 py-2 bg-brand-navy text-white rounded-full text-[10px] font-black uppercase tracking-widest shadow-xl">
                    <span className="material-symbols-outlined text-sm">biotech</span>
                    R&D Terminal
                </div>
                <h2 className="text-5xl font-black text-brand-navy uppercase tracking-tighter">Visual Resonance Laboratory</h2>
                <p className="text-[11px] font-black text-brand-navy/30 uppercase tracking-[0.4em]">Validate style-theme synthesis across neural engines</p>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
                <div className="lg:col-span-4 space-y-8">
                    <LabGlassSection title="Specimen Input" icon="face" color="text-brand-orange">
                        <div 
                            className="aspect-square w-full border-4 border-dashed border-white/80 rounded-[3rem] bg-white/40 hover:bg-white/60 transition-all cursor-pointer group relative overflow-hidden flex items-center justify-center"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {characterImage ? (
                                <img src={`data:image/jpeg;base64,${characterImage.base64}`} alt="Character Preview" className="absolute inset-0 w-full h-full object-cover rounded-[2.5rem]" />
                            ) : (
                                <div className="text-center p-8">
                                    <span className="material-symbols-outlined text-5xl text-brand-orange/30 mb-3">add_photo_alternate</span>
                                    <p className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">Inject Subject DNA</p>
                                </div>
                            )}
                            <div className="absolute inset-0 bg-brand-orange/5 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg" />
                    </LabGlassSection>
                </div>

                <div className="lg:col-span-8 space-y-8">
                    <LabGlassSection title="Configuration Matrix" icon="tune" color="text-brand-teal">
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest ml-1">Synthesis Mode</label>
                                <div className="flex p-2 bg-white/40 rounded-3xl border-2 border-white/80 gap-2">
                                    {[
                                        { id: 'singleTheme', label: 'Single Pivot', icon: 'center_focus_strong' },
                                        { id: 'multiTheme', label: 'Theme Lattice', icon: 'hub' }
                                    ].map(mode => (
                                        <button
                                            key={mode.id}
                                            onClick={() => setPreviewMode(mode.id as PreviewMode)}
                                            className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-2xl text-[10px] font-black uppercase tracking-widest transition-all ${previewMode === mode.id ? 'bg-brand-navy text-white shadow-lg' : 'text-brand-navy/40 hover:text-brand-navy'}`}
                                        >
                                            <span className="material-symbols-outlined text-sm">{mode.icon}</span>
                                            {mode.label}
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="space-y-4">
                                <label className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest ml-1">Registry Selection</label>
                                {previewMode === 'singleTheme' ? (
                                    <select 
                                        value={selectedThemeId} 
                                        onChange={e => setSelectedThemeId(e.target.value)} 
                                        className="w-full px-6 py-4 bg-white/60 border-2 border-white/80 rounded-2xl outline-none focus:border-brand-teal focus:ring-4 focus:ring-brand-teal/5 transition-all text-sm font-black text-brand-navy appearance-none"
                                    >
                                        {themes.map(theme => <option key={theme.id} value={theme.id}>{theme.emoji} {theme.title[language]}</option>)}
                                    </select>
                                ) : (
                                    <div className="px-6 py-4 bg-white/60 border-2 border-white/80 rounded-2xl max-h-32 overflow-y-auto custom-scrollbar">
                                        <div className="grid grid-cols-1 gap-2">
                                            {themes.map(theme => (
                                                <label key={theme.id} className="flex items-center gap-3 cursor-pointer group">
                                                    <input 
                                                        type="checkbox" 
                                                        checked={selectedThemeIds.includes(theme.id)} 
                                                        onChange={() => handleToggleTheme(theme.id)}
                                                        className="w-4 h-4 rounded border-2 border-brand-teal/20 text-brand-teal focus:ring-brand-teal"
                                                    />
                                                    <span className={`text-[10px] font-black uppercase tracking-wider ${selectedThemeIds.includes(theme.id) ? 'text-brand-navy' : 'text-brand-navy/30'}`}>{theme.emoji} {theme.title[language]}</span>
                                                </label>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>

                        <button 
                            onClick={handleGenerate} 
                            disabled={isGenerateDisabled}
                            className="w-full py-8 bg-brand-navy text-white rounded-[2.5rem] font-black uppercase text-sm tracking-[0.4em] shadow-2xl shadow-brand-navy/30 hover:-translate-y-1 active:scale-95 transition-all flex items-center justify-center gap-6 group mt-4"
                        >
                            {isGenerating ? (
                                <><Spinner /> <span className="animate-pulse">Sequencing Neural Pathways...</span></>
                            ) : (
                                <>
                                    <span className="material-symbols-outlined text-3xl group-hover:rotate-180 transition-transform duration-700">science</span>
                                    Execute Style Synthesis
                                </>
                            )}
                        </button>
                    </LabGlassSection>
                </div>
            </div>

            {(isGenerating || generatedPreviews.length > 0) && (
                <div className="space-y-10 animate-in slide-in-from-bottom-12 duration-1000">
                    <div className="flex justify-between items-end border-b border-brand-navy/5 pb-6">
                        <div className="space-y-1">
                            <h3 className="text-3xl font-black text-brand-navy uppercase tracking-tighter">Resonance Gallery</h3>
                            <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.3em]">Direct neural outputs without typographic overlays</p>
                        </div>
                        {showDownloadButton && (
                            <button 
                                onClick={handleDownloadZip} 
                                className="px-10 py-5 rounded-3xl bg-brand-orange text-white font-black uppercase text-[10px] tracking-widest shadow-2xl hover:-translate-y-1 active:scale-95 transition-all flex items-center gap-3"
                            >
                                <span className="material-symbols-outlined">download_for_offline</span>
                                Export Package
                            </button>
                        )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-10">
                        {ART_STYLE_OPTIONS.map(style => {
                            const status = statuses[style.name];
                            const result = generatedPreviews.find(p => p.styleName === style.name);

                            return (
                                <div key={style.name} className="glass-panel p-8 rounded-[3.5rem] border-white/60 bg-white/40 shadow-xl space-y-6 flex flex-col group">
                                    <div className="aspect-square rounded-[2.5rem] overflow-hidden border-4 border-white shadow-inner relative flex items-center justify-center bg-brand-navy/[0.02]">
                                        {status === 'loading' && (
                                            <div className="flex flex-col items-center">
                                                <Spinner />
                                                <span className="text-[9px] mt-4 font-black text-brand-orange animate-pulse uppercase tracking-[0.2em]">Neural Painting...</span>
                                            </div>
                                        )}
                                        {status === 'error' && (
                                            <div className="text-brand-orange p-6 text-center">
                                                <span className="material-symbols-outlined text-4xl mb-2">signal_cellular_connected_no_internet_4_bar</span>
                                                <p className="text-[9px] font-black uppercase tracking-widest">Synthesis Interrupt</p>
                                            </div>
                                        )}
                                        {result && (
                                            <img src={`data:image/jpeg;base64,${result.imageBase64}`} alt={style.name} className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-110" />
                                        )}
                                        <div className="absolute top-6 left-6 px-4 py-1.5 bg-black/40 backdrop-blur-md rounded-full border border-white/20">
                                            <p className="text-[8px] font-black text-white uppercase tracking-widest">{style.name}</p>
                                        </div>
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-widest">Active Context</p>
                                        <p className="text-xs font-black text-brand-navy uppercase truncate" title={result?.themeName.replace(/_/g, ' ')}>
                                            {result ? result.themeName.replace(/_/g, ' ') : 'Pending Lattice...'}
                                        </p>
                                    </div>

                                    <div className="flex-1 flex flex-col min-h-[140px]">
                                        <div className="flex items-center gap-2 mb-2">
                                            <span className="material-symbols-outlined text-xs text-brand-teal">terminal</span>
                                            <p className="text-[9px] font-black text-brand-teal uppercase tracking-widest">Neural Prompt Output</p>
                                        </div>
                                        <div className="flex-1 bg-brand-navy/95 p-4 rounded-3xl overflow-y-auto custom-scrollbar border border-white/10 shadow-2xl">
                                            <pre className="text-[10px] text-brand-teal/80 whitespace-pre-wrap font-mono leading-relaxed">
                                                {result?.prompt || 'Waiting for neural stream...'}
                                            </pre>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>
            )}
        </div>
    );
};

export default ThemePreviewView;