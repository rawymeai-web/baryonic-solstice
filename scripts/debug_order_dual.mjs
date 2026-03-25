import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, '../.env.local') });

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function check() {
    const { data, error } = await supabase.from('orders').select('story_data').eq('order_number', 'RWY-C3W1ASEWF').single();
    if (error) {
        console.error(error);
        return;
    }
    const sd = data.story_data;
    console.log("useSecondCharacter:", sd.useSecondCharacter);
    console.log("mainCharacter name:", sd.mainCharacter?.name);
    console.log("mainCharacter imageDNA present:", !!sd.mainCharacter?.imageDNA?.[0]);
    console.log("secondCharacter name:", sd.secondCharacter?.name);
    console.log("secondCharacter imageBases64 present:", !!sd.secondCharacter?.imageBases64?.[0]);
    console.log("secondCharacter imageDNA present:", !!sd.secondCharacter?.imageDNA?.[0]);
}

check();
