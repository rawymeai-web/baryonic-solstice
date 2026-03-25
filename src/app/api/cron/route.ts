import { NextResponse } from 'next/server';
import { MasterScheduler } from '@/services/workers/scheduler';

export async function GET(req: Request) {
    try {
        // Run the background tick
        // Notice we don't 'await' it if we want to return immediately, 
        // but for Vercel Cron we often do await it up to the function timeout.
        // We'll run it detached so Vercel doesn't kill it if it takes 15s.

        // Ensure only authorized requests 
        // (In production, you'd check a CRON_SECRET header matching Vercel's injected variable)
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log(`[Cron Route] Master Scheduler Tick Invoked via ${req.method}`);

        // DO NOT AWAIT context entirely to let it run in the background if possible,
        // although in serverless Next.js the process might freeze after res returns.
        // For strict reliability, we await it here and rely on the 10s/60s max duration config.
        await MasterScheduler.executeTick();

        return NextResponse.json({ success: true, message: 'Tick Executed cleanly.' });
    } catch (e: any) {
        console.error('[Cron Route] Critical Tick Failure:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
