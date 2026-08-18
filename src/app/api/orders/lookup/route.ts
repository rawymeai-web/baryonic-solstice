import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get('orderNumber')?.trim();
    const phone = searchParams.get('phone')?.trim();

    if (!orderNumber || !phone) {
      return NextResponse.json({ error: 'Missing orderNumber or phone parameter' }, { status: 400 });
    }

    // Fetch order by number using service role client
    const { data: order, error } = await supabase
      .from('orders')
      .select('order_number, status, created_at, shipping_details')
      .eq('order_number', orderNumber)
      .single();

    if (error || !order) {
      console.warn(`[API /api/orders/lookup] Order not found: ${orderNumber}`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // Verify phone number (normalize to ignore spaces, dashes, parentheses)
    const norm = (s: string) => s.trim().toLowerCase().replace(/[\s-()]/g, '');
    const orderPhone = order.shipping_details?.phone || '';

    if (norm(orderPhone) !== norm(phone)) {
      console.warn(`[API /api/orders/lookup] Phone mismatch for order ${orderNumber}. Query phone: ${phone}, Order phone: ${orderPhone}`);
      return NextResponse.json({ error: 'Invalid order number or phone number mismatch' }, { status: 403 });
    }

    return NextResponse.json({
      success: true,
      order: {
        orderNumber: order.order_number,
        status: order.status,
        orderDate: order.created_at
      }
    });
  } catch (err: any) {
    console.error('[API /api/orders/lookup] Catch error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
