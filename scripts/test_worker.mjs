import { createClient } from '@supabase/supabase-js';
import { v4 as uuidv4 } from 'uuid';

import { StoryWorker } from './src/services/workers/storyWorker.js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'http://127.0.0.1:54321';
const SUPABASE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

async function forceRun() {
    console.log("Creating new job for J13...");
    const jobId = uuidv4();
    await supabase.from('order_jobs').insert({
        id: jobId,
        order_id: 'RWY-J13I0G07L',
        job_type: 'story',
        status: 'queued',
        attempts: 0
    });

    console.log("Calling processJob directly...");
    await StoryWorker.processJob(jobId, 'RWY-J13I0G07L', 0);
    console.log("processJob finished.");
}
forceRun();
