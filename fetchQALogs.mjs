import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://wqklukruzxicjaeblser.supabase.co";
const supabaseKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indxa2x1a3J1enhpY2phZWJsc2VyIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2OTY4MDA1MSwiZXhwIjoyMDg1MjU2MDUxfQ.Pr2OrAxKV_mwsUO6BMs3RWYvrUtjm8VxSgE5xdd2-Yc";
const supabase = createClient(supabaseUrl, supabaseKey);

async function run() {
    console.log("Fetching QA logs...");
    const { data: logs, error } = await supabase
        .from('generation_quality_logs')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(20);

    if (error) {
        console.error("Error fetching logs:", error);
        return;
    }

    if (!logs || logs.length === 0) {
        console.log("No QA logs found.");
        return;
    }

    // Group logs by order_id and spread_index
    const grouped = {};
    for (const log of logs) {
        const key = `${log.order_id} - Spread ${log.spread_index}`;
        if (!grouped[key]) grouped[key] = [];
        grouped[key].push(log);
    }

    for (const [key, groupLogs] of Object.entries(grouped)) {
        console.log(`\n=== ${key} ===`);
        for (const log of groupLogs.sort((a, b) => a.iteration - b.iteration)) {
            console.log(`Iteration ${log.iteration}: ${log.overall_status}`);
            console.log(`  Character: ${log.agent_reasoning?.characterConsistencyStatus}`);
            console.log(`  Style: ${log.agent_reasoning?.styleConsistencyStatus}`);
            console.log(`  Text Clearance: ${log.agent_reasoning?.textClearanceStatus}`);
            console.log(`  Text Side: ${log.agent_reasoning?.recommendedTextSide}`);
            console.log(`  Notes: ${log.agent_reasoning?.notes}`);
            console.log(`  URL: ${log.image_url}`);
        }
    }
}

run();
