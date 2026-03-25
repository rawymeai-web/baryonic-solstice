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

async function check() {
    console.log("Checking status for J13...");
    const { data: order } = await supabase.from('orders').select('status, story_data').eq('order_number', 'RWY-J13I0G07L').single();
    console.log("Order Status:", order?.status);

    console.log("Checking order_jobs...");
    const { data: jobs } = await supabase.from('order_jobs').select('*').eq('order_id', 'RWY-J13I0G07L');
    console.table(jobs?.map(j => ({ type: j.job_type, status: j.status, error: j.error_message })));
}
check();
