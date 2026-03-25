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

        console.log("=== ORDER DATA REPORT ===");
        console.log("Order Number:", orderId);
        console.log("Is using mainCharacter object:", !!sd.mainCharacter);
        console.log("Main Character Name:", sd.mainCharacter?.name || sd.childName);
        console.log("Main Character Gender:", sd.mainCharacter?.gender);
        
        console.log("--- Dual Hero Check ---");
        console.log("useSecondCharacter flag:", sd.useSecondCharacter);
        console.log("isDoubleHero flag:", sd.isDoubleHero);
        console.log("Has secondCharacter object:", !!sd.secondCharacter);
        if (sd.secondCharacter) {
            console.log("Second Character Name:", sd.secondCharacter.name);
            console.log("Second Character Gender:", sd.secondCharacter.gender);
        }
        
        const heroCount = (sd.useSecondCharacter || sd.isDoubleHero || !!sd.secondCharacter) ? 2 : 1;
        console.log("\nRESULT: This appears to be a " + (heroCount === 2 ? "DOUBLE" : "SINGLE") + " hero order.");
        
    } catch (e) {
        console.error("Error:", e);
    }
}
run();
