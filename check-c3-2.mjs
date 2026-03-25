import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    try {
        const orderId = 'RWY-C3W1ASEWF';
        const headers = {
            'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
            'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
        };

        const orderRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/orders?order_number=eq.${orderId}`, { headers });
        const orders = await orderRes.json();
        if (!orders || orders.length === 0) return;
        
        const sd = orders[0].story_data;
        if(sd.pages) {
            console.log("Pages generated so far:");
            sd.pages.forEach((p, i) => {
                console.log(`Page ${i}: ${p.illustrationUrl ? 'YES' : 'NO'} | ${p.text?.substring(0, 30)}`);
            });
        }

    } catch (e) {
        console.error("Error:", e);
    }
}
run();
