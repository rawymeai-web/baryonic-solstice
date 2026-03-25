
import { ai, cleanJsonString, withRetry } from '../generation/modelGateway';
import { WorkflowLog } from '../../types';

export async function runQualityAssurance(
    prompts: { spreadNumber: number, imagePrompt: string, storyText: string }[]
): Promise<{ result: { spreadNumber: number, imagePrompt: string, storyText: string }[], log: WorkflowLog }> {

    const startTime = Date.now();

    try {
        return await withRetry(async () => {
            const prompt = `
            ROLE: Safety & Quality Inspector.
            TASK: Review the following image prompts.
    
            RULES:
            1. No "Text", "Sign", "Label", "Book" keywords that imply written text.
            2. No "Split screen" or "Comic panel".
            3. No "Parents" (Mom/Dad) unless explicitly allowed (assume NO).
            4. **CONTINUATION & SAFETY CHECKLIST (CRITICAL):**
               - **Time/Location:** Do the settings flow logically? 
               - **Subject Logic:** Does the active action highlight match the story progression?
               - **Safety:** ABSOLUTELY NO skulls, skeletons, weapons, scary monsters, rainbows, or real-world family members. Rewrite these into kid-friendly fictional adventure items.
            
            PROMPTS:
            ${JSON.stringify(prompts.map(p => p.imagePrompt))}
    
            ACTION:
            - If a prompt violates a rule, REWRITE it to be safe.
            - If safe, keep it.
    
            OUTPUT JSON:
            [ "Safe Prompt 1", ... ]
            `;

            const model = ai().getGenerativeModel({
                model: 'gemini-2.0-flash',
                generationConfig: { responseMimeType: "application/json" }
            });

            const response = await model.generateContent(prompt);
            const responseText = response.response.text();
            if (!responseText) throw new Error("QA response empty");

            let safePrompts = JSON.parse(cleanJsonString(responseText));

            // Safety: If AI wraps it in an object like { "prompts": [...] }
            if (!Array.isArray(safePrompts) && typeof safePrompts === 'object') {
                const possibleArray = Object.values(safePrompts).find(v => Array.isArray(v));
                if (possibleArray) safePrompts = possibleArray;
            }

            // Final fallback: if still not an array, throw to trigger catch-block logic
            if (!Array.isArray(safePrompts)) throw new Error("QA failed to return array");

            // Re-pair with original metadata
            const finalPrompts = prompts.map((original, idx) => ({
                ...original,
                imagePrompt: safePrompts[idx] || original.imagePrompt
            }));

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
