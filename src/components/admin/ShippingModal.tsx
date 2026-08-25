import React, { useState } from 'react';
import type { AdminOrder, Language } from '@/types';
import { Button } from '@/components/ui/Button';
import { Spinner } from '@/components/ui/Spinner';

interface ShippingModalProps {
  order?: AdminOrder | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess?: () => void;
  language: Language;
}

const POPULAR_COURIERS = [
  { id: 'dhl', name: 'DHL Express', defaultUrl: 'https://www.dhl.com/en/express/tracking.html?AWB=' },
  { id: 'aramex', name: 'Aramex', defaultUrl: 'https://www.aramex.com/track/results?shipmentNumber=' },
  { id: 'postaplus', name: 'Posta Plus', defaultUrl: 'https://www.postaplus.com/track?track_no=' },
  { id: 'shipox', name: 'Shipox Delivery', defaultUrl: '' },
  { id: 'smsa', name: 'SMSA Express', defaultUrl: 'https://www.smsaexpress.com/track?tracknumbers=' },
  { id: 'fedex', name: 'FedEx', defaultUrl: 'https://www.fedex.com/fedextrack/?trknbr=' },
  { id: 'local', name: 'Local Driver / Mandoub', defaultUrl: '' },
  { id: 'other', name: 'Other Courier', defaultUrl: '' }
];

export const ShippingModal: React.FC<ShippingModalProps> = ({ order, isOpen, onClose, onSuccess, language }) => {
  const [activeTab, setActiveTab] = useState<'manual' | 'bulk'>(order ? 'manual' : 'bulk');
  const [orderNumber, setOrderNumber] = useState(order?.orderNumber || '');
  const [courier, setCourier] = useState(POPULAR_COURIERS[0].name);
  const [awbNumber, setAwbNumber] = useState(order?.shippingDetails?.tracking?.awbNumber || '');
  const [trackingUrl, setTrackingUrl] = useState(order?.shippingDetails?.tracking?.trackingUrl || '');
  const [courierPhone, setCourierPhone] = useState(order?.shippingDetails?.tracking?.courierPhone || '');
  const [notes, setNotes] = useState(order?.shippingDetails?.tracking?.notes || '');
  
  // Bulk state
  const [file, setFile] = useState<File | null>(null);
  const [parsedRows, setParsedRows] = useState<Array<{ orderNumber: string; courier: string; awbNumber: string; trackingUrl?: string; courierPhone?: string }>>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [resultMessage, setResultMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  if (!isOpen) return null;
  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  // Auto-generate tracking URL when courier or AWB changes
  const handleCourierChange = (newCourierName: string) => {
    setCourier(newCourierName);
    const found = POPULAR_COURIERS.find(c => c.name === newCourierName);
    if (found && found.defaultUrl && awbNumber) {
      setTrackingUrl(found.defaultUrl + awbNumber);
    }
  };

  const handleAwbChange = (newAwb: string) => {
    setAwbNumber(newAwb);
    const found = POPULAR_COURIERS.find(c => c.name === courier);
    if (found && found.defaultUrl && newAwb) {
      setTrackingUrl(found.defaultUrl + newAwb.trim());
    }
  };

  // Handle Single Dispatch
  const handleSingleDispatch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderNumber || !awbNumber) {
      setResultMessage({ text: t('يرجى إدخال رقم الطلب ورقم التتبع AWB', 'Please enter Order Number and AWB Number'), type: 'error' });
      return;
    }

    setIsSubmitting(true);
    setResultMessage(null);

    try {
      const res = await fetch(`/api/admin/orders/${orderNumber}/ship`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          courier,
          awbNumber: awbNumber.trim(),
          trackingUrl: trackingUrl.trim(),
          courierPhone: courierPhone.trim(),
          notes: notes.trim()
        })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to dispatch order');

      setResultMessage({ text: t(`تم تحديث الطلب #${orderNumber} إلى مشحون وإرسال إيميل التتبع للعميل! 🎉`, `Order #${orderNumber} marked as shipped & tracking email sent! 🎉`), type: 'success' });
      if (onSuccess) setTimeout(() => onSuccess(), 1500);
    } catch (err: any) {
      setResultMessage({ text: err.message || 'Error dispatching order', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle CSV/Excel File Parse
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (!selectedFile) return;
    setFile(selectedFile);
    setResultMessage(null);

    try {
      const text = await selectedFile.text();
      const lines = text.split(/\r?\n/).filter(l => l.trim().length > 0);
      if (lines.length <= 1) {
        setResultMessage({ text: t('الملف فارغ أو لا يحتوي على صفوف بيانات', 'File is empty or contains no data rows'), type: 'error' });
        return;
      }

      const delimiter = lines[0].includes('\t') ? '\t' : (lines[0].includes(';') ? ';' : ',');
      const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

      const orderIdx = headers.findIndex(h => h.includes('order') || h.includes('رقم') || h.includes('protocol') || h.includes('id'));
      const courierIdx = headers.findIndex(h => h.includes('courier') || h.includes('شركة') || h.includes('carrier') || h.includes('shipping'));
      const awbIdx = headers.findIndex(h => h.includes('awb') || h.includes('tracking') || h.includes('تتبع') || h.includes('waybill'));
      const urlIdx = headers.findIndex(h => h.includes('url') || h.includes('link') || h.includes('رابط'));
      const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('هاتف') || h.includes('mobile'));

      const rows: typeof parsedRows = [];
      for (let i = 1; i < lines.length; i++) {
        const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
        const ord = orderIdx >= 0 ? cols[orderIdx] : cols[0];
        const cr = courierIdx >= 0 ? cols[courierIdx] : (cols[1] || 'Courier');
        const awb = awbIdx >= 0 ? cols[awbIdx] : (cols[2] || '');
        const url = urlIdx >= 0 ? cols[urlIdx] : (cols[3] || '');
        const ph = phoneIdx >= 0 ? cols[phoneIdx] : (cols[4] || '');

        if (ord && awb) {
          rows.push({ orderNumber: ord, courier: cr, awbNumber: awb, trackingUrl: url, courierPhone: ph });
        }
      }

      setParsedRows(rows);
      if (rows.length === 0) {
        setResultMessage({ text: t('لم يتم العثور على صفوف صالحة. تأكد من الأعمدة: رقم الطلب، شركة الشحن، رقم التتبع', 'No valid rows found. Ensure columns: Order Number, Courier, AWB Number'), type: 'error' });
      }
    } catch (err: any) {
      setResultMessage({ text: t('فشل في قراءة الملف: ', 'Failed to parse file: ') + err.message, type: 'error' });
    }
  };

  // Submit Bulk Dispatches
  const handleBulkSubmit = async () => {
    if (!parsedRows || parsedRows.length === 0) return;
    setIsSubmitting(true);
    setResultMessage(null);

    try {
      const res = await fetch('/api/admin/orders/bulk-ship', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ shipments: parsedRows })
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Bulk dispatch failed');

      setResultMessage({ 
        text: t(`تم شحن ${data.results?.successCount || 0} طلب بنجاح وإرسال إيميلات التتبع! 🎉 (${data.results?.errorCount || 0} أخطاء)`, 
                `Dispatched ${data.results?.successCount || 0} orders successfully & sent emails! 🎉 (${data.results?.errorCount || 0} errors)`), 
        type: 'success' 
      });

      if (onSuccess) setTimeout(() => onSuccess(), 2000);
    } catch (err: any) {
      setResultMessage({ text: err.message || 'Error processing bulk shipments', type: 'error' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex justify-center items-center p-4 animate-fade-in" onClick={onClose}>
      <div className="bg-white rounded-3xl shadow-2xl p-0 w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]" onClick={(e) => e.stopPropagation()}>
        
        {/* Header */}
        <div className="p-6 bg-gradient-to-r from-brand-navy to-brand-navy/90 text-white flex justify-between items-center">
          <div className="flex items-center gap-3">
            <span className="material-symbols-outlined text-3xl text-brand-orange">local_shipping</span>
            <div>
              <h3 className="text-xl font-bold">{t('إدارة وتتبع الشحن', 'Shipping & Tracking Management')}</h3>
              <p className="text-xs text-white/70">{t('إدخال أرقام التتبع وإشعار العملاء تلقائياً', 'Enter AWB tracking numbers & automatically notify customers')}</p>
            </div>
          </div>
          <button onClick={onClose} className="text-white/60 hover:text-white text-3xl font-light">&times;</button>
        </div>

        {/* Tabs */}
        <div className="flex border-b bg-gray-50 px-6">
          <button
            onClick={() => { setActiveTab('manual'); setResultMessage(null); }}
            className={`py-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'manual' ? 'border-brand-orange text-brand-orange bg-white' : 'border-transparent text-gray-500 hover:text-brand-navy'
            }`}
          >
            <span className="material-symbols-outlined text-base">edit_note</span>
            {t('شحن طلب مفرد', 'Single Order Dispatch')}
          </button>
          <button
            onClick={() => { setActiveTab('bulk'); setResultMessage(null); }}
            className={`py-3 px-4 text-sm font-bold border-b-2 transition-all flex items-center gap-2 ${
              activeTab === 'bulk' ? 'border-brand-orange text-brand-orange bg-white' : 'border-transparent text-gray-500 hover:text-brand-navy'
            }`}
          >
            <span className="material-symbols-outlined text-base">upload_file</span>
            {t('رفع ملف إكسل / CSV جماعي', 'Bulk Excel / CSV Upload')}
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-6">
          
          {resultMessage && (
            <div className={`p-4 rounded-2xl text-sm font-bold flex items-center gap-3 ${
              resultMessage.type === 'success' ? 'bg-emerald-50 text-emerald-800 border border-emerald-200' : 'bg-red-50 text-red-800 border border-red-200'
            }`}>
              <span className="material-symbols-outlined">{resultMessage.type === 'success' ? 'check_circle' : 'error'}</span>
              <span>{resultMessage.text}</span>
            </div>
          )}

          {activeTab === 'manual' ? (
            <form onSubmit={handleSingleDispatch} className="space-y-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600">{t('رقم الطلب (Order Number)', 'Order Number')} *</label>
                  <input
                    required
                    type="text"
                    value={orderNumber}
                    onChange={(e) => setOrderNumber(e.target.value)}
                    placeholder="RWY-XXXXXXX"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-orange outline-none font-mono font-bold text-sm"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600">{t('شركة الشحن (Courier)', 'Courier Service')} *</label>
                  <select
                    value={courier}
                    onChange={(e) => handleCourierChange(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-orange outline-none font-bold text-sm bg-white cursor-pointer"
                  >
                    {POPULAR_COURIERS.map(c => (
                      <option key={c.id} value={c.name}>{c.name}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600">{t('رقم البوليصة / التتبع (AWB #)', 'Tracking / AWB Number')} *</label>
                  <input
                    required
                    type="text"
                    value={awbNumber}
                    onChange={(e) => handleAwbChange(e.target.value)}
                    placeholder="e.g. 1234567890"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-orange outline-none font-mono font-bold text-sm text-brand-orange"
                  />
                </div>
                <div className="space-y-1.5">
                  <label className="text-xs font-bold text-gray-600">{t('هاتف مندوب الشحن (اختياري)', 'Courier Phone / Helpline')}</label>
                  <input
                    type="text"
                    value={courierPhone}
                    onChange={(e) => setCourierPhone(e.target.value)}
                    placeholder="+965 xxxxxxxx"
                    className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-orange outline-none font-bold text-sm"
                  />
                </div>
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">{t('رابط التتبع المباشر (Tracking URL)', 'Direct Tracking URL')}</label>
                <input
                  type="url"
                  value={trackingUrl}
                  onChange={(e) => setTrackingUrl(e.target.value)}
                  placeholder="https://..."
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-orange outline-none text-xs font-mono"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-xs font-bold text-gray-600">{t('ملاحظات إضافية للعميل (اختياري)', 'Internal / Delivery Notes')}</label>
                <input
                  type="text"
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                  placeholder={t('ملاحظات الشحن...', 'Delivery notes...')}
                  className="w-full px-4 py-2.5 rounded-xl border border-gray-200 focus:border-brand-orange outline-none text-sm"
                />
              </div>

              <div className="pt-4 flex justify-end gap-3">
                <Button onClick={onClose} variant="secondary" type="button">
                  {t('إلغاء', 'Cancel')}
                </Button>
                <Button disabled={isSubmitting} type="submit" className="bg-brand-orange text-white hover:bg-brand-orange/90 font-bold flex items-center gap-2">
                  {isSubmitting ? <><Spinner size="sm" color="text-white" /> {t('جاري الحفظ والإرسال...', 'Dispatching...')}</> : t('🚀 تأكيد الشحن وإرسال الإيميل', '🚀 Confirm Dispatch & Send Email')}
                </Button>
              </div>
            </form>
          ) : (
            <div className="space-y-6">
              <div className="p-4 bg-blue-50 border border-blue-200 rounded-2xl text-xs text-blue-900 space-y-2">
                <p className="font-bold flex items-center gap-1.5">
                  <span className="material-symbols-outlined text-base text-blue-600">info</span>
                  {t('تنسيق الملف المطلوب (.csv أو .xlsx):', 'Required File Format (.csv or .xlsx):')}
                </p>
                <p className="text-blue-800">
                  {t('يجب أن يحتوي الملف على الأعمدة التالية في الصف الأول:', 'The file must include the following headers in row 1:')}
                </p>
                <div className="bg-white p-2.5 rounded-xl font-mono text-[11px] border border-blue-100 flex flex-wrap gap-2 text-gray-700">
                  <span className="bg-blue-100/60 px-2 py-0.5 rounded font-bold">Order Number</span>
                  <span className="bg-blue-100/60 px-2 py-0.5 rounded font-bold">Courier</span>
                  <span className="bg-blue-100/60 px-2 py-0.5 rounded font-bold">AWB Number</span>
                  <span className="bg-gray-100 px-2 py-0.5 rounded">Tracking URL (Optional)</span>
                  <span className="bg-gray-100 px-2 py-0.5 rounded">Courier Phone (Optional)</span>
                </div>
              </div>

              <div className="border-2 border-dashed border-gray-200 rounded-2xl p-8 text-center hover:border-brand-orange transition-colors cursor-pointer bg-gray-50/50">
                <input
                  type="file"
                  accept=".csv, .xlsx, .txt"
                  onChange={handleFileChange}
                  className="hidden"
                  id="bulk-shipping-file-input"
                />
                <label htmlFor="bulk-shipping-file-input" className="cursor-pointer space-y-3 block">
                  <span className="material-symbols-outlined text-5xl text-gray-400">cloud_upload</span>
                  <div>
                    <p className="text-sm font-bold text-brand-navy">{file ? file.name : t('اضغط لاختيار ملف إكسل أو CSV', 'Click to choose an Excel or CSV file')}</p>
                    <p className="text-xs text-gray-400 mt-1">{file ? `${(file.size / 1024).toFixed(1)} KB` : t('يدعم ملفات .csv و .txt', 'Supports .csv and .xlsx')}</p>
                  </div>
                </label>
              </div>

              {parsedRows.length > 0 && (
                <div className="space-y-3">
                  <div className="flex justify-between items-center text-xs font-bold text-gray-600">
                    <span>{t(`معاينة الصفوف الجاهزة (${parsedRows.length} طلب):`, `Ready Rows Preview (${parsedRows.length} orders):`)}</span>
                  </div>
                  <div className="max-h-48 overflow-y-auto border rounded-xl overflow-hidden text-xs">
                    <table className="w-full text-left">
                      <thead className="bg-gray-100 font-bold text-gray-600">
                        <tr>
                          <th className="p-2">#</th>
                          <th className="p-2">{t('الطلب', 'Order')}</th>
                          <th className="p-2">{t('الشركة', 'Courier')}</th>
                          <th className="p-2">{t('رقم التتبع', 'AWB #')}</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y">
                        {parsedRows.map((r, idx) => (
                          <tr key={idx} className="hover:bg-gray-50">
                            <td className="p-2 font-mono text-gray-400">{idx + 1}</td>
                            <td className="p-2 font-mono font-bold text-brand-navy">{r.orderNumber}</td>
                            <td className="p-2">{r.courier}</td>
                            <td className="p-2 font-mono text-brand-orange">{r.awbNumber}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="pt-4 flex justify-end gap-3">
                    <Button onClick={onClose} variant="secondary">
                      {t('إلغاء', 'Cancel')}
                    </Button>
                    <Button
                      disabled={isSubmitting}
                      onClick={handleBulkSubmit}
                      className="bg-brand-orange text-white hover:bg-brand-orange/90 font-bold flex items-center gap-2"
                    >
                      {isSubmitting ? <><Spinner size="sm" color="text-white" /> {t('جاري المعالجة والإرسال...', 'Dispatching...')}</> : t(`🚀 شحن جميع الطلبات (${parsedRows.length})`, `🚀 Dispatch All (${parsedRows.length} Orders)`)}
                    </Button>
                  </div>
                </div>
              )}
            </div>
          )}

        </div>

      </div>
    </div>
  );
};

export default ShippingModal;
