
'use client';

import React, { useState, useEffect, useRef } from 'react';
import type { Language, StoryTheme, Character } from '../../types';
import * as adminService from '../../services/adminService';
import * as geminiService from '../../services/geminiService';
import { ART_STYLE_OPTIONS } from '../../constants';
import { Button } from '../ui/Button';
import { Spinner } from '../ui/Spinner';

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
            images: [],
            imageBases64: [characterImage.base64],
            description: 'A test character'
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
                const { imageBase64, prompt } = await geminiService.generateThemeStylePreview(
                    character,
                    undefined,
                    themeDescription,
                    stylePrompt,
                    "5"
                );
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

        if (previewMode === 'singleTheme') {
            const selectedTheme = themes.find(t => t.id === selectedThemeId);
            if (!selectedTheme) {
                setIsGenerating(false);
                return;
            }

            const themeDescription = selectedTheme.description[language as 'ar' | 'en'] || selectedTheme.description.en;
            const themeName = selectedTheme.title.en;

            for (const [index, style] of ART_STYLE_OPTIONS.entries()) {
                if (index > 0) await new Promise(resolve => setTimeout(resolve, 3000));
                await generateSinglePreview(mockCharacter, themeDescription, themeName, style.prompt, style.name);
            }
        } else {
            const selectedThemes = themes.filter(t => selectedThemeIds.includes(t.id));
            if (selectedThemes.length === 0) {
                setIsGenerating(false);
                return;
            }
            const shuffledThemes = [...selectedThemes].sort(() => 0.5 - Math.random());

            for (let i = 0; i < ART_STYLE_OPTIONS.length; i++) {
                if (i > 0) await new Promise(resolve => setTimeout(resolve, 3000));

                const style = ART_STYLE_OPTIONS[i];
                const themeForThisStyle = shuffledThemes[i % shuffledThemes.length];
                const themeDescription = themeForThisStyle.description[language as 'ar' | 'en'] || themeForThisStyle.description.en;
                const themeName = themeForThisStyle.title.en;
                await generateSinglePreview(mockCharacter, themeDescription, themeName, style.prompt, style.name);
            }
        }

        setIsGenerating(false);
    };

    const handleToggleTheme = (themeId: string) => {
        setSelectedThemeIds(prev =>
            prev.includes(themeId)
                ? prev.filter(id => id !== themeId)
                : [...prev, themeId]
        );
    };

    const isGenerateDisabled = !characterImage || isGenerating ||
        (previewMode === 'singleTheme' && !selectedThemeId) ||
        (previewMode === 'multiTheme' && selectedThemeIds.length === 0);

    return (
        <div className="space-y-6">
            <div className="bg-white p-6 rounded-lg shadow space-y-4">
                <h2 className="text-2xl font-bold text-brand-navy">{t('معاين أنماط الرسم', 'Theme Style Previewer')}</h2>
                <p className="text-sm text-gray-500">{t('قم بإنشاء صور تجريبية تجمع بين صورة الطفل وأسلوب الرسم المختار للتأكد من الجودة.', 'Generate test images combining the child photo with chosen art styles to ensure quality.')}</p>

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
                    </div>
                    <div className="md:col-span-2">
                        <label className="block text-sm font-medium text-gray-700 mb-2">{t('2. اختر المواضيع للمعاينة', '2. Select Themes for Preview')}</label>
                        <div className="flex gap-4 mb-3">
                            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="previewMode" value="singleTheme" checked={previewMode === 'singleTheme'} onChange={() => setPreviewMode('singleTheme')} className="h-4 w-4 text-brand-orange focus:ring-brand-orange" />{t('موضوع واحد', 'Single Theme')}</label>
                            <label className="flex items-center gap-2 text-sm cursor-pointer"><input type="radio" name="previewMode" value="multiTheme" checked={previewMode === 'multiTheme'} onChange={() => setPreviewMode('multiTheme')} className="h-4 w-4 text-brand-orange focus:ring-brand-orange" />{t('مواضيع متعددة', 'Multi-Theme Mix')}</label>
                        </div>

                        {previewMode === 'singleTheme' ? (
                            <select value={selectedThemeId} onChange={e => setSelectedThemeId(e.target.value)} className="mt-1 block w-full px-3 py-2 bg-white border border-gray-300 rounded-md shadow-sm focus:ring-brand-orange focus:border-brand-orange">
                                {themes.map(theme => <option key={theme.id} value={theme.id}>{theme.emoji} {theme.title[language as 'ar' | 'en'] || theme.title.en}</option>)}
                            </select>
                        ) : (
                            <div className="border rounded-lg p-3 bg-gray-50/50">
                                <div className="max-h-32 overflow-y-auto grid grid-cols-2 lg:grid-cols-3 gap-2 pr-2">
                                    {themes.map(theme => (
                                        <label key={theme.id} className={`flex items-center space-x-2 rtl:space-x-reverse p-2 rounded-md transition-all text-xs cursor-pointer border ${selectedThemeIds.includes(theme.id) ? 'bg-brand-orange/10 border-brand-orange text-brand-navy font-bold' : 'bg-white border-transparent hover:bg-white hover:border-gray-200'}`}>
                                            <input type="checkbox" checked={selectedThemeIds.includes(theme.id)} onChange={() => handleToggleTheme(theme.id)} className="h-4 w-4 text-brand-orange border-gray-300 rounded focus:ring-brand-orange" />
                                            <span className="truncate">{theme.emoji} {theme.title[language as 'ar' | 'en'] || theme.title.en}</span>
                                        </label>
                                    ))}
                                </div>
                            </div>
                        )}
                    </div>
                    <div>
                        <Button onClick={handleGenerate} disabled={isGenerateDisabled} className="w-full shadow-lg">
                            {isGenerating ? t('جاري الإنشاء...', 'Generating...') : t('3. عرض المعاينات', '3. Show Previews')}
                        </Button>
                    </div>
                    <input type="file" ref={fileInputRef} onChange={handleFileChange} className="hidden" accept="image/png, image/jpeg" />
                </div>
            </div>

            {(isGenerating || generatedPreviews.length > 0) &&
                <div className="bg-white p-6 rounded-lg shadow animate-fade-in">
                    <h3 className="text-xl font-bold text-brand-navy mb-6">{t('معرض معاينة الأنماط', 'Style Preview Gallery')}</h3>
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-8">
                        {ART_STYLE_OPTIONS.map(style => {
                            const status = statuses[style.name];
                            const result = generatedPreviews.find(p => p.styleName === style.name);

                            return (
                                <div key={style.name} className="flex flex-col space-y-4 p-4 border rounded-2xl bg-gray-50/30">
                                    <div className="aspect-square bg-gray-100 rounded-xl flex items-center justify-center border-2 relative overflow-hidden shadow-inner">
                                        {status === 'loading' && <Spinner />}
                                        {status === 'error' && <p className="text-red-500 text-xs">Failed</p>}
                                        {result && <img src={`data:image/jpeg;base64,${result.imageBase64}`} alt={style.name} className="w-full h-full object-cover rounded-lg" />}
                                    </div>
                                    <div className="space-y-1">
                                        <p className="text-base font-bold text-brand-navy truncate">{style.name}</p>
                                        <p className="text-xs text-brand-orange font-medium truncate">{result?.themeName.replace(/_/g, ' ') || '...'}</p>
                                    </div>
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
