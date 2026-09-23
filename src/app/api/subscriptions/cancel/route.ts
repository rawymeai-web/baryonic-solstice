import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';
import { ServerLogger } from '@/utils/serverLogger';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { customerId, email, reason } = body;

    if (!customerId && !email) {
      return NextResponse.json({ error: 'Missing customer identifier' }, { status: 400 });
    }

    const targets = [customerId, email].filter(Boolean) as string[];

    // Update subscription in database to cancelled
    const { data, error } = await supabase
      .from('subscriptions')
      .update({
        status: 'cancelled',
        cancellation_reason: reason || 'User self-service cancellation via dashboard',
        cancelled_at: new Date().toISOString(),
      })
      .in('customer_id', targets)
      .select();

    if (error) {
      ServerLogger.error('SUBSCRIPTION_CANCEL_ERROR', error);
      return NextResponse.json({ error: 'Failed to cancel subscription', details: error.message }, { status: 500 });
    }

    ServerLogger.log('SUBSCRIPTION_CANCELLED_SUCCESS', {
      targets,
      reason,
      timestamp: new Date().toISOString()
    });

    return NextResponse.json({
      success: true,
      message: 'Subscription successfully cancelled. Access remains active through current billing period.'
    });

  } catch (err: any) {
    ServerLogger.error('SUBSCRIPTION_CANCEL_FATAL', err);
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 });
  }
}
