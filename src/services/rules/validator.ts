
import { StoryBlueprint, SpreadDesignPlan } from '../../types';

import { SIMPLE_WORD_REPLACEMENT_DICTIONARY } from './guidebook';

export interface DraftValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export const Validator = {
    validateBlueprint: (blueprint: any): boolean => {
        if (!blueprint) return false;
        if (!blueprint.foundation || !blueprint.structure) return false;
        if (!Array.isArray(blueprint.structure.spreads)) return false;
        return true;
    },

    validateDraft: (draft: any[], expectedLength: number = 8): boolean => {
        if (!Array.isArray(draft)) return false;
        if (draft.length < expectedLength) return false;
        return true;
    },

    validateVisualPlan: (plan: any, expectedLength: number = 8): boolean => {
        if (!plan || !plan.spreads) return false;
        if (!Array.isArray(plan.spreads)) return false;
        // The plan might include a Cover (Spread 0), so it could be script.length + 1
        // Or sometimes it matches exactly. We should just check it has *enough* spreads.
        if (plan.spreads.length < expectedLength) return false;
        return true;
    },

    // 1. Home Base Check (Spread 1 Grounding)
    checkHomeBase: (spread1Text: string, language: string = 'en'): boolean => {
        if (!spread1Text) return false;
        const isArabic = language === 'ar';
        const homeBaseKeywordsEn = [
            'nook', 'room', 'bed', 'bedroom', 'rug', 'spot', 'corner', 'porch',
            'garden', 'tent', 'house', 'yard', 'kitchen', 'blanket', 'cushion',
            'den', 'camp', 'balcony', 'play space', 'play area', 'play spot', 'home'
        ];
        const homeBaseKeywordsAr = [
            'غرفة', 'سرير', 'ركن', 'زاوية', 'بيت', 'منزل', 'حديقة', 'بساط',
            'سجادة', 'شرفة', 'خيمة', 'مكان', 'ألعاب', 'وسادة'
        ];
        const keywords = isArabic ? homeBaseKeywordsAr : homeBaseKeywordsEn;
        const lower = spread1Text.toLowerCase();
        return keywords.some(kw => lower.includes(kw.toLowerCase()));
    },

    // 2. Return Bridge Check (Final Spread Closure)
    checkReturnBridge: (finalSpreadText: string, language: string = 'en'): boolean => {
        if (!finalSpreadText) return false;
        const isArabic = language === 'ar';
        const returnKeywordsEn = [
            'back', 'home', 'bed', 'sleep', 'dream', 'cozy', 'snuggle', 'whisper',
            'goodnight', 'tuck', 'blanket', 'rest', 'hug', 'pillow', 'nest',
            'curled', 'returned', 'safe', 'warm'
        ];
        const returnKeywordsAr = [
            'عاد', 'رجوع', 'عودة', 'بيت', 'منزل', 'سرير', 'نوم', 'أحلام',
            'حلم', 'دافئ', 'حضن', 'تصبح على خير', 'وسادة', 'غطاء', 'أمان',
            'استلقى', 'نام'
        ];
        const keywords = isArabic ? returnKeywordsAr : returnKeywordsEn;
        const lower = finalSpreadText.toLowerCase();
        return keywords.some(kw => lower.includes(kw.toLowerCase()));
    },

    // 3. Anchor Trigger Rule / Visual Anchor Echo Check
    checkAnchorEcho: (spread1Text: string, anchorItem?: string, anchorTriggerRule?: string): boolean => {
        if (!anchorItem && !anchorTriggerRule) return true;
        if (!spread1Text) return false;
        const target = `${anchorItem || ''} ${anchorTriggerRule || ''}`.toLowerCase();
        const keywords = target.split(/\s+/).filter(w => w.length > 3 && !['with', 'when', 'that', 'from', 'this', 'glows', 'cools'].includes(w));
        if (keywords.length === 0) return true;
        const lower = spread1Text.toLowerCase();
        return keywords.some(kw => lower.includes(kw));
    },

    // 4. Pronoun Policy Guard (Ages 1–5)
    checkPronounGuard: (text: string, age: number = 5, language: string = 'en'): { pass: boolean, matchedPronouns: string[] } => {
        if (age > 5 || language === 'ar') {
            return { pass: true, matchedPronouns: [] };
        }
        const pronounRegex = /\b(he|she|him|her|his|hers|it|its)\b/gi;
        const matches = text.match(pronounRegex) || [];
        return {
            pass: matches.length === 0,
            matchedPronouns: Array.from(new Set(matches.map(m => m.toLowerCase())))
        };
    },

    // 5. Named Emotion Check (Ages 1–5 in Spreads 3+)
    checkNamedEmotions: (spreads: string[], age: number = 5, language: string = 'en'): { pass: boolean, missingSpreads: number[] } => {
        if (age > 5) return { pass: true, missingSpreads: [] };
        const isArabic = language === 'ar';
        const emotionWordsEn = [
            'happy', 'glad', 'joy', 'sad', 'worried', 'scared', 'afraid',
            'proud', 'surprised', 'relieved', 'cozy', 'content', 'loved',
            'brave', 'excited', 'confused', 'disappointed', 'calm', 'shy',
            'mad', 'upset', 'mixed up', 'puzzled', 'safe',
            'eager', 'curious', 'smile', 'smiled', 'giggle', 'giggled', 'laughed', 'sigh', 'sighed'
        ];
        const emotionWordsAr = [
            'سعيد', 'فرح', 'حزين', 'قلق', 'خائف', 'فخور', 'متفاجئ',
            'مرتاح', 'مطمئن', 'محبوب', 'شجاع', 'حائر', 'خائب', 'هادئ',
            'خجول', 'متحمس', 'فضولي', 'ابتسم', 'ابتسامة', 'ضحك', 'تنهد', 'غاضب', 'آمن'
        ];
        const emotionWords = isArabic ? emotionWordsAr : emotionWordsEn;
        const missingSpreads: number[] = [];

        // Check spreads starting from Spread 3 (index 2)
        for (let i = 2; i < spreads.length; i++) {
            const spreadText = spreads[i] || '';
            const lower = spreadText.toLowerCase();
            const hasEmotion = emotionWords.some(em => lower.includes(em.toLowerCase()));
            if (!hasEmotion) {
                missingSpreads.push(i + 1);
            }
        }

        return {
            pass: missingSpreads.length === 0,
            missingSpreads
        };
    },

    // 6. Toddler Simple Vocabulary Check (Ages 1–3)
    checkSimpleVocabularyForAge: (spreads: string[], age: number = 3, language: string = 'en'): { pass: boolean, flaggedWords: { spread: number, word: string, suggestions: string[] }[] } => {
        if (age > 3 || language === 'ar') return { pass: true, flaggedWords: [] };
        const flagged: { spread: number, word: string, suggestions: string[] }[] = [];
        
        spreads.forEach((spreadText, idx) => {
            const lower = (spreadText || '').toLowerCase();
            Object.keys(SIMPLE_WORD_REPLACEMENT_DICTIONARY).forEach(word => {
                const regex = new RegExp(`\\b${word}\\b`, 'i');
                if (regex.test(lower)) {
                    flagged.push({
                        spread: idx + 1,
                        word,
                        suggestions: SIMPLE_WORD_REPLACEMENT_DICTIONARY[word] || []
                    });
                }
            });
        });

        return {
            pass: flagged.length === 0,
            flaggedWords: flagged
        };
    },

    // 7. Grammar Fragments Check (e.g. "Lana content", "Lana happy")
    checkGrammarFragments: (spreads: string[]): { pass: boolean, fragments: { spread: number, text: string }[] } => {
        const fragments: { spread: number, text: string }[] = [];
        const pattern = /\b([A-Z][a-z]+)\s+(content|happy|calm|sad|mad|proud|brave)\b(?!\s+(?:and|or|was|is|felt|seemed|with))/g;
        
        spreads.forEach((spreadText, idx) => {
            const matches = (spreadText || '').match(pattern) || [];
            matches.forEach(m => {
                // Ignore if preceded by felt/was/is (e.g. "felt Lana happy" - rare, but check)
                if (!/\b(was|is|felt|felt\s+like)\s+$/i.test(m)) {
                    fragments.push({ spread: idx + 1, text: m });
                }
            });
        });

        return {
            pass: fragments.length === 0,
            fragments
        };
    },

    // Deterministic Quality Checks for Story Engine v3.3
    validateDraftQuality: (
        draft: { text?: string }[] | string[],
        options: {
            expectedLength?: number;
            childAge?: number;
            childName?: string;
            language?: string;
            anchorTriggerRule?: string;
            primaryVisualAnchor?: string;
        } = {}
    ): DraftValidationResult => {
        const errors: string[] = [];
        const warnings: string[] = [];
        const age = options.childAge || 5;
        const expectedLen = options.expectedLength || 8;
        const language = options.language || 'en';

        if (!Array.isArray(draft) || draft.length < expectedLen) {
            errors.push(`Draft has ${Array.isArray(draft) ? draft.length : 0} spreads, expected at least ${expectedLen}.`);
            return { valid: errors.length === 0, errors, warnings };
        }

        const texts = draft.map(item => (typeof item === 'string' ? item : item.text || ''));

        // Check 1: Home Base Grounding (Spread 1)
        if (!Validator.checkHomeBase(texts[0] || '', language)) {
            warnings.push("Spread 1 Home Base Check: Spread 1 should explicitly ground the child's starting location (e.g. cozy spot, room, rug, garden).");
        }

        // Check 2: Return Bridge (Final Spread)
        if (!Validator.checkReturnBridge(texts[texts.length - 1] || '', language)) {
            warnings.push(`Final Spread (${texts.length}) Return Bridge Check: Final spread should include a warm return bridge or cozy bedtime closure.`);
        }

        // Check 3: Anchor Trigger Rule / Visual Anchor Echo
        if (options.primaryVisualAnchor || options.anchorTriggerRule) {
            if (!Validator.checkAnchorEcho(texts[0] || '', options.primaryVisualAnchor, options.anchorTriggerRule)) {
                warnings.push(`Anchor Trigger Echo Check: Spread 1 should introduce and establish the physical behavior of '${options.primaryVisualAnchor || 'anchor item'}'.`);
            }
        }

        // Check 4: Pronoun Policy Guard (Ages 1–5)
        if (age <= 5 && language !== 'ar') {
            texts.forEach((text, idx) => {
                const pronounCheck = Validator.checkPronounGuard(text, age, language);
                if (!pronounCheck.pass) {
                    warnings.push(`Pronoun Policy Guard (Spread ${idx + 1}): Found pronouns [${pronounCheck.matchedPronouns.join(', ')}]. For ages 1–5, avoid 3rd-person pronouns. Use hero's name possessive ('${options.childName || 'Hero'}'s pebble') or active verbs.`);
                }
            });
        }

        // Check 5: Named Emotion Check (Ages 1–5)
        const emotionCheck = Validator.checkNamedEmotions(texts, age, language);
        if (!emotionCheck.pass) {
            warnings.push(`Named Emotion Check: Spreads [${emotionCheck.missingSpreads.join(', ')}] should pair physical actions with direct child-friendly emotion words for ages 1–5.`);
        }

        // Check 6: Simple Vocabulary Check (Ages 1–3)
        if (age <= 3) {
            const vocabCheck = Validator.checkSimpleVocabularyForAge(texts, age, language);
            if (!vocabCheck.pass) {
                vocabCheck.flaggedWords.forEach(f => {
                    warnings.push(`Simple Vocabulary Guard (Spread ${f.spread}): '${f.word}' is too complex for age ${age}. Replace with: [${f.suggestions.join(', ')}].`);
                });
            }
        }

        // Check 7: Grammar Fragment Guard
        const grammarCheck = Validator.checkGrammarFragments(texts);
        if (!grammarCheck.pass) {
            grammarCheck.fragments.forEach(f => {
                warnings.push(`Grammar Fragment Guard (Spread ${f.spread}): Possible missing verb in '${f.text}' (use 'felt ${f.text.split(' ')[1]}' or '${f.text.split(' ')[0]} was ${f.text.split(' ')[1]}').`);
            });
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    }
};
