
'use client';

import React, { useState, useEffect } from 'react';
import type { AdminOrder, Language, StoryBlueprint } from '../../types';
import { Button } from '../ui/Button';
import * as adminService from '../../services/adminService';

interface OrderPreviewModalProps {
    order: AdminOrder;
    onClose: () => void;
    language: Language;
}

const DetailSection: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
    <div className={`bg-gray-50 p-4 rounded-lg border ${className}`}>
        <h4 className="text-md font-bold text-brand-coral border-b pb-2 mb-2">{title}</h4>
        <div className="space-y-1 text-sm text-brand-navy">{children}</div>
    </div>
);

const DetailItem: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
    <p>
        <span className="font-semibold text-gray-600">{label}:</span> {value || 'N/A'}
    </p>
);

const BlueprintView: React.FC<{ blueprint: StoryBlueprint; t: (ar: string, en: string) => string }> = ({ blueprint, t }) => (
    <div className="space-y-6 animate-fade-in">
        <div className="grid sm:grid-cols-2 gap-4">
            <DetailSection title={t('الأساسيات', 'Blueprint Foundation')}>
                <DetailItem label="Theme" value={blueprint.foundation.storyCore} />
                <DetailItem label="Moral" value={blueprint.foundation.moral} />
                <DetailItem label="Hero Desire" value={blueprint.foundation.heroDesire} />
                <DetailItem label="Main Challenge" value={blueprint.foundation.mainChallenge} />
                <DetailItem label="Visual Anchor" value={blueprint.foundation.primaryVisualAnchor} />
            </DetailSection>

            <DetailSection title={t('الشخصيات', 'Characters')}>
                <div className="space-y-3">
                    <div className="p-2 bg-blue-50 rounded border border-blue-100">
                        <p className="font-bold text-brand-navy text-xs uppercase tracking-wider mb-1">Hero Profile</p>
                        <p className="text-xs text-gray-700 leading-relaxed">{blueprint.characters.heroProfile}</p>
                    </div>
                    {blueprint.characters.supportingRoles.map((role, idx) => (
                        <div key={idx} className="p-2 bg-white rounded border border-gray-200">
                            <div className="flex justify-between items-center mb-1">
                                <span className="font-bold text-gray-700 text-xs">{role.role}</span>
                                <span className="text-[10px] bg-gray-100 px-1.5 py-0.5 rounded text-gray-500">{role.name}</span>
                            </div>
                            <p className="text-[10px] text-gray-500">Visual: {role.visualKey}</p>
                        </div>
                    ))}
                </div>
            </DetailSection>
        </div>

        <DetailSection title={t('هيكل القصة', 'Story Structure - Narrative Arc')}>
            <div className="mb-4 p-3 bg-yellow-50 text-yellow-800 rounded text-xs italic border border-yellow-100">
                {blueprint.structure.arcSummary}
            </div>
            <div className="space-y-2 max-h-60 overflow-y-auto pr-2">
                {blueprint.structure.spreads.map(spread => (
                    <div key={spread.spreadNumber} className="flex gap-3 text-xs border-b border-gray-100 pb-2 last:border-0">
                        <div className="flex-shrink-0 w-8 h-8 flex items-center justify-center bg-brand-orange text-white font-bold rounded-full">
                            {spread.spreadNumber}
                        </div>
                        <div className="flex-1">
                            <div className="flex justify-between mb-1">
                                <span className="font-bold text-gray-800">{spread.emotionalBeat}</span>
                                <span className="text-[10px] text-gray-400">{spread.specificLocation}</span>
                            </div>
                            <p className="text-gray-600 mb-1">{spread.narrative}</p>
                            <div className="flex gap-2 text-[10px]">
                                <span className="bg-gray-100 px-1 rounded text-gray-500">Mood: {spread.mood}</span>
                                <span className="bg-gray-100 px-1 rounded text-gray-500">Light: {spread.lighting}</span>
                            </div>
                        </div>
                    </div>
                ))}
            </div>
        </DetailSection>
    </div>
);

export const OrderPreviewModal: React.FC<OrderPreviewModalProps> = ({ order, onClose, language }) => {
    const [activeTab, setActiveTab] = useState<'details' | 'blueprint' | 'operations'>('details');
    const [auditLogs, setAuditLogs] = useState<any[]>([]);
    const [isLoadingLogs, setIsLoadingLogs] = useState(false);

    // Page Editing State
    const [editingTexts, setEditingTexts] = useState<{ [key: number]: string }>({});

    useEffect(() => {
        if (activeTab === 'operations' && order?.id) {
            setIsLoadingLogs(true);
            adminService.getAuditLog(order.id)
                .then(res => setAuditLogs(res.logs || []))
                .catch(console.error)
                .finally(() => setIsLoadingLogs(false));

            // Initialize texts
            if (order.storyData?.pages) {
                const initTexts: any = {};
                order.storyData.pages.forEach((p: any, i: number) => initTexts[i] = p.text);
                setEditingTexts(initTexts);
            }
        }
    }, [activeTab, order]);
    if (!order) return null;
    const t = (ar: string, en: string) => language === 'ar' ? ar : en;
    const currency = t('د.ك', 'KWD');

    const hasBlueprint = !!order.storyData.blueprint;

    return (
        <div
            className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4"
            aria-modal="true"
            role="dialog"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl shadow-2xl p-0 w-full max-w-4xl animate-fade-in-up max-h-[90vh] flex flex-col overflow-hidden"
                onClick={(e) => e.stopPropagation()}
            >
                <div className="p-6 border-b flex justify-between items-center bg-gray-50">
                    <div>
                        <h3 className="text-2xl font-bold text-brand-navy">{t('تفاصيل الطلب', 'Order Inspection')}</h3>
                        <p className="text-sm text-gray-500">#{order.orderNumber} • {order.customerName}</p>
                    </div>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl">&times;</button>
                </div>

                <div className="flex px-6 border-b">
                    <button
                        onClick={() => setActiveTab('details')}
                        className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'details' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        {t('التفاصيل العامة', 'General Details')}
                    </button>
                    <button
                        onClick={() => setActiveTab('blueprint')}
                        disabled={!hasBlueprint}
                        className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'blueprint' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-400'} ${!hasBlueprint && 'opacity-50 cursor-not-allowed'}`}
                    >
                        {t('المخطط القصصي', 'Story Blueprint')} {hasBlueprint ? '✨' : '(N/A)'}
                    </button>
                    <button
                        onClick={() => setActiveTab('operations')}
                        className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'operations' ? 'border-brand-coral text-brand-coral' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
                    >
                        {t('العمليات', 'Terminal Ops')} 🛡️
                    </button>
                </div>

                <div className="p-6 overflow-y-auto flex-1 bg-[#fcfcfc]">
                    {activeTab === 'details' ? (
                        <div className="space-y-4 animate-fade-in">
                            <div className="grid sm:grid-cols-2 gap-4">
                                <DetailSection title={t('ملخص الطلب', 'Order Summary')}>
                                    <DetailItem label={t('رقم الطلب', 'Order #')} value={order.orderNumber} />
                                    <DetailItem label={t('تاريخ الطلب', 'Date')} value={new Date(order.orderDate).toLocaleString()} />
                                    <DetailItem label={t('الحالة', 'Status')} value={order.status} />
                                    <DetailItem label={t('المجموع', 'Total')} value={`${order.total.toFixed(3)} ${currency}`} />
                                </DetailSection>

                                <DetailSection title={t('بيانات الشحن', 'Shipping Details')}>
                                    <DetailItem label={t('الاسم', 'Name')} value={order.shippingDetails.name} />
                                    <DetailItem label={t('البريد الإلكتروني', 'Email')} value={order.shippingDetails.email} />
                                    <DetailItem label={t('الهاتف', 'Phone')} value={order.shippingDetails.phone} />
                                    <DetailItem label={t('العنوان', 'Address')} value={`${order.shippingDetails.address}, ${order.shippingDetails.city}`} />
                                </DetailSection>
                            </div>

                            <DetailSection title={t('تفاصيل القصة', 'Story Details')}>
                                <div className="grid grid-cols-2 gap-4">
                                    <DetailItem label={t('عنوان القصة', 'Title')} value={order.storyData.title} />
                                    <DetailItem label={t('اسم الطفل', "Child's Name")} value={order.storyData.childName} />
                                    <DetailItem label={t('عمر الطفل', "Child's Age")} value={order.storyData.childAge} />
                                    <DetailItem label={t('حجم الكتاب', 'Book Size')} value={order.storyData.size} />
                                    <DetailItem label={t('الشخصية الرئيسية', 'Main Character')} value={order.storyData.mainCharacter.name} />
                                    {order.storyData.useSecondCharacter && (
                                        <DetailItem label={t('الشخصية الثانوية', 'Second Character')} value={order.storyData.secondCharacter?.name} />
                                    )}
                                </div>
                            </DetailSection>
                        </div>
                    ) : activeTab === 'blueprint' ? (
                        order.storyData.blueprint && <BlueprintView blueprint={order.storyData.blueprint} t={t} />
                    ) : activeTab === 'operations' ? (
                        <div className="space-y-8 animate-fade-in">
                            <DetailSection title="Master Overrides (RBAC)">
                                <div className="flex flex-wrap gap-2">
                                    <Button variant="secondary" className="!text-[10px]" onClick={async () => {
                                        if (confirm('Are you sure you want to completely wipe and regenerate this book?')) {
                                            await adminService.regeneratePreview(order.id!);
                                            alert('Re-queued!');
                                        }
                                    }}>Wipe & Regenerate</Button>
                                    <Button variant="outline" className="!text-[10px]" onClick={async () => {
                                        await adminService.putOrderOnHold(order.id!);
                                        alert('Order on Hold');
                                    }}>Pause / Hold</Button>
                                    <Button variant="primary" className="!text-[10px]" onClick={async () => {
                                        await adminService.resumeOrder(order.id!);
                                        alert('Order Resumed');
                                    }}>Resume</Button>
                                    <Button variant="secondary" className="!text-[10px]" onClick={async () => {
                                        await adminService.pushOrderToPrint(order.id!);
                                        alert('Pushed to Print Queue!');
                                    }}>Force Push to Print</Button>
                                    <Button variant="outline" className="!text-[10px]" onClick={async () => {
                                        await adminService.resendSoftcopy(order.id!);
                                        alert('Email queued');
                                    }}>Resend PDF Email</Button>
                                </div>
                            </DetailSection>

                            <DetailSection title="Granular Editor">
                                <div className="space-y-6">
                                    {order.storyData?.pages?.map((page: any, index: number) => (
                                        <div key={index} className="grid md:grid-cols-2 gap-4 p-4 bg-white border rounded">
                                            <div className="relative group min-h-[150px] bg-gray-100 rounded overflow-hidden flex items-center justify-center">
                                                {page.illustrationUrl ? (
                                                    <img src={page.illustrationUrl} className="object-cover w-full h-full" alt="Spread" />
                                                ) : (
                                                    <span className="text-xs text-brand-navy font-bold">Image generation pending...</span>
                                                )}
                                                <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                                                    <Button variant="secondary" className="!text-xs" onClick={async () => {
                                                        await adminService.regeneratePageImage(order.id!, index);
                                                        alert('Image queued for regeneration!');
                                                    }}>Re-roll Image</Button>
                                                </div>
                                            </div>
                                            <div className="flex flex-col space-y-2">
                                                <label className="text-[10px] font-bold text-gray-500 uppercase">Text Overlay</label>
                                                <textarea
                                                    className="flex-1 w-full text-xs p-2 border rounded resize-none focus:ring-1 outline-none"
                                                    value={editingTexts[index] || ''}
                                                    onChange={e => setEditingTexts({ ...editingTexts, [index]: e.target.value })}
                                                />
                                                <div className="flex justify-end gap-2">
                                                    <Button variant="outline" className="!py-1 !px-3 text-[10px]" onClick={async () => {
                                                        await adminService.updatePageText(order.id!, index, editingTexts[index]);
                                                        alert('Text updated and re-compiled');
                                                    }}>Save Text Override</Button>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </DetailSection>

                            <DetailSection title="Event Audit Log">
                                <div className="space-y-1 max-h-40 overflow-y-auto">
                                    {isLoadingLogs ? <p className="text-xs text-gray-400">Loading logs...</p> : auditLogs.length === 0 ? <p className="text-xs text-gray-400">No events found.</p> : auditLogs.map((log: any) => (
                                        <div key={log.id} className="text-[10px] font-mono p-1 border-b border-gray-100 flex justify-between">
                                            <span className="font-bold text-brand-teal">[{new Date(log.created_at).toLocaleString()}] {log.event_type}</span>
                                            <span className="text-gray-400 truncate max-w-[200px]">{JSON.stringify(log.details)}</span>
                                        </div>
                                    ))}
                                </div>
                            </DetailSection>
                        </div>
                    ) : null}
                </div>

                <div className="p-4 bg-gray-50 border-t flex justify-end">
                    <Button onClick={onClose} variant="secondary">
                        {t('إغلاق', 'Close')}
                    </Button>
                </div>
            </div>
        </div>
    );
};

export default OrderPreviewModal;
