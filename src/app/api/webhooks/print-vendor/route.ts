import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';
import { EmailService } from '@/services/notifications/emailService';

// Mock Webhook for a Print Vendor (e.g., Peecho, Lulu)
export async function POST(req: Request) {
    try {
        const body = await req.json();
        const signature = req.headers.get('x-vendor-signature');

        // Simple auth check
        if (signature !== process.env.PRINT_VENDOR_SECRET) {
            return NextResponse.json({ error: "Unauthorized Vendor" }, { status: 401 });
        }

        const orderId = body.order_id;
        const eventType = body.event_type; // 'printing_started', 'shipped', 'delivered', 'print_failed'

        const { data: order, error } = await supabase.from('orders').select('status').eq('id', orderId).single();

        if (error || !order) return NextResponse.json({ error: "Order not found" }, { status: 404 });

        let newStatus = order.status;

        // Map vendor events to our internal statuses
        switch (eventType) {
            case 'printing_started':
                newStatus = 'printing';
                break;
            case 'shipped':
                newStatus = 'shipped';
                // Trigger Shipping email
                await EmailService.sendNotification(orderId, 'book_shipped', { trackingLink: body.tracking_url });
                break;
            case 'delivered':
                newStatus = 'delivered';
                break;
            case 'print_failed':
                newStatus = 'on_hold';
                // Alert Admin logic would go here
                console.error(`[PrintVendor] CRITICAL: Order ${orderId} failed printing. Reason: ${body.reason}`);
                break;
            default:
                console.warn(`[PrintVendor] Unknown event type: ${eventType}`);
                return NextResponse.json({ message: "Unknown event ignored" });
        }

        if (newStatus !== order.status) {
            const updatePayload: any = { status: newStatus };
            if (eventType === 'print_failed') updatePayload.error_message = `Print Vendor Failure: ${body.reason}`;

            await supabase.from('orders').update(updatePayload).eq('id', orderId);

            await supabase.from('event_audit_log').insert({
                event_type: 'vendor_callback',
                order_id: orderId,
                details: { vendor_event: eventType, mapping: newStatus, raw: body }
            });
        }

        return NextResponse.json({ received: true });
    } catch (e: any) {
        console.error('[PrintVendor Webhook Error]', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
