
import { StoryTheme } from '../../types';

export const GUIDEBOOK = {
    // --- NARRATIVE RULES ---
    narrative: {
        forbiddenCharacters: [
            "Mother", "Father", "Mom", "Dad", "Grandma", "Grandpa",
            "Aunt", "Uncle", "Teacher (Real)", "Doctor (Real)"
        ],
        allowedSupportCharacters: [
            "Wizard", "Talking Animal", "Alien", "Robot",
            "Neighbor (Fictional)", "Shopkeeper (Fictional)"
        ],
        wordCount: {
            "1-3": { min: 10, max: 18 },
            "4-5": { min: 18, max: 28 },
            "6-8": { min: 30, max: 50 },
            "9-12": { min: 55, max: 85 }
        },
        structure: {
            intro: "Establish Hero in grounded Home Base. State personal desire origin and establish anchor item rule.",
            catalyst: "The sensory trigger / incident that invites the hero into the adventure.",
            risingAction: "Three escalating attempts/obstacles with strict causal continuity and named emotions.",
            climax: "The insight and final test delivering the title/theme promise.",
            resolution: "Seamless return bridge to the Home Base with cozy emotional realization."
        },
        principles: {
            personalMotiveOrigin: "Hero desire must have a clear personal root (love, gift, curiosity), never an ungrounded mission statement.",
            worldLogicAndFrame: "Spread 1 must name the child's home base so the final spread's return journey makes complete sense.",
            recurringDeviceRule: "State the simple physical trigger of any anchor item on first use in Spread 1.",
            transitionAndResolution: "Bridging clauses required when crossing setting boundaries or returning home.",
            themePremiseAlignment: "Explicitly dramatize the core theme promise (e.g. quiet animal language).",
            emotionalVocabulary: "For ages 1-5, pair physical gestures with direct, named child-friendly emotion words.",
            bannedWordPolicy: "If a banned word must be replaced, preserve the story beat it was carrying using an approved substitute from BANNED_WORD_SUBSTITUTES — never delete the beat itself.",
            pronounPolicyGuard: "Pronoun Policy Guard (ages 1–5): the final text must not use third-person pronouns (he/she/him/her/his/hers/it/its) to refer to the hero or a named companion. Use the name, or restructure the sentence to avoid needing a pronoun at all (e.g. drop possessive by using an article: instead of 'She held her soft pebble' -> 'Lana wiggled, happy, holding a soft pebble'). Do not achieve 'no pronouns' by repeating the name awkwardly."
        }
    },

    // --- VISUAL RULES ---
    visual: {
        forbiddenKeywords: [
            "Text", "Label", "Sign", "Signature", "Watermark",
            "Split screen", "Collage", "Multiple panels", "Comic strip",
            "Blurry", "Distorted", "Grainy"
        ],
        mandatoryInjections: [
            "Cinematic lighting",
            "High fidelity",
            "Consistent character likeness"
        ],
        culturalGuardrails: [
            "Modest clothing (Shoulders and knees covered)",
            "No religious symbols unless specified",
            "Respect local architecture in background"
        ]
    },

    // --- TEMPLATES ---
    prompts: {
        baseTemplate: `
        TASK: Create a \${visualStyle} illustration.
        CONTEXT: \${environment}.
        ACTION: \${action}.
        MOOD: \${mood}.
        CAMERA: \${camera}.
        CHARACTER: \${characterDescription}.
        \${refinementParams}
        `
    }
};

export function getWordCountForAge(age: number): { min: number, max: number } {
    if (age <= 3) return GUIDEBOOK.narrative.wordCount["1-3"];
    if (age <= 5) return GUIDEBOOK.narrative.wordCount["4-5"];
    if (age <= 8) return GUIDEBOOK.narrative.wordCount["6-8"];
    return GUIDEBOOK.narrative.wordCount["9-12"];
}

export const BANNED_WORD_SUBSTITUTES: Record<string, string[]> = {
    "nook": ["cozy spot", "little corner", "play spot", "reading rug", "quiet corner"],
    "endeavor": ["try", "big try", "quest", "effort"],
    "observation": ["watching", "looking closely", "noticing"],
    "haste": ["rushing", "hurrying", "quick feet"],
    "foster": ["grow", "help", "care for"],
    "fatigue": ["sleepy", "tired", "heavy eyes"],
    "apparatus": ["tool", "gadget", "toy"]
};
