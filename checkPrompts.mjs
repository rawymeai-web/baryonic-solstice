import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function checkLatestOrder() {
    const { data, error } = await supabase
        .from('orders')
        .select('order_number, story_data')
        .order('created_at', { ascending: false })
        .limit(1)
        .single();
        
    if (error) {
        console.error("Error fetching order:", error);
        return;
    }
    
    console.log("Latest Order:", data.order_number);
    const prompts = data.story_data?.prompts || [];
    console.log(`Found ${prompts.length} prompts.`);
    
    if (prompts.length >= 5) {
        console.log("--- PROMPT 1 ---");
        console.log("Action: ", prompts[1].imagePrompt.split('"pose_orientation": ')[1]?.split(',')[0]);
        console.log("--- PROMPT 2 ---");
        console.log("Action: ", prompts[2].imagePrompt.split('"pose_orientation": ')[1]?.split(',')[0]);
        console.log("--- PROMPT 3 ---");
        console.log("Action: ", prompts[3].imagePrompt.split('"pose_orientation": ')[1]?.split(',')[0]);
        console.log("--- PROMPT 4 ---");
        console.log("Action: ", prompts[4].imagePrompt.split('"pose_orientation": ')[1]?.split(',')[0]);
        
        console.log("\nAre 1 & 2 identical?", prompts[1].imagePrompt === prompts[2].imagePrompt);
        console.log("\nAre 3 & 4 identical?", prompts[3].imagePrompt === prompts[4].imagePrompt);
    }
}

checkLatestOrder();
