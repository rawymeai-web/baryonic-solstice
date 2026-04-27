import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://wqklukruzxicjaeblser.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indxa2x1a3J1enhpY2phZWJsc2VyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTY4MDA1MSwiZXhwIjoyMDg1MjU2MDUxfQ.Pr2OrAxKV_mwsUO6BMs3RWYvrUtjm8VxSgE5xdd2-Yc";
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
