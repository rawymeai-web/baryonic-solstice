import { ai, cleanJsonString, withRetry } from '../generation/modelGateway';

export interface QualityCheckResult {
    characterConsistencyStatus: 'pass' | 'fail';
    characterReasoning: string;
    styleConsistencyStatus: 'pass' | 'fail';
    styleReasoning: string;
    textClearanceStatus: 'pass' | 'fail';
    textReasoning: string;
    recommendedTextSide: 'Right' | 'Left';
    overallDecision: 'pass' | 'fail' | 'flagged';
}

export class QualityAgent {
    /**
     * Evaluates a generated image against reference images and layout constraints.
     */
    static async evaluateImage(
        generatedImageBase64: string,
        heroRawBase64: string,
        heroDNABase64: string,
        pageType: 'Cover' | 'Spread',
        currentTextSide: 'Right' | 'Left' | string,
        secondRawBase64?: string,
        secondDNABase64?: string
    ): Promise<QualityCheckResult> {
        return withRetry(async () => {
            console.log(`[QCAgent] Starting evaluation for ${pageType}...`);

            const isDualHero = !!(secondRawBase64 && secondDNABase64);

            const contents: any[] = [];

            // Add Generated Image First
            contents.push({ inlineData: { mimeType: 'image/jpeg', data: generatedImageBase64 } });
            
            // Add Hero A References
            contents.push({ inlineData: { mimeType: 'image/jpeg', data: heroRawBase64 } });
            contents.push({ inlineData: { mimeType: 'image/jpeg', data: heroDNABase64 } });

            let promptContext = `
**TASK:** You are an elite Art Director and Quality Assurance Agent for a personalized children's book.
Your job is to evaluate the GENERATED IMAGE (Image 1) against the provided reference photos to ensure strict quality standards.

**REFERENCE INPUTS:**
- **Image 1:** The newly generated image that needs to be evaluated.
- **Image 2:** RAW PHOTO of Hero A (Provides strict facial geometry and identity).
- **Image 3:** DNA WATERCOLOR of Hero A (Provides the target art style).
`;

            if (isDualHero) {
                contents.push({ inlineData: { mimeType: 'image/jpeg', data: secondRawBase64 } });
                contents.push({ inlineData: { mimeType: 'image/jpeg', data: secondDNABase64 } });
                promptContext += `
- **Image 4:** RAW PHOTO of Hero B (Facial geometry).
- **Image 5:** DNA WATERCOLOR of Hero B (Target art style).
`;
            }

            promptContext += `
**PAGE TYPE:** ${pageType}
**CURRENT TEXT BOX SIDE:** ${currentTextSide || 'Right'}

**EVALUATION CRITERIA:**
1. **Character Consistency:** Does the character(s) in Image 1 perfectly match the bone structure, facial geometry, and identity of the RAW PHOTO(s)? (Ignore style, focus on identity).
2. **Style Consistency:** Does Image 1 match the watercolor/painterly art style shown in the DNA WATERCOLOR image(s)? 
3. **Text Clearance:** A large text box will be placed on the ${currentTextSide || 'Right'} side of the image. 
   - Is there enough empty "negative space" on the ${currentTextSide || 'Right'} side for text?
   - Will the text box cover the character's face or the main action? 
   - If the current side is bad, would the other side be better?

**MANDATE:** Output your evaluation strictly as a JSON object following this exact schema:
{
  "characterConsistencyStatus": "pass" | "fail",
  "characterReasoning": "Why it passes or fails...",
  "styleConsistencyStatus": "pass" | "fail",
  "styleReasoning": "Why it passes or fails...",
  "textClearanceStatus": "pass" | "fail",
  "textReasoning": "Explain if the text box will cover important elements...",
  "recommendedTextSide": "Right" | "Left",
  "overallDecision": "pass" | "fail"
}

- For \`overallDecision\`, if any of the three statuses are "fail", the overall decision MUST be "fail".
- Output ONLY valid JSON. No markdown formatting.
`;

            contents.push({ text: promptContext });

            const model = ai().getGenerativeModel({
                model: 'gemini-2.5-pro', // Vision capable model for analysis
                generationConfig: { responseMimeType: 'application/json' }
            });

            const response = await model.generateContent(contents);
            const rawText = response.response.text().trim();
            const cleaned = cleanJsonString(rawText);
            
            const result: QualityCheckResult = JSON.parse(cleaned);

            console.log(`[QCAgent] Evaluation completed. Decision: ${result.overallDecision}`);
            return result;

        }, 2, 5000, null as any);
    }
}
