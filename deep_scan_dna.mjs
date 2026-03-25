import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function scanForDNA() {
    console.log("Deep scan for Image DNA...");
    const { data: orders } = await supabase
        .from('orders')
        .select('order_number, story_data')
        .order('created_at', { ascending: false })
        .limit(100);

    for (const o of orders) {
        const sd = o.story_data;
        const dna = sd.mainCharacter?.imageDNA?.[0];
        if (dna && dna.length > 5000) {
            console.log(`[FOUND] Order: ${o.order_number}, Child: ${sd.childName}, DNA Length: ${dna.length}`);
        }
    }
}

scanForDNA();
