import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function scrubAndRerun() {
    console.log("Fetching order RWY-IXAVOMBGE...");
    const { data: order, error: fetchErr } = await supabase.from('orders').select('story_data').eq('order_number', 'RWY-IXAVOMBGE').single();
    if (fetchErr || !order) {
        console.error("Order not found.", fetchErr);
        return;
    }

    let storyData = order.story_data;
    if (storyData) {
        delete storyData.blueprint;
        delete storyData.rawScript;
        delete storyData.script;
        delete storyData.visualPlan;
        delete storyData.prompts;
    }

    console.log("Scrubbed generative artifacts. Resetting status to queued...");
    const { error: updateErr } = await supabase.from('orders')
        .update({ story_data: storyData, status: 'queued' })
        .eq('order_number', 'RWY-IXAVOMBGE');

    if (updateErr) {
        console.error("Failed to reset order.", updateErr);
        return;
    }

    console.log("Order reset successfully. Triggering generation...");
    // Just trigger the local API cron to simulate the worker starting
    try {
        await fetch('http://127.0.0.1:3000/api/cron', { method: 'POST' });
        console.log("Cron triggered! Story Worker should be running now.");
    } catch (e) {
        console.error("Failed to hit cron endpoint. Is pulsing-planetary running on 3000?", e);
    }
}
scrubAndRerun();
