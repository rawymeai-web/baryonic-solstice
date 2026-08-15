import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';
import Stripe from 'stripe';

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY || 'sk_test_placeholder');

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const { orderId } = await req.json();
    if (!orderId) {
      return NextResponse.json({ error: 'Missing orderId' }, { status: 400 });
    }

    // 1. Fetch order details from Supabase
    const { data: order, error: orderError } = await supabase
      .from('orders')
      .select('order_number, total, status, customer_id')
      .eq('order_number', orderId)
      .single();

    if (orderError || !order) {
      return NextResponse.json({ error: 'Order not found' }, { status: 404 });
    }

    if (order.status === 'paid' || order.status === 'paid_confirmed' || order.status === 'queued') {
      return NextResponse.json({ error: 'Order already paid' }, { status: 400 });
    }

    // 2. Fetch customer details
    const { data: customer } = await supabase
      .from('customers')
      .select('email, name')
      .eq('id', order.customer_id)
      .single();

    const customerEmail = customer?.email || undefined;

    // 3. Resolve base app URL
    const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:5173'; // Vite dev server runs on 5173 by default

    // 4. Resolve Stripe unit amount based on currency (Kuwaiti Dinar KWD is 3 decimals)
    const currency = 'KWD';
    const amount = Math.round(order.total * 1000); // 1 KWD = 1000 fils

    console.log(`[Stripe Checkout] Creating session for order: ${order.order_number}, total: ${order.total} KWD (${amount} fils)...`);

    // 5. Create Stripe Checkout Session
    const session = await stripe.checkout.sessions.create({
      payment_method_types: ['card'],
      customer_email: customerEmail,
      line_items: [
        {
          price_data: {
            currency: currency.toLowerCase(),
            product_data: {
              name: `Personalized Children's Storybook (Order #${order.order_number})`,
              description: 'Custom AI storytelling experience & illustration print packaging.',
            },
            unit_amount: amount,
          },
          quantity: 1,
        },
      ],
      mode: 'payment',
      metadata: {
        order_intent_id: order.order_number,
      },
      success_url: `${appUrl}/?checkout_status=success&order_id=${order.order_number}`,
      cancel_url: `${appUrl}/?checkout_status=cancel&order_id=${order.order_number}`,
    });

    console.log(`[Stripe Checkout] Session created successfully: ${session.id}`);

    return NextResponse.json({ success: true, url: session.url });
  } catch (err: any) {
    console.error('[Stripe Checkout Session Creation Error]:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
