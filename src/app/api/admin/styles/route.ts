import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const { data: dbStyles, error } = await supabase
      .from('art_styles')
      .select('*')
      .order('name', { ascending: true });

    if (error) {
      console.error('[API /api/admin/styles] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const styles = (dbStyles || []).map((s: any) => {
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
        preview_url: cleanUrl,
        raw_preview_url: s.preview_url,
        is_active: s.is_active ?? true,
        badge: badge
      };
    });

    return NextResponse.json({ success: true, styles });
  } catch (err: any) {
    console.error('[API /api/admin/styles GET] Catch:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json();
    const { id, is_active, badge, prompt, preview_url, name } = body;

    if (!id && !name) {
      return NextResponse.json({ error: 'Missing style id or name' }, { status: 400 });
    }

    let updatedPreviewUrl = preview_url;
    if (preview_url && badge) {
      const clean = preview_url.split('?badge=')[0];
      updatedPreviewUrl = `${clean}?badge=${badge}`;
    } else if (preview_url && !badge) {
      updatedPreviewUrl = preview_url.split('?badge=')[0];
    }

    const updates: any = {};
    if (typeof is_active === 'boolean') updates.is_active = is_active;
    if (prompt !== undefined) updates.prompt_template = prompt;
    if (updatedPreviewUrl !== undefined) updates.preview_url = updatedPreviewUrl;
    if (name !== undefined) updates.name = name;

    const query = id 
      ? supabase.from('art_styles').update(updates).eq('id', id)
      : supabase.from('art_styles').update(updates).eq('name', name);

    const { data, error } = await query.select();

    if (error) {
      console.error('[API /api/admin/styles PUT] Error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, style: data?.[0] });
  } catch (err: any) {
    console.error('[API /api/admin/styles PUT] Catch:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, prompt, preview_url, is_active = true, badge = null } = body;

    if (!name || !prompt) {
      return NextResponse.json({ error: 'Name and prompt are required' }, { status: 400 });
    }

    let finalPreviewUrl = preview_url || '/style-previews/cinematic_3d_pixar_style.png';
    if (badge) {
      finalPreviewUrl = `${finalPreviewUrl.split('?badge=')[0]}?badge=${badge}`;
    }

    const { data, error } = await supabase.from('art_styles').insert({
      name,
      prompt_template: prompt,
      preview_url: finalPreviewUrl,
      is_active
    }).select().single();

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    return NextResponse.json({ success: true, style: data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
