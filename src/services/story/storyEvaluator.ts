import { ai, cleanJsonString } from '../generation/modelGateway';
import { Validator } from '../rules/validator';

export interface EvaluationScorecard {
    overallScore: number;
    passThreshold: boolean; // >= 4.0
    hardFailures: string[];
    dimensions: {
        coherenceAndCausality: { score: number; evidence: string };
        childEngagementAndFun: { score: number; evidence: string };
        readAloudQuality: { score: number; evidence: string };
        ageFit: { score: number; evidence: string };
        heroAgency: { score: number; evidence: string };
        emotionalArc: { score: number; evidence: string };
        themeIntegration: { score: number; evidence: string };
        originalityAndSpecificity: { score: number; evidence: string };
        languageQuality: { score: number; evidence: string };
    };
    rawVsEditedComparison: {
        rawFunMaintained: boolean;
        editorialDegradationDetected: boolean;
        notes: string;
    };
    arabicEvaluation?: {
        msaNaturalnessScore: number; // 1-5
        colloquialismsDetected: string[];
        genderAgreementPass: boolean;
        naturalDialoguePass: boolean;
        notes: string;
    };
}

export async function evaluateStoryManuscript(
    fixture: {
        id: string;
        language: string;
        childName: string;
        childAge: string | number;
        theme: string;
        useSecondCharacter?: boolean;
        secondCharacter?: any;
    },
    blueprint: any,
    rawDraft: { text: string }[],
    finalStory: { text: string }[],
    validationResult: any
): Promise<EvaluationScorecard> {
    const isArabic = fixture.language === 'ar';
    const age = Number(fixture.childAge);
    const isDual = !!fixture.useSecondCharacter;

    const judgePrompt = `
ROLE: Expert Children's Literature Editor, Child Development Specialist, and Master Literary Critic.
Evaluate this generated children's picture-book manuscript based on the Storyline Evaluation Rubric v1.

FIXTURE DATA:
- ID: ${fixture.id}
- Language: ${fixture.language}
- Target Age: ${age} years old
- Hero A: ${fixture.childName}
${isDual ? `- Hero B: ${fixture.secondCharacter?.name || 'Companion'}` : '- Hero Mode: Single Hero'}
- Theme: ${fixture.theme}

BLUEPRINT SUMMARY:
- Title: ${blueprint?.foundation?.title || ''}
- Premise: ${blueprint?.foundation?.storyCore || ''}
- Promised Payoff: ${blueprint?.foundation?.heroDesire || ''}

RAW DRAFT:
${rawDraft.map((s, i) => `Spread ${i + 1}: ${s.text}`).join('\n')}

FINAL EDITED MANUSCRIPT:
${finalStory.map((s, i) => `Spread ${i + 1}: ${s.text}`).join('\n')}

DETERMINISTIC VALIDATION REPORT:
- Valid: ${validationResult?.valid}
- Errors: ${JSON.stringify(validationResult?.errors || [])}
- Warnings: ${JSON.stringify(validationResult?.warnings || [])}

SCORING CRITERIA (Score each dimension 1.0 to 5.0):
1. Coherence and Causality (15%): Each event follows naturally; actions cause consequences; no unexplained jumps or teleporting.
2. Child Engagement and Fun (15%): Curiosity, play, sensory joy, humor, delight; gives a child a reason to turn the page.
3. Read-Aloud Quality (10%): Natural rhythm, musical cadence, varied sentences, zero robotic fragments.
4. Age Fit (10%): Vocabulary, sentence length, and emotional complexity fit age ${age}.
5. Hero Agency and Personalization (10%): The named hero(es) make meaningful choices. In dual-hero stories, BOTH heroes must have distinct indispensable contributions in the climax.
6. Emotional Arc (10%): Feelings change for understandable reasons; climax and closure feel earned.
7. Theme Integration (10%): Lesson emerges from action rather than an adult lecture. Spread 8 must NOT preach an explicit adult proverb.
8. Originality and Specificity (10%): Concrete, memorable details; avoids cliché repetition (e.g. repeated special-object -> jam -> turtle/hedgehog patience -> success formula).
9. Language Quality and Naturalness (10%): Idiomatic English or natural Modern Standard Arabic (Fusha); correct grammar and gender agreement.

${isArabic ? `
ARABIC LITERARY AUDIT:
- Is the text in natural, authentic Modern Standard Arabic (Fusha) suitable for children?
- Are there awkward machine translations (e.g. literal idioms like "هس، قلب عمر سعيد") or inappropriate dialect words (e.g. "دفش")?
- Are sound words natural Arabic onomatopoeia (e.g. طق طق، ووووش) rather than bizarre transliterations (e.g. فر، فرر)?
- Are verbs and adjectives in 100% strict agreement with character genders?
` : ''}

EDITORIAL REGRESSION CHECK:
- Compare the Raw Draft with the Final Edited Manuscript. Did the editor strip out the fun, playful details, or sensory warmth into dry, flat statements just to meet word counts?

OUTPUT JSON SCHEMA:
{
  "hardFailures": ["List any hard failures like wrong language, broken promises, missing heroes, or explicit moral lectures; empty array if none"],
  "dimensions": {
    "coherenceAndCausality": { "score": 4.5, "evidence": "..." },
    "childEngagementAndFun": { "score": 4.0, "evidence": "..." },
    "readAloudQuality": { "score": 4.2, "evidence": "..." },
    "ageFit": { "score": 4.0, "evidence": "..." },
    "heroAgency": { "score": 4.0, "evidence": "..." },
    "emotionalArc": { "score": 4.0, "evidence": "..." },
    "themeIntegration": { "score": 4.5, "evidence": "..." },
    "originalityAndSpecificity": { "score": 4.0, "evidence": "..." },
    "languageQuality": { "score": 4.2, "evidence": "..." }
  },
  "rawVsEditedComparison": {
    "rawFunMaintained": true,
    "editorialDegradationDetected": false,
    "notes": "..."
  },
  ${isArabic ? `
  "arabicEvaluation": {
    "msaNaturalnessScore": 4.5,
    "colloquialismsDetected": [],
    "genderAgreementPass": true,
    "naturalDialoguePass": true,
    "notes": "..."
  },` : ''}
  "summaryNotes": "Overall literary appraisal"
}
`;

    const model = ai().getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: { responseMimeType: "application/json" }
    });

    const response = await model.generateContent(judgePrompt);
    const parsed = JSON.parse(cleanJsonString(response.response.text()));

    const dims = parsed.dimensions;
    const weights = {
        coherenceAndCausality: 0.15,
        childEngagementAndFun: 0.15,
        readAloudQuality: 0.10,
        ageFit: 0.10,
        heroAgency: 0.10,
        emotionalArc: 0.10,
        themeIntegration: 0.10,
        originalityAndSpecificity: 0.10,
        languageQuality: 0.10
    };

    let weightedSum = 0;
    for (const [key, weight] of Object.entries(weights)) {
        const score = dims[key]?.score || 3.0;
        weightedSum += score * weight;
    }

    const overallScore = Math.round(weightedSum * 10) / 10;
    const hardFailures: string[] = parsed.hardFailures || [];
    if (!validationResult?.valid) {
        validationResult?.errors?.forEach((e: string) => hardFailures.push(`Deterministic Gate: ${e}`));
    }

    return {
        overallScore,
        passThreshold: overallScore >= 4.0 && hardFailures.length === 0,
        hardFailures,
        dimensions: dims,
        rawVsEditedComparison: parsed.rawVsEditedComparison,
        arabicEvaluation: parsed.arabicEvaluation
    };
}
