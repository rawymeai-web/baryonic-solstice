import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('subscriptions')
      .select('*, customers(*)')
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[API GET /api/admin/subscriptions] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ subscriptions: data });
  } catch (err: any) {
    console.error('[API GET /api/admin/subscriptions] Catch error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
