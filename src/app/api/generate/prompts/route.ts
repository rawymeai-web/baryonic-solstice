
import { NextResponse } from 'next/server';
import { generatePrompts } from '@/services/visual/promptEngineer';
import { runIllustratorPass } from '@/services/visual/illustratorAgent';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { plan, blueprint, visualDNA, childAge, childDescription, childName, secondCharacter, language, occasion, extraItems, theme } = body;

        if (!plan || !visualDNA) {
            return NextResponse.json({ error: "Missing required inputs for prompt engineering" }, { status: 400 });
        }

        // 1. Generate Raw Prompts using the new JSON Architecture Schema Compiler
        const engineerResponse = await generatePrompts(plan, blueprint, visualDNA, childAge, childDescription, childName, secondCharacter, language, occasion, extraItems, theme);

        // 2. [DEPRECATED] Illustrator Pass (Advanced QA)
        // We have completely bypassed runIllustratorPass. The JSON Schema compiler in promptEngineer.ts 
        // now rigidly enforces typography checks and actor framing directly into the schema.
        // Passing the massive 5,000-line JSON array back into Gemini 2.0 Flash for QA caused catastrophic
        // prompt duplication/hallucination across spreads.

        return NextResponse.json({
            prompts: engineerResponse.result,
            logs: [engineerResponse.log]
        });

    } catch (error: any) {
        console.error("Prompt Engineering API Error:", error);
        return NextResponse.json({ error: error.message }, { status: 500 });
    }
}
