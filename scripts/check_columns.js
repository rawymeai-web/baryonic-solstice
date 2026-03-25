
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

// Load env from .env.local
try {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL || envConfig.SUPABASE_URL;
    const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    if (!supabaseUrl || !supabaseKey) {
        throw new Error('Missing Supabase URL or Key');
    }

    const supabase = createClient(supabaseUrl, supabaseKey);

    async function checkFullSchema() {
        console.log('--- EXHAUSTIVE COLUMN CHECK ---');
        // Try to get one row
        const { data, error } = await supabase.from('orders').select('*').limit(1);

        if (error) {
            console.error('FETCH ERROR:', error.message);
            // Fallback: try to trigger a descriptive error
            const { error: insError } = await supabase.from('orders').insert({ CHECK_COLUMNS_RANDOM_KEY: 1 });
            console.log('HINT FROM FAILED INSERT:', insError ? insError.message : 'No hints');
        } else if (data && data.length > 0) {
            const columns = Object.keys(data[0]);
            console.log('VERIFIED_COLUMNS:' + columns.join(','));
        } else {
            console.log('NO_DATA found in orders table.');
            // Try to insert a dummy row and then delete it to see what columns are required
            const { data: insData, error: insError } = await supabase.from('orders').insert({ status: 'draft' }).select();
            if (insError) {
                console.log('HINT FROM ATTEMPTED INSERT:', insError.message);
            } else {
                console.log('SUCCESSFUL DUMMY INSERT. COLUMNS:' + Object.keys(insData[0]).join(','));
                // Cleanup
                // await supabase.from('orders').delete().eq('order_number', insData[0].order_number);
            }
        }
    }

    checkFullSchema();
} catch (e) {
    console.error('SCRIPT ERROR:', e.message);
}
