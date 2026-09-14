import { ai, cleanJsonString, withRetry } from '../generation/modelGateway';

export interface ImageEvaluationParams {
    generatedImageBase64: string;
    heroRawBase64?: string;
    heroDNABase64?: string;
    pageType?: 'Cover' | 'Spread' | string;
    currentTextSide?: 'Right' | 'Left' | string;
    targetPrompt?: string;
    storyText?: string;
    secondRawBase64?: string;
    secondDNABase64?: string;
    childAge?: string | number;
    rawHeroImages?: string[];
    stylizedDnaImages?: string[];
    childDescription?: any;
    stylePrompt?: string;
    spreadNumber?: number;
    isCover?: boolean;
    layoutPlanSide?: any;
    orderId?: string;
    spreadIndex?: number;
    spreadText?: string;
    iterationNumber?: number;
}

export interface QualityCheckResult {
    visualDescription: string;
    likenessScore: number;
    characterConsistencyStatus: 'pass' | 'fail' | 'needs_review';
    characterReasoning: string;
    wardrobeConsistencyStatus: 'pass' | 'fail';
    wardrobeReasoning: string;
    styleConsistencyStatus: 'pass' | 'fail';
    styleReasoning: string;
    textClearanceStatus: 'pass' | 'fail';
    textReasoning: string;
    recommendedTextSide: 'Right' | 'Left';
    recommendedTextOffsetX?: number;
    recommendedTextOffsetY?: number;
    narrativeAdherenceStatus: 'pass' | 'fail';
    narrativeAdherenceReasoning: string;
    overallDecision: 'pass' | 'fail' | 'flagged';
    regenerationReason?: string;
}

export class QualityAgent {
    /**
     * Evaluates a generated illustration against reference photos, style DNA, and story text.
     * Uses a single typed options object to prevent parameter misalignment.
     */
    static async evaluateImage(params: ImageEvaluationParams): Promise<QualityCheckResult> {
        const {
            generatedImageBase64,
            heroRawBase64 = params.rawHeroImages?.[0] || "",
            heroDNABase64 = params.stylizedDnaImages?.[0] || "",
            pageType = params.isCover ? 'Cover' : 'Spread',
            currentTextSide = params.layoutPlanSide || 'Right',
            targetPrompt = params.targetPrompt || "",
            storyText = params.storyText || params.spreadText || "",
            secondRawBase64,
            secondDNABase64,
            childAge = "5"
        } = params;

        return withRetry(async () => {
            console.log(`[QCAgent] Starting evaluation for ${pageType}...`);

            const resolveToBase64 = async (str: string | undefined): Promise<string | undefined> => {
                if (!str) return undefined;
                if (str.startsWith('http://') || str.startsWith('https://')) {
                    try {
                        const resp = await fetch(str);
                        const buf = await resp.arrayBuffer();
                        return Buffer.from(buf).toString('base64');
                    } catch (e) {
                        console.error(`[QCAgent] Failed to fetch image from URL: ${str}`, e);
                        return undefined;
                    }
                }
                return str.replace(/^data:image\/\w+;base64,/, '');
            };

            const isDualHero = !!(secondRawBase64 && secondDNABase64);
            const contents: any[] = [];

            const getMime = (str: string) => {
                if (str?.startsWith('data:image/png') || str?.startsWith('iVBORw')) return 'image/png';
                if (str?.startsWith('data:image/webp') || str?.startsWith('UklGR')) return 'image/webp';
                return 'image/jpeg';
            };

            const [resolvedGen, resolvedHeroRaw, resolvedHeroDNA, resolvedSecondRaw, resolvedSecondDNA] = await Promise.all([
                resolveToBase64(generatedImageBase64),
                resolveToBase64(heroRawBase64),
                resolveToBase64(heroDNABase64),
                resolveToBase64(secondRawBase64),
                resolveToBase64(secondDNABase64),
            ]);

            // Add Generated Image First
            if (resolvedGen) {
                contents.push({ text: "FINAL GENERATED SPREAD IMAGE (To be evaluated):" });
                contents.push({ inlineData: { mimeType: getMime(resolvedGen), data: resolvedGen } });
            }

            // Add Hero A References
            if (resolvedHeroRaw) {
                contents.push({ text: "Hero A RAW PHOTO (Facial geometry & identity anchor):" });
                contents.push({ inlineData: { mimeType: getMime(resolvedHeroRaw), data: resolvedHeroRaw } });
            }
            if (resolvedHeroDNA) {
                contents.push({ text: "Hero A DNA STYLE REFERENCE (Target stylized character design):" });
                contents.push({ inlineData: { mimeType: getMime(resolvedHeroDNA), data: resolvedHeroDNA } });
            }

            if (isDualHero) {
                if (resolvedSecondRaw) {
                    contents.push({ text: "Hero B RAW PHOTO (Secondary character geometry):" });
                    contents.push({ inlineData: { mimeType: getMime(resolvedSecondRaw), data: resolvedSecondRaw } });
                }
                if (resolvedSecondDNA) {
                    contents.push({ text: "Hero B DNA STYLE REFERENCE (Secondary character design):" });
                    contents.push({ inlineData: { mimeType: getMime(resolvedSecondDNA), data: resolvedSecondDNA } });
                }
            }

            const promptContext = `
You are a strict, uncompromising Art Director and Quality Assurance Inspector for a premium personalized children's book publisher.
A parent has paid for a book starring THEIR real child (Age: ${childAge} years old). Character likeness, artistic quality, and story continuity must be exceptional.

Story Text for this Page (${pageType}):
"${storyText || 'N/A'}"

Generation Prompt:
"${targetPrompt || 'N/A'}"

Designated Text Box Side: ${currentTextSide || 'Right'}

EVALUATION CRITERIA:

1. Character Facial Likeness & Identity Integrity (Target Age: ${childAge} years old):
   - Compare facial landmarks between the Reference DNA Image / Raw Photo and the character in the generated spread:
     a) Head & Jaw Shape: Cheek fullness, chin geometry, head proportions.
     b) Eyes & Eyebrows: Eye shape, spacing, eyelid fold, pupil color, eyebrow arch.
     c) Nose & Mouth: Nose bridge/tip width, smile shape.
     d) Hair: Hair color, wave/curl texture, volume, and hairline.
   - Assign a quantitative "likenessScore" from 1 to 10 (10 = identical match, 7-9 = strong likeness with minor pose shifts, 5-6 = acceptable 2D stylized likeness, 1-4 = wrong child or total identity loss).
   - MANDATORY FAIL RULE: Set "characterConsistencyStatus": "fail" and "overallDecision": "fail" if likenessScore is LESS THAN 5/10 or if the character lost the child's identity completely.

2. Wardrobe & Footwear Consistency:
   - Check clothing and footwear consistency across poses (top, pants/shorts, footwear).
   - Set "wardrobeConsistencyStatus": "fail" if there is an unexplained severe outfit contradiction.

3. Style Consistency:
   - Does the illustration match the painterly/storybook art style of the DNA Reference?
   - Fail if it renders as flat clip-art, raw unstyled photograph, or unrendered 3D CGI plastic.

4. Text Zone Clearance:
   - Check if the designated side (${currentTextSide || 'Right'}) is clear of the character's face.
   - If the character is on that side, set "recommendedTextSide" to the opposite side ("Left" or "Right").
   - Text clearance alone should NOT fail the image if simply moving the text to the opposite side provides perfect clearance.

5. Narrative Adherence & Action Matching (CRITICAL):
   - Does the image accurately reflect the story beat, setting, and character action described in the story text?
   - MANDATORY FAIL RULE: If the character is performing the completely wrong action or the scene severely contradicts the story beat, set "narrativeAdherenceStatus": "fail" AND set "overallDecision": "fail" with specific "regenerationReason".

OVERALL DECISION RULES:
- "overallDecision": "pass" -> Character likeness >= 5, style matches, text zone resolved, narrative adheres.
- "overallDecision": "fail" -> Character likeness < 5, severe anatomical/identity loss, corrupted style, or narrative action contradiction requiring repaint.
- "overallDecision": "flagged" -> Ambiguous quality requiring Art Director review.

Output STRICTLY a JSON object matching this schema:
{
  "visualDescription": "Concise 2-sentence description of the generated image.",
  "likenessScore": 8,
  "characterConsistencyStatus": "pass" | "fail",
  "characterReasoning": "Detailed breakdown of face shape, eyes, nose, hair, and score justification...",
  "wardrobeConsistencyStatus": "pass" | "fail",
  "wardrobeReasoning": "Clothing and footwear evaluation...",
  "styleConsistencyStatus": "pass" | "fail",
  "styleReasoning": "Style consistency evaluation...",
  "textClearanceStatus": "pass" | "fail",
  "textReasoning": "Text layout and clearance explanation...",
  "recommendedTextSide": "Right" | "Left",
  "recommendedTextOffsetX": 0,
  "recommendedTextOffsetY": 0,
  "narrativeAdherenceStatus": "pass" | "fail",
  "narrativeAdherenceReasoning": "Detailed action and story adherence evaluation...",
  "overallDecision": "pass" | "fail" | "flagged",
  "regenerationReason": "Clear, specific correction instruction for repainting if failed"
}
`;

            contents.push({ text: promptContext });

            const model = ai().getGenerativeModel({
                model: 'gemini-2.5-flash',
                generationConfig: {
                    temperature: 0.2,
                    responseMimeType: 'application/json'
                }
            });

            const response = await model.generateContent(contents);
            const rawText = response.response.text().trim();
            const cleaned = cleanJsonString(rawText);
            const result: QualityCheckResult = JSON.parse(cleaned);

            // Enforce schema integrity: if likeness < 5 or narrative failed, overall decision cannot be pass
            if (result.likenessScore < 5 || result.characterConsistencyStatus === 'fail' || result.narrativeAdherenceStatus === 'fail') {
                if (result.overallDecision === 'pass') {
                    result.overallDecision = 'fail';
                }
            }

            console.log(`[QCAgent] Spread evaluated. Likeness: ${result.likenessScore}/10, Narrative: ${result.narrativeAdherenceStatus}, Decision: ${result.overallDecision}`);
            return result;

        }, 2, 4000, {
            visualDescription: "Vision QA evaluation fallback due to timeout or transient error.",
            likenessScore: 5,
            characterConsistencyStatus: 'needs_review',
            characterReasoning: 'QA agent encountered transient vision timeout/error during automated check.',
            wardrobeConsistencyStatus: 'pass',
            wardrobeReasoning: 'Default fallback applied.',
            styleConsistencyStatus: 'pass',
            styleReasoning: 'Default fallback applied.',
            textClearanceStatus: 'pass',
            textReasoning: 'Default right-side clearance applied.',
            recommendedTextSide: (currentTextSide === 'Left' ? 'Left' : 'Right'),
            recommendedTextOffsetX: 0,
            recommendedTextOffsetY: 0,
            narrativeAdherenceStatus: 'pass',
            narrativeAdherenceReasoning: 'Default fallback applied.',
            overallDecision: 'flagged',
            regenerationReason: 'Transient QA error. Flagged for review.'
        });
    }
}
