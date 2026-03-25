import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
    console.error("Missing Supabase credentials");
    process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

async function inspectOrder(orderNumber) {
    console.log(`Inspecting order: ${orderNumber}`);
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber)
        .single();

    if (error) {
        console.error("Error fetching order:", error);
        return;
    }

    console.log("Order Status:", data.status);
    console.log("Story Data Keys:", Object.keys(data.story_data));
    
    if (data.story_data.blueprint) {
        console.log("✓ Blueprint: FOUND");
    } else {
        console.log("✗ Blueprint: MISSING");
    }

    if (data.story_data.script) {
        console.log(`✓ Script: FOUND (${data.story_data.script.length} items)`);
        data.story_data.script.forEach((item, idx) => {
            console.log(`  [${idx}] Text: ${item.text ? item.text.substring(0, 30) + "..." : "EMPTY"}`);
        });
    } else {
        console.log("✗ Script: MISSING");
    }

    const fps = data.story_data.finalPrompts || data.story_data.final_prompts;
    if (fps) {
        console.log(`✓ Final Prompts: FOUND (${fps.length} items)`);
        fps.forEach((p, idx) => {
            console.log(`  [${idx}] Prompt (${typeof p}): ${typeof p === 'string' ? (p.length > 0 ? p.substring(0, 30) + '...' : 'EMPTY STRING') : JSON.stringify(p)}`);
        });
    } else {
        console.log("✗ Final Prompts: MISSING");
    }

    if (data.story_data.pages) {
        console.log(`✓ Pages: FOUND (${data.story_data.pages.length} items)`);
        const first = data.story_data.pages[0];
        console.log("  First page text length:", first?.text?.length || 0);
        console.log("  First page has image:", !!first?.illustrationUrl && first.illustrationUrl.length > 100);
    } else {
        console.log("✗ Pages: MISSING");
    }

    console.log("--- Character Data ---");
    console.log("useSecondCharacter:", data.story_data.useSecondCharacter);
    console.log("Main Character Name:", data.story_data.mainCharacter?.name);
    console.log("Second Character Name:", data.story_data.secondCharacter?.name);
    console.log("Second Character Image Base64 Present:", !!data.story_data.secondCharacterImageBase64);
    console.log("Second Character Image URL Present:", !!data.story_data.secondCharacterImageUrl);
}

inspectOrder('RWY-C3W1ASEWF');
