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
        if (!orders || orders.length === 0) {
            console.log("Order not found!");
            return;
        }

        console.log(`\n=== RECENT JOBS for ${orderId} ===`);
        const jobsRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/order_jobs?order_id=eq.${orderId}&order=created_at.desc.limit.5`, { headers });
        const jobs = await jobsRes.json();
        jobs.forEach(j => {
            console.log(`[${j.created_at}] ${j.job_type}: ${j.status}`);
            if (j.error_message) console.log(`   ERROR: ${j.error_message}`);
        });

        console.log(`\n=== RECENT AUDIT LOGS for ${orderId} ===`);
        const auditRes = await fetch(`${process.env.NEXT_PUBLIC_SUPABASE_URL}/rest/v1/event_audit_log?order_id=eq.${orderId}&order=created_at.desc.limit.10`, { headers });
        const audit = await auditRes.json();
        audit.forEach(a => {
            console.log(`[${a.created_at}] ${a.event_type}`);
            if (a.details) console.log(`   DETAILS: ${JSON.stringify(a.details).substring(0, 500)}`);
        });

    } catch (e) {
        console.error("Error:", e);
    }
}
run();
