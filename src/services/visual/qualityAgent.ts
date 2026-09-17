import { ai, cleanJsonString, withRetry } from '../generation/modelGateway';
import { extractBiometrics } from './promptEngineer';

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
            childAge = "5",
            stylePrompt = params.stylePrompt || ""
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

            const biometrics = extractBiometrics(params.childDescription || targetPrompt);

            const promptContext = `
You are the child's PARENT and a world-class, uncompromising Art Director inspecting a personalized storybook.
A parent has paid a premium for a custom keepsake starring THEIR specific child (Target Age: ${childAge} years old).

MANDATORY BIOMETRIC TARGET PROFILE:
- Target Age: ${childAge} years old
- Mandatory Eye Color: ${biometrics.eyeColor}
- Mandatory Hair Color & Style: ${biometrics.hairColor} (${biometrics.hairStyle})
- Mandatory Skin Tone: ${biometrics.skinTone}

CRITICAL MINDSET — THE PARENT EYE TEST:
Look at the generated character in the spread and compare them side-by-side with the Reference DNA Image / Raw Photo and the Mandatory Biometric Profile.
Ask yourself the fundamental parent question:
"Is this unmistakably MY child, or does this look like a different kid / stranger?"
If a parent would say "That is not my child!", "Why does his haircut look completely different?", "Why are his eyes green when his eyes are dark brown?", "Why does he look 12 instead of 6?", or "Why is his skin color different?", you MUST FAIL the image immediately. Do NOT be polite, agreeable, or lenient. Generic "it's a boy with dark curly hair" is NOT acceptable likeness.

Story Text for this Page (${pageType}):
"${storyText || 'N/A'}"

Generation Prompt:
"${targetPrompt || 'N/A'}"

Designated Text Box Side: ${currentTextSide || 'Right'}

STRICT BIOMETRIC & ARTISTIC EVALUATION CRITERIA:

1. Facial Likeness, Feature Proportions & Biometric Color Integrity (Weight: CRITICAL):
   - Eye Color Integrity: Look closely at the character's irises/eyes in the generated image. If the target is Dark Brown (${biometrics.eyeColor}), but the generated character has GREEN, HAZEL, LIGHT BROWN, AMBER, or BLUE eyes (even if caused by lighting or lantern glow reflections), this is an UNACCEPTABLE identity hallucination.
     -> You MUST set "characterConsistencyStatus": "fail", "likenessScore": 4, and "overallDecision": "fail".
     -> Specify in "regenerationReason": "Biometric Failure: Character rendered with incorrect eye color instead of mandatory ${biometrics.eyeColor}. Eyes must be deep ${biometrics.eyeColor}."
   - Hair Color & Cut Integrity: Hair color MUST match ${biometrics.hairColor} (${biometrics.hairStyle}). If hair appears noticeably lightened (e.g. reddish, strawberry blonde, light brown) when target is Dark Brown, or if the haircut mutates into an unprompted fade/undercut when reference is curly/wavy, you MUST set "characterConsistencyStatus": "fail" and "overallDecision": "fail".
   - Head & Facial Geometry: Does the jawline, chin shape, cheek fullness, and eye spacing match the reference?
   - Eye Shape & Feature Proportions: Are the eye contour, pupil color, and brow arch preserved? Compare the eye-to-face proportion scale directly against the DNA reference.
   - FORBIDDEN STYLIZATION MUTATION: The character must NOT undergo unprompted stylization drift (e.g., a realistic child drifting into exaggerated cartoon/doll eyes, or a stylized animated character drifting into photographic realism).
   - Scoring Guide:
     * 9-10: Flawless, unmistakable identity match to the reference child with accurate anatomical/stylization scale and exact eye/hair colors.
     * 7-8: Clear, recognizable likeness with natural expression adaptation and accurate biometrics.
     * 5-6: Generic caricature, distorted proportions, mutated eye/hair colors, or stylization drift — FAILS parent recognition.
     * 1-4: Wrong child, imposter, or complete identity loss.
   - MANDATORY FAIL RULE: Any score below 7/10 or any eye/hair color shift is an AUTOMATIC FAIL.

2. Haircut Silhouette & Hair Texture Invariance (Weight: CRITICAL):
   - Hair Structure: Wave/curl pattern, volume, hairline, and side coverage MUST match the DNA reference.
   - FORBIDDEN MUTATIONS: If the reference has full curls covering the sides and ears, the character MUST NOT be rendered with a modern high-fade, undercut, taper, buzzed sides, or slicked-back styling.
   - MANDATORY FAIL RULE: If the haircut type, side length, or hair texture contradicts the reference, set "characterConsistencyStatus": "fail" and "overallDecision": "fail".

3. Age Invariance (Target Age: ${childAge} years old):
   - The character MUST visually read as a child of ${childAge} years old.
   - FORBIDDEN AGING: The character must NOT be aged up into an older kid / pre-teen / teenager (e.g. elongated torso, angular adult jaw, mature posture) or de-aged into a toddler.
   - MANDATORY FAIL RULE: If the character appears >2 years older or younger than ${childAge}, set "characterConsistencyStatus": "fail" and "overallDecision": "fail".

4. Skin Tone & Ethnic Feature Integrity (Weight: CRITICAL):
   - Compare skin tone, undertone, and complexion directly to the DNA reference and raw photo.
   - FORBIDDEN: Any unprompted lightening/bleaching, unnatural oversaturation, or darkening that alters the child's racial/ethnic heritage.
   - MANDATORY FAIL RULE: If the skin tone or ethnic features do not match the reference, set "characterConsistencyStatus": "fail" and "overallDecision": "fail".

5. Wardrobe & Footwear Consistency:
   - Check clothing consistency across scenes against the reference outfit.
   - Fail if there is an unprompted, radical outfit contradiction.

6. Style, Medium & Dimensionality Consistency (Weight: CRITICAL):
   - Target Style Profile: ${stylePrompt || 'Defined by DNA Reference Image'}
   - Compare the artistic medium, rendering dimensionality (2D painterly vs 3D CGI vs vector vs photographic), surface brushwork/textures, and lighting model directly against the DNA Reference Image and the Target Style.
   - FORBIDDEN STYLE DRIFT: The generated image must strictly adhere to the established artistic medium and stylization level of the DNA Reference. It must NOT drift into contrasting artistic media or incompatible stylization levels (e.g., painterly realism shifting to 3D CGI plastic or flat vector, 3D animated shifting to flat 2D or realistic photo, watercolor shifting to digital glossy CGI).
   - MANDATORY FAIL RULE: If the illustration mutates into a contrasting artistic medium or different dimensionality/stylization level, set "styleConsistencyStatus": "fail", "overallDecision": "fail", and specify the exact observed drift and target requirement in "regenerationReason" (e.g., "Style drifted into [Observed Style] with [Observed Deviations]; must strictly match the [Target Style] and anatomical scale of the DNA Reference Image").

7. Text Zone Clearance:
   - Check if the designated side (${currentTextSide || 'Right'}) is clear of the character's face.
   - If the character is on that side, recommend the opposite side ("Left" or "Right").

8. Narrative Adherence & Action Matching:
   - Does the image accurately reflect the story action and mood described in the story text?

OVERALL DECISION RULES:
- "overallDecision": "pass" -> Likeness >= 7, haircut matches reference, age matches ${childAge}, skin tone matches, style matches, narrative adheres.
- "overallDecision": "fail" -> Any failure in likeness (< 7), haircut mutation (fade/undercut when curls), age shift, skin tone shift, corrupted style, or narrative contradiction.
- "overallDecision": "flagged" -> Borderline edge-case requiring Art Director review.

Output STRICTLY a JSON object matching this schema:
{
  "visualDescription": "Concise 2-sentence description of the generated image.",
  "likenessScore": 8,
  "characterConsistencyStatus": "pass" | "fail",
  "characterReasoning": "Explicit evaluation of facial likeness, haircut silhouette, age accuracy, and skin tone match against reference...",
  "wardrobeConsistencyStatus": "pass" | "fail",
  "wardrobeReasoning": "Clothing evaluation...",
  "styleConsistencyStatus": "pass" | "fail",
  "styleReasoning": "Style medium and texture evaluation...",
  "textClearanceStatus": "pass" | "fail",
  "textReasoning": "Text layout and clearance explanation...",
  "recommendedTextSide": "Right" | "Left",
  "recommendedTextOffsetX": 0,
  "recommendedTextOffsetY": 0,
  "narrativeAdherenceStatus": "pass" | "fail",
  "narrativeAdherenceReasoning": "Story beat and action evaluation...",
  "overallDecision": "pass" | "fail" | "flagged",
  "regenerationReason": "Clear, actionable correction instruction for repainting if failed"
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

            // Enforce schema integrity: if likeness < 7 or any critical check failed, overall decision MUST be fail
            if (result.likenessScore < 7 || result.characterConsistencyStatus === 'fail' || result.narrativeAdherenceStatus === 'fail') {
                result.overallDecision = 'fail';
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
