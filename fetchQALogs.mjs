import { createClient } from '@supabase/supabase-js';

const supabaseUrl = "https://wqklukruzxicjaeblser.supabase.co";
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || process.env.VITE_SUPABASE_ANON_KEY || "YOUR_SUPABASE_KEY_HERE";
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
