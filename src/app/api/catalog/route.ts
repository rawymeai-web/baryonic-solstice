
import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';
import { INITIAL_THEMES, ART_STYLE_OPTIONS } from '@/constants';

export async function GET() {
    try {
        // Try fetching themes from Supabase
        const { data: dbThemes, error: themesError } = await supabase
            .from('themes')
            .select('*');

        // Try fetching styles from Supabase
        const { data: dbStyles, error: stylesError } = await supabase
            .from('illustration_styles')
            .select('*');

        // Merge themes: DB themes take precedence, remaining INITIAL_THEMES are appended
        const mergedThemes = [...(dbThemes || [])];
        for (const it of INITIAL_THEMES) {
            if (!mergedThemes.find(t => t.id === it.id)) {
                mergedThemes.push(it);
            }
        }

        // Merge styles
        const mergedStyles = [...(dbStyles || [])];
        for (const is of ART_STYLE_OPTIONS) {
            // is only has name, category, prompt, sampleUrl
            if (!mergedStyles.find(s => s.name === is.name)) {
                mergedStyles.push({ ...is, id: is.name } as any);
            }
        }

        return NextResponse.json({
            themes: mergedThemes,
            styles: mergedStyles
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
