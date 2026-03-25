import * as dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    const orderId = 'RWY-J13I0G07L';
    console.log(`Fetching order ${orderId}...`);

    const { data: order, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderId)
        .single();

    if (error || !order) {
        console.error("Failed to fetch order", error);
        return;
    }

    let sd = order.story_data;

    // Wipe out the English script and pages!
    delete sd.script;
    delete sd.rawScript;
    delete sd.pages;
    delete sd.finalPrompts;
    delete sd.actualCoverPrompt;

    console.log("Updating order to character_ready with wiped script...");
    const { error: updateErr } = await supabase
        .from('orders')
        .update({
            story_data: sd,
            status: 'character_ready'
        })
        .eq('order_number', orderId);

    if (updateErr) {
        console.error("Failed to update order", updateErr);
        return;
    }

    console.log("Dispatching story job...");

    // First clear any pending or running story/illustration jobs for this order to prevent conflicts
    await supabase.from('order_jobs').update({ status: 'failed' }).eq('order_id', orderId).in('status', ['queued', 'running', 'processing']).in('job_type', ['story', 'illustration']);

    const { error: jobErr } = await supabase
        .from('order_jobs')
        .insert({
            order_id: orderId,
            job_type: 'story',
            status: 'queued',
            attempts: 0
        });

    if (jobErr) {
        console.error("Failed to insert job", jobErr);
    } else {
        console.log("Successfully fixed J13. The story worker should pick it up on the next cron tick.");
    }
}

run();
