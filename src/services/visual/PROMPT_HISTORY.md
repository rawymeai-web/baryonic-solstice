# Prompt Generation History
Keep this file as a strict reference for the successful prompt structures that produced consistent character and art style results across the cover and pages.

## Version 1: The "Perfect Consistency" Prompts (Order RWY-B2ST9A5QE and post-FC3 fix)
*Date: February 27, 2026*

### Cover Prompt Structure (`promptEngineer.ts`)
```text
**GOAL:** Generate a panoramic illustration for a children's book that perfectly matches the established character and art style.

**REFERENCE INPUTS:**
- **Character/Style Anchor (IMAGE 1):** This is the **Master Reference**. It defines both the Character Identity (face, hair) and the Artistic Technique (brushwork, color palette).

**FIXED ASSET MANDATE:**
- The character in IMAGE 1 is a **fixed visual asset**. Place them in the scene described below without modifying their facial features, body proportions, or artistic rendering technique. 
- You must **NOT** invent new lighting or rendering logic that conflicts with IMAGE 1. 

**SCENE EXTENSION:**
- Render the environment to match the specific artistic textures and brushwork found in IMAGE 1. The character should feel integrated, but their core style is immutable. 

**COMPOSITION:**
- **FRONT COVER (RIGHT):** Focus on the Child / Hero.
- **BACK COVER (LEFT):** This area must be an open, uncluttered extension of the background scene (e.g. sky, simple landscape) to allow for text placement. 

**SCENE DESCRIPTION:**
- Setting: [Setting]
- Action: [Key Actions]
- Mood: [Mood]
- Palette: Inherit strictly from IMAGE 1.

**MANDATORY OUTPUT RULES:**
- **Follow Visual DNA:** Strictly adhere to the rendering technique defined in IMAGE 1.
- **No Photography Rules:** Do not use realistic depth-of-field, bokeh, or cinematic lighting. Keep it painterly/illustrated.
- No typography, no letters, no watermarks.
- No split screen line — continuous panoramic art.
```

### Spread Prompt Structure (`promptEngineer.ts`)
```text
**GOAL:** Generate a panoramic storybook illustration with perfect style consistency.

**REFERENCE INPUTS:**
- **Character/Style Anchor (IMAGE 1):** The Master Reference for identity and artistic technique.

**ID & STYLE LOCK:**
- **FIXED ASSET MANDATE:** The character in IMAGE 1 is a **fixed visual asset**. Place them in the scene described below without modifying their facial features, body proportions, or artistic rendering technique.
- You must **NOT** invent new lighting or rendering logic that conflicts with IMAGE 1.
- **SCENE EXTENSION:** Render the environment to match the specific artistic textures found in IMAGE 1. Build the world around the child using their style heritage.

**COMPOSITION:**
- **SUBJECT PLACEMENT:** Place the character from IMAGE 1 on the **[RIGHT/LEFT]** side.
- **OPEN CANVAS:** The **[LEFT/RIGHT]** side must be open/uncluttered background for text. 
- **FRAMING:** [Camera Angle]. No dutch angles or extreme cinematic lenses.

**SCENE DESCRIPTION:**
- Setting: [Setting] ([Environment Type])
- Action: [Key Actions].

**MANDATORY OUTPUT RULES:**
- **Inherit Technique:** Use the exact same brushwork, line quality, and color temperature as IMAGE 1.
- **Zero Realism:** Do not apply realistic photography physics (lighting decay, shadows). Keep the lighting consistent with the art style in IMAGE 1.
- **Anatomy:** Ensure correct number of limbs/fingers.
- No typography, lettering, or split lines.
```

### Backend Image Generation API Instructions (`imageGenerator.ts`)
```text
[Prompt Text Above]

**STRICT VISUAL CONSISTENCY MANDATE:**

1. **HERO IDENTITY:** The attached IMAGE is the **Absolute Only Source of Truth** for the hero. You MUST replicate the exact facial features, hair pattern, and body proportions of the child in the image.
2. **STYLE LOCK:** You MUST render the entire scene in the following specific Art Style: "[Global Style Prompt]". Do not stray from this global art style description. Use the attached image as a supplemental reference for the rendering technique (brushwork/color grading).
3. **ZERO REALISM:** Maintain the illustration/storybook aesthetic. No realistic lighting or photography physics.
```
