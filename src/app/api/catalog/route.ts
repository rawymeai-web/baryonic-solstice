
import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';
import { INITIAL_THEMES, ART_STYLE_OPTIONS } from '@/constants';

export async function GET() {
    try {
        // Try fetching themes from Supabase
        const { data: dbThemes, error: themesError } = await supabase
            .from('themes')
            .select('*');

        // Try fetching active styles from Supabase art_styles table
        const { data: dbStyles, error: stylesError } = await supabase
            .from('art_styles')
            .select('*')
            .eq('is_active', true);

        // Merge themes: DB themes take precedence, remaining INITIAL_THEMES are appended
        const mergedThemes = [...(dbThemes || [])];
        for (const it of INITIAL_THEMES) {
            if (!mergedThemes.find(t => t.id === it.id)) {
                mergedThemes.push(it);
            }
        }

        // Parse styles from DB or fallback to ART_STYLE_OPTIONS
        let activeStyles = [];
        if (dbStyles && dbStyles.length > 0) {
            activeStyles = dbStyles.map((s: any) => {
                let badge: string | null = null;
                let cleanUrl = s.preview_url || '';
                if (cleanUrl.includes('?badge=')) {
                    const parts = cleanUrl.split('?badge=');
                    cleanUrl = parts[0];
                    badge = parts[1] || null;
                }
                return {
                    id: s.id,
                    name: s.name,
                    prompt: s.prompt_template,
                    sampleUrl: cleanUrl,
                    is_active: s.is_active,
                    badge: badge
                };
            });
        } else {
            activeStyles = ART_STYLE_OPTIONS.map(s => ({ ...s, id: s.name }));
        }

        return NextResponse.json({
            themes: mergedThemes,
            styles: activeStyles
        }, {
            headers: {
                'Cache-Control': 'public, s-maxage=60, stale-while-revalidate=300'
            }
        });
    } catch (error) {
        console.error("Catalog API Error:", error);
        return NextResponse.json({
            themes: INITIAL_THEMES,
            styles: ART_STYLE_OPTIONS,
            warning: "Falling back to local constants"
        });
    }
}
