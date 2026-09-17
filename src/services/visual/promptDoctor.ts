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
1. CHARACTER LIKENESS, AGE & ANATOMICAL SCALE:
   - If QA reported the hero looks too old/mature, enforce: "${input.childAge || '4'}-year-old child matching the facial geometry, head proportions, and youthful appearance in Image 1. Strictly avoid any mature, sharp, or elongated adult facial features."
   - If QA reported stylization drift, distorted eye scale, or caricature, mandate: "Maintain exact 1:1 facial feature proportions and anatomical eye scale from Image 1. Do not alter stylization depth, exaggerate eye size, or introduce caricature."
   - If QA reported wrong hair color or texture (e.g. hair too dark/black), explicitly mandate the exact color/texture matching Image 1.
   - If QA reported wrong clothing, explicitly lock the exact outfit from the reference image.

2. NARRATIVE & ACTION ACCURACY:
   - Ensure every essential narrative action from the story text is explicitly staged.
   - Eliminate vague or contradictory action descriptions.

3. COMPOSITION & VERTICAL CLEARANCE:
   - If designated text side is "left", all characters, primary props, and action MUST be positioned strictly on the RIGHT half (confined within the lower 45-50% of the canvas, showing full body with feet on the ground).
   - Left side MUST remain open, peaceful, soft ambient negative space with zero character figures or focal clutter.
   - The top 50% of the canvas must remain expansive, open negative space (sky, ceiling, atmosphere) for generous vertical headroom, and the character's head must stay strictly below the 45% horizontal midline.

4. ART STYLE & MEDIUM FIDELITY:
   - Reinforce the locked art style: ${input.styleGuide || 'Approved Book Style'}.
   - Analyze the specific medium or stylization drift reported in QA diagnostics (e.g., unwanted 3D CGI plastic, unauthorized 2D vector flattening, photographic artifacts, or caricatured features).
   - Surgically mandate the target medium and surface textures matching Image 1 while explicitly forbidding the observed drift.
   - Forbid text, letters, watermarks, numbers, or decorative borders.

OUTPUT FORMAT:
Return ONLY a valid JSON object matching this exact schema:
{
  "identifiedIssues": ["list of specific defects found by QA"],
  "surgicalFixes": ["list of exact changes made in the new prompt"],
  "explanation": "concise summary of why this prompt will succeed",
  "refinedPrompt": "The complete, standalone, production-ready prompt starting with [v7.8-style-dna-lock]..."
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
