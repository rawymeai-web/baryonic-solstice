import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function run() {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/orders?order_number=eq.RWY-9BJD5J6UA`, {
            headers: {
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
            }
        });
        const data = await res.json();
        if (!data || !data.length) return console.log("Order not found.");

        const sd = data[0].story_data;
        console.log("=== DIAGNOSTICS FOR RWY-9BJD5J6UA ===");
        console.log("hasStyleRefBase64:", !!sd.styleReferenceImageBase64);
        console.log("styleRefBase64Length:", sd.styleReferenceImageBase64?.length || 0);
        console.log("hasStyleUrl:", !!sd.styleReferenceImageUrl);
        console.log("styleUrl:", sd.styleReferenceImageUrl);
        console.log("hasSecondRefBase64:", !!sd.secondCharacterImageBase64);
        console.log("secondRefBase64Length:", sd.secondCharacterImageBase64?.length || 0);
        console.log("hasSecondUrl:", !!sd.secondCharacterImageUrl);
        console.log("secondUrl:", sd.secondCharacterImageUrl);
        console.log("themeVisualDNA:", sd.themeVisualDNA);

        console.log("First Prompt Image Focus:", sd.finalPrompts?.[0]?.visualFocus);
        console.log("First Prompt Image Prompt (trunc):", sd.finalPrompts?.[0]?.imagePrompt?.substring(0, 150));

    } catch (e) {
        console.error("Error:", e);
    }
    process.exit(0);
}
run();
