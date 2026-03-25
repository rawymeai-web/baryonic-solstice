import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkOrder() {
    const { data: order, error } = await supabase.from('orders').select('status, story_data').eq('order_number', 'RWY-J13I0G07L').single();
    if (error) {
        console.error(error);
        return;
    }
    console.log("Status:", order.status);
    console.log("Has Blueprint:", !!order.story_data?.blueprint);
    if (order.story_data?.blueprint) {
        console.log("Blueprint Title:", order.story_data.blueprint.foundation.title);
        console.log("Blueprint Story Core:", order.story_data.blueprint.foundation.storyCore);
    }
}
checkOrder();
