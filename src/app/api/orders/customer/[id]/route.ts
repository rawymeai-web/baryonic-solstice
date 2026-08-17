import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const id = params.id;
    if (!id) {
      return NextResponse.json({ error: 'Missing customer ID' }, { status: 400 });
    }

    // 1. Fetch the user's email from Supabase Auth using admin client
    let email: string | null = null;
    try {
      const { data } = await supabase.auth.admin.getUserById(id);
      if (data?.user) {
        email = data.user.email || null;
      }
    } catch (authErr) {
      console.warn('[API /api/orders/customer] Could not fetch user from auth:', authErr);
    }

    // 2. Fetch orders from the database
    // Query where customer_id equals the UUID OR equals the email address
    let query = supabase.from('orders').select('*');
    
    if (email) {
      query = query.or(`customer_id.eq.${id},customer_id.eq.${email}`);
    } else {
      query = query.eq('customer_id', id);
    }

    const { data: dbOrders, error: dbError } = await query.order('created_at', { ascending: false });

    if (dbError) {
      console.error('[API /api/orders/customer] Database error:', dbError);
      return NextResponse.json({ error: 'Failed to fetch orders', details: dbError.message }, { status: 500 });
    }

    // 3. Map database orders to dashboard format
    const orders = (dbOrders || []).map((order: any) => ({
      orderNumber: order.order_number,
      status: order.status,
      orderDate: order.created_at,
      storyData: order.story_data || {}
    }));

    // 4. Fetch subscription if any
    let subscription = null;
    const { data: dbSub } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('customer_id', id)
      .maybeSingle();
      
    if (dbSub) {
      subscription = {
        plan: dbSub.plan_type,
        next_billing_date: dbSub.next_billing_date
      };
    } else if (email) {
      // Fallback check by email
      const { data: dbSubEmail } = await supabase
        .from('subscriptions')
        .select('*')
        .eq('customer_id', email)
        .maybeSingle();
      if (dbSubEmail) {
        subscription = {
          plan: dbSubEmail.plan_type,
          next_billing_date: dbSubEmail.next_billing_date
        };
      }
    }

    return NextResponse.json({
      orders,
      subscription
    });

  } catch (err: any) {
    console.error('[API /api/orders/customer] Catch error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
