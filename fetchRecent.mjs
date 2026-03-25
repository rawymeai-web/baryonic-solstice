import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function run() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/orders?select=order_number,story_data&order=created_at.desc&limit=1`, {
        headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
    });
    const data = await res.json();
    if (data && data.length > 0) {
        const orderNum = data[0].order_number;
        console.log("Found newest order:", orderNum);
        const sd = data[0].story_data;

        // Check what the secondCharacter value actually looks like
        const output = {
            order_number: orderNum,
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
                hasStyleUrl: !!sd.styleReferenceImageUrl,
                hasSecondRef: !!sd.secondCharacterImageBase64,
                themeVisualDNA: sd.themeVisualDNA
            },
            prompts: sd.finalPrompts,
            pagesGenerated: sd.pages?.length
        };
        fs.writeFileSync('newest_order_debug.json', JSON.stringify(output, null, 2));
        console.log("Successfully extracted data to newest_order_debug.json");
    } else {
        console.log('No orders found');
    }
}
run();
