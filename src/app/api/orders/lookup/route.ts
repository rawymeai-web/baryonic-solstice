import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get('orderNumber')?.trim();
    const phone = searchParams.get('phone')?.trim();

    if (!orderNumber) {
      return NextResponse.json({ error: 'Missing orderNumber parameter' }, { status: 400 });
    }

    // Fetch order by number using service role client
    const { data: order, error } = await supabase
      .from('orders')
      .select('order_number, status, created_at, shipping_details, story_data, total')
      .eq('order_number', orderNumber)
      .single();

    if (error || !order) {
      console.warn(`[API /api/orders/lookup] Order not found: ${orderNumber}`);
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    // If phone is provided, verify phone (for modal search)
    if (phone) {
      const norm = (s: string) => s.trim().toLowerCase().replace(/[\s-()]/g, '');
      const orderPhone = order.shipping_details?.phone || '';

      if (orderPhone && norm(orderPhone) !== norm(phone)) {
        console.warn(`[API /api/orders/lookup] Phone mismatch for order ${orderNumber}. Query phone: ${phone}, Order phone: ${orderPhone}`);
        return NextResponse.json({ error: 'Invalid order number or phone number mismatch' }, { status: 403 });
      }
    }

    const rawStory = (order.story_data as any) || {};
    const spreads = rawStory.spreads || [];
    const pages = rawStory.pages || [];
    const totalSpreads = rawStory.spreadCount || spreads.length || pages.length || 8;
    const completedSpreads = (pages.length > 0 ? pages : spreads).filter((s: any) => !!(s.illustrationUrl || s.imageUrl)).length;

    // Self-healing trigger: if order is in an active generation pipeline stage, kick scheduler
    const activePipelineStatuses = [
      'queued', 'paid_confirmed',
      'blueprint_generating', 'blueprint_ready',
      'character_generating', 'character_ready',
      'story_generating', 'story_ready',
      'illustrations_generating', 'illustrations_ready',
      'compiling'
    ];
    if (activePipelineStatuses.includes(order.status)) {
      const { MasterScheduler } = await import('@/services/workers/scheduler');
      MasterScheduler.executeTick().catch(e => console.warn('[Lookup] Failsafe scheduler kick notice:', e));
    }

    const cleanStoryData = {
      title: rawStory.title || 'A Personalized Adventure',
      childName: rawStory.childName || rawStory.mainCharacter?.name || '',
      coverImageUrl: rawStory.coverImageUrl || rawStory.spreads?.[0]?.illustrationUrl || '',
      coverSubtitle: rawStory.coverSubtitle || '',
      coverTextSide: rawStory.coverTextSide || 'left',
      coverQcStatus: rawStory.coverQcStatus || (rawStory.spreads?.[0]?.qcStatus) || 'passed',
      isPhysicalPrint: rawStory.isPhysicalPrint || false,
      language: rawStory.language || 'ar',
      theme: rawStory.theme || '',
      orderId: order.order_number,
      audioUrl: rawStory.audioUrl || '',
      totalSpreads,
      completedSpreads,
      spreads: spreads.map((s: any) => ({
        spreadNumber: s.spreadNumber,
        leftText: s.leftText,
        rightText: s.rightText,
        text: s.text,
        illustrationUrl: s.illustrationUrl || s.imageUrl || '',
        textOffsetX: s.textOffsetX,
        textOffsetY: s.textOffsetY,
        textSide: s.textSide,
        qcStatus: s.qcStatus || 'pending'
      }))
    };

    return NextResponse.json({
      success: true,
      order: {
        orderNumber: order.order_number,
        status: order.status,
        errorMessage: (order as any).error_message || null,
        orderDate: order.created_at,
        total: order.total,
        storyData: cleanStoryData,
        progress: {
          totalSpreads,
          completedSpreads
        }
      }
    });
  } catch (err: any) {
    console.error('[API /api/orders/lookup] Catch error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
