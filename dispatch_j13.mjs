import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import { v4 as uuidv4 } from 'uuid';

dotenv.config({ path: './.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function dispatchJ13() {
    const orderId = 'RWY-J13I0G07L';
    console.log(`Dispatching blueprint job for ${orderId}...`);

    const jobId = uuidv4();
    const { error } = await supabase.from('order_jobs').insert({
        id: jobId,
        order_id: orderId,
        job_type: 'blueprint',
        status: 'queued',
        attempts: 0
    });

    if (error) {
        console.error("Job Dispatch Error:", error);
    } else {
        console.log(`SUCCESS. Job ${jobId} dispatched.`);
    }
}

dispatchJ13();
