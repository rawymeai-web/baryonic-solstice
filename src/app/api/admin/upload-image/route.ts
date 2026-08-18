import { NextRequest, NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

export const dynamic = 'force-dynamic';
export const maxDuration = 300;

export async function POST(req: NextRequest) {
  try {
    const { orderNumber, spreadNum, imageBase64 } = await req.json();
    if (!orderNumber || !imageBase64) {
      return NextResponse.json({ error: 'Missing orderNumber or imageBase64' }, { status: 400 });
    }

    // Convert base64 to binary buffer
    const base64Str = imageBase64.includes('base64,') ? imageBase64.split('base64,')[1] : imageBase64;
    const buffer = Buffer.from(base64Str, 'base64');

    const bucket = 'images';
    const isCover = spreadNum === 0 || spreadNum === '0' || spreadNum === 'cover';
    const filename = isCover 
      ? `${orderNumber}/cover_${Date.now()}.jpg`
      : `${orderNumber}/spread_${spreadNum}_${Date.now()}.jpg`;

    const { data, error } = await supabase.storage
      .from(bucket)
      .upload(filename, buffer, {
        contentType: 'image/jpeg',
        upsert: true
      });

    if (error) {
      console.error('[upload-image API] Supabase storage upload error:', error);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }

    const { data: publicData } = supabase.storage.from(bucket).getPublicUrl(filename);
    const publicUrl = publicData?.publicUrl;

    if (!publicUrl) {
      return NextResponse.json({ error: 'Failed to retrieve public URL' }, { status: 500 });
    }

    return NextResponse.json({ success: true, publicUrl });
  } catch (err: any) {
    console.error('[upload-image API] Catch error:', err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
