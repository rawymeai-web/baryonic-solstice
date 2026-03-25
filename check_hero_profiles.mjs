import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkHeroProfiles() {
    console.log("Checking hero_profiles for s_emera@yahoo.com...");
    const { data: profiles } = await supabase
        .from('hero_profiles')
        .select('*')
        .limit(20);

    for (const p of profiles) {
        console.log(`Profile: ${p.id}, Child: ${p.child_name}, DNA: ${p.image_dna?.length || 0}`);
    }
}

checkHeroProfiles();
