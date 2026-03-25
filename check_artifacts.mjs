import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function checkArtifacts() {
    console.log("Checking artifacts for Hero DNA...");
    const { data: artifacts } = await supabase
        .from('artifacts')
        .select('*')
        .eq('artifact_type', 'hero_dna')
        .order('created_at', { ascending: false })
        .limit(10);

    for (const a of artifacts) {
        console.log(`Artifact: ${a.id}, Order: ${a.order_id}, Created: ${a.created_at}`);
        // We could fetch the content if it's stored in a bucket or if base64 is in a field.
        // Usually, artifacts table links to a storage_url.
    }

    console.log("\nChecking recent orders for ANY DNA...");
    const { data: orders } = await supabase
        .from('orders')
        .select('order_number, story_data')
        .order('created_at', { ascending: false })
        .limit(20);

    for (const o of orders) {
        const dna = o.story_data?.mainCharacter?.imageDNA?.[0];
        if (dna) {
            console.log(`Order: ${o.order_number} HAS DNA (Length: ${dna.length})`);
        }
    }
}

checkArtifacts();
