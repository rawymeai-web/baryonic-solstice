
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

async function analyzeOrder() {
    console.log('Starting Analysis script...');

    // Load env
    let envConfig;
    try {
        const envContent = fs.readFileSync('.env.local', 'utf8');
        envConfig = dotenv.parse(envContent);
        console.log('ENV loaded successfully');
    } catch (e) {
        console.error('Failed to load .env.local:', e.message);
        process.exit(1);
    }

    const supabaseUrl = envConfig.SUPABASE_URL || envConfig.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseKey = envConfig.SUPABASE_ANON_KEY || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        console.error('Missing Supabase URL or Key');
        process.exit(1);
    }

    console.log('Connecting to Supabase:', supabaseUrl);
    const supabase = createClient(supabaseUrl, supabaseKey);

    const orderId = 'RWY-T0S7NOX1R';
    const outputFile = 'order_analysis_T0S7NOX1R.json';
    console.log('Fetching order:', orderId);

    try {
        const { data, error } = await supabase
            .from('orders')
            .select('*')
            .eq('order_number', orderId)
            .single();

        if (error) {
            console.error('Supabase Error:', error);
            process.exit(1);
        }

        if (!data) {
            console.log('No order found with number:', orderId);
            process.exit(1);
        }

        console.log('Order Found:', data.order_number);
        console.log('Story Data Size:', JSON.stringify(data.story_data).length);

        fs.writeFileSync(outputFile, JSON.stringify(data.story_data, null, 2));
        console.log(`Story data saved to ${outputFile}`);
        process.exit(0);
    } catch (e) {
        console.error('Unexpected Error:', e);
        process.exit(1);
    }
}

analyzeOrder();
