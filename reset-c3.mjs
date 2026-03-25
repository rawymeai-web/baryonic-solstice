import dotenv from 'dotenv';
import { createClient } from '@supabase/supabase-js';

dotenv.config({ path: '.env.local' });

async function run() {
    try {
        const supabase = createClient(
            process.env.NEXT_PUBLIC_SUPABASE_URL,
            process.env.SUPABASE_SERVICE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
        );

        const orderId = 'RWY-C3W1ASEWF';

        // 1. Reset the illustration job
        const { error } = await supabase
            .from('order_jobs')
            .update({ status: 'queued', attempts: 0 })
            .eq('order_id', orderId)
            .eq('job_type', 'illustration');

        if (error) {
            console.error("Job reset error:", error);
        } else {
            console.log("Illustration job reset to 'queued'!");
        }

    } catch (e) {
        console.error("Error:", e);
    }
}
run();
