import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';
import type { PromoCode, DiscountDetails } from '@/types';

export const dynamic = 'force-dynamic';

const DEFAULT_PROMO_CODES: PromoCode[] = [
  {
    code: 'RAWY10',
    discountType: 'percentage',
    discountValue: 10,
    appliesTo: 'all',
    allowSubscriptions: true,
    isActive: true,
    description: { ar: 'خصم 10% على إجمالي الطلب', en: '10% off total order' }
  },
  {
    code: 'WELCOME20',
    discountType: 'percentage',
    discountValue: 20,
    appliesTo: 'product',
    allowSubscriptions: false,
    isActive: true,
    description: { ar: 'خصم ترحيبي 20% على القصص المخصصة', en: '20% welcome discount on custom stories' }
  },
  {
    code: 'FREESHIP',
    discountType: 'fixed_value',
    discountValue: 5.000,
    appliesTo: 'shipping',
    allowSubscriptions: true,
    isActive: true,
    description: { ar: 'خصم يصل إلى 5 د.ك على الشحن', en: 'Up to 5 KWD discount on shipping' }
  },
  {
    code: 'VIP5',
    discountType: 'fixed_value',
    discountValue: 5.000,
    appliesTo: 'all',
    allowSubscriptions: true,
    minOrderAmount: 15.000,
    isActive: true,
    description: { ar: 'خصم 5 د.ك للطلبات فوق 15 د.ك', en: '5 KWD discount on orders above 15 KWD' }
  }
];

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { code: rawCode, context } = body || {};

    const code = (rawCode || '').trim().toUpperCase();
    if (!code) {
      return NextResponse.json({
        isValid: false,
        discountAmount: 0,
        message: { ar: 'يرجى إدخال رمز الخصم', en: 'Please enter a discount code' }
      }, { status: 400 });
    }

    let promo: PromoCode | null = null;

    // 1. Try querying Supabase promo_codes table
    try {
      const { data, error } = await supabase
        .from('promo_codes')
        .select('*')
        .ilike('code', code)
        .eq('is_active', true)
        .maybeSingle();

      if (data && !error) {
        promo = {
          id: data.id,
          code: data.code,
          discountType: data.discount_type,
          discountValue: Number(data.discount_value),
          appliesTo: data.applies_to || 'all',
          allowSubscriptions: data.allow_subscriptions ?? true,
          minOrderAmount: data.min_order_amount ? Number(data.min_order_amount) : undefined,
          maxDiscountAmount: data.max_discount_amount ? Number(data.max_discount_amount) : undefined,
          startDate: data.start_date,
          expiryDate: data.expiry_date,
          maxUses: data.max_uses,
          usedCount: data.used_count || 0,
          isActive: data.is_active,
          description: data.description || {
            ar: `${data.discount_type === 'percentage' ? data.discount_value + '%' : data.discount_value + ' د.ك'} خصم`,
            en: `${data.discount_type === 'percentage' ? data.discount_value + '%' : data.discount_value + ' KWD'} discount`
          }
        };
      }
    } catch (e) {
      console.warn('[validate-promo] Supabase query failed, falling back to default promo codes:', e);
    }

    // 2. Fallback to default catalog if not found in DB
    if (!promo) {
      const found = DEFAULT_PROMO_CODES.find(p => p.code.toUpperCase() === code);
      if (found && found.isActive) {
        promo = found;
      }
    }

    if (!promo || !promo.isActive) {
      return NextResponse.json({
        isValid: false,
        discountAmount: 0,
        message: { ar: 'كود الخصم غير صالح أو غير موجود', en: 'Invalid or inactive discount code' }
      });
    }

    // Check expiry
    if (promo.expiryDate) {
      const expiry = new Date(promo.expiryDate);
      if (new Date() > expiry) {
        return NextResponse.json({
          isValid: false,
          discountAmount: 0,
          message: { ar: 'عذراً، كود الخصم منتهي الصلاحية', en: 'Sorry, this discount code has expired' }
        });
      }
    }

    // Check start date
    if (promo.startDate) {
      const start = new Date(promo.startDate);
      if (new Date() < start) {
        return NextResponse.json({
          isValid: false,
          discountAmount: 0,
          message: { ar: 'كود الخصم غير مفعل بعد', en: 'This discount code is not active yet' }
        });
      }
    }

    // Check max uses
    if (promo.maxUses && (promo.usedCount || 0) >= promo.maxUses) {
      return NextResponse.json({
        isValid: false,
        discountAmount: 0,
        message: { ar: 'لقد وصل كود الخصم إلى الحد الأقصى للاستخدام', en: 'This discount code has reached its maximum usage limit' }
      });
    }

    const isSubscription = context?.planType === 'monthly' || context?.planType === 'yearly';
    if (isSubscription && !promo.allowSubscriptions) {
      return NextResponse.json({
        isValid: false,
        discountAmount: 0,
        message: {
          ar: 'كود الخصم هذا مخصص للطلبات الفردية فقط ولا ينطبق على الاشتراكات',
          en: 'This discount code is valid for one-time purchases only, not subscriptions'
        }
      });
    }

    const orderTotal = Number(context?.orderTotal) || 0;
    const productTotal = Number(context?.productTotal) || 0;
    const shippingTotal = Number(context?.shippingTotal) || 0;
    const addonsTotal = Number(context?.addonsTotal) || 0;

    if (promo.minOrderAmount && orderTotal < promo.minOrderAmount) {
      return NextResponse.json({
        isValid: false,
        discountAmount: 0,
        message: {
          ar: `الحد الأدنى لتطبيق هذا الكود هو ${promo.minOrderAmount.toFixed(3)} د.ك`,
          en: `Minimum order amount for this code is ${promo.minOrderAmount.toFixed(3)} KWD`
        }
      });
    }

    // Determine applicable base amount
    let applicableBase = 0;
    if (promo.appliesTo === 'product') {
      applicableBase = productTotal;
    } else if (promo.appliesTo === 'shipping') {
      applicableBase = shippingTotal;
    } else if (promo.appliesTo === 'addons') {
      applicableBase = addonsTotal;
    } else {
      applicableBase = orderTotal;
    }

    if (applicableBase <= 0) {
      return NextResponse.json({
        isValid: false,
        discountAmount: 0,
        message: {
          ar: 'كود الخصم لا ينطبق على العناصر المحددة في طلبك حالياً',
          en: 'This discount code does not apply to the selected items in your order'
        }
      });
    }

    let calculatedDiscount = 0;
    if (promo.discountType === 'percentage') {
      calculatedDiscount = (applicableBase * promo.discountValue) / 100;
    } else {
      calculatedDiscount = promo.discountValue;
    }

    // Cap discount to applicable subtotal
    calculatedDiscount = Math.min(calculatedDiscount, applicableBase);

    // Apply max discount ceiling if specified
    if (promo.maxDiscountAmount && calculatedDiscount > promo.maxDiscountAmount) {
      calculatedDiscount = promo.maxDiscountAmount;
    }

    calculatedDiscount = Math.round(calculatedDiscount * 1000) / 1000;

    const discountDetails: DiscountDetails = {
      code: promo.code,
      discountType: promo.discountType,
      discountValue: promo.discountValue,
      discountAmount: calculatedDiscount,
      appliesTo: promo.appliesTo,
      description: promo.description?.ar || promo.description?.en || `${promo.code} Discount`
    };

    return NextResponse.json({
      isValid: true,
      discountAmount: calculatedDiscount,
      discountDetails,
      code: promo.code,
      message: {
        ar: `تم تطبيق كود الخصم بنجاح! وفرت ${calculatedDiscount.toFixed(3)} د.ك`,
        en: `Promo code applied successfully! You saved ${calculatedDiscount.toFixed(3)} KWD`
      }
    });

  } catch (error: any) {
    console.error('[validate-promo] Error:', error);
    return NextResponse.json({
      isValid: false,
      discountAmount: 0,
      message: { ar: 'حدث خطأ أثناء التحقق من كود الخصم', en: 'Error validating promo code' },
      error: error.message
    }, { status: 500 });
  }
}
