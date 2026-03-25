import { createClient } from '@supabase/supabase-js';
import * as fs from 'fs';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function checkOrder() {
    const { data } = await supabase.from('orders').select('story_data').eq('order_number', 'RWY-IXAVOMBGE').single();
    if (data) {
        fs.writeFileSync('debug_ix.json', JSON.stringify(data.story_data, null, 2));
        console.log("Saved to debug_ix.json");
    }
}
checkOrder();
