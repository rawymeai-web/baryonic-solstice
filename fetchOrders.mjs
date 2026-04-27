import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://wqklukruzxicjaeblser.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "YOUR_SUPABASE_KEY_HERE";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Fetching latest orders...");
    const { data: orders, error } = await supabase
        .from('orders')
        .select('order_number, status, created_at')
        .order('created_at', { ascending: false })
        .limit(5);

    if (error) {
        console.error("Error fetching orders:", error);
        return;
    }

    console.log(orders);
}

run();
