import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

export async function POST(req: Request, context: any) {
    try {
        const orderId = context.params.id;

        // Verify Admin RBAC
        const adminId = req.headers.get('x-admin-id');
        if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: order, error } = await supabase
            .from('orders')
            .select('status')
            .eq('id', orderId)
            .single();

        if (error || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

        if (order.status === 'delivered') return NextResponse.json({ error: "Cannot put delivered order on hold" }, { status: 400 });

        await supabase.from('orders').update({
            status: 'on_hold',
            error_message: 'Manually placed on hold by Admin'
        }).eq('id', orderId);

        await supabase.from('event_audit_log').insert({
            event_type: 'manual_override',
            order_id: orderId,
            admin_id: adminId,
            details: { action: 'placed_on_hold', previous_status: order.status }
        });

        return NextResponse.json({ message: "Order placed on hold" });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
