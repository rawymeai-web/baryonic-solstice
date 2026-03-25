import { NextResponse } from 'next/server';
import { supabase } from '@/utils/supabaseClient';
import { EmailService } from '@/services/notifications/emailService';

export async function POST(req: Request, context: any) {
    try {
        const orderId = context.params.id;
        const adminId = req.headers.get('x-admin-id');
        if (!adminId) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

        // Retrieve the artifact for the softcopy
        const { data: artifact } = await supabase
            .from('artifacts')
            .select('storage_url')
            .eq('order_id', orderId)
            .eq('artifact_type', 'compiled_pdf')
            .order('version', { ascending: false })
            .limit(1)
            .single();

        if (!artifact || !artifact.storage_url) {
            return NextResponse.json({ error: "No compiled PDF found for this order" }, { status: 404 });
        }

        // Send email
        await EmailService.sendNotification(orderId, 'softcopy_ready', { downloadLink: artifact.storage_url });

        await supabase.from('event_audit_log').insert({
            event_type: 'manual_override',
            order_id: orderId,
            admin_id: adminId,
            details: { action: 'resend_softcopy_email', storage_url: artifact.storage_url }
        });

        return NextResponse.json({ message: "Softcopy email resent" });
    } catch (e: any) {
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
