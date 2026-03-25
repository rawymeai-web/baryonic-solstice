import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkOrder() {
    const { data, error } = await supabase.from('orders').select('*').eq('order_number', 'RWY-IXAVOMBGE');
    console.log("Error:", error);
    if (data && data.length > 0) {
        console.log("Status:", data[0].status);
        console.log("Subscription:", data[0].subscription_id);
    } else {
        console.log("No data found.");
    }
}
checkOrder();
