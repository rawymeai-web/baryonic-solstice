
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
            resolution: "Seamless return bridge to the Home Base with cozy emotional realization and child-voice takeaway."
        },
        principles: {
            personalMotiveOrigin: "Hero desire must have a clear personal root (love, gift, curiosity), never an ungrounded mission statement.",
            worldLogicAndFrame: "Spread 1 must name the child's home base so the final spread's return journey makes complete sense.",
            recurringDeviceRule: "State the simple physical trigger of any anchor item on first use in Spread 1. Always state cause before effect.",
            objectContinuityRule: "For ages 1–5, maintain object continuity by using the hero's name possessive ('Lana's pebble') instead of generic articles ('a pebble') which create discontinuity.",
            helperAnimalPurpose: "When introducing a mentor or helper animal (e.g. owl, turtle), explicitly describe what they embody ('slow and calm') so downstream callbacks feel earned.",
            warmClosingTakeaway: "End with a cozy, warm resolution in the child's own voice (e.g. 'Quiet and slow was the best kind of magic'). Never preach with adult proverbs, but never stop without a felt resolution.",
            transitionAndResolution: "Bridging clauses required when crossing setting boundaries or returning home.",
            themePremiseAlignment: "Explicitly dramatize the core theme promise (e.g. quiet animal language).",
            emotionalVocabulary: "For ages 1–3, use simple primary emotions (happy, sad, mad, calm, proud, scared, mixed up, safe). Save complex emotions (frustrated, disappointed) for older tiers.",
            bannedWordPolicy: "If a banned or overly complex word must be replaced, preserve the story beat it was carrying using an approved substitute from SIMPLE_WORD_REPLACEMENT_DICTIONARY — never delete the beat itself.",
            pronounPolicyGuard: "Pronoun Policy Guard (ages 1–5): the final text must not use third-person pronouns (he/she/him/her/his/hers/it/its) to refer to the hero or a named companion. Use the hero's name, or restructure sentences naturally without ungrammatical fragments."
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

// --- AGE-TIERED VOCABULARY WHITELISTS & REPLACEMENTS ---
export const SIMPLE_WORD_REPLACEMENT_DICTIONARY: Record<string, string[]> = {
    // Adult / Academic Words
    "nook": ["cozy spot", "little corner", "play spot", "reading rug", "quiet corner"],
    "endeavor": ["try", "big try", "quest", "effort"],
    "observation": ["watching", "looking closely", "noticing"],
    "haste": ["rushing", "hurrying", "quick feet"],
    "foster": ["grow", "help", "care for"],
    "fatigue": ["sleepy", "tired", "heavy eyes"],
    "apparatus": ["tool", "gadget", "toy"],

    // Overly Complex Verbs for Toddler Tier (1-3)
    "scurried": ["ran", "dashed", "hid", "zipped"],
    "slumped": ["sat down", "plopped down", "sat"],
    "sank": ["sat down", "rested"],
    "swayed": ["moved", "danced", "bent"],
    "drifted": ["blew", "flew", "floated"],
    "fluttered": ["flapped", "flew", "danced"],
    "peered": ["looked", "peeked", "gazed"],
    "observed": ["watched", "looked at"],
    "retreated": ["backed away", "hid", "stepped back"],
    "inquired": ["asked", "wondered"],
    "approached": ["walked up", "came close"],

    // Complex Emotions for Ages 1-3 -> Primary Emotions
    "frustrated": ["mad", "upset"],
    "confused": ["mixed up", "puzzled"],
    "disappointed": ["sad", "let down"],
    "relieved": ["calm", "safe", "happy"],
    "content": ["happy", "calm", "cozy"],
    "furious": ["very mad", "grumpy"],
    "ecstatic": ["so happy", "excited"],
    "anxious": ["worried", "scared"],

    // Obscure / Complex Nouns for Toddlers
    "fennec fox": ["little fox", "baby fox", "desert fox"],
    "fennec": ["little fox", "small fox"],
    "foliage": ["leaves", "green bushes", "trees"],
    "canopy": ["treetops", "branches", "big trees"],
    "silhouette": ["shadow", "dark shape"],
    "terrain": ["ground", "sand", "grass"]
};

// --- INTUITIVE SOUND EFFECT WHITELIST ---
export const INTUITIVE_SOUND_WORDS = {
    en: [
        "CRUNCH", "SHHH...", "SNIFF SNIFF", "SIGH...", "SNORE!", "SPLASH!",
        "ROAR!", "BEEP BEEP", "TAP TAP", "FLAP FLAP", "TWEET TWEET", "ZOOM!",
        "GIGGLE GIGGLE", "SQUEAK!", "CLAP CLAP", "DRIP DROP", "POP!", "WHOOSH!",
        "THUMP THUMP", "TICK TOCK", "YUM YUM", "WIGGLE WIGGLE"
    ],
    ar: [
        "شـشـش...", "طَـق طَـق!", "هَـفف...", "زَق زَق!", "تِك تِك!", "هـووو!",
        "قـهـقـهـة!", "تـوت تـوت!", "بـلـوب!", "سـنـور!", "تـك تـك!"
    ]
};

// --- BANNED / COMPLEX WORDS FOR TODDLERS (Ages 1-3) ---
export const TODDLER_BANNED_WORDS = [
    "scurried", "slumped", "swayed", "drifted", "fluttered", "peered", "observed",
    "retreated", "inquired", "approached", "frustrated", "confused", "disappointed",
    "relieved", "content", "furious", "ecstatic", "anxious", "fennec", "foliage",
    "canopy", "silhouette", "terrain", "nook", "endeavor", "observation", "haste",
    "foster", "fatigue", "apparatus", "whimsical", "enchanted", "mysterious"
];

export const BANNED_WORD_SUBSTITUTES = SIMPLE_WORD_REPLACEMENT_DICTIONARY;
