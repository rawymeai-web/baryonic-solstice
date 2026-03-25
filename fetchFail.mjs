import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function run() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/orders?order_number=eq.RWY-9BJD5J6UA`, {
        headers: {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        }
    });
    const data = await res.json();
    if (data && data.length > 0) {
        const sd = data[0].story_data;
        const output = {
            mainChar: {
                name: sd.mainCharacter?.name,
                images: sd.mainCharacter?.imageBases64?.length,
                desc: sd.mainCharacter?.description
            },
            secondChar: {
                name: sd.secondCharacter?.name,
                images: sd.secondCharacter?.imageBases64?.length
            },
            styleData: {
                styleSeed: sd.styleSeed,
                stylePrompt: sd.selectedStylePrompt,
                hasStyleRef: !!sd.styleReferenceImageBase64,
                styleRefLength: sd.styleReferenceImageBase64?.length,
                hasSecondRef: !!sd.secondCharacterImageBase64,
                secondRefLength: sd.secondCharacterImageBase64?.length
            },
            prompts: sd.finalPrompts?.map(p => ({
                spread: p.spreadNumber,
                modelPrompt: p.modelPrompt,
                imagePrompt: p.imagePrompt
            })),
            pagesGenerated: sd.pages?.length
        };
        fs.writeFileSync('order_9BJD5J6UA_debug.json', JSON.stringify(output, null, 2));
        console.log("Successfully extracted 9BJD5J6UA data to order_9BJD5J6UA_debug.json");
    } else {
        console.log('Order not found or error', data);
    }
}
run();
