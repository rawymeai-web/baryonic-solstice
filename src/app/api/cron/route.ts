import { NextResponse } from 'next/server';
import { MasterScheduler } from '@/services/workers/scheduler';

export async function GET(req: Request) {
    return handleCron(req);
}

export async function POST(req: Request) {
    return handleCron(req);
}

async function handleCron(req: Request) {
    try {
        const authHeader = req.headers.get('authorization');
        const cronSecret = process.env.CRON_SECRET;

        // In production with CRON_SECRET, require authorization header unless from localhost
        const isLocalhost = req.headers.get('host')?.includes('localhost') || req.headers.get('host')?.includes('127.0.0.1');
        if (cronSecret && !isLocalhost && authHeader !== `Bearer ${cronSecret}`) {
            return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
        }

        console.log(`[Cron Route] Master Scheduler Tick Invoked via ${req.method}`);
        await MasterScheduler.executeTick();

        return NextResponse.json({ success: true, message: 'Tick Executed cleanly.' });
    } catch (e: any) {
        console.error('[Cron Route] Critical Tick Failure:', e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
