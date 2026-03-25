import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

export async function POST(req: Request, context: any) {
    try {
        const orderId = context.params.id;

        const adminId = req.headers.get('x-admin-id');
        if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: order, error } = await supabase.from('orders').select('status, error_message').eq('id', orderId).single();

        if (error || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

        if (order.status !== 'on_hold' && order.status !== 'failed') {
            return NextResponse.json({ error: "Order is not on hold or failed" }, { status: 400 });
        }

        // We resume it to 'queued' so the scheduler picks it up again from wherever it left off.
        await supabase.from('orders').update({
            status: 'queued',
            error_message: null
        }).eq('id', orderId);

        await supabase.from('event_audit_log').insert({
            event_type: 'manual_override',
            order_id: orderId,
            admin_id: adminId,
            details: { action: 'resumed_from_hold', previous_status: order.status, cleared_error: order.error_message }
        });

        return NextResponse.json({ message: "Order resumed" });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
