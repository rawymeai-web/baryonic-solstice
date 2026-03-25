import { supabase } from '@/utils/supabaseClient';
import { v4 as uuidv4 } from 'uuid';
import { MasterScheduler } from '../workers/scheduler';

export class StripeWebhookHandler {

    /**
     * Idempotency Check: Returns true if event was already processed.
     */
    static async isEventProcessed(eventId: string): Promise<boolean> {
        const { data } = await supabase.from('webhook_events').select('id').eq('provider_event_id', eventId).single();
        return !!data;
    }

    /**
     * Mark event as processed
     */
    static async markEventProcessed(eventId: string, type: string, payload: any) {
        await supabase.from('webhook_events').insert({
            provider_event_id: eventId,
            event_type: type,
            payload: payload
        });
    }

    /**
     * Handles checkout.session.completed
     * Triggers ONE-TIME order pipelines or INITIAL subscription setups.
     */
    static async handleCheckoutSessionCompleted(session: any) {
        const orderIntentId = session.metadata?.order_intent_id;
        const subscriptionIdStr = session.subscription as string | undefined;

        if (!orderIntentId) {
            console.warn("Checkout session missing order_intent_id in metadata", session.id);
            return;
        }

        console.log(`[StripeWebhook] Processing Checkout Session for Intent: ${orderIntentId}`);

        // 1. Fetch the order intent
        const { data: order, error: orderErr } = await supabase
            .from('orders')
            .select('*')
            .eq('order_number', orderIntentId)
            .single();

        if (orderErr || !order) {
            console.error("Order intent not found", orderIntentId);
            return;
        }

        // 2. Setup subscription tracking if applicable
        if (subscriptionIdStr) {
            // Update the subscription record created by the frontend to link the stripe ID
            if (order.subscription_id) {
                await supabase.from('subscriptions').update({
                    stripe_subscription_id: subscriptionIdStr,
                    status: 'active'
                }).eq('id', order.subscription_id);
            }
        }

        // 3. One-Time Orders ONLY: Transition state here. 
        // For subscriptions, we wait for invoice.payment_succeeded to actually queue to avoid duplicate hooks,
        // UNLESS invoice.payment_succeeded fires before checkout.session.completed (Stripe race conditions).
        // Let's standardise: Checkout session creates the confirmation for One-Time.
        if (!order.subscription_id) {
            await this.transitionOrderToQueued(order.order_number);
        }
    }

    /**
     * Handles invoice.payment_succeeded 
     * Triggers SUBSCRIPTION generation cycles.
     */
    static async handleInvoicePaymentSucceeded(invoice: any) {
        const stripeSubscriptionId = invoice.subscription;
        if (!stripeSubscriptionId) return; // Ignore non-subscription invoices

        console.log(`[StripeWebhook] Processing Invoice Payment Success for Sub: ${stripeSubscriptionId}`);

        // Find the matching internal subscription
        const { data: sub, error: subErr } = await supabase
            .from('subscriptions')
            .select('id, user_id, hero_id, plan')
            .eq('stripe_subscription_id', stripeSubscriptionId)
            .single();

        if (subErr || !sub) {
            console.error(`Unknown Stripe Subscription ID: ${stripeSubscriptionId}`);
            return;
        }

        // Reset to active if it was paused or failing
        await supabase.from('subscriptions').update({ status: 'active', next_billing_date: new Date(invoice.lines.data[0].period.end * 1000).toISOString() }).eq('id', sub.id);

        // Derive the cycle date strictly from the period start of the invoice
        const cycleDate = new Date(invoice.period_start * 1000).toISOString().split('T')[0];

        // Ensure we don't violate the active unique constraint: (subscription_id, billing_cycle_date)
        const { data: existingCycle } = await supabase
            .from('orders')
            .select('order_number, status')
            .eq('subscription_id', sub.id)
            .eq('billing_cycle_date', cycleDate)
            .maybeSingle();

        let targetOrderId = existingCycle?.order_number;

        if (!existingCycle) {
            // Generate the new cycle order
            // Get the snapshot payload from the most recent order or hero profile
            const newOrderNumber = `RWY-${Math.random().toString(36).substring(2, 10).toUpperCase()}`;

            // Dummy structure since we need to extract from last order.
            const { data: lastOrder } = await supabase.from('orders').select('story_data, shipping_snapshot, generation_snapshot').eq('subscription_id', sub.id).order('created_at', { ascending: false }).limit(1).single();

            const { data: newOrder, error: insertErr } = await supabase.from('orders').insert({
                user_id: sub.user_id,
                order_number: newOrderNumber,
                status: 'pending_payment', // Will update immediately below
                subscription_id: sub.id,
                billing_cycle_date: cycleDate,
                story_data: lastOrder?.story_data || {},
                shipping_snapshot: lastOrder?.shipping_snapshot,
                generation_snapshot: lastOrder?.generation_snapshot
            }).select('order_number').single();

            if (insertErr || !newOrder) {
                console.error("Cycle Order insertion failed", insertErr);
                return;
            }
            targetOrderId = newOrder.order_number;
        }

        // Transition to Paid and Queue
        if (targetOrderId) {
            await this.transitionOrderToQueued(targetOrderId);
        }
    }

    /**
     * Handles invoice.payment_failed
     * Begins the 3-day retry window or pauses the subscription.
     */
    static async handleInvoicePaymentFailed(invoice: any) {
        const stripeSubscriptionId = invoice.subscription;
        if (!stripeSubscriptionId) return;

        console.warn(`[StripeWebhook] Invoice Payment Failed for Sub: ${stripeSubscriptionId}`);

        const { data: sub } = await supabase.from('subscriptions').select('id').eq('stripe_subscription_id', stripeSubscriptionId).single();
        if (!sub) return;

        // Implementation of 3-Day Retry Window
        // Stripe handles the retries internally. We just mark it in retry state.
        // If Stripe exhausts retries, it sends subscription.cancelled or subscription.updated (status=paused)
        await supabase.from('subscriptions').update({ status: 'payment_retry' }).eq('id', sub.id);

        const cycleDate = new Date(invoice.period_start * 1000).toISOString().split('T')[0];
        const { data: order } = await supabase.from('orders').select('order_number').eq('subscription_id', sub.id).eq('billing_cycle_date', cycleDate).maybeSingle();

        if (order) {
            await supabase.from('orders').update({ status: 'failed', error_message: 'Payment Failed via Webhook' }).eq('order_number', order.order_number);
        }

        await supabase.from('event_audit_log').insert({
            event_type: 'payment_failed',
            subscription_id: sub.id,
            details: { invoice_id: invoice.id }
        });
    }

    /**
     * Executes the critical snapshot logic and queues the order for generation.
     */
    private static async transitionOrderToQueued(orderId: string) {
        // Here we take the snapshots
        const { data: order } = await supabase.from('orders').select('subscription_id, story_data').eq('order_number', orderId).single();
        if (!order) return;

        let shippingSnapshot = null;
        let generationSnapshot = null;

        if (order.subscription_id) {
            const { data: sub } = await supabase.from('subscriptions').select('hero_id, shipping_address_id').eq('id', order.subscription_id).single();
            if (sub) {
                // Pre-freeze snapshot data here
                generationSnapshot = {
                    hero_id: sub.hero_id,
                    timestamp: new Date().toISOString()
                };
            }
        } else {
            // 1-Time Order snapshot formulation
            const storyData = order.story_data as any;
            generationSnapshot = {
                age: storyData?.childAge,
                timestamp: new Date().toISOString()
            };
        }

        await supabase.from('orders').update({
            status: 'blueprint_generating',
            shipping_snapshot: shippingSnapshot, // In reality, fetch from Addresses table
            generation_snapshot: generationSnapshot
        }).eq('order_number', orderId);

        // Dispatch FIRST job: Blueprint
        await MasterScheduler.dispatchJob(orderId, 'blueprint');

        // Audit Trail
        await supabase.from('event_audit_log').insert({
            event_type: 'payment_succeeded',
            order_id: orderId,
            details: { snapshot_taken: true }
        });

        console.log(`[StripeWebhook] Order ${orderId} successfully queued for production.`);
    }
}
