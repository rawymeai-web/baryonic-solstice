import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';

export async function POST(req: Request, context: any) {
    try {
        const orderId = context.params.id;
        const pageIndex = parseInt(context.params.index, 10);

        const adminId = req.headers.get('x-admin-id');
        if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        const { data: order, error } = await supabase.from('orders').select('story_data, status').eq('id', orderId).single();
        if (error || !order || !order.story_data) return NextResponse.json({ error: "Order not found" }, { status: 404 });

        let storyData = order.story_data as any;
        if (!storyData.pages || !storyData.pages[pageIndex]) return NextResponse.json({ error: "Page index out of bounds" }, { status: 400 });

        const prompt = storyData.pages[pageIndex].imagePrompt;
        if (!prompt) return NextResponse.json({ error: "No image prompt available for this page" }, { status: 400 });

        // Remove the existing illustrationUrl to force the illustration_worker to regenerate it
        // OR queue a specific job type. We will just nullify the illustrationUrl and push to illustration generation
        const oldUrl = storyData.pages[pageIndex].illustrationUrl;
        storyData.pages[pageIndex].illustrationUrl = null;

        await supabase.from('orders').update({
            story_data: storyData,
            status: 'story_ready' // Send back to illustration worker queue
        }).eq('id', orderId);

        const { MasterScheduler } = await import('@/services/workers/scheduler');
        await MasterScheduler.dispatchJob(orderId, 'illustration');

        await supabase.from('event_audit_log').insert({
            event_type: 'manual_override',
            order_id: orderId,
            admin_id: adminId,
            details: { action: 'regenerate_image', page_index: pageIndex, old_url: oldUrl }
        });

        return NextResponse.json({ message: "Image queued for regeneration" });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
