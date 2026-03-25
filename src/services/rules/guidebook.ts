
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
            "3-5": { min: 15, max: 30 },
            "6-8": { min: 40, max: 65 },
            "9-12": { min: 80, max: 120 }
        },
        structure: {
            intro: "Establish Hero in Normal World. Hint at Desire.",
            catalyst: "The Incident that breaks the routine.",
            risingAction: "Three attempts/obstacles.",
            climax: " The final test.",
            resolution: "New Normal. Hero has changed."
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
    if (age <= 5) return GUIDEBOOK.narrative.wordCount["3-5"];
    if (age <= 8) return GUIDEBOOK.narrative.wordCount["6-8"];
    return GUIDEBOOK.narrative.wordCount["9-12"];
}
