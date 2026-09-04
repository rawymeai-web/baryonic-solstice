import React, { useRef } from 'react';
import type { AdminOrder, Language } from '@/types';
import { Button } from '@/components/ui/Button';

interface JobTicketModalProps {
  order: AdminOrder;
  onClose: () => void;
  language?: Language;
}

export const JobTicketModal: React.FC<JobTicketModalProps> = ({ order, onClose, language = 'ar' }) => {
  const printContainerRef = useRef<HTMLDivElement>(null);

  if (!order) return null;

  const t = (ar: string, en: string) => language === 'ar' ? ar : en;
  const isAr = language === 'ar';
  const ship: any = order.shippingDetails || {};
  const story: any = order.storyData || {};
  const spreads = (story.spreads || []).filter((s: any) => s && s.spreadNumber !== undefined);
  const isPhysical = ship.isPhysicalDelivery ?? (order.total > 15 || !!story.isPhysicalPrint);
  const isExpress = ship.shippingMethod === 'express' || ship.deliverySpeed === 'express';

  const hasSecondHero = !!story.useSecondCharacter || !!story.secondCharacter?.name;
  const hasGiftWrap = !!story.isGiftWrapping || !!ship.isGiftWrapping || !!story.giftWrapping;
  const hasGiftCard = !!story.isGiftCard || !!ship.isGiftCard || !!story.giftCard;
  const giftMessage = story.giftMessage || ship.giftMessage || story.customGiftMessage || '';
  const hasCustomEvent = !!story.occasion || !!story.customEvent || (story.theme && story.theme.toLowerCase().includes('custom'));

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/70 backdrop-blur-sm flex justify-center items-start p-2 sm:p-6 animate-fade-in print:p-0 print:bg-white print:overflow-visible">
      {/* Print Stylesheet */}
      <style jsx global>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #rawy-job-ticket, #rawy-job-ticket * {
            visibility: visible;
          }
          #rawy-job-ticket {
            position: absolute;
            left: 0;
            top: 0;
            width: 100% !important;
            max-width: 100% !important;
            margin: 0 !important;
            padding: 15mm !important;
            background: white !important;
            box-shadow: none !important;
            border-radius: 0 !important;
          }
          .no-print {
            display: none !important;
          }
          .page-break-before {
            page-break-before: always;
            break-before: page;
          }
          .page-break-inside-avoid {
            page-break-inside: avoid;
            break-inside: avoid;
          }
        }
      `}</style>

      {/* Main Ticket Container */}
      <div 
        id="rawy-job-ticket"
        ref={printContainerRef}
        className="bg-white rounded-[2.5rem] shadow-2xl w-full max-w-5xl overflow-hidden border border-gray-200 my-4 text-brand-navy print:border-none print:shadow-none print:my-0"
      >
        {/* Top Floating Actions Bar (Hidden on Print) */}
        <div className="no-print bg-gradient-to-r from-brand-navy to-[#182338] text-white p-4 sm:p-6 flex flex-wrap items-center justify-between gap-4 sticky top-0 z-40 shadow-lg">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-brand-orange text-white flex items-center justify-center font-black shadow-md">
              <span className="material-symbols-outlined text-xl">receipt_long</span>
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black uppercase tracking-wider flex items-center gap-2">
                {t('تذكرة أمر الإنتاج والطباعة (Job Ticket)', 'Workshop Production Job Ticket')}
                <span className="text-xs bg-brand-orange/30 text-brand-orange border border-brand-orange/40 px-2.5 py-0.5 rounded-full font-mono">
                  #{order.orderNumber}
                </span>
              </h2>
              <p className="text-[11px] text-white/60 font-medium">
                {t('جاهزة للطباعة والتحميل بتنسيق A4 للمشغل والورشة', 'Ready for A4 Print & Workshop Quality Control')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={handlePrint}
              className="px-5 py-2.5 bg-brand-orange hover:bg-brand-orange/90 text-white rounded-xl text-xs font-black uppercase tracking-wider shadow-md hover:scale-105 active:scale-95 transition-all flex items-center gap-2"
            >
              <span className="material-symbols-outlined text-base">print</span>
              {t('طباعة التذكرة (Print PDF)', 'Print Job Ticket (PDF)')}
            </button>
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all text-xl font-light"
              title="Close"
            >
              &times;
            </button>
          </div>
        </div>

        {/* Printable Ticket Body */}
        <div className="p-6 sm:p-10 space-y-8 bg-white">
          
          {/* Header & Order Meta */}
          <div className="border-b-2 border-brand-navy/10 pb-6 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <span className="text-2xl sm:text-3xl font-black tracking-tight text-brand-navy">RAWY • راوي</span>
                <span className="text-xs font-black uppercase tracking-widest px-3 py-1 bg-brand-navy text-white rounded-full">
                  Workshop Ticket
                </span>
              </div>
              <p className="text-xs text-brand-navy/50 font-bold uppercase tracking-widest">
                AI Personalized Storybooks & Luxury Hardcover Bindery
              </p>
            </div>

            <div className="text-left sm:text-right space-y-1">
              <div className="text-2xl font-black font-mono text-brand-orange tracking-tight">
                #{order.orderNumber}
              </div>
              <p className="text-xs text-gray-500 font-bold">
                {t('تاريخ الطلب:', 'Order Date:')} {new Date(order.orderDate).toLocaleString()}
              </p>
              <div className="flex items-center sm:justify-end gap-2 pt-1">
                <span className={`text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full ${
                  isPhysical ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-blue-100 text-blue-900 border border-blue-300'
                }`}>
                  {isPhysical ? '📦 ' + t('طباعة ورقية فاخرة (Hardcover)', 'Physical Hardcover Print') : '📥 ' + t('نسخة رقمية (Digital Only)', 'Digital Softcopy Only')}
                </span>
                <span className="text-[10px] font-black uppercase tracking-widest px-3 py-1 rounded-full bg-emerald-100 text-emerald-800 border border-emerald-300">
                  {order.status.replace(/_/g, ' ')}
                </span>
              </div>
            </div>
          </div>

          {/* Section 1: Customer & Shipping Information */}
          <div className="page-break-inside-avoid border-2 border-brand-navy/10 rounded-3xl p-6 bg-[#FAFAF8] space-y-4">
            <div className="flex items-center justify-between border-b border-brand-navy/10 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-brand-navy flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-brand-orange">local_shipping</span>
                {t('بيانات العميل ووجهة الشحن والتسليم', 'Customer & Shipping Destination')}
              </h3>
              
              {/* Delivery Speed Badge */}
              <div className={`px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
                isExpress 
                  ? 'bg-red-500 text-white shadow-md shadow-red-500/20 animate-pulse' 
                  : 'bg-brand-navy text-white'
              }`}>
                <span className="material-symbols-outlined text-sm">
                  {isExpress ? 'bolt' : 'schedule'}
                </span>
                {isExpress 
                  ? t('⚡ شحن فوري سريع (٢ - ٧ أيام عمل حول العالم)', '⚡ Express Delivery (2–7 Business Days Worldwide)') 
                  : t('🚚 شحن قياسي (٤ - ١٢ يوم عمل)', '🚚 Standard Delivery (4–12 Business Days)')
                }
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">{t('اسم المستلم', 'Recipient Name')}</p>
                <p className="text-sm font-black text-brand-navy">{ship.name || order.customerName || 'N/A'}</p>
                <p className="text-[11px] text-gray-600 font-medium">{ship.email || 'N/A'}</p>
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">{t('رقم الهاتف للتواصل', 'Phone Number')}</p>
                <p className="text-sm font-mono font-black text-brand-navy">{ship.phone || 'N/A'}</p>
                {ship.phone && (
                  <p className="text-[10px] text-emerald-700 font-bold">✓ {t('معتمد للواتساب وشركة الشحن', 'Verified for Courier SMS/WhatsApp')}</p>
                )}
              </div>

              <div className="space-y-1.5">
                <p className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">{t('البلد والمدينة', 'Country & City')}</p>
                <p className="text-sm font-black text-brand-navy">
                  {ship.countryName || ship.country || 'Kuwait'}, {ship.city || ship.area || ''}
                </p>
                {ship.governorate && <p className="text-[11px] text-gray-600 font-medium">{ship.governorate}</p>}
              </div>
            </div>

            {/* Detailed Address Grid */}
            <div className="pt-3 border-t border-brand-navy/10 space-y-2">
              <p className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">{t('العنوان التفصيلي للتوصيل', 'Detailed Delivery Address')}</p>
              <div className="bg-white p-3.5 rounded-2xl border border-brand-navy/10 text-xs font-semibold text-brand-navy leading-relaxed">
                {ship.address ? (
                  <p>{ship.address}</p>
                ) : (
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    <div><span className="text-gray-400">{t('المنطقة:', 'Area:')}</span> {ship.area || '-'}</div>
                    <div><span className="text-gray-400">{t('القطعة:', 'Block:')}</span> {ship.block || '-'}</div>
                    <div><span className="text-gray-400">{t('الشارع:', 'Street:')}</span> {ship.street || '-'}</div>
                    <div><span className="text-gray-400">{t('المبنى/المنزل:', 'Building:')}</span> {ship.building || '-'}</div>
                    <div><span className="text-gray-400">{t('الدور/الشقة:', 'Floor/Apt:')}</span> {ship.floorApt || '-'}</div>
                    <div><span className="text-gray-400">{t('الرمز البريدي:', 'Postal:')}</span> {ship.postalCode || '-'}</div>
                  </div>
                )}
              </div>

              {ship.deliveryNotes && (
                <div className="bg-amber-50 border border-amber-200 p-2.5 rounded-xl text-xs text-amber-900 flex items-start gap-2">
                  <span className="material-symbols-outlined text-sm text-amber-600 shrink-0 mt-0.5">sticky_note_2</span>
                  <div>
                    <strong>{t('ملاحظات العميل للتوصيل: ', 'Customer Delivery Notes: ')}</strong>
                    <span>{ship.deliveryNotes}</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Section 2: Book Technical Specifications & Add-ons Matrix */}
          <div className="page-break-inside-avoid grid grid-cols-1 md:grid-cols-2 gap-6">
            
            {/* Book Spec Card */}
            <div className="border-2 border-brand-navy/10 rounded-3xl p-6 bg-white space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-brand-navy flex items-center gap-2 border-b border-brand-navy/10 pb-3">
                <span className="material-symbols-outlined text-lg text-brand-teal">auto_stories</span>
                {t('مواصفات القصة والكتاب المطبوع', 'Story & Book Specifications')}
              </h3>

              <div className="grid grid-cols-2 gap-3 text-xs">
                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">{t('عنوان القصة', 'Title')}</span>
                  <p className="font-black text-brand-navy text-sm">{story.title || 'Untitled'}</p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">{t('البطل الرئيسي', 'Main Hero')}</span>
                  <p className="font-black text-brand-teal text-sm">
                    {story.childName || story.mainCharacter?.name || 'N/A'} ({story.childAge || story.mainCharacter?.age || '5'} {t('سنوات', 'yrs')})
                  </p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">{t('الثيم المعتمد', 'Story Theme')}</span>
                  <p className="font-bold text-gray-800">{story.theme || 'Custom Theme'}</p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">{t('أسلوب الرسم الفني', 'Art Style')}</span>
                  <p className="font-bold text-gray-800">{story.styleName || story.selectedStyleNames?.[0] || 'Pixar 3D'}</p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">{t('مقاس التجليد', 'Book Format')}</span>
                  <p className="font-bold text-gray-800">{story.size || 'A4 Hardcover Landscape'}</p>
                </div>

                <div className="space-y-0.5">
                  <span className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">{t('لغة الطباعة والتوجيه', 'Language & Reading')}</span>
                  <p className="font-bold text-gray-800">
                    {(story.language || language).toUpperCase()} • {story.readingDirection === 'ltr' ? 'LTR (Left to Right)' : 'RTL (Right to Left)'}
                  </p>
                </div>
              </div>

              {/* Hero DNA Thumbnail Preview if available */}
              {(story.mainCharacter?.imageBases64?.[0] || story.mainCharacter?.imageDNA?.[0] || story.mainCharacterImageBase64) && (
                <div className="pt-3 border-t border-brand-navy/10 flex items-center gap-3">
                  <div className="w-14 h-14 rounded-xl overflow-hidden border border-brand-navy/20 bg-gray-50 shrink-0">
                    <img 
                      src={story.mainCharacter?.imageBases64?.[0] || story.mainCharacter?.imageDNA?.[0] || story.mainCharacterImageBase64} 
                      alt="Hero DNA" 
                      className="w-full h-full object-cover" 
                    />
                  </div>
                  <div className="text-xs">
                    <p className="font-black text-brand-navy">{t('صورة وجه الطفل المعتمدة (DNA)', 'Locked Hero Reference')}</p>
                    <p className="text-[10px] text-gray-500">{story.mainCharacter?.description || t('تطابق الوجه والميزات الفنية', 'Facial consistency reference')}</p>
                  </div>
                </div>
              )}
            </div>

            {/* Add-ons & Packaging Checklist */}
            <div className="border-2 border-brand-navy/10 rounded-3xl p-6 bg-white space-y-4">
              <h3 className="text-sm font-black uppercase tracking-wider text-brand-navy flex items-center gap-2 border-b border-brand-navy/10 pb-3">
                <span className="material-symbols-outlined text-lg text-brand-orange">featured_seasonal_and_gifts</span>
                {t('قائمة الإضافات والتغليف الفاخر (Add-ons Checklist)', 'Add-ons & Luxury Packaging Checklist')}
              </h3>

              <div className="space-y-3 text-xs">
                {/* 1. Second Character */}
                <div className={`p-3 rounded-2xl border flex items-start justify-between gap-3 ${
                  hasSecondHero ? 'bg-orange-50/70 border-brand-orange/30 text-brand-navy' : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}>
                  <div className="space-y-0.5">
                    <p className="font-black flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-brand-orange">group</span>
                      {t('بطل إضافي بالقصة (Second Hero)', 'Second Hero Included')}
                    </p>
                    {hasSecondHero ? (
                      <p className="text-[11px] text-gray-700 font-bold">
                        {story.secondCharacter?.name || t('شخصية ثانوية', 'Second Character')} ({story.secondCharacter?.relationship || t('مرافق', 'Companion')})
                      </p>
                    ) : (
                      <p className="text-[10px]">{t('غير محدد في هذا الطلب', 'Not included')}</p>
                    )}
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                    hasSecondHero ? 'bg-brand-orange text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {hasSecondHero ? '✓ YES' : 'NO'}
                  </span>
                </div>

                {/* 2. Custom Theme / Occasion */}
                <div className={`p-3 rounded-2xl border flex items-start justify-between gap-3 ${
                  hasCustomEvent ? 'bg-teal-50/70 border-brand-teal/30 text-brand-navy' : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}>
                  <div className="space-y-0.5">
                    <p className="font-black flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-brand-teal">celebration</span>
                      {t('مناسبة خاصة أو ثيم مخصص', 'Special Occasion / Theme')}
                    </p>
                    {hasCustomEvent ? (
                      <p className="text-[11px] text-gray-700 font-bold">
                        {story.occasion || story.customEvent || story.theme}
                      </p>
                    ) : (
                      <p className="text-[10px]">{t('ثيم قياسي', 'Standard theme')}</p>
                    )}
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                    hasCustomEvent ? 'bg-brand-teal text-white' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {hasCustomEvent ? '✓ YES' : 'NO'}
                  </span>
                </div>

                {/* 3. Luxury Gift Wrapping */}
                <div className={`p-3 rounded-2xl border flex items-start justify-between gap-3 ${
                  hasGiftWrap ? 'bg-purple-50/80 border-purple-300 text-purple-950 font-bold' : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}>
                  <div className="space-y-0.5">
                    <p className="font-black flex items-center gap-1.5">
                      <span className="material-symbols-outlined text-base text-purple-600">redeem</span>
                      {t('تغليف هدايا فاخر وشريط ذهبي 🎁', 'Luxury Gift Packaging & Ribbon 🎁')}
                    </p>
                    <p className="text-[10px] text-purple-700">
                      {hasGiftWrap ? t('مطلوب: تغليف الكتاب في غلاف راوي الملكي مع شريط الهدية', 'MUST: Pack book in Royal Rawy wrap & gift ribbon') : t('تغليف بريدي قياسي', 'Standard protective mailer')}
                    </p>
                  </div>
                  <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                    hasGiftWrap ? 'bg-purple-600 text-white shadow-sm' : 'bg-gray-200 text-gray-600'
                  }`}>
                    {hasGiftWrap ? '🎁 REQUIRED' : 'NO'}
                  </span>
                </div>

                {/* 4. Personalized Gift Card */}
                <div className={`p-3.5 rounded-2xl border space-y-2 ${
                  hasGiftCard || giftMessage ? 'bg-amber-50/80 border-amber-300 text-amber-950' : 'bg-gray-50 border-gray-200 text-gray-400'
                }`}>
                  <div className="flex items-center justify-between">
                    <p className="font-black flex items-center gap-1.5 text-xs">
                      <span className="material-symbols-outlined text-base text-amber-600">mail</span>
                      {t('بطاقة إهداء مخصصة مطبوعة 💌', 'Personalized Gift Card 💌')}
                    </p>
                    <span className={`text-[10px] font-black uppercase px-2.5 py-0.5 rounded-full ${
                      hasGiftCard || giftMessage ? 'bg-amber-600 text-white' : 'bg-gray-200 text-gray-600'
                    }`}>
                      {hasGiftCard || giftMessage ? '💌 PRINT CARD' : 'NO'}
                    </span>
                  </div>

                  {(hasGiftCard || giftMessage) && (
                    <div className="bg-white p-3 rounded-xl border border-amber-200 shadow-sm text-xs space-y-1">
                      <p className="text-[10px] font-bold text-amber-800 uppercase tracking-wider">{t('نص الإهداء للطباعة على الكرت:', 'Exact Card Message to Print:')}</p>
                      <p className="italic font-serif text-brand-navy leading-relaxed text-sm bg-amber-50/40 p-2 rounded border border-amber-100">
                        "{giftMessage || t('ألف مبروك! قراءة ممتعة مليئة بالمغامرات والإلهام ✨', 'Best wishes on your magical reading journey! ✨')}"
                      </p>
                    </div>
                  )}
                </div>

              </div>
            </div>

          </div>

          {/* Section 3: Visual Spreads Production Preview */}
          <div className="page-break-before space-y-4">
            <div className="flex items-center justify-between border-b-2 border-brand-navy/10 pb-3">
              <h3 className="text-sm font-black uppercase tracking-wider text-brand-navy flex items-center gap-2">
                <span className="material-symbols-outlined text-lg text-brand-orange">palette</span>
                {t('معاينة المشاهد والصفحات للطباعة والتجليد', 'Visual Production Spreads Sheet')}
              </h3>
              <span className="text-xs font-black text-brand-navy/40 uppercase tracking-widest">
                {spreads.length} {t('مشاهد وصفحات مصورة', 'Generated Spreads')}
              </span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {spreads.map((spread: any, idx: number) => {
                const img = spread.imageUrl || spread.cleanSpreadUrl || spread.upscaledImage || (spread.images && spread.images[0]);
                const text = spread.leftText || spread.text || spread.rightText || spread.content || '';
                return (
                  <div 
                    key={idx} 
                    className="page-break-inside-avoid border border-gray-200 rounded-2xl p-3 bg-[#FCFCFA] space-y-2 flex flex-col justify-between"
                  >
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 bg-brand-navy text-white rounded-md">
                          {spread.spreadNumber === 0 ? t('الغلاف الرئيسي (Cover)', 'Cover Spread') : `Spread #${spread.spreadNumber}`}
                        </span>
                        {spread.status && (
                          <span className="text-[9px] font-bold text-gray-400 uppercase">{spread.status}</span>
                        )}
                      </div>

                      {/* Image Preview Box */}
                      <div className="aspect-[16/9] w-full bg-gray-100 rounded-xl overflow-hidden border border-gray-200 flex items-center justify-center">
                        {img ? (
                          <img src={img} alt={`Spread ${spread.spreadNumber}`} className="w-full h-full object-cover" />
                        ) : (
                          <div className="text-center p-2 text-gray-400 space-y-1">
                            <span className="material-symbols-outlined text-2xl">image</span>
                            <p className="text-[9px] font-bold">Image Generating / Pending</p>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Text Preview */}
                    <div className="pt-2 border-t border-gray-100 text-[11px] text-gray-700 leading-snug line-clamp-3">
                      {text ? `"${text}"` : <span className="text-gray-400 italic">No text provided</span>}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Section 4: Workshop Quality Control & Sign-off */}
          <div className="page-break-inside-avoid border-2 border-brand-navy/10 rounded-3xl p-6 bg-white space-y-4">
            <h3 className="text-sm font-black uppercase tracking-wider text-brand-navy flex items-center gap-2 border-b border-brand-navy/10 pb-3">
              <span className="material-symbols-outlined text-lg text-emerald-600">verified</span>
              {t('مراقبة الجودة واعتماد التجهيز والشحن (Workshop QA Sign-off)', 'Workshop Quality Control & Packaging Sign-off')}
            </h3>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs font-bold text-brand-navy">
              <label className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange" />
                <span>{t('معايرة الألوان والطباعة', 'Color & Print Quality')}</span>
              </label>

              <label className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange" />
                <span>{t('تطابق اسم وصورة البطل', 'Hero Name & DNA Verified')}</span>
              </label>

              <label className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange" />
                <span>{t('جودة التجليد والغلاف', 'Hardcover Binding & Spine')}</span>
              </label>

              <label className="flex items-center gap-2 bg-gray-50 p-2.5 rounded-xl border border-gray-200 cursor-pointer">
                <input type="checkbox" className="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange" />
                <span>{t('إرفاق التغليف والكرت 🎁', 'Gift Wrap & Card Included')}</span>
              </label>
            </div>

            <div className="pt-4 border-t border-brand-navy/10 grid grid-cols-1 sm:grid-cols-3 gap-6 text-xs">
              <div>
                <p className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">{t('توقيع مسؤول الإنتاج', 'Production Lead Signature')}</p>
                <div className="h-10 border-b-2 border-dashed border-gray-300 mt-2"></div>
              </div>

              <div>
                <p className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">{t('توقيع مسؤول التغليف والتسليم', 'Packaging & QA Inspector')}</p>
                <div className="h-10 border-b-2 border-dashed border-gray-300 mt-2"></div>
              </div>

              <div>
                <p className="text-[10px] font-black text-brand-navy/40 uppercase tracking-widest">{t('ختم الورشة والتاريخ', 'Workshop Stamp & Date')}</p>
                <div className="h-10 border-b-2 border-dashed border-gray-300 mt-2"></div>
              </div>
            </div>
          </div>

          {/* Footer Bar */}
          <div className="text-center text-[10px] text-gray-400 uppercase tracking-widest border-t border-gray-200 pt-4">
            Rawy Personalized Storybooks • Automated Fulfillment Engine • Document Generated {new Date().toLocaleDateString()}
          </div>

        </div>

      </div>
    </div>
  );
};

export default JobTicketModal;
