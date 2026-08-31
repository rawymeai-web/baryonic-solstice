import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: 'Missing customer ID' }, { status: 400 });
    }

    // 1. Resolve customer email and ID
    let email: string | null = null;
    let userId: string = id;

    if (id.includes('@')) {
      email = id.trim().toLowerCase();
    } else {
      try {
        const { data } = await supabase.auth.admin.getUserById(id);
        if (data?.user?.email) {
          email = data.user.email.trim().toLowerCase();
        }
      } catch (authErr) {
        console.warn('[API /api/orders/customer] Auth lookup notice:', authErr);
      }
    }

    // 2. Fetch orders matching customer ID or email
    let query = supabase.from('orders').select('*');
    
    if (email) {
      query = query.or(`customer_id.eq.${userId},customer_id.eq.${email},customer_id.ilike.%${email}%,shipping_details->>email.ilike.%${email}%`);
    } else {
      query = query.eq('customer_id', userId);
    }

    const { data: dbOrders, error: dbError } = await query.order('created_at', { ascending: false });

    if (dbError) {
      console.error('[API /api/orders/customer] Database error:', dbError);
      return NextResponse.json({ error: 'Failed to fetch orders', details: dbError.message }, { status: 500 });
    }

    // 3. Map database orders to lightweight dashboard format (stripping redundant multi-MB raw logs)
    const orders = (dbOrders || []).map((order: any) => {
      const rawStory = order.story_data || {};
      const cleanStoryData = {
        title: rawStory.title || 'A Personalized Adventure',
        childName: rawStory.childName || rawStory.mainCharacter?.name || '',
        coverImageUrl: rawStory.coverImageUrl || rawStory.spreads?.[0]?.illustrationUrl || '',
        coverSubtitle: rawStory.coverSubtitle || '',
        coverTextSide: rawStory.coverTextSide || 'left',
        isPhysicalPrint: rawStory.isPhysicalPrint || false,
        language: rawStory.language || 'ar',
        theme: rawStory.theme || '',
        orderId: order.order_number,
        audioUrl: rawStory.audioUrl || '',
        spreads: (rawStory.spreads || []).map((s: any) => ({
          spreadNumber: s.spreadNumber,
          leftText: s.leftText,
          rightText: s.rightText,
          text: s.text,
          illustrationUrl: s.illustrationUrl || s.imageUrl || '',
          textOffsetX: s.textOffsetX,
          textOffsetY: s.textOffsetY
        }))
      };

      return {
        orderNumber: order.order_number,
        status: order.status,
        orderDate: order.created_at,
        total: order.total,
        shippingDetails: order.shipping_details || {},
        storyData: cleanStoryData
      };
    });

    // 4. Fetch subscription if any
    let subscription = null;
    const { data: dbSub } = await supabase
      .from('subscriptions')
      .select('plan_type, next_billing_date')
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
        .select('plan_type, next_billing_date')
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
    }, {
      headers: {
        'Cache-Control': 'private, max-age=15, stale-while-revalidate=60'
      }
    });

  } catch (err: any) {
    console.error('[API /api/orders/customer] Catch error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
