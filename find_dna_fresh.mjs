import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function findSarahFresh() {
    console.log("Searching for Sarah's content today...");
    const today = new Date();
    today.setHours(today.getHours() - 48); // Last 48 hours

    const { data: orders } = await supabase
        .from('orders')
        .select('order_number, story_data')
        .gt('created_at', today.toISOString());

    if (!orders) return;

    for (const o of orders) {
        const sd = o.story_data;
        const dnaLen = sd.mainCharacter?.imageDNA?.[0]?.length || 0;
        const mainCharName = sd.mainCharacter?.name || sd.childName || "";

        console.log(`Order: ${o.order_number}, Child: ${mainCharName}, DNA Length: ${dnaLen}`);

        // If we find substantial DNA, this might be our source
        if (dnaLen > 100000) {
            console.log(`Bingo! Processed DNA found in ${o.order_number}`);
        }
    }
}

findSarahFresh();
