import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkAndScrub() {
    console.log("Fetching order RWY-J13I0G07L...");
    const { data: order, error: fetchErr } = await supabase.from('orders').select('story_data, status').eq('order_number', 'RWY-J13I0G07L').single();
    if (fetchErr || !order) {
        console.error("Order not found.", fetchErr);
        return;
    }

    console.log("Current status:", order.status);
    let storyData = order.story_data;
    if (storyData) {
        console.log("Has blueprint?", !!storyData.blueprint);
        console.log("Blueprint title:", storyData.blueprint?.foundation?.title);
        // Scrub
        delete storyData.blueprint;
        delete storyData.rawScript;
        delete storyData.script;
        delete storyData.visualPlan;
        delete storyData.prompts;
        delete storyData.coverImageUrl;
        if (storyData.pages) {
            storyData.pages = storyData.pages.map((p) => {
                const newP = Object.assign({}, p);
                delete newP.illustrationUrl;
                return newP;
            });
        }
    }

    console.log("Scrubbed generative artifacts. Resetting status to queued...");
    const { error: updateErr } = await supabase.from('orders')
        .update({ story_data: storyData, status: 'queued' })
        .eq('order_number', 'RWY-J13I0G07L');

    if (updateErr) {
        console.error("Failed to reset order.", updateErr);
        return;
    }

    console.log("Order reset successfully.");
}
checkAndScrub();
