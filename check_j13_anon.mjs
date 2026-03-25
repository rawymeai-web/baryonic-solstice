import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL || '',
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY || ''
);

async function checkOrder() {
    const orderId = 'RWY-J13I0G07L';
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderId)
        .single();

    console.log("Error:", error);
    if (data) {
        console.log("Data exists. ID:", data.order_number);
        console.log("Keys in story_data:", Object.keys(data.story_data || {}));
    } else {
        console.log("No data returned");
    }
}

checkOrder();
