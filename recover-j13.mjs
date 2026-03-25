import fs from 'fs';
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.VITE_SUPABASE_URL || 'https://klnszzngiuzsclcvkgrf.supabase.co'; // Taken from pulsing-planetary env earlier? No I shouldn't guess. Let me just use the url from the existing recover-rest.mjs if I can see it. Wait, I will just import dotenv from the node_modules of baryonic-solstice using full path if needed, or I'll run it in baryonic-solstice where dotenv is installed.

import dotenv from 'dotenv';
dotenv.config({ path: '../baryonic-solstice/.env' }); // try from baryonic-solstice

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_ANON_KEY);

async function extractOrder(orderNumber) {
    const { data, error } = await supabase
        .from('orders')
        .select('*')
        .eq('order_number', orderNumber)
        .single();
    if (error) {
        console.error('Error fetching order:', error.message);
        return;
    }
    fs.writeFileSync('recovered_j13_order.json', JSON.stringify(data.story_data, null, 2));
    console.log(`Successfully saved ${orderNumber} to recovered_j13_order.json`);
}

extractOrder('RWY-J13I0G07L');
