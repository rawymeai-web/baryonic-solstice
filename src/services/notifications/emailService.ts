import { supabase } from '@/utils/supabaseClient';
import { Resend } from 'resend';
import { ServerLogger } from '@/utils/serverLogger';

const resend = new Resend(process.env.RESEND_API_KEY || 're_stub_key');

export class EmailService {

    /**
     * Sends an email notification to the customer. 
     */
    static async sendNotification(orderId: string, eventType: string, payload: any) {
        try {
            // Find order by ID or order_number
            const { data: order } = await supabase
                .from('orders')
                .select('customer_id, subscription_id, order_number')
                .or(`order_number.eq.${orderId},customer_id.eq.${orderId}`)
                .limit(1)
                .maybeSingle();

            if (!order) {
                ServerLogger.error('EMAIL_SEND_FAILED', new Error(`Order not found for identifier: ${orderId}`));
                return;
            }

            // Fetch Customer Email from customers table
            const { data: customer } = await supabase
                .from('customers')
                .select('email, name')
                .eq('id', order.customer_id)
                .single();

            if (!customer || !customer.email) {
                ServerLogger.error('EMAIL_SEND_FAILED', new Error(`Customer or email not found for ID: ${order.customer_id}`));
                return;
            }

            const recipientEmail = customer.email;
            const recipientName = customer.name || 'Valued Customer';

            ServerLogger.log('EMAIL_SEND_ATTEMPT', { eventType, recipientEmail, orderNumber: order.order_number });

            let subject = '';
            let html = '';

            switch (eventType) {
                case 'softcopy_ready':
                    subject = 'Your AI Storybook Soft Copy is Ready! 📚✨';
                    html = `
                        <div style="font-family: 'Plus Jakarta Sans', 'Tajawal', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #FFF9F0; color: #001A40; border-radius: 24px; border: 1px solid rgba(0, 26, 64, 0.05); direction: ltr; text-align: left;">
                            <div style="text-align: center; margin-bottom: 24px;">
                                <span style="font-size: 40px;">📚</span>
                            </div>
                            <h2 style="color: #F78F50; font-size: 24px; font-weight: 800; margin-bottom: 16px; text-align: center;">Your Storybook is Ready! 🎉</h2>
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi ${recipientName},</p>
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">We are thrilled to let you know that your custom AI storybook (Order: <strong>${order.order_number}</strong>) has been fully compiled and is ready for download!</p>
                            <div style="text-align: center; margin: 32px 0;">
                                <a href="${payload.downloadLink}" style="background-color: #F78F50; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(247, 143, 80, 0.25);">Download PDF Softcopy</a>
                            </div>
                            <p style="font-size: 12px; color: #666; line-height: 1.6; margin-top: 32px;">If the button above does not work, copy and paste this link in your browser:<br/><a href="${payload.downloadLink}" style="color: #F78F50; text-decoration: underline;">${payload.downloadLink}</a></p>
                            <hr style="border: 0; border-top: 1px solid rgba(0, 26, 64, 0.08); margin: 32px 0;" />
                            <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">Rawy. Where Every Child Becomes the Hero.</p>
                        </div>
                    `;
                    break;
                case 'preview_ready':
                    subject = 'Review your Yearly Storybook Preview 🔍';
                    html = `
                        <div style="font-family: 'Plus Jakarta Sans', 'Tajawal', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #FFF9F0; color: #001A40; border-radius: 24px; border: 1px solid rgba(0, 26, 64, 0.05); direction: ltr; text-align: left;">
                            <div style="text-align: center; margin-bottom: 24px;">
                                <span style="font-size: 40px;">🔍</span>
                            </div>
                            <h2 style="color: #006B5D; font-size: 24px; font-weight: 800; margin-bottom: 16px; text-align: center;">Review Your Storybook Preview 👀</h2>
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi ${recipientName},</p>
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Your custom storybook preview is ready! You have <strong>72 hours</strong> to review the design and request 1 free regeneration before we automatically send it to our premium printing partner.</p>
                            <div style="text-align: center; margin: 32px 0;">
                                <a href="${payload.previewLink}" style="background-color: #006B5D; color: white; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(0, 107, 93, 0.25);">Review & Approve Preview</a>
                            </div>
                            <p style="font-size: 12px; color: #666; line-height: 1.6; margin-top: 32px;">If the button above does not work, copy and paste this link in your browser:<br/><a href="${payload.previewLink}" style="color: #006B5D; text-decoration: underline;">${payload.previewLink}</a></p>
                            <hr style="border: 0; border-top: 1px solid rgba(0, 26, 64, 0.08); margin: 32px 0;" />
                            <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">Rawy. Where Every Child Becomes the Hero.</p>
                        </div>
                    `;
                    break;
                case 'book_shipped':
                    subject = 'Your Printed Storybook Has Shipped! 🚚📦';
                    html = `
                        <div style="font-family: 'Plus Jakarta Sans', 'Tajawal', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #FFF9F0; color: #001A40; border-radius: 24px; border: 1px solid rgba(0, 26, 64, 0.05); direction: ltr; text-align: left;">
                            <div style="text-align: center; margin-bottom: 24px;">
                                <span style="font-size: 40px;">🚚</span>
                            </div>
                            <h2 style="color: #ECC156; font-size: 24px; font-weight: 800; margin-bottom: 16px; text-align: center;">On Its Way! 📦</h2>
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi ${recipientName},</p>
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Your physical storybook has completed printing and is now on its way to you! You can track your shipment using the link below.</p>
                            <div style="text-align: center; margin: 32px 0;">
                                <a href="${payload.trackingLink}" style="background-color: #ECC156; color: #001A40; padding: 14px 28px; text-decoration: none; border-radius: 12px; font-weight: bold; font-size: 16px; display: inline-block; box-shadow: 0 4px 12px rgba(236, 193, 86, 0.25);">Track Shipment</a>
                            </div>
                            <hr style="border: 0; border-top: 1px solid rgba(0, 26, 64, 0.08); margin: 32px 0;" />
                            <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">Rawy. Where Every Child Becomes the Hero.</p>
                        </div>
                    `;
                    break;
                default:
                    subject = `System Update: ${eventType}`;
                    html = `
                        <div style="font-family: sans-serif; padding: 20px; background-color: #FFF9F0; color: #001A40;">
                            <h2>System Update for Order #${order.order_number}</h2>
                            <p>An update of type <strong>${eventType}</strong> occurred.</p>
                            <pre style="background: rgba(0,0,0,0.05); padding: 10px; border-radius: 8px;">${JSON.stringify(payload, null, 2)}</pre>
                        </div>
                    `;
            }

            // Execute Resend dispatch if Key is configured
            if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith('re_stub')) {
                const { data, error: sendError } = await resend.emails.send({
                    from: 'Rawy <noreply@mail.rawy.ai>',
                    to: recipientEmail,
                    subject: subject,
                    html: html,
                });

                if (sendError) {
                    throw sendError;
                }

                ServerLogger.log('EMAIL_SEND_SUCCESS', { resendId: data?.id, orderNumber: order.order_number });
            } else {
                ServerLogger.log('EMAIL_SEND_STUB_SENT', { subject, recipientEmail, orderNumber: order.order_number });
            }

            // Write to event audit log
            await supabase.from('event_audit_log').insert({
                event_type: 'email_dispatched',
                order_id: order.order_number,
                details: { type: eventType, recipient: recipientEmail, subject }
            });

        } catch (err: any) {
            ServerLogger.error('EMAIL_SEND_CRASH', err, { orderId, eventType });
        }
    }
}

