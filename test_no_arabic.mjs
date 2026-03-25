import dotenv from 'dotenv';
import { GoogleGenerativeAI } from "@google/generative-ai";
dotenv.config({ path: '.env.local' });

async function run() {
    const key = process.env.GEMINI_API_KEY;
    if (!key) return;

    const genAI = new GoogleGenerativeAI(key);
    const model = genAI.getGenerativeModel({ model: 'gemini-3-pro-image-preview' });

    // Use a simplified prompt without Arabic characters but same content
    const imagePrompt = "A cozy living room at night. Sarah and Farah are sitting on a fluffy rug, looking at a big picture book together. The light from a nearby lamp casts a warm glow. Sarah is pointing at a drawing of a smiling sun. Farah is leaning in, curious.";
    const stylePrompt = "Painterly illustration";

    // Get DNA from database (assuming it's still there)
    const orderId = 'RWY-C3W1ASEWF';
    const headers = {
        'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
    };

    try {
        const orderRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/orders?order_number=eq.${orderId}`, { headers });
        const orders = await orderRes.json();
        const sd = orders[0].story_data;
        const mainDNA = sd.mainCharacter?.imageDNA?.[0];

        const contents = [
            { inlineData: { mimeType: 'image/jpeg', data: mainDNA } },
            { text: imagePrompt + "\nStyle: " + stylePrompt }
        ];

        console.log("=== ARABIC-FREE TEST ===");
        console.log("Calling generateContent...");
        const result = await model.generateContent(contents);
        console.log("Success! Image generated.");
    } catch (e) {
        console.error("!!! ARABIC-FREE TEST FAILED !!!");
        console.error("Error:", e.message);
    }
}

run();
