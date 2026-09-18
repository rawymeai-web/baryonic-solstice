/**
 * PROMPT ENGINEER — v6.0 (DNA-Only)
 *
 * PHILOSOPHY:
 *   "Here is HERO_1 (DNA image). Here is HERO_2 (DNA image).
 *    Put them in scene X doing action Y in style Z."
 *
 *   ONE image per hero = the approved stylized DNA reference.
 *   No raw photos. No fusion. No identity anchors.
 *   The DNA image IS the character authority.
 */

import {
    SpreadDesignPlan, SpreadPlan, StoryBlueprint, WorkflowLog,
    StyleProfile, HeroProfile, SceneProp
} from '../../types';

// ---------------------------------------------------------------------------
// VALIDATION & SANITIZATION
// ---------------------------------------------------------------------------

const UNNAMED_CHARACTER_TERMS = [
    'other kids', 'the kids', 'other children', 'the children',
    'a group of kids', 'some kids', 'some children', 'the crowd',
    'crowd of', 'group of children', 'friends', 'classmates',
    'bystanders', 'passersby', 'people around', 'children around',
    'background children', 'other people', 'onlookers',
];

const FORBIDDEN_WORDS = [
    'photobook', 'photo book', "children's book", 'kids book',
    'double-page spread', 'double page spread', 'printed spread',
    'crease', 'fold', 'book cover', 'story cover', 'hardcover', 'hard cover',
    'real photo', 'identity anchor', 'raw photo', 'photograph',
    'fuse', 'fusion', 'spine', 'seam',
];

const LOGO_BRANDS = ['NASA', 'Nike', 'Adidas', 'Apple', 'Disney'];

export interface PromptValidationResult {
    passed: boolean;
    errors: string[];
    warnings: string[];
}

export function sanitizeHeroExpression(expr: string, heroToken?: string): string {
    if (!expr || typeof expr !== 'string') return `${heroToken ? heroToken + ' has an ' : ''}expressive, natural expression reflecting the scene mood`;
    let clean = expr.trim();

    if (heroToken) {
        clean = clean.replace(/\b(he|she)\b/gi, heroToken);
        clean = clean.replace(/\b(his|her)\b/gi, `${heroToken}'s`);
        clean = clean.replace(/\b(him|her)\b/gi, heroToken);
        if (!clean.includes(heroToken)) {
            clean = `${heroToken} with ${clean}`;
        }
    }

    // Prevent grotesque horror or terrifying facial distortions while preserving authentic emotional arcs
    const replacements: [RegExp, string][] = [
        [/\b(scowling|furious|mad|sulking)\b/gi, 'determined, focused frown'],
        [/\b(crying|weeping|miserable|despairing)\b/gi, 'gentle, quiet, melancholic expression'],
        [/\b(terrified|horrified|panicked)\b/gi, 'wide-eyed surprise and startle'],
        [/\b(exhausted|fatigued)\b/gi, 'soft, sleepy, weary expression'],
        [/\b(bored|displeased)\b/gi, 'pensive, wondering expression'],
    ];

    replacements.forEach(([pattern, rep]) => {
        clean = clean.replace(pattern, rep);
    });

    clean = clean.replace(/^(a|an|the)\s+/i, '').replace(/\bexpression\b/gi, '').trim();
    return clean || `${heroToken ? heroToken + ' is ' : ''}thoughtful and expressive`;
}

function validateAssembledPrompt(prompt: string): PromptValidationResult {
    const errors: string[] = [];
    const warnings: string[] = [];
    const lower = prompt.toLowerCase();

    // 1. HARD FAIL: unnamed character terms
    UNNAMED_CHARACTER_TERMS.forEach(term => {
        if (lower.includes(term.toLowerCase())) {
            errors.push(`UNNAMED_CHARACTER: "${term}" found.`);
        }
    });

    // 2. HARD FAIL: forbidden words
    FORBIDDEN_WORDS.forEach(word => {
        const regex = new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'i');
        if (regex.test(lower)) {
            errors.push(`FORBIDDEN_WORD: "${word}" found.`);
        }
    });

    // 3. WARNING: real brand logos that conflict with no-text rule
    LOGO_BRANDS.forEach(brand => {
        if (prompt.includes(brand)) {
            warnings.push(`LOGO_RISK: "${brand}" brand name found — the AI may render real logo text. Replace with a generic description.`);
        }
    });

    return { passed: errors.length === 0, errors, warnings };
}

function sanitizeText(text: string): string {
    if (!text || typeof text !== 'string') return '';
    let clean = text;
    // Only strip exact forbidden phrases — use \b boundaries to avoid destroying partial words
    // e.g. 'photograph' should NOT strip from 'photographic'
    const safeForbidden = [
        'photobook', 'photo book', "children's book", 'kids book',
        'double-page spread', 'double page spread', 'printed spread',
        'crease', 'fold', 'book cover', 'story cover', 'hardcover', 'hard cover',
        'real photo', 'identity anchor', 'raw photo', 'photograph',
        'fuse', 'fusion', 'spine', 'seam',
    ];
    safeForbidden.forEach(word => {
        clean = clean.replace(new RegExp(`\\b${word.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}\\b`, 'gi'), '');
    });
    // Replace real-world logo names with safe alternatives
    clean = clean.replace(/\bNASA\b/g, 'space-themed emblem');
    return clean.replace(/\s{2,}/g, ' ').trim();
}

function sanitizeUnnamedCharacters(text: string, heroTokens: string[]): string {
    let clean = text;
    UNNAMED_CHARACTER_TERMS.forEach(term => {
        const replacement = heroTokens.length >= 2 ? heroTokens[1] : 'the surrounding environment';
        clean = clean.replace(new RegExp(term, 'gi'), replacement);
    });
    return clean;
}

// ---------------------------------------------------------------------------
// BIOMETRIC EXTRACTION HELPER
// ---------------------------------------------------------------------------
export function extractBiometrics(desc: any): {
    eyeColor: string;
    hairColor: string;
    hairStyle: string;
    skinTone: string;
    hasExplicitLocks: boolean;
} {
    if (!desc) {
        return {
            eyeColor: 'Dark brown',
            hairColor: 'Dark brown',
            hairStyle: 'Short, natural texture',
            skinTone: 'Warm natural tone',
            hasExplicitLocks: false
        };
    }

    let obj: any = null;
    let descStr = '';

    if (typeof desc === 'object') {
        obj = desc;
        try {
            descStr = JSON.stringify(desc);
        } catch (e) {}
    } else if (typeof desc === 'string') {
        descStr = desc;
        try {
            obj = JSON.parse(desc);
        } catch (e) {}
    }

    let eyeColor = obj?.identity?.eye_color || '';
    let hairColor = obj?.identity?.hair?.color || '';
    let hairStyle = obj?.identity?.hair?.style || obj?.identity?.hair?.texture || '';
    let skinTone = obj?.identity?.skin?.tone || '';

    // Regex fallbacks from raw text
    if (!eyeColor && descStr) {
        const eyeMatch = descStr.match(/eye(?:s|\s*color)?[:\s]+([^\n,.}"]+)/i) || descStr.match(/"eye_color":\s*"([^"]+)"/i);
        if (eyeMatch) eyeColor = eyeMatch[1].trim();
    }
    if (!hairColor && descStr) {
        const hairMatch = descStr.match(/hair(?:[\s\-_]*color)?[:\s]+([^\n,.}"]+)/i) || descStr.match(/"color":\s*"([^"]+)"/i);
        if (hairMatch) hairColor = hairMatch[1].trim();
    }
    if (!hairStyle && descStr) {
        const styleMatch = descStr.match(/hair(?:[\s\-_]*style)?[:\s]+([^\n,.}"]+)/i) || descStr.match(/"style":\s*"([^"]+)"/i);
        if (styleMatch) hairStyle = styleMatch[1].trim();
    }
    if (!skinTone && descStr) {
        const skinMatch = descStr.match(/skin(?:[\s\-_]*tone)?[:\s]+([^\n,.}"]+)/i) || descStr.match(/"tone":\s*"([^"]+)"/i);
        if (skinMatch) skinTone = skinMatch[1].trim();
    }

    const hasExplicitLocks = !!(eyeColor || hairColor || skinTone);

    return {
        eyeColor: eyeColor || 'Dark brown',
        hairColor: hairColor || 'Dark brown',
        hairStyle: hairStyle || 'Natural texture matching DNA reference',
        skinTone: skinTone || 'Warm natural tone matching DNA reference',
        hasExplicitLocks
    };
}

// ---------------------------------------------------------------------------
// GLOBAL PROP INVARIANCE LOCK HELPER
// ---------------------------------------------------------------------------
export function extractGlobalPropLocks(
    plan: SpreadDesignPlan | undefined,
    blueprint: StoryBlueprint | undefined
): { name: string; canonicalDescription: string }[] {
    const propMap = new Map<string, { name: string; descriptions: string[]; count: number }>();

    const normalize = (n: string) => n.trim().toLowerCase().replace(/^(the|a|an)\s+/i, '').replace(/[\(\)\[\]]/g, '').trim();

    const addProp = (name: string, desc?: string) => {
        if (!name || typeof name !== 'string') return;
        const cleanName = name.replace(/[\[\]]/g, '').trim();
        const norm = normalize(cleanName);
        if (norm.length < 3) return;
        // Ignore single-word adjectives that are fragments
        if (/^(small|trusty|large|soft|wooden|magic|magical|golden|blue|red|old|new|tiny)$/i.test(norm)) return;

        // Check if there is an existing key that is closely matching (e.g. "brass lantern" vs "the brass lantern")
        let targetKey = norm;
        for (const existingKey of propMap.keys()) {
            if (existingKey === norm || (existingKey.length > 5 && norm.includes(existingKey)) || (norm.length > 5 && existingKey.includes(norm))) {
                targetKey = existingKey.length <= norm.length && existingKey.includes('lantern') ? existingKey : (existingKey.length < norm.length ? norm : existingKey);
                if (targetKey !== existingKey && propMap.has(existingKey)) {
                    const oldVal = propMap.get(existingKey)!;
                    propMap.delete(existingKey);
                    propMap.set(targetKey, oldVal);
                }
                break;
            }
        }

        if (!propMap.has(targetKey)) {
            propMap.set(targetKey, { name: cleanName, descriptions: [], count: 0 });
        }
        const entry = propMap.get(targetKey)!;
        entry.count += 1;
        if (desc && typeof desc === 'string' && desc.trim().length > 0) {
            entry.descriptions.push(desc.trim());
        }
    };

    // 1. Foundation primaryVisualAnchor
    if (blueprint?.foundation?.primaryVisualAnchor) {
        addProp(blueprint.foundation.primaryVisualAnchor, blueprint.foundation.primaryVisualAnchor);
    }

    // 2. Visual Anchors in Plan
    if ((plan as any)?.visualAnchors) {
        const va = (plan as any).visualAnchors;
        if (typeof va.persistentprops === 'string' && va.persistentprops.length > 0) {
            // Split by semicolon or newline first; if only commas, check for balanced phrases
            const parts = va.persistentprops.includes(';') 
                ? va.persistentprops.split(';') 
                : va.persistentprops.split(/,\s*(?=[A-Z\u0600-\u06FF])/);
            parts.forEach((p: string) => addProp(p, p));
        }
        if (typeof va.signatureItems === 'string' && va.signatureItems.length > 0) {
            const parts = va.signatureItems.includes(';')
                ? va.signatureItems.split(';')
                : va.signatureItems.split(/,\s*(?=[A-Z\u0600-\u06FF])/);
            parts.forEach((p: string) => addProp(p, p));
        }
    }

    // 3. Spreads scene_props
    if (plan?.spreads && Array.isArray(plan.spreads)) {
        plan.spreads.forEach((spread: any) => {
            const sceneProps = spread.scene_props || spread.props || [];
            if (Array.isArray(sceneProps)) {
                sceneProps.forEach((p: any) => {
                    const name = typeof p === 'string' ? p : p.name;
                    const desc = typeof p === 'object' ? p.physical_description || p.description : undefined;
                    addProp(name, desc);
                });
            }
        });
    }

    const globalLocks: { name: string; canonicalDescription: string }[] = [];

    propMap.forEach((entry, norm) => {
        // Exclude generic environmental non-props
        if (/^(shadows|soft shadows|dimly lit room|bedroom elements|room|darkness|light|background|bedroom elements \(normal\)|bedroom elements \(obscured\))$/i.test(norm)) return;

        if (entry.count >= 2 || entry.descriptions.length >= 2 || (blueprint?.foundation?.primaryVisualAnchor && normalize(blueprint.foundation.primaryVisualAnchor).includes(norm))) {
            const sortedDescs = entry.descriptions.sort((a, b) => b.length - a.length);
            let canonical = sortedDescs[0] || `${entry.name} design matching the established story anchor.`;
            canonical = sanitizeText(canonical);
            globalLocks.push({
                name: entry.name,
                canonicalDescription: canonical
            });
        }
    });

    return globalLocks;
}

// ---------------------------------------------------------------------------
// SECTION A — HERO REFERENCE (DNA-ONLY)
// ---------------------------------------------------------------------------
function buildHeroReferenceParagraph(heroes: HeroProfile[]): string {
    if (heroes.length === 0) return '';

    const blocks: string[] = [];

    // Image count header — tells Gemini upfront how many character images are attached
    const imageCount = heroes.filter(h => (h as any).stylized_dna_image_index > 0).length;
    if (imageCount > 0) {
        blocks.push(
            `This prompt is accompanied by ${imageCount} character reference image${imageCount > 1 ? 's' : ''}. ` +
            `Each image shows the approved stylized character that must appear in this scene.`
        );
    }

    heroes.forEach((h, idx) => {
        const token = h.token || `[[HERO_${idx + 1}]]`;
        const dnaIdx = (h as any).stylized_dna_image_index;

        if (dnaIdx > 0) {
            blocks.push(
                `Image ${dnaIdx} defines the character for ${token}. ` +
                `Use it as the sole authoritative source for ${token}'s face, hairstyle, skin tone, ` +
                `body proportions, gender, age, outfit, and overall character design. ` +
                `Render ${token} as the exact character shown in Image ${dnaIdx} — ` +
                `same face, same hair, same outfit, same body type. ` +
                `Only change pose, expression, and action to fit this scene. ` +
                `Do not redesign, age up, age down, or change the gender of ${token}.`
            );
        }
    });

    // Distinctness block — scales with hero count
    if (heroes.length === 2) {
        const [a, b] = heroes.map(h => h.token || '[[HERO_?]]');
        blocks.push(
            `${a} and ${b} are two different people. ` +
            `Do not swap, blend, or share any facial features, hairstyles, ` +
            `outfits, skin tones, or body types between them.`
        );
    } else if (heroes.length >= 3) {
        const tokenList = heroes.map(h => h.token || '[[HERO_?]]').join(', ');
        blocks.push(
            `${tokenList} are three distinct people — each with their own unique face, ` +
            `hairstyle, outfit, skin tone, and body type as shown in their respective reference images. ` +
            `Do not blend, swap, or share any visual traits between any of them.`
        );
    }

    return blocks.join('\n\n');
}

// ---------------------------------------------------------------------------
// SECTION B — STYLE INSTRUCTION (fully dynamic from StyleProfile)
// ---------------------------------------------------------------------------
function buildStyleInstruction(style: StyleProfile): string {
    const parts: string[] = [];

    // Core style directive
    if (style.positive_style_lock) {
        parts.push(
            `Create a wide 16:9 illustration in this exact visual style: ${sanitizeText(style.positive_style_lock)} ` +
            `Keep the entire image — characters, environment, lighting, and all props — in this same unified stylized world.`
        );
    }

    // Character rendering
    if (style.character_rendering_rules) {
        parts.push(`Character rendering: ${sanitizeText(style.character_rendering_rules)}`);
    }

    // Environment rendering
    if (style.environment_rendering_rules) {
        parts.push(`Environment rendering: ${sanitizeText(style.environment_rendering_rules)}`);
    }

    // Lighting
    if ((style as any).lighting_rules) {
        parts.push(`Lighting: ${sanitizeText((style as any).lighting_rules)}`);
    }

    // Color
    if ((style as any).color_rules) {
        parts.push(`Color: ${sanitizeText((style as any).color_rules)}`);
    }

    // Texture
    if ((style as any).texture_rules) {
        parts.push(`Texture: ${sanitizeText((style as any).texture_rules)}`);
    }

    // Line treatment (2D styles)
    if ((style as any).line_treatment) {
        parts.push(`Lines: ${sanitizeText((style as any).line_treatment)}`);
    }

    // Shading treatment (2D styles)
    if ((style as any).shading_treatment) {
        parts.push(`Shading: ${sanitizeText((style as any).shading_treatment)}`);
    }

    // Background treatment (2D styles)
    if ((style as any).background_treatment) {
        parts.push(`Background treatment: ${sanitizeText((style as any).background_treatment)}`);
    }

    // Hard forbidden styles
    if (style.forbidden_styles?.length) {
        parts.push(`Do NOT render in any of these styles: ${style.forbidden_styles.join(', ')}.`);
    }

    return parts.filter(s => s.trim().length > 0).join(' ');
}

// ---------------------------------------------------------------------------
// SECTION C — SCENE INSTRUCTION
// ---------------------------------------------------------------------------
function buildSceneInstruction(spread: any): string {
    const s = spread.setting;
    if (typeof s === 'string') {
        let sentence = `Scene setting: ${s}.`;
        const env = spread.environmentType || spread.environment_type;
        const time = spread.timeOfDay || spread.time_of_day;
        const mood = spread.mood;
        const lighting = spread.lighting;
        const palette = spread.colorPalette || spread.color_palette;

        const extra: string[] = [];
        if (env) extra.push(`Environment: ${env}`);
        if (time) extra.push(`Time: ${time}`);
        if (mood) extra.push(`Mood: ${mood}`);
        if (extra.length > 0) sentence += ` (${extra.join(', ')}).`;
        if (lighting) sentence += ` Lighting: ${lighting}.`;
        if (palette) sentence += ` Color palette: ${palette}.`;
        return sentence;
    }

    const parts: string[] = [];
    if (s?.specific_location) parts.push(`The scene takes place in ${s.specific_location}`);
    if (s?.environment_type) parts.push(`(${s.environment_type})`);
    if (s?.time_of_day) parts.push(`during the ${s.time_of_day}`);
    if (s?.mood) parts.push(`with a ${s.mood} mood`);

    let sentence = parts.join(' ') + '.';
    if (s?.lighting) sentence += ` Lighting: ${s.lighting}.`;
    if (s?.color_palette) sentence += ` Color palette: ${s.color_palette}.`;

    return sentence.replace(/\.\./g, '.');
}

// ---------------------------------------------------------------------------
// SECTION D — ACTION INSTRUCTION
// ---------------------------------------------------------------------------
function buildActionInstruction(spread: any, heroes: HeroProfile[]): string {
    const comp = spread.composition || {};
    const actionSide = (comp.action_zone_side || spread.mainContentSide || 'right').toLowerCase();

    if (typeof spread.keyActions === 'string') {
        let actionStr = spread.keyActions;
        heroes.forEach((h, idx) => {
            const regex = new RegExp(`\\[Hero\\s*${idx + 1}\\]`, 'gi');
            actionStr = actionStr.replace(regex, h.token);
        });
        const containmentGuard =
            `All characters and actions must remain contained on the ${actionSide} side. ` +
            `Do not let any action or limb cross into the opposite side.`;
        return actionStr + '\n' + containmentGuard;
    }

    const actions = spread.hero_actions;
    if (!actions || actions.length === 0) return '';

    const heroTokens = heroes.map(h => h.token || '[[HERO_?]]');
    const normalizeTokenCase = (text: string): string =>
        text.replace(/\[\[hero_(\d+)\]\]/gi, (_, n) => `[[HERO_${n}]]`);

    const lines = actions.map((a: any) => {
        const cleanAction = sanitizeUnnamedCharacters(normalizeTokenCase(sanitizeText(a.action)), heroTokens);
        const token = normalizeTokenCase(a.token);

        const expression = a.expression
            ? normalizeTokenCase(a.expression).replace(/\.$/, '').trim()
            : null;
        const eyeLine = a.eye_line
            ? normalizeTokenCase(a.eye_line).replace(/\.$/, '').trim()
            : null;

        let line = `Show ${token} ${cleanAction}`;
        if (expression) line += `, with a ${expression} expression`;
        if (eyeLine) line += `, ${eyeLine}`;

        return line.trim().replace(/\.+$/, '') + '.';
    });

    const containmentGuard =
        `All characters and actions must remain contained on the ${actionSide} side. ` +
        `Do not let any action or limb cross into the opposite side.`;

    return lines.join('\n') + '\n' + containmentGuard;
}

// ---------------------------------------------------------------------------
// SECTION E — PROPS INSTRUCTION
// ---------------------------------------------------------------------------
function buildPropsInstruction(props: SceneProp[]): string {
    if (!props || props.length === 0) return '';

    const propLines = props.map(p => {
        // Sanitize prop descriptions to strip forbidden words before they reach the validator
        let desc = `${p.name}: ${sanitizeText(p.physical_description)}`;
        if (p.text_safe_rendering && p.text_safe_rendering.trim().length > 0) {
            desc += ` Important: ${p.text_safe_rendering}`;
        } else if (p.text_risk && p.text_risk !== 'none') {
            desc += ` No readable text, letters, or numbers on this prop.`;
        }
        return desc;
    });

    return `Key props: ${propLines.join(' | ')}.`;
}

// ---------------------------------------------------------------------------
// SECTION F — COMPOSITION INSTRUCTION
// ---------------------------------------------------------------------------
function buildCompositionInstruction(spread: any): string {
    const comp = spread.composition || {};
    const actionSide = (comp.action_zone_side || spread.mainContentSide || 'right').toLowerCase();
    
    let textSide = (comp.text_zone_side || spread.textSide || '').toLowerCase();
    if (textSide !== 'left' && textSide !== 'right') {
        textSide = actionSide === 'left' ? 'right' : 'left';
    }

    const pct = Number(comp.text_zone_percentage || spread.text_zone_percentage) || 40;
    const pctMax = pct + 5;

    return (
        `Place all characters, actions, and key props on the ${actionSide} side of the frame only. ` +
        `Keep the ${textSide} ${pct}-${pctMax}% of the frame as calm negative space ` +
        `with only simple background environment — no characters, no limbs, no faces, ` +
        `no props, and no busy elements. ` +
        `Do not let any part of the action spill into the negative-space side.`
    );
}

// ---------------------------------------------------------------------------
// SECTION G — BACKGROUND INSTRUCTION
// ---------------------------------------------------------------------------
function buildBackgroundInstruction(spread: SpreadPlan): string {
    const required = spread.background_details?.required_elements || [];
    const forbidden = spread.background_details?.forbidden_elements || [];
    const parts: string[] = [];
    if (required.length > 0) parts.push(`Background elements to include: ${required.join(', ')}.`);
    if (forbidden.length > 0) parts.push(`Do not include in the background: ${forbidden.join(', ')}.`);
    return parts.join(' ');
}

// ---------------------------------------------------------------------------
// SECTION H — PRESERVATION INSTRUCTION
// ---------------------------------------------------------------------------
function buildPreservationInstruction(heroes: HeroProfile[]): string {
    if (heroes.length === 0) return '';

    const tokenList = heroes.map(h => h.token || '[[HERO_?]]').join(' and ');
    const faceWord = heroes.length === 1 ? 'the face' : 'all faces';
    const plural = heroes.length > 1;

    return (
        `Keep ${tokenList} clearly recognizable as the exact character${plural ? 's' : ''} ` +
        `shown in their reference image${plural ? 's' : ''}. ` +
        `Keep ${faceWord} clearly visible and unobstructed — ` +
        `no hands, props, hair, or shadows covering the face. ` +
        `No extra characters beyond the ${heroes.length} specified hero${plural ? 'es' : ''}. ` +
        `No parents, adults, siblings, or unnamed people in the scene.`
    );
}

// ---------------------------------------------------------------------------
// SECTION I — HARD CONSTRAINTS
// ---------------------------------------------------------------------------
function buildConstraints(heroes: HeroProfile[]): string {
    const lines = [
        'No text, letters, numbers, logos, signs, watermarks, or typography anywhere in the image.',
        'No square crop, no portrait crop, no 4:3 crop. Must be a wide 16:9 horizontal illustration.',
        'Do not copy the background, pose, or framing from any of the reference images.',
    ];

    if (heroes.length === 2) {
        lines.push('Do not blend or swap the two heroes — they must remain visually distinct individuals throughout.');
    } else if (heroes.length >= 3) {
        lines.push(`Do not blend or swap any of the ${heroes.length} heroes — each must remain a distinct, recognizable individual throughout.`);
    }

    return lines.join(' ');
}

// ---------------------------------------------------------------------------
// MAIN ASSEMBLER
// ---------------------------------------------------------------------------
function assembleEnglishPrompt(
    spread: any,
    styleProfile: StyleProfile,
    heroes: HeroProfile[],
    isCover: boolean = false
): { prompt: string; validation: PromptValidationResult } {

    const schemaStamp = `[v7-dna-first]`;

    // 1. Build Legend mapping reference images to Hero tokens
    const legendParts = [`CHARACTER REFERENCES:`];
    heroes.forEach((h, idx) => {
        const dnaIdx = (h as any).stylized_dna_image_index;
        if (dnaIdx > 0) {
            legendParts.push(`- Image ${dnaIdx} is the approved character reference for [[HERO_${idx + 1}]]. Replicate their face shape, facial features, hairstyle, and clothing directly from Image ${dnaIdx}.`);
        }
    });
    const legend = legendParts.length > 1 ? legendParts.join('\n') : '';

    // 2. Scene setup and environment
    const s = spread.setting;
    let settingText = '';
    if (typeof s === 'string') {
        const env = spread.environmentType || spread.environment_type;
        const time = spread.timeOfDay || spread.time_of_day;
        const mood = spread.mood;
        const lighting = spread.lighting;
        
        const details = [];
        if (env) details.push(`Environment: ${env}`);
        if (time) details.push(`Time of Day: ${time}`);
        if (mood) details.push(`Mood: ${mood}`);
        if (lighting) details.push(`Lighting: ${lighting}`);
        
        settingText = `Scene: Set in ${s}${details.length > 0 ? ` (${details.join(', ')})` : ''}.`;
    } else if (s && typeof s === 'object') {
        const details = [];
        if (s.specific_location) details.push(`Location: ${s.specific_location}`);
        if (s.environment_type) details.push(`Environment: ${s.environment_type}`);
        if (s.time_of_day) details.push(`Time of Day: ${s.time_of_day}`);
        if (s.mood) details.push(`Mood: ${s.mood}`);
        if (s.lighting) details.push(`Lighting: ${s.lighting}`);
        
        settingText = details.length > 0 
            ? `Scene: ${details.join(', ')}.`
            : `Scene: A wide 16:9 children's book illustration scene.`;
    } else {
        settingText = `Scene: A wide 16:9 children's book illustration scene.`;
    }

    // 3. Actions & Expressions
    let actionsText = '';
    if (typeof spread.keyActions === 'string') {
        let actionStr = spread.keyActions;
        heroes.forEach((h, idx) => {
            const regex = new RegExp(`\\[Hero\\s*${idx + 1}\\]`, 'gi');
            actionStr = actionStr.replace(regex, h.token);
        });
        actionsText = `Action: ${actionStr}`;
    } else {
        const actionLines = (spread.hero_actions || [])
            .filter((a: any) => a.presence !== 'absent' && a.action)
            .map((a: any) => {
                const token = a.token.replace(/\[\[hero_(\d+)\]\]/gi, (_: string, n: string) => `[[HERO_${n}]]`);
            let actionStr = `Show ${token} ${sanitizeText(a.action)}`;
            if (a.expression) actionStr += `, with a ${sanitizeText(a.expression)} expression`;
            if (a.eye_line) actionStr += `, ${sanitizeText(a.eye_line)}`;
            return actionStr.trim().replace(/\.+$/, '') + '.';
        });
        actionsText = actionLines.length > 0 
            ? `Action: ${actionLines.join(' ')}` 
            : '';
    }

    // 4. Style Lock (Simply inherit from references - NO complex rules)
    const styleText = `Art Style: Inherit the visual style, coloring, and rendering technique directly from the character reference images. Ensure a consistent, high-quality, professional illustrated storybook look.`;

    // 5. Props (Simplified - v7 list names only, no descriptions)
    const propsText = spread.scene_props && spread.scene_props.length > 0 
        ? `Props to include: ${spread.scene_props.map((p: any) => p.name).join(', ')}.`
        : '';

    // 6. Composition & Text zones
    const comp = spread.composition || {};
    const actionSide = (comp.action_zone_side || spread.mainContentSide || 'right').toLowerCase();
    let textSide = (comp.text_zone_side || spread.textSide || '').toLowerCase();
    if (textSide !== 'left' && textSide !== 'right') {
        textSide = actionSide === 'left' ? 'right' : 'left';
    }
    const view = comp.composition_view || spread.compositionView || '';
    const viewText = view ? ` Framing: Use a ${view} composition.` : '';
    let compositionText = `Composition: Place all characters, actions, and key props on the ${actionSide} side of the frame. Keep the opposite ${textSide} side as clean, open negative space with soft, unobtrusive background elements.${viewText}`;

    if (isCover) {
        compositionText = `Composition: Low camera framing with wide headroom. Place all characters strictly in the lower 60% of the frame. Keep the upper 40% of the frame as clean, open negative space consisting purely of sky or calm background atmosphere. Characters' heads and faces must not enter the upper 20% area.`;
    }

    // 7. Hard Constraints (No text/letters, horizontal 16:9)
    const constraintsText = `Constraints: Strictly no text, letters, numbers, signs, logos, or watermarks. Must be a wide 16:9 horizontal image. Do not copy the pose or background from the reference images.`;

    const sections = [
        schemaStamp,
        legend,
        settingText,
        actionsText,
        styleText,
        propsText,
        compositionText,
        constraintsText
    ].filter(s => s && s.trim().length > 0);

    const prompt = sections.join('\n\n');
    const validation = validateAssembledPrompt(prompt);

    return { prompt, validation };
}

// ---------------------------------------------------------------------------
// SECTION I.1 — CLEAN PROMPT ASSEMBLER (v7.1)
// ---------------------------------------------------------------------------
function assembleEnglishPromptV7_1(
    spread: any,
    styleProfile: StyleProfile,
    heroes: HeroProfile[],
    isCover: boolean = false
): { prompt: string; validation: PromptValidationResult } {

    const schemaStamp = `[v7.1-dna-clean]`;

    // 1. Build Legend mapping reference images to Hero tokens (Clean, non-redundant)
    const legendParts = [`CHARACTER REFERENCES:`];
    heroes.forEach((h, idx) => {
        const dnaIdx = (h as any).stylized_dna_image_index;
        if (dnaIdx > 0) {
            legendParts.push(`- Image ${dnaIdx}: Reference for [[HERO_${idx + 1}]]`);
        }
    });
    const legend = legendParts.length > 1 ? legendParts.join('\n') : '';

    // 2. Scene setup and environment
    const s = spread.setting;
    let settingText = '';
    if (typeof s === 'string') {
        const env = spread.environmentType || spread.environment_type;
        const time = spread.timeOfDay || spread.time_of_day;
        const mood = spread.mood;
        const lighting = spread.lighting;
        
        const details = [];
        if (env) details.push(`Environment: ${env}`);
        if (time) details.push(`Time of Day: ${time}`);
        if (mood) details.push(`Mood: ${mood}`);
        if (lighting) details.push(`Lighting: ${lighting}`);
        
        settingText = `Scene: Set in ${s}${details.length > 0 ? ` (${details.join(', ')})` : ''}.`;
    } else if (s && typeof s === 'object') {
        const details = [];
        if (s.specific_location) details.push(`Location: ${s.specific_location}`);
        if (s.environment_type) details.push(`Environment: ${s.environment_type}`);
        if (s.time_of_day) details.push(`Time of Day: ${s.time_of_day}`);
        if (s.mood) details.push(`Mood: ${s.mood}`);
        if (s.lighting) details.push(`Lighting: ${s.lighting}`);
        
        settingText = details.length > 0 
            ? `Scene: ${details.join(', ')}.`
            : `Scene: A wide 16:9 children's book illustration scene.`;
    } else {
        settingText = `Scene: A wide 16:9 children's book illustration scene.`;
    }

    // 3. Actions & Expressions (Sanitized syntax to avoid clunky grammar/duplicate articles)
    let actionsText = '';
    if (typeof spread.keyActions === 'string') {
        let actionStr = spread.keyActions;
        heroes.forEach((h, idx) => {
            const regex = new RegExp(`\\[Hero\\s*${idx + 1}\\]`, 'gi');
            actionStr = actionStr.replace(regex, h.token);
        });
        actionsText = `Action: ${actionStr}`;
    } else {
        const actionLines = (spread.hero_actions || [])
            .filter((a: any) => a.presence !== 'absent' && a.action)
            .map((a: any) => {
                const token = a.token.replace(/\[\[hero_(\d+)\]\]/gi, (_: string, n: string) => `[[HERO_${n}]]`);
                let actionStr = `Show ${token} ${sanitizeText(a.action)}`;
                if (a.expression) {
                    let expr = sanitizeText(a.expression).trim();
                    expr = expr.replace(/^(a|an|the)\s+/i, ''); // Strip leading articles to prevent grammatical clashes
                    actionStr += `, with a ${expr} expression`;
                }
                if (a.eye_line) actionStr += `, ${sanitizeText(a.eye_line)}`;
                return actionStr.trim().replace(/\.+$/, '') + '.';
            });
        actionsText = actionLines.length > 0 
            ? `Action: ${actionLines.join(' ')}` 
            : '';
    }

    // 4. Style Lock (Omitted in v7.1 prompts since it's already globally appended by the generator)
    const styleText = '';

    // 5. Props (Simplified list names)
    const propsText = spread.scene_props && spread.scene_props.length > 0 
        ? `Props to include: ${spread.scene_props.map((p: any) => p.name).join(', ')}.`
        : '';

    // 6. Composition & Text zones
    const comp = spread.composition || {};
    const actionSide = (comp.action_zone_side || spread.mainContentSide || 'right').toLowerCase();
    let textSide = (comp.text_zone_side || spread.textSide || '').toLowerCase();
    if (textSide !== 'left' && textSide !== 'right') {
        textSide = actionSide === 'left' ? 'right' : 'left';
    }
    const view = comp.composition_view || spread.compositionView || '';
    const viewText = view ? ` Framing: Use a ${view} composition.` : '';
    let compositionText = `Composition: Place all characters, actions, and key props on the ${actionSide} side of the frame. Keep the opposite ${textSide} side as clean, open negative space with soft, uncluttered background scenery.${viewText}`;

    if (isCover) {
        compositionText = `Composition: Low camera framing with wide headroom. Place all characters strictly in the lower 60% of the frame. Keep the upper 40% of the frame as clean, open negative space consisting purely of sky or calm background atmosphere. Characters' heads and faces must not enter the upper 20% area.`;
    }

    // 7. Hard Constraints (No text/letters, horizontal 16:9)
    const constraintsText = `Constraints: Strictly no text, letters, numbers, signs, logos, or watermarks. Must be a wide 16:9 horizontal image. Do not copy the pose or background from the reference images.`;

    const sections = [
        schemaStamp,
        legend,
        settingText,
        actionsText,
        styleText,
        propsText,
        compositionText,
        constraintsText
    ].filter(s => s && s.trim().length > 0);

    const prompt = sections.join('\n\n');
    const validation = validateAssembledPrompt(prompt);

    return { prompt, validation };
}

// ---------------------------------------------------------------------------
// SECTION I.2 — BALANCED PROMPT ASSEMBLER (v7.2)
// ---------------------------------------------------------------------------
function assembleEnglishPromptV7_2(
    spread: any,
    styleProfile: StyleProfile,
    heroes: HeroProfile[],
    isCover: boolean = false
): { prompt: string; validation: PromptValidationResult } {

    const schemaStamp = `[v7.2-dna-balanced]`;

    // 1. Clean Reference Mapping
    const legendParts = [`CHARACTER REFERENCES:`];
    heroes.forEach((h, idx) => {
        const dnaIdx = (h as any).stylized_dna_image_index;
        if (dnaIdx > 0) {
            legendParts.push(`- Image ${dnaIdx}: Approved character reference for [[HERO_${idx + 1}]].`);
        }
    });
    const legend = legendParts.length > 1 ? legendParts.join('\n') : '';

    // 2. Setting & Environment (Sanitizing conflicting medium terms)
    const s = spread.setting;
    let settingText = '';
    const cleanSetting = (val: string) => (val || '').replace(/\b(watercolor|watercolour|gouache|oil\s*painting|acrylic|pencil\s*sketch)\s*(lighting|texture|style|feel)?\b/gi, '').replace(/\s{2,}/g, ' ').trim();

    if (typeof s === 'string') {
        const env = spread.environmentType || spread.environment_type;
        const time = spread.timeOfDay || spread.time_of_day;
        const mood = spread.mood;
        const lighting = cleanSetting(spread.lighting);
        
        const details = [];
        if (env) details.push(`Environment: ${env}`);
        if (time) details.push(`Time of Day: ${time}`);
        if (mood) details.push(`Mood: ${mood}`);
        if (lighting) details.push(`Lighting: ${lighting}`);
        
        settingText = `Scene: Set in ${cleanSetting(s)}${details.length > 0 ? ` (${details.join(', ')})` : ''}.`;
    } else if (s && typeof s === 'object') {
        const details = [];
        if (s.specific_location) details.push(`Location: ${cleanSetting(s.specific_location)}`);
        if (s.environment_type) details.push(`Environment: ${s.environment_type}`);
        if (s.time_of_day) details.push(`Time of Day: ${s.time_of_day}`);
        if (s.mood) details.push(`Mood: ${s.mood}`);
        if (s.lighting) details.push(`Lighting: ${cleanSetting(s.lighting)}`);
        
        settingText = details.length > 0 
            ? `Scene: ${details.join(', ')}.`
            : `Scene: A wide 16:9 children's book illustration scene.`;
    } else {
        settingText = `Scene: A wide 16:9 children's book illustration scene.`;
    }

    // 3. Actions & Expressions (Clean grammar flow)
    let actionsText = '';
    if (typeof spread.keyActions === 'string') {
        let actionStr = spread.keyActions;
        heroes.forEach((h, idx) => {
            const regex = new RegExp(`\\[Hero\\s*${idx + 1}\\]`, 'gi');
            actionStr = actionStr.replace(regex, h.token);
        });
        actionsText = `Action: ${actionStr}`;
    } else {
        const actionLines = (spread.hero_actions || [])
            .filter((a: any) => a.presence !== 'absent' && a.action)
            .map((a: any) => {
                const token = a.token.replace(/\[\[hero_(\d+)\]\]/gi, (_: string, n: string) => `[[HERO_${n}]]`);
                let actionStr = `Show ${token} ${sanitizeText(a.action)}`;
                if (a.expression) {
                    let expr = sanitizeText(a.expression).trim();
                    expr = expr.replace(/^(a|an|the)\s+/i, '');
                    actionStr += `, with a ${expr} expression`;
                }
                if (a.eye_line) actionStr += `, ${sanitizeText(a.eye_line)}`;
                return actionStr.trim().replace(/\.+$/, '') + '.';
            });
        actionsText = actionLines.length > 0 
            ? `Action: ${actionLines.join(' ')}` 
            : '';
    }

    // 4. Props
    const propsText = spread.scene_props && spread.scene_props.length > 0 
        ? `Props to include: ${spread.scene_props.map((p: any) => p.name).join(', ')}.`
        : '';

    // 5. Composition (Purely visual negative space — zero mentions of the word 'text')
    const comp = spread.composition || {};
    const actionSide = (comp.action_zone_side || spread.mainContentSide || 'right').toLowerCase();
    let quietSide = (comp.text_zone_side || spread.textSide || '').toLowerCase();
    if (quietSide !== 'left' && quietSide !== 'right') {
        quietSide = actionSide === 'left' ? 'right' : 'left';
    }
    const view = comp.composition_view || spread.compositionView || '';
    const viewText = view ? ` Framing: Use a ${view} composition.` : '';
    let compositionText = `Composition: Place all characters, actions, and key props on the ${actionSide} side of the frame. The opposite ${quietSide} side must remain open, uncluttered negative space with simple, soft background scenery.${viewText}`;

    if (isCover) {
        compositionText = `Composition: Use a wide-angle shot, placing the characters low in the frame (strictly within the lower 60% of the image). The upper 40% of the frame must be clean, open negative space with empty sky or minimal background scenery. Characters' heads and faces must not enter the upper 20% area.`;
    }

    // 6. Hard Constraints (Disentangling action/pose from facial & outfit consistency)
    const constraintsText = `Constraints: Strictly no letters, numbers, signs, logos, or watermarks. Must be a wide 16:9 horizontal image. Illustrate the new pose and action described above, while keeping the character's exact face, hairstyle, and outfit from the reference image.`;

    const sections = [
        schemaStamp,
        legend,
        settingText,
        actionsText,
        propsText,
        compositionText,
        constraintsText
    ].filter(s => s && s.trim().length > 0);

    const prompt = sections.join('\n\n');
    const validation = validateAssembledPrompt(prompt);

    return { prompt, validation };
}

// ---------------------------------------------------------------------------
// SECTION I.3 — UNIFIED ACTOR PLACEMENT PROMPT ASSEMBLER (v7.7)
// ---------------------------------------------------------------------------
function assembleEnglishPromptV7_4(
    spread: any,
    styleProfile: StyleProfile,
    heroes: HeroProfile[],
    isCover: boolean = false,
    isRTL: boolean = false,
    globalPropLocks: { name: string; canonicalDescription: string }[] = [],
    recurringAsset?: { name: string; description: string; appearancesSpreads?: number[]; isGlobalObject?: boolean; generateAssetImage?: boolean }
): { prompt: string; validation: PromptValidationResult } {

    const schemaStamp = `[v7.8-style-dna-lock]`;

    // 1. Dynamic Actor Casting & Reference Mapping (Single & Dual Hero)
    // Filter heroes to only those who are actually present in this scene/spread
    const activeHeroes = heroes.filter((h, idx) => {
        if (isCover) return true; // Both heroes appear on the cover for dual hero books
        const heroToken = `[[HERO_${idx + 1}]]`.toLowerCase();
        if (spread.hero_actions && Array.isArray(spread.hero_actions)) {
            const action = spread.hero_actions.find((a: any) => 
                (a.token || '').toLowerCase() === heroToken || 
                (a.hero_id || '').toLowerCase() === `hero_${idx + 1}`
            );
            if (action) {
                return action.presence !== 'absent' && action.action !== 'absent' && !!action.action;
            }
        }
        if (typeof spread.keyActions === 'string') {
            return spread.keyActions.toLowerCase().includes(`hero ${idx + 1}`) || 
                   spread.keyActions.toLowerCase().includes(`hero_${idx + 1}`) ||
                   spread.keyActions.toLowerCase().includes(heroToken);
        }
        if (spread.characters_present && Array.isArray(spread.characters_present)) {
            const hName = (h.name || '').toLowerCase();
            return spread.characters_present.some((c: any) => typeof c === 'string' ? (hName && c.toLowerCase().includes(hName)) : (hName && c?.name?.toLowerCase()?.includes(hName)));
        }
        if (idx > 0 && ((spread.action_summary && spread.action_summary.toLowerCase().includes('alone')) || (spread.storyText && spread.storyText.toLowerCase().includes('alone')))) {
            return false;
        }
        return true;
    });

    const isSoloSceneInDualBook = heroes.length > 1 && activeHeroes.length === 1;

    const spreadIndex = typeof spread.spread_index === 'number' ? spread.spread_index : (typeof spread.spreadNumber === 'number' ? spread.spreadNumber : 0);
    const hasRecurringPropInSpread = !!recurringAsset && !!recurringAsset.name && (
        (recurringAsset.appearancesSpreads && Array.isArray(recurringAsset.appearancesSpreads) && recurringAsset.appearancesSpreads.includes(spreadIndex)) ||
        (isCover && (!recurringAsset.appearancesSpreads || recurringAsset.appearancesSpreads.includes(0))) ||
        (spread.scene_props && Array.isArray(spread.scene_props) && spread.scene_props.some((p: any) => (p.name || '').toLowerCase().includes(recurringAsset.name.toLowerCase())))
    );

    const legendParts = [`CHARACTER CASTING & SOURCE REFERENCES:`];
    const castingDirectives: string[] = [];
    const wardrobeDirectives: string[] = [];

    activeHeroes.forEach((h, activeIdx) => {
        const originalIdx = heroes.indexOf(h);
        const heroNum = originalIdx >= 0 ? originalIdx + 1 : activeIdx + 1;
        const dnaIdx = (h as any).stylized_dna_image_index || heroNum;
        const name = h.name || (h as any).hero_id || `Hero ${heroNum}`;
        const ageVal = (h as any).age || (h as any).childAge || '';
        const ageDesc = ageVal ? ` (a ${ageVal}-year-old child)` : '';
        const heroToken = `[[HERO_${heroNum}]]`;
        const isCoHero = activeHeroes.length > 1 && activeIdx > 0;

        legendParts.push(`- Image ${dnaIdx}: Approved character reference image for ${heroToken} (${name}${ageDesc}).`);

        const roleText = isCoHero 
            ? `The co-protagonist in this image is the EXACT child shown in Image ${dnaIdx}. Place this specific child into the same scene alongside [[HERO_1]].`
            : `The protagonist in this image is the EXACT child shown in Image ${dnaIdx}. Place this specific child into the new scene and action described below.`;

        const dualDistinction = isCoHero
            ? ` Do NOT blend, swap, or mix facial features between [[HERO_1]] and [[HERO_2]].`
            : '';

        const biometrics = extractBiometrics(h.description || (h as any).childDescription || (h as any).characterDescription || (h as any).identity);
        const bioLock = biometrics.hasExplicitLocks
            ? `
  * MANDATORY BIOMETRIC LOCKS (ZERO TOLERANCE FOR COLOR MUTATION):
    - Eye Color: ${biometrics.eyeColor}. Under NO circumstances render with different colored eyes. The eyes must remain distinctly ${biometrics.eyeColor} in all scenes and under all lighting conditions.
    - Hair Color & Style: ${biometrics.hairColor} (${biometrics.hairStyle}). Maintain the exact hair color and wave/curl pattern from Image ${dnaIdx}. Do NOT lighten, bleach, or alter haircut (no modern high-fades, tapers, or undercuts).
    - Skin Tone: ${biometrics.skinTone}. Preserve natural ethnic complexion without bleaching or unnatural lighting shifts.`
            : `
  * 1:1 BIOMETRIC FIDELITY AUTHORITY (IMAGE ${dnaIdx}):
    - Facial Likeness, Eye Color, Hair & Complexion: Image ${dnaIdx} is the sole, absolute visual authority. Preserve the exact eye color, natural hair texture/curl pattern, facial geometry, and skin complexion shown in Image ${dnaIdx}. Under NO circumstances mutate eye color or alter hairstyle.`;

        castingDirectives.push(`- ${heroToken} (${name}${ageDesc}): ${roleText}
  * DYNAMIC ISOLATION RULE: Isolate ONLY the character figure from Image ${dnaIdx}. Completely discard and ignore all background scenery, surrounding environment, animals, objects, textures, and props visible in Image ${dnaIdx}.
  * 1:1 IDENTITY & ANATOMY FIDELITY: Maintain exact 1:1 facial likeness from Image ${dnaIdx}: head and jaw shape, cheek structure, eye shape and color, eyebrow arch, nose and mouth geometry, skin tone, and exact hairstyle/hairline. Strictly preserve the established anatomical scale and facial feature proportions from Image ${dnaIdx} (including eye-to-face proportion ratio). Do NOT alter stylization depth, re-imagine, or substitute with generic caricature.${bioLock}${dualDistinction}`);

        // Resolve 3-part wardrobe (Top, Bottom, Footwear)
        let outfitStr = '';
        if (h.clothing || (h as any).clothing_lock) {
            outfitStr = h.clothing || (h as any).clothing_lock;
        } else if ((h as any).outfit) {
            const o = (h as any).outfit;
            if (typeof o === 'string') {
                outfitStr = o;
            } else if (typeof o === 'object') {
                const parts = [o.top, o.bottom || o.canonical_bottom, o.footwear || o.canonical_footwear || o.shoes].filter(Boolean);
                outfitStr = parts.join(', ');
            }
        } else if (h.description) {
            try {
                const parsed = typeof h.description === 'string' ? JSON.parse(h.description) : h.description;
                if (parsed?.identity?.clothing) {
                    const c = parsed.identity.clothing;
                    const parts = [
                        c.top || `signature top from Image ${dnaIdx}`,
                        c.canonical_bottom || c.bottom || `signature pants/bottom from Image ${dnaIdx}`,
                        c.canonical_footwear || c.footwear || c.shoes || `signature shoes from Image ${dnaIdx}`
                    ];
                    outfitStr = parts.join(', ');
                }
            } catch (e) {}
        }

        if (!outfitStr) {
            outfitStr = `signature clothing and footwear from Image ${dnaIdx}`;
        }

        wardrobeDirectives.push(`- ${heroToken} (${name}): Must strictly wear: ${outfitStr}. Maintain this exact clothing and footwear across all full-body, standing, and seated poses. Solid clean colors only; do NOT add patterns, animal prints, or changes, and do NOT render the character barefoot unless explicitly required by a specific story action.`);
    });

    if (hasRecurringPropInSpread && recurringAsset) {
        // Deterministic slot computation based on total attached hero references:
        // Single-hero book: Image 1 = Hero 1, Image 2 = Prop Asset.
        // Dual-hero book: Image 1 = Hero 1, Image 2 = Hero 2, Image 3 = Prop Asset.
        const propSlot = (heroes && heroes.length > 1 ? 2 : 1) + 1;
        legendParts.push(`- Image ${propSlot}: Approved canonical reference image for [[PROP_ASSET]] (${recurringAsset.name}).`);
    }

    const legend = legendParts.length > 1 ? legendParts.join('\n') : '';
    const likenessText = castingDirectives.length > 0
        ? `CHARACTER CASTING & SCENE PLACEMENT:\n${castingDirectives.join('\n')}`
        : '';
    const wardrobeText = wardrobeDirectives.length > 0
        ? `WARDROBE & ATTIRE LOCK:\n${wardrobeDirectives.join('\n')}`
        : '';

    // Global Prop Invariance Directive
    let persistentPropsText = '';
    const propLockLines: string[] = [];

    if (hasRecurringPropInSpread && recurringAsset) {
        const propSlot = (heroes && heroes.length > 1 ? 2 : 1) + 1;
        propLockLines.push(
            `- [[PROP_ASSET]] ("${recurringAsset.name}"): Must strictly match the exact physical form, geometry, materials, color scheme, and aesthetic details shown in Image ${propSlot} (${recurringAsset.description}). Render this exact canonical object in the scene without altering its core structure or colors.`
        );
        propLockLines.push(
            `- DISPOSABLE SUB-ITEMS MANDATE: Any secondary minor props, tools, plants, or background clutter in this scene are strictly disposable and specific ONLY to this spread. Do NOT carry them over to other scenes, and do NOT let them alter or mutate [[PROP_ASSET]].`
        );
    }

    if (globalPropLocks && globalPropLocks.length > 0) {
        globalPropLocks.forEach(p => {
            if (!recurringAsset || !p.name.toLowerCase().includes(recurringAsset.name.toLowerCase())) {
                propLockLines.push(`- "${p.name}": MUST be visually IDENTICAL across all spreads. Maintain the exact same design: ${p.canonicalDescription}. Do NOT alter the structure, frame materials, colors, or visual design between scenes.`);
            }
        });
    }

    if (propLockLines.length > 0) {
        persistentPropsText = `GLOBAL OBJECT & PERSISTENT PROP INVARIANCE LOCK:\n${propLockLines.join('\n')}`;
    }

    // Style Matching Directive (Generalized & Style-Invariant)
    const styleName = styleProfile?.style_name || (styleProfile as any)?.name || styleProfile?.prompt || 'Approved Book Style';
    const styleLock = styleProfile?.positive_style_lock ? ` ${styleProfile.positive_style_lock}` : '';
    const charRules = styleProfile?.character_rendering_rules ? ` ${styleProfile.character_rendering_rules}` : '';
    const texRules = styleProfile?.texture_rules ? ` ${styleProfile.texture_rules}` : '';
    const forbiddenDirectives = styleProfile?.forbidden_styles && Array.isArray(styleProfile.forbidden_styles) && styleProfile.forbidden_styles.length > 0
        ? ` Strictly avoid incompatible art styles, medium drift, or unapproved rendering techniques: ${styleProfile.forbidden_styles.join(', ')}.`
        : ' Do not introduce contrasting art styles, unauthorized 3D/2D medium shifts, or unstyled textures.';

    const styleText = `ART STYLE & STYLIZATION FIDELITY:
- Target Style: ${styleName}.${styleLock}${charRules}${texRules}
- Inherit the visual artistic medium, lighting quality, surface textures, and stylization depth directly from the character reference image(s). Strictly maintain the artistic medium, dimensionality, and stylization level of Image 1.${forbiddenDirectives}`;

    // 2. Setting & Environment (Sanitizing conflicting medium terms)
    const s = spread.setting;
    let settingText = '';
    const cleanSetting = (val: string) => (val || '').replace(/\b(watercolor|watercolour|gouache|oil\s*painting|acrylic|pencil\s*sketch)\s*(lighting|texture|style|feel)?\b/gi, '').replace(/\s{2,}/g, ' ').trim();

    if (typeof s === 'string') {
        const env = spread.environmentType || spread.environment_type;
        const time = spread.timeOfDay || spread.time_of_day;
        const mood = spread.mood;
        const lighting = cleanSetting(spread.lighting);
        
        const details = [];
        if (env) details.push(`Environment: ${env}`);
        if (time) details.push(`Time of Day: ${time}`);
        if (mood) details.push(`Mood: ${mood}`);
        if (lighting) details.push(`Lighting: ${lighting}`);
        
        settingText = `Scene: Set in ${cleanSetting(s)}${details.length > 0 ? ` (${details.join(', ')})` : ''}.`;
    } else if (s && typeof s === 'object') {
        const details = [];
        if (s.specific_location) details.push(`Location: ${cleanSetting(s.specific_location)}`);
        if (s.environment_type) details.push(`Environment: ${s.environment_type}`);
        if (s.time_of_day) details.push(`Time of Day: ${s.time_of_day}`);
        if (s.mood) details.push(`Mood: ${s.mood}`);
        if (s.lighting) details.push(`Lighting: ${cleanSetting(s.lighting)}`);
        
        settingText = details.length > 0 
            ? `Scene: ${details.join(', ')}.`
            : `Scene: A wide 16:9 children's book illustration scene.`;
    } else {
        settingText = `Scene: A wide 16:9 children's book illustration scene.`;
    }

    // 3. Actions & Expressions (Clean narrative flow, authentic emotional expressions)
    let actionsText = '';
    if (typeof spread.keyActions === 'string') {
        let actionStr = spread.keyActions;
        heroes.forEach((h, idx) => {
            const regex = new RegExp(`\\[Hero\\s*${idx + 1}\\]`, 'gi');
            actionStr = actionStr.replace(regex, h.token);
        });
        actionsText = `Action: ${actionStr}`;
    } else {
        const actionLines = (spread.hero_actions || [])
            .filter((a: any) => a.presence !== 'absent' && a.action)
            .map((a: any) => {
                const token = a.token.replace(/\[\[hero_(\d+)\]\]/gi, (_: string, n: string) => `[[HERO_${n}]]`);
                let actionStr = `Show ${token} ${sanitizeText(a.action)}`;
                if (a.expression) {
                    const sanitizedExpr = sanitizeHeroExpression(a.expression);
                    actionStr += `, with a ${sanitizedExpr} expression`;
                }
                if (a.eye_line) actionStr += `, ${sanitizeText(a.eye_line)}`;
                return actionStr.trim().replace(/\.+$/, '') + '.';
            });
        actionsText = actionLines.length > 0 
            ? `Action: ${actionLines.join(' ')}` 
            : '';
    }

    // 4. Props (Detailed visual descriptors with text safety)
    let propsText = '';
    if (spread.scene_props && Array.isArray(spread.scene_props) && spread.scene_props.length > 0) {
        propsText = buildPropsInstruction(spread.scene_props);
    } else if (spread.props && Array.isArray(spread.props) && spread.props.length > 0) {
        propsText = buildPropsInstruction(spread.props);
    }

    // 5. Composition (Strict spatial side sanitizer — RTL aware for cover and interior)
    const comp = spread.composition || {};
    let actionSide = (comp.action_zone_side || spread.mainContentSide || 'right').toLowerCase().trim();
    if (actionSide !== 'left' && actionSide !== 'right') {
        actionSide = 'right';
    }
    let quietSide = (comp.text_zone_side || spread.textSide || '').toLowerCase().trim();
    if (quietSide !== 'left' && quietSide !== 'right') {
        quietSide = actionSide === 'left' ? 'right' : 'left';
    }
    const view = comp.composition_view || spread.compositionView || '';
    const viewText = view ? ` Framing: Use a ${view} composition.` : '';
    let compositionText = `Composition: Wide-angle full-body environmental shot with generous vertical clearance. Ground all characters, actions, and key props strictly in the lower 45% of the frame on the ${actionSide} side, showing full figures from head to toe with feet visible on the ground. The upper 50% of the frame must remain expansive, open negative space with empty sky, high ceiling, or soft atmospheric background scenery. The top of the characters' heads must remain strictly below the 45% horizontal midline. The opposite ${quietSide} side must remain calm, open negative space with simple, soft background scenery.${viewText}`;

    if (isCover) {
        if (isRTL) {
            // Arabic / RTL: Front Cover is on the LEFT half, Back Cover is on the RIGHT half
            compositionText = `Composition: Single panoramic seamless illustration spread across the entire wide canvas. Extreme wide-angle full-body environmental shot. Place all main characters and the primary hero action strictly on the LEFT side of the frame, confined entirely within the bottom 45% height of the left half with full bodies and feet visible on the ground. The entire upper 55% of the left side must remain calm, expansive open negative space with vast empty sky or soft ambient background scenery. Characters' heads and faces must remain strictly below the 45% horizontal midline. The entire RIGHT side of the frame must contain calm, peaceful ambient background scenery without any character figures. No vertical lines, creases, splits, borders, or text.`;
        } else {
            // English / LTR: Front Cover is on the RIGHT half, Back Cover is on the LEFT half
            compositionText = `Composition: Single panoramic seamless illustration spread across the entire wide canvas. Extreme wide-angle full-body environmental shot. Place all main characters and the primary hero action strictly on the RIGHT side of the frame, confined entirely within the bottom 45% height of the right half with full bodies and feet visible on the ground. The entire upper 55% of the right side must remain calm, expansive open negative space with vast empty sky or soft ambient background scenery. Characters' heads and faces must remain strictly below the 45% horizontal midline. The entire LEFT side of the frame must contain calm, peaceful ambient background scenery without any character figures. No vertical lines, creases, splits, borders, or text.`;
        }
    }

    // 6. Hard Constraints (Disentangling action/pose from facial & outfit consistency)
    let constraintsText = `Constraints: Strictly no letters, numbers, signs, text, logos, or watermarks anywhere in the illustration. Must be a wide 16:9 horizontal image. Illustrate the new pose and action described above, while strictly maintaining each character's exact face, hairstyle, and locked wardrobe from their reference and instructions.`;

    if (isSoloSceneInDualBook) {
        const absentHeroes = heroes.filter(h => !activeHeroes.includes(h));
        const activeHeroTokens = activeHeroes.map(h => {
            const origIdx = heroes.indexOf(h);
            return origIdx >= 0 ? `[[HERO_${origIdx + 1}]]` : '[[HERO_1]]';
        }).join(', ');

        if (absentHeroes.length > 0) {
            const absentList = absentHeroes.map(h => {
                const origIdx = heroes.indexOf(h);
                const token = origIdx >= 0 ? `[[HERO_${origIdx + 1}]]` : 'the co-hero';
                const name = h.name || (h as any).hero_id || '';
                return `${token}${name ? ` (${name})` : ''}`;
            }).join(', ');
            constraintsText += ` Note: ${absentList} is ABSENT from this scene. Render ONLY the active hero ${activeHeroTokens}. Strictly do NOT draw any second child, companion, or bystander in this image.`;
        }
    }

    const sections = [
        schemaStamp,
        legend,
        likenessText,
        wardrobeText,
        persistentPropsText,
        styleText,
        settingText,
        actionsText,
        propsText,
        compositionText,
        constraintsText
    ].filter(s => s && s.trim().length > 0);

    const prompt = sections.join('\n\n');
    const validation = validateAssembledPrompt(prompt);

    return { prompt, validation };
}

// ---------------------------------------------------------------------------
// PUBLIC EXPORT
// ---------------------------------------------------------------------------
export async function generatePrompts(
    plan: SpreadDesignPlan,
    blueprint: StoryBlueprint | undefined,
    styleProfile: StyleProfile,
    heroes: HeroProfile[],
    language?: string
): Promise<{
    result: {
        spreadNumber: number;
        imagePrompt: string;
        storyText: string;
        textSide?: string;
        mainContentSide?: string;
        activeHeroTokens?: string[];
        activeHeroIds?: string[];
        includesProp?: boolean;
        locationKey?: string;
        locationName?: string;
        location?: string;
    }[],
    log: WorkflowLog
}> {

    const startTime = Date.now();
    const allValidationErrors: string[] = [];

    try {
        if (!plan || !plan.spreads || !Array.isArray(plan.spreads)) {
            throw new Error('Invalid plan structure.');
        }

        const globalPropLocks = extractGlobalPropLocks(plan, blueprint);

        const isRTL = language === 'ar' ||
            (plan as any)?.language === 'ar' ||
            (blueprint as any)?.language === 'ar' ||
            /[\u0600-\u06FF]/.test(blueprint?.foundation?.title || '') ||
            /[\u0600-\u06FF]/.test(blueprint?.foundation?.storyCore || '') ||
            /[\u0600-\u06FF]/.test((plan as any)?.title || '');

        const prompts = plan.spreads.map((spread: any) => {
            const spreadIndex = typeof spread.spread_index === 'number' ? spread.spread_index : (typeof spread.spreadNumber === 'number' ? spread.spreadNumber : 0);
            const bpSpread = blueprint?.structure?.spreads?.find(s => s.spreadNumber === spreadIndex);
            const isCover = spreadIndex === 0;

            const spreadIsRTL = isRTL || /[\u0600-\u06FF]/.test(spread?.storyText || '') || /[\u0600-\u06FF]/.test((bpSpread as any)?.storyText || '') || /[\u0600-\u06FF]/.test(bpSpread?.narrative || '');

            const recurringAsset = blueprint?.foundation?.recurringAsset;
            const { prompt, validation } = assembleEnglishPromptV7_4(spread, styleProfile, heroes, isCover, spreadIsRTL, globalPropLocks, recurringAsset);

            if (!validation.passed) {
                allValidationErrors.push(`Spread ${spreadIndex}: ${validation.errors.join('; ')}`);
            }

            const comp = spread.composition || {};
            let actionSide = comp.action_zone_side || spread.mainContentSide || (isCover ? (spreadIsRTL ? 'left' : 'right') : 'right');
            let txtSide = comp.text_zone_side || spread.textSide || '';

            if (isCover) {
                actionSide = spreadIsRTL ? 'left' : 'right';
                txtSide = spreadIsRTL ? 'left' : 'right';
            }

            // Determine structured active heroes
            const activeHeroTokens: string[] = ['[[HERO_1]]'];
            const activeHeroIds: string[] = ['hero_1'];
            if (heroes.length > 1 && !isCover && heroes[1]) {
                const hero2Name = heroes[1].name || '';
                const promptHasHero2 = prompt.includes('[[HERO_2]]');
                const isHero1Alone = prompt.includes('[[HERO_1]] is alone') || 
                    prompt.includes('Render ONLY the active hero [[HERO_1]]') ||
                    (spread.action_summary && spread.action_summary.toLowerCase().includes('alone')) ||
                    (bpSpread?.narrative && bpSpread.narrative.toLowerCase().includes('alone'));
                const bpHasHero2 = !!(bpSpread && (bpSpread as any).charactersPresent && Array.isArray((bpSpread as any).charactersPresent) && (bpSpread as any).charactersPresent.some((c: any) => typeof c === 'string' ? (hero2Name && c.toLowerCase().includes(hero2Name.toLowerCase())) : (hero2Name && c?.name?.toLowerCase()?.includes(hero2Name.toLowerCase()))));
                const planHasHero2 = !!(spread && spread.characters_present && Array.isArray(spread.characters_present) && spread.characters_present.some((c: any) => typeof c === 'string' ? (hero2Name && c.toLowerCase().includes(hero2Name.toLowerCase())) : (hero2Name && c?.name?.toLowerCase()?.includes(hero2Name.toLowerCase()))));
                
                if ((promptHasHero2 || bpHasHero2 || planHasHero2) && !isHero1Alone) {
                    activeHeroTokens.push('[[HERO_2]]');
                    activeHeroIds.push('hero_2');
                }
            }

            // Determine structured prop inclusion
            const includesProp = Boolean(!isCover && recurringAsset && (
                (Array.isArray(recurringAsset.appearancesSpreads) && recurringAsset.appearancesSpreads.includes(spreadIndex)) ||
                spread.includesProp === true ||
                spread.includes_prop === true ||
                prompt.includes('[[PROP_ASSET]]') ||
                (recurringAsset.name && prompt.toLowerCase().includes(recurringAsset.name.toLowerCase()))
            ));

            // Determine normalized location identity from plan or blueprint
            const locationKey = String(spread?.specific_location || spread?.specificLocation || spread?.location || spread?.setting || bpSpread?.specificLocation || (bpSpread as any)?.specific_location || (bpSpread as any)?.location || (bpSpread as any)?.setting || '');

            return {
                spreadNumber: spreadIndex,
                imagePrompt: prompt,
                storyText: isCover ? '' : (spread?.storyText || spread?.text || (bpSpread as any)?.storyText || bpSpread?.narrative || ''),
                mainContentSide: actionSide,
                textSide: txtSide,
                activeHeroTokens,
                activeHeroIds,
                includesProp,
                locationKey,
                locationName: locationKey,
                location: locationKey,
            };
        });

        return {
            result: prompts,
            log: {
                stage: 'Prompt Engineering',
                timestamp: startTime,
                inputs: { planSize: plan.spreads.length, heroCount: heroes.length },
                outputs: {
                    promptCount: prompts.length,
                    method: 'DNA Likeness, Global Prop Lock & Wardrobe Assembler v7.8-style-dna-lock',
                    validationErrors: allValidationErrors.length > 0 ? allValidationErrors : 'none',
                },
                status: allValidationErrors.length > 0 ? 'Warning' : 'Success',
                durationMs: Date.now() - startTime
            }
        };

    } catch (e: any) {
        return {
            result: [],
            log: {
                stage: 'Prompt Engineering',
                timestamp: startTime,
                inputs: { planSize: plan?.spreads?.length || 0 },
                outputs: { error: e.message },
                status: 'Failed',
                durationMs: Date.now() - startTime
            }
        };
    }
}
