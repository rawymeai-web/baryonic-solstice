import { ai, cleanJsonString, withRetry } from '../generation/modelGateway';
import { StoryBlueprint, WorkflowLog, StyleProfile, HeroProfile } from '../../types';

export type QAPatch = {
    path: string;
    issue: string;
    replacement: string;
    severity: "low" | "medium" | "high";
};

export async function runIllustratorPass(
    prompts: { spreadNumber: number, imagePrompt: string, storyText: string, textSide?: string, mainContentSide?: string }[],
    blueprint: StoryBlueprint | undefined,
    styleProfile: StyleProfile,
    heroes: HeroProfile[]
): Promise<{ result: { spreadNumber: number, imagePrompt: string, storyText: string, textSide?: string, mainContentSide?: string }[], log: WorkflowLog }> {

    const startTime = Date.now();

    try {
        return await withRetry(async () => {
            const promptInstruction = `
            ROLE: Visual Prompt QA Agent — RESTRICTED SCOPE (v5.2 DNA-Only Pipeline).
            
            TASK: Audit final image prompts for TWO things ONLY:
            1. Typography risks: props or objects that could cause readable text to be generated.
            2. Unnamed extra characters: scene descriptions that mention unnamed people beyond the registered heroes.

            **REGISTERED HERO TOKENS:**
            ${JSON.stringify(heroes.map(h => h.token))}

            **THE ASSEMBLED PROMPTS TO AUDIT:**
            ${JSON.stringify(prompts)}
            
            **WHAT YOU MAY PATCH:**
            - Props with text risk but no explicit "no readable text" instruction.
            - Scene descriptions that mention unnamed characters — fix by replacing with "the surrounding environment" or removing.

            **FORBIDDEN ACTIONS — DO NOT DO ANY OF THESE:**
            - Do not modify the hero reference paragraph (any sentence starting with "Image N is the approved...").
            - Do not change the style instruction.
            - Do not change which side has the action zone or negative space.
            - Do not reassign hero tokens ([[HERO_1]], [[HERO_2]], etc.).
            - Do not rewrite the full prompt.
            - Do not add new hero descriptions.
            - Do not change face, outfit, or identity rules.

            If a prompt has no typography risk and no unnamed character problems — return empty patches for that spread.

            OUTPUT JSON SCHEMA (only this, no other output):
            [
                { 
                  "spreadNumber": 1, 
                  "patches": [
                    {
                      "path": "string_replace",
                      "issue": "Compass prop has no no-readable-text instruction.",
                      "replacement": "Compass prop has no no-readable-text instruction. No readable text.",
                      "severity": "high"
                    }
                  ]
                }
            ]
            
            CRITICAL INSTRUCTION FOR STRING REPLACEMENT:
            - Because the prompts are plain text, you MUST provide the EXACT existing sentence or phrase you want to modify in the \`issue\` field.
            - You MUST provide the FULL modified sentence in the \`replacement\` field.
            - Do NOT provide the entire prompt. Only the specific sentence being fixed.
            `;


            const model = ai().getGenerativeModel({
                model: 'gemini-2.5-flash',
                generationConfig: { responseMimeType: "application/json" }
            });

            const response = await model.generateContent(promptInstruction, { timeout: 15000 });
            const qaResults = JSON.parse(cleanJsonString(response.response.text()));

            if (!Array.isArray(qaResults)) {
                throw new Error("Illustrator returned invalid QA patches format.");
            }

            let appliedPatchCount = 0;

            const finalResults = prompts.map(prompt => {
                const qaData = qaResults.find((q: any) => q.spreadNumber === prompt.spreadNumber);
                if (!qaData || !qaData.patches || qaData.patches.length === 0) {
                    return prompt;
                }

                let currentPromptText = prompt.imagePrompt;

                qaData.patches.forEach((patch: QAPatch) => {
                    try {
                        // 1. Try to parse as JSON for structural patching
                        let promptJson: any = null;
                        try {
                            promptJson = JSON.parse(currentPromptText);
                        } catch {
                            // Not JSON, that's fine for v6.0 strings
                        }

                        if (promptJson && typeof promptJson === 'object') {
                            const pathParts = patch.path.match(/([^\.\[\]]+)/g);
                            if (pathParts) {
                                let target = promptJson;
                                for (let i = 0; i < pathParts.length - 1; i++) {
                                    const part = pathParts[i];
                                    const isArrayIndex = !isNaN(Number(part));
                                    target = target[isArrayIndex ? Number(part) : part];
                                }
                                const lastPart = pathParts[pathParts.length - 1];
                                const isLastArrayIndex = !isNaN(Number(lastPart));
                                target[isLastArrayIndex ? Number(lastPart) : lastPart] = patch.replacement;
                                currentPromptText = JSON.stringify(promptJson, null, 2);
                                appliedPatchCount++;
                            }
                        } else {
                            // 2. Not JSON. We ONLY do targeted string replacement.
                            // The AI provides the exact substring it wants to replace in 'issue'
                            // and the new substring in 'replacement'.
                            // We completely disable full-string overwrites to prevent the AI from 
                            // accidentally deleting the entire prompt and replacing it with a fragment.
                            if (patch.issue && currentPromptText.includes(patch.issue)) {
                                currentPromptText = currentPromptText.replace(patch.issue, patch.replacement);
                                appliedPatchCount++;
                            } else {
                                console.warn("QA Patch issue string not found in prompt. Skipping patch.", patch.issue);
                            }
                        }

                    } catch (e) {
                        console.warn("Failed to apply patch:", patch, e);
                    }
                });

                return { ...prompt, imagePrompt: currentPromptText };
            });

            return {
                result: finalResults,
                log: {
                    stage: 'QA',
                    timestamp: startTime,
                    inputs: { promptCount: prompts.length },
                    outputs: { auditedCount: finalResults.length, patchesApplied: appliedPatchCount },
                    status: 'Success',
                    durationMs: Date.now() - startTime
                }
            };
        }, 1, 2000);
    } catch (e: any) {
        console.error("Illustrator Agent Failed, falling back to original prompts:", e);
        return {
            result: prompts,
            log: {
                stage: 'QA',
                timestamp: startTime,
                inputs: {},
                outputs: { error: e.message, fallback: true },
                status: 'Failed',
                durationMs: Date.now() - startTime
            }
        };
    }
}
