
import React, { useState, useEffect } from 'react';
import type { StoryTheme } from '@/types';

const newThemeTemplate: StoryTheme = {
    id: '',
    title: { ar: '', en: '' },
    description: { ar: '', en: '' },
    emoji: '',
    category: 'values',
    visualDNA: '',
    skeleton: {
        storyCores: ['', '', ''],
        catalysts: ['', '', ''],
        limiters: ['', '', ''],
        themeVisualDNA: ['', '', ''],
        settingMandates: ['', '', '']
    }
};

const Section: React.FC<{ title: string; icon: string; children: React.ReactNode; className?: string }> = ({ title, icon, children, className = '' }) => (
    <div className={`glass-panel p-8 rounded-[2.5rem] border-white/60 bg-white/40 shadow-xl ${className}`}>
        <div className="flex items-center gap-3 mb-6 border-b border-brand-navy/5 pb-4">
            <span className="material-symbols-outlined text-brand-navy/30">{icon}</span>
            <h4 className="text-[10px] font-black text-brand-navy uppercase tracking-[0.2em]">{title}</h4>
        </div>
        <div className="space-y-6">{children}</div>
    </div>
);

const OptionGroup: React.FC<{
    label: string;
    options: string[];
    onChange: (idx: number, val: string) => void;
}> = ({ label, options, onChange }) => (
    <div className="space-y-4">
        <label className="block text-[9px] font-black text-brand-navy/30 uppercase tracking-widest">{label}</label>
        <div className="space-y-3">
            {options.map((opt, i) => (
                <div key={i} className="flex gap-4 group">
                    <div className="w-8 h-8 flex items-center justify-center bg-brand-navy/5 rounded-xl text-[10px] font-black text-brand-navy group-hover:bg-brand-navy group-hover:text-white transition-all shrink-0 mt-1">
                        {i + 1}
                    </div>
                    <textarea
                        value={opt}
                        onChange={(e) => onChange(i, e.target.value)}
                        placeholder={`Parameter ${i + 1}...`}
                        className="w-full p-4 text-[11px] font-medium bg-white/60 border border-white/80 rounded-2xl focus:ring-2 focus:ring-brand-orange/20 focus:border-brand-orange outline-none min-h-[80px] resize-none shadow-sm transition-all text-brand-navy/80 placeholder:text-brand-navy/20"
                    />
                </div>
            ))}
        </div>
    </div>
);

interface ThemeEditorModalProps {
    theme?: StoryTheme | null;
    onSave: (theme: StoryTheme) => void;
    onClose: () => void;
}

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
        <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-2xl z-[100] flex justify-center items-center p-6 animate-in fade-in duration-500 overflow-y-auto" onClick={onClose}>
            <div className="glass-panel w-full max-w-5xl rounded-[4rem] border-white/60 shadow-2xl overflow-hidden flex flex-col my-8 animate-in slide-in-from-bottom-8 duration-700" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSave} className="flex flex-col max-h-[85vh]">
                    {/* Header */}
                    <header className="p-10 border-b border-brand-navy/5 bg-white/40 flex justify-between items-center relative overflow-hidden shrink-0">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-orange via-brand-navy to-brand-teal"></div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="material-symbols-outlined text-brand-navy/20">auto_stories</span>
                                <h3 className="text-3xl font-black text-brand-navy uppercase tracking-tighter">{isNew ? 'New Framework' : 'Framework Architect'}</h3>
                            </div>
                            <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.3em]">{isNew ? 'Define a new series Bible entry' : `Refining Protocol: ${formData.id}`}</p>
                        </div>
                        <button 
                            type="button"
                            onClick={onClose} 
                            className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/60 border border-white/80 text-brand-navy/30 hover:text-brand-orange hover:rotate-90 transition-all shadow-sm"
                        >
                            <span className="material-symbols-outlined text-3xl">close</span>
                        </button>
                    </header>

                    {/* Scrollable Form Content */}
                    <div className="p-10 overflow-y-auto flex-1 bg-white/10 scroller-thin space-y-8">
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Section title="Framework Identity" icon="fingerprint">
                                <div className="grid grid-cols-2 gap-6">
                                    <div className="space-y-1">
                                        <label className="block text-[9px] font-black text-brand-navy/30 uppercase tracking-widest">System Identifier</label>
                                        <input 
                                            value={formData.id} 
                                            onChange={e => setFormData({ ...formData, id: e.target.value })} 
                                            className="w-full p-4 bg-white/40 border border-white/80 rounded-2xl text-xs font-mono text-brand-navy/60 disabled:opacity-50" 
                                            disabled={!isNew} 
                                            placeholder="theme-id-001"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[9px] font-black text-brand-navy/30 uppercase tracking-widest">Visual Icon</label>
                                        <input 
                                            value={formData.emoji} 
                                            onChange={e => setFormData({ ...formData, emoji: e.target.value })} 
                                            className="w-full p-3 bg-white/40 border border-white/80 rounded-2xl text-2xl text-center focus:ring-2 focus:ring-brand-orange/20 outline-none transition-all" 
                                            placeholder="✨"
                                        />
                                    </div>
                                </div>
                                <div className="space-y-4">
                                    <div className="space-y-1">
                                        <label className="block text-[9px] font-black text-brand-navy/30 uppercase tracking-widest">Title Sequence (EN)</label>
                                        <input 
                                            value={formData.title.en} 
                                            onChange={e => setFormData({ ...formData, title: { ...formData.title, en: e.target.value } })} 
                                            className="w-full p-4 bg-white/60 border border-white/80 rounded-2xl text-xs font-black text-brand-navy uppercase tracking-widest focus:ring-2 focus:ring-brand-orange/20 outline-none transition-all" 
                                            placeholder="The Galactic Journey"
                                        />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="block text-[9px] font-black text-brand-navy/30 uppercase tracking-widest">Core Visual Protocol</label>
                                        <textarea
                                            value={formData.visualDNA}
                                            onChange={e => setFormData({ ...formData, visualDNA: e.target.value })}
                                            className="w-full p-4 bg-white/60 border border-white/80 rounded-2xl text-[11px] font-medium min-h-[100px] resize-none focus:ring-2 focus:ring-brand-orange/20 outline-none transition-all text-brand-navy/70"
                                            placeholder="Describe the overarching art style, lighting, and textures..."
                                        />
                                    </div>
                                </div>
                            </Section>

                            <Section title="Emotional Logic" icon="psychology">
                                <OptionGroup 
                                    label="Narrative Cores (Primary Lesson)" 
                                    options={formData.skeleton.storyCores} 
                                    onChange={(i, v) => updateSkeleton('storyCores', i, v)} 
                                />
                            </Section>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Section title="Narrative Engines" icon="settings_input_component">
                                <OptionGroup 
                                    label="Catalysts (The Trigger Event)" 
                                    options={formData.skeleton.catalysts} 
                                    onChange={(i, v) => updateSkeleton('catalysts', i, v)} 
                                />
                                <div className="pt-8 border-t border-brand-navy/5">
                                    <OptionGroup 
                                        label="Limiters (The Narrative Wall)" 
                                        options={formData.skeleton.limiters} 
                                        onChange={(i, v) => updateSkeleton('limiters', i, v)} 
                                    />
                                </div>
                            </Section>

                            <Section title="Aesthetic Mandates" icon="palette">
                                <OptionGroup 
                                    label="Atmospheric Anchors (Cultural Motifs)" 
                                    options={formData.skeleton.themeVisualDNA} 
                                    onChange={(i, v) => updateSkeleton('themeVisualDNA', i, v)} 
                                />
                                <div className="pt-8 border-t border-brand-navy/5">
                                    <OptionGroup 
                                        label="Setting Requirements (Absolute Scenery)" 
                                        options={formData.skeleton.settingMandates} 
                                        onChange={(i, v) => updateSkeleton('settingMandates', i, v)} 
                                    />
                                </div>
                            </Section>
                        </div>
                    </div>

                    {/* Footer */}
                    <footer className="p-10 bg-white/40 border-t border-brand-navy/5 flex justify-end gap-6 shrink-0">
                        <button 
                            type="button" 
                            onClick={onClose} 
                            className="px-10 py-4 rounded-2xl bg-white/60 border border-white/80 text-brand-navy/40 font-black text-[11px] uppercase tracking-[0.2em] hover:text-brand-orange transition-all"
                        >
                            Abort
                        </button>
                        <button 
                            type="submit" 
                            className="px-12 py-4 rounded-2xl bg-brand-navy text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-brand-navy/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3"
                        >
                            <span className="material-symbols-outlined text-xl">database</span>
                            Commit to Database
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
};

export default ThemeEditorModal;
