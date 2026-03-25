import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY);

async function run() {
    const { data, error } = await supabase.from('orders').select('story_data').eq('order_number', 'RWY-KO9E8WO2D').single();
    if (error) { console.error(error); return; }

    const sd = data.story_data;
    console.log("Pages generated:", sd.pages?.length);
    if (sd.workflowLogs && sd.workflowLogs.length > 0) {
        console.log("Logs:", JSON.stringify(sd.workflowLogs[sd.workflowLogs.length - 1], null, 2));
    } else {
        console.log("No workflow logs found.");
    }
}
run();
