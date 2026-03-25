import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import fs from 'fs';

dotenv.config({ path: './.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function restoreHero() {
    const orderId = 'RWY-J13I0G07L';
    const heroData = JSON.parse(fs.readFileSync('j13_hero_restore.json', 'utf8'));

    console.log(`[RESTORE] Fetching story_data for ${orderId}...`);
    const { data: order, error: fetchError } = await supabase
        .from('orders')
        .select('story_data')
        .eq('order_number', orderId)
        .single();

    if (fetchError || !order) {
        console.error("Fetch Error:", fetchError);
        return;
    }

    const updatedStoryData = {
        ...order.story_data,
        ...heroData
    };

    console.log(`[RESTORE] Updating story_data and resetting status...`);
    const { error: updateError } = await supabase
        .from('orders')
        .update({
            story_data: updatedStoryData,
            status: 'queued' // This will trigger the scheduler
        })
        .eq('order_number', orderId);

    if (updateError) {
        console.error("Update Error:", updateError);
        return;
    }

    console.log(`[RESTORE] Clearing stale jobs for ${orderId}...`);
    await supabase.from('order_jobs').delete().eq('order_id', orderId);

    console.log(`[RESTORE] SUCCESS. Order ${orderId} is now queued with restored hero data.`);
}

restoreHero();
