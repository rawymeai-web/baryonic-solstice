export const maxDuration = 300;

import { NextResponse } from 'next/server';
import { generateVisualPlan } from '@/services/visual/director';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { script, blueprint, visualDNA, spreadCount = 8 } = body;

        if (!script || !blueprint || !visualDNA) {
            return NextResponse.json({ error: "Missing required inputs for visual planning" }, { status: 400 });
        }

        const planResponse = await generateVisualPlan(script, blueprint, visualDNA, Number(spreadCount));

        return NextResponse.json({
            plan: planResponse.result,
            log: planResponse.log
        });

    } catch (error: any) {
        console.error("Visual Plan API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
