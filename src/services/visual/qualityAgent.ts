import { ai, cleanJsonString, withRetry } from '../generation/modelGateway';

export interface QualityCheckResult {
    visualDescription: string;
    characterConsistencyStatus: 'pass' | 'fail';
    characterReasoning: string;
    styleConsistencyStatus: 'pass' | 'fail';
    styleReasoning: string;
    textClearanceStatus: 'pass' | 'fail';
    textReasoning: string;
    recommendedTextSide: 'Right' | 'Left';
    overallDecision: 'pass' | 'fail' | 'flagged';
    narrativeAdherenceStatus?: 'pass' | 'fail';
    narrativeAdherenceReasoning?: string;
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
        targetPrompt: string,
        storyText: string = "",
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
Your job is to evaluate the GENERATED IMAGE (Image 1) against the provided reference photos and story narrative to ensure strict quality standards.

**REFERENCE INPUTS:**
- **Image 1:** The newly generated image that needs to be evaluated.
- **Image 2:** RAW PHOTO of Hero A (Provides strict facial geometry and identity).
- **Image 3:** DNA STYLE REFERENCE of Hero A (Provides the target art style).
`;

            if (isDualHero) {
                contents.push({ inlineData: { mimeType: 'image/jpeg', data: secondRawBase64 } });
                contents.push({ inlineData: { mimeType: 'image/jpeg', data: secondDNABase64 } });
                promptContext += `
- **Image 4:** RAW PHOTO of Hero B (Facial geometry).
- **Image 5:** DNA STYLE REFERENCE of Hero B (Target art style).
`;
            }

            promptContext += `
**PAGE TYPE:** ${pageType}
**CURRENT TEXT BOX SIDE:** ${currentTextSide || 'Right'}
**STORY NARRATIVE:** ${storyText || 'N/A'}

**EVALUATION CRITERIA:**
1. **Character Consistency:** Compare facial features (jaw/cheek fullness, eye shape, nose width, hair color/texture). Mark characterConsistencyStatus as "fail" ONLY if the character clearly lost the child's identity or is an entirely different person. Reasonable variations due to 2D stylized artistic interpretation or action poses should PASS.
2. **Wardrobe & Attire Consistency:** Does the character's clothing and shoes generally match the reference? Fail only if there is an unexplained major contradiction.
3. **Style Consistency:** Does Image 1 match the painterly/storybook art style of the DNA REFERENCE? Fail only if it renders as flat clip-art, raw photo, or plastic 3D.
4. **Text Clearance:** A text box is placed on the ${currentTextSide || 'Right'} side of the image. 
   - If the character or primary action is on that side, recommend the opposite side in recommendedTextSide.
   - Text clearance alone should NOT trigger an overall image failure if simply moving the text to the other side resolves it.
5. **Narrative Adherence:** Does the generated image generally reflect the story action and scene?

**MANDATE:** Output your evaluation strictly as a JSON object following this exact schema:
{
  "visualDescription": "Write a concise 2-sentence description of what is depicted in Image 1.",
  "characterConsistencyStatus": "pass" | "fail",
  "characterReasoning": "Why it passes or fails...",
  "styleConsistencyStatus": "pass" | "fail",
  "styleReasoning": "Why it passes or fails...",
  "textClearanceStatus": "pass" | "fail",
  "textReasoning": "Explain if the text box has clearance or needs side change...",
  "recommendedTextSide": "Right" | "Left",
  "narrativeAdherenceStatus": "pass" | "fail",
  "narrativeAdherenceReasoning": "Detailed reason why it passes or fails the narrative check.",
  "overallDecision": "pass" | "fail"
}

- For overallDecision, mark "fail" only if character likeness or style has a severe defect requiring complete image regeneration. If only text placement needs adjusting, mark "pass" with the corrected recommendedTextSide.
- Output ONLY valid JSON. No markdown formatting.
`;

            contents.push({ text: promptContext });

            const model = ai().getGenerativeModel({
                model: 'gemini-2.5-flash', // Vision capable model for analysis
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
