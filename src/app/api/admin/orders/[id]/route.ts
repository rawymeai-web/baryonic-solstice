import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';
import { saveOrder } from '@/services/adminService';
import { EmailService } from '@/services/notifications/emailService';

export const dynamic = 'force-dynamic';

// GET: Fetch single order details
export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { data, error } = await supabase
      .from('orders')
      .select('*')
      .eq('order_number', id)
      .single();

    if (error || !data) {
      return NextResponse.json({ error: error?.message || 'Order not found' }, { status: 404 });
    }

    return NextResponse.json({ order: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PATCH: Partial updates (status, package_url)
export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, package_url } = body;

    const updates: any = {};
    if (status !== undefined) updates.status = status;
    if (package_url !== undefined) updates.package_url = package_url;

    const { data, error } = await supabase
      .from('orders')
      .update(updates)
      .eq('order_number', id)
      .select();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    // Trigger status change email notification if status was updated
    if (status !== undefined) {
      EmailService.sendNotification(id, 'status_changed', { status }).catch(e => console.error("PATCH status change email failed:", e));
    }

    return NextResponse.json({ success: true, order: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Save/Upsert order
export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { storyData, shippingDetails, total } = body;

    if (!storyData) {
      return NextResponse.json({ error: 'Missing storyData' }, { status: 400 });
    }

    await saveOrder(id, storyData, shippingDetails || {}, total);
    return NextResponse.json({ success: true, message: 'Order saved successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE: Hard Reset order
export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    // 1. Delete jobs
    const { error: jobErr } = await supabase
      .from('order_jobs')
      .delete()
      .eq('order_id', id);

    if (jobErr) {
      return NextResponse.json({ error: `Job deletion failed: ${jobErr.message}` }, { status: 500 });
    }

    // 2. Fetch current story_data to clean it
    const { data: order, error: getErr } = await supabase
      .from('orders')
      .select('story_data')
      .eq('order_number', id)
      .single();

    if (getErr || !order) {
      return NextResponse.json({ error: `Order fetch failed: ${getErr?.message || 'Not found'}` }, { status: 404 });
    }

    const cleanStoryData = { ...(order.story_data as any) };
    delete cleanStoryData.pages;
    delete cleanStoryData.spreads;
    delete cleanStoryData.qa_logs;
    delete cleanStoryData.generation_snapshot;
    delete cleanStoryData.coverImageUrl;
    delete cleanStoryData.finalPrompts;
    delete cleanStoryData.spreadPlan;

    // 3. Reset order status to 'paid' and update story_data
    const { error: orderErr } = await supabase
      .from('orders')
      .update({
        status: 'paid',
        story_data: cleanStoryData
      })
      .eq('order_number', id);

    if (orderErr) {
      return NextResponse.json({ error: `Order update failed: ${orderErr.message}` }, { status: 500 });
    }

    return NextResponse.json({ success: true, message: 'Order hard reset successfully' });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
