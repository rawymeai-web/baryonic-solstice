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
        
        console.log("MainHero imageDNA:", sd.mainCharacter?.imageDNA?.length);
        if(sd.mainCharacter?.imageDNA?.length > 0) {
            console.log("MainHero imageDNA[0]:", sd.mainCharacter.imageDNA[0].substring(0, 50));
        }

        console.log("SecondHero imageDNA:", sd.secondCharacter?.imageDNA?.length);
        if(sd.secondCharacter?.imageDNA?.length > 0) {
            console.log("SecondHero imageDNA[0]:", sd.secondCharacter.imageDNA[0].substring(0, 50));
        }

    } catch (e) {
        console.error("Error:", e);
    }
}
run();
