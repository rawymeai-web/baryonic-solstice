import { ai, withRetry, cleanJsonString } from '../generation/modelGateway';
import { ServerLogger } from '@/utils/serverLogger';

export interface PromptDoctorInput {
    originalPrompt: string;
    storyText?: string;
    characterDescription?: string;
    childAge?: string;
    styleGuide?: string;
    qcResult: {
        likenessScore?: number;
        characterConsistencyStatus?: string;
        characterReasoning?: string;
        styleConsistencyStatus?: string;
        styleReasoning?: string;
        narrativeAdherenceStatus?: string;
        textClearanceStatus?: string;
        textReasoning?: string;
        recommendedTextSide?: string;
        visualDescription?: string;
    };
    attemptNumber?: number;
}

export interface PromptDoctorOutput {
    refinedPrompt: string;
    identifiedIssues: string[];
    surgicalFixes: string[];
    explanation: string;
}

export class PromptDoctor {
    /**
     * Refines a generation prompt based on detailed QA diagnostics from failed attempts.
     */
    static async refinePrompt(input: PromptDoctorInput): Promise<PromptDoctorOutput> {
        return withRetry(async () => {
            const model = ai().getGenerativeModel({
                model: 'gemini-2.5-flash',
                generationConfig: {
                    responseMimeType: 'application/json',
                    temperature: 0.2, // Low temperature for precise, surgical corrections
                }
            });

            const systemInstruction = `You are the Lead Art Director and Master Prompt Engineer for a high-end personalized children's picture book platform.

YOUR MISSION:
A previous image generation attempt failed Quality Assurance (QA). You must analyze the exact QA failure diagnostics, identify every defect, and rewrite the image generation prompt to surgically eliminate all defects on the next generation attempt.

KEY CORRECTION RULES:
1. CHARACTER LIKENESS, AGE & HAIR COLOR:
   - If QA reported the hero looks too old/mature, enforce: "Cute [AGE]-year-old child with soft rounded chubby cheeks, large innocent curious eyes, small rounded nose, and sweet childish proportions. Strictly avoid any mature, sharp, or elongated adult facial features."
   - If QA reported wrong hair color or texture (e.g. hair too dark/black), explicitly mandate the exact color: "Short, soft curly warm medium/light-brown hair matching Image 1 exactly. NOT dark brown or black hair."
   - If QA reported wrong clothing (e.g. solid shirt instead of patterned), explicitly lock: "Must strictly wear the cream/off-white t-shirt with colorful all-over cartoon pattern, blue shorts, and dark sneakers with white soles."

2. NARRATIVE & ACTION ACCURACY:
   - Ensure every essential narrative action from the story text is explicitly staged (e.g. "walking hand-in-hand with an adult's hand at his side", "pebble glowing in pocket").
   - Eliminate vague or contradictory action descriptions.

3. COMPOSITION & TEXT CLEARANCE:
   - If designated text side is "left", all characters, primary props, and action MUST be positioned strictly on the RIGHT half (within the lower 60% of the canvas).
   - Left side MUST remain open, peaceful, soft ambient negative space with zero character figures or focal clutter.
   - The top 20% of the canvas must remain clear for headroom.

4. ART STYLE CONSISTENCY:
   - Reinforce the locked art style: ${input.styleGuide || 'Dreamy Realism'}.
   - Forbid flat cartoon vectors, unrendered 3D plastic CGI, text, letters, watermarks, or borders.

OUTPUT FORMAT:
Return ONLY a valid JSON object matching this exact schema:
{
  "identifiedIssues": ["list of specific defects found by QA"],
  "surgicalFixes": ["list of exact changes made in the new prompt"],
  "explanation": "concise summary of why this prompt will succeed",
  "refinedPrompt": "The complete, standalone, production-ready prompt starting with [v7.6-actor-placement]..."
}`;

            const promptText = `
ORIGINAL PROMPT:
${input.originalPrompt}

STORY TEXT FOR SPREAD:
"${input.storyText || 'N/A'}"

CHILD AGE: ${input.childAge || '4'}
CHARACTER IDENTITY DESCRIPTION: ${input.characterDescription || 'N/A'}
ART STYLE: ${input.styleGuide || 'Dreamy Realism'}

QA DIAGNOSTIC REPORT (FAILED ATTEMPT #${input.attemptNumber || 2}):
- Likeness Score: ${input.qcResult.likenessScore || 'N/A'}/10
- Character Consistency: ${input.qcResult.characterConsistencyStatus} (${input.qcResult.characterReasoning})
- Style Consistency: ${input.qcResult.styleConsistencyStatus} (${input.qcResult.styleReasoning})
- Narrative Adherence: ${input.qcResult.narrativeAdherenceStatus}
- Text Clearance: ${input.qcResult.textClearanceStatus} (${input.qcResult.textReasoning})
- Recommended Text Side: ${input.qcResult.recommendedTextSide || 'left'}
- What was actually rendered in the failed image: ${input.qcResult.visualDescription || 'N/A'}

Rewrite the prompt into an airtight, perfect prompt that eliminates every single one of the above flaws.`;

            ServerLogger.log('PROMPT_DOCTOR_INVOKED', {
                attemptNumber: input.attemptNumber,
                likenessScore: input.qcResult.likenessScore,
                characterReasoning: input.qcResult.characterReasoning?.substring(0, 150)
            });

            const response = await model.generateContent([
                { text: systemInstruction },
                { text: promptText }
            ]);

            const rawJson = cleanJsonString(response.response.text());
            const parsed: PromptDoctorOutput = JSON.parse(rawJson);

            ServerLogger.log('PROMPT_DOCTOR_SUCCESS', {
                identifiedIssuesCount: parsed.identifiedIssues?.length,
                refinedPromptLength: parsed.refinedPrompt?.length
            });

            return parsed;
        }, 3, 2000);
    }
}
