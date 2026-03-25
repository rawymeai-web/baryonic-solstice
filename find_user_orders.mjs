import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findUserOrders() {
    console.log("Searching for s_emera@yahoo.com orders...");
    const { data: userOrders } = await supabase
        .from('orders')
        .select('order_number, story_data')
        .eq('user_id', '5e1f0e21-0e21-4b21-8e21-0e210e210e21'); // I need the actual user ID from the email. 
    // Wait, I'll search by metadata or just list recent orders.

    // Better: List ALL recent orders and check the child name in the payload.
    const { data: allRecent } = await supabase
        .from('orders')
        .select('order_number, story_data')
        .order('created_at', { ascending: false })
        .limit(20);

    for (const o of allRecent) {
        const sd = o.story_data;
        console.log(`Order: ${o.order_number}, Child: ${sd.childName}, DNA: ${sd.mainCharacter?.imageDNA?.length || 0}`);
    }
}

findUserOrders();
