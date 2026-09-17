import arcCatalogData from './arcCatalogData.json';

export type AgeTier = '1-3' | '4-5' | '6-8' | '9-12';

export interface BeatRecord {
  spread: number;
  text: string;
}

export interface ArcRecord {
  arcId: string;
  themeId: string;
  arcNumber: string;
  ageTier: AgeTier;
  title: string;
  premise: string;
  anchorAndRule: string;
  castPlan: string;
  dualAdaptation: string;
  itemAdaptation: string;
  beats: BeatRecord[];
}

export interface ThemeCatalogEntry {
  themeId: string;
  num: number;
  titleEn: string;
  titleAr: string;
  editorialDirection: string;
  culturalTouch: string;
  guardrails: string;
  arcsCount: number;
  arcs: ArcRecord[];
}

export const THEME_ALIASES: Record<string, string> = {
  'val-dentist': 'val-dentist',
  'val-siblings': 'val-siblings',
  'adv-magic-obj': 'adv-magic-obj',
  'adv-magic': 'adv-magic-obj',
  'adv-daily': 'adv-daily',
  'adv-animals': 'adv-animal',
  'adv-animal': 'adv-animal',
  'adv-dinosaur': 'adv-dino',
  'adv-dinosaurs': 'adv-dino',
  'adv-dino': 'adv-dino',
  'adv-pyramids': 'adv-pyramid',
  'adv-pyramid': 'adv-pyramid',
  // Natural Language & Storefront Name Aliases
  'animal adventures': 'adv-animal',
  'animals': 'adv-animal',
  'talking to animals and understanding their language': 'adv-animal',
  'space adventure': 'adv-space',
  'space': 'adv-space',
  'pyramid adventure': 'adv-pyramid',
  'pyramids': 'adv-pyramid',
  'treasure hunt': 'adv-treasure',
  'treasure': 'adv-treasure',
  'fantasy play': 'adv-fantasy',
  'fantasy': 'adv-fantasy',
  'magical objects': 'adv-magic-obj',
  'magic': 'adv-magic-obj',
  'mini nature adventure': 'adv-mini-nature',
  'nature': 'adv-mini-nature',
  'lost and found': 'adv-lost-found',
  'lost and found journey': 'adv-lost-found',
  'dinosaur adventure': 'adv-dino',
  'dinosaurs': 'adv-dino',
  'staying tidy': 'val-tidy',
  'tidy': 'val-tidy',
  'sharing toys': 'val-sharing-toys',
  'sharing': 'val-sharing-toys',
  'helping others': 'val-helping',
  'helping': 'val-helping',
  'the importance of honesty': 'val-honesty',
  'honesty': 'val-honesty',
  'respect': 'val-respect',
  'bravery at the dentist': 'val-dentist',
  'bravery': 'val-bravery',
  'bedtime & sleep': 'val-sleep',
  'sleep': 'val-sleep',
  'bedtime': 'val-sleep',
  'school': 'val-school',
  'potty': 'val-potty',
  'teamwork': 'val-teamwork',
  'cooking': 'adv-cooking',
  'daily life adventure': 'adv-daily'
};

export function resolveThemeId(themeIdOrName: string): string {
  if (!themeIdOrName) return 'adv-space';
  const clean = themeIdOrName.toLowerCase().trim();
  if (THEME_ALIASES[clean]) return THEME_ALIASES[clean];

  for (const [alias, targetId] of Object.entries(THEME_ALIASES)) {
    if (clean.includes(alias) || alias.includes(clean)) {
      return targetId;
    }
  }

  const found = (arcCatalogData as ThemeCatalogEntry[]).find(t => t.themeId === clean);
  if (found) return found.themeId;

  return clean || 'adv-space';
}

export function getAgeTier(age: number): AgeTier {
  if (age <= 3) return '1-3';
  if (age <= 5) return '4-5';
  if (age <= 8) return '6-8';
  return '9-12';
}

export function getThemeCatalog(): ThemeCatalogEntry[] {
  return arcCatalogData as ThemeCatalogEntry[];
}

export function getThemeById(themeId: string): ThemeCatalogEntry | null {
  const resolved = resolveThemeId(themeId);
  const theme = (arcCatalogData as ThemeCatalogEntry[]).find(t => t.themeId === resolved);
  return theme || null;
}

export function getArcById(arcId: string): ArcRecord | null {
  for (const theme of arcCatalogData as ThemeCatalogEntry[]) {
    const found = theme.arcs.find(a => a.arcId === arcId);
    if (found) return found;
  }
  return null;
}

export function getArcsForThemeAndAge(themeId: string, age: number): ArcRecord[] {
  const resolved = resolveThemeId(themeId);
  const tier = getAgeTier(age);
  const theme = getThemeById(resolved);
  if (!theme) return [];

  // Potty training is only offered for 1-3 and 4-5
  let arcs = theme.arcs.filter(a => a.ageTier === tier);
  if (arcs.length === 0 && resolved === 'val-potty') {
    arcs = theme.arcs.filter(a => a.ageTier === '4-5');
  }
  return arcs;
}

/**
 * Selects an arc for a story. If preferredArcIdOrIndex is provided, uses it;
 * otherwise picks one of the age-appropriate arcs (random or deterministic based on seed).
 */
export function selectArcForStory(
  themeId: string,
  age: number,
  preferredArcIdOrIndex?: string | number,
  randomSeed?: string
): ArcRecord {
  const arcs = getArcsForThemeAndAge(themeId, age);
  if (arcs.length === 0) {
    // Fallback to Space theme if completely unknown
    const fallbackArcs = getArcsForThemeAndAge('adv-space', age);
    return fallbackArcs[0];
  }

  if (typeof preferredArcIdOrIndex === 'string') {
    const specific = arcs.find(a => a.arcId === preferredArcIdOrIndex);
    if (specific) return specific;
  }

  if (typeof preferredArcIdOrIndex === 'number' && preferredArcIdOrIndex >= 0 && preferredArcIdOrIndex < arcs.length) {
    return arcs[preferredArcIdOrIndex];
  }

  if (randomSeed) {
    // Deterministic selection based on seed string
    let hash = 0;
    for (let i = 0; i < randomSeed.length; i++) {
      hash = (hash << 5) - hash + randomSeed.charCodeAt(i);
      hash |= 0;
    }
    const idx = Math.abs(hash) % arcs.length;
    return arcs[idx];
  }

  // Random selection among the 3 arcs
  const randomIdx = Math.floor(Math.random() * arcs.length);
  return arcs[randomIdx];
}
