import { createClient } from '@supabase/supabase-js';

// Initialize a direct admin client for migration scripts
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || '';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Migration Script: Backfill Hero Theme History
 * Reads all legacy 'delivered' or 'shipped' orders, extracts the theme from JSON story_data,
 * matches it against the new `themes` table, and populates `hero_theme_history`.
 */
async function runThemeBackfill() {
    console.log("Starting Theme History Migration Backfill...");

    // 1. Get all eligible legacy orders that don't have a linked subscription yet, or do, but need history.
    const { data: legacyOrders, error: orderErr } = await supabase
        .from('orders')
        .select('id, user_id, story_data, subscription_id')
        .in('status', ['delivered', 'shipped', 'completed']);

    if (orderErr) {
        console.error("Failed to fetch legacy orders:", orderErr);
        return;
    }

    console.log(`Found ${legacyOrders?.length || 0} historical orders to process.`);

    // 2. Fetch all valid themes from the new table to map by name
    const { data: allThemes } = await supabase.from('themes').select('id, title');
    const themeMap = new Map<string, string>(); // theme title (lowercased) -> theme_id
    if (allThemes) {
        allThemes.forEach(t => themeMap.set(t.title.toLowerCase(), t.id));
    }

    let insertedCount = 0;
    let missingHeroCount = 0;

    for (const order of (legacyOrders || [])) {
        const storyData = order.story_data as any;
        if (!storyData || !storyData.theme) continue;

        const legacyThemeName = String(storyData.theme).toLowerCase();
        const matchedThemeId = themeMap.get(legacyThemeName);

        if (!matchedThemeId) {
            console.warn(`WARNING: Legacy order ${order.id} used theme "${legacyThemeName}" which doesn't exist in the new themes table.`);
            continue;
        }

        // We need the hero_id. If the order has a subscription_id, we can trace it.
        // If it's a legacy one-time order, it might not have a subscription_id or hero_id explicitly linked in the relational model yet.
        // For this migration, we assume either subscription_id links to a hero, or we trace `user_id` to their first hero (legacy fallback).
        let targetHeroId: string | null = null;

        if (order.subscription_id) {
            const { data: sub } = await supabase.from('subscriptions').select('hero_id').eq('id', order.subscription_id).single();
            if (sub?.hero_id) targetHeroId = sub.hero_id;
        } else {
            // One-off legacy order. Find the primary hero for this user.
            const { data: heroes } = await supabase.from('heroes').select('id').eq('user_id', order.user_id).limit(1);
            if (heroes && heroes.length > 0) targetHeroId = heroes[0].id;
        }

        if (!targetHeroId) {
            missingHeroCount++;
            continue;
        }

        // Insert into history, ignoring duplicates via standard UPSERT or ON CONFLICT wrapper if needed.
        // For standard Supabase insert, we catch the unique constraint violation gracefully.
        const { error: insertErr } = await supabase
            .from('hero_theme_history')
            .insert({
                hero_id: targetHeroId,
                theme_id: matchedThemeId,
                order_id: order.id,
                subscription_id: order.subscription_id || null
            });

        if (insertErr) {
            if (insertErr.code === '23505') { // unique_violation
                // Expected if we run the script twice
            } else {
                console.error(`Failed to insert history for order ${order.id}:`, insertErr);
            }
        } else {
            insertedCount++;
        }
    }

    console.log(`\n=== MIGRATION COMPLETE ===`);
    console.log(`Successfully backfilled ${insertedCount} historical theme records.`);
    console.log(`Skipped ${missingHeroCount} orders due to unlinked legacy hero DNA.`);
}

// Allow execution from CLI
if (require.main === module) {
    runThemeBackfill().then(() => process.exit(0));
}
