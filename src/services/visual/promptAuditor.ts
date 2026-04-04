
import { ai, cleanJsonString, withRetry } from '../generation/modelGateway';
import { StoryBlueprint } from '../../types';

/**
 * PHASE 4.5 — PROMPT AUDITOR AGENT
 * 
 * Runs a lightweight text-only pass on the assembled JSON prompt
 * BEFORE it is dispatched to the image generation model.
 * 
 * It cross-checks the assembled prompt against the source Blueprint spread
 * and corrects any discrepancies in-place (emotion, environment, time, token leakage).
 * 
 * This agent does NOT regenerate from scratch — it only performs targeted corrections.
 * A gemini-2.0-flash call costs < 2 seconds, making it low-overhead.
 */
export async function auditPromptJson(
    blueprintSpread: StoryBlueprint['structure']['spreads'][0],
    assembledPrompt: string,
    childName: string
): Promise<{ audited_prompt: string; audit_log: string[] }> {
    
    // If there's no blueprint spread to check against, skip audit and return as-is
    if (!blueprintSpread) {
        return { audited_prompt: assembledPrompt, audit_log: ['No blueprint spread provided — audit skipped.'] };
    }

    return withRetry(async () => {
        const model = ai().getGenerativeModel({
            model: 'gemini-2.0-flash',
            generationConfig: { responseMimeType: 'application/json' }
        });

        const auditPrompt = `
ROLE: Visual Continuity Auditor for a children's book illustration pipeline.

TASK: You are reviewing an assembled image generation prompt (a JSON blob wrapped in instructions) 
to verify it matches the "Source of Truth" blueprint spread below. 
If you find discrepancies, correct them in-place in the prompt text.
Do NOT rewrite the prompt from scratch. Only fix what is wrong.

BLUEPRINT SOURCE OF TRUTH (Spread ${blueprintSpread.spreadNumber}):
- emotionalBeat: "${blueprintSpread.emotionalBeat}"
- highlightAction: "${blueprintSpread.highlightAction || ''}"
- environmentType: "${blueprintSpread.environmentType}"
- timeOfDay: "${blueprintSpread.timeOfDay}"
- specificLocation: "${blueprintSpread.specificLocation || ''}"
- narrative: "${blueprintSpread.narrative || ''}"

CHILD'S REAL NAME (must NOT appear in the prompt): "${childName}"

ASSEMBLED PROMPT TO AUDIT:
${assembledPrompt}

AUDIT CHECKS TO PERFORM:
1. TOKEN LEAK: Does the prompt contain "${childName}" anywhere? If yes, replace all occurrences with [[HERO_A]].
2. ENVIRONMENT MATCH: Does the environment_type in the JSON match "${blueprintSpread.environmentType}"? Correct if not.
3. TIME MATCH: Does time_of_day in the JSON match "${blueprintSpread.timeOfDay}"? Correct if not.
4. EMOTION CONSISTENCY: Is the emotion field in the first entity inside current_variables descriptive and matching the "${blueprintSpread.emotionalBeat}" beat? If it is missing or generic, fill it in with a specific facial/body description.
5. ACTION ACCURACY: Does the pose_action in the first entity reflect "${blueprintSpread.highlightAction || blueprintSpread.narrative || ''}"? If the action is vague or contradictory, sharpen it.

OUTPUT FORMAT (strict JSON):
{
  "audited_prompt": "The full corrected prompt string (with any fixes applied inline)",
  "audit_log": ["Fix 1 applied: ...", "Fix 2 applied: ...", "No issues found in check X."]
}

If no changes were needed for a check, note it in the audit_log as "No change needed — [check] validated."
Output ONLY valid JSON. No markdown.`;

        try {
            const response = await model.generateContent(auditPrompt);
            const rawText = response.response.text().trim();
            let cleaned = rawText;
            if (cleaned.startsWith('```json')) cleaned = cleaned.replace(/^```json\n/, '').replace(/\n```$/, '');
            else if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```\n/, '').replace(/\n```$/, '');
            
            const result = JSON.parse(cleaned);
            
            if (!result.audited_prompt || !Array.isArray(result.audit_log)) {
                // Malformed response — return original
                return { 
                    audited_prompt: assembledPrompt, 
                    audit_log: ['Auditor returned malformed response — original prompt preserved.'] 
                };
            }
            
            return {
                audited_prompt: result.audited_prompt,
                audit_log: result.audit_log
            };
        } catch (e: any) {
            // On any auditor failure, return the original prompt untouched
            // so the pipeline degrades gracefully rather than failing hard
            console.warn('[PromptAuditor] Audit failed, using original prompt:', e.message);
            return { 
                audited_prompt: assembledPrompt, 
                audit_log: [`Auditor error — original prompt preserved: ${e.message}`] 
            };
        }
    }, 1, 2000, { audited_prompt: assembledPrompt, audit_log: ['Auditor timed out — original prompt preserved.'] });
}
