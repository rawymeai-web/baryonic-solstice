import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

export async function GET(req: Request) {
    try {
        const { searchParams } = new URL(req.url);
        const orderId = searchParams.get('id') || 'RWY-9BJD5J6UA';

        const { data, error } = await supabase
            .from('orders')
            .select('order_number, story_data')
            .eq('order_number', orderId)
            .single();

        if (error || !data) return NextResponse.json({ error: error?.message || 'Not found' }, { status: 404 });

        const sd = data.story_data;
        return NextResponse.json({
            order: data.order_number,
            summary: {
                mainChar: sd.mainCharacter?.name,
                secondChar: sd.secondCharacter?.name,
                hasStyleRef: !!sd.styleReferenceImageBase64,
                hasStyleUrl: !!sd.styleReferenceImageUrl,
                styleUrl: sd.styleReferenceImageUrl,
                hasSecondRef: !!sd.secondCharacterImageBase64,
                secondRefLength: sd.secondCharacterImageBase64?.length,
                prompts: sd.finalPrompts?.map((p: any) => ({
                    spread: p.spreadNumber,
                    visualFocus: p.visualFocus,
                    imgPrompt: p.imagePrompt
                }))
            }
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
