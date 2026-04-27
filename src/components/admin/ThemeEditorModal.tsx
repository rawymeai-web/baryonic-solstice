
import React, { useState, useEffect } from 'react';
import type { StoryTheme } from '../../types';
import { Button } from '../ui/Button';

interface ThemeEditorModalProps {
    theme: StoryTheme | null;
    onSave: (theme: StoryTheme) => void;
    onClose: () => void;
}

const newThemeTemplate: StoryTheme = {
    id: '',
    title: { ar: '', en: '' },
    description: { ar: '', en: '' },
    emoji: '',
    category: 'values',
    // Fix: Added missing visualDNA property to satisfy StoryTheme type
    visualDNA: '',
    skeleton: {
        storyCores: ['', '', ''],
        catalysts: ['', '', ''],
        limiters: ['', '', ''],
        themeVisualDNA: ['', '', ''],
        settingMandates: ['', '', '']
    }
};

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="space-y-4 p-5 border rounded-2xl bg-gray-50/30 border-gray-100">
        <h4 className="text-sm font-black text-brand-orange uppercase tracking-widest">{title}</h4>
        {children}
    </div>
);

const OptionGroup: React.FC<{
    label: string;
    options: string[];
    onChange: (idx: number, val: string) => void;
}> = ({ label, options, onChange }) => (
    <div className="space-y-3">
        <label className="block text-xs font-bold text-brand-navy/60 uppercase">{label}</label>
        {options.map((opt, i) => (
            <div key={i} className="flex gap-2">
                <span className="w-6 h-6 flex items-center justify-center bg-brand-navy text-white text-[10px] font-bold rounded-full flex-shrink-0 mt-2">{i + 1}</span>
                <textarea
                    value={opt}
                    onChange={(e) => onChange(i, e.target.value)}
                    placeholder={`Option ${i + 1}...`}
                    className="w-full p-2 text-xs bg-white border border-gray-200 rounded-lg focus:ring-1 focus:ring-brand-coral outline-none min-h-[60px] resize-none"
                />
            </div>
        ))}
    </div>
);

export const ThemeEditorModal: React.FC<ThemeEditorModalProps> = ({ theme, onSave, onClose }) => {
    const [formData, setFormData] = useState<StoryTheme>(newThemeTemplate);
    const [isNew, setIsNew] = useState(true);

    useEffect(() => {
        if (theme) {
            setFormData(theme);
            setIsNew(false);
        } else {
            const newId = `theme-${Date.now()}`;
            setFormData({ ...newThemeTemplate, id: newId });
            setIsNew(true);
        }
    }, [theme]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const updateSkeleton = (category: keyof StoryTheme['skeleton'], index: number, value: string) => {
        setFormData(prev => ({
            ...prev,
            skeleton: {
                ...prev.skeleton,
                [category]: prev.skeleton[category].map((v, i) => i === index ? value : v)
            }
        }));
    };

    return (
        <div className="fixed inset-0 bg-brand-navy/80 backdrop-blur-sm z-50 flex justify-center items-center p-4 overflow-y-auto" onClick={onClose}>
            <div className="bg-white rounded-3xl shadow-2xl p-8 w-full max-w-4xl animate-fade-in-up my-8" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSave} className="space-y-8">
                    <div className="flex justify-between items-center border-b pb-4">
                        <h3 className="text-2xl font-black text-brand-navy tracking-tight">{isNew ? 'New Story Framework' : 'Edit Series Bible Theme'}</h3>
                        <button onClick={onClose} className="text-gray-400 hover:text-brand-orange text-4xl">&times;</button>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Section title="Identity">
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Unique ID</label>
                                    <input value={formData.id} onChange={e => setFormData({ ...formData, id: e.target.value })} className="w-full p-2 bg-gray-50 border rounded-lg text-xs font-mono" disabled={!isNew} />
                                </div>
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Emoji</label>
                                    <input value={formData.emoji} onChange={e => setFormData({ ...formData, emoji: e.target.value })} className="w-full p-2 bg-gray-50 border rounded-lg text-lg text-center" />
                                </div>
                            </div>
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Title (English)</label>
                                    <input value={formData.title.en} onChange={e => setFormData({ ...formData, title: { ...formData.title, en: e.target.value } })} className="w-full p-2 bg-white border rounded-lg text-xs font-bold" />
                                </div>
                                {/* Added input for visualDNA to allow editing this required field */}
                                <div>
                                    <label className="block text-[10px] font-bold text-gray-400 uppercase mb-1">Visual DNA (Top Level)</label>
                                    <textarea
                                        value={formData.visualDNA}
                                        onChange={e => setFormData({ ...formData, visualDNA: e.target.value })}
                                        className="w-full p-2 bg-white border rounded-lg text-xs min-h-[60px] resize-none"
                                        placeholder="Global visual style description..."
                                    />
                                </div>
                            </div>
                        </Section>

                        <Section title="Structure">
                            <OptionGroup label="Story Core (The Emotional Lesson)" options={formData.skeleton.storyCores} onChange={(i, v) => updateSkeleton('storyCores', i, v)} />
                        </Section>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <Section title="Narrative Engines">
                            <OptionGroup label="Catalyst (The Spark)" options={formData.skeleton.catalysts} onChange={(i, v) => updateSkeleton('catalysts', i, v)} />
                            <div className="pt-4">
                                <OptionGroup label="Limiter (The Constraint)" options={formData.skeleton.limiters} onChange={(i, v) => updateSkeleton('limiters', i, v)} />
                            </div>
                        </Section>

                        <Section title="Visual DNA">
                            <OptionGroup label="Theme Visual DNA (Cultural Motifs)" options={formData.skeleton.themeVisualDNA} onChange={(i, v) => updateSkeleton('themeVisualDNA', i, v)} />
                            <div className="pt-4">
                                <OptionGroup label="Setting Mandate (Hard Setting Lock)" options={formData.skeleton.settingMandates} onChange={(i, v) => updateSkeleton('settingMandates', i, v)} />
                            </div>
                        </Section>
                    </div>

                    <div className="flex justify-end gap-4 border-t pt-6">
                        <Button type="button" variant="outline" onClick={onClose} className="!px-10">Cancel</Button>
                        <Button type="submit" className="!px-12 shadow-xl shadow-brand-orange/20">Save Framework</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ThemeEditorModal;
