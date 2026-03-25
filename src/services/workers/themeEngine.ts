import { supabase } from '@/utils/supabaseClient';
import type { Theme, HeroPreferences, HeroThemeHistory, DbOrderStatus } from '@/types';

/**
 * Ensures a hero never receives the same theme twice, and respects preferences/blocked tags.
 * Also handles the "Theme Exhaustion" halt if we run out of fresh themes.
 */
export class ThemeAssignmentEngine {

    static async assignThemeForOrder(orderId: string, subscriptionId: string, heroId: string): Promise<{ success: boolean; themeId?: string; status?: DbOrderStatus }> {
        console.log(`[ThemeEngine] Starting assignment for Order: ${orderId}, Hero: ${heroId}`);

        try {
            // 1. Fetch Preferences & History
            const [{ data: prefs }, { data: history }] = await Promise.all([
                supabase.from('hero_preferences').select('*').eq('hero_id', heroId).single(),
                supabase.from('hero_theme_history').select('theme_id').eq('hero_id', heroId)
            ]);

            const preferences = prefs as HeroPreferences | null;
            const pastThemeIds = (history as HeroThemeHistory[])?.map(h => h.theme_id) || [];

            // 2. Fetch all active themes
            const { data: allThemes, error: themeErr } = await supabase
                .from('themes')
                .select('*')
                .is('active_to', null) // Current active themes
                .order('created_at', { ascending: false });

            if (themeErr || !allThemes) {
                console.error("[ThemeEngine] Supabase Theme Load Error:", themeErr);
                throw new Error("Could not load themes catalog");
            }

            const themes = allThemes as Theme[];

            // 3. Filter out past themes to prevent duplication (PRD RULE: Never Repeat)
            let eligibleThemes = themes.filter(t => !pastThemeIds.includes(t.id));

            if (eligibleThemes.length === 0) {
                console.error(`[ThemeEngine] EXHAUSTION: Hero ${heroId} has exhausted all ${themes.length} available catalog themes!`);
                // Halt order
                await supabase.from('orders').update({ status: 'on_hold', error_message: 'Theme Exhaustion' }).eq('order_number', orderId);
                // Alert Admin via Audit Log
                await supabase.from('event_audit_log').insert({
                    event_type: 'theme_exhaustion_alert',
                    order_id: orderId,
                    subscription_id: subscriptionId,
                    details: { heroId, pastThemeCount: pastThemeIds.length }
                });
                return { success: false, status: 'on_hold' };
            }

            // 4. Apply Preference Logic
            if (preferences) {
                // Remove blocked themes
                eligibleThemes = eligibleThemes.filter(t =>
                    !t.tags.some(tag => preferences.blocked_theme_tags.includes(tag))
                );

                if (eligibleThemes.length === 0) {
                    console.warn(`[ThemeEngine] Preferences blocked all remaining themes. Falling back to entire non-repeated pool.`);
                    // Fallback to ignoring blocked tags if it's the only way to deliver an unrepeated book
                    eligibleThemes = themes.filter(t => !pastThemeIds.includes(t.id));
                } else if (preferences.preferred_theme_tags.length > 0) {
                    // Try to match preferred tags
                    const preferredSubset = eligibleThemes.filter(t =>
                        t.tags.some(tag => preferences.preferred_theme_tags.includes(tag))
                    );

                    if (preferredSubset.length > 0) {
                        eligibleThemes = preferredSubset;
                    }
                }
            }

            // 5. Select Theme (Random from the filtered pool)
            const selectedTheme = eligibleThemes[Math.floor(Math.random() * eligibleThemes.length)];
            console.log(`[ThemeEngine] Selected Theme ${selectedTheme.id} (${selectedTheme.title}) for Hero ${heroId}`);

            // 6. SNAPSHOTTING: Write to History & Update Order
            // We use an atomic transaction or parallel writes to lock this in.

            // Insert History (Unique constraint will throw if we messed up)
            const { error: histErr } = await supabase.from('hero_theme_history').insert({
                hero_id: heroId,
                theme_id: selectedTheme.id,
                subscription_id: subscriptionId,
                order_id: orderId
            });

            if (histErr) {
                console.error("[ThemeEngine] Failed to write history (Race condition?)", histErr);
                return { success: false };
            }

            // Bind theme to the order's story_data and transition status
            // We fetch the current order to deeply merge the theme into story_data
            const { data: orderData } = await supabase.from('orders').select('story_data').eq('order_number', orderId).single();
            const activeStoryData = orderData?.story_data || {};

            // Apply preferences snapshot if 'fixed' mode
            if (preferences?.style_mode === 'fixed' && preferences.style_reference_image_base64) {
                activeStoryData.styleReferenceImageBase64 = preferences.style_reference_image_base64;
            }

            activeStoryData.themeId = selectedTheme.id;
            activeStoryData.theme = selectedTheme.title;
            activeStoryData.themeVisualDNA = selectedTheme.visual_dna_prompt;

            await supabase.from('orders').update({
                status: 'story_generating', // Advance to the next queue
                story_data: activeStoryData
            }).eq('order_number', orderId);

            return { success: true, themeId: selectedTheme.id, status: 'story_generating' };

        } catch (error) {
            console.error("[ThemeEngine] Critical Failure", error);
            return { success: false };
        }
    }
}
