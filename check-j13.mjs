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
        if (!data || !data.length) return console.log("Order not found.");

        const sd = data[0].story_data;
        console.log("=== DIAGNOSTICS FOR RWY-J13I0G07L ===");
        
        console.log("1. TWO-HERO FLAG AND COUNTS");
        console.log("useSecondCharacter:", sd.useSecondCharacter);
        
        console.log("\n2. MAIN HERO");
        console.log("Name:", sd.mainCharacter?.name);
        console.log("Type:", sd.mainCharacter?.type);
        console.log("Images array length:", sd.mainCharacter?.images?.length);
        console.log("First image type:", typeof sd.mainCharacter?.images?.[0]);
        if (typeof sd.mainCharacter?.images?.[0] === 'string') {
            console.log("First image start:", sd.mainCharacter?.images?.[0].substring(0, 50));
        } else {
            console.log("First image keys:", Object.keys(sd.mainCharacter?.images?.[0] || {}));
        }
        console.log("ImageBases64 array length:", sd.mainCharacter?.imageBases64?.length);
        
        console.log("\n3. SECOND HERO");
        console.log("Name:", sd.secondCharacter?.name);
        console.log("Type:", sd.secondCharacter?.type);
        console.log("Images array length:", sd.secondCharacter?.images?.length);
        console.log("ImageBases64 array length:", sd.secondCharacter?.imageBases64?.length);
        if (typeof sd.secondCharacter?.images?.[0] === 'string') {
            console.log("Second First image start:", sd.secondCharacter?.images?.[0].substring(0, 50));
        } else {
            console.log("Second First image keys:", Object.keys(sd.secondCharacter?.images?.[0] || {}));
        }

        console.log("\n4. BLUEPRINT / STORY CORES");
        console.log("Language:", sd.language);
        if (sd.storyCores && sd.storyCores.length > 0) {
            console.log("First Core English text:", sd.storyCores[0].english);
            console.log("First Core Arabic text:", sd.storyCores[0].arabic);
        } else {
            console.log("No storyCores found.");
        }
        
        console.log("\n5. IMAGE GENERATION / PROMPTS");
        console.log("Cover Character DNA URL:", sd.characterDNAUrl ? 'YES' : 'NO');
        console.log("Cover Second DNA URL:", sd.secondCharacterDNAUrl ? 'YES' : 'NO');
        console.log("Pages array length:", sd.pages?.length);
        if (sd.pages) {
            sd.pages.slice(0, 2).forEach((p, i) => {
                console.log(`\nPage ${p.pageNumber}:`);
                console.log(`Prompt: ${p.imagePrompt?.substring(0, 100)}...`);
                console.log(`Illustration URL/B64: ${p.illustrationUrl ? 'YES' : 'NO'}`);
            });
        }
        
    } catch (e) {
        console.error("Error:", e);
    }
}
run();
