import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

async function run() {
    const supa = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY);
    console.log("Fetching order RWY-9BJD5J6UA...");
    const { data, error } = await supa.from('orders').select('story_data').eq('order_number', 'RWY-9BJD5J6UA').single();

    if (error) {
        console.error("DB Error:", error);
        return;
    }

    const sd = data.story_data;
    console.log("hasStyleUrl:", !!sd.styleReferenceImageUrl);
    console.log("hasStyleBase64:", !!sd.styleReferenceImageBase64);
    console.log("styleUrl:", typeof sd.styleReferenceImageUrl === 'string' ? sd.styleReferenceImageUrl.substring(0, 50) + '...' : sd.styleReferenceImageUrl);
    console.log("secondRefUrl:", typeof sd.secondCharacterImageUrl === 'string' ? sd.secondCharacterImageUrl.substring(0, 50) + '...' : sd.secondCharacterImageUrl);
    console.log("hasSecondBase64:", !!sd.secondCharacterImageBase64);

    // Also dump out one prompt string
    if (sd.finalPrompts && sd.finalPrompts.length > 0) {
        console.log("Prompt 0:", typeof sd.finalPrompts[0] === 'string' ? sd.finalPrompts[0].substring(0, 150) + '...' : "Not a string!");
    }
}
run();
