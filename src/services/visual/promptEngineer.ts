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
    'crease', 'fold', 'book cover', 'story cover',
    'real photo', 'identity anchor', 'raw photo', 'photograph',
    'fuse', 'fusion',
];

const LOGO_BRANDS = ['NASA', 'Nike', 'Adidas', 'Apple', 'Disney'];

export interface PromptValidationResult {
    passed: boolean;
    errors: string[];
    warnings: string[];
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
        'crease', 'fold', 'book cover', 'story cover',
        'real photo', 'identity anchor', 'raw photo', 'photograph',
        'fuse', 'fusion',
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
    let compositionText = `Composition: Place all characters, actions, and key props on the ${actionSide} side of the frame. Keep the opposite ${textSide} side as clean, empty background space (negative space) for text placement.${viewText}`;

    if (isCover) {
        compositionText = `Composition: Use a wide-angle shot, showing the character zoomed out to leave space at the top. Place the character low in the frame (strictly in the lower 60% of the image), keeping the top 40% of the frame as clean background space (negative space) for the book title. The character's face, head, or hair must not come near the top 20% of the image.`;
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
// PUBLIC EXPORT
// ---------------------------------------------------------------------------
export async function generatePrompts(
    plan: SpreadDesignPlan,
    blueprint: StoryBlueprint | undefined,
    styleProfile: StyleProfile,
    heroes: HeroProfile[]
): Promise<{
    result: { spreadNumber: number, imagePrompt: string, storyText: string, textSide?: string, mainContentSide?: string }[],
    log: WorkflowLog
}> {

    const startTime = Date.now();
    const allValidationErrors: string[] = [];

    try {
        if (!plan || !plan.spreads || !Array.isArray(plan.spreads)) {
            throw new Error('Invalid plan structure.');
        }

        const prompts = plan.spreads.map((spread: any) => {
            const spreadIndex = typeof spread.spread_index === 'number' ? spread.spread_index : (typeof spread.spreadNumber === 'number' ? spread.spreadNumber : 0);
            const bpSpread = blueprint?.structure?.spreads?.find(s => s.spreadNumber === spreadIndex);
            const isCover = spreadIndex === 0;

            const { prompt, validation } = assembleEnglishPrompt(spread, styleProfile, heroes, isCover);

            if (!validation.passed) {
                allValidationErrors.push(`Spread ${spreadIndex}: ${validation.errors.join('; ')}`);
            }

            const comp = spread.composition || {};
            const actionSide = comp.action_zone_side || spread.mainContentSide || 'right';
            let txtSide = comp.text_zone_side || spread.textSide || '';
            if (txtSide.toLowerCase() !== 'left' && txtSide.toLowerCase() !== 'right') {
                txtSide = actionSide.toLowerCase() === 'left' ? 'right' : 'left';
            }

            return {
                spreadNumber: spreadIndex,
                imagePrompt: prompt,
                storyText: isCover ? '' : (bpSpread?.narrative || ''),
                mainContentSide: actionSide,
                textSide: txtSide,
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
                    method: 'DNA-Only Assembler v7.0',
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
