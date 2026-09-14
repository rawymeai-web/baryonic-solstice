
import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || 'https://wqklukruzxicjaeblser.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || 'sb_publishable_lSFRnJu5fvLwzGC4ltpw0w_TN0XnmCu';

if (!process.env.SUPABASE_SERVICE_ROLE_KEY) {
    console.warn("Notice: SUPABASE_SERVICE_ROLE_KEY not loaded from process.env, using fallback key.");
}

export const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
        persistSession: false,
        autoRefreshToken: false
    }
});
