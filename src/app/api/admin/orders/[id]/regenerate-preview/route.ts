import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

export async function POST(req: Request, context: any) {
    try {
        const orderId = context.params.id;
        const adminId = req.headers.get('x-admin-id');
        if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: order, error } = await supabase.from('orders').select('status, generation_snapshot').eq('id', orderId).single();
        if (error || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

        // Free regeneration means wiping the entire story and prompts and generating again
        // Invalidates previous PDFs.
        await supabase.from('orders').update({
            status: 'queued',
            story_data: {},
            error_message: null
        }).eq('id', orderId);

        await supabase.from('event_audit_log').insert({
            event_type: 'manual_override',
            order_id: orderId,
            admin_id: adminId,
            details: { action: 'regenerated_entire_book', previous_status: order.status }
        });

        return NextResponse.json({ message: "Order completely wiped and re-queued for generation." });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
