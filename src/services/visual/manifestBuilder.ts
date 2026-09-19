/**
 * Manifest Builder & Generation Reference Contract Engine
 * 
 * Provides a single, authoritative, immutable generation manifest consumed across:
 * - Autonomous Illustration Worker
 * - Editor Screen (Manual "Paint Spread")
 * - Global AI Spread Regeneration
 * - Quality Agent (Vision QA)
 * - Prompt Safety & QA
 */

import { escapeRegExp } from '@/utils/regexUtils';

export interface VerifiedBiometrics {
    eyeColor?: string;
    hairColor?: string;
    hairStyle?: string;
    skinTone?: string;
    hasExplicitLocks: boolean;
}

export interface HeroReference {
    heroId: string;
    heroToken: '[[HERO_1]]' | '[[HERO_2]]';
    label: 'Hero A' | 'Hero B';
    name: string;
    gender?: 'boy' | 'girl';
    age?: string;
    stylizedDnaUrl?: string;
    stylizedDnaBase64?: string;
    rawPhotoUrl?: string;
    biometrics: VerifiedBiometrics;
    wardrobe?: {
        top?: string;
        bottom?: string;
        footwear?: string;
        fullDescription?: string;
    };
}

export interface PropReference {
    name: string;
    description: string;
    canonicalImageUrl?: string;
    canonicalImageBase64?: string;
    slotNumber: number; // 2 for single-hero, 3 for dual-hero
}

export interface LocationRecord {
    name: string;
    architecture: string;
    keyLandmarks: string[];
    materialsPalette: string;
    lightingAtmosphere: string;
}

export interface LocationBible {
    locations: Record<string, LocationRecord>;
}

export interface StyleContract {
    styleName: string;
    technicalStyleGuide: string;
    cleanPrompt: string;
    medium: string;
    dimensionality: '2D' | '3D' | 'painterly' | 'hybrid';
    lighting: string;
    palette: string;
    forbiddenMedia: string[];
    compiledStylePrompt: string;
}

export interface SpreadManifest {
    spreadNumber: number; // 0 for cover, 1..N for spreads
    isCover: boolean;
    storyText: string;
    imagePrompt: string;
    activeHeroes: HeroReference[];
    absentHeroes: HeroReference[];
    includesProp: boolean;
    location?: LocationRecord;
    cameraAngle?: string;
    vantagePoint?: string;
    subLocation?: string;
    actionSide: 'left' | 'right';
    textSide: 'left' | 'right';
    assignedSlots: {
        slotNumber: number;
        label: string;
        referenceType: 'hero_dna' | 'prop_asset';
        imageUrlOrBase64: string;
    }[];
}

export interface GenerationManifest {
    orderId: string;
    language: string;
    spreadCount: number;
    heroes: HeroReference[];
    propAsset?: PropReference;
    locationBible: LocationBible;
    styleContract: StyleContract;
    customIllustrationNotes?: string;
    storyVersionHash: string;
    spreads: SpreadManifest[];
}

export interface GenerationPayload {
    prompt: string;
    stylePrompt: string;
    referenceImages: {
        slotNumber: number;
        label: string;
        data: string; // URL or base64
    }[];
    storyText: string;
    textSide: 'Left' | 'Right';
    activeHeroTokens: string[];
    absentHeroTokens: string[];
    propAssetName?: string;
    location?: LocationRecord;
}

export class MissingDnaError extends Error {
    constructor(message: string, public readonly missingHero: 'Hero A' | 'Hero B') {
        super(message);
        this.name = 'MissingDnaError';
    }
}

/**
 * Parses and normalizes raw style inputs into an immutable StyleContract.
 */
export function buildStyleContract(storyData: any): StyleContract {
    const styleName = storyData.selectedStyleNames?.[0] || 'Painterly';
    let techGuideStr = '';
    if (storyData.technicalStyleGuide) {
        techGuideStr = typeof storyData.technicalStyleGuide === 'object'
            ? JSON.stringify(storyData.technicalStyleGuide)
            : storyData.technicalStyleGuide;
    }

    const selectedPrompt = storyData.selectedStylePrompt?.includes('**TASK:**')
        ? ''
        : (storyData.selectedStylePrompt || '');

    // Determine dimensionality without crude substring false positives (e.g. "avoid 3D")
    let dimensionality: '2D' | '3D' | 'painterly' | 'hybrid' = 'painterly';
    const lowerName = styleName.toLowerCase();
    const isExplicit3DName = lowerName.includes('pixar 3d') || lowerName.includes('3d animation') || lowerName.includes('3d render');
    
    // Check if positive 3D directives exist while avoiding negative phrasing like "no 3d", "avoid 3d", "not 3d"
    const lowerTech = techGuideStr.toLowerCase();
    const hasNegative3D = /\b(no|avoid|not|never|without)\s+3d\b/i.test(techGuideStr) || /\b(no|avoid|not|never|without)\s+cgi\b/i.test(techGuideStr);
    
    if (isExplicit3DName && !hasNegative3D) {
        dimensionality = '3D';
    } else if (lowerName.includes('watercolor') || lowerName.includes('gouache') || lowerName.includes('papercut') || lowerName.includes('2d')) {
        dimensionality = '2D';
    }

    // Build the clean, authoritative style prompt
    // Priority: technicalStyleGuide (when rich) > selectedPrompt > styleName
    const baseParts: string[] = [];
    if (techGuideStr && techGuideStr.length > 30) {
        baseParts.push(techGuideStr);
    } else if (selectedPrompt && selectedPrompt.length > 20) {
        baseParts.push(selectedPrompt);
    } else {
        baseParts.push(`Art Style: ${styleName}. High quality cohesive painterly children's book illustration.`);
    }

    if (storyData.themeVisualDNA) {
        baseParts.push(`Theme Visual DNA: ${storyData.themeVisualDNA}.`);
    }

    let compiledStylePrompt = baseParts.filter(Boolean).join(' ');

    if (dimensionality === '3D') {
        compiledStylePrompt += ' High quality 3D stylized render, octane render, soft ambient lighting, smooth sculpted surfaces, vibrant cinematic colors.';
    }

    return {
        styleName,
        technicalStyleGuide: techGuideStr,
        cleanPrompt: selectedPrompt,
        medium: dimensionality === '3D' ? '3D Digital' : 'Digital Painterly / Mixed Media',
        dimensionality,
        lighting: 'Warm, soft cinematic ambient lighting with natural fill',
        palette: 'Vibrant, rich, child-friendly palette',
        forbiddenMedia: ['hyper-realistic photo', 'creepy uncanny textures', 'distorted text', 'low-res artifacts'],
        compiledStylePrompt
    };
}

/**
 * Extracts strictly verified biometrics from a character object or parsed identity.
 * Does NOT invent default hair/eye/skin colors when fields are missing.
 */
export function extractVerifiedBiometrics(desc: any): VerifiedBiometrics {
    if (!desc) {
        return { hasExplicitLocks: false };
    }

    let parsed: any = desc;
    if (typeof desc === 'string') {
        try {
            parsed = JSON.parse(desc);
        } catch {
            parsed = desc;
        }
    }

    const biometrics: VerifiedBiometrics = { hasExplicitLocks: false };

    if (typeof parsed === 'object') {
        const identity = parsed.identity || parsed;
        if (identity.eye_color || identity.eyeColor) {
            biometrics.eyeColor = identity.eye_color || identity.eyeColor;
            biometrics.hasExplicitLocks = true;
        }
        if (identity.hair_color || identity.hairColor) {
            biometrics.hairColor = identity.hair_color || identity.hairColor;
            biometrics.hasExplicitLocks = true;
        }
        if (identity.hair_style || identity.hairStyle || identity.hairstyle) {
            biometrics.hairStyle = identity.hair_style || identity.hairStyle || identity.hairstyle;
            biometrics.hasExplicitLocks = true;
        }
        if (identity.skin_tone || identity.skinTone) {
            biometrics.skinTone = identity.skin_tone || identity.skinTone;
            biometrics.hasExplicitLocks = true;
        }
    } else if (typeof parsed === 'string') {
        const eyeMatch = parsed.match(/(?:eyes?|eye\s+color)[:\s]+([^,.\n]+)/i);
        if (eyeMatch) {
            biometrics.eyeColor = eyeMatch[1].trim();
            biometrics.hasExplicitLocks = true;
        }
        const hairMatch = parsed.match(/(?:hair|hair\s+color)[:\s]+([^,.\n]+)/i);
        if (hairMatch) {
            biometrics.hairColor = hairMatch[1].trim();
            biometrics.hasExplicitLocks = true;
        }
        const skinMatch = parsed.match(/(?:skin|skin\s+tone|complexion)[:\s]+([^,.\n]+)/i);
        if (skinMatch) {
            biometrics.skinTone = skinMatch[1].trim();
            biometrics.hasExplicitLocks = true;
        }
    }

    return biometrics;
}

/**
 * Builds the complete GenerationManifest for an order.
 * Fails closed if required stylized DNA records are missing.
 */
export function buildGenerationManifest(
    storyData: any,
    orderId: string,
    dnaRecords?: any[],
    options: { allowMissingDnaForDraft?: boolean } = {}
): GenerationManifest {
    const isDualHero = !!(storyData.useSecondCharacter && storyData.secondCharacter?.type !== 'object');
    const heroes: HeroReference[] = [];

    // 1. Resolve Hero A DNA
    let heroAStyleUrl = dnaRecords?.find((r: any) => r.hero_label === 'Hero A' && r.image_type === 'Stylized DNA')?.image_url;
    let heroAOrigUrl = dnaRecords?.find((r: any) => r.hero_label === 'Hero A' && r.image_type === 'Original Photo')?.image_url;

    if (!heroAStyleUrl) {
        heroAStyleUrl = storyData.mainCharacter?.imageDNA?.[0] ||
            storyData.styleReferenceImageUrl ||
            storyData.styleReferenceImageBase64;
    }

    if (!heroAStyleUrl && !options.allowMissingDnaForDraft) {
        throw new MissingDnaError(
            `Hero A stylized DNA is missing for order ${orderId}. Production generation requires a verified Stylized DNA record.`,
            'Hero A'
        );
    }

    const heroABio = extractVerifiedBiometrics(
        storyData.mainCharacter?.description || storyData.childDescription || storyData.mainCharacter?.identity
    );

    heroes.push({
        heroId: 'hero_1',
        heroToken: '[[HERO_1]]',
        label: 'Hero A',
        name: storyData.childName || storyData.mainCharacter?.name || 'Hero',
        gender: storyData.childGender || storyData.mainCharacter?.gender,
        age: storyData.childAge ? String(storyData.childAge) : undefined,
        stylizedDnaUrl: heroAStyleUrl,
        rawPhotoUrl: heroAOrigUrl || storyData.mainCharacter?.imageRawUrl || storyData.mainCharacter?.imageBases64?.[0],
        biometrics: heroABio,
        wardrobe: typeof storyData.mainCharacter?.clothing === 'object'
            ? storyData.mainCharacter.clothing
            : { fullDescription: typeof storyData.mainCharacter?.clothing === 'string' ? storyData.mainCharacter.clothing : undefined }
    });

    // 2. Resolve Hero B DNA (if dual-hero)
    if (isDualHero) {
        let heroBStyleUrl = dnaRecords?.find((r: any) => r.hero_label === 'Hero B' && r.image_type === 'Stylized DNA')?.image_url;
        let heroBOrigUrl = dnaRecords?.find((r: any) => r.hero_label === 'Hero B' && r.image_type === 'Original Photo')?.image_url;

        if (!heroBStyleUrl) {
            heroBStyleUrl = storyData.secondCharacter?.imageDNA?.[0] ||
                storyData.secondCharacterImageUrl ||
                storyData.secondCharacterImageBase64;
        }

        if (!heroBStyleUrl && !options.allowMissingDnaForDraft) {
            throw new MissingDnaError(
                `Hero B stylized DNA is missing for dual-hero order ${orderId}. Production generation requires a verified Stylized DNA record for Hero B.`,
                'Hero B'
            );
        }

        const heroBBio = extractVerifiedBiometrics(
            storyData.secondCharacter?.description || storyData.secondCharacter?.identity
        );

        heroes.push({
            heroId: 'hero_2',
            heroToken: '[[HERO_2]]',
            label: 'Hero B',
            name: storyData.secondCharacter?.name || 'Friend',
            gender: storyData.secondCharacter?.gender,
            age: storyData.secondCharacter?.age ? String(storyData.secondCharacter.age) : undefined,
            stylizedDnaUrl: heroBStyleUrl,
            rawPhotoUrl: heroBOrigUrl || storyData.secondCharacter?.imageRawUrl || storyData.secondCharacter?.imageBases64?.[0],
            biometrics: heroBBio,
            wardrobe: typeof storyData.secondCharacter?.clothing === 'object'
                ? storyData.secondCharacter.clothing
                : { fullDescription: typeof storyData.secondCharacter?.clothing === 'string' ? storyData.secondCharacter.clothing : undefined }
        });
    }

    // 3. Resolve Canonical Prop Asset
    let propRef: PropReference | undefined = undefined;
    const recurringAsset = storyData.blueprint?.foundation?.recurringAsset;
    let propUrl = storyData.recurringAssetImageUrl;
    if (!propUrl && dnaRecords) {
        propUrl = dnaRecords.find((r: any) => r.hero_label === 'Prop Asset' && r.image_type === 'Canonical Asset')?.image_url;
    }
    if (!propUrl && recurringAsset?.imageUrl) {
        propUrl = recurringAsset.imageUrl;
    }

    if (recurringAsset && recurringAsset.name) {
        const propSlot = heroes.length > 1 ? 3 : 2;
        propRef = {
            name: recurringAsset.name,
            description: recurringAsset.description || '',
            canonicalImageUrl: propUrl,
            canonicalImageBase64: recurringAsset.imageBase64,
            slotNumber: propSlot
        };
    }

    // 4. Resolve Location Bible
    const locationBible: LocationBible = { locations: {} };
    const visualAnchors = storyData.visualPlan?.visualAnchors || storyData.blueprint?.visualAnchors || storyData.blueprint?.foundation;
    const rawLoc = visualAnchors?.recurringLocations || storyData.blueprint?.recurringLocations || storyData.visualPlan?.recurringLocations;
    if (rawLoc && typeof rawLoc === 'object') {
        Object.entries(rawLoc).forEach(([key, val]: [string, any]) => {
            locationBible.locations[key] = {
                name: key,
                architecture: val.architecture || val.description || val.setting || String(val),
                keyLandmarks: Array.isArray(val.landmarks) ? val.landmarks : (Array.isArray(val.keyLandmarks) ? val.keyLandmarks : []),
                materialsPalette: val.materials || val.palette || val.materialsPalette || val.color_palette || '',
                lightingAtmosphere: val.lighting || val.lightingAtmosphere || val.atmosphere || val.mood || ''
            };
        });
    }

    // 5. Build Style Contract
    const styleContract = buildStyleContract(storyData);

    // 6. Build Spreads Manifest
    const prompts = storyData.prompts || [];
    const pages = storyData.pages || [];
    const spreadCount = storyData.spreadCount || (prompts.length > 0 ? (prompts[0]?.spreadNumber === 0 ? prompts.length - 1 : prompts.length) : 8);
    const spreads: SpreadManifest[] = [];

    prompts.forEach((p: any, idx: number) => {
        const spreadNum = p.spreadNumber !== undefined ? p.spreadNumber : (p.isCover ? 0 : idx + 1);
        const isCover = p.isCover === true || spreadNum === 0;
        const pageIdx = isCover ? -1 : spreadNum - 1;

        // Authoritative story text: final edited page text > prompt storyText > blueprint narrative
        const finalStoryText = isCover
            ? ''
            : (pages[pageIdx]?.text || p.storyText || storyData.blueprint?.structure?.spreads?.[pageIdx]?.narrative || '');

        // Determine active vs absent heroes (Priority: structured activeHeroTokens > structured activeHeroIds > blueprint presence)
        let activeHeroes = [...heroes];
        let absentHeroes: HeroReference[] = [];

        if (isDualHero && !isCover) {
            if (Array.isArray(p.activeHeroTokens) && p.activeHeroTokens.length > 0) {
                activeHeroes = heroes.filter(h => p.activeHeroTokens.includes(h.heroToken));
                absentHeroes = heroes.filter(h => !p.activeHeroTokens.includes(h.heroToken));
            } else if (Array.isArray(p.activeHeroIds) && p.activeHeroIds.length > 0) {
                activeHeroes = heroes.filter(h => p.activeHeroIds.includes(h.heroId));
                absentHeroes = heroes.filter(h => !p.activeHeroIds.includes(h.heroId));
            } else {
                const promptText = p.imagePrompt || '';
                const bpSpread = storyData.blueprint?.structure?.spreads?.[pageIdx];
                const isHeroBExplicitlyAbsent = (promptText.includes('[[HERO_1]]') && !promptText.includes('[[HERO_2]]')) &&
                    (bpSpread?.emotionalBeat?.includes('alone') || (bpSpread?.narrative?.includes(heroes[0].name) && !bpSpread?.narrative?.includes(heroes[1].name)));

                if (isHeroBExplicitlyAbsent) {
                    activeHeroes = [heroes[0]];
                    absentHeroes = [heroes[1]];
                }
            }
        }

        // Location Resolution from LocationBible (supports specificLocation, specific_location, locationKey, setting, etc.)
        let spreadLocation: LocationRecord | undefined = undefined;
        const bpSpread = pageIdx >= 0 ? (storyData.blueprint?.structure?.spreads?.[pageIdx] || storyData.blueprint?.structure?.spreads?.find((s: any) => s.spreadNumber === spreadNum)) : null;
        const planSpread = pageIdx >= 0 ? (storyData.visualPlan?.spreads?.[pageIdx] || storyData.visualPlan?.spreads?.find((s: any) => s.spread_index === spreadNum || s.spreadNumber === spreadNum)) : null;
        
        const locationName = p.locationKey || p.locationName || p.location || bpSpread?.specificLocation || bpSpread?.specific_location || bpSpread?.location || (typeof bpSpread?.setting === 'string' ? bpSpread.setting : bpSpread?.setting?.specific_location) || planSpread?.specific_location || planSpread?.specificLocation || (typeof planSpread?.setting === 'string' ? planSpread.setting : planSpread?.setting?.specific_location) || '';
        
        if (locationName) {
            if (locationBible.locations[locationName]) {
                spreadLocation = locationBible.locations[locationName];
            } else {
                // Find fuzzy match in locationBible
                const matchKey = Object.keys(locationBible.locations).find(k => k.toLowerCase().includes(locationName.toLowerCase()) || locationName.toLowerCase().includes(k.toLowerCase()));
                if (matchKey) {
                    spreadLocation = locationBible.locations[matchKey];
                } else if (locationName.trim().length > 0) {
                    const sObj = (typeof bpSpread?.setting === 'object' ? bpSpread.setting : null) || (typeof planSpread?.setting === 'object' ? planSpread.setting : null);
                    spreadLocation = {
                        name: locationName,
                        architecture: sObj?.architecture || sObj?.description || (typeof bpSpread?.setting === 'string' ? bpSpread.setting : locationName),
                        keyLandmarks: Array.isArray(sObj?.landmarks) ? sObj.landmarks : (Array.isArray(sObj?.keyLandmarks) ? sObj.keyLandmarks : []),
                        materialsPalette: sObj?.materials || sObj?.palette || sObj?.color_palette || '',
                        lightingAtmosphere: sObj?.lighting || sObj?.atmosphere || sObj?.mood || ''
                    };
                }
            }
        }

        // Compute Assigned Slots (Active Heroes only)
        const assignedSlots: SpreadManifest['assignedSlots'] = [];
        if (activeHeroes.some(h => h.heroToken === '[[HERO_1]]')) {
            assignedSlots.push({
                slotNumber: 1,
                label: `Image 1: Approved character reference for [[HERO_1]] (${heroes[0].name})`,
                referenceType: 'hero_dna',
                imageUrlOrBase64: heroes[0].stylizedDnaUrl || heroes[0].stylizedDnaBase64 || ''
            });
        }

        if (heroes.length > 1 && activeHeroes.some(h => h.heroToken === '[[HERO_2]]')) {
            assignedSlots.push({
                slotNumber: 2,
                label: `Image 2: Approved character reference for [[HERO_2]] (${heroes[1].name})`,
                referenceType: 'hero_dna',
                imageUrlOrBase64: heroes[1].stylizedDnaUrl || heroes[1].stylizedDnaBase64 || ''
            });
        }

        const propAppearsInSpread = !isCover && propRef && (
            p.includesProp === true ||
            (p.includesProp !== false && (
                (recurringAsset?.appearancesSpreads && recurringAsset.appearancesSpreads.includes(spreadNum)) ||
                p.imagePrompt?.includes('[[PROP_ASSET]]') ||
                (recurringAsset?.name && p.imagePrompt?.toLowerCase().includes(recurringAsset.name.toLowerCase()))
            ))
        );

        if (propRef && propAppearsInSpread && (propRef.canonicalImageUrl || propRef.canonicalImageBase64)) {
            assignedSlots.push({
                slotNumber: propRef.slotNumber,
                label: `Image ${propRef.slotNumber}: Approved canonical reference for [[PROP_ASSET]] (${propRef.name})`,
                referenceType: 'prop_asset',
                imageUrlOrBase64: propRef.canonicalImageUrl || propRef.canonicalImageBase64 || ''
            });
        }

        spreads.push({
            spreadNumber: spreadNum,
            isCover,
            storyText: finalStoryText,
            imagePrompt: p.imagePrompt || '',
            activeHeroes,
            absentHeroes,
            includesProp: !!propAppearsInSpread,
            location: spreadLocation,
            actionSide: p.mainContentSide === 'left' ? 'left' : 'right',
            textSide: p.textSide === 'left' ? 'left' : 'right',
            assignedSlots
        });
    });

    const storyVersionHash = `${orderId}-${spreads.length}-${styleContract.styleName}`;

    return {
        orderId,
        language: storyData.language || 'en',
        spreadCount,
        heroes,
        propAsset: propRef,
        locationBible,
        styleContract,
        customIllustrationNotes: storyData.customIllustrationNotes,
        storyVersionHash,
        spreads
    };
}

/**
 * Builds the exact generation payload to send to Gemini multimodal generation for a given spread.
 */
export function buildGenerationPayload(
    manifest: GenerationManifest,
    spreadNumber: number
): GenerationPayload {
    const spread = manifest.spreads.find(s => s.spreadNumber === spreadNumber) || manifest.spreads[spreadNumber];
    if (!spread) {
        throw new Error(`Spread ${spreadNumber} not found in generation manifest for order ${manifest.orderId}`);
    }

    const referenceImages: GenerationPayload['referenceImages'] = [];

    spread.assignedSlots.forEach(slot => {
        if (slot.imageUrlOrBase64) {
            referenceImages.push({
                slotNumber: slot.slotNumber,
                label: slot.label,
                data: slot.imageUrlOrBase64
            });
        }
    });

    let promptWithLocation = spread.imagePrompt;
    if (spread.location) {
        const loc = spread.location;
        promptWithLocation += `\n\n[LOCATION CONTINUITY REQUIREMENT]\nLocation: ${loc.name}. Architecture: ${loc.architecture}. Materials & Palette: ${loc.materialsPalette}. Lighting/Atmosphere: ${loc.lightingAtmosphere}. Key landmarks: ${loc.keyLandmarks.join(', ')}.`;
    }

    return {
        prompt: promptWithLocation,
        stylePrompt: manifest.styleContract.compiledStylePrompt,
        referenceImages,
        storyText: spread.storyText,
        textSide: spread.textSide === 'left' ? 'Left' : 'Right',
        activeHeroTokens: spread.activeHeroes.map(h => h.heroToken),
        absentHeroTokens: spread.absentHeroes.map(h => h.heroToken),
        propAssetName: manifest.propAsset?.name,
        location: spread.location
    };
}

/**
 * Builds the authoritative QualityCheck parameters for a generated spread image directly from the manifest.
 */
export function buildQualityCheckParams(
    manifest: GenerationManifest,
    spreadNumber: number,
    generatedImageBase64OrUrl: string,
    iterationNumber: number = 1
): any {
    const spread = manifest.spreads.find(s => s.spreadNumber === spreadNumber) || manifest.spreads[spreadNumber];
    if (!spread) {
        throw new Error(`Spread ${spreadNumber} not found in manifest for order ${manifest.orderId}`);
    }

    const heroesQC = manifest.heroes.map(h => {
        const isActive = spread.activeHeroes.some(ah => ah.heroToken === h.heroToken);
        return {
            heroToken: h.heroToken,
            label: h.label,
            name: h.name,
            dnaBase64OrUrl: h.stylizedDnaUrl || h.stylizedDnaBase64,
            rawBase64OrUrl: h.rawPhotoUrl,
            isVisibleInScene: isActive,
            biometrics: h.biometrics
        };
    });

    const heroDNAImages = spread.activeHeroes.map(h => h.stylizedDnaUrl || h.stylizedDnaBase64).filter(Boolean) as string[];
    const heroRawImages = spread.activeHeroes.map(h => h.rawPhotoUrl).filter(Boolean) as string[];

    return {
        generatedImageBase64: generatedImageBase64OrUrl,
        heroes: heroesQC,
        rawHeroImages: heroRawImages,
        stylizedDnaImages: heroDNAImages,
        pageType: spread.isCover ? 'Cover' : 'Spread',
        currentTextSide: spread.textSide === 'left' ? 'Left' : 'Right',
        targetPrompt: spread.imagePrompt,
        storyText: spread.storyText,
        spreadText: spread.storyText,
        childAge: manifest.heroes[0]?.age || '5',
        childDescription: manifest.heroes[0]?.wardrobe?.fullDescription,
        stylePrompt: manifest.styleContract.compiledStylePrompt,
        locationRecord: spread.location,
        propAssetImageBase64: spread.includesProp ? (manifest.propAsset?.canonicalImageBase64 || manifest.propAsset?.canonicalImageUrl) : undefined,
        propAssetImageUrl: spread.includesProp ? manifest.propAsset?.canonicalImageUrl : undefined,
        spreadNumber: spread.spreadNumber,
        isCover: spread.isCover,
        layoutPlanSide: spread.textSide === 'left' ? 'Left' : 'Right',
        orderId: manifest.orderId,
        spreadIndex: spread.spreadNumber,
        iterationNumber,
    };
}

export type TriState = 'include' | 'exclude' | 'unchanged';

export interface StructuredContractPatch {
    hero1?: TriState;
    hero2?: TriState;
    prop?: TriState;
    locationKey?: string; // explicit location string or undefined for unchanged
}

export interface RecomputedSpreadContracts {
    activeHeroTokens: ('[[HERO_1]]' | '[[HERO_2]]')[];
    activeHeroIds: string[];
    includesProp: boolean;
    locationKey: string;
}

function namePattern(name: string): string {
    if (!name || !name.trim()) return '';
    return `(?<![a-zA-Z0-9_])${escapeRegExp(name.trim())}(?![a-zA-Z0-9_])`;
}

/**
 * Parses a global override instruction independently into an isolated tri-state patch.
 * Does NOT combine with old prompt text to prevent semantic pollution.
 */
export function parseGlobalOverrideInstruction(
    instructionText: string,
    storyData: any
): {
    patch: StructuredContractPatch;
    validationErrors: string[];
} {
    const patch: StructuredContractPatch = {
        hero1: 'unchanged',
        hero2: 'unchanged',
        prop: 'unchanged',
        locationKey: undefined
    };
    const validationErrors: string[] = [];
    const text = (instructionText || '').trim();
    if (!text) {
        return { patch, validationErrors };
    }

    const isDualHero = !!(storyData.useSecondCharacter && storyData.secondCharacter?.type !== 'object');
    const hero1Name = storyData.childName || storyData.mainCharacter?.name || '';
    const hero2Name = storyData.secondCharacter?.name || '';
    const propName = storyData.blueprint?.foundation?.recurringAsset?.name || '';

    // 1. Hero 1 Analysis
    const hero1ExcludePattern = new RegExp(`\\b(without|no|remove|exclude|delete)\\s*(?::\\s*)?(?:\\[\\[hero_1\\]\\](?!\\w)|\\b(?:hero\\s*a|hero\\s*1)\\b${hero1Name ? `|${namePattern(hero1Name)}` : ''})`, 'i');
    const hero1IncludePattern = new RegExp(`\\b(with|include|add|show|feature)\\s*(?::\\s*)?(?:\\[\\[hero_1\\]\\](?!\\w)|\\b(?:hero\\s*a|hero\\s*1)\\b${hero1Name ? `|${namePattern(hero1Name)}` : ''})`, 'i');
    const hero1AlonePattern = new RegExp(`(?:(?:\\[\\[hero_1\\]\\](?!\\w)|\\b(?:hero\\s*a|hero\\s*1)\\b${hero1Name ? `|${namePattern(hero1Name)}` : ''})\\s+is\\s+alone)`, 'i');

    if (hero1ExcludePattern.test(text)) {
        if (!isDualHero) {
            validationErrors.push('Hero 1 (Protagonist) is required in a single-hero book and cannot be excluded.');
        } else {
            patch.hero1 = 'exclude';
        }
    } else if (hero1IncludePattern.test(text) || hero1AlonePattern.test(text)) {
        patch.hero1 = 'include';
    }

    // 2. Hero 2 Analysis (in dual hero story)
    if (isDualHero) {
        const hero2ExcludePattern = new RegExp(`(?:\\b(without|no|remove|exclude|delete|absent)\\s*(?::\\s*)?(?:\\[\\[hero_2\\]\\](?!\\w)|\\b(?:hero\\s*b|hero\\s*2)\\b${hero2Name ? `|${namePattern(hero2Name)}` : ''})|(?:\\[\\[hero_2\\]\\](?!\\w)|\\b(?:hero\\s*b|hero\\s*2)\\b${hero2Name ? `|${namePattern(hero2Name)}` : ''})\\s+is\\s+(?:absent|excluded))`, 'i');
        const hero2IncludePattern = new RegExp(`\\b(with|include|add|show|feature)\\s*(?::\\s*)?(?:\\[\\[hero_2\\]\\](?!\\w)|\\b(?:hero\\s*b|hero\\s*2)\\b${hero2Name ? `|${namePattern(hero2Name)}` : ''})`, 'i');

        if (hero2ExcludePattern.test(text) || hero1AlonePattern.test(text)) {
            patch.hero2 = 'exclude';
        } else if (hero2IncludePattern.test(text) || text.includes('[[HERO_2]]') || (hero2Name && new RegExp(namePattern(hero2Name), 'i').test(text))) {
            patch.hero2 = 'include';
        }
    }

    // Contradiction Check: If both heroes are excluded, fail with clear validation error
    if (patch.hero1 === 'exclude' && (patch.hero2 === 'exclude' || !isDualHero)) {
        validationErrors.push('Cannot exclude all characters from the story. At least one character must be present.');
    }

    // 3. Prop Analysis
    const propExcludePattern = new RegExp(`\\b(without|no|remove|exclude|delete)\\s*(?::\\s*)?(?:\\[\\[prop_asset\\]\\](?!\\w)|\\b(?:prop|item|asset)\\b${propName ? `|${namePattern(propName)}` : ''})`, 'i');
    const propIncludePattern = new RegExp(`\\b(with|include|add|show|feature|holding|carrying|using)\\s*(?::\\s*)?(?:\\[\\[prop_asset\\]\\](?!\\w)|\\b(?:prop|item|asset)\\b${propName ? `|${namePattern(propName)}` : ''})`, 'i');

    if (propExcludePattern.test(text)) {
        patch.prop = 'exclude';
    } else if (propIncludePattern.test(text) || text.includes('[[PROP_ASSET]]') || (propName && new RegExp(namePattern(propName), 'i').test(text))) {
        patch.prop = 'include';
    }

    // 4. Location Analysis
    const visualAnchors = storyData.visualPlan?.visualAnchors || storyData.blueprint?.visualAnchors || storyData.blueprint?.foundation;
    const rawLoc = visualAnchors?.recurringLocations || storyData.blueprint?.recurringLocations || storyData.visualPlan?.recurringLocations;
    const knownLocations: string[] = rawLoc && typeof rawLoc === 'object' ? Object.keys(rawLoc) : [];

    // Check if global instruction explicitly specifies a known location or new location
    for (const loc of knownLocations) {
        if (new RegExp(namePattern(loc), 'i').test(text)) {
            patch.locationKey = loc;
            break;
        }
    }

    if (!patch.locationKey) {
        const moveMatch = text.match(/\b(?:move\s+(?:the\s+)?scene\s+to|set\s+in|location:?|scene:?)\s+([^,.\n]+)/i);
        if (moveMatch && moveMatch[1].trim().length > 1) {
            patch.locationKey = moveMatch[1].trim();
        }
    }

    return { patch, validationErrors };
}

/**
 * Merges structured contracts with strict, deterministic precedence:
 * Global Override Patch > Manual Spread Edit > Existing Structured Contract > Blueprint Fallback
 */
export function mergeSpreadContracts(params: {
    globalPatch?: StructuredContractPatch;
    manualSpreadPrompt?: string;
    existingContract?: Partial<RecomputedSpreadContracts>;
    storyData: any;
    spreadNum: number;
}): RecomputedSpreadContracts {
    const { globalPatch, manualSpreadPrompt, existingContract, storyData, spreadNum } = params;
    const isDualHero = !!(storyData.useSecondCharacter && storyData.secondCharacter?.type !== 'object');
    const isCover = spreadNum === 0;
    const pageIdx = isCover ? -1 : spreadNum - 1;
    const hero1Name = storyData.childName || storyData.mainCharacter?.name || '';
    const hero2Name = storyData.secondCharacter?.name || '';
    const recurringAsset = storyData.blueprint?.foundation?.recurringAsset;
    const propName = recurringAsset?.name || '';
    const manualText = manualSpreadPrompt || '';

    // 1. Resolve Hero 1
    let hero1Active = true;
    if (globalPatch?.hero1 === 'exclude') {
        hero1Active = false;
    } else if (globalPatch?.hero1 === 'include') {
        hero1Active = true;
    } else if (manualText) {
        const hero1ManualExclude = new RegExp(`\\b(without|no|remove|exclude|delete)\\s*(?::\\s*)?(?:\\[\\[hero_1\\]\\](?!\\w)|\\b(?:hero\\s*a|hero\\s*1)\\b${hero1Name ? `|${namePattern(hero1Name)}` : ''})`, 'i').test(manualText);
        if (hero1ManualExclude && isDualHero) {
            hero1Active = false;
        } else if (existingContract?.activeHeroTokens) {
            hero1Active = existingContract.activeHeroTokens.includes('[[HERO_1]]');
        }
    } else if (existingContract?.activeHeroTokens) {
        hero1Active = existingContract.activeHeroTokens.includes('[[HERO_1]]');
    }

    // 2. Resolve Hero 2
    let hero2Active = false;
    if (isDualHero) {
        if (isCover) {
            if (globalPatch?.hero2 === 'exclude') {
                hero2Active = false;
            } else if (globalPatch?.hero2 === 'include') {
                hero2Active = true;
            } else if (manualText && new RegExp(`\\b(without|no|remove|exclude|delete)\\s*(?::\\s*)?(?:\\[\\[hero_2\\]\\](?!\\w)|\\b(?:hero\\s*b|hero\\s*2)\\b${hero2Name ? `|${namePattern(hero2Name)}` : ''})`, 'i').test(manualText)) {
                hero2Active = false;
            } else {
                hero2Active = true; // Cover default in dual hero
            }
        } else {
            if (globalPatch?.hero2 === 'exclude') {
                hero2Active = false;
            } else if (globalPatch?.hero2 === 'include') {
                hero2Active = true;
            } else if (manualText) {
                const isHero2ManualNegated = 
                    new RegExp(`\\b(without|no|remove|exclude|delete|absent)\\s*(?::\\s*)?(?:\\[\\[hero_2\\]\\](?!\\w)|\\b(?:hero\\s*b|hero\\s*2)\\b${hero2Name ? `|${namePattern(hero2Name)}` : ''})`, 'i').test(manualText) ||
                    new RegExp(`(?:\\[\\[hero_2\\]\\](?!\\w)|\\b(?:hero\\s*b|hero\\s*2)\\b${hero2Name ? `|${namePattern(hero2Name)}` : ''})\\s+is\\s+(?:absent|excluded)`, 'i').test(manualText) ||
                    new RegExp(`(?:(?:\\[\\[hero_1\\]\\](?!\\w)|\\b(?:hero\\s*a|hero\\s*1)\\b${hero1Name ? `|${namePattern(hero1Name)}` : ''})\\s+is\\s+alone)`, 'i').test(manualText) ||
                    new RegExp(`\\b(render\\s+only\\s+(?:\\[\\[hero_1\\]\\](?!\\w)|\\b(?:hero\\s*a|hero\\s*1)\\b${hero1Name ? `|${namePattern(hero1Name)}` : ''}))`, 'i').test(manualText);
                
                const hasHero2ManualToken = (manualText.includes('[[HERO_2]]') && !isHero2ManualNegated) || (hero2Name && new RegExp(namePattern(hero2Name), 'i').test(manualText) && !isHero2ManualNegated);

                if (isHero2ManualNegated) {
                    hero2Active = false;
                } else if (hasHero2ManualToken) {
                    hero2Active = true;
                } else if (existingContract?.activeHeroTokens) {
                    hero2Active = existingContract.activeHeroTokens.includes('[[HERO_2]]');
                } else {
                    const bpSpread = pageIdx >= 0 ? storyData.blueprint?.structure?.spreads?.[pageIdx] : null;
                    hero2Active = !!(bpSpread?.charactersPresent?.some((c: any) => typeof c === 'string' ? (hero2Name && c.toLowerCase().includes(hero2Name.toLowerCase())) : (hero2Name && c?.name?.toLowerCase()?.includes(hero2Name.toLowerCase()))));
                }
            } else if (existingContract?.activeHeroTokens) {
                hero2Active = existingContract.activeHeroTokens.includes('[[HERO_2]]');
            } else {
                const bpSpread = pageIdx >= 0 ? storyData.blueprint?.structure?.spreads?.[pageIdx] : null;
                hero2Active = !!(bpSpread?.charactersPresent?.some((c: any) => typeof c === 'string' ? (hero2Name && c.toLowerCase().includes(hero2Name.toLowerCase())) : (hero2Name && c?.name?.toLowerCase()?.includes(hero2Name.toLowerCase()))));
            }
        }
    }

    // Safety fallback: at least one hero must be active
    if (!hero1Active && !hero2Active) {
        hero1Active = true;
    }

    const activeHeroTokens: ('[[HERO_1]]' | '[[HERO_2]]')[] = [];
    const activeHeroIds: string[] = [];
    if (hero1Active) {
        activeHeroTokens.push('[[HERO_1]]');
        activeHeroIds.push('hero_1');
    }
    if (hero2Active) {
        activeHeroTokens.push('[[HERO_2]]');
        activeHeroIds.push('hero_2');
    }

    // 3. Resolve Prop
    let includesProp = false;
    if (globalPatch?.prop === 'exclude') {
        includesProp = false;
    } else if (globalPatch?.prop === 'include') {
        includesProp = true;
    } else if (manualText) {
        const isPropManualNegated = new RegExp(`\\b(without|no|remove|exclude|delete)\\s*(?::\\s*)?(?:\\[\\[prop_asset\\]\\](?!\\w)|\\b(?:prop|item|asset)\\b${propName ? `|${namePattern(propName)}` : ''})`, 'i').test(manualText);
        const hasPropManualToken = (manualText.includes('[[PROP_ASSET]]') && !isPropManualNegated) || (propName && new RegExp(namePattern(propName), 'i').test(manualText) && !isPropManualNegated);
        
        if (isPropManualNegated) {
            includesProp = false;
        } else if (hasPropManualToken) {
            includesProp = true;
        } else if (typeof existingContract?.includesProp === 'boolean') {
            includesProp = existingContract.includesProp;
        } else if (!isCover && recurringAsset && Array.isArray(recurringAsset.appearancesSpreads) && recurringAsset.appearancesSpreads.includes(spreadNum)) {
            includesProp = true;
        }
    } else if (typeof existingContract?.includesProp === 'boolean') {
        includesProp = existingContract.includesProp;
    } else if (!isCover && recurringAsset && Array.isArray(recurringAsset.appearancesSpreads) && recurringAsset.appearancesSpreads.includes(spreadNum)) {
        includesProp = true;
    }

    // 4. Resolve Location
    let locationKey = '';
    if (globalPatch?.locationKey) {
        locationKey = globalPatch.locationKey;
    } else if (manualText) {
        const visualAnchors = storyData.visualPlan?.visualAnchors || storyData.blueprint?.visualAnchors || storyData.blueprint?.foundation;
        const rawLoc = visualAnchors?.recurringLocations || storyData.blueprint?.recurringLocations || storyData.visualPlan?.recurringLocations;
        const knownLocations: string[] = rawLoc && typeof rawLoc === 'object' ? Object.keys(rawLoc) : [];

        for (const loc of knownLocations) {
            if (new RegExp(namePattern(loc), 'i').test(manualText)) {
                locationKey = loc;
                break;
            }
        }
        if (!locationKey) {
            const locMatch = manualText.match(/(?:Location|Scene(?:\s+setting)?):\s*(?:Set\s+in\s+)?([^,.\n]+)/i);
            if (locMatch && locMatch[1].trim().length > 2) {
                locationKey = locMatch[1].trim();
            } else if (existingContract?.locationKey) {
                locationKey = existingContract.locationKey;
            } else {
                const bpSpread = pageIdx >= 0 ? storyData.blueprint?.structure?.spreads?.[pageIdx] : null;
                const planSpread = pageIdx >= 0 ? (storyData.visualPlan?.spreads?.[pageIdx] || storyData.visualPlan?.spreads?.find((s: any) => s.spread_index === spreadNum || s.spreadNumber === spreadNum)) : null;
                locationKey = bpSpread?.specificLocation || bpSpread?.specific_location || bpSpread?.location || bpSpread?.setting || planSpread?.specific_location || planSpread?.specificLocation || planSpread?.setting || '';
                if (typeof locationKey === 'object' && (locationKey as any)?.specific_location) {
                    locationKey = (locationKey as any).specific_location;
                }
            }
        }
    } else if (existingContract?.locationKey) {
        locationKey = existingContract.locationKey;
    } else {
        const bpSpread = pageIdx >= 0 ? storyData.blueprint?.structure?.spreads?.[pageIdx] : null;
        const planSpread = pageIdx >= 0 ? (storyData.visualPlan?.spreads?.[pageIdx] || storyData.visualPlan?.spreads?.find((s: any) => s.spread_index === spreadNum || s.spreadNumber === spreadNum)) : null;
        locationKey = bpSpread?.specificLocation || bpSpread?.specific_location || bpSpread?.location || bpSpread?.setting || planSpread?.specific_location || planSpread?.specificLocation || planSpread?.setting || '';
        if (typeof locationKey === 'object' && (locationKey as any)?.specific_location) {
            locationKey = (locationKey as any).specific_location;
        }
    }

    return {
        activeHeroTokens,
        activeHeroIds,
        includesProp,
        locationKey: String(locationKey || '')
    };
}

/**
 * Compiles a clean, non-contradictory prompt string from a base prompt and its resolved contract.
 * Strips obsolete negation statements that contradict the newly resolved contract.
 */
export function compilePromptFromResolvedContract(
    basePrompt: string,
    contract: RecomputedSpreadContracts,
    globalInstruction?: string,
    storyData?: any
): string {
    let clean = (basePrompt || '').trim();
    const hero1Name = storyData?.childName || storyData?.mainCharacter?.name || '';
    const hero2Name = storyData?.secondCharacter?.name || '';
    const propName = storyData?.blueprint?.foundation?.recurringAsset?.name || '';

    // If contract includes Hero 2, strip old Hero 2 negation statements from the base prompt
    if (contract.activeHeroTokens.includes('[[HERO_2]]')) {
        clean = clean.replace(/\bwithout\s+(?:\[\[HERO_2\]\]|hero\s*b|hero\s*2)[;,.]?/gi, '');
        clean = clean.replace(/(?:\[\[HERO_2\]\]|hero\s*b|hero\s*2)\s+is\s+(?:absent|excluded)[;,.]?/gi, '');
        if (hero2Name) {
            clean = clean.replace(new RegExp(`\\bwithout\\s+${escapeRegExp(hero2Name)}[;,.]?`, 'gi'), '');
            clean = clean.replace(new RegExp(`\\b${escapeRegExp(hero2Name)}\\s+is\\s+(?:absent|excluded)[;,.]?`, 'gi'), '');
        }
        clean = clean.replace(/(?:\[\[HERO_1\]\]|hero\s*a|hero\s*1)\s+is\s+alone[;,.]?/gi, '');
        if (hero1Name) {
            clean = clean.replace(new RegExp(`\\b${escapeRegExp(hero1Name)}\\s+is\\s+alone[;,.]?`, 'gi'), '');
        }
        clean = clean.replace(/\brender\s+only\s+(?:\[\[HERO_1\]\]|hero\s*a|hero\s*1)[;,.]?/gi, '');
        clean = clean.replace(/\s{2,}/g, ' ').trim();
    }

    // If contract includes Prop, strip old Prop negation statements
    if (contract.includesProp) {
        clean = clean.replace(/\bwithout\s+(?:\[\[PROP_ASSET\]\]|prop|item|asset)[;,.]?/gi, '');
        clean = clean.replace(/\bno\s+(?:\[\[PROP_ASSET\]\]|prop|item|asset)[;,.]?/gi, '');
        if (propName) {
            clean = clean.replace(new RegExp(`\\bwithout\\s+${escapeRegExp(propName)}[;,.]?`, 'gi'), '');
            clean = clean.replace(new RegExp(`\\bno\\s+${escapeRegExp(propName)}[;,.]?`, 'gi'), '');
        }
        clean = clean.replace(/\s{2,}/g, ' ').trim();
    }

    // If a global instruction is provided, prepend it cleanly
    if (globalInstruction && globalInstruction.trim()) {
        clean = `GLOBAL INSTRUCTION: ${globalInstruction.trim()}\n\n${clean}`;
    }

    return clean;
}

/**
 * Recomputes dynamic spread contracts directly from prompt text and story data.
 */
export function recomputeSpreadContracts(
    promptText: string,
    storyData: any,
    spreadNum: number
): RecomputedSpreadContracts {
    const existingPrompt = storyData.prompts?.find((p: any) => p.spreadNumber === spreadNum || (spreadNum === 0 && p.isCover));
    return mergeSpreadContracts({
        manualSpreadPrompt: promptText,
        existingContract: existingPrompt ? {
            activeHeroTokens: existingPrompt.activeHeroTokens,
            activeHeroIds: existingPrompt.activeHeroIds,
            includesProp: existingPrompt.includesProp,
            locationKey: existingPrompt.locationKey
        } : undefined,
        storyData,
        spreadNum
    });
}


