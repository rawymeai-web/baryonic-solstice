
const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = "https://wqklukruzxicjaeblser.supabase.co";
const SUPABASE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Indxa2x1a3J1enhpY2phZWJsc2VyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njk2ODAwNTEsImV4cCI6MjA4NTI1NjA1MX0.JN9StTmoN-icdJL3sg-HH9Q8bDlPuHxWIvjoopGEhD8";

async function fetchSavedData() {
    const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

    console.log("Fetching prompts from Supabase...");
    const { data: prompts, error: promptError } = await supabase.from('prompts').select('*');
    if (promptError) console.error("Error fetching prompts:", promptError);
    else {
        console.log("--- SAVED PROMPTS ---");
        prompts.forEach(p => console.log(`[${p.id}] v${p.version}: ${p.template.substring(0, 50)}...`));
    }

    console.log("\nFetching Series Bible (Guidebook)...");
    const { data: guidebook, error: gbError } = await supabase.from('guidebook').select('*');
    if (gbError) console.error("Error fetching guidebook:", gbError);
    else {
        console.log("--- SERIES BIBLE ---");
        guidebook.forEach(g => {
            console.log(`[ID: ${g.id}]`);
            console.log(JSON.stringify(g.content, null, 2));
        });
    }

    console.log("\nFetching System Settings...");
    const { data: settings, error: settingsError } = await supabase.from('settings').select('*');
    if (settingsError) console.error("Error fetching settings:", settingsError);
    else {
        console.log("--- SETTINGS ---");
        console.log(JSON.stringify(settings, null, 2));
    }
}

fetchSavedData();
