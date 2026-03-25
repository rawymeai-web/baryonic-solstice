import dotenv from 'dotenv';
dotenv.config({ path: '.env.local' });

async function run() {
    try {
        const res = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/event_audit_log?order_id=eq.RWY-J13I0G07L`, {
            headers: {
                'apikey': process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY}`
            }
        });
        const data = await res.json();
        data.forEach(log => {
            console.log(log.event_type, JSON.stringify(log.details).substring(0, 100));
        });

    } catch (e) {
        console.error("Error:", e);
    }
}
run();
