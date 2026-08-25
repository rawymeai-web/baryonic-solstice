import React, { useState } from 'react';
import type { AdminOrder, Language, StoryBlueprint } from '@/types';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';
import { ShippingModal } from './ShippingModal';

interface OrderPreviewModalProps {
  order: AdminOrder;
  onClose: () => void;
  onRefresh?: () => void;
  language: Language;
}

const DetailSection: React.FC<{ title: string; children: React.ReactNode; className?: string }> = ({ title, children, className = '' }) => (
  <div className={`bg-gray-50 p-4 rounded-xl border border-gray-100 ${className}`}>
    <h4 className="text-md font-bold text-brand-coral border-b pb-2 mb-3 flex items-center justify-between">{title}</h4>
    <div className="space-y-2 text-sm text-brand-navy">{children}</div>
  </div>
);

const DetailItem: React.FC<{ label: string; value?: string | number | null; copyable?: boolean }> = ({ label, value, copyable }) => (
  <div className="flex items-start justify-between gap-2 py-0.5">
    <span className="font-semibold text-gray-500 text-xs shrink-0">{label}:</span>
    <div className="flex items-center gap-1.5 text-right font-medium text-xs text-brand-navy break-all">
      <span>{value || 'N/A'}</span>
      {copyable && value && (
        <button
          onClick={() => navigator.clipboard.writeText(String(value))}
          title="Copy"
          className="text-gray-400 hover:text-brand-orange text-[11px] p-0.5"
        >
          📋
        </button>
      )}
    </div>
  </div>
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
                <span className="bg-gray-100 px-1 rounded text-gray-500">Mood: {spread.emotionalBeat}</span>
                <span className="bg-gray-100 px-1 rounded text-gray-500">Light: {spread.timeOfDay}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DetailSection>
  </div>
);

export const OrderPreviewModal: React.FC<OrderPreviewModalProps> = ({ order, onClose, onRefresh, language }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'blueprint'>('details');
  const [isNotifyingPreview, setIsNotifyingPreview] = useState(false);
  const [notifyMsg, setNotifyMsg] = useState<{ text: string; type: 'success' | 'error' } | null>(null);
  const [isShippingModalOpen, setIsShippingModalOpen] = useState(false);

  if (!order) return null;
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;
  const currency = t('د.ك', 'KWD');
  const hasBlueprint = !!order.storyData.blueprint;

  const ship = order.shippingDetails || ({} as any);
  const tracking = ship.tracking;
  const rawPhone = ship.phone || '';
  const cleanPhone = rawPhone.replace(/\D/g, '');
  const isPhysical = ship.isPhysicalDelivery ?? (order.total > 15 || !!order.storyData?.isPhysicalPrint);

  const handleNotifyPreview = async () => {
    setIsNotifyingPreview(true);
    setNotifyMsg(null);
    try {
      const res = await fetch(`/api/admin/orders/${order.orderNumber}/notify-preview`, {
        method: 'POST'
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to send preview notification');
      setNotifyMsg({ text: t('تم إرسال إيميل رابط المعاينة للعميل بنجاح! 🚀', 'Preview notification email dispatched to customer! 🚀'), type: 'success' });
      if (onRefresh) onRefresh();
    } catch (err: any) {
      setNotifyMsg({ text: err.message || 'Error sending notification', type: 'error' });
    } finally {
      setIsNotifyingPreview(false);
    }
  };

  return (
    <>
      <div
        className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 animate-fade-in"
        aria-modal="true"
        role="dialog"
        onClick={onClose}
      >
        <div
          className="bg-white rounded-3xl shadow-2xl p-0 w-full max-w-4xl animate-fade-in-up max-h-[92vh] flex flex-col overflow-hidden"
          onClick={(e) => e.stopPropagation()}
        >
          {/* Header */}
          <div className="p-6 border-b flex justify-between items-center bg-gray-50/80">
            <div>
              <div className="flex items-center gap-3">
                <h3 className="text-2xl font-bold text-brand-navy">{t('تفاصيل ومعاينة الطلب', 'Order Inspection')}</h3>
                <span className={`text-xs px-3 py-1 rounded-full font-bold uppercase tracking-wider ${
                  order.status === 'delivered' ? 'bg-emerald-100 text-emerald-700' :
                  order.status === 'shipped' ? 'bg-blue-100 text-blue-700' :
                  order.status === 'awaiting_preview_approval' ? 'bg-purple-100 text-purple-700' :
                  'bg-orange-100 text-orange-700'
                }`}>
                  {order.status.replace(/_/g, ' ')}
                </span>
              </div>
              <p className="text-xs text-gray-500 mt-1 font-mono">#{order.orderNumber} • {order.customerName}</p>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-3xl font-light">&times;</button>
          </div>

          {/* Tabs */}
          <div className="flex px-6 border-b bg-white">
            <button
              onClick={() => setActiveTab('details')}
              className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'details' ? 'border-brand-orange text-brand-orange' : 'border-transparent text-gray-400 hover:text-gray-600'}`}
            >
              {t('بيانات العميل والشحن والقصة', 'Customer & Story Details')}
            </button>
            <button
              onClick={() => setActiveTab('blueprint')}
              disabled={!hasBlueprint}
              className={`py-3 px-4 text-sm font-bold border-b-2 transition-colors ${activeTab === 'blueprint' ? 'border-brand-navy text-brand-navy' : 'border-transparent text-gray-400'} ${!hasBlueprint && 'opacity-50 cursor-not-allowed'}`}
            >
              {t('المخطط القصصي', 'Story Blueprint')} {hasBlueprint ? '✨' : '(N/A)'}
            </button>
          </div>

          {/* Notification banner */}
          {notifyMsg && (
            <div className={`px-6 py-3 text-xs font-bold flex items-center justify-between ${
              notifyMsg.type === 'success' ? 'bg-emerald-50 text-emerald-800 border-b border-emerald-100' : 'bg-red-50 text-red-800 border-b border-red-100'
            }`}>
              <span>{notifyMsg.text}</span>
              <button onClick={() => setNotifyMsg(null)} className="text-gray-400 hover:text-gray-600">&times;</button>
            </div>
          )}

          {/* Content */}
          <div className="p-6 overflow-y-auto flex-1 bg-[#fcfcfc] space-y-6">
            {activeTab === 'details' ? (
              <div className="space-y-6 animate-fade-in">
                
                {/* Top Row: Customer Profile & Order Financials */}
                <div className="grid sm:grid-cols-2 gap-4">
                  
                  {/* Customer & Shipping Card */}
                  <DetailSection title={t('👤 بيانات العميل والشحن والتواصل', '👤 Customer & Contact Details')}>
                    <DetailItem label={t('الاسم الكامل', 'Customer Name')} value={ship.name || order.customerName} copyable />
                    <DetailItem label={t('البريد الإلكتروني', 'Email')} value={ship.email} copyable />
                    
                    <div className="flex items-center justify-between py-1 border-y border-gray-100 my-1">
                      <span className="font-semibold text-gray-500 text-xs">{t('الهاتف', 'Phone')}:</span>
                      <div className="flex items-center gap-2">
                        <span className="font-mono text-xs font-bold text-brand-navy">{ship.phone || 'N/A'}</span>
                        {cleanPhone && (
                          <a
                            href={`https://wa.me/${cleanPhone.startsWith('965') || cleanPhone.startsWith('966') || cleanPhone.startsWith('971') || cleanPhone.length > 8 ? cleanPhone : '965' + cleanPhone}`}
                            target="_blank"
                            rel="noreferrer"
                            className="bg-emerald-500 hover:bg-emerald-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 shadow-sm transition-all"
                            title="Chat on WhatsApp"
                          >
                            💬 WhatsApp
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center justify-between py-1">
                      <span className="font-semibold text-gray-500 text-xs">{t('نوع التوصيل', 'Delivery Type')}:</span>
                      <span className={`text-[10px] font-extrabold px-2.5 py-0.5 rounded-full ${
                        isPhysical ? 'bg-amber-100 text-amber-800 border border-amber-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
                      }`}>
                        {isPhysical ? t('📦 نسخة مطبوعة فاخرة + شحن', '📦 Hardcover Physical Print') : t('📥 نسخة رقمية فقط (PDF)', '📥 Digital Softcopy Only')}
                      </span>
                    </div>

                    {isPhysical && (
                      <div className="mt-2 pt-2 border-t border-gray-200/60 space-y-1">
                        <p className="text-[11px] font-bold text-gray-700">{t('العنوان التفصيلي للشحن:', 'Shipping Address:')}</p>
                        <p className="text-xs bg-white p-2.5 rounded-lg border border-gray-200 text-brand-navy leading-relaxed font-medium">
                          {ship.address ? ship.address : `${ship.city || ''}, ${ship.countryName || ship.country || ''}`}
                        </p>
                        {ship.deliveryNotes && (
                          <p className="text-[10px] text-amber-700 bg-amber-50 p-1.5 rounded border border-amber-200">
                            <strong>{t('ملاحظات التوصيل: ', 'Delivery Notes: ')}</strong>{ship.deliveryNotes}
                          </p>
                        )}
                      </div>
                    )}
                  </DetailSection>

                  {/* Order Financials & Tracking Summary */}
                  <div className="space-y-4">
                    <DetailSection title={t('💳 ملخص الحساب والطلب', '💳 Order & Payment Summary')}>
                      <DetailItem label={t('رقم الطلب', 'Order #')} value={order.orderNumber} copyable />
                      <DetailItem label={t('تاريخ الطلب', 'Date')} value={new Date(order.orderDate).toLocaleString()} />
                      <DetailItem label={t('المجموع المدفوع', 'Paid Total')} value={`${order.total.toFixed(3)} ${currency}`} />
                      <DetailItem label={t('تكلفة الشحن', 'Shipping Cost')} value={`${(order.shippingCost || 0).toFixed(3)} ${currency}`} />
                    </DetailSection>

                    {/* Tracking Box if Shipped */}
                    <DetailSection title={t('🚚 حالة التتبع والشحن', '🚚 Shipping & Tracking Status')}>
                      {tracking ? (
                        <div className="space-y-1.5">
                          <DetailItem label={t('شركة الشحن', 'Courier')} value={tracking.courier} />
                          <DetailItem label={t('رقم البوليصة AWB', 'AWB / Tracking #')} value={tracking.awbNumber} copyable />
                          {tracking.trackingUrl && (
                            <div className="pt-1">
                              <a
                                href={tracking.trackingUrl}
                                target="_blank"
                                rel="noreferrer"
                                className="text-xs text-brand-orange hover:underline font-bold flex items-center gap-1"
                              >
                                📍 {t('فتح رابط التتبع المباشر', 'Open Direct Tracking Link')} &rarr;
                              </a>
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500 italic flex items-center justify-between">
                          <span>{t('لم يتم إدخال بيانات التتبع بعد', 'No tracking info entered yet')}</span>
                          <button
                            onClick={() => setIsShippingModalOpen(true)}
                            className="text-xs bg-brand-orange text-white px-2.5 py-1 rounded-lg font-bold hover:bg-brand-orange/90 shadow-sm"
                          >
                            + {t('إضافة تتبع', 'Add Tracking')}
                          </button>
                        </div>
                      )}
                    </DetailSection>
                  </div>

                </div>

                {/* Story Details Card */}
                <DetailSection title={t('📖 تفاصيل القصة والشخصيات', '📖 Story & Hero Specifications')}>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                    <DetailItem label={t('عنوان القصة', 'Title')} value={order.storyData.title} />
                    <DetailItem label={t('اسم الطفل', "Child's Name")} value={order.storyData.childName} />
                    <DetailItem label={t('عمر الطفل', "Child's Age")} value={order.storyData.childAge} />
                    <DetailItem label={t('حجم الكتاب', 'Book Size')} value={order.storyData.size} />
                    <DetailItem label={t('الشخصية الرئيسية', 'Main Hero')} value={order.storyData.mainCharacter?.name || 'N/A'} />
                    {order.storyData.useSecondCharacter && (
                      <DetailItem label={t('الشخصية الثانوية', 'Second Hero')} value={order.storyData.secondCharacter?.name} />
                    )}
                    <DetailItem label={t('أسلوب الرسم', 'Art Style')} value={(order.storyData as any).styleName || (order.storyData as any).styleProfile?.style_name || 'Custom'} />
                    <DetailItem label={t('لغة القصة', 'Language')} value={order.storyData.language?.toUpperCase() || 'AR'} />
                  </div>
                </DetailSection>

                {/* Spreads Details */}
                <DetailSection title={t('🎨 المشاهد والرسوم المنفذة', '🎨 Spreads & Prompts Inspection')} className="col-span-full">
                  <div className="space-y-3 max-h-56 overflow-y-auto pr-2">
                    {(order.storyData.spreads || []).filter((s: any) => s.spreadNumber > 0).map((s: any) => (
                      <div key={s.spreadNumber} className="text-xs border-b pb-2 last:border-b-0 flex items-start gap-3">
                        <div className="w-6 h-6 rounded-full bg-brand-orange text-white flex items-center justify-center font-bold text-[10px] shrink-0">
                          {s.spreadNumber}
                        </div>
                        <div className="flex-1 space-y-0.5">
                          <p className="text-gray-700 font-medium">"{s.leftText || s.text || s.rightText || '...'}"</p>
                          <p className="text-[10px] text-gray-400 font-mono line-clamp-1">Prompt: {s.actualPrompt?.substring(0, 100)}...</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </DetailSection>

              </div>
            ) : (
              order.storyData.blueprint && <BlueprintView blueprint={order.storyData.blueprint} t={t} />
            )}
          </div>

          {/* Footer Actions */}
          <div className="p-4 bg-gray-50 border-t flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2">
              <Button
                onClick={handleNotifyPreview}
                disabled={isNotifyingPreview}
                className="bg-brand-teal text-white hover:bg-brand-teal/90 font-bold text-xs flex items-center gap-1.5 shadow-md"
              >
                {isNotifyingPreview ? <><Spinner size="sm" color="text-white" /> {t('جاري الإرسال...', 'Sending...')}</> : t('📩 إرسال إيميل: القصة جاهزة للقراءة', '📩 Send Email: Book is Ready')}
              </Button>

              <Button
                onClick={() => setIsShippingModalOpen(true)}
                variant="secondary"
                className="border-2 border-brand-orange text-brand-orange hover:bg-brand-orange hover:text-white font-bold text-xs flex items-center gap-1.5"
              >
                🚚 {t('إرسال الشحنة ورقم التتبع', 'Dispatch & Tracking')}
              </Button>
            </div>

            <Button onClick={onClose} variant="secondary" className="text-xs font-bold">
              {t('إغلاق', 'Close')}
            </Button>
          </div>

        </div>
      </div>

      {/* Shipping Modal */}
      {isShippingModalOpen && (
        <ShippingModal
          order={order}
          isOpen={isShippingModalOpen}
          onClose={() => setIsShippingModalOpen(false)}
          onSuccess={() => {
            setIsShippingModalOpen(false);
            if (onRefresh) onRefresh();
          }}
          language={language}
        />
      )}
    </>
  );
};

export default OrderPreviewModal;

