
const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const dotenv = require('dotenv');

try {
    const envConfig = dotenv.parse(fs.readFileSync('.env.local'));
    const supabaseUrl = envConfig.NEXT_PUBLIC_SUPABASE_URL || envConfig.SUPABASE_URL;
    const supabaseKey = envConfig.SUPABASE_SERVICE_ROLE_KEY || envConfig.NEXT_PUBLIC_SUPABASE_ANON_KEY;

    const supabase = createClient(supabaseUrl, supabaseKey);

    async function checkNullability() {
        const { error } = await supabase.from('orders').insert({}).select();
        if (error) {
            fs.writeFileSync('scripts/last_db_error.txt', JSON.stringify(error, null, 2));
            console.log('Saved error to scripts/last_db_error.txt');
        } else {
            console.log('SUCCESS');
        }
    }
    checkNullability();
} catch (e) { console.error(e); }
