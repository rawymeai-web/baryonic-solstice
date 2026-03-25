import { NextResponse } from 'next/server';
import { ai, cleanJsonString, withRetry } from '../../../../services/generation/modelGateway';
import { getWordCountForAge } from '../../../../services/rules/guidebook';

export async function POST(req: Request) {
    try {
        const body = await req.json();
        const { blueprint, language, childName, spreadIndex, currentText, age } = body;

        if (!blueprint || spreadIndex === undefined) {
            return NextResponse.json({ error: 'Missing required parameters' }, { status: 400 });
        }

        const languageMap: Record<string, string> = {
            'en': 'English',
            'ar': 'Arabic (Modern Standard / Fusha)',
        };
        const targetLang = languageMap[language] || 'English';
        const numAge = parseInt(age || "5");
        const wordCountRule = getWordCountForAge(numAge);

        const prompt = `
            ROLE: Master Storyteller (Language: ${targetLang}).
            TASK: Rewrite ONE specific spread for a children's book. You are rewriting Spread ${spreadIndex + 1}.

            BLUEPRINT: ${JSON.stringify(blueprint)}
            
            **CRITICAL IDENTITY RULE:**
            - The Hero's Name is: **${childName}**.
            - You MUST use the name "${childName}" in the text.
            
            MANDATES from Guidebook:
            - Age Group: ${numAge} Years Old.
            - Word Count Target: ${wordCountRule.min}-${wordCountRule.max} words.
            - Tone: Whimsical, Rhythmic, Engaging.
            
            CURRENT TEXT: "${currentText || ''}"
            
            Write a fresh new variation of this single spread that fits the blueprint sequence but offers a different phrasing or slight variation in action without breaking the story.

            OUTPUT FORMAT: 
            Return ONLY a valid JSON object like this:
            {
                "text": "The beautifully written new text for this spread..."
            }
        `;

        const result = await withRetry(async () => {
            const model = ai().getGenerativeModel({
                model: 'gemini-2.0-flash',
                generationConfig: { responseMimeType: "application/json" }
            });

            const response = await model.generateContent(prompt);
            const raw = response.response.text();
            const parsed = JSON.parse(cleanJsonString(raw));
            if (!parsed.text) throw new Error("Text field missing from JSON");
            return parsed;
        });

        return NextResponse.json(result);
    } catch (e: any) {
        console.error("Single Spread Text Generation Error:", e);
        return NextResponse.json({ error: e.message }, { status: 500 });
    }
}
