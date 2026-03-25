
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

try {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = envConfig.SUPABASE_ANON_KEY;

    const supabase = createClient(supabaseUrl, supabaseKey);

    async function tryFullInsert() {
        console.log('--- TRYING FULL INSERT WITH ANON KEY ---');
        const orderNumber = 'TEST-' + Math.random().toString(36).substr(2, 5).toUpperCase();
        const { data, error } = await supabase.from('orders').insert({
            order_number: orderNumber,
            status: 'draft',
            customer_id: null,
            customer_name: 'Test User',
            total: 0,
            story_data: { test: true },
            created_at: new Date().toISOString()
        }).select();

        if (error) {
            console.log('INSERT FAILED:', error.message);
            console.log('DETAILS:', error.details);
            console.log('HINT:', error.hint);
            console.log('CODE:', error.code);
        } else {
            console.log('INSERT SUCCESSFUL! Data:', data);
        }
    }
    tryFullInsert();
} catch (e) { console.error(e); }
