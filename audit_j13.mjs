import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function debugJ13() {
    console.log("--- ORDER DATA ---");
    const { data: orders } = await supabase
        .from('orders')
        .select('order_number, status, story_data')
        .in('order_number', ['RWY-J13I0G07L', 'RWY-V8FO0H4JD']);

    orders.forEach(o => {
        const sd = o.story_data;
        console.log(`\nOrder: ${o.order_number}`);
        console.log(`Status: ${o.status}`);
        console.log(`Language: ${sd.language}`);
        console.log(`Theme: ${sd.theme}`);
        console.log(`Title: ${sd.title}`);
        console.log(`Main Character Name: ${sd.mainCharacter?.name}`);
        console.log(`Main Character Image (Original) Length: ${sd.mainCharacter?.imageBases64?.[0]?.length || 0}`);
        console.log(`Visual DNA Length: ${sd.mainCharacter?.imageDNA?.[0]?.length || 0}`);
        console.log(`Style Reference Image Length: ${sd.styleReferenceImageBase64?.length || 0}`);
        console.log(`Prompts Generated: ${sd.prompts?.length || 0}`);
        console.log(`Pages Generated: ${sd.pages?.length || 0}`);
        console.log(`Blueprint Exists: ${!!sd.blueprint}`);
    });

    console.log("\n--- JOB DATA ---");
    const { data: jobs } = await supabase
        .from('order_jobs')
        .select('*')
        .eq('order_id', 'RWY-J13I0G07L')
        .order('created_at', { ascending: false });

    jobs?.forEach(j => {
        console.log(`Job Type: ${j.job_type}, Status: ${j.status}, Attempts: ${j.attempts}, Created At: ${j.created_at}`);
    });

    console.log("\n--- AUDIT DATA (Recent) ---");
    const { data: audit } = await supabase
        .from('event_audit_log')
        .select('*')
        .eq('order_id', 'RWY-J13I0G07L')
        .order('created_at', { ascending: false })
        .limit(5);

    audit?.forEach(a => {
        console.log(`Event: ${a.event_type}, Details: ${JSON.stringify(a.details)}, Created At: ${a.created_at}`);
    });
}

debugJ13();
