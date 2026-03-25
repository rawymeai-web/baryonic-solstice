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

async function repairJ13() {
    console.log("--- J13 STRUCTURE REPAIR ---");

    // 1. Fetch Order
    const { data: order, error: fetchErr } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', 'RWY-J13I0G07L')
        .single();

    if (fetchErr || !order) {
        console.error("ERROR fetching order:", fetchErr?.message);
        return;
    }

    const sd = order.story_data || {};

    // 2. Prepare Structured Prompts
    // In current data, prompts is string[], script is object[] { text, spreadNumber }
    const oldPrompts = sd.prompts || [];
    const script = sd.script || [];

    const structuredPrompts = oldPrompts.map((p, idx) => {
        // If it's already an object, leave it
        if (typeof p === 'object') return p;

        // Match with script text
        const spreadNum = idx; // Assuming 0 is cover, 1 is spread 1...
        const scriptMatch = script.find(s => s.spreadNumber === (idx === 0 ? 0 : idx));

        return {
            spreadNumber: idx,
            imagePrompt: p,
            storyText: scriptMatch ? scriptMatch.text : ""
        };
    });

    // 3. Fix Missing Fields for Editor
    const updatedSd = {
        ...sd,
        prompts: structuredPrompts,
        selectedStylePrompt: sd.selectedStylePrompt || "high quality storybook illustration",
        language: sd.language || "en",
        theme: sd.theme || "Talking with Animals", // Fallback if missing
        // Re-calculate visual DNA for editor if missing
        selectedStyleNames: sd.selectedStyleNames || ["Classic Illustration"],
    };

    console.log("Updating J13 with structured prompts and missing editor fields...");
    const { error: updateErr } = await supabase
        .from('orders')
        .update({
            story_data: updatedSd,
            status: 'queued' // Re-trigger from queue to let scheduler handle it
        })
        .eq('order_number', 'RWY-J13I0G07L');

    if (updateErr) {
        console.error("ERROR updating order:", updateErr.message);
        return;
    }

    console.log("Deleting failed jobs for J13 to allow fresh Illustration job...");
    await supabase.from('order_jobs').delete().eq('order_id', 'RWY-J13I0G07L').eq('job_type', 'illustration');

    console.log("SUCCESS: J13 is repaired and queued for illustration.");
}

repairJ13().catch(console.error);
