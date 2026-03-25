
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load env
const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = envConfig.SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function compareOrders() {
    const badId = 'RWY-K0VH6QK3U';
    const goodId = 'RWY-XQU7NHPWS';

    const { data: badData, error: badErr } = await supabase.from('orders').select('*').eq('order_number', badId).single();
    const { data: goodData, error: goodErr } = await supabase.from('orders').select('*').eq('order_number', goodId).single();

    if (badErr || goodErr) {
        console.error('Error fetching:', { badErr, goodErr });
        return;
    }

    console.log('--- BAD ORDER (K0VH6QK3U) ---');
    console.log('Theme:', badData.story_data.theme);
    console.log('Style Prompt:', badData.story_data.selectedStylePrompt);
    console.log('Hero Name:', badData.story_data.mainCharacter?.name);
    console.log('Hero Desc:', badData.story_data.mainCharacter?.description);
    console.log('Blueprint Title:', badData.story_data.blueprint?.foundation?.title);

    console.log('\n--- GOOD ORDER (XQU7NHPWS) ---');
    console.log('Theme:', goodData.story_data.theme);
    console.log('Style Prompt:', goodData.story_data.selectedStylePrompt);
    console.log('Hero Name:', goodData.story_data.mainCharacter?.name);
    console.log('Hero Desc:', goodData.story_data.mainCharacter?.description);
    console.log('Blueprint Title:', goodData.story_data.blueprint?.foundation?.title);

    fs.writeFileSync('bad_order.json', JSON.stringify(badData.story_data, null, 2));
    fs.writeFileSync('good_order.json', JSON.stringify(goodData.story_data, null, 2));
}

compareOrders();
