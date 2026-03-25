import { NextResponse } from 'next/server';
import Stripe from 'stripe';
import { StripeWebhookHandler } from '@/services/billing/stripeWebhookHandler';

const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2023-10-16' as any,
});

const endpointSecret = process.env.STRIPE_WEBHOOK_SECRET || '';

export async function POST(req: Request) {
    try {
        const bodyText = await req.text();
        const signature = req.headers.get('stripe-signature') as string;

        if (!signature || !endpointSecret) {
            console.error('[Stripe Webhook] Missing signature or secret');
            return NextResponse.json({ error: 'Missing cryptography signature' }, { status: 400 });
        }

        const stripe = getStripe();
        let event: Stripe.Event;

        try {
            event = stripe.webhooks.constructEvent(bodyText, signature, endpointSecret);
        } catch (err: any) {
            console.error(`[Stripe Webhook] Signature verification failed: ${err.message}`);
            return NextResponse.json({ error: 'Webhook Error: Invalid Signature' }, { status: 400 });
        }

        // Idempotency: Duplicate events are ignored across the system
        const isProcessed = await StripeWebhookHandler.isEventProcessed(event.id);
        if (isProcessed) {
            console.log(`[Stripe Webhook] Received duplicate event ${event.id}, ignoring.`);
            return NextResponse.json({ received: true });
        }

        try {
            switch (event.type) {
                case 'checkout.session.completed':
                    const session = event.data.object as Stripe.Checkout.Session;
                    await StripeWebhookHandler.handleCheckoutSessionCompleted(session);
                    break;

                case 'invoice.payment_succeeded':
                    const invoiceSuccess = event.data.object as Stripe.Invoice;
                    await StripeWebhookHandler.handleInvoicePaymentSucceeded(invoiceSuccess);
                    break;

                case 'invoice.payment_failed':
                    const invoiceFailure = event.data.object as Stripe.Invoice;
                    await StripeWebhookHandler.handleInvoicePaymentFailed(invoiceFailure);
                    break;

                default:
                    console.log(`[Stripe Webhook] Unhandled event type ${event.type}`);
            }

            // Mark completed so it doesn't double-fire
            await StripeWebhookHandler.markEventProcessed(event.id, event.type, event.data.object);

            return NextResponse.json({ received: true, status: 'success' });
        } catch (err: any) {
            // Processing failure. We return 500 so Stripe retries the webhook delivery later.
            console.error(`[Stripe Webhook] Handler error for event ${event.id}:`, err);
            return NextResponse.json({ error: 'Webhook processing failed internally' }, { status: 500 });
        }

    } catch (error: any) {
        console.error('[Stripe Webhook] Fatal Router Error:', error);
        return NextResponse.json({ error: "Fatal Error" }, { status: 500 });
    }
}
