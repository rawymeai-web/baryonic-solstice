import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function forceRun() {
    console.log("Removing locks...");
    await supabase.from('system_locks').delete().eq('lock_name', 'master_scheduler');
    console.log("Locks removed. Triggering cron...");
    const res = await fetch('http://127.0.0.1:3000/api/cron', { method: 'GET' });
    console.log("Cron triggered:", res.status);
}
forceRun();
