import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('last_order_date', { ascending: false });

    if (error) {
      console.error('[API GET /api/admin/customers] Supabase error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ customers: data });
  } catch (err: any) {
    console.error('[API GET /api/admin/customers] Catch error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
