import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    try {
        const orderId = 'RWY-C3W1ASEWF';
        const headers = {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        };

        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/orders?order_number=eq.${orderId}`, { headers });
        const orders = await res.json();
        const sd = orders[0].story_data;

        console.log("MainHero ImageDNA exists?", !!sd.mainCharacter?.imageDNA?.[0]);
        console.log("MainHero ImageDNA size:", sd.mainCharacter?.imageDNA?.[0]?.length);
        console.log("UseSecondCharacter:", sd.useSecondCharacter);
        console.log("SecondCharacter Name:", sd.secondCharacter?.name);
        console.log("SecondCharacter ImageDNA exists?", !!sd.secondCharacter?.imageDNA?.[0]);
    } catch (e) {
        console.error("Error:", e);
    }
}
run();
