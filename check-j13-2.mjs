import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function run() {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/orders?order_number=eq.RWY-J13I0G07L`, {
            headers: {
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
            }
        });
        const data = await res.json();
        const sd = data[0].story_data;
        
        console.log("Pages array length:", sd.pages?.length);
        if (sd.pages) {
            sd.pages.slice(0, 1).forEach((p, i) => {
                console.log(`Page ${p.pageNumber}:`, Object.keys(p));
                console.log(`English text:`, p.english);
                console.log(`Arabic text:`, p.arabic);
                console.log(`Text:`, p.text);
            });
        }
        
        console.log("Raw Pages JSON:", JSON.stringify(sd.pages?.slice(0, 1), null, 2));

        console.log("Blueprint Object keys:", Object.keys(sd.blueprint || {}));
        if (sd.blueprint) console.log("Blueprint:", JSON.stringify(sd.blueprint).substring(0, 200));

    } catch (e) {
        console.error("Error:", e);
    }
}
run();
