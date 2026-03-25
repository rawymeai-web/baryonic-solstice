import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

export async function POST(req: Request, context: any) {
    try {
        const orderId = context.params.id;
        const adminId = req.headers.get('x-admin-id');
        if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: order, error } = await supabase.from('orders').select('status, subscription_id').eq('id', orderId).single();
        if (error || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

        // We can only push books that are successfully compiled but paused/waiting
        let newStatus = 'sent_to_print';
        if (order.status === 'awaiting_preview_approval' || order.status === 'softcopy_ready') {
            await supabase.from('orders').update({ status: 'sent_to_print' }).eq('id', orderId);

            // Queue print handoff worker
            const { MasterScheduler } = await import('@/services/workers/scheduler');
            await MasterScheduler.dispatchJob(orderId, 'print_handoff');

        } else {
            return NextResponse.json({ error: `Cannot manually push order in ${order.status} state.` }, { status: 400 });
        }

        await supabase.from('event_audit_log').insert({
            event_type: 'manual_override',
            order_id: orderId,
            admin_id: adminId,
            details: { action: 'manual_push_to_print', previous_status: order.status }
        });

        return NextResponse.json({ message: "Order manually pushed to print" });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
