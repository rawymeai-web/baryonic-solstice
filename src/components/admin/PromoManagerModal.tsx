import React, { useState, useEffect } from 'react';
import type { PromoCode, Language } from '@/types';
import * as adminService from '@/services/adminService';
import { Button } from '@/components/ui/Button';

interface PromoManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  language?: Language;
}

export const PromoManagerModal: React.FC<PromoManagerModalProps> = ({ isOpen, onClose, language = 'ar' }) => {
  const [promoCodes, setPromoCodes] = useState<PromoCode[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  // Form State for New / Editing Promo Code
  const [editingCode, setEditingCode] = useState<Partial<PromoCode> | null>(null);

  const t = (ar: string, en: string) => language === 'ar' ? ar : en;

  const loadPromoCodes = async () => {
    setIsLoading(true);
    try {
      const list = await adminService.getPromoCodes();
      setPromoCodes(list);
    } catch (e) {
      console.error('Failed to load promo codes:', e);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadPromoCodes();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingCode?.code || !editingCode?.discountValue) {
      alert(t('يرجى ملء كود الخصم وقيمة الخصم', 'Please fill promo code and discount value'));
      return;
    }

    setIsSaving(true);
    try {
      await adminService.savePromoCode({
        ...editingCode,
        code: editingCode.code.trim().toUpperCase(),
        discountType: editingCode.discountType || 'percentage',
        discountValue: Number(editingCode.discountValue),
        appliesTo: editingCode.appliesTo || 'all',
        allowSubscriptions: editingCode.allowSubscriptions ?? true,
        isActive: editingCode.isActive ?? true
      });
      setEditingCode(null);
      await loadPromoCodes();
      alert(t('تم حفظ كود الخصم بنجاح! 🎉', 'Promo code saved successfully! 🎉'));
    } catch (err: any) {
      alert(`Error: ${err.message}`);
    } finally {
      setIsSaving(false);
    }
  };

  const handleToggle = async (code: PromoCode) => {
    try {
      await adminService.togglePromoCodeStatus(code.id || code.code, !code.isActive);
      await loadPromoCodes();
    } catch (e: any) {
      alert(`Failed to toggle: ${e.message}`);
    }
  };

  const handleDelete = async (code: PromoCode) => {
    if (!confirm(t(`هل أنت متأكد من حذف كود الخصم ${code.code}؟`, `Delete promo code ${code.code}?`))) return;
    try {
      await adminService.deletePromoCode(code.id || code.code);
      await loadPromoCodes();
    } catch (e: any) {
      alert(`Failed to delete: ${e.message}`);
    }
  };

  const filtered = promoCodes.filter(p => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return p.code.toLowerCase().includes(q) || 
      (p.description?.ar || '').toLowerCase().includes(q) || 
      (p.description?.en || '').toLowerCase().includes(q);
  });

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex justify-center items-center p-4 animate-fade-in">
      <div className="bg-white rounded-[3rem] shadow-2xl w-full max-w-5xl overflow-hidden border border-gray-100 flex flex-col max-h-[92vh]">
        
        {/* Header */}
        <div className="bg-brand-navy text-white p-6 sm:p-8 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-brand-orange text-white flex items-center justify-center font-black shadow-lg shadow-brand-orange/30">
              <span className="material-symbols-outlined text-2xl">sell</span>
            </div>
            <div>
              <h2 className="text-xl sm:text-2xl font-black uppercase tracking-tight">
                {t('إدارة كوبونات وأكواد الخصم', 'Promo & Discount Code Engine')}
              </h2>
              <p className="text-xs text-white/60 font-medium mt-0.5">
                {t('تحكم بنسب وقيم الخصومات، التواريخ، ونطاق التطبيق على السلة والاشتراكات', 'Manage discount rules, expiry dates, scopes, and subscription limits')}
              </p>
            </div>
          </div>

          <button 
            onClick={onClose} 
            className="w-10 h-10 rounded-2xl bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-all text-2xl font-light"
          >
            &times;
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 sm:p-8 overflow-y-auto space-y-8 flex-1 bg-[#FFFDF9]">
          
          {/* Top Bar: Search & New Promo Trigger */}
          <div className="flex flex-col sm:flex-row justify-between items-stretch sm:items-center gap-4">
            <div className="relative flex-1 group">
              <span className="material-symbols-outlined absolute left-4 top-1/2 -translate-y-1/2 text-brand-navy/30 group-focus-within:text-brand-orange text-lg">
                search
              </span>
              <input
                type="text"
                value={searchQuery}
                onChange={e => setSearchQuery(e.target.value)}
                placeholder={t('بحث عن كود أو وصف...', 'Search promo codes...')}
                className="w-full pl-11 pr-4 py-3 bg-white rounded-2xl border border-brand-navy/10 text-xs font-bold outline-none focus:border-brand-orange focus:ring-4 focus:ring-brand-orange/10 transition-all shadow-sm"
              />
            </div>

            <button
              onClick={() => setEditingCode({
                code: '',
                discountType: 'percentage',
                discountValue: 15,
                appliesTo: 'all',
                allowSubscriptions: true,
                isActive: true,
                description: { ar: 'خصم 15%', en: '15% Discount' }
              })}
              className="px-6 py-3 bg-brand-orange hover:bg-brand-orange/90 text-white font-black text-xs uppercase tracking-wider rounded-2xl shadow-lg shadow-brand-orange/20 hover:scale-105 active:scale-95 transition-all flex items-center justify-center gap-2"
            >
              <span className="material-symbols-outlined text-lg">add_circle</span>
              {t('إنشاء كود جديد', 'New Promo Code')}
            </button>
          </div>

          {/* Create / Edit Form Drawer */}
          {editingCode && (
            <form onSubmit={handleSave} className="bg-white p-6 rounded-3xl border-2 border-brand-orange/30 shadow-xl space-y-6 animate-fade-in">
              <div className="flex items-center justify-between border-b pb-3">
                <h3 className="font-black text-brand-navy text-sm uppercase tracking-wider flex items-center gap-2">
                  <span className="material-symbols-outlined text-brand-orange">edit_note</span>
                  {editingCode.id ? t('تعديل كود الخصم', 'Edit Promo Code') : t('إنشاء كود خصم جديد', 'Create New Promo Code')}
                </h3>
                <button type="button" onClick={() => setEditingCode(null)} className="text-gray-400 hover:text-gray-600 text-sm">
                  ✕ {t('إلغاء', 'Cancel')}
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
                {/* Promo Code String */}
                <div className="space-y-1">
                  <label className="font-black text-brand-navy/60 uppercase tracking-wider">{t('رمز الكود (Code)', 'Promo Code')}</label>
                  <input
                    type="text"
                    required
                    value={editingCode.code || ''}
                    onChange={e => setEditingCode({ ...editingCode, code: e.target.value.toUpperCase() })}
                    placeholder="e.g. SUMMER25"
                    className="w-full p-3 uppercase font-mono font-black text-brand-navy bg-gray-50 border rounded-xl focus:bg-white focus:border-brand-orange outline-none"
                  />
                </div>

                {/* Discount Type */}
                <div className="space-y-1">
                  <label className="font-black text-brand-navy/60 uppercase tracking-wider">{t('نوع الخصم', 'Discount Type')}</label>
                  <select
                    value={editingCode.discountType || 'percentage'}
                    onChange={e => setEditingCode({ ...editingCode, discountType: e.target.value as any })}
                    className="w-full p-3 font-bold text-brand-navy bg-gray-50 border rounded-xl focus:bg-white focus:border-brand-orange outline-none"
                  >
                    <option value="percentage">{t('نسبة مئوية (%)', 'Percentage (%)')}</option>
                    <option value="fixed_value">{t('مبلغ ثابت (د.ك KWD)', 'Fixed Value (KWD)')}</option>
                  </select>
                </div>

                {/* Discount Value */}
                <div className="space-y-1">
                  <label className="font-black text-brand-navy/60 uppercase tracking-wider">
                    {editingCode.discountType === 'percentage' ? t('نسبة الخصم (%)', 'Discount %') : t('قيمة الخصم (د.ك)', 'Discount Amount (KWD)')}
                  </label>
                  <input
                    type="number"
                    step="0.001"
                    min="0"
                    required
                    value={editingCode.discountValue ?? ''}
                    onChange={e => setEditingCode({ ...editingCode, discountValue: Number(e.target.value) })}
                    placeholder="e.g. 15 or 5.000"
                    className="w-full p-3 font-black text-brand-navy bg-gray-50 border rounded-xl focus:bg-white focus:border-brand-orange outline-none"
                  />
                </div>

                {/* Applies To Scope */}
                <div className="space-y-1">
                  <label className="font-black text-brand-navy/60 uppercase tracking-wider">{t('نطاق تطبيق الخصم', 'Applies To Scope')}</label>
                  <select
                    value={editingCode.appliesTo || 'all'}
                    onChange={e => setEditingCode({ ...editingCode, appliesTo: e.target.value as any })}
                    className="w-full p-3 font-bold text-brand-navy bg-gray-50 border rounded-xl focus:bg-white focus:border-brand-orange outline-none"
                  >
                    <option value="all">{t('🌟 إجمالي السلة بالكامل (All)', 'Entire Order Total')}</option>
                    <option value="product">{t('📖 الكتب والقصص فقط (Products)', 'Storybooks / Products Only')}</option>
                    <option value="shipping">{t('🚚 الشحن فقط (Shipping Only)', 'Shipping Charges Only')}</option>
                    <option value="addons">{t('🎁 الإضافات والتغليف فقط (Add-ons)', 'Add-ons & Packaging Only')}</option>
                  </select>
                </div>

                {/* Expiry Date */}
                <div className="space-y-1">
                  <label className="font-black text-brand-navy/60 uppercase tracking-wider">{t('تاريخ الانتهاء (اختياري)', 'Expiry Date (Optional)')}</label>
                  <input
                    type="date"
                    value={editingCode.expiryDate ? editingCode.expiryDate.split('T')[0] : ''}
                    onChange={e => setEditingCode({ ...editingCode, expiryDate: e.target.value ? new Date(e.target.value).toISOString() : undefined })}
                    className="w-full p-3 font-bold text-brand-navy bg-gray-50 border rounded-xl focus:bg-white focus:border-brand-orange outline-none"
                  />
                </div>

                {/* Min Order Amount */}
                <div className="space-y-1">
                  <label className="font-black text-brand-navy/60 uppercase tracking-wider">{t('الحد الأدنى للطلب (د.ك)', 'Min Order Total (KWD)')}</label>
                  <input
                    type="number"
                    step="0.5"
                    min="0"
                    value={editingCode.minOrderAmount ?? ''}
                    onChange={e => setEditingCode({ ...editingCode, minOrderAmount: e.target.value ? Number(e.target.value) : undefined })}
                    placeholder="e.g. 10.000"
                    className="w-full p-3 font-bold text-brand-navy bg-gray-50 border rounded-xl focus:bg-white focus:border-brand-orange outline-none"
                  />
                </div>
              </div>

              {/* Subscriptions & Active Toggles */}
              <div className="pt-3 border-t flex flex-wrap items-center justify-between gap-4">
                <div className="flex items-center gap-6">
                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-brand-navy">
                    <input
                      type="checkbox"
                      checked={editingCode.allowSubscriptions ?? true}
                      onChange={e => setEditingCode({ ...editingCode, allowSubscriptions: e.target.checked })}
                      className="w-4 h-4 rounded text-brand-orange focus:ring-brand-orange"
                    />
                    <span>{t('ينطبق على الاشتراكات الشهرية والسنوية', 'Allow Subscriptions (Monthly & Yearly)')}</span>
                  </label>

                  <label className="flex items-center gap-2 cursor-pointer text-xs font-bold text-brand-navy">
                    <input
                      type="checkbox"
                      checked={editingCode.isActive ?? true}
                      onChange={e => setEditingCode({ ...editingCode, isActive: e.target.checked })}
                      className="w-4 h-4 rounded text-brand-teal focus:ring-brand-teal"
                    />
                    <span>{t('مفعل حالياً (Active)', 'Active Status')}</span>
                  </label>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    type="button"
                    onClick={() => setEditingCode(null)}
                    className="px-5 py-2.5 rounded-xl border border-gray-200 text-xs font-bold text-gray-600 hover:bg-gray-100"
                  >
                    {t('إلغاء', 'Cancel')}
                  </button>
                  <button
                    type="submit"
                    disabled={isSaving}
                    className="px-6 py-2.5 bg-brand-orange hover:bg-brand-orange/90 text-white text-xs font-black uppercase tracking-wider rounded-xl shadow-md"
                  >
                    {isSaving ? t('جاري الحفظ...', 'Saving...') : t('حفظ ونشر الكود 🚀', 'Save & Publish')}
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Table List of Promo Codes */}
          <div className="bg-white rounded-3xl border border-brand-navy/10 shadow-lg overflow-hidden">
            <div className="overflow-x-auto scroller-thin">
              <table className="w-full text-xs text-left text-brand-navy">
                <thead className="text-[10px] font-black text-brand-navy/40 uppercase tracking-[0.2em] bg-gray-50/80 border-b border-gray-100">
                  <tr>
                    <th className="px-6 py-4">{t('رمز الكود', 'Promo Code')}</th>
                    <th className="px-6 py-4">{t('قيمة الخصم', 'Discount Value')}</th>
                    <th className="px-6 py-4">{t('النطاق والشمول', 'Applies To')}</th>
                    <th className="px-6 py-4">{t('الاشتراكات', 'Subscriptions')}</th>
                    <th className="px-6 py-4">{t('الصلاحية', 'Expiry')}</th>
                    <th className="px-6 py-4">{t('الحالة', 'Status')}</th>
                    <th className="px-6 py-4 text-center">{t('الإجراءات', 'Actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {isLoading ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-400 font-bold">
                        {t('جاري جلب أكواد الخصم...', 'Loading promo codes...')}
                      </td>
                    </tr>
                  ) : filtered.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-12 text-gray-400 font-bold">
                        {t('لا توجد أكواد خصم تطابق البحث', 'No promo codes found')}
                      </td>
                    </tr>
                  ) : (
                    filtered.map(code => (
                      <tr key={code.id || code.code} className="hover:bg-orange-50/30 transition-colors">
                        <td className="px-6 py-4 font-mono font-black text-sm text-brand-navy">
                          <div className="flex items-center gap-2">
                            <span className="w-7 h-7 rounded-lg bg-brand-orange/10 text-brand-orange flex items-center justify-center font-bold text-xs">
                              %
                            </span>
                            <span>{code.code}</span>
                          </div>
                        </td>

                        <td className="px-6 py-4">
                          <span className="font-black text-brand-teal text-xs bg-brand-teal/10 px-2.5 py-1 rounded-full">
                            {code.discountType === 'percentage' ? `${code.discountValue}%` : `${code.discountValue.toFixed(3)} KWD`}
                          </span>
                        </td>

                        <td className="px-6 py-4 font-bold text-gray-700 uppercase text-[10px]">
                          {code.appliesTo === 'product' ? t('📖 الكتب فقط', 'Products Only') :
                           code.appliesTo === 'shipping' ? t('🚚 الشحن فقط', 'Shipping Only') :
                           code.appliesTo === 'addons' ? t('🎁 الإضافات فقط', 'Add-ons Only') :
                           t('🌟 إجمالي السلة', 'Entire Order')}
                        </td>

                        <td className="px-6 py-4">
                          <span className={`text-[10px] font-black uppercase px-2 py-0.5 rounded-md ${
                            code.allowSubscriptions ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                          }`}>
                            {code.allowSubscriptions ? '✓ ' + t('نعم', 'Allowed') : '✗ ' + t('فردي فقط', 'One-time only')}
                          </span>
                        </td>

                        <td className="px-6 py-4 text-[11px] text-gray-500 font-medium">
                          {code.expiryDate ? new Date(code.expiryDate).toLocaleDateString() : t('مستمر / دائم', 'Lifetime / None')}
                        </td>

                        <td className="px-6 py-4">
                          <button
                            onClick={() => handleToggle(code)}
                            className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider transition-all ${
                              code.isActive ? 'bg-emerald-500 text-white shadow-sm' : 'bg-gray-200 text-gray-500'
                            }`}
                          >
                            {code.isActive ? t('مفعل', 'Active') : t('معطل', 'Inactive')}
                          </button>
                        </td>

                        <td className="px-6 py-4 text-center">
                          <div className="flex items-center justify-center gap-1.5">
                            <button
                              onClick={() => setEditingCode(code)}
                              className="p-1.5 rounded-lg text-brand-navy/60 hover:text-brand-navy hover:bg-gray-100 transition-all"
                              title="Edit"
                            >
                              <span className="material-symbols-outlined text-base">edit</span>
                            </button>
                            <button
                              onClick={() => handleDelete(code)}
                              className="p-1.5 rounded-lg text-red-500/60 hover:text-red-600 hover:bg-red-50 transition-all"
                              title="Delete"
                            >
                              <span className="material-symbols-outlined text-base">delete</span>
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>

        {/* Footer */}
        <div className="p-4 bg-gray-50 border-t flex justify-end">
          <Button onClick={onClose} variant="secondary" className="text-xs font-bold">
            {t('إغلاق', 'Close')}
          </Button>
        </div>

      </div>
    </div>
  );
};

export default PromoManagerModal;
