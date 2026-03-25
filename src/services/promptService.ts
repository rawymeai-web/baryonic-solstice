
import { supabase } from '../utils/supabaseClient';

export interface PromptTemplate {
  version: string;
  template: string;
}

export interface PromptTemplates {
  coverSuperPrompt: PromptTemplate;
  insideSuperPrompt: PromptTemplate;
  directMethodCoverPrompt: PromptTemplate;
  directMethodSpreadPrompt: PromptTemplate;
  directMethodSimplePrompt: PromptTemplate;
  method4CoverPrompt: PromptTemplate;
  method4SpreadPrompt: PromptTemplate;
  characterExtractionPrompt: PromptTemplate;
}

export const defaultPrompts: PromptTemplates = {
  coverSuperPrompt: {
    version: '2.5',
    template: `
An ultra-wide cinematic illustration in the style of {style_prompt}.

**MANDATORY VISUAL DNA:**
{technical_style_guide}

**COMPOSITION MANDATE:**
- Wide panoramic layout (16:9).
- Focal Point: Place the protagonist in the **LOWER-RIGHT** or **LOWER-CENTER**.
- **Negative Space Rule:** The TOP 40% of the image must be clean negative space (clear sky, simple ceiling, or soft background) to ensure clear readability of overlaid elements later.
- Do NOT place the character's head or important details in the top half of the frame.

**Character Ref: {main_character_description}
**Secondary Char: {second_character_description}

**Summary: {story_summary}
`
  },
  insideSuperPrompt: {
    version: '3.8',
    template: `
A beautiful, cinematic, ultra-wide panoramic illustration in the style of: {style_prompt}.

**MANDATORY VISUAL DNA:**
{technical_style_guide}

**Core Objective:** Create one single, seamless, panoramic painting.

**VISUAL INPUTS GUIDE:**
1. **Character Sheet:** Replicate the child protagonist exactly.
2. **Style Reference:** Adopt color palette and mood.

**Scene Summary:** {page_summary}

**Composition:**
* Action on the **{main_content_side}** side.
* Opposite side is negative space for text.

**Technical Rules:**
* Full bleed 16:9. No text or watermarks.
`
  },
  directMethodCoverPrompt: {
    version: '2.8',
    template: `
A beautiful, cinematic, ultra-wide illustration.

**STYLE DNA:**
{technical_style_guide}

**COMPOSITION:**
Place character in the **bottom-right**. The top 40% must be clean background (e.g., sky).

**Summary: "{summary}"
**Art Style: {style_prompt}
`
  },
  directMethodSpreadPrompt: {
    version: '3.6',
    template: `
A beautiful, cinematic, panoramic illustration.

**STYLE DNA:**
{technical_style_guide}

**Summary: "{summary}"
**Art Style: {style_prompt}

**Composition: Action on the **{main_content_side}** side.
`
  },
  directMethodSimplePrompt: {
    version: '3.6',
    template: `
A high-fidelity cinematic illustration merging Subject with Art Style.

**STYLE DNA:**
{technical_style_guide}

**Scene: "{sceneSummary}"
**Art Style: {stylePrompt}
`
  },
  method4CoverPrompt: {
    version: '2.0',
    template: `
**GOAL:** High-Res Book Cover with 100% Identical Character Likeness.

**REFERENCE INPUTS:**
* **Image 1 (SUBJECT):** The EXCLUSIVE source for face structure, topology, eyes, and identity. 
* **Image 2 (STYLE):** The EXCLUSIVE source for artistic medium/lighting ONLY. 

**STRICT IDENTITY FREEZE:**
The protagonist MUST be the exact same human being as shown in **Image 1**. 
- Preserve facial bone structure and chin shape.
- Preserve hair texture and precise color.
- Preserve eye distance and gaze.
DO NOT allow the art style from Image 2 to "beautify" or change the character's structural identity.

**COMPOSITION:**
Wide panoramic view (16:9). Character in **BOTTOM-RIGHT**.
The TOP-HALF of the frame MUST be empty background (negative space) for title placement.

**SCENE:** "{summary}"
`
  },
  method4SpreadPrompt: {
    version: '2.2',
    template: `
**GOAL:** High-End Panoramic Spread with 100% Likeness.

**REFERENCE INPUTS:**
* **Image 1 (SUBJECT):** The absolute structural source for the protagonist.
* **Image 2 (STYLE):** Artistic medium and palette source. 

**STRICT CHARACTER LOCK:**
Render the child from **Image 1** with perfect topological accuracy. 
Ensure the face in this spread is the same person as in all other spreads. 
Art style from Image 2 must only apply to the "painting technique", not the "person's features".

**COMPOSITION:**
* Panoramic 16:9 Full Bleed.
* Main action/hero strictly on the **{main_content_side}** side.
* **IMPORTANT:** The opposite side must be a CLEAN, EMPTY background area.

**SCENE NARRATIVE:**
"{summary}"
`
  },
  characterExtractionPrompt: {
    version: '1.1',
    template: `You are a world-class character designer. Analyze the {num_photos} provided photos of a child and describe their physical identity in detail (hair color/style, eye color, face shape, typical clothing colors). Be extremely specific about facial topology to ensure the AI can replicate this EXACT child across different scenes. Output strictly the descriptive text.`
  }
};

export async function fetchPrompts(): Promise<PromptTemplates> {
  const { data, error } = await supabase.from('prompts').select('*');
  if (error || !data || data.length === 0) return defaultPrompts;

  const loadedPrompts = { ...defaultPrompts };
  data.forEach((row: any) => {
    if (row.id in loadedPrompts) {
      // @ts-ignore
      loadedPrompts[row.id] = {
        version: row.version,
        template: row.template
      };
    }
  });
  return loadedPrompts as PromptTemplates;
}

export async function savePrompts(prompts: PromptTemplates): Promise<void> {
  const rows = Object.entries(prompts).map(([key, value]) => ({
    id: key,
    template: value.template,
    version: value.version,
    updated_at: new Date().toISOString()
  }));

  const { error } = await supabase.from('prompts').upsert(rows);
  if (error) throw error;
}
