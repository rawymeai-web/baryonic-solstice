
const { createClient } = require('@supabase/supabase-js');
require('dotenv').config({ path: '.env.local' });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

async function listFiles() {
    const { data: files, error } = await supabase.storage.from('images').list();
    if (files) {
        console.log('Files in storage:', files.map(f => f.name));
    }
}

listFiles();
