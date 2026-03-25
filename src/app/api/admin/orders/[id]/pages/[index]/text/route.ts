import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

export async function PATCH(req: Request, context: any) {
    try {
        const orderId = context.params.id;
        const pageIndex = parseInt(context.params.index, 10);
        const { newText } = await req.json();

        const adminId = req.headers.get('x-admin-id');
        if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: order, error } = await supabase.from('orders').select('story_data, status').eq('id', orderId).single();
        if (error || !order || !order.story_data) return NextResponse.json({ error: "Order or story data not found" }, { status: 404 });

        let storyData = order.story_data as any;
        if (!storyData.pages || !storyData.pages[pageIndex]) {
            return NextResponse.json({ error: "Page index out of bounds" }, { status: 400 });
        }

        const oldText = storyData.pages[pageIndex].text;
        storyData.pages[pageIndex].text = newText;

        await supabase.from('orders').update({ story_data: storyData }).eq('id', orderId);

        // If it was already compiled or awaiting preview, it needs to be recompiled
        if (order.status === 'awaiting_preview_approval' || order.status === 'softcopy_ready') {
            await supabase.from('orders').update({ status: 'illustrations_ready' }).eq('id', orderId); // this will trigger recompilation conceptually
            const { MasterScheduler } = await import('@/services/workers/scheduler');
            await MasterScheduler.dispatchJob(orderId, 'compilation');
        }

        await supabase.from('event_audit_log').insert({
            event_type: 'manual_override',
            order_id: orderId,
            admin_id: adminId,
            details: { action: 'patched_page_text', page_index: pageIndex, old_text: oldText, new_text: newText }
        });

        return NextResponse.json({ message: "Page text updated", page: storyData.pages[pageIndex] });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
