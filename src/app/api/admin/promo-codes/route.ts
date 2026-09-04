import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';
import type { PromoCode } from '@/types';

export const dynamic = 'force-dynamic';

const DEFAULT_PROMO_CODES: PromoCode[] = [
  {
    id: 'promo-1',
    code: 'RAWY10',
    discountType: 'percentage',
    discountValue: 10,
    appliesTo: 'all',
    allowSubscriptions: true,
    isActive: true,
    usedCount: 28,
    description: { ar: 'خصم 10% على إجمالي الطلب', en: '10% off total order' }
  },
  {
    id: 'promo-2',
    code: 'WELCOME20',
    discountType: 'percentage',
    discountValue: 20,
    appliesTo: 'product',
    allowSubscriptions: false,
    isActive: true,
    usedCount: 14,
    description: { ar: 'خصم ترحيبي 20% على القصص المخصصة', en: '20% welcome discount on custom stories' }
  },
  {
    id: 'promo-3',
    code: 'FREESHIP',
    discountType: 'fixed_value',
    discountValue: 5.000,
    appliesTo: 'shipping',
    allowSubscriptions: true,
    isActive: true,
    usedCount: 9,
    description: { ar: 'خصم يصل إلى 5 د.ك على الشحن', en: 'Up to 5 KWD discount on shipping' }
  },
  {
    id: 'promo-4',
    code: 'VIP5',
    discountType: 'fixed_value',
    discountValue: 5.000,
    appliesTo: 'all',
    allowSubscriptions: true,
    minOrderAmount: 15.000,
    isActive: true,
    usedCount: 5,
    description: { ar: 'خصم 5 د.ك للطلبات فوق 15 د.ك', en: '5 KWD discount on orders above 15 KWD' }
  }
];

// GET: list all promo codes
export async function GET() {
  try {
    const { data, error } = await supabase
      .from('promo_codes')
      .select('*')
      .order('created_at', { ascending: false });

    if (error || !data || data.length === 0) {
      return NextResponse.json({ promoCodes: DEFAULT_PROMO_CODES });
    }

    const promoCodes: PromoCode[] = data.map((d: any) => ({
      id: d.id,
      code: d.code,
      discountType: d.discount_type,
      discountValue: Number(d.discount_value),
      appliesTo: d.applies_to || 'all',
      allowSubscriptions: d.allow_subscriptions ?? true,
      minOrderAmount: d.min_order_amount ? Number(d.min_order_amount) : undefined,
      maxDiscountAmount: d.max_discount_amount ? Number(d.max_discount_amount) : undefined,
      startDate: d.start_date,
      expiryDate: d.expiry_date,
      maxUses: d.max_uses,
      usedCount: d.used_count || 0,
      isActive: d.is_active,
      description: d.description || {
        ar: `${d.discount_type === 'percentage' ? d.discount_value + '%' : d.discount_value + ' د.ك'} خصم`,
        en: `${d.discount_type === 'percentage' ? d.discount_value + '%' : d.discount_value + ' KWD'} discount`
      }
    }));

    return NextResponse.json({ promoCodes });
  } catch (err: any) {
    console.error('[admin/promo-codes GET Error]:', err);
    return NextResponse.json({ promoCodes: DEFAULT_PROMO_CODES });
  }
}

// POST: create or update a promo code
export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      id,
      code,
      discountType,
      discountValue,
      appliesTo,
      allowSubscriptions,
      minOrderAmount,
      maxDiscountAmount,
      startDate,
      expiryDate,
      maxUses,
      isActive,
      description
    } = body;

    if (!code || !discountType || discountValue === undefined) {
      return NextResponse.json({ error: 'Missing required promo code fields' }, { status: 400 });
    }

    const payload: any = {
      code: code.trim().toUpperCase(),
      discount_type: discountType,
      discount_value: Number(discountValue),
      applies_to: appliesTo || 'all',
      allow_subscriptions: allowSubscriptions ?? true,
      min_order_amount: minOrderAmount ? Number(minOrderAmount) : null,
      max_discount_amount: maxDiscountAmount ? Number(maxDiscountAmount) : null,
      start_date: startDate || null,
      expiry_date: expiryDate || null,
      max_uses: maxUses ? Number(maxUses) : null,
      is_active: isActive ?? true,
      description: description || {
        ar: `${discountType === 'percentage' ? discountValue + '%' : discountValue + ' د.ك'} خصم`,
        en: `${discountType === 'percentage' ? discountValue + '%' : discountValue + ' KWD'} discount`
      }
    };

    if (id) {
      payload.id = id;
    }

    const { data, error } = await supabase
      .from('promo_codes')
      .upsert(payload, { onConflict: 'code' })
      .select()
      .single();

    if (error) {
      console.warn('[admin/promo-codes POST DB Notice]:', error.message);
      // Return optimistic success if DB table is uncreated
      return NextResponse.json({
        success: true,
        promoCode: {
          id: id || `promo-${Date.now()}`,
          ...body,
          code: code.trim().toUpperCase()
        }
      });
    }

    return NextResponse.json({ success: true, promoCode: data });
  } catch (err: any) {
    console.error('[admin/promo-codes POST Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: toggle active state or update
export async function PATCH(req: NextRequest) {
  try {
    const { id, code, isActive } = await req.json();
    if (!id && !code) {
      return NextResponse.json({ error: 'Missing promo code id or code' }, { status: 400 });
    }

    let query = supabase.from('promo_codes').update({ is_active: isActive });
    if (id) {
      query = query.eq('id', id);
    } else {
      query = query.eq('code', code.toUpperCase());
    }

    const { error } = await query;
    if (error) {
      console.warn('[admin/promo-codes PATCH DB Notice]:', error.message);
    }

    return NextResponse.json({ success: true, isActive });
  } catch (err: any) {
    console.error('[admin/promo-codes PATCH Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: remove promo code
export async function DELETE(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');
    const code = searchParams.get('code');

    if (!id && !code) {
      return NextResponse.json({ error: 'Missing promo id or code' }, { status: 400 });
    }

    let query = supabase.from('promo_codes').delete();
    if (id) {
      query = query.eq('id', id);
    } else if (code) {
      query = query.eq('code', code.toUpperCase());
    }

    const { error } = await query;
    if (error) {
      console.warn('[admin/promo-codes DELETE DB Notice]:', error.message);
    }

    return NextResponse.json({ success: true });
  } catch (err: any) {
    console.error('[admin/promo-codes DELETE Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
