
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

try {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = envConfig.SUPABASE_ANON_KEY;

    const supabase = createClient(supabaseUrl, supabaseKey);

    async function tryExhaustiveInsert() {
        console.log('--- TRYING EXHAUSTIVE INSERT ---');
        const orderNumber = 'EXH-' + Math.random().toString(36).substr(2, 5).toUpperCase();

        // Provide EVERY known column
        const { data, error } = await supabase.from('orders').insert({
            order_number: orderNumber,
            customer_id: null,
            customer_name: 'Exhaustive Test',
            total: 0,
            status: 'draft',
            created_at: new Date().toISOString(),
            story_data: { test: true },
            shipping_details: {},
            production_cost: 0,
            ai_cost: 0,
            shipping_cost: 0
        }).select();

        if (error) {
            fs.writeFileSync('scripts/exhaustive_error.txt', JSON.stringify(error, null, 2));
            console.log('FAILED. Error saved to scripts/exhaustive_error.txt');
        } else {
            console.log('SUCCESS! Created:', data[0].order_number);
        }
    }
    tryExhaustiveInsert();
} catch (e) { console.error(e); }
