
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

try {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL || envConfig.SUPABASE_URL;
    const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const supabase = createClient(supabaseUrl, supabaseKey);

    async function checkFullCatalog() {
        console.log('--- FETCHING COLUMNS FROM INFORMATION_SCHEMA ---');
        // We can use a raw SQL query via RPC if it exists, but usually we can't.
        // Let's try to query a table that exists but isn't part of our schema just to see what headers we get if any?
        // No, let's just try to select * and see the data keys again.

        const { data, error } = await supabase.from('orders').select('*').limit(1);
        if (data && data[0]) {
            console.log('ALL_COLUMNS_IN_ROW:' + Object.keys(data[0]).join(','));
        }

        // Let's try to see if 'id' exists by selecting it explicitly
        const { data: idData, error: idError } = await supabase.from('orders').select('id').limit(1);
        if (idError) console.log('COLUMN id DOES NOT EXIST:' + idError.message);
        else console.log('COLUMN id EXISTS');

        // Let's try 'user_id'
        const { data: userData, error: userError } = await supabase.from('orders').select('user_id').limit(1);
        if (userError) console.log('COLUMN user_id DOES NOT EXIST:' + userError.message);
        else console.log('COLUMN user_id EXISTS');
    }
    checkFullCatalog();
} catch (e) { console.error(e); }
