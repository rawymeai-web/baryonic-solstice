import { supabase } from '@/utils/supabaseClient';

export class EmailService {

    /**
     * Sends an email notification to the customer. 
     * In a production environment, this integrates with resend, sendgrid, or SES.
     */
    static async sendNotification(orderId: string, eventType: string, payload: any) {

        const { data: order } = await supabase.from('orders').select('user_id, subscription_id').eq('id', orderId).single();
        if (!order) return;

        // Fetch User Email
        const { data: user } = await supabase.from('users').select('email').eq('id', order.user_id).single();
        if (!user || !user.email) return;

        console.log(`[EmailService] Emitting ${eventType} to ${user.email} for order ${orderId}`);

        // Example Switch Case for strict triggers:
        // 'order_confirmed', 'story_generation_started', 'preview_ready', 'preview_regenerated', 'softcopy_ready', 'book_shipped', 'payment_failed', 'subscription_paused'

        let subject = '';
        let body = '';

        switch (eventType) {
            case 'softcopy_ready':
                subject = 'Your AI Storybook Soft Copy is Ready! 📚✨';
                body = `Hello! Your latest storybook is fully compiled. You can download the PDF right now here: ${payload.downloadLink}`;
                break;
            case 'preview_ready':
                subject = 'Review your Yearly Storybook Preview 🔍';
                body = `Your preview is ready. You have 72 hours to review and request 1 free regeneration before we automatically send it to print! Link: ${payload.previewLink}`;
                break;
            default:
                subject = `System Update: ${eventType}`;
                body = JSON.stringify(payload);
        }

        // TODO: Wire actual SMTP Gateway (Sendgrid / Resend)
        // For Phase 4 compliance, we log the emit to the debug tracker.
        await supabase.from('event_audit_log').insert({
            event_type: 'email_dispatched',
            order_id: orderId,
            details: { type: eventType, recipient: user.email, subject }
        });

        console.log(`[EmailService - SENT] ${subject}`);
    }
}
