import { ai, cleanJsonString, withRetry } from '../generation/modelGateway';
import { extractBiometrics } from './promptEngineer';

export interface HeroQCRef {
    heroToken: string;
    label: string;
    name: string;
    dnaBase64OrUrl?: string;
    rawBase64OrUrl?: string;
    isVisibleInScene: boolean;
    biometrics?: {
        eyeColor?: string;
        hairColor?: string;
        hairStyle?: string;
        skinTone?: string;
        hasExplicitLocks: boolean;
    };
}

export interface ImageEvaluationParams {
    generatedImageBase64: string;
    heroRawBase64?: string;
    heroDNABase64?: string;
    heroes?: HeroQCRef[];
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
    propAssetImageBase64?: string;
    propAssetImageUrl?: string;
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
    propConsistencyStatus?: 'pass' | 'fail' | 'na';
    propReasoning?: string;
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
            heroes = params.heroes,
            pageType = params.isCover ? 'Cover' : 'Spread',
            currentTextSide = params.layoutPlanSide || 'Right',
            targetPrompt = params.targetPrompt || "",
            storyText = params.spreadText || params.storyText || "",
            secondRawBase64,
            secondDNABase64,
            childAge = "5",
            stylePrompt = params.stylePrompt || "",
            propAssetImageBase64 = params.propAssetImageBase64,
            propAssetImageUrl = params.propAssetImageUrl
        } = params;

        return withRetry(async () => {
            console.log(`[QCAgent] Starting evaluation for ${pageType}...`);

            const resolveToBase64 = async (str: string | undefined): Promise<string | undefined> => {
                if (!str) return undefined;
                if (str.startsWith('http://') || str.startsWith('https://')) {
                    try {
                        const resp = await fetch(str);
                        if (!resp.ok) {
                            console.error(`[QCAgent] Image fetch returned HTTP ${resp.status} for: ${str}`);
                            return undefined;
                        }
                        const buf = await resp.arrayBuffer();
                        return Buffer.from(buf).toString('base64');
                    } catch (e) {
                        console.error(`[QCAgent] Failed to fetch image from URL: ${str}`, e);
                        return undefined;
                    }
                }
                return str.replace(/^data:image\/\w+;base64,/, '');
            };

            const isDualHero = heroes ? (heroes.length > 1 && heroes[1].isVisibleInScene !== false) : !!(secondDNABase64 || secondRawBase64);
            const contents: any[] = [];

            const getMime = (str: string) => {
                if (str?.startsWith('data:image/png') || str?.startsWith('iVBORw')) return 'image/png';
                if (str?.startsWith('data:image/webp') || str?.startsWith('UklGR')) return 'image/webp';
                return 'image/jpeg';
            };

            // 1. Resolve Generated Image
            const resolvedGen = await resolveToBase64(generatedImageBase64);
            if (resolvedGen) {
                contents.push({ text: "FINAL GENERATED SPREAD IMAGE (To be evaluated):" });
                contents.push({ inlineData: { mimeType: getMime(resolvedGen), data: resolvedGen } });
            }

            // 2. Resolve Heroes
            if (heroes && heroes.length > 0) {
                for (let idx = 0; idx < heroes.length; idx++) {
                    const h = heroes[idx];
                    const rawB64 = await resolveToBase64(h.rawBase64OrUrl);
                    const dnaB64 = await resolveToBase64(h.dnaBase64OrUrl);
                    if (rawB64) {
                        contents.push({ text: `${h.label} (${h.name}) RAW PHOTO:` });
                        contents.push({ inlineData: { mimeType: getMime(rawB64), data: rawB64 } });
                    }
                    if (dnaB64) {
                        contents.push({ text: `${h.label} (${h.name}) DNA STYLE REFERENCE:` });
                        contents.push({ inlineData: { mimeType: getMime(dnaB64), data: dnaB64 } });
                    }
                }
            } else {
                const [resolvedHeroRaw, resolvedHeroDNA, resolvedSecondRaw, resolvedSecondDNA] = await Promise.all([
                    resolveToBase64(heroRawBase64),
                    resolveToBase64(heroDNABase64),
                    resolveToBase64(secondRawBase64),
                    resolveToBase64(secondDNABase64),
                ]);

                if (resolvedHeroRaw) {
                    contents.push({ text: "Hero A RAW PHOTO (Facial geometry & identity anchor):" });
                    contents.push({ inlineData: { mimeType: getMime(resolvedHeroRaw), data: resolvedHeroRaw } });
                }
                if (resolvedHeroDNA) {
                    contents.push({ text: "Hero A DNA STYLE REFERENCE (Target stylized character design):" });
                    contents.push({ inlineData: { mimeType: getMime(resolvedHeroDNA), data: resolvedHeroDNA } });
                }
                if (resolvedSecondRaw) {
                    contents.push({ text: "Hero B RAW PHOTO (Secondary character geometry):" });
                    contents.push({ inlineData: { mimeType: getMime(resolvedSecondRaw), data: resolvedSecondRaw } });
                }
                if (resolvedSecondDNA) {
                    contents.push({ text: "Hero B DNA STYLE REFERENCE (Secondary character design):" });
                    contents.push({ inlineData: { mimeType: getMime(resolvedSecondDNA), data: resolvedSecondDNA } });
                }
            }

            // 3. Resolve Prop Reference
            const resolvedProp = await resolveToBase64(propAssetImageBase64 || propAssetImageUrl);
            if (resolvedProp) {
                contents.push({ text: "CANONICAL RECURRING PROP ASSET REFERENCE (Physical appearance authority for signature recurring prop/vehicle):" });
                contents.push({ inlineData: { mimeType: getMime(resolvedProp), data: resolvedProp } });
            }

            const biometrics = extractBiometrics(params.childDescription || targetPrompt);
            const bioDirectives = biometrics.hasExplicitLocks
                ? `- Mandatory Eye Color: ${biometrics.eyeColor}\n- Mandatory Hair Color & Style: ${biometrics.hairColor} (${biometrics.hairStyle})\n- Mandatory Skin Tone: ${biometrics.skinTone}`
                : `- Eye Color, Hair & Complexion Authority: DNA Reference Image. Preserve exact eye color, hair pattern, and skin tone from reference.`;

            const promptContext = `
You are the child's PARENT and a world-class, uncompromising Art Director inspecting a personalized storybook.
A parent has paid a premium for a custom keepsake starring THEIR specific child (Target Age: ${childAge} years old).

MANDATORY BIOMETRIC TARGET PROFILE:
- Target Age: ${childAge} years old
${bioDirectives}
${isDualHero ? '- Multi-Hero Scene: Evaluate both Hero A and Hero B likeness independently. Ensure neither hero is blended or swapped.' : ''}

CRITICAL MINDSET — THE PARENT EYE TEST:
Look at the generated character in the spread and compare them side-by-side with the Reference DNA Image / Raw Photo and the Mandatory Biometric Profile.
Ask yourself the fundamental parent question:
"Is this unmistakably MY child, or does this look like a different kid / stranger?"
If a parent would say "That is not my child!", "Why does his haircut look completely different?", "Why are his eyes the wrong color?", "Why does he look 12 instead of 6?", or "Why is his skin color different?", you MUST FAIL the image immediately. Do NOT be polite, agreeable, or lenient.

Story Text for this Page (${pageType}):
"${storyText || 'N/A'}"

Generation Prompt:
"${targetPrompt || 'N/A'}"

Designated Text Box Side: ${currentTextSide || 'Right'}

STRICT BIOMETRIC & ARTISTIC EVALUATION CRITERIA:

1. Facial Likeness, Feature Proportions & Biometric Color Integrity (Weight: CRITICAL):
   - Eye Color Integrity: Look closely at the character's irises/eyes in the generated image. Any unprompted mutation in eye color is an UNACCEPTABLE identity hallucination.
   - Hair Color & Cut Integrity: Hair color and texture must strictly match reference. No unprompted modern fades, tapers, or undercuts when reference is curly/wavy.
   - Head & Facial Geometry: Does the jawline, chin shape, cheek fullness, and eye spacing match the reference?
   - Eye Shape & Feature Proportions: Compare the eye-to-face proportion scale directly against the DNA reference.
   - Scoring Guide:
     * 9-10: Flawless, unmistakable identity match to the reference child with accurate anatomical/stylization scale.
     * 7-8: Clear, recognizable likeness with natural expression adaptation and accurate biometrics.
     * 5-6: Generic caricature, distorted proportions, mutated eye/hair colors, or stylization drift — FAILS parent recognition.
     * 1-4: Wrong child, imposter, or complete identity loss.
   - MANDATORY FAIL RULE: Any score below 7/10 is an AUTOMATIC FAIL.

2. Haircut Silhouette & Hair Texture Invariance (Weight: CRITICAL):
   - Wave/curl pattern, volume, hairline, and side coverage MUST match the DNA reference.

3. Age Invariance (Target Age: ${childAge} years old):
   - The character MUST visually read as a child of ${childAge} years old.

4. Skin Tone & Ethnic Feature Integrity (Weight: CRITICAL):
   - Compare skin tone and undertone directly to the DNA reference and raw photo.

5. Wardrobe & Footwear Consistency:
   - Check clothing consistency across scenes against the reference outfit.

6. Style, Medium & Dimensionality Consistency (Weight: CRITICAL):
   - Target Style Profile: ${stylePrompt || 'Defined by DNA Reference Image'}
   - Compare artistic medium, rendering dimensionality (2D painterly vs 3D CGI vs vector), surface brushwork/textures, and lighting model directly against DNA Reference.
   - MANDATORY FAIL RULE: If the illustration mutates into a contrasting artistic medium (e.g. painterly shifting to glossy 3D CGI, 3D animated shifting to flat 2D), set "styleConsistencyStatus": "fail" and "overallDecision": "fail".

7. Global Recurring Object & Persistent Prop Invariance (Weight: HIGH):
   - If a Canonical Prop Reference Image is provided: Compare recurring prop/vehicle directly against reference.
   - MANDATORY FAIL RULE: If the prop mutates in shape, material, or color, set "propConsistencyStatus": "fail" and "overallDecision": "fail".

8. Text Zone Clearance:
   - Check if designated side (${currentTextSide || 'Right'}) is clear of the character's face.

9. Narrative Adherence & Action Matching:
   - Does the image accurately reflect the story action and mood described in the story text?

OVERALL DECISION RULES:
- "overallDecision": "pass" -> Likeness >= 7, haircut matches, age matches ${childAge}, skin tone matches, style matches, prop matches reference, narrative adheres.
- "overallDecision": "fail" -> Any failure in likeness (< 7), haircut mutation, age shift, skin tone shift, corrupted style, prop drift, or narrative contradiction.
- "overallDecision": "flagged" -> Borderline edge-case requiring Art Director review.

Output STRICTLY a JSON object matching this schema:
{
  "visualDescription": "Concise 2-sentence description of the generated image.",
  "likenessScore": 8,
  "characterConsistencyStatus": "pass" | "fail",
  "characterReasoning": "Explicit evaluation of facial likeness, haircut silhouette, age accuracy, and skin tone match...",
  "wardrobeConsistencyStatus": "pass" | "fail",
  "wardrobeReasoning": "Clothing evaluation...",
  "styleConsistencyStatus": "pass" | "fail",
  "styleReasoning": "Style medium and texture evaluation...",
  "propConsistencyStatus": "pass" | "fail" | "na",
  "propReasoning": "Evaluation of recurring props and objects...",
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

            // Deterministic Multi-Category Hard Gate: compute final decision in code from all critical checks
            const criticalFailures = [
                result.likenessScore < 7,
                result.characterConsistencyStatus === 'fail',
                result.styleConsistencyStatus === 'fail',
                result.wardrobeConsistencyStatus === 'fail',
                result.narrativeAdherenceStatus === 'fail',
                result.propConsistencyStatus === 'fail',
                result.textClearanceStatus === 'fail'
            ];

            if (criticalFailures.some(Boolean)) {
                result.overallDecision = 'fail';
            } else if (result.characterConsistencyStatus === 'needs_review') {
                result.overallDecision = 'flagged';
            } else {
                result.overallDecision = 'pass';
            }

            console.log(`[QCAgent] Evaluated: Likeness: ${result.likenessScore}/10, Style: ${result.styleConsistencyStatus}, Prop: ${result.propConsistencyStatus || 'n/a'}, Narrative: ${result.narrativeAdherenceStatus}, Decision: ${result.overallDecision}`);
            return result;

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
            propConsistencyStatus: 'pass',
            propReasoning: 'Default fallback applied.',
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
