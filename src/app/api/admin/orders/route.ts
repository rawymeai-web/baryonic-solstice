import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('orders')
      .select('order_number, customer_id, customer_name, total, status, created_at, production_cost, ai_cost, shipping_cost')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API GET /api/admin/orders] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ orders: data });
  } catch (err: any) {
    console.error('[API GET /api/admin/orders] Catch error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
