const { createClient } = require('@supabase/supabase-js');
const dotenv = require('dotenv');
dotenv.config();

const supabase = createClient(
    process.env.VITE_SUPABASE_URL || process.env.SUPABASE_URL,
    process.env.VITE_SUPABASE_ANON_KEY || process.env.SUPABASE_ANON_KEY
);

async function checkOrder() {
    const orderId = 'RWY-J13I0G07L';
    const { data, error } = await supabase
        .from('orders')
        .select('story_data')
        .eq('order_number', orderId)
        .single();

    console.log("Error:", error);
    if (data) {
        console.log("Pages array:", JSON.stringify(data.story_data.pages, null, 2));
        console.log("finalPrompts array:", JSON.stringify(data.story_data.finalPrompts, null, 2));
    } else {
        console.log("No data returned");
    }
}

checkOrder();
