import { StoryBlueprint, SpreadDesignPlan } from '../../types';
import { SIMPLE_WORD_REPLACEMENT_DICTIONARY, getWordCountForAge } from './guidebook';

export interface DraftValidationResult {
    valid: boolean;
    errors: string[];
    warnings: string[];
}

export const Validator = {
    // rawy-visible-words-v1 Tokenizer
    countVisibleWords: (text: string): number => {
        if (!text) return 0;
        const normalized = text.normalize('NFC').trim();
        if (!normalized) return 0;
        const tokens = normalized.split(/\s+/);
        return tokens.filter(t => /[\p{L}\p{N}]/u.test(t)).length;
    },

    // Arabic Zero-Tashkeel Guard (v4.1)
    checkArabicTashkeel: (text: string): { pass: boolean, tashkeelCount: number } => {
        if (!text) return { pass: true, tashkeelCount: 0 };
        const matches = text.match(/[\u064B-\u065F\u0670]/g) || [];
        return { pass: matches.length === 0, tashkeelCount: matches.length };
    },

    validateBlueprint: (blueprint: any): boolean => {
        if (!blueprint) return false;
        if (!blueprint.foundation || !blueprint.structure) return false;
        if (!Array.isArray(blueprint.structure.spreads)) return false;
        
        // Deterministic recurringAsset validation (only if declared)
        if (blueprint.foundation.recurringAsset) {
            const asset = blueprint.foundation.recurringAsset;
            if (typeof asset !== 'object') return false;
            if (typeof asset.name !== 'string' || !asset.name.trim()) return false;
            if (typeof asset.description !== 'string' || !asset.description.trim()) return false;
            if (asset.appearancesSpreads && Array.isArray(asset.appearancesSpreads)) {
                const spreadCount = blueprint.structure.spreads.length || 8;
                for (const s of asset.appearancesSpreads) {
                    if (typeof s !== 'number' || s < 0 || s > spreadCount) return false;
                }
                if (asset.appearancesSpreads.length < 2) {
                    asset.generateAssetImage = false;
                }
            }
        }
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
        if (plan.spreads.length < expectedLength) return false;
        return true;
    },

    // 1. Home Base Check (Spread 1 Grounding)
    checkHomeBase: (spread1Text: string, language: string = 'en'): boolean => {
        if (!spread1Text) return false;
        const isArabic = language === 'ar';
        const homeBaseKeywordsEn = [
            'cozy spot', 'play spot', 'little corner', 'play space', 'play area',
            'room', 'bed', 'bedroom', 'rug', 'spot', 'corner', 'porch',
            'garden', 'tent', 'house', 'yard', 'kitchen', 'blanket', 'cushion',
            'den', 'camp', 'balcony', 'home', 'workshop', 'treehouse', 'library', 'academy', 'patio'
        ];
        const homeBaseKeywordsAr = [
            'غرفة', 'سرير', 'ركن', 'زاوية', 'بيت', 'منزل', 'حديقة', 'بساط',
            'سجادة', 'شرفة', 'خيمة', 'مكان', 'ألعاب', 'وسادة', 'ورشة', 'فناء', 'مرصد', 'مكتبة', 'سطح'
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
            'curled', 'returned', 'safe', 'warm', 'workshop', 'patio', 'library', 'yard', 'porch'
        ];
        const returnKeywordsAr = [
            'عاد', 'رجوع', 'عودة', 'بيت', 'منزل', 'سرير', 'نوم', 'أحلام',
            'حلم', 'دافئ', 'حضن', 'تصبح على خير', 'وسادة', 'غطاء', 'أمان',
            'استلقى', 'نام', 'ورشة', 'فناء', 'شرفة', 'مرصد', 'مكتبة'
        ];
        const keywords = isArabic ? returnKeywordsAr : returnKeywordsEn;
        const lower = finalSpreadText.toLowerCase();
        return keywords.some(kw => lower.includes(kw.toLowerCase()));
    },

    // 3. Anchor Trigger Rule / Visual Anchor Echo Check (Optional)
    checkAnchorEcho: (spread1Text: string, anchorItem?: string, anchorTriggerRule?: string): boolean => {
        if (!anchorItem && !anchorTriggerRule) return true;
        if (anchorItem?.toLowerCase() === 'none' || anchorTriggerRule?.toLowerCase() === 'none') return true;
        if (!spread1Text) return false;
        const target = `${anchorItem || ''} ${anchorTriggerRule || ''}`.toLowerCase();
        const keywords = target.split(/\s+/).filter(w => w.length > 3 && !['with', 'when', 'that', 'from', 'this', 'glows', 'cools', 'none', 'special', 'object'].includes(w));
        if (keywords.length === 0) return true;
        const lower = spread1Text.toLowerCase();
        return keywords.some(kw => lower.includes(kw));
    },

    // 3b. Dual Hero Agency Check
    checkDualHeroAgency: (spreads: string[], heroA?: string, heroB?: string): { pass: boolean, errors: string[] } => {
        if (!heroA || !heroB) return { pass: true, errors: [] };
        const errors: string[] = [];
        const cleanA = heroA.trim().toLowerCase();
        const cleanB = heroB.trim().toLowerCase();
        if (!cleanA || !cleanB) return { pass: true, errors: [] };

        // Spread 1 must establish both heroes
        const s1 = (spreads[0] || '').toLowerCase();
        if (!s1.includes(cleanA) || !s1.includes(cleanB)) {
            errors.push(`Dual Hero Agency Violation (Spread 1): Both "${heroA}" and "${heroB}" must be established in Spread 1.`);
        }

        // Hero B presence across story (at least 5 spreads)
        let bCount = 0;
        spreads.forEach(s => {
            if ((s || '').toLowerCase().includes(cleanB)) bCount++;
        });
        if (bCount < Math.min(5, spreads.length)) {
            errors.push(`Dual Hero Agency Violation: Co-hero "${heroB}" only appears in ${bCount} spreads (must appear in at least 5 spreads).`);
        }

        // Climax spread (second to last) must feature both heroes
        const climaxIdx = Math.max(0, spreads.length - 2);
        const climaxText = (spreads[climaxIdx] || '').toLowerCase();
        if (!climaxText.includes(cleanA) || !climaxText.includes(cleanB)) {
            errors.push(`Dual Hero Agency Violation (Climax Spread ${climaxIdx + 1}): Climax must feature indispensable co-action from BOTH "${heroA}" and "${heroB}".`);
        }

        return { pass: errors.length === 0, errors };
    },

    // 3c. Anti-Preachy Ending Check
    checkAntiPreachy: (finalSpreadText: string, language: string = 'en'): { pass: boolean, error?: string } => {
        if (!finalSpreadText) return { pass: true };
        const isArabic = language === 'ar';
        if (isArabic) {
            const arPreachyPatterns = [
                /(الصبر|التعاون|العمل المشترك)\s*(هو|كان)\s*(أفضل|سر|أجمل|مفتاح)/i,
                /\b(تعلم\s*(أن|أنه)|الدرس هو|الموعظة هي)\b/i
            ];
            for (const pattern of arPreachyPatterns) {
                if (pattern.test(finalSpreadText)) {
                    return { pass: false, error: `Anti-Preachy Rule Violation: Final spread contains explicit proverb/moral formula. Deliver resolution through character action, dialogue, or cozy closure instead.` };
                }
            }
        } else {
            const enPreachyPatterns = [
                /\b(patience|kindness|teamwork|working together|true discovery|gentle patience)\s+(is|was|is always|was always)\s+(the best|the key|the greatest|the truest|a superpower)\b/i,
                /\b(learned that|the moral of the story|the lesson was)\b/i,
                /\b(unlocked every (path|door|secret))\b/i
            ];
            for (const pattern of enPreachyPatterns) {
                if (pattern.test(finalSpreadText)) {
                    return { pass: false, error: `Anti-Preachy Rule Violation: Final spread contains explicit moralizing formula. Deliver resolution through character action, sensory detail, or cozy closure instead.` };
                }
            }
        }
        return { pass: true };
    },

    // 3d. Custom Story Text Preservation Check
    checkCustomTextPreservation: (spreads: string[], customStoryText?: string): { pass: boolean, missingWords: string[] } => {
        if (!customStoryText || !customStoryText.trim()) return { pass: true, missingWords: [] };
        const allSpreadsText = spreads.join(' ').toLowerCase();
        const normalize = (w: string) => w.replace(/[^\p{L}\p{N}]/gu, '').toLowerCase();
        const customWords = customStoryText.split(/\s+/)
            .map(normalize)
            .filter(w => w.length >= 3);
        
        const missingWords: string[] = [];
        for (const w of customWords) {
            if (!allSpreadsText.includes(w)) {
                missingWords.push(w);
            }
        }
        const threshold = Math.max(1, Math.floor(customWords.length * 0.05));
        return {
            pass: missingWords.length <= threshold,
            missingWords
        };
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

    // Strip Arabic Tashkeel helper (v4.1)
    stripArabicTashkeel: (text: string): string => {
        if (!text) return '';
        return text.replace(/[\u064B-\u065F\u0670]/g, '');
    },

    // Deterministic Quality Checks for Story Engine v4.2
    validateDraftQuality: (
        draft: { text?: string }[] | string[],
        options: {
            expectedLength?: number;
            childAge?: number;
            childName?: string;
            secondCharacterName?: string;
            isDual?: boolean;
            language?: string;
            anchorTriggerRule?: string;
            primaryVisualAnchor?: string;
            customStoryText?: string;
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
        const wordCountRule = getWordCountForAge(age);

        // Check 1: Word Count per Spread (rawy-visible-words-v1 hard error)
        texts.forEach((text, idx) => {
            const wc = Validator.countVisibleWords(text);
            if (wc < wordCountRule.min || wc > wordCountRule.max) {
                errors.push(`Word Count Violation (Spread ${idx + 1}): Contains ${wc} visible words, expected ${wordCountRule.min}–${wordCountRule.max} words.`);
            }
        });

        // Check 2: Arabic Zero-Tashkeel Guard (hard error)
        if (language === 'ar') {
            texts.forEach((text, idx) => {
                const tashkeel = Validator.checkArabicTashkeel(text);
                if (!tashkeel.pass) {
                    errors.push(`Arabic Tashkeel Violation (Spread ${idx + 1}): Contains ${tashkeel.tashkeelCount} diacritics. Arabic manuscript must be 100% free of Tashkeel.`);
                }
            });
        }

        // Check 3: Pronoun Policy Guard (Ages 1–5 hard error for English)
        if (age <= 5 && language !== 'ar') {
            texts.forEach((text, idx) => {
                const pronounCheck = Validator.checkPronounGuard(text, age, language);
                if (!pronounCheck.pass) {
                    errors.push(`Pronoun Policy Violation (Spread ${idx + 1}): Found pronouns [${pronounCheck.matchedPronouns.join(', ')}]. For ages 1–5, avoid 3rd-person pronouns. Use hero's name possessive ('${options.childName || 'Hero'}'s item') or active verbs.`);
                }
            });
        }

        // Check 4: Grammar Fragment Guard (hard error)
        const grammarCheck = Validator.checkGrammarFragments(texts);
        if (!grammarCheck.pass) {
            grammarCheck.fragments.forEach(f => {
                errors.push(`Grammar Fragment Violation (Spread ${f.spread}): Possible missing verb in '${f.text}' (use 'felt ${f.text.split(' ')[1]}' or '${f.text.split(' ')[0]} was ${f.text.split(' ')[1]}').`);
            });
        }

        // Check 5: Dual Hero Agency Check (hard error if dual-hero mode)
        if (options.isDual || (options.childName && options.secondCharacterName)) {
            const agencyCheck = Validator.checkDualHeroAgency(texts, options.childName, options.secondCharacterName);
            if (!agencyCheck.pass) {
                agencyCheck.errors.forEach(err => errors.push(err));
            }
        }

        // Check 6: Anti-Preachy Ending Guard (hard error)
        const preachyCheck = Validator.checkAntiPreachy(texts[texts.length - 1] || '', language);
        if (!preachyCheck.pass && preachyCheck.error) {
            errors.push(preachyCheck.error);
        }

        // Check 7: Custom Story Text Preservation (hard error)
        if (options.customStoryText) {
            const customCheck = Validator.checkCustomTextPreservation(texts, options.customStoryText);
            if (!customCheck.pass) {
                errors.push(`Custom Text Preservation Violation: Manuscript dropped key customer words: [${customCheck.missingWords.slice(0, 5).join(', ')}].`);
            }
        }

        // Check 8: Home Base Grounding (Spread 1 soft warning)
        if (!Validator.checkHomeBase(texts[0] || '', language)) {
            warnings.push("Spread 1 Home Base Check: Spread 1 should explicitly ground the child's starting location (e.g. cozy spot, room, rug, garden).");
        }

        // Check 9: Return Bridge (Final Spread soft warning)
        if (!Validator.checkReturnBridge(texts[texts.length - 1] || '', language)) {
            warnings.push(`Final Spread (${texts.length}) Return Bridge Check: Final spread should include a warm return bridge or cozy bedtime closure.`);
        }

        // Check 10: Anchor Trigger Rule / Visual Anchor Echo (soft warning, only if non-empty and not 'none')
        if (options.primaryVisualAnchor && options.primaryVisualAnchor.toLowerCase() !== 'none') {
            if (!Validator.checkAnchorEcho(texts[0] || '', options.primaryVisualAnchor, options.anchorTriggerRule)) {
                warnings.push(`Anchor Trigger Echo Check: Spread 1 should introduce and establish the physical behavior of '${options.primaryVisualAnchor}'.`);
            }
        }

        // Check 11: Named Emotion Check (Ages 1–5 soft warning)
        const emotionCheck = Validator.checkNamedEmotions(texts, age, language);
        if (!emotionCheck.pass) {
            warnings.push(`Named Emotion Check: Spreads [${emotionCheck.missingSpreads.join(', ')}] should pair physical actions with direct child-friendly emotion words for ages 1–5.`);
        }

        // Check 12: Simple Vocabulary Check (Ages 1–3 soft warning)
        if (age <= 3) {
            const vocabCheck = Validator.checkSimpleVocabularyForAge(texts, age, language);
            if (!vocabCheck.pass) {
                vocabCheck.flaggedWords.forEach(f => {
                    warnings.push(`Simple Vocabulary Guard (Spread ${f.spread}): '${f.word}' is too complex for age ${age}. Replace with: [${f.suggestions.join(', ')}].`);
                });
            }
        }

        return {
            valid: errors.length === 0,
            errors,
            warnings
        };
    },

    // 8. Deterministic Vocabulary Sanitizer
    sanitizeVocabulary: (text: string, age: number = 3, language: string = 'en'): string => {
        if (age > 3 || language === 'ar' || !text) return text;
        let sanitized = text;
        Object.entries(SIMPLE_WORD_REPLACEMENT_DICTIONARY).forEach(([bannedWord, suggestions]) => {
            if (suggestions && suggestions.length > 0) {
                const replacement = suggestions[0];
                const regex = new RegExp(`\\b${bannedWord}\\b`, 'gi');
                sanitized = sanitized.replace(regex, (match) => {
                    if (match[0] === match[0].toUpperCase()) {
                        return replacement.charAt(0).toUpperCase() + replacement.slice(1);
                    }
                    return replacement;
                });
            }
        });
        return sanitized;
    },

    // 9. Batch Draft Sanitizer
    sanitizeDraft: (
        draft: { text?: string }[] | string[],
        age: number = 3,
        language: string = 'en'
    ): { text: string }[] => {
        if (!Array.isArray(draft)) return [];
        return draft.map(item => {
            let rawText = typeof item === 'string' ? item : item.text || '';
            if (language === 'ar') {
                rawText = Validator.stripArabicTashkeel(rawText);
            }
            const sanitizedText = Validator.sanitizeVocabulary(rawText, age, language);
            return { text: sanitizedText };
        });
    }
};
