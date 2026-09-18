
import { ai, cleanJsonString, withRetry } from '../generation/modelGateway';
import { WorkflowLog } from '../../types';

export async function runQualityAssurance(
    prompts: { spreadNumber: number, imagePrompt: string, storyText: string }[]
): Promise<{ result: { spreadNumber: number, imagePrompt: string, storyText: string }[], log: WorkflowLog }> {

    const startTime = Date.now();

    try {
        return await withRetry(async () => {
            const prompt = `
            ROLE: Storybook Safety Inspector.
            TASK: Check the following image prompt action descriptions for safety violations and forbidden terms.
    
            RULES:
            1. Forbidden: Words that imply written text like "Signpost with writing", "Text label", "Lettering", "Book cover title".
            2. Forbidden: "Split screen" or "Comic panel".
            3. Forbidden: Real-world parents unless explicitly in cast.
            4. Safety: ABSOLUTELY NO skulls, skeletons, weapons, scary monsters, blood, gore, violence.
            
            PROMPTS TO INSPECT:
            ${JSON.stringify(prompts.map(p => ({ spreadNumber: p.spreadNumber, text: p.imagePrompt.substring(0, 400) })))}
    
            ACTION:
            Return an array of surgical keyword replacements needed (if any). If safe, return empty array [].
    
            OUTPUT JSON SCHEMA:
            [
              { "spreadNumber": 1, "unsafeTerm": "skull", "safeReplacement": "ancient carved stone" }
            ]
            `;

            const model = ai().getGenerativeModel({
                model: 'gemini-2.5-flash',
                generationConfig: { responseMimeType: "application/json" }
            });

            const response = await model.generateContent(prompt);
            const responseText = response.response.text();
            if (!responseText) throw new Error("QA response empty");

            let replacements: any[] = JSON.parse(cleanJsonString(responseText));
            if (!Array.isArray(replacements) && typeof replacements === 'object') {
                const possibleArray = Object.values(replacements).find(v => Array.isArray(v));
                if (possibleArray) replacements = possibleArray;
            }

            // Apply surgical replacements while protecting token anchors
            const finalPrompts = prompts.map(original => {
                let cleanPrompt = original.imagePrompt;
                if (Array.isArray(replacements)) {
                    replacements.forEach(rep => {
                        if (rep && (rep.spreadNumber === original.spreadNumber || rep.spreadNumber === undefined) && rep.unsafeTerm && rep.safeReplacement) {
                            const regex = new RegExp(`\\b${rep.unsafeTerm}\\b`, 'gi');
                            cleanPrompt = cleanPrompt.replace(regex, rep.safeReplacement);
                        }
                    });
                }
                return {
                    ...original,
                    imagePrompt: cleanPrompt
                };
            });

            return {
                result: finalPrompts,
                log: {
                    stage: 'QA',
                    timestamp: startTime,
                    inputs: { promptCount: prompts.length },
                    outputs: { safePromptCount: finalPrompts.length },
                    status: 'Success',
                    durationMs: Date.now() - startTime
                }
            };
        });
    } catch (e: any) {
        return {
            result: prompts, // Return original prompts on fail to not block
            log: {
                stage: 'QA',
                timestamp: startTime,
                inputs: { promptCount: prompts.length },
                outputs: { error: e.message, warning: "Skipped QA due to error" },
                status: 'Failed',
                durationMs: Date.now() - startTime
            }
        };
    }
}
