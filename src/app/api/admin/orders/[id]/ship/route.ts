import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';
import { EmailService } from '@/services/notifications/emailService';
import { ServerLogger } from '@/utils/serverLogger';

export async function POST(
    req: NextRequest,
    context: { params: Promise<{ id: string }> }
) {
    try {
        const { id } = await context.params;
        const body = await req.json();

        const { courier, awbNumber, trackingUrl, courierPhone, notes } = body;

        if (!id) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
        }

        // Fetch Order safely (handle both UUID and string order_number like RWY-XXXXX)
        const isUuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
        let query = supabase
            .from('orders')
            .select('id, order_number, status, shipping_details, story_data');
            
        if (isUuid) {
            query = query.or(`id.eq.${id},order_number.eq.${id}`);
        } else {
            query = query.eq('order_number', id);
        }

        const { data: order, error: orderErr } = await query.maybeSingle();

        if (orderErr || !order) {
            ServerLogger.error('SHIP_ORDER_NOT_FOUND', { id, orderErr });
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        const shippingDetails = order.shipping_details || {};
        shippingDetails.tracking = {
            courier: courier || 'Courier Service',
            awbNumber: awbNumber || '',
            trackingUrl: trackingUrl || '',
            courierPhone: courierPhone || '',
            dispatchedAt: new Date().toISOString(),
            notes: notes || ''
        };

        // Update status to shipped and store tracking info
        const { error: updateErr } = await supabase
            .from('orders')
            .update({ 
                status: 'shipped',
                shipping_details: shippingDetails,
                updated_at: new Date().toISOString()
            })
            .eq('id', order.id);

        if (updateErr) {
            ServerLogger.error('SHIP_ORDER_DB_ERROR', updateErr);
            return NextResponse.json({ error: 'Failed to update order tracking' }, { status: 500 });
        }

        // Send Shipping Email Notification
        await EmailService.sendNotification(order.id, 'order_shipped', {
            courier: shippingDetails.tracking.courier,
            awbNumber: shippingDetails.tracking.awbNumber,
            trackingUrl: shippingDetails.tracking.trackingUrl,
            courierPhone: shippingDetails.tracking.courierPhone,
            orderNumber: order.order_number
        });

        ServerLogger.log('SHIP_ORDER_SUCCESS', { 
            orderNumber: order.order_number, 
            courier, 
            awbNumber 
        });

        return NextResponse.json({
            success: true,
            message: `Order #${order.order_number} marked as shipped and customer notified!`,
            tracking: shippingDetails.tracking,
            newStatus: 'shipped'
        });

    } catch (err: any) {
        ServerLogger.error('SHIP_ORDER_EXCEPTION', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
