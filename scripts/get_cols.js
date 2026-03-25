
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

try {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL || envConfig.SUPABASE_URL;
    const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const supabase = createClient(supabaseUrl, supabaseKey);

    async function saveColumns() {
        const { data, error } = await supabase.from('orders').select('*').limit(1);
        if (data && data[0]) {
            const cols = Object.keys(data[0]);
            fs.writeFileSync('scripts/db_columns.txt', cols.join('\n'));
            console.log('Saved ' + cols.length + ' columns to scripts/db_columns.txt');
        } else {
            console.log('No data found, trying inserted dummy...');
            const { data: insData } = await supabase.from('orders').insert({ status: 'draft' }).select();
            if (insData) {
                const cols = Object.keys(insData[0]);
                fs.writeFileSync('scripts/db_columns.txt', cols.join('\n'));
                console.log('Saved ' + cols.length + ' columns to scripts/db_columns.txt');
            }
        }
    }
    saveColumns();
} catch (e) { console.error(e); }
