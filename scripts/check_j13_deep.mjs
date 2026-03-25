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

async function deepCheck() {
    console.log("--- J13 DEEP CHECK ---");
    const { data: order, error } = await supabase
        .from('orders')
        .select('order_number, status, story_data, generation_snapshot')
        .eq('order_number', 'RWY-J13I0G07L')
        .single();

    if (error) {
        console.error("Error fetching order:", error);
        return;
    }

    console.log("Order Status:", order.status);

    const sd = order.story_data || {};
    console.log("Story Data Leaked orderId:", sd.orderId);
    console.log("Story Data Has Blueprint:", !!sd.blueprint);

    if (sd.blueprint) {
        console.log("Blueprint Metadata:", sd.blueprint.metadata || 'No metadata');
        // Check if theme matches what the user expected
        console.log("Theme in story_data:", sd.theme);
        console.log("Theme in blueprint:", sd.blueprint.theme);
    }

    const { data: jobs } = await supabase
        .from('order_jobs')
        .select('*')
        .eq('order_id', 'RWY-J13I0G07L');

    console.log("Jobs for J13:", jobs?.length || 0);
    if (jobs && jobs.length > 0) {
        console.table(jobs.map(j => ({ type: j.job_type, status: j.status, updated: j.updated_at, error: j.error_message })));
    }

    const { data: logs } = await supabase
        .from('event_audit_log')
        .select('*')
        .eq('order_id', 'RWY-J13I0G07L')
        .order('created_at', { ascending: false })
        .limit(10);

    console.log("Recent Audit Logs:", logs?.length || 0);
    console.table(logs?.map(l => ({ event: l.event_type, msg: l.message, time: l.created_at })));
}

deepCheck();
