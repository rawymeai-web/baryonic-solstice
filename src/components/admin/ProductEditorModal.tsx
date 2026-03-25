
'use client';

import React, { useState, useEffect } from 'react';
import type { ProductSize } from '../../types';
import { Button } from '../ui/Button';

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

const Section: React.FC<{ title: string; children: React.ReactNode }> = ({ title, children }) => (
    <div className="space-y-4 p-4 border rounded-lg bg-gray-50/50">
        <h4 className="text-md font-bold text-brand-coral">{title}</h4>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">{children}</div>
    </div>
);

const NumberInput: React.FC<{ label: string; value: number; onChange: (val: number) => void; step?: number }> = ({ label, value, onChange, step = 0.1 }) => (
    <div>
        <label className="block text-xs font-medium text-gray-700">{label}</label>
        <input
            type="number"
            value={value}
            onChange={(e) => onChange(parseFloat(e.target.value) || 0)}
            step={step}
            className="mt-1 block w-full px-2 py-1 bg-white border border-gray-300 rounded-md shadow-sm focus:outline-none focus:ring-brand-coral focus:border-brand-coral sm:text-sm text-gray-900"
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
                // @ts-ignore
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
        <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4" onClick={onClose}>
            <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-3xl max-h-[90vh] overflow-y-auto animate-fade-in-up" onClick={e => e.stopPropagation()}>
                <form onSubmit={handleSave} className="space-y-6">
                    <h3 className="text-xl font-bold text-brand-navy">{isNew ? 'Add New Product' : 'Edit Product'}</h3>

                    <Section title="General Information">
                        <div>
                            <label className="block text-xs font-medium text-gray-700">Size Name</label>
                            <input value={formData.name} onChange={e => setFormData({ ...formData, name: e.target.value })} className="mt-1 block w-full px-2 py-1 bg-white border border-gray-300 rounded-md text-gray-900" required />
                        </div>
                        <div>
                            <label className="block text-xs font-medium text-gray-700">Unique ID (e.g., 20x20)</label>
                            <input value={formData.id} onChange={e => setFormData({ ...formData, id: e.target.value })} className="mt-1 block w-full px-2 py-1 bg-white border border-gray-300 rounded-md text-gray-900" required disabled={!isNew} />
                        </div>
                        <NumberInput label="Price" value={formData.price} onChange={val => setFormData({ ...formData, price: val })} step={0.001} />
                        <div>
                            <label className="block text-xs font-medium text-gray-700">Preview Image URL</label>
                            <input value={formData.previewImageUrl} onChange={e => setFormData({ ...formData, previewImageUrl: e.target.value })} className="mt-1 block w-full px-2 py-1 bg-white border border-gray-300 rounded-md text-gray-900" />
                        </div>
                        <div className="flex items-center pt-2 col-span-full">
                            <input
                                type="checkbox"
                                id="isAvailable"
                                checked={formData.isAvailable}
                                onChange={e => setFormData({ ...formData, isAvailable: e.target.checked })}
                                className="h-4 w-4 text-brand-coral border-gray-300 rounded focus:ring-brand-coral"
                            />
                            <label htmlFor="isAvailable" className="mx-2 block text-sm text-gray-900">Is Available for customers</label>
                        </div>
                    </Section>

                    <Section title="Cover Dimensions (cm)">
                        <NumberInput label="Total Width" value={formData.cover.totalWidthCm} onChange={v => handleNestedChange('cover', 'totalWidthCm', v)} />
                        <NumberInput label="Total Height" value={formData.cover.totalHeightCm} onChange={v => handleNestedChange('cover', 'totalHeightCm', v)} />
                        <NumberInput label="Spine Width" value={formData.cover.spineWidthCm} onChange={v => handleNestedChange('cover', 'spineWidthCm', v)} />
                    </Section>

                    <Section title="Page Dimensions (cm)">
                        <NumberInput label="Page Width" value={formData.page.widthCm} onChange={v => handleNestedChange('page', 'widthCm', v)} />
                        <NumberInput label="Page Height" value={formData.page.heightCm} onChange={v => handleNestedChange('page', 'heightCm', v)} />
                    </Section>

                    <Section title="Page Margins (cm)">
                        <NumberInput label="Top" value={formData.margins.topCm} onChange={v => handleNestedChange('margins', 'topCm', v)} />
                        <NumberInput label="Bottom" value={formData.margins.bottomCm} onChange={v => handleNestedChange('margins', 'bottomCm', v)} />
                        <NumberInput label="Outer" value={formData.margins.outerCm} onChange={v => handleNestedChange('margins', 'outerCm', v)} />
                        <NumberInput label="Inner (Spine)" value={formData.margins.innerCm} onChange={v => handleNestedChange('margins', 'innerCm', v)} />
                    </Section>

                    <Section title="Cover Content Placement (cm)">
                        <NumberInput label="Title: From Top" value={formData.coverContent.title.fromTopCm} onChange={v => handleDeeplyNestedChange('coverContent', 'title', 'fromTopCm', v)} />
                        <NumberInput label="Title: Width" value={formData.coverContent.title.widthCm} onChange={v => handleDeeplyNestedChange('coverContent', 'title', 'widthCm', v)} />
                        <NumberInput label="Format/Sub: From Top" value={formData.coverContent.format.fromTopCm} onChange={v => handleDeeplyNestedChange('coverContent', 'format', 'fromTopCm', v)} />
                        <NumberInput label="Format/Sub: Width" value={formData.coverContent.format.widthCm} onChange={v => handleDeeplyNestedChange('coverContent', 'format', 'widthCm', v)} />
                        <NumberInput label="Barcode: From Right" value={formData.coverContent.barcode.fromRightCm} onChange={v => handleDeeplyNestedChange('coverContent', 'barcode', 'fromRightCm', v)} />
                        <NumberInput label="Barcode: From Top" value={formData.coverContent.barcode.fromTopCm} onChange={v => handleDeeplyNestedChange('coverContent', 'barcode', 'fromTopCm', v)} />
                        <NumberInput label="Barcode: Width" value={formData.coverContent.barcode.widthCm} onChange={v => handleDeeplyNestedChange('coverContent', 'barcode', 'widthCm', v)} />
                        <NumberInput label="Barcode: Height" value={formData.coverContent.barcode.heightCm} onChange={v => handleDeeplyNestedChange('coverContent', 'barcode', 'heightCm', v)} />
                    </Section>

                    <div className="flex justify-end gap-4 pt-4">
                        <Button type="button" variant="outline" onClick={onClose}>Cancel</Button>
                        <Button type="submit">Save Product</Button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductEditorModal;
