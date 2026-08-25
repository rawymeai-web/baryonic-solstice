import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';
import { EmailService } from '@/services/notifications/emailService';
import { ServerLogger } from '@/utils/serverLogger';

export interface BulkShipmentItem {
    orderNumber: string;
    courier: string;
    awbNumber: string;
    trackingUrl?: string;
    courierPhone?: string;
    notes?: string;
}

export async function POST(req: NextRequest) {
    try {
        let shipments: BulkShipmentItem[] = [];
        const contentType = req.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
            const body = await req.json();
            shipments = body.shipments || (Array.isArray(body) ? body : []);
        } else if (contentType.includes('multipart/form-data')) {
            const formData = await req.formData();
            const file = formData.get('file') as File;
            if (!file) {
                return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
            }

            const text = await file.text();
            // Parse CSV format
            const lines = text.split(/\r?\n/).filter(line => line.trim().length > 0);
            if (lines.length <= 1) {
                return NextResponse.json({ error: 'File contains no data rows' }, { status: 400 });
            }

            // Detect headers
            const headerLine = lines[0].toLowerCase();
            const delimiter = headerLine.includes('\t') ? '\t' : (headerLine.includes(';') ? ';' : ',');
            const headers = lines[0].split(delimiter).map(h => h.trim().replace(/^["']|["']$/g, '').toLowerCase());

            const orderIdx = headers.findIndex(h => h.includes('order') || h.includes('رقم الطلب') || h.includes('protocol') || h.includes('id'));
            const courierIdx = headers.findIndex(h => h.includes('courier') || h.includes('شركة الشحن') || h.includes('carrier') || h.includes('shipping'));
            const awbIdx = headers.findIndex(h => h.includes('awb') || h.includes('tracking') || h.includes('تتبع') || h.includes('waybill') || h.includes('رقم الشحنة'));
            const urlIdx = headers.findIndex(h => h.includes('url') || h.includes('link') || h.includes('رابط'));
            const phoneIdx = headers.findIndex(h => h.includes('phone') || h.includes('هاتف') || h.includes('mobile') || h.includes('contact'));

            for (let i = 1; i < lines.length; i++) {
                const cols = lines[i].split(delimiter).map(c => c.trim().replace(/^["']|["']$/g, ''));
                const orderNumber = orderIdx >= 0 ? cols[orderIdx] : cols[0];
                const courier = courierIdx >= 0 ? cols[courierIdx] : (cols[1] || 'Courier');
                const awbNumber = awbIdx >= 0 ? cols[awbIdx] : (cols[2] || '');
                const trackingUrl = urlIdx >= 0 ? cols[urlIdx] : (cols[3] || '');
                const courierPhone = phoneIdx >= 0 ? cols[phoneIdx] : (cols[4] || '');

                if (orderNumber && awbNumber) {
                    shipments.push({
                        orderNumber: orderNumber.trim(),
                        courier: courier.trim(),
                        awbNumber: awbNumber.trim(),
                        trackingUrl: trackingUrl.trim(),
                        courierPhone: courierPhone.trim()
                    });
                }
            }
        }

        if (!shipments || shipments.length === 0) {
            return NextResponse.json({ 
                error: 'No valid shipment rows found. Ensure columns: Order Number, Courier, AWB Number.' 
            }, { status: 400 });
        }

        const results = {
            total: shipments.length,
            successCount: 0,
            errorCount: 0,
            updatedOrders: [] as string[],
            errors: [] as string[]
        };

        for (const item of shipments) {
            try {
                const { data: order, error: findErr } = await supabase
                    .from('orders')
                    .select('id, order_number, shipping_details, status')
                    .eq('order_number', item.orderNumber)
                    .maybeSingle();

                if (findErr || !order) {
                    results.errorCount++;
                    results.errors.push(`Order #${item.orderNumber}: Not found in database`);
                    continue;
                }

                const shippingDetails = order.shipping_details || {};
                shippingDetails.tracking = {
                    courier: item.courier || 'Courier Service',
                    awbNumber: item.awbNumber,
                    trackingUrl: item.trackingUrl || '',
                    courierPhone: item.courierPhone || '',
                    dispatchedAt: new Date().toISOString(),
                    notes: item.notes || ''
                };

                const { error: updErr } = await supabase
                    .from('orders')
                    .update({
                        status: 'shipped',
                        shipping_details: shippingDetails,
                        updated_at: new Date().toISOString()
                    })
                    .eq('id', order.id);

                if (updErr) {
                    results.errorCount++;
                    results.errors.push(`Order #${item.orderNumber}: DB update failed - ${updErr.message}`);
                    continue;
                }

                // Dispatch shipping notification email to customer
                await EmailService.sendNotification(order.id, 'order_shipped', {
                    courier: shippingDetails.tracking.courier,
                    awbNumber: shippingDetails.tracking.awbNumber,
                    trackingUrl: shippingDetails.tracking.trackingUrl,
                    courierPhone: shippingDetails.tracking.courierPhone,
                    orderNumber: order.order_number
                });

                results.successCount++;
                results.updatedOrders.push(order.order_number);

            } catch (err: any) {
                results.errorCount++;
                results.errors.push(`Order #${item.orderNumber}: Exception - ${err.message}`);
            }
        }

        ServerLogger.log('BULK_SHIP_COMPLETED', {
            total: results.total,
            success: results.successCount,
            errors: results.errorCount
        });

        return NextResponse.json({
            success: true,
            message: `Processed ${results.total} shipments: ${results.successCount} dispatched successfully, ${results.errorCount} errors.`,
            results
        });

    } catch (err: any) {
        ServerLogger.error('BULK_SHIP_EXCEPTION', err);
        return NextResponse.json({ error: err.message || 'Internal Server Error' }, { status: 500 });
    }
}
