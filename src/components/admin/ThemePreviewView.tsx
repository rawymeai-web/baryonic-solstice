import React, { useState, useEffect, useRef } from 'react';
import type { Language, StoryTheme, Character } from '../../types';
import * as adminService from '../../services/adminService';
import { backendApi } from '../../services/backendApi';
import { getGuidelineComponentsForTheme } from '../../services/storyGuidelines';
import { ART_STYLE_OPTIONS } from '../../constants';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';

// @ts-ignore - JSZip is loaded from CDN
const getJSZip = () => typeof window !== 'undefined' ? (window as any).JSZip : null;

interface PreviewResult {
    styleName: string;
    themeName: string;
    imageBase64: string;
    prompt?: string;
    heritageContext?: string;
}

type GenerationStatus = 'pending' | 'loading' | 'done' | 'error';
type PreviewMode = 'singleTheme' | 'multiTheme';

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
            const themeDescription = (selectedTheme.description as any)[language] || selectedTheme.description.en;
            const themeName = selectedTheme.title.en;

            for (const [index, style] of ART_STYLE_OPTIONS.entries()) {
                if (index > 0) await new Promise(resolve => setTimeout(resolve, 5000)); // Reduced delay for faster previews

                const enrichedDescription = heritageData
                    ? `${themeDescription}. Cultural Setting: ${heritageData.goal}. Visual Notes: ${heritageData.illustrationNotes}`
                    : themeDescription;

                await generateSinglePreview(mockCharacter, enrichedDescription, themeName, style.prompt, style.name, heritageData?.goal);
            }
        } else { // multiTheme mode
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
                const themeDescription = (themeForThisStyle.description as any)[language] || themeForThisStyle.description.en;
                const enrichedDescription = heritageData
                    ? `${themeDescription}. Setting: ${heritageData.goal}. Visuals: ${heritageData.illustrationNotes}`
                    : themeDescription;

                const themeName = themeForThisStyle.title.en;
                await generateSinglePreview(mockCharacter, enrichedDescription, themeName, style.prompt, style.name, heritageData?.goal);
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
                age: "5" // Default age for preview
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
            const errorMsg = error?.message || String(error);
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
        const JSZip = getJSZip();
        if (!JSZip) {
            alert("JSZip library is not loaded. Please try again later.");
            return;
        }
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
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
                <h2 className="text-2xl font-bold text-brand-navy">{t('معاين أنماط الرسم', 'Theme Style Previewer')}</h2>
                <p className="text-sm text-gray-500">{t('قم بإنشاء صور تجريبية تجمع بين صورة الطفل وأسلوب الرسم المختار للتأكد من الجودة.', 'Generate test images combining the child photo with chosen art styles to ensure quality.')}</p>

                {isGenerating && (
                    <div className="bg-orange-50 border-l-4 border-brand-orange p-4 mt-4 rounded-r-lg animate-fade-in" role="alert">
                        <p className="font-bold text-brand-navy">{t('جاري إنشاء المعاينات...', 'Generating Previews...')}</p>
                        <p className="text-sm text-gray-700">
                            {t('يرجى التحلي بالصبر، السحر يستغرق وقتاً. نحن نقوم بإنشاء الصور بدون أي نص.', 'Please be patient, magic takes time. We are generating images without any text.')}
                        </p>
                    </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-end">
                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">{t('1. صورة بطل التجربة', '1. Upload Hero Image')}</label>
                        <div
                            className="mt-1 flex justify-center items-center text-center px-6 pt-5 pb-6 border-2 border-gray-300 border-dashed rounded-md cursor-pointer hover:bg-gray-50 transition-colors"
                            onClick={() => fileInputRef.current?.click()}
                        >
                            {characterImage ? (
                                <img src={`data:image/jpeg;base64,${characterImage.base64}`} alt="Character Preview" className="max-h-32 rounded-lg object-contain shadow-md border-2 border-white" />
                            ) : (
                                <div className="space-y-1 text-center text-gray-400">
                                    <svg className="mx-auto h-12 w-12" stroke="currentColor" fill="none" viewBox="0 0 48 48"><path d="M28 8H12a4 4 0 00-4 4v20m32-12v8m0 0v8a4 4 0 01-4 4H12a4 4 0 01-4-4v-4m32-4l-3.172-3.172a4 4 0 00-5.656 0L28 28M8 32l9.172-9.172a4 4 0 015.656 0L28 28m0 0l4 4m4-24h8m-4-4v8" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" /></svg>
                                    <p className="text-xs font-bold uppercase tracking-wider">{t('ارفع صورة الاختبار', 'Upload Test Photo')}</p>
                                </div>
                            )}
                        </div>
                        <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg" />
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('2. اختر المواضيع للمعاينة', '2. Select Themes for Preview')}</label>
                        <div className="flex gap-4 mb-3">
                            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="previewMode" value="singleTheme" checked={previewMode === 'singleTheme'} onChange={() => setPreviewMode('singleTheme')} className="h-4 w-4 text-brand-orange focus:ring-brand-orange" />{t('موضوع واحد', 'Single Theme')}</label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="previewMode" value="multiTheme" checked={previewMode === 'multiTheme'} onChange={() => setPreviewMode('multiTheme')} className="h-4 w-4 text-brand-orange focus:ring-brand-orange" />{t('مواضيع متعددة', 'Multi-Theme Mix')}</label>
                        </div>

                        {previewMode === 'singleTheme' ? (
                            <select value={selectedThemeId} onChange={e => setSelectedThemeId(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-brand-orange focus:border-brand-orange">
                                {themes.map(theme => <option key={theme.id} value={theme.id}>{theme.emoji} {(theme.title as any)[language] || theme.title.en}</option>)}
                            </select>
                        ) : (
                            <div className="border rounded-lg p-3 bg-gray-50/50">
                                <p className="text-xs text-gray-600 mb-2">{t(`اختر المواضيع لربطها مع الأنماط الفنية`, `Select themes to pair with art styles`)} <span className="font-semibold text-brand-orange">({selectedThemeIds.length}/{ART_STYLE_OPTIONS.length})</span></p>
                                <div className="max-h-32 overflow-y-auto grid grid-cols-2 lg:grid-cols-3 gap-2 pr-2 custom-scrollbar">
                                    {themes.map(theme => (
                                        <label key={theme.id} className={`flex items-center space-x-2 rtl:space-x-reverse p-2 rounded-md transition-all text-xs cursor-pointer border ${selectedThemeIds.includes(theme.id) ? 'bg-brand-orange/10 border-brand-orange text-brand-navy font-bold' : 'bg-white border-transparent hover:bg-white hover:border-gray-200'}`}>
                                            <input type="checkbox" checked={selectedThemeIds.includes(theme.id)} onChange={() => handleToggleTheme(theme.id)} className="h-4 w-4 text-brand-orange border-gray-300 rounded focus:ring-brand-orange" />
                                            <span className="truncate">{theme.emoji} {(theme.title as any)[language] || theme.title.en}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div className="md:col-start-3">
                        <Button onClick={handleGenerate} disabled={isGenerateDisabled} className="w-full shadow-lg">
                            {isGenerating ? t('جاري الإنشاء...', 'Generating...') : t('3. عرض المعاينات', '3. Show Previews')}
                        </Button>
                    </div>
                </div>
            </div>

            {(isGenerating || generatedPreviews.length > 0) &&
                <div className="bg-white p-6 rounded-lg shadow animate-fade-in">
                    <div className="flex justify-between items-center mb-6">
                        <h3 className="text-xl font-bold text-brand-navy">{t('معرض معاينة الأنماط (بدون نص)', 'Style Preview Gallery (No Text)')}</h3>
                        {showDownloadButton && <Button onClick={handleDownloadZip} variant="secondary" className="!px-6 !py-2">{t('حفظ الكل ZIP', 'Save All ZIP')}</Button>}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {ART_STYLE_OPTIONS.map(style => {
                            const status = statuses[style.name];
                            const result = generatedPreviews.find(p => p.styleName === style.name);

                            return (
                                <div key={style.name} className="flex flex-col space-y-4 p-4 border rounded-2xl bg-gray-50/30 group hover:bg-white transition-colors">
                                    <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center border-2 transition-all relative overflow-hidden shadow-inner">
                                        {status === 'loading' && (
                                            <div className="flex flex-col items-center">
                                                <Spinner />
                                                <span className="text-[10px] mt-2 font-bold text-brand-orange animate-pulse uppercase tracking-widest">Painting...</span>
                                            </div>
                                        )}
                                        {status === 'error' && (
                                            <div className="text-red-500 p-4 text-center">
                                                <svg className="w-8 h-8 mx-auto mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                                <p className="text-xs font-bold">Generation Failed</p>
                                            </div>
                                        )}
                                        {result && (
                                            <img src={`data:image/jpeg;base64,${result.imageBase64}`} alt={style.name} className="w-full h-full object-cover rounded-lg" />
                                        )}
                                    </div>

                                    <div className="space-y-1">
                                        <p className="text-base font-bold text-brand-navy truncate">{style.name}</p>
                                        <p className="text-xs text-brand-orange font-medium truncate" title={result?.themeName.replace(/_/g, ' ')}>
                                            {result ? result.themeName.replace(/_/g, ' ') : t('جاري التجهيز...', 'Preparing...')}
                                        </p>
                                    </div>

                                    {result && (
                                        <div className="pt-2 border-t border-gray-200">
                                            <p className="text-[10px] font-black text-gray-400 uppercase tracking-tighter mb-1">Model Prompt</p>
                                            <div className="bg-white p-3 rounded-lg border border-gray-100 h-32 overflow-y-auto custom-scrollbar">
                                                <pre className="text-[10px] text-gray-600 whitespace-pre-wrap font-mono leading-tight">
                                                    {result.prompt}
                                                </pre>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            }
        </div>
    );
};

export default ThemePreviewView;