import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkOrder() {
    const { data } = await supabase.from('orders').select('order_number, status, subscription_id, error_message').eq('order_number', 'RWY-IXAVOMBGE').maybeSingle();
    console.log(JSON.stringify(data, null, 2));
}
checkOrder();
