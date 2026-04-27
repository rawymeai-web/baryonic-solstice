
import React, { useState } from 'react';
import type { AdminOrder, Language, StoryBlueprint } from '../../types';
import { Button } from '../ui/Button';

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
  const [activeTab, setActiveTab] = useState<'details' | 'blueprint'>('details');
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
        {/* Header */}
        <div className="p-6 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h3 className="text-2xl font-bold text-brand-navy">{t('تفاصيل الطلب', 'Order Inspection')}</h3>
            <p className="text-sm text-gray-500">#{order.orderNumber} • {order.customerName}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl">&times;</button>
        </div>

        {/* Tabs */}
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
        </div>

        {/* Content */}
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
                  <DetailItem label={t('الشخصية الرئيسية', 'Main Character')} value={order.storyData.mainCharacter?.name || 'N/A'} />
                  {order.storyData.useSecondCharacter && (
                    <DetailItem label={t('الشخصية الثانوية', 'Second Character')} value={order.storyData.secondCharacter?.name} />
                  )}
                </div>
              </DetailSection>

              <DetailSection title={t('تفاصيل المشاهد والرسوم', 'Spread & Illustration Details')} className="col-span-full">
                <div className="space-y-3 max-h-64 overflow-y-auto pr-2">
                  {((order.storyData as any).spreads || []).filter((s: any) => s.spreadNumber > 0).map((s: any) => (
                    <div key={s.spreadNumber} className="text-xs border-b pb-2 last:border-b-0">
                      <p className="font-bold text-gray-700">Spread {s.spreadNumber}:</p>
                      <p className="text-gray-600 italic">"{s.leftText} {s.rightText}"</p>
                      <p className="mt-1 text-[10px] text-gray-400">Prompt: {s.actualPrompt?.substring(0, 50)}...</p>
                    </div>
                  ))}
                </div>
              </DetailSection>
            </div>
          ) : (
            order.storyData.blueprint && <BlueprintView blueprint={order.storyData.blueprint} t={t} />
          )}
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
