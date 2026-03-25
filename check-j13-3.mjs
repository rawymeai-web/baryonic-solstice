import dotenv from 'dotenv';
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
        
        console.log("MainHero base64 start:", sd.mainCharacter?.imageBases64?.[0]?.substring(0, 50));
        console.log("SecondHero base64 start:", sd.secondCharacter?.imageBases64?.[0]?.substring(0, 50));

        // And check if prompt contains text:
        console.log("promptBlock 0:", Object.keys(sd.prompts?.[0] || {}));
        if(sd.prompts) console.log("prompt 0 text:", sd.prompts[0].imagePrompt?.substring(0, 100));

    } catch (e) {
        console.error("Error:", e);
    }
}
run();
