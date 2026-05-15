
import React, { useState } from 'react';
import type { AdminOrder, Language, StoryBlueprint } from '@/types';

const DetailSection: React.FC<{ title: string; children: React.ReactNode; className?: string; icon?: string }> = ({ title, children, className = '', icon = 'info' }) => (
  <div className={`glass-panel p-8 rounded-[2rem] border-white/60 bg-white/40 shadow-xl ${className}`}>
    <div className="flex items-center gap-3 mb-6 border-b border-brand-navy/5 pb-4">
      <span className="material-symbols-outlined text-brand-navy/30">{icon}</span>
      <h4 className="text-[10px] font-black text-brand-navy uppercase tracking-[0.2em]">{title}</h4>
    </div>
    <div className="space-y-4 text-sm text-brand-navy/80">{children}</div>
  </div>
);

const DetailItem: React.FC<{ label: string; value?: string | number | null }> = ({ label, value }) => (
  <div className="flex flex-col gap-1">
    <span className="text-[9px] font-black text-brand-navy/30 uppercase tracking-widest">{label}</span>
    <span className="font-bold text-brand-navy">{value || '---'}</span>
  </div>
);

const BlueprintView: React.FC<{ blueprint: StoryBlueprint; t: (ar: string, en: string) => string }> = ({ blueprint, t }) => (
  <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="grid sm:grid-cols-2 gap-8">
      <DetailSection title={t('الأساسيات', 'Blueprint Foundation')} icon="architecture">
        <div className="grid grid-cols-1 gap-4">
            <DetailItem label="Theme Core" value={blueprint.foundation.storyCore} />
            <DetailItem label="Moral Narrative" value={blueprint.foundation.moral} />
            <DetailItem label="Hero Objective" value={blueprint.foundation.heroDesire} />
            <DetailItem label="Primary Conflict" value={blueprint.foundation.mainChallenge} />
            <DetailItem label="Visual Anchor" value={blueprint.foundation.primaryVisualAnchor} />
        </div>
      </DetailSection>

      <DetailSection title={t('الشخصيات', 'Character Matrix')} icon="group">
        <div className="space-y-6">
          <div className="p-4 rounded-2xl bg-brand-navy/5 border border-brand-navy/5">
            <p className="text-[9px] font-black text-brand-navy/40 uppercase tracking-widest mb-2">Hero Intelligence</p>
            <p className="text-xs font-bold text-brand-navy/70 leading-relaxed">{blueprint.characters.heroProfile}</p>
          </div>
          {blueprint.characters.supportingRoles.map((role, idx) => (
            <div key={idx} className="p-4 rounded-2xl bg-white/40 border border-white/60 shadow-sm flex justify-between items-center">
              <div>
                <span className="text-[9px] font-black text-brand-navy/30 uppercase tracking-widest block">Role: {role.role}</span>
                <span className="font-black text-brand-navy text-xs uppercase tracking-tighter">{role.name}</span>
              </div>
              <div className="text-[8px] font-black text-brand-teal uppercase bg-brand-teal/5 px-2 py-1 rounded-lg">ID: {role.visualKey}</div>
            </div>
          ))}
        </div>
      </DetailSection>
    </div>

    <DetailSection title={t('هيكل القصة', 'Strategic Narrative Arc')} icon="timeline" className="col-span-full">
      <div className="mb-8 p-6 bg-brand-orange/5 text-brand-orange rounded-3xl text-xs font-black uppercase tracking-widest border border-brand-orange/10 leading-loose">
        {blueprint.structure.arcSummary}
      </div>
      <div className="space-y-4 max-h-[400px] overflow-y-auto pr-4 scroller-thin">
        {blueprint.structure.spreads.map(spread => (
          <div key={spread.spreadNumber} className="flex gap-6 p-6 rounded-[2rem] bg-white/40 border border-white/60 hover:bg-white transition-all group">
            <div className="flex-shrink-0 w-12 h-12 flex items-center justify-center bg-brand-navy text-white font-black rounded-2xl shadow-xl group-hover:scale-110 transition-transform">
              {String(spread.spreadNumber).padStart(2, '0')}
            </div>
            <div className="flex-1 space-y-3">
              <div className="flex justify-between items-center">
                <span className="font-black text-brand-navy uppercase tracking-widest text-[10px]">{spread.emotionalBeat}</span>
                <span className="text-[9px] font-black text-brand-navy/20 uppercase tracking-widest">{spread.specificLocation}</span>
              </div>
              <p className="text-xs font-medium text-brand-navy/70 leading-relaxed">{spread.narrative}</p>
              <div className="flex gap-3">
                <span className="text-[8px] font-black text-brand-teal uppercase bg-brand-teal/5 px-3 py-1 rounded-full">Mood: {spread.emotionalBeat}</span>
                <span className="text-[8px] font-black text-brand-orange uppercase bg-brand-orange/5 px-3 py-1 rounded-full">Luminance: {spread.timeOfDay}</span>
              </div>
            </div>
          </div>
        ))}
      </div>
    </DetailSection>
  </div>
);

interface OrderPreviewModalProps {
  order: AdminOrder;
  onClose: () => void;
  language: Language;
}

export const OrderPreviewModal: React.FC<OrderPreviewModalProps> = ({ order, onClose, language }) => {
  const [activeTab, setActiveTab] = useState<'details' | 'blueprint'>('details');
  const [showDNA, setShowDNA] = useState(false);
  if (!order) return null;
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;
  const currency = t('د.ك', 'KWD');

  const downloadImage = (base64OrUrl: string | undefined, filename: string) => {
    if (!base64OrUrl) return;
    const link = document.createElement('a');
    // Handle both raw base64 and data URIs/URLs
    if (base64OrUrl.startsWith('data:') || base64OrUrl.startsWith('http')) {
      link.href = base64OrUrl;
    } else {
      link.href = `data:image/jpeg;base64,${base64OrUrl}`;
    }
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const hasBlueprint = !!order.storyData.blueprint;

  return (
    <div
      className="fixed inset-0 bg-brand-navy/60 backdrop-blur-2xl z-[100] flex justify-center items-center p-6 animate-in fade-in duration-500"
      aria-modal="true"
      role="dialog"
      onClick={onClose}
    >
      <div
        className="glass-panel w-full max-w-5xl rounded-[4rem] border-white/60 shadow-2xl overflow-hidden flex flex-col max-h-[90vh] animate-in slide-in-from-bottom-8 duration-700"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <header className="p-10 border-b border-brand-navy/5 bg-white/40 flex justify-between items-center relative overflow-hidden">
          <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-brand-orange via-brand-navy to-brand-teal"></div>
          <div>
            <div className="flex items-center gap-3 mb-1">
               <span className="material-symbols-outlined text-brand-navy/20">query_stats</span>
               <h3 className="text-3xl font-black text-brand-navy uppercase tracking-tighter">{t('تفاصيل الطلب', 'Intelligence Report')}</h3>
            </div>
            <p className="text-[10px] font-black text-brand-navy/30 uppercase tracking-[0.3em]">Protocol: {order.orderNumber} • Operative: {order.customerName}</p>
          </div>
          <button 
             onClick={onClose} 
             className="w-14 h-14 flex items-center justify-center rounded-2xl bg-white/60 border border-white/80 text-brand-navy/30 hover:text-brand-orange hover:rotate-90 transition-all shadow-sm"
          >
             <span className="material-symbols-outlined text-3xl">close</span>
          </button>
        </header>

        {/* Tabs */}
        <nav className="flex px-10 py-6 border-b border-brand-navy/5 bg-white/20">
          <div className="flex p-2 rounded-2xl bg-white/40 border border-white/60 shadow-inner">
            <button
              onClick={() => setActiveTab('details')}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'details' ? 'bg-brand-navy text-white shadow-xl scale-[1.02]' : 'text-brand-navy/40 hover:text-brand-navy'}`}
            >
              {t('التفاصيل العامة', 'Core Logistics')}
            </button>
            <button
              onClick={() => setActiveTab('blueprint')}
              disabled={!hasBlueprint}
              className={`px-8 py-3 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all ${activeTab === 'blueprint' ? 'bg-brand-navy text-white shadow-xl scale-[1.02]' : 'text-brand-navy/40 hover:text-brand-navy'} ${!hasBlueprint && 'opacity-30 cursor-not-allowed'}`}
            >
              {t('المخطط القصصي', 'Narrative DNA')} {hasBlueprint && '✨'}
            </button>
          </div>
        </nav>

        {/* Content */}
        <div className="p-10 overflow-y-auto flex-1 bg-white/10 scroller-thin">
          {activeTab === 'details' ? (
            <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
              <div className="grid sm:grid-cols-2 gap-8">
                <DetailSection title={t('ملخص الطلب', 'Logistics Summary')} icon="receipt_long">
                  <div className="grid grid-cols-2 gap-6">
                    <DetailItem label={t('رقم الطلب', 'Order Sequence')} value={order.orderNumber} />
                    <DetailItem label={t('تاريخ الطلب', 'Timestamp')} value={new Date(order.orderDate).toLocaleString()} />
                    <DetailItem label={t('الحالة', 'System State')} value={order.status} />
                    <DetailItem label={t('المجموع', 'Revenue Output')} value={`${order.total.toFixed(3)} ${currency}`} />
                  </div>
                </DetailSection>

                <DetailSection title={t('بيانات الشحن', 'Shipping Manifest')} icon="local_shipping">
                  <div className="grid grid-cols-2 gap-6">
                    <DetailItem label={t('الاسم', 'Recipient')} value={order.shippingDetails.name} />
                    <DetailItem label={t('البريد الإلكتروني', 'Comm-Link')} value={order.shippingDetails.email} />
                    <DetailItem label={t('الهاتف', 'Relay Number')} value={order.shippingDetails.phone} />
                    <DetailItem label={t('العنوان', 'Geo-Coordinate')} value={`${order.shippingDetails.address}, ${order.shippingDetails.city}`} />
                  </div>
                </DetailSection>
              </div>

              <DetailSection title={t('بيانات الحمض النووي (DNA)', 'Customer Locked DNA')} icon="fingerprint" className="border-brand-orange/20 bg-brand-orange/[0.02]">
                <div className="flex flex-col gap-6">
                  <div className="flex justify-between items-center bg-white/60 p-4 rounded-2xl border border-white/80">
                    <div>
                      <p className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest mb-1">Identity Assets</p>
                      <p className="text-xs font-bold text-brand-navy">Character Likeness & Style Anchors</p>
                    </div>
                    <button 
                      onClick={() => setShowDNA(!showDNA)}
                      className="px-6 py-2 rounded-xl bg-brand-navy text-white text-[9px] font-black uppercase tracking-widest hover:bg-brand-orange transition-colors"
                    >
                      {showDNA ? t('إغلاق المدير', 'Hide DNA Manager') : t('إدارة DNA', 'Manage DNA')}
                    </button>
                  </div>

                  {showDNA && (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6 animate-in fade-in slide-in-from-top-4 duration-500">
                      {/* Hero A */}
                      <div className="space-y-4 p-6 rounded-3xl bg-brand-navy/5 border border-brand-navy/10 relative overflow-hidden">
                        <div className="absolute top-0 right-0 p-3 opacity-10">
                           <span className="material-symbols-outlined text-4xl">person</span>
                        </div>
                        <h5 className="text-[10px] font-black text-brand-navy uppercase tracking-widest pb-3 border-b border-brand-navy/5">Primary Hero: {order.storyData.childName}</h5>
                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-2">
                            <p className="text-[8px] font-black text-brand-navy/30 uppercase tracking-widest">Raw Identity</p>
                            <div className="aspect-square rounded-2xl bg-white/40 border border-white/60 overflow-hidden flex items-center justify-center">
                              {order.storyData.mainCharacterImageBase64 ? (
                                <img src={order.storyData.mainCharacterImageBase64.startsWith('data:') ? order.storyData.mainCharacterImageBase64 : `data:image/jpeg;base64,${order.storyData.mainCharacterImageBase64}`} className="w-full h-full object-cover" />
                              ) : <span className="material-symbols-outlined text-brand-navy/10 text-4xl">no_photography</span>}
                            </div>
                            <button 
                              disabled={!order.storyData.mainCharacterImageBase64}
                              onClick={() => downloadImage(order.storyData.mainCharacterImageBase64, 'heroA_raw.jpg')}
                              className="w-full py-2 rounded-lg bg-white border border-brand-navy/5 text-[8px] font-black text-brand-navy uppercase tracking-widest hover:bg-brand-navy hover:text-white transition-all disabled:opacity-30"
                            >
                              Download Raw
                            </button>
                          </div>
                          <div className="space-y-2">
                            <p className="text-[8px] font-black text-brand-orange/60 uppercase tracking-widest">Style Anchor (DNA)</p>
                            <div className="aspect-square rounded-2xl bg-brand-orange/5 border border-brand-orange/20 overflow-hidden flex items-center justify-center">
                              {order.storyData.styleReferenceImageBase64 ? (
                                <img src={order.storyData.styleReferenceImageBase64.startsWith('data:') ? order.storyData.styleReferenceImageBase64 : `data:image/jpeg;base64,${order.storyData.styleReferenceImageBase64}`} className="w-full h-full object-cover" />
                              ) : <span className="material-symbols-outlined text-brand-orange/10 text-4xl">brush</span>}
                            </div>
                            <button 
                              disabled={!order.storyData.styleReferenceImageBase64}
                              onClick={() => downloadImage(order.storyData.styleReferenceImageBase64, 'heroA_dna.jpg')}
                              className="w-full py-2 rounded-lg bg-brand-orange/10 border border-brand-orange/20 text-[8px] font-black text-brand-orange uppercase tracking-widest hover:bg-brand-orange hover:text-white transition-all disabled:opacity-30"
                            >
                              Download DNA
                            </button>
                          </div>
                        </div>
                      </div>

                      {/* Hero B */}
                      {order.storyData.useSecondCharacter && (
                        <div className="space-y-4 p-6 rounded-3xl bg-brand-teal/5 border border-brand-teal/10 relative overflow-hidden">
                          <div className="absolute top-0 right-0 p-3 opacity-10">
                            <span className="material-symbols-outlined text-4xl">group</span>
                          </div>
                          <h5 className="text-[10px] font-black text-brand-teal uppercase tracking-widest pb-3 border-b border-brand-teal/5">Support Hero: {order.storyData.secondCharacter?.name}</h5>
                          <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                              <p className="text-[8px] font-black text-brand-navy/30 uppercase tracking-widest">Raw Identity</p>
                              <div className="aspect-square rounded-2xl bg-white/40 border border-white/60 overflow-hidden flex items-center justify-center">
                                {order.storyData.secondCharacterImageBase64 ? (
                                  <img src={order.storyData.secondCharacterImageBase64.startsWith('data:') ? order.storyData.secondCharacterImageBase64 : `data:image/jpeg;base64,${order.storyData.secondCharacterImageBase64}`} className="w-full h-full object-cover" />
                                ) : <span className="material-symbols-outlined text-brand-navy/10 text-4xl">no_photography</span>}
                              </div>
                              <button 
                                disabled={!order.storyData.secondCharacterImageBase64}
                                onClick={() => downloadImage(order.storyData.secondCharacterImageBase64, 'heroB_raw.jpg')}
                                className="w-full py-2 rounded-lg bg-white border border-brand-navy/5 text-[8px] font-black text-brand-navy uppercase tracking-widest hover:bg-brand-navy hover:text-white transition-all disabled:opacity-30"
                              >
                                Download Raw
                              </button>
                            </div>
                            <div className="space-y-2">
                              <p className="text-[8px] font-black text-brand-teal/60 uppercase tracking-widest">Style Anchor (DNA)</p>
                              <div className="aspect-square rounded-2xl bg-brand-teal/5 border border-brand-teal/20 overflow-hidden flex items-center justify-center">
                                {order.storyData.secondCharacter?.imageDNA?.[0] ? (
                                  <img src={order.storyData.secondCharacter.imageDNA[0].startsWith('data:') ? order.storyData.secondCharacter.imageDNA[0] : `data:image/jpeg;base64,${order.storyData.secondCharacter.imageDNA[0]}`} className="w-full h-full object-cover" />
                                ) : <span className="material-symbols-outlined text-brand-teal/10 text-4xl">brush</span>}
                              </div>
                              <button 
                                disabled={!order.storyData.secondCharacter?.imageDNA?.[0]}
                                onClick={() => downloadImage(order.storyData.secondCharacter?.imageDNA?.[0], 'heroB_dna.jpg')}
                                className="w-full py-2 rounded-lg bg-brand-teal/10 border border-brand-teal/20 text-[8px] font-black text-brand-teal uppercase tracking-widest hover:bg-brand-teal hover:text-white transition-all disabled:opacity-30"
                              >
                                Download DNA
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </DetailSection>

              <DetailSection title={t('تفاصيل القصة', 'Project Specifications')} icon="menu_book">
                <div className="grid grid-cols-2 md:grid-cols-3 gap-8">
                  <DetailItem label={t('عنوان القصة', 'Book Title')} value={order.storyData.title} />
                  <DetailItem label={t('اسم الطفل', "Hero Identity")} value={order.storyData.childName} />
                  <DetailItem label={t('عمر الطفل', "Age Group")} value={order.storyData.childAge} />
                  <DetailItem label={t('حجم الكتاب', 'Dimensionality')} value={order.storyData.size} />
                  <DetailItem label={t('الشخصية الرئيسية', 'Primary Asset')} value={order.storyData.mainCharacter?.name || '---'} />
                  {order.storyData.useSecondCharacter && (
                    <DetailItem label={t('الشخصية الثانوية', 'Support Asset')} value={order.storyData.secondCharacter?.name} />
                  )}
                </div>
              </DetailSection>

              <DetailSection title={t('تفاصيل المشاهد والرسوم', 'Sequence Visualization Data')} icon="image" className="col-span-full">
                <div className="space-y-4 max-h-[350px] overflow-y-auto pr-4 scroller-thin">
                  {(order.storyData.spreads || []).filter((s: any) => s.spreadNumber > 0).map((s: any) => (
                    <div key={s.spreadNumber} className="p-6 rounded-2xl bg-white/40 border border-white/60 hover:bg-white transition-all group">
                      <div className="flex items-center gap-4 mb-3">
                         <span className="w-8 h-8 flex items-center justify-center bg-brand-navy/5 rounded-lg text-[10px] font-black text-brand-navy">#{String(s.spreadNumber).padStart(2, '0')}</span>
                         <p className="text-xs font-black text-brand-navy uppercase tracking-widest">{t('المشهد', 'Sequence Segment')} {s.spreadNumber}</p>
                      </div>
                      <p className="text-xs font-medium text-brand-navy/60 italic leading-relaxed mb-4">"{s.leftText} {s.rightText}"</p>
                      <div className="p-4 rounded-xl bg-brand-navy/[0.03] border border-brand-navy/5 group-hover:bg-brand-navy/5 transition-colors">
                         <span className="text-[8px] font-black text-brand-navy/20 uppercase tracking-widest block mb-1">AI Render Prompt</span>
                         <p className="text-[10px] font-black text-brand-navy/40 uppercase tracking-wider leading-relaxed truncate">{s.actualPrompt}</p>
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

        <footer className="p-10 bg-white/40 border-t border-brand-navy/5 flex justify-end">
          <button 
             onClick={onClose}
             className="px-10 py-4 rounded-2xl bg-brand-navy text-white font-black text-[11px] uppercase tracking-[0.2em] shadow-2xl shadow-brand-navy/20 hover:scale-105 active:scale-95 transition-all"
          >
             {t('إغلاق', 'Secure Terminal')}
          </button>
        </footer>
      </div>
    </div>
  );
};

export default OrderPreviewModal;
