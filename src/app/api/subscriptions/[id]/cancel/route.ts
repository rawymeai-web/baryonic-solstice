import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';
import Stripe from 'stripe';

// Initialize Stripe lazily inside the handler to prevent build-time crashes when env vars are missing
const getStripe = () => new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder', {
    apiVersion: '2023-10-16' as any,
});

export async function POST(req: Request, context: any) {
    try {
        const subscriptionId = context.params.id;

        // Verify Ownership (In real app, extract user_id from auth token)
        // Assume trusted internal call for now or explicitly pass user_id in headers
        const { data: sub, error: subErr } = await supabase
            .from('subscriptions')
            .select('id, stripe_subscription_id, user_id, status')
            .eq('id', subscriptionId)
            .single();

        if (subErr || !sub) {
            return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
        }

        if (sub.status === 'cancelled') {
            return NextResponse.json({ error: "Subscription already cancelled" }, { status: 400 });
        }

        // Call Stripe SDK to cancel at period end
        if (sub.stripe_subscription_id) {
            try {
                const stripe = getStripe();
                await stripe.subscriptions.update(sub.stripe_subscription_id, {
                    cancel_at_period_end: true
                });
            } catch (stripeErr: any) {
                console.error("Stripe Cancellation Error:", stripeErr);
                return NextResponse.json({ error: "Failed to sync cancellation with payment provider." }, { status: 500 });
            }
        }

        // Update Database Status
        const { error: updateErr } = await supabase
            .from('subscriptions')
            .update({ status: 'cancelled' })
            .eq('id', subscriptionId);

        if (updateErr) throw new Error(updateErr.message);

        // Audit Trail
        await supabase.from('event_audit_log').insert({
            event_type: 'subscription_cancelled',
            subscription_id: subscriptionId,
            details: { cancelled_at: new Date().toISOString(), reason: 'Customer requested' }
        });

        return NextResponse.json({ message: "Subscription successfully marked for cancellation at period end." });

    } catch (error: any) {
        console.error("Cancel API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
