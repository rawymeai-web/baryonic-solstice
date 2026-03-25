import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../.env.local') });

async function trigger() {
    console.log("Releasing master_scheduler lock...");
    const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
    const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    await supabase.from('system_locks').delete().eq('lock_name', 'master_scheduler');

    console.log("Triggering /api/cron...");
    try {
        const res = await fetch('http://127.0.0.1:3000/api/cron');
        console.log("Response Status:", res.status);
        const text = await res.text();
        console.log("Response Body:", text);
    } catch (e) {
        console.error("Fetch failed:", e.message);
    }
}
trigger();
