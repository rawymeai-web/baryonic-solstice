import dotenv from 'dotenv';
import fs from 'fs';
dotenv.config({ path: '.env.local' });

async function run() {
    const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/orders?select=*&order=created_at.desc&limit=10`, {
        headers: {
            'apikey': process.env.SUPABASE_SERVICE_ROLE_KEY,
            'Authorization': `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`
        }
    });
    const data = await res.json();
    if (data && data.length > 0) {
    const orders = data.map(o => {
        const sd = o.story_data || {};
        return {
            order_number: o.order_number,
            created_at: o.created_at,
            status: o.status,
            mainChar: {
                name: sd.mainCharacter?.name,
                images: sd.mainCharacter?.imageBases64?.length,
                dna: sd.mainCharacter?.imageDNA?.length
            },
            pages: (sd.pages || []).length
        };
    });
    console.log("Found", orders.length, "recent orders.");
    fs.writeFileSync('newest_order_debug.json', JSON.stringify(orders, null, 2));
        console.log("Successfully extracted data to newest_order_debug.json");
    } else {
        console.log('No orders found');
    }
}
run();
