import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.local') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function deepScrub() {
    console.log("--- J13 RECOVERY START ---");
    console.log("Fetching order RWY-J13I0G07L...");

    const { data: order, error: fetchErr } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', 'RWY-J13I0G07L')
        .single();

    if (fetchErr || !order) {
        console.error("ERROR fetching order:", fetchErr?.message || "Not found");
        return;
    }

    // Clean story_data by keeping only initial config
    const oldSd = order.story_data || {};
    const cleanStoryData = {
        childName: oldSd.childName,
        childGender: oldSd.childGender,
        childEthnicity: oldSd.childEthnicity,
        childHair: oldSd.childHair,
        dedication: oldSd.dedication,
        theme: oldSd.theme,
        language: oldSd.language || 'en',
        pages: []
    };

    console.log("Resetting order to 'queued' state...");
    const { error: updateErr } = await supabase
        .from('orders')
        .update({
            story_data: cleanStoryData,
            status: 'queued',
            generation_snapshot: {}
        })
        .eq('order_number', 'RWY-J13I0G07L');

    if (updateErr) {
        console.error("ERROR resetting order:", updateErr.message);
        return;
    }

    console.log("Deleting failed jobs for J13...");
    await supabase.from('order_jobs').delete().eq('order_id', 'RWY-J13I0G07L');

    console.log("Releasing master_scheduler lock...");
    await supabase.from('system_locks').delete().eq('lock_name', 'master_scheduler');

    console.log("SUCCESS: Order J13 has been fully reset.");
    console.log("--- J13 RECOVERY COMPLETE ---");
}

deepScrub().catch(console.error);
