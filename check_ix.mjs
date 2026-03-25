import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkIX() {
    console.log("Checking IX for DNA...");
    const { data } = await supabase
        .from('orders')
        .select('story_data')
        .eq('order_number', 'RWY-IXAVOMBGE')
        .single();

    if (data) {
        const sd = data.story_data;
        console.log(`Order: IXAVOMBGE`);
        console.log(`Child: ${sd.childName}`);
        console.log(`DNA Length: ${sd.mainCharacter?.imageDNA?.[0]?.length || 0}`);
    } else {
        console.log("Order IX not found.");
    }
}

checkIX();
