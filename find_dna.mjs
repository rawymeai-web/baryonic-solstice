import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findSarahDNA() {
    console.log("Searching for Sarah's orders...");
    const { data: userOrders } = await supabase
        .from('orders')
        .select('order_number, story_data')
        .contains('story_data', { childName: '╪│╪º╪▒╪⌐' }); // Mojibake Sarah

    if (!userOrders) {
        console.log("No orders found for Sarah.");
        return;
    }

    for (const o of userOrders) {
        const sd = o.story_data;
        const dnaLength = sd.mainCharacter?.imageDNA?.[0]?.length || 0;
        console.log(`Order: ${o.order_number}, DNA Length: ${dnaLength}`);
        if (dnaLength > 0) {
            console.log(`Found DNA in ${o.order_number}!`);
        }
    }
}

findSarahDNA();
