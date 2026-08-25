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

        // Fetch Order by order_number
        const { data: order, error: orderErr } = await supabase
            .from('orders')
            .select('order_number, status, shipping_details, story_data')
            .eq('order_number', id)
            .maybeSingle();

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
            })
            .eq('order_number', order.order_number);

        if (updateErr) {
            ServerLogger.error('SHIP_ORDER_DB_ERROR', updateErr);
            return NextResponse.json({ error: 'Failed to update order tracking' }, { status: 500 });
        }

        // Send Shipping Email Notification
        await EmailService.sendNotification(order.order_number, 'order_shipped', {
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
