import { supabase } from '@/utils/supabaseClient';
import { Resend } from 'resend';
import { ServerLogger } from '@/utils/serverLogger';

const resend = new Resend(process.env.RESEND_API_KEY || 're_stub_key');

// CAN-SPAM & Global Compliance Physical Postal Address
export const COMPANY_PHYSICAL_ADDRESS = "Rawy / Albumii General Trading & Contracting Co. W.L.L., Al Hamra Business Tower, Sharq, Kuwait City, Kuwait";

export const getEmailFooter = (recipientEmail: string = '', isMarketing: boolean = false) => {
    const unsubscribeUrl = `https://rawytime.com/unsubscribe.html?email=${encodeURIComponent(recipientEmail || '')}`;
    return `
        <div style="margin-top: 32px; padding-top: 20px; border-top: 1px solid rgba(0, 26, 64, 0.08); font-size: 11px; line-height: 1.6; color: #888; text-align: center;">
            <p style="margin: 0 0 6px 0; font-weight: 700; color: #001A40;">Rawy &bull; Where Every Child Becomes the Hero</p>
            <p style="margin: 0 0 6px 0; color: #666;">${COMPANY_PHYSICAL_ADDRESS}</p>
            <p style="margin: 0; color: #777;">
                ${isMarketing 
                    ? `You received this promotional communication from Rawy. <a href="${unsubscribeUrl}" style="color: #F78F50; text-decoration: underline;">One-Click Unsubscribe</a>` 
                    : `This is an important transactional update regarding your order or account on Rawy. <a href="${unsubscribeUrl}" style="color: #F78F50; text-decoration: underline;">Email preferences / Unsubscribe</a>`}
            </p>
        </div>
    `;
};

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
                .select('customer_id, subscription_id, order_number, shipping_details, story_data, total')
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

            // Override recipient for admin notifications (guaranteed delivery)
            if (eventType === 'admin_new_order') {
                recipientEmail = process.env.ADMIN_EMAIL || 'rawy.me.ai@gmail.com';
                recipientName = 'Rawy Admin';
            }

            if (!recipientEmail) {
                ServerLogger.error('EMAIL_SEND_FAILED', new Error(`Customer email not found for Order: ${order.order_number}`));
                return;
            }

            ServerLogger.log('EMAIL_SEND_ATTEMPT', { eventType, recipientEmail, orderNumber: order.order_number });

            let subject = '';
            let html = '';

            const storyTitle = order.story_data?.title || 'Your Custom Storybook';
            const childName = order.story_data?.childName || 'Your Child';
            const coverImg = order.story_data?.coverOriginalUrl || order.story_data?.spreads?.[0]?.illustrationUrl || '';

            switch (eventType) {
                case 'order_received':
                    subject = `We're crafting ${childName}'s custom storybook! 🎨✨ (#${order.order_number})`;
                    html = `
                        <div style="font-family: 'Plus Jakarta Sans', 'Tajawal', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background-color: #FFF9F0; color: #001A40; border-radius: 28px; border: 1px solid rgba(0, 26, 64, 0.06); direction: ltr; text-align: left;">
                            <div style="text-align: center; margin-bottom: 24px;">
                                <span style="font-size: 44px;">✨📖</span>
                            </div>
                            <h2 style="color: #006B5D; font-size: 24px; font-weight: 800; margin-bottom: 12px; text-align: center;">Order Confirmed! 🎉</h2>
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">Hi ${recipientName},</p>
                            <p style="font-size: 16px; line-height: 1.7; color: #2D3748; margin-bottom: 20px;">
                                Thank you for your order! We have received your request and our creative engines have officially begun crafting <strong>"${storyTitle}"</strong> starring <strong>${childName}</strong>.
                            </p>
                            
                            <div style="background: linear-gradient(135deg, rgba(0,107,93,0.06) 0%, rgba(247,143,80,0.08) 100%); padding: 22px; border-radius: 20px; margin: 24px 0; border: 1px dashed rgba(0, 107, 93, 0.25);">
                                <p style="margin: 0 0 10px 0; font-size: 14px; color: #4A5568;"><strong>📦 Order Number:</strong> <span style="font-family: monospace; font-weight: 700; color: #006B5D;">#${order.order_number}</span></p>
                                <p style="margin: 0 0 10px 0; font-size: 14px; color: #4A5568;"><strong>🌟 Story:</strong> ${storyTitle}</p>
                                <p style="margin: 0 0 10px 0; font-size: 14px; color: #4A5568;"><strong>⭐ Hero:</strong> ${childName}</p>
                                <p style="margin: 0; font-size: 14px; color: #4A5568;"><strong>📅 Order Date:</strong> ${new Date().toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
                            </div>
                            
                            <div style="background-color: #FFFFFF; padding: 24px; border-radius: 20px; margin: 28px 0; border: 1px solid rgba(0, 26, 64, 0.06); box-shadow: 0 4px 12px rgba(0,0,0,0.02);">
                                <h3 style="color: #F78F50; font-size: 16px; font-weight: 800; margin-top: 0; margin-bottom: 10px; display: flex; items-center;">
                                    ⏳ Good things take a little time...
                                </h3>
                                <p style="font-size: 14px; line-height: 1.7; color: #4A5568; margin: 0 0 14px 0;">
                                    Every illustration and spread is custom-generated with love and attention to detail. We ensure every scene captures ${childName}'s character and personality.
                                </p>
                                <p style="font-size: 14px; line-height: 1.7; color: #006B5D; font-weight: 700; margin: 0;">
                                    💌 You don't need to do anything right now — the moment your storybook is ready, we'll send you an email with your direct link to read and flip through the story!
                                </p>
                            </div>
                            
                            ${getEmailFooter(recipientEmail)}
                        </div>
                    `;
                    break;

                case 'admin_new_order':
                    const orderTotal = payload.total !== undefined ? `${payload.total} KWD` : `${(order as any)?.total || 0} KWD`;
                    subject = `🚨 New Order Received! #${order.order_number} (${orderTotal}) 💰`;
                    html = `
                        <div style="font-family: 'Plus Jakarta Sans', 'Tajawal', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background-color: #001A40; color: #FFFFFF; border-radius: 28px; direction: ltr; text-align: left;">
                            <div style="text-align: center; margin-bottom: 20px;">
                                <span style="font-size: 40px;">🚨📦</span>
                            </div>
                            <h2 style="color: #ECC156; font-size: 22px; font-weight: 800; margin-bottom: 8px; text-align: center;">New Customer Order Placed!</h2>
                            <p style="font-size: 14px; color: #A0AEC0; text-align: center; margin-bottom: 24px;">A new storybook adventure has been initiated on Rawy.</p>
                            
                            <div style="background-color: rgba(255, 255, 255, 0.08); padding: 22px; border-radius: 18px; margin: 20px 0; border: 1px solid rgba(255, 255, 255, 0.12);">
                                <table style="width: 100%; border-collapse: collapse; font-size: 14px; color: #FFFFFF;">
                                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                                        <td style="padding: 8px 0; color: #A0AEC0;">Order ID:</td>
                                        <td style="padding: 8px 0; font-weight: 800; color: #ECC156; text-align: right; font-family: monospace;">#${order.order_number}</td>
                                    </tr>
                                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                                        <td style="padding: 8px 0; color: #A0AEC0;">Total:</td>
                                        <td style="padding: 8px 0; font-weight: 800; color: #38A169; text-align: right;">${orderTotal}</td>
                                    </tr>
                                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                                        <td style="padding: 8px 0; color: #A0AEC0;">Story Title:</td>
                                        <td style="padding: 8px 0; font-weight: 700; text-align: right;">${storyTitle}</td>
                                    </tr>
                                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                                        <td style="padding: 8px 0; color: #A0AEC0;">Hero / Child:</td>
                                        <td style="padding: 8px 0; font-weight: 700; text-align: right;">${childName}</td>
                                    </tr>
                                    <tr style="border-bottom: 1px solid rgba(255,255,255,0.08);">
                                        <td style="padding: 8px 0; color: #A0AEC0;">Customer Email:</td>
                                        <td style="padding: 8px 0; font-weight: 700; color: #ECC156; text-align: right;">${order.shipping_details?.email || order.customer_id || 'N/A'}</td>
                                    </tr>
                                    <tr>
                                        <td style="padding: 8px 0; color: #A0AEC0;">Shipping Address:</td>
                                        <td style="padding: 8px 0; font-weight: 500; text-align: right; font-size: 13px;">${order.shipping_details?.address || 'Digital Delivery'}</td>
                                    </tr>
                                </table>
                            </div>

                            <div style="text-align: center; margin: 28px 0;">
                                <a href="https://rawytime.com/?story=${order.order_number}" style="background-color: #F78F50; color: white; padding: 14px 32px; text-decoration: none; border-radius: 14px; font-weight: 800; font-size: 14px; display: inline-block; box-shadow: 0 4px 14px rgba(247, 143, 80, 0.4);">
                                    🔍 Open Story Details
                                </a>
                            </div>

                            <p style="font-size: 11px; color: #718096; text-align: center; margin: 0;">Rawy Internal Order Processing Notification</p>
                        </div>
                    `;
                    break;

                case 'preview_ready':
                    const previewLink = payload.previewLink || `https://rawytime.com/?preview=${order.order_number}`;
                    subject = `Your Custom Storybook is Ready! 📚✨ (#${order.order_number})`;
                    html = `
                        <div style="font-family: 'Plus Jakarta Sans', 'Tajawal', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 32px 24px; background-color: #FFF9F0; color: #001A40; border-radius: 28px; border: 1px solid rgba(0, 26, 64, 0.06); direction: ltr; text-align: left;">
                            <div style="text-align: center; margin-bottom: 20px;">
                                <span style="font-size: 44px;">🎉📖</span>
                            </div>
                            <h2 style="color: #006B5D; font-size: 24px; font-weight: 800; margin-bottom: 12px; text-align: center;">Your Book is Ready! 🌟</h2>
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 16px;">Hi ${recipientName},</p>
                            <p style="font-size: 16px; line-height: 1.7; color: #2D3748; margin-bottom: 24px;">
                                Great news! The custom illustrations and story for <strong>"${storyTitle}"</strong> starring <strong>${childName}</strong> are completely ready for you and your family to enjoy!
                            </p>
                            
                            ${coverImg ? `
                                <div style="text-align: center; margin: 24px 0;">
                                    <img src="${coverImg}" alt="Storybook Cover" style="max-width: 85%; max-height: 260px; border-radius: 20px; box-shadow: 0 10px 30px rgba(0,0,0,0.12); object-fit: cover;" />
                                </div>
                            ` : ''}

                            <div style="text-align: center; margin: 32px 0;">
                                <a href="${previewLink}" style="background-color: #006B5D; color: white; padding: 18px 40px; text-decoration: none; border-radius: 16px; font-weight: 800; font-size: 16px; display: inline-block; box-shadow: 0 6px 20px rgba(0, 107, 93, 0.35);">
                                    📖 Open & Flip Through Book
                                </a>
                            </div>

                            <p style="font-size: 13px; color: #718096; line-height: 1.6; text-align: center;">
                                Click the button above to flip through every page. You can also open the link directly:<br/>
                                <a href="${previewLink}" style="color: #006B5D; font-weight: 700; word-break: break-all;">${previewLink}</a>
                            </p>

                            ${getEmailFooter(recipientEmail)}
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

                            ${getEmailFooter(recipientEmail)}
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

                            ${getEmailFooter(recipientEmail)}
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

                            ${getEmailFooter(recipientEmail)}
                        </div>
                    `;
                    break;
                case 'subscription_renewal_reminder':
                    const renewDate = payload.renewalDate || 'in 7 days';
                    const renewAmount = payload.amount || 'your regular plan rate';
                    subject = `Upcoming Rawy Subscription Renewal Notice 📅`;
                    html = `
                        <div style="font-family: 'Plus Jakarta Sans', 'Tajawal', Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 30px; background-color: #FFF9F0; color: #001A40; border-radius: 24px; border: 1px solid rgba(0, 26, 64, 0.05); direction: ltr; text-align: left;">
                            <div style="text-align: center; margin-bottom: 24px;">
                                <span style="font-size: 40px;">📅✨</span>
                            </div>
                            <h2 style="color: #006B5D; font-size: 24px; font-weight: 800; margin-bottom: 16px; text-align: center;">Subscription Renewal Notice</h2>
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">Hi ${recipientName},</p>
                            <p style="font-size: 16px; line-height: 1.6; margin-bottom: 24px;">
                                This is a friendly reminder that your Rawy membership (${payload.plan || 'Plan'}) is scheduled to automatically renew on <strong>${renewDate}</strong> for <strong>${renewAmount}</strong>.
                            </p>
                            
                            <div style="background-color: rgba(0, 107, 93, 0.04); padding: 24px; border-radius: 16px; margin: 24px 0; border: 1px solid rgba(0, 107, 93, 0.1); text-align: center;">
                                <span style="font-size: 12px; text-transform: uppercase; letter-spacing: 0.1em; color: #555;">Next Billing Date</span>
                                <h3 style="font-size: 20px; font-weight: 800; color: #006B5D; margin: 8px 0 0 0;">${renewDate}</h3>
                            </div>
                            
                            <p style="font-size: 14px; line-height: 1.6; color: #444; margin-bottom: 24px;">
                                You don't need to take any action to continue receiving your monthly story credits and benefits. If you wish to cancel or modify your plan, you can do so anytime from your <a href="https://rawytime.com" style="color: #F78F50; font-weight: bold; text-decoration: underline;">Account Dashboard</a> before the renewal date.
                            </p>

                            ${getEmailFooter(recipientEmail)}
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

    /**
     * Sends an urgent QA alert email to the Admin when a spread fails 3 QA generation attempts.
     */
    static async sendAdminQaAlert(orderId: string, spreadNumber: number | string, details: {
        childName?: string;
        likenessScore?: number;
        characterConsistency?: string;
        styleScore?: number;
        reason?: string;
        illustrationUrl?: string;
        attemptCount?: number;
    }) {
        try {
            const adminEmail = process.env.ADMIN_ALERT_EMAIL || process.env.ADMIN_EMAIL || 'admin@rawytime.com';
            const spreadLabel = spreadNumber === 0 || spreadNumber === 'cover' ? 'Cover' : `Spread ${spreadNumber}`;
            const subject = `🚨 [QA Action Required] ${spreadLabel} Flagged for Review (Order #${orderId})`;

            const html = `
                <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 16px; overflow: hidden; border: 1px solid #fee2e2;">
                    <div style="background: linear-gradient(135deg, #b91c1c 0%, #dc2626 100%); padding: 28px 24px; text-align: center; color: white;">
                        <span style="font-size: 32px; display: block; margin-bottom: 8px;">🚨</span>
                        <h1 style="font-size: 20px; font-weight: 800; margin: 0; text-transform: uppercase; letter-spacing: 0.05em;">QA Attention Required</h1>
                        <p style="font-size: 13px; opacity: 0.9; margin: 6px 0 0 0;">3rd QA Generation Attempt Completed & Flagged</p>
                    </div>

                    <div style="padding: 24px 28px; color: #1e293b;">
                        <div style="background-color: #fef2f2; border-left: 4px solid #ef4444; padding: 14px 18px; border-radius: 8px; margin-bottom: 20px;">
                            <p style="margin: 0; font-size: 13px; font-weight: 700; color: #991b1b;">Order #${orderId} • ${spreadLabel}</p>
                            <p style="margin: 4px 0 0 0; font-size: 12px; color: #b91c1c;">Hero: <strong>${details.childName || 'Child'}</strong> | Attempts: <strong>${details.attemptCount || 3}</strong></p>
                        </div>

                        <h3 style="font-size: 14px; font-weight: 800; text-transform: uppercase; color: #475569; margin: 0 0 12px 0;">QA Evaluation Metrics</h3>
                        <table style="width: 100%; border-collapse: collapse; font-size: 13px; margin-bottom: 20px;">
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 8px 0; color: #64748b;">Character Likeness Score:</td>
                                <td style="padding: 8px 0; font-weight: 700; color: #dc2626; text-align: right;">${details.likenessScore !== undefined ? `${details.likenessScore}/10` : 'N/A'}</td>
                            </tr>
                            <tr style="border-bottom: 1px solid #f1f5f9;">
                                <td style="padding: 8px 0; color: #64748b;">Character Consistency:</td>
                                <td style="padding: 8px 0; font-weight: 700; color: #334155; text-align: right;">${details.characterConsistency || 'Flagged'}</td>
                            </tr>
                            <tr>
                                <td style="padding: 8px 0; color: #64748b;">Reason / Diagnostics:</td>
                                <td style="padding: 8px 0; font-weight: 600; color: #334155; text-align: right;">${details.reason || 'Likeness or style threshold not met after Doctor prompt.'}</td>
                            </tr>
                        </table>

                        ${details.illustrationUrl ? `
                            <div style="margin-bottom: 20px; text-align: center;">
                                <p style="font-size: 11px; font-weight: 700; color: #64748b; text-transform: uppercase; margin-bottom: 8px;">Generated Artwork Preview:</p>
                                <img src="${details.illustrationUrl}" alt="${spreadLabel}" style="max-width: 100%; height: auto; border-radius: 12px; border: 1px solid #e2e8f0;" />
                            </div>
                        ` : ''}

                        <div style="text-align: center; margin-top: 24px;">
                            <a href="https://rawytime.com/admin" style="display: inline-block; background-color: #001A40; color: #ffffff; text-decoration: none; padding: 14px 28px; border-radius: 12px; font-weight: 800; font-size: 13px; text-transform: uppercase; letter-spacing: 0.05em;">
                                Open Spread Editor & Fix
                            </a>
                        </div>
                    </div>

                    <div style="background-color: #f8fafc; padding: 16px; text-align: center; font-size: 11px; color: #94a3b8; border-top: 1px solid #f1f5f9;">
                        Rawy Autonomous Publishing Engine • Internal QA Dispatch
                    </div>
                </div>
            `;

            if (process.env.RESEND_API_KEY && !process.env.RESEND_API_KEY.startsWith('re_stub')) {
                const fromAddress = process.env.NODE_ENV === 'development'
                    ? 'onboarding@resend.dev'
                    : (process.env.RESEND_FROM_EMAIL || 'Rawy <noreply@rawytime.com>');

                const { data, error: sendError } = await resend.emails.send({
                    from: fromAddress,
                    to: adminEmail,
                    subject,
                    html,
                });

                if (sendError) throw sendError;
                ServerLogger.log('ADMIN_QA_ALERT_SENT', { resendId: data?.id, orderId, spreadNumber });
            } else {
                ServerLogger.log('ADMIN_QA_ALERT_STUB_SENT', { subject, adminEmail, orderId, spreadNumber });
            }

            await supabase.from('event_audit_log').insert({
                event_type: 'admin_qa_alert_dispatched',
                order_id: orderId,
                details: { spreadNumber, details }
            });
        } catch (err: any) {
            ServerLogger.error('ADMIN_QA_ALERT_ERROR', err, { orderId, spreadNumber });
        }
    }
}

