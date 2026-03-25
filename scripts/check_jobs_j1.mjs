import { createClient } from '@supabase/supabase-js';
import fs from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkJobs() {
    const { data } = await supabase.from('order_jobs').select('*').eq('order_id', 'RWY-J13I0G07L');
    fs.writeFileSync('job_j1.json', JSON.stringify(data, null, 2));
    console.log("Wrote to job_j1.json");
}
checkJobs();
