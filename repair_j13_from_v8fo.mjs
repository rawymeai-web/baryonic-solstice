import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';

dotenv.config({ path: './.env.local' });

const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY
);

async function repairJ13() {
    const targetOrder = 'RWY-J13I0G07L';
    const sourceOrder = 'RWY-V8FO0H4JD';

    console.log(`[REPAIR] Fetching source data from ${sourceOrder}...`);
    const { data: source, error: sourceError } = await supabase
        .from('orders')
        .select('story_data')
        .eq('order_number', sourceOrder)
        .single();

    if (sourceError || !source) {
        console.error("Source Error:", sourceError);
        return;
    }

    // SRC story_data contains the correct ARABIC theme and SARAH characters
    const srcData = source.story_data;

    // We build a NEW story_data for J13, scrubbing ALL generative artifacts
    const cleanedStoryData = {
        // Core Identity from Source
        childName: srcData.childName,
        childAge: srcData.childAge,
        childGender: srcData.childGender,

        // FORCE ARABIC as requested by user
        language: 'ar',

        theme: srcData.theme,
        themeId: srcData.themeId,
        title: srcData.title,
        occasion: srcData.occasion,
        planType: srcData.planType,
        size: srcData.size,

        // Character DNA (Ensuring we have the original photo at least)
        mainCharacter: srcData.mainCharacter,
        secondCharacter: srcData.secondCharacter,

        // Ensure Visual DNA fields are checked
        styleReferenceImageBase64: srcData.styleReferenceImageBase64,
        selectedStyleNames: srcData.selectedStyleNames,
        selectedStylePrompt: srcData.selectedStylePrompt || "high quality storybook illustration",

        // Reset Generative Artifacts
        blueprint: null,
        script: null,
        rawScript: null,
        visualPlan: null,
        prompts: null,
        pages: [],

        orderId: targetOrder,
        prompt_version: "v4-agentic-repair-arabic"
    };

    console.log(`[REPAIR] Updating ${targetOrder} and triggering BLUEPRINT generation...`);
    const { error: updateError } = await supabase
        .from('orders')
        .update({
            story_data: cleanedStoryData,
            status: 'blueprint_generating' // Trigger new backend flow
        })
        .eq('order_number', targetOrder);

    if (updateError) {
        console.error("Update Error:", updateError);
        return;
    }

    console.log(`[REPAIR] Clearing old jobs for ${targetOrder}...`);
    await supabase.from('order_jobs').delete().eq('order_id', targetOrder);

    console.log(`[REPAIR] SUCCESS. Order ${targetOrder} is now restored to Arabic Animal theme and queued.`);
}

repairJ13();
