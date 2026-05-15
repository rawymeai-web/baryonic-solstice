
import React, { useState, useEffect } from 'react';
import type { ProductSize } from '@/types';

interface ProductEditorModalProps {
    product: ProductSize | null;
    onSave: (product: ProductSize) => void;
    onClose: () => void;
}

const newProductTemplate: ProductSize = {
    id: '',
    name: '',
    price: 0,
    previewImageUrl: '',
    isAvailable: true,
    cover: { totalWidthCm: 0, totalHeightCm: 0, spineWidthCm: 0 },
    page: { widthCm: 0, heightCm: 0 },
    margins: { topCm: 0, bottomCm: 0, outerCm: 0, innerCm: 0 },
    coverContent: {
        barcode: { fromRightCm: 0, fromTopCm: 0, widthCm: 0, heightCm: 0 },
        format: { fromTopCm: 0, widthCm: 0, heightCm: 0 },
        title: { fromTopCm: 0, widthCm: 0, heightCm: 0 }
    }
};

const Section: React.FC<{ title: string; icon: string; children: React.ReactNode }> = ({ title, icon, children }) => (
    <div className="glass-panel p-8 rounded-[2.5rem] border-white/60 bg-white/40 shadow-xl space-y-6">
        <div className="flex items-center gap-3 border-b border-brand-navy/5 pb-4">
            <span className="material-symbols-outlined text-brand-navy/30 text-xl">{icon}</span>
            <h4 className="text-[10px] font-black text-brand-navy uppercase tracking-[0.2em]">{title}</h4>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">{children}</div>
    </div>
);

const NumberInput: React.FC<{ label: string; value: number; onChange: (val: number) => void; step?: number }> = ({ label, value, onChange, step = 0.1 }) => (
    <div className="space-y-1">
        <label className="block text-[9px] font-black text-brand-navy/30 uppercase tracking-widest ml-1">{label}</label>
        <input
            type="number"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            step={step}
            className="w-full px-5 py-3 bg-white/60 border-2 border-white/80 rounded-2xl outline-none focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/5 transition-all text-xs font-bold text-brand-navy"
        />
    </div>
);

const TextInput: React.FC<{ label: string; value: string; onChange: (val: string) => void; required?: boolean; disabled?: boolean; placeholder?: string }> = ({ label, value, onChange, required, disabled, placeholder }) => (
    <div className="space-y-1">
        <label className="block text-[9px] font-black text-brand-navy/30 uppercase tracking-widest ml-1">{label}</label>
        <input
            value={value}
            onChange={(e) => onChange(e.target.value)}
            required={required}
            disabled={disabled}
            placeholder={placeholder}
            className="w-full px-5 py-3 bg-white/60 border-2 border-white/80 rounded-2xl outline-none focus:border-brand-navy focus:ring-4 focus:ring-brand-navy/5 transition-all text-xs font-bold text-brand-navy disabled:opacity-50"
        />
    </div>
);

export const ProductEditorModal: React.FC<ProductEditorModalProps> = ({ product, onSave, onClose }) => {
    const [formData, setFormData] = useState<ProductSize>(newProductTemplate);
    const [isNew, setIsNew] = useState(true);

    useEffect(() => {
        if (product) {
            setFormData(product);
            setIsNew(false);
        } else {
            setFormData(newProductTemplate);
            setIsNew(true);
        }
    }, [product]);

    const handleSave = (e: React.FormEvent) => {
        e.preventDefault();
        onSave(formData);
    };

    const handleNestedChange = (section: keyof ProductSize, field: any, value: any) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                // @ts-ignore
                ...prev[section],
                [field]: value
            }
        }));
    };

    const handleDeeplyNestedChange = (section: 'coverContent', subSection: 'barcode' | 'title' | 'format', field: any, value: any) => {
        setFormData(prev => ({
            ...prev,
            [section]: {
                ...prev[section],
                [subSection]: {
                    // @ts-ignore
                    ...prev[section][subSection],
                    [field]: value
                }
            }
        }));
    };

    return (
        <div className="fixed inset-0 bg-brand-navy/60 backdrop-blur-2xl z-[100] flex justify-center items-center p-6 animate-in fade-in duration-500 overflow-y-auto" onClick={onClose}>
            <div className="glass-panel w-full max-w-4xl rounded-[4rem] border-white/60 shadow-2xl overflow-hidden flex flex-col my-8 animate-in slide-in-from-bottom-8 duration-700" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSave} className="flex flex-col max-h-[85vh]">
                    <header className="p-10 border-b border-brand-navy/5 bg-white/40 flex justify-between items-center relative overflow-hidden shrink-0">
                        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-orange via-brand-navy to-brand-teal"></div>
                        <div>
                            <div className="flex items-center gap-3 mb-1">
                                <span className="material-symbols-outlined text-brand-navy/20">straighten</span>
                                <h3 className="text-3xl font-black text-brand-navy uppercase tracking-tighter">{isNew ? 'New Product' : 'Product Engineering'}</h3>
                            </div>
                            <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.3em]">{isNew ? 'Initialize dimensional blueprint' : `Calibrating: ${formData.id}`}</p>
                        </div>
                        <button type="button" onClick={onClose} className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/60 border border-white/80 text-brand-navy/30 hover:text-brand-orange hover:rotate-90 transition-all shadow-sm">
                            <span className="material-symbols-outlined text-3xl">close</span>
                        </button>
                    </header>

                    <div className="p-10 overflow-y-auto flex-1 bg-white/10 scroller-thin space-y-10">
                        <Section title="Logistics Mapping" icon="inventory_2">
                            <TextInput label="Format Identity" value={formData.name} onChange={v => setFormData({ ...formData, name: v })} required placeholder="e.g. Premium 20x20" />
                            <TextInput label="System Serial (ID)" value={formData.id} onChange={v => setFormData({ ...formData, id: v })} required disabled={!isNew} placeholder="e.g. 20x20-premium" />
                            <NumberInput label="Revenue Pivot (Price)" value={formData.price} onChange={val => setFormData({ ...formData, price: val })} step={0.001} />
                            <TextInput label="Reference Matrix (Image URL)" value={formData.previewImageUrl} onChange={v => setFormData({ ...formData, previewImageUrl: v })} placeholder="https://..." />
                            
                            <label className="flex items-center gap-4 cursor-pointer p-4 bg-white/40 rounded-2xl border-2 border-white/80 hover:bg-white transition-all col-span-full">
                                <div className="relative">
                                    <input type="checkbox" checked={formData.isAvailable} onChange={e => setFormData({ ...formData, isAvailable: e.target.checked })} className="peer sr-only" />
                                    <div className="w-12 h-6 bg-brand-navy/10 rounded-full peer-checked:bg-brand-teal transition-all"></div>
                                    <div className="absolute left-1 top-1 w-4 h-4 bg-white rounded-full peer-checked:translate-x-6 transition-all"></div>
                                </div>
                                <span className="text-[10px] font-black text-brand-navy uppercase tracking-widest">Active in Pipeline</span>
                            </label>
                        </Section>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            <Section title="Cover Architecture (CM)" icon="book_5">
                                <NumberInput label="Outer Width" value={formData.cover.totalWidthCm} onChange={v => handleNestedChange('cover', 'totalWidthCm', v)} />
                                <NumberInput label="Outer Height" value={formData.cover.totalHeightCm} onChange={v => handleNestedChange('cover', 'totalHeightCm', v)} />
                                <NumberInput label="Spine Latitude" value={formData.cover.spineWidthCm} onChange={v => handleNestedChange('cover', 'spineWidthCm', v)} />
                            </Section>

                            <Section title="Internal Geometry (CM)" icon="description">
                                <NumberInput label="Page Width" value={formData.page.widthCm} onChange={v => handleNestedChange('page', 'widthCm', v)} />
                                <NumberInput label="Page Height" value={formData.page.heightCm} onChange={v => handleNestedChange('page', 'heightCm', v)} />
                            </Section>
                        </div>

                        <Section title="Safe Zone Buffers (CM)" icon="space_dashboard">
                            <NumberInput label="Header Offset" value={formData.margins.topCm} onChange={v => handleNestedChange('margins', 'topCm', v)} />
                            <NumberInput label="Footer Offset" value={formData.margins.bottomCm} onChange={v => handleNestedChange('margins', 'bottomCm', v)} />
                            <NumberInput label="Lateral Margin" value={formData.margins.outerCm} onChange={v => handleNestedChange('margins', 'outerCm', v)} />
                            <NumberInput label="Spine Buffer" value={formData.margins.innerCm} onChange={v => handleNestedChange('margins', 'innerCm', v)} />
                        </Section>

                        <Section title="Branding Alignment (CM)" icon="qr_code_2">
                            <NumberInput label="Title Y-Axis" value={formData.coverContent.title.fromTopCm} onChange={v => handleDeeplyNestedChange('coverContent', 'title', 'fromTopCm', v)} />
                            <NumberInput label="Title Span" value={formData.coverContent.title.widthCm} onChange={v => handleDeeplyNestedChange('coverContent', 'title', 'widthCm', v)} />
                            <NumberInput label="Sub-Label Y-Axis" value={formData.coverContent.format.fromTopCm} onChange={v => handleDeeplyNestedChange('coverContent', 'format', 'fromTopCm', v)} />
                            <NumberInput label="Sub-Label Span" value={formData.coverContent.format.widthCm} onChange={v => handleDeeplyNestedChange('coverContent', 'format', 'widthCm', v)} />
                            <NumberInput label="Barcode X-Offset" value={formData.coverContent.barcode.fromRightCm} onChange={v => handleDeeplyNestedChange('coverContent', 'barcode', 'fromRightCm', v)} />
                            <NumberInput label="Barcode Y-Offset" value={formData.coverContent.barcode.fromTopCm} onChange={v => handleDeeplyNestedChange('coverContent', 'barcode', 'fromTopCm', v)} />
                            <NumberInput label="Barcode Width" value={formData.coverContent.barcode.widthCm} onChange={v => handleDeeplyNestedChange('coverContent', 'barcode', 'widthCm', v)} />
                            <NumberInput label="Barcode Height" value={formData.coverContent.barcode.heightCm} onChange={v => handleDeeplyNestedChange('coverContent', 'barcode', 'heightCm', v)} />
                        </Section>
                    </div>

                    <footer className="p-10 bg-white/40 border-t border-brand-navy/5 flex justify-end gap-6 shrink-0">
                        <button type="button" onClick={onClose} className="px-10 py-4 rounded-2xl bg-white/60 border border-white/80 text-brand-navy/40 font-black text-[11px] uppercase tracking-[0.2em] hover:text-brand-orange transition-all">
                            Discard
                        </button>
                        <button type="submit" className="px-12 py-4 rounded-2xl bg-brand-navy text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-brand-navy/20 hover:scale-105 active:scale-95 transition-all flex items-center gap-3">
                            <span className="material-symbols-outlined text-xl">architecture</span>
                            Commit Specs
                        </button>
                    </footer>
                </form>
            </div>
        </div>
    );
};

export default ProductEditorModal;
