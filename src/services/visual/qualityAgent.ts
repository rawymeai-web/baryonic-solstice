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

export interface HeroQCResult {
    heroToken: string;
    label: string;
    name: string;
    likenessScore: number;
    characterConsistencyStatus: 'pass' | 'fail' | 'needs_review';
    reasoning: string;
    hairConsistency?: 'pass' | 'fail';
    skinToneConsistency?: 'pass' | 'fail';
    ageAccuracy?: 'pass' | 'fail';
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
    locationRecord?: any;
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
    heroResults: HeroQCResult[];
    overallLikenessScore: number;
    likenessScore: number; // Backwards compatibility: min(heroResults.likenessScore)
    characterConsistencyStatus: 'pass' | 'fail' | 'needs_review';
    characterReasoning: string;
    wardrobeConsistencyStatus: 'pass' | 'fail';
    wardrobeReasoning: string;
    styleConsistencyStatus: 'pass' | 'fail';
    styleReasoning: string;
    locationConsistencyStatus?: 'pass' | 'fail' | 'na';
    locationReasoning?: string;
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
     * Evaluates a generated illustration against reference photos, style DNA, location, and story text.
     * Evaluates all visible heroes independently.
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
            locationRecord = params.locationRecord,
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

            // 2. Resolve Active Heroes Only
            const activeHeroes: HeroQCRef[] = [];
            if (heroes && heroes.length > 0) {
                for (let idx = 0; idx < heroes.length; idx++) {
                    const h = heroes[idx];
                    if (h.isVisibleInScene !== false) {
                        activeHeroes.push(h);
                        const rawB64 = await resolveToBase64(h.rawBase64OrUrl);
                        const dnaB64 = await resolveToBase64(h.dnaBase64OrUrl);
                        if (rawB64) {
                            contents.push({ text: `${h.label} (${h.name} - ${h.heroToken}) RAW PHOTO:` });
                            contents.push({ inlineData: { mimeType: getMime(rawB64), data: rawB64 } });
                        }
                        if (dnaB64) {
                            contents.push({ text: `${h.label} (${h.name} - ${h.heroToken}) DNA STYLE REFERENCE:` });
                            contents.push({ inlineData: { mimeType: getMime(dnaB64), data: dnaB64 } });
                        }
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
                activeHeroes.push({
                    heroToken: '[[HERO_1]]',
                    label: 'Hero A',
                    name: 'Hero A',
                    isVisibleInScene: true,
                    dnaBase64OrUrl: resolvedHeroDNA,
                    rawBase64OrUrl: resolvedHeroRaw
                });

                if (resolvedSecondDNA || resolvedSecondRaw) {
                    if (resolvedSecondRaw) {
                        contents.push({ text: "Hero B RAW PHOTO (Secondary character geometry):" });
                        contents.push({ inlineData: { mimeType: getMime(resolvedSecondRaw), data: resolvedSecondRaw } });
                    }
                    if (resolvedSecondDNA) {
                        contents.push({ text: "Hero B DNA STYLE REFERENCE (Secondary character design):" });
                        contents.push({ inlineData: { mimeType: getMime(resolvedSecondDNA), data: resolvedSecondDNA } });
                    }
                    activeHeroes.push({
                        heroToken: '[[HERO_2]]',
                        label: 'Hero B',
                        name: 'Hero B',
                        isVisibleInScene: true,
                        dnaBase64OrUrl: resolvedSecondDNA,
                        rawBase64OrUrl: resolvedSecondRaw
                    });
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

            const locationDirectives = locationRecord
                ? `\nLOCATION CONTINUITY REQUIREMENT:\n- Location Name: ${locationRecord.name}\n- Expected Architecture & Palette: ${locationRecord.architecture || ''}, ${locationRecord.materialsPalette || ''}\n- Expected Lighting: ${locationRecord.lightingAtmosphere || ''}`
                : '';

            const activeHeroesPrompt = activeHeroes.map(h => `- ${h.label} (${h.name} - ${h.heroToken}) is ACTIVE in this scene. Evaluate independently.`).join('\n');

            const promptContext = `
You are the child's PARENT and a world-class, uncompromising Art Director inspecting a personalized storybook.
A parent has paid a premium for a custom keepsake starring THEIR specific child (Target Age: ${childAge} years old).

ACTIVE HEROES IN THIS SCENE:
${activeHeroesPrompt}
(If a hero is not listed above, they are absent from this scene. Do not evaluate absent heroes.)

MANDATORY BIOMETRIC TARGET PROFILE:
- Target Age: ${childAge} years old
${bioDirectives}
${locationDirectives}

CRITICAL MINDSET — THE PARENT EYE TEST:
For EVERY active hero in the scene, compare them side-by-side with their attached Reference DNA Image and Raw Photo.
Ask yourself the fundamental parent question for each hero:
"Is this unmistakably MY child, or does this look like a different kid / stranger?"
If a parent would say "That is not my child!", "Why does his haircut look completely different?", "Why are his eyes the wrong color?", "Why does he look 12 instead of 6?", or "Why is his skin color different?", you MUST FAIL that hero immediately. Do NOT be polite, agreeable, or lenient.

Story Text for this Page (${pageType}):
"${storyText || 'N/A'}"

Generation Prompt:
"${targetPrompt || 'N/A'}"

Designated Text Box Side: ${currentTextSide || 'Right'}

STRICT BIOMETRIC & ARTISTIC EVALUATION CRITERIA:

1. Per-Hero Facial Likeness, Proportions & Biometrics (Weight: CRITICAL):
   - Evaluate EACH active hero independently in the "heroResults" array.
   - Likeness Scoring Guide (0 to 10):
     * 9-10: Flawless, unmistakable identity match to the reference child.
     * 7-8: Clear, recognizable likeness with natural expression adaptation and accurate biometrics.
     * 5-6: Generic caricature, distorted proportions, mutated eye/hair colors — FAILS parent recognition.
     * 1-4: Wrong child, imposter, or complete identity loss.
   - MANDATORY FAIL RULE: Any hero score below 7/10 is an AUTOMATIC FAIL for that hero.

2. Wardrobe & Footwear Consistency:
   - Check clothing consistency against reference outfit.

3. Style, Medium & Dimensionality Consistency (Weight: CRITICAL):
   - Target Style Profile: ${stylePrompt || 'Defined by DNA Reference Image'}
   - Compare artistic medium, rendering dimensionality (2D vs 3D CGI), brushwork, and lighting directly against DNA Reference.

4. Global Recurring Prop Invariance (Weight: HIGH):
   - If Canonical Prop Reference is attached: Must strictly match materials, shape, and colors.

5. Location & Environment Continuity:
   - Does the background environment and lighting match the location requirements?

6. Text Zone Clearance:
   - Check if designated side (${currentTextSide || 'Right'}) is clear of the character's face.

7. Narrative Adherence & Action Matching:
   - Does the image accurately reflect the story action and mood described in the story text?

Output STRICTLY a JSON object matching this schema:
{
  "visualDescription": "Concise 2-sentence description of the generated image.",
  "heroResults": [
    ${activeHeroes.map(h => `{
      "heroToken": "${h.heroToken}",
      "label": "${h.label}",
      "name": "${h.name}",
      "likenessScore": 8,
      "characterConsistencyStatus": "pass",
      "reasoning": "Detailed likeness and biometric evaluation for ${h.label}...",
      "hairConsistency": "pass",
      "skinToneConsistency": "pass",
      "ageAccuracy": "pass"
    }`).join(',\n    ')}
  ],
  "wardrobeConsistencyStatus": "pass",
  "wardrobeReasoning": "Clothing evaluation...",
  "styleConsistencyStatus": "pass",
  "styleReasoning": "Style medium and texture evaluation...",
  "locationConsistencyStatus": "pass",
  "locationReasoning": "Environment evaluation...",
  "propConsistencyStatus": "pass",
  "propReasoning": "Prop evaluation...",
  "textClearanceStatus": "pass",
  "textReasoning": "Text layout and clearance explanation...",
  "recommendedTextSide": "Right",
  "recommendedTextOffsetX": 0,
  "recommendedTextOffsetY": 0,
  "narrativeAdherenceStatus": "pass",
  "narrativeAdherenceReasoning": "Story beat and action evaluation...",
  "overallDecision": "pass",
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
            let parsedRaw: any = {};
            try {
                parsedRaw = JSON.parse(cleaned);
            } catch (jsonErr) {
                console.error("[QCAgent] Failed to parse JSON from vision model:", cleaned);
                parsedRaw = {};
            }

            // Strict Runtime Validation & Enum Sanitization (Fail-Closed)
            const validatePassFail = (val: any): 'pass' | 'fail' => (val === 'pass' ? 'pass' : 'fail');
            const validatePassFailNa = (val: any): 'pass' | 'fail' | 'na' => (val === 'pass' ? 'pass' : (val === 'fail' ? 'fail' : 'na'));
            const validateScore = (val: any): number => {
                const n = Number(val);
                return Number.isFinite(n) && n >= 0 && n <= 10 ? n : 0;
            };

            const heroResults: HeroQCResult[] = [];
            const rawHeroList = Array.isArray(parsedRaw.heroResults) ? parsedRaw.heroResults : [];

            for (const expectedHero of activeHeroes) {
                const found = rawHeroList.find((h: any) => h.heroToken === expectedHero.heroToken || h.label === expectedHero.label);
                if (found) {
                    const score = validateScore(found.likenessScore);
                    const status: 'pass' | 'fail' | 'needs_review' = (found.characterConsistencyStatus === 'pass' && score >= 7)
                        ? 'pass'
                        : (found.characterConsistencyStatus === 'needs_review' ? 'needs_review' : 'fail');

                    heroResults.push({
                        heroToken: expectedHero.heroToken,
                        label: expectedHero.label,
                        name: expectedHero.name,
                        likenessScore: score,
                        characterConsistencyStatus: status,
                        reasoning: found.reasoning || found.characterReasoning || 'Evaluated.',
                        hairConsistency: validatePassFail(found.hairConsistency),
                        skinToneConsistency: validatePassFail(found.skinToneConsistency),
                        ageAccuracy: validatePassFail(found.ageAccuracy)
                    });
                } else {
                    // Fail closed if expected active hero was omitted by model
                    heroResults.push({
                        heroToken: expectedHero.heroToken,
                        label: expectedHero.label,
                        name: expectedHero.name,
                        likenessScore: 0,
                        characterConsistencyStatus: 'fail',
                        reasoning: `Model omitted evaluation for active hero ${expectedHero.label}.`,
                        hairConsistency: 'fail',
                        skinToneConsistency: 'fail',
                        ageAccuracy: 'fail'
                    });
                }
            }

            const overallLikeness = heroResults.length > 0
                ? Math.min(...heroResults.map(h => h.likenessScore))
                : validateScore(parsedRaw.likenessScore);

            const characterConsistencyStatus: 'pass' | 'fail' | 'needs_review' = heroResults.some(h => h.characterConsistencyStatus === 'fail')
                ? 'fail'
                : (heroResults.some(h => h.characterConsistencyStatus === 'needs_review') ? 'needs_review' : 'pass');

            const result: QualityCheckResult = {
                visualDescription: parsedRaw.visualDescription || 'Evaluated illustration.',
                heroResults,
                overallLikenessScore: overallLikeness,
                likenessScore: overallLikeness,
                characterConsistencyStatus,
                characterReasoning: heroResults.map(h => `[${h.label}: Likeness ${h.likenessScore}/10 (${h.characterConsistencyStatus})] ${h.reasoning}`).join(' | '),
                wardrobeConsistencyStatus: validatePassFail(parsedRaw.wardrobeConsistencyStatus),
                wardrobeReasoning: parsedRaw.wardrobeReasoning || 'Wardrobe check completed.',
                styleConsistencyStatus: validatePassFail(parsedRaw.styleConsistencyStatus),
                styleReasoning: parsedRaw.styleReasoning || 'Style check completed.',
                locationConsistencyStatus: validatePassFailNa(parsedRaw.locationConsistencyStatus),
                locationReasoning: parsedRaw.locationReasoning,
                propConsistencyStatus: validatePassFailNa(parsedRaw.propConsistencyStatus),
                propReasoning: parsedRaw.propReasoning,
                textClearanceStatus: validatePassFail(parsedRaw.textClearanceStatus),
                textReasoning: parsedRaw.textReasoning || 'Text clearance check completed.',
                recommendedTextSide: parsedRaw.recommendedTextSide === 'Left' ? 'Left' : 'Right',
                recommendedTextOffsetX: Number(parsedRaw.recommendedTextOffsetX) || 0,
                recommendedTextOffsetY: Number(parsedRaw.recommendedTextOffsetY) || 0,
                narrativeAdherenceStatus: validatePassFail(parsedRaw.narrativeAdherenceStatus),
                narrativeAdherenceReasoning: parsedRaw.narrativeAdherenceReasoning || 'Narrative adherence check completed.',
                overallDecision: 'pass',
                regenerationReason: parsedRaw.regenerationReason
            };

            // Deterministic Multi-Category Hard Gate
            const hardFailures = [
                result.overallLikenessScore < 7,
                result.characterConsistencyStatus === 'fail',
                result.styleConsistencyStatus === 'fail',
                result.propConsistencyStatus === 'fail',
                result.narrativeAdherenceStatus === 'fail',
                result.locationConsistencyStatus === 'fail'
            ];

            if (hardFailures.some(Boolean)) {
                result.overallDecision = 'fail';
            } else if (
                result.characterConsistencyStatus === 'needs_review' ||
                result.wardrobeConsistencyStatus === 'fail' ||
                result.textClearanceStatus === 'fail' ||
                result.overallLikenessScore < 8
            ) {
                result.overallDecision = 'flagged';
            } else {
                result.overallDecision = 'pass';
            }

            console.log(`[QCAgent] Evaluated: Likeness: ${result.overallLikenessScore}/10, Style: ${result.styleConsistencyStatus}, Prop: ${result.propConsistencyStatus || 'n/a'}, Decision: ${result.overallDecision}`);
            return result;

        }, 2, 4000, {
            visualDescription: "Vision QA evaluation fallback due to timeout or transient error.",
            heroResults: (params.heroes || []).map(h => ({
                heroToken: h.heroToken,
                label: h.label,
                name: h.name,
                likenessScore: 5,
                characterConsistencyStatus: 'needs_review',
                reasoning: 'QA agent encountered transient timeout/error during automated check.'
            })),
            overallLikenessScore: 5,
            likenessScore: 5,
            characterConsistencyStatus: 'needs_review',
            characterReasoning: 'QA agent encountered transient vision timeout/error during automated check.',
            wardrobeConsistencyStatus: 'pass',
            wardrobeReasoning: 'Default fallback applied.',
            styleConsistencyStatus: 'pass',
            styleReasoning: 'Default fallback applied.',
            locationConsistencyStatus: 'pass',
            locationReasoning: 'Default fallback applied.',
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

/**
 * Counts the total number of hard gate failures in a QA result.
 */
export function countHardFailures(qc: any): number {
    if (!qc) return 999;
    let count = 0;
    if (qc.heroResults && Array.isArray(qc.heroResults) && qc.heroResults.length > 0) {
        for (const h of qc.heroResults) {
            if ((h.likenessScore ?? 0) < 7) count++;
            if (h.characterConsistencyStatus === 'fail') count++;
        }
    } else {
        if ((qc.likenessScore ?? 0) < 7) count++;
        if (qc.characterConsistencyStatus === 'fail') count++;
    }
    if (qc.styleConsistencyStatus === 'fail') count++;
    if (qc.propConsistencyStatus === 'fail') count++;
    if (qc.narrativeAdherenceStatus === 'fail') count++;
    if (qc.locationConsistencyStatus === 'fail') count++;
    return count;
}

/**
 * Strict hierarchical candidate comparator:
 * 1. Hard-gate pass (overallDecision === 'pass') strictly beats non-pass.
 * 2. If neither passed, rank by fewest hard failures.
 * 3. Rank by minimum per-hero likeness score.
 * 4. Tie-break with secondary composite score.
 */
export function rankCandidates(
    a: { qcResult: any; compositeScore?: number },
    b: { qcResult: any; compositeScore?: number }
): number {
    const aPass = a.qcResult?.overallDecision === 'pass';
    const bPass = b.qcResult?.overallDecision === 'pass';

    // 1. Hard-gate pass beats non-pass
    if (aPass && !bPass) return -1;
    if (!aPass && bPass) return 1;

    // 2. If neither passed, rank by fewest hard failures
    const aFailures = countHardFailures(a.qcResult);
    const bFailures = countHardFailures(b.qcResult);
    if (aFailures !== bFailures) {
        return aFailures - bFailures; // lower is better
    }

    // 3. Rank by minimum per-hero likeness score
    const aMinLikeness = a.qcResult?.overallLikenessScore ?? a.qcResult?.likenessScore ?? 0;
    const bMinLikeness = b.qcResult?.overallLikenessScore ?? b.qcResult?.likenessScore ?? 0;
    if (aMinLikeness !== bMinLikeness) {
        return bMinLikeness - aMinLikeness; // higher is better
    }

    // 4. Tie-break with secondary composite score
    return (b.compositeScore ?? 0) - (a.compositeScore ?? 0);
}

/**
 * Determines whether a QA result qualifies as a definite hard failure
 * warranting an automated retry attempt in Fast Production Mode.
 */
export function isDefiniteHardFailure(qc: QualityCheckResult): boolean {
    if (!qc) return true;
    if (qc.overallLikenessScore < 7 || qc.likenessScore < 7) return true;
    if (qc.characterConsistencyStatus === 'fail') return true;
    if (qc.styleConsistencyStatus === 'fail') return true;
    if (qc.propConsistencyStatus === 'fail') return true;
    if (qc.narrativeAdherenceStatus === 'fail') return true;
    if (qc.locationConsistencyStatus === 'fail') return true;
    if (qc.heroResults && qc.heroResults.some(h => h.likenessScore < 7 || h.characterConsistencyStatus === 'fail')) return true;
    return false;
}


