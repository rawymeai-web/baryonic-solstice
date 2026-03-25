import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

export async function GET(req: Request) {
    const { searchParams } = new URL(req.url);
    const orderNumber = searchParams.get('order_number');

    if (!orderNumber) {
        return NextResponse.json({ error: 'Missing order_number' }, { status: 400 });
    }

    try {
        const { data, error } = await supabase
            .from('orders')
            .select('story_data')
            .eq('order_number', orderNumber)
            .single();

        if (error || !data) {
            return NextResponse.json({ error: error?.message || 'Not found' }, { status: 404 });
        }

        return NextResponse.json(data.story_data, {
            headers: {
                'Access-Control-Allow-Origin': '*',
                'Access-Control-Allow-Methods': 'GET, OPTIONS',
                'Access-Control-Allow-Headers': 'Content-Type, Authorization'
            }
        });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}

export async function OPTIONS(request: Request) {
    return new NextResponse(null, {
        headers: {
            'Access-Control-Allow-Origin': '*',
            'Access-Control-Allow-Methods': 'GET, OPTIONS',
            'Access-Control-Allow-Headers': 'Content-Type, Authorization',
        },
    })
}
