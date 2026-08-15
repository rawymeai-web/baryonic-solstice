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

            let recipientEmail = customer.email;
            let recipientName = customer.name || 'Valued Customer';

            // Override recipient for admin notifications
            if (eventType === 'admin_new_order') {
                recipientEmail = 'rawy.app@gmail.com';
                recipientName = 'Rawy Admin';
            }

            ServerLogger.log('EMAIL_SEND_ATTEMPT', { eventType, recipientEmail, orderNumber: order.order_number });

            let subject = '';
            let html = '';

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
                                <p style="margin: 0 0 10px 0; font-size: 14px; color: #555;"><strong>Amount Paid:</strong> ${payload.total ? payload.total + ' KD' : 'Confirmed'}</p>
                                <p style="margin: 0; font-size: 14px; color: #555;"><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
                            </div>
                            
                            <h3 style="color: #001A40; font-size: 18px; font-weight: 700; margin-top: 32px; margin-bottom: 12px;">What happens next?</h3>
                            <ol style="font-size: 15px; line-height: 1.8; color: #333; margin-left: 20px; padding-left: 0;">
                                <li><strong>Creation:</strong> Our AI storytelling and illustration models are generating your unique book layouts.</li>
                                <li><strong>Preview:</strong> Once generated, you will receive an email to review and approve the design.</li>
                                <li><strong>Delivery:</strong> Once approved, we compile your soft copy and send it to our premium printing partner (if printed book was selected).</li>
                            </ol>
                            
                            <hr style="border: 0; border-top: 1px solid rgba(0, 26, 64, 0.08); margin: 32px 0;" />
                            <p style="font-size: 12px; color: #999; text-align: center; margin: 0;">Rawy. Where Every Child Becomes the Hero.</p>
                        </div>
                    `;
                    break;
                case 'admin_new_order':
                    subject = `🔔 New Order Received: #${order.order_number}`;
                    html = `
                        <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 25px; background-color: #f4f6f8; border-radius: 16px; border: 1px solid #e1e4e8; text-align: left; direction: ltr;">
                            <h2 style="color: #006B5D; margin-bottom: 20px; text-align: center;">🔔 New Order Received!</h2>
                            <p style="font-size: 16px;">An order has been successfully placed and paid on Rawy:</p>
                            
                            <table style="width: 100%; border-collapse: collapse; margin: 20px 0; font-size: 15px;">
                                <tr style="border-bottom: 1px solid #ddd;"><td style="padding: 10px 0; font-weight: bold;">Order Number:</td><td style="padding: 10px 0; text-align: right;">${order.order_number}</td></tr>
                                <tr style="border-bottom: 1px solid #ddd;"><td style="padding: 10px 0; font-weight: bold;">Customer Name:</td><td style="padding: 10px 0; text-align: right;">${customer.name || 'N/A'}</td></tr>
                                <tr style="border-bottom: 1px solid #ddd;"><td style="padding: 10px 0; font-weight: bold;">Customer Email:</td><td style="padding: 10px 0; text-align: right;">${customer.email}</td></tr>
                                <tr style="border-bottom: 1px solid #ddd;"><td style="padding: 10px 0; font-weight: bold;">Total Amount:</td><td style="padding: 10px 0; text-align: right; font-weight: bold; color: #F78F50;">${payload.total ? payload.total + ' KD' : 'N/A'}</td></tr>
                            </table>
                            
                            <div style="text-align: center; margin-top: 30px;">
                                <a href="https://mail.rawy.ai/admin/orders/${order.order_number}" style="background-color: #006B5D; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">View in Admin Panel</a>
                            </div>
                        </div>
                    `;
                    break;
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
                // In local dev, use onboarding@resend.dev since mail.rawy.ai is not verified yet
                const fromAddress = process.env.NODE_ENV === 'development'
                    ? 'onboarding@resend.dev'
                    : (process.env.RESEND_FROM_EMAIL || 'Rawy <noreply@mail.rawy.ai>');

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

