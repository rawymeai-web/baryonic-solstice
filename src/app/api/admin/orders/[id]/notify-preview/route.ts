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

        if (!id) {
            return NextResponse.json({ error: 'Order ID is required' }, { status: 400 });
        }

        // Fetch Order
        const { data: order, error: orderErr } = await supabase
            .from('orders')
            .select('id, order_number, status, shipping_details, story_data')
            .or(`id.eq.${id},order_number.eq.${id}`)
            .single();

        if (orderErr || !order) {
            return NextResponse.json({ error: 'Order not found' }, { status: 404 });
        }

        // Update status to awaiting_preview_approval
        const newStatus = 'awaiting_preview_approval';
        const { error: updateErr } = await supabase
            .from('orders')
            .update({ 
                status: newStatus,
                updated_at: new Date().toISOString()
            })
            .eq('id', order.id);

        if (updateErr) {
            ServerLogger.error('NOTIFY_PREVIEW_DB_ERROR', updateErr);
            return NextResponse.json({ error: 'Failed to update order status' }, { status: 500 });
        }

        const previewLink = `https://rawytime.com/?preview=${order.order_number}`;

        // Dispatch Preview Ready Email
        await EmailService.sendNotification(order.id, 'preview_ready', {
            previewLink,
            orderNumber: order.order_number
        });

        ServerLogger.log('NOTIFY_PREVIEW_SUCCESS', { orderNumber: order.order_number, previewLink });

        return NextResponse.json({
            success: true,
            message: `Preview notification email dispatched successfully to customer!`,
            orderNumber: order.order_number,
            previewLink,
            newStatus
        });

    } catch (err: any) {
        ServerLogger.error('NOTIFY_PREVIEW_EXCEPTION', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
