import { supabase } from '@/utils/supabaseClient';
import { Resend } from 'resend';
import { ServerLogger } from '@/utils/serverLogger';

const resend = new Resend(process.env.RESEND_API_KEY || 're_stub_key');

// Helper to get user-friendly status name
const friendlyStatus = (status: string) => {
    switch (status) {
        case 'paid':
        case 'paid_confirmed':
        case 'queued':
            return 'Payment Confirmed & Queued';
        case 'story_generating':
        case 'story_ready':
        case 'illustrations_generating':
        case 'illustrations_ready':
            return 'Creative Story Generation';
        case 'book_compiling':
        case 'softcopy_ready':
        case 'awaiting_preview_approval':
            return 'Awaiting Design Approval';
        case 'sent_to_print':
        case 'printing':
            return 'Sent to Press / Printing';
        case 'shipped':
            return 'Shipped';
        case 'delivered':
            return 'Delivered';
        case 'on_hold':
            return 'On Hold';
        case 'cancelled':
            return 'Cancelled';
        case 'failed':
            return 'Failed';
        default:
            return status.replace(/_/g, ' ');
    }
};

// Helper to get friendly explanation of status changes
const statusExplanation = (status: string) => {
    switch (status) {
        case 'paid':
        case 'paid_confirmed':
        case 'queued':
            return 'We have successfully confirmed your payment! Your custom book is in our queue and will start generating shortly.';
        case 'story_generating':
        case 'story_ready':
        case 'illustrations_generating':
        case 'illustrations_ready':
            return 'Our AI models are dynamically building your custom story pages and creating unique character illustrations for your child.';
        case 'book_compiling':
        case 'softcopy_ready':
        case 'awaiting_preview_approval':
            return 'Your custom storybook design is ready for review! Please visit your tracking link to preview the book and confirm printing.';
        case 'sent_to_print':
        case 'printing':
            return 'Your approved storybook has been queued for physical printing. Our premium printing partner is currently crafting your physical hardcover copy.';
        case 'shipped':
            return 'Good news! Your book has shipped and is on its way to you. Click the button below to view tracking details.';
        case 'delivered':
            return 'Your Rawy storybook package has been successfully delivered! We hope you and your child enjoy the magical adventure together.';
        case 'on_hold':
            return 'Your order is currently placed on hold by our admin team. We will contact you shortly to resolve any questions.';
        case 'cancelled':
            return 'Your order has been cancelled. If this is a mistake, please reach out to our support team.';
        default:
            return `Your order progress has updated to "${status}". We will keep you updated at every stage of the creation process.`;
    }
};

export class EmailService {

    /**
     * Sends an email notification to the customer. 
     */
    static async sendNotification(orderId: string, eventType: string, payload: any) {
        try {
            // Find order by order_number or customer_id
            const { data: order } = await supabase
                .from('orders')
                .select('customer_id, subscription_id, order_number, shipping_details, story_data')
                .or(`order_number.eq.${orderId},customer_id.eq.${orderId}`)
                .limit(1)
                .maybeSingle();

            if (!order) {
                ServerLogger.error('EMAIL_SEND_FAILED', new Error(`Order not found for identifier: ${orderId}`));
                return;
            }

            let recipientEmail = order.shipping_details?.email || (order.customer_id?.includes('@') ? order.customer_id : '');
            let recipientName = order.shipping_details?.name || order.story_data?.parentName || 'Valued Customer';

            // If email not found in order or customer_id is a UUID, check customers table
            if (!recipientEmail && order.customer_id) {
                const { data: customer } = await supabase
                    .from('customers')
                    .select('email, name')
                    .eq('id', order.customer_id)
                    .maybeSingle();

                if (customer?.email) {
                    recipientEmail = customer.email;
                    if (customer.name) recipientName = customer.name;
                }
            }

            if (!recipientEmail) {
                ServerLogger.error('EMAIL_SEND_FAILED', new Error(`Customer email not found for Order: ${order.order_number}`));
                return;
            }

            // Override recipient for admin notifications
            if (eventType === 'admin_new_order') {
                recipientEmail = process.env.ADMIN_EMAIL || 'rawy.me.ai@gmail.com';
                recipientName = 'Rawy Admin';
            }

            ServerLogger.log('EMAIL_SEND_ATTEMPT', { eventType, recipientEmail, orderNumber: order.order_number });

            let subject = '';
            let html = '';

            const storyTitle = order.story_data?.title || 'Your Custom Storybook';
            const childName = order.story_data?.childName || 'Your Child';
            const coverImg = order.story_data?.coverOriginalUrl || order.story_data?.spreads?.[0]?.illustrationUrl || '';

            switch (eventType) {
                case 'order_received':
                    subject = `Your Rawy Storybook Order is Confirmed! 🚀📚`;
                    html = `
                        <div style="font-family: 'Plus Jakarta Sans', 'Tajawal', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #FFF9F0; color: #001A40; border-radius: 24px; border: 1px solid rgba(0, 26, 64, 0.05); direction: ltr; text-align: left;">
                            <div style="text-align: center; margin-bottom: 24px;">
                                <span style="font-size: 40px;">🎉</span>
                            </div>
                            <h2 style="color: #F78F50; font-size: 24px; font-weight: 800; margin-bottom: 16px; text-align: center;">Order Confirmed! 🚀</h2>
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi ${recipientName},</p>
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Thank you for your order! We have successfully received your payment and our creative engines have begun weaving your custom storybook.</p>
                            
                            <div style="background-color: rgba(0, 26, 64, 0.03); padding: 20px; border-radius: 16px; margin: 24px 0; border: 1px dashed rgba(0, 26, 64, 0.1);">
                                <p style="margin: 0 0 10px 0; font-size: 14px; color: #555;"><strong>Order Number:</strong> ${order.order_number}</p>
                                <p style="margin: 0 0 10px 0; font-size: 14px; color: #555;"><strong>Story:</strong> ${storyTitle}</p>
                                <p style="margin: 0 0 10px 0; font-size: 14px; color: #555;"><strong>Amount Paid:</strong> ${payload.total ? payload.total + ' KD' : 'Confirmed'}</p>
                                <p style="margin: 0; font-size: 14px; color: #555;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                            </div>
                            
                            <h3 style="color: #001A40; font-size: 18px; font-weight: 700; margin-top: 32px; margin-bottom: 12px;">What happens next?</h3>
                            <ol style="font-size: 15px; line-height: 1.8; color: #333; margin-left: 20px; padding-left: 0;">
                                <li><strong>Creation:</strong> Our AI storytelling and illustration models are generating your unique book layouts.</li>
                                <li><strong>Preview:</strong> Once generated, you will receive an email to review and approve the design.</li>
                                <li><strong>Delivery:</strong> Once approved, we compile your soft copy and dispatch your package (if printed book was selected).</li>
                            </ol>
                            
                            <hr style="border: 0; border-top: 1px solid rgba(0, 26, 64, 0.08); margin: 32px 0;" />
                            <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">Rawy. Where Every Child Becomes the Hero.</p>
                        </div>
                    `;
                    break;

                case 'preview_ready':
                    const previewLink = payload.previewLink || `https://rawytime.com/?preview=${order.order_number}`;
                    subject = `Your Custom Storybook is Ready to Preview! 📚✨ (#${order.order_number})`;
                    html = `
                        <div style="font-family: 'Plus Jakarta Sans', 'Tajawal', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #FFF9F0; color: #001A40; border-radius: 24px; border: 1px solid rgba(0, 26, 64, 0.05); direction: ltr; text-align: left;">
                            <div style="text-align: center; margin-bottom: 20px;">
                                <span style="font-size: 40px;">🎨📖</span>
                            </div>
                            <h2 style="color: #006B5D; font-size: 24px; font-weight: 800; margin-bottom: 12px; text-align: center;">Your Book is Ready to View! 🎉</h2>
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Hi ${recipientName},</p>
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">The illustrations and story for <strong>"${storyTitle}"</strong> starring <strong>${childName}</strong> are ready for you to preview!</p>
                            
                            ${coverImg ? `
                                <div style="text-align: center; margin: 24px 0;">
                                    <img src="${coverImg}" alt="Storybook Cover" style="max-width: 85%; max-height: 260px; border-radius: 16px; box-shadow: 0 8px 24px rgba(0,0,0,0.12); object-fit: cover;" />
                                </div>
                            ` : ''}

                            <div style="text-align: center; margin: 32px 0;">
                                <a href="${previewLink}" style="background-color: #006B5D; color: white; padding: 16px 36px; text-decoration: none; border-radius: 14px; font-weight: 800; font-size: 16px; display: inline-block; box-shadow: 0 4px 16px rgba(0, 107, 93, 0.3);">
                                    👁️ Preview & Flip Through Book
                                </a>
                            </div>

                            <p style="font-size: 13px; color: #666; line-height: 1.6; text-align: center;">
                                Click above to flip through every page. If you'd like to open the link directly:<br/>
                                <a href="${previewLink}" style="color: #006B5D; word-break: break-all;">${previewLink}</a>
                            </p>

                            <hr style="border: 0; border-top: 1px solid rgba(0, 26, 64, 0.08); margin: 32px 0;" />
                            <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">Rawy • Where Every Child Becomes the Hero.</p>
                        </div>
                    `;
                    break;

                case 'order_shipped':
                case 'book_shipped':
                    const courier = payload.courier || payload.courierName || 'Express Courier';
                    const awb = payload.awbNumber || payload.trackingNumber || payload.awb || 'N/A';
                    const trackUrl = payload.trackingUrl || payload.trackingLink || '';
                    const courierPhone = payload.courierPhone || '';

                    subject = `Your Storybook Has Shipped! 🚚📦 (#${order.order_number})`;
                    html = `
                        <div style="font-family: 'Plus Jakarta Sans', 'Tajawal', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #FFF9F0; color: #001A40; border-radius: 24px; border: 1px solid rgba(0, 26, 64, 0.05); direction: ltr; text-align: left;">
                            <div style="text-align: center; margin-bottom: 20px;">
                                <span style="font-size: 40px;">🚚📦</span>
                            </div>
                            <h2 style="color: #F78F50; font-size: 24px; font-weight: 800; margin-bottom: 12px; text-align: center;">Your Book is On Its Way! 🚀</h2>
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 20px;">Hi ${recipientName},</p>
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Great news! Your hardcover storybook (Order: <strong>${order.order_number}</strong>) has been printed, packed with love, and handed over for delivery.</p>

                            <div style="background-color: white; padding: 24px; border-radius: 18px; margin: 24px 0; border: 1px solid rgba(0, 26, 64, 0.08); box-shadow: 0 2px 8px rgba(0,0,0,0.04);">
                                <table style="width: 100%; border-collapse: collapse; font-size: 14px;">
                                    <tr style="border-bottom: 1px solid #f0f0f0;">
                                        <td style="padding: 10px 0; color: #777; font-weight: 600;">Courier:</td>
                                        <td style="padding: 10px 0; font-weight: 800; color: #001A40; text-align: right;">${courier}</td>
                                    </tr>
                                    <tr style="border-bottom: 1px solid #f0f0f0;">
                                        <td style="padding: 10px 0; color: #777; font-weight: 600;">Tracking / AWB #:</td>
                                        <td style="padding: 10px 0; font-family: monospace; font-size: 15px; font-weight: 800; color: #F78F50; text-align: right;">${awb}</td>
                                    </tr>
                                    ${courierPhone ? `
                                    <tr style="border-bottom: 1px solid #f0f0f0;">
                                        <td style="padding: 10px 0; color: #777; font-weight: 600;">Courier Contact:</td>
                                        <td style="padding: 10px 0; font-weight: 700; color: #001A40; text-align: right;">${courierPhone}</td>
                                    </tr>
                                    ` : ''}
                                    ${order.shipping_details?.address ? `
                                    <tr>
                                        <td style="padding: 10px 0; color: #777; font-weight: 600;">Shipping To:</td>
                                        <td style="padding: 10px 0; font-weight: 600; color: #555; text-align: right; font-size: 13px;">${order.shipping_details.address}</td>
                                    </tr>
                                    ` : ''}
                                </table>
                            </div>

                            ${trackUrl ? `
                                <div style="text-align: center; margin: 32px 0;">
                                    <a href="${trackUrl}" style="background-color: #F78F50; color: white; padding: 16px 36px; text-decoration: none; border-radius: 14px; font-weight: 800; font-size: 16px; display: inline-block; box-shadow: 0 4px 16px rgba(247, 143, 80, 0.3);">
                                        📍 Track Your Package
                                    </a>
                                </div>
                            ` : ''}

                            <hr style="border: 0; border-top: 1px solid rgba(0, 26, 64, 0.08); margin: 32px 0;" />
                            <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">Rawy • Where Every Child Becomes the Hero.</p>
                        </div>
                    `;
                    break;
                case 'status_changed':
                    subject = `Update on your Rawy Storybook Order #${order.order_number} 📢`;
                    html = `
                        <div style="font-family: 'Plus Jakarta Sans', 'Tajawal', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #FFF9F0; color: #001A40; border-radius: 24px; border: 1px solid rgba(0, 26, 64, 0.05); direction: ltr; text-align: left;">
                            <div style="text-align: center; margin-bottom: 24px;">
                                <span style="font-size: 40px;">📢</span>
                            </div>
                            <h2 style="color: #006B5D; font-size: 24px; font-weight: 800; margin-bottom: 16px; text-align: center;">Order Update!</h2>
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi ${recipientName},</p>
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">We wanted to let you know that the status of your storybook order (<strong>${order.order_number}</strong>) has changed:</p>
                            
                            <div style="background-color: rgba(0, 107, 93, 0.04); padding: 24px; border-radius: 16px; margin: 24px 0; border: 1px solid rgba(0, 107, 93, 0.1); text-align: center;">
                                <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #555;">New Status</span>
                                <h3 style="font-size: 20px; font-weight: 800; color: #006B5D; margin: 8px 0 0 0;">${friendlyStatus(payload.status)}</h3>
                            </div>
                            
                            <p style="font-size: 15px; line-height: 1.6; color: #444; margin-bottom: 24px; text-align: center;">
                                ${statusExplanation(payload.status)}
                            </p>

                            <hr style="border: 0; border-top: 1px solid rgba(0, 26, 64, 0.08); margin: 32px 0;" />
                            <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">Rawy. Where Every Child Becomes the Hero.</p>
                        </div>
                    `;
                    break;
                case 'subscription_updated':
                    subject = `Rawy Subscription Update 💫`;
                    html = `
                        <div style="font-family: 'Plus Jakarta Sans', 'Tajawal', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #FFF9F0; color: #001A40; border-radius: 24px; border: 1px solid rgba(0, 26, 64, 0.05); direction: ltr; text-align: left;">
                            <div style="text-align: center; margin-bottom: 24px;">
                                <span style="font-size: 40px;">💫</span>
                            </div>
                            <h2 style="color: #006B5D; font-size: 24px; font-weight: 800; margin-bottom: 16px; text-align: center;">Subscription Update</h2>
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi ${recipientName},</p>
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">We are writing to let you know that your Rawy subscription has been updated:</p>
                            
                            <div style="background-color: rgba(0, 107, 93, 0.04); padding: 24px; border-radius: 16px; margin: 24px 0; border: 1px solid rgba(0, 107, 93, 0.1); text-align: center;">
                                <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #555;">Subscription Status</span>
                                <h3 style="font-size: 20px; font-weight: 800; color: #006B5D; margin: 8px 0 0 0;">${payload.status || 'Active'}</h3>
                            </div>
                            
                            <p style="font-size: 15px; line-height: 1.6; color: #444; margin-bottom: 24px;">
                                ${payload.message || 'Your subscription details have been successfully updated. Thank you for being a part of Rawy!'}
                            </p>

                            <hr style="border: 0; border-top: 1px solid rgba(0, 26, 64, 0.08); margin: 32px 0;" />
                            <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">Rawy. Where Every Child Becomes the Hero.</p>
                        </div>
                    `;
                    break;
                default:
                    subject = `System Update: ${eventType}`;
                    html = `
                        <div style="font-family: sans-serif; padding: 20px; background-color: #FFF9F0; color: #001A40; direction: ltr; text-align: left;">
                            <h2>System Update for Order #${order.order_number}</h2>
                            <p>An update of type <strong>${eventType}</strong> occurred.</p>
                            <pre style="background: rgba(0,0,0,0.05); padding: 10px; border-radius: 8px;">${JSON.stringify(payload, null, 2)}</pre>
                        </div>
                    `;
            }

            // Execute Resend dispatch if Key is configured
            if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith('re_stub')) {
                // In local dev, use onboarding@resend.dev since rawytime.com is not verified yet
                const fromAddress = process.env.NODE_ENV === 'development'
                    ? 'onboarding@resend.dev'
                    : (process.env.RESEND_FROM_EMAIL || 'Rawy <noreply@rawytime.com>');

                const { data, error: sendError } = await resend.emails.send({
                    from: fromAddress,
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

