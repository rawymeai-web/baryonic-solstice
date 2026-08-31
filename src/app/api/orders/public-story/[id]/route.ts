import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const cleanId = id?.trim();

    if (!cleanId) {
      return NextResponse.json({ error: 'Missing story or order ID' }, { status: 400 });
    }

    // Query order by order_number
    const { data: orders, error } = await supabase
      .from('orders')
      .select('order_number, status, created_at, story_data')
      .eq('order_number', cleanId)
      .limit(1);

    if (error || !orders || orders.length === 0) {
      console.warn(`[API /api/orders/public-story] Story not found: ${cleanId}`);
      return NextResponse.json({ error: 'Story not found' }, { status: 404 });
    }

    const order = orders[0];
    const rawStory = order.story_data || {};

    // Sanitize story payload to strictly exclude all PII (no address, phone, email, or billing info)
    const sanitizedStory = {
      orderId: order.order_number,
      orderNumber: order.order_number,
      title: rawStory.title || 'A Magical Story',
      childName: rawStory.childName || rawStory.mainCharacter?.name || '',
      childAge: rawStory.childAge || rawStory.mainCharacter?.age || '',
      childGender: rawStory.childGender || rawStory.mainCharacter?.gender || 'boy',
      language: rawStory.language || 'ar',
      theme: rawStory.theme || '',
      selectedStyleNames: rawStory.selectedStyleNames || [],
      coverImageUrl: rawStory.coverImageUrl || rawStory.spreads?.[0]?.illustrationUrl || '',
      coverSubtitle: rawStory.coverSubtitle || '',
      coverTextSide: rawStory.coverTextSide || 'left',
      spreads: rawStory.spreads || [],
      audioUrl: rawStory.audioUrl || '',
      isPurchased: true,
      size: rawStory.size || 'square-20x20'
    };

    return NextResponse.json({
      success: true,
      story: sanitizedStory
    }, {
      headers: {
        'Cache-Control': 'public, s-maxage=3600, stale-while-revalidate=86400',
        'Access-Control-Allow-Origin': '*'
      }
    });
  } catch (err: any) {
    console.error('[API /api/orders/public-story] Catch error:', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
