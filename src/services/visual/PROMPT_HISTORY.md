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

---

## Version 7.4: Likeness-Anchored DNA & Dynamic Style Pipeline (`[v7.4-dna-unified]`)
*Date: August 2026*

### Core Architectural Principles:
1. **Dynamic Character Likeness Anchors:** Per-character transfer directives that preserve facial anatomy, eye shapes, hair textures, skin tones, and distinct traits directly from `Image 1`, `Image 2`, etc., without hardcoding clothing or names.
2. **Dynamic Art Style Matching:** Injects the selected art style prompt and medium anchors (gouache, watercolor, 3D, etc.) to prevent Gemini from flattening art into generic vector anime.
3. **Hardcover Wrap Geometry:** English covers automatically enforce Front Cover (Right half) character action with open top banner space, leaving the Back Cover (Left half) for calm landscape. Arabic covers invert appropriately.
4. **Universal Clean Constraints:** Strictly disallows text, letters, logos, and watermarks without any scene-specific or theme-specific prohibitions.

### Standard v7.4 Prompt Template:
```text
[v7.4-dna-unified]

CHARACTER REFERENCES:
- Image 1: Approved character reference for [[HERO_1]] (a [Age]-year-old child).
- Image 2: Approved character reference for [[HERO_2]] (a [Age]-year-old child).

CHARACTER LIKENESS & ANATOMY:
- [[HERO_1]] ([Name], a [Age]-year-old child): Transfer the exact recognizable face shape, skin tone, eye shape, and hairstyle directly from Image 1, wearing [Clothing], with [Distinctive Features]. Keep their face structure and recognizable identity identical to Image 1.

ART STYLE MATCHING:
- Render in the exact handcrafted art style and medium of the reference image(s): [Dynamic Style Prompt]. Do not simplify into flat anime or generic vector cartoon.

Scene: Location: [Location], Environment: [Type], Time of Day: [Time], Mood: [Mood], Lighting: [Lighting].

Action: Show [[HERO_1]] [Dynamic Action], with a [Expression] expression, [Eye Line].

Props to include: [Scene Props].

Composition: Place all characters, actions, and key props on the [right/left] side of the frame. The opposite [left/right] side must remain open, uncluttered negative space with simple, soft background scenery. Framing: Use a [Camera Angle] composition.

Constraints: Strictly no letters, numbers, signs, text, logos, or watermarks anywhere in the illustration. Must be a wide 16:9 horizontal image. Illustrate the new pose and action described above, while keeping each character's exact face, hairstyle, and outfit from their reference image.
```

---

## Version 7.6: Dynamic Actor Placement & Wardrobe Lock (`[v7.6-actor-placement]`)
*Date: September 2026*

### Core Architectural Principles:
1. **Dynamic Actor Casting:** Disentangles character identity from background in reference images. Explicit 1:1 facial likeness mandate.
2. **Canonical 3-Part Wardrobe Lock:** Top, bottom, footwear strictly preserved across all spreads.
3. **RTL/LTR Cover Geometry:** Front cover action locked to correct side (Left for Arabic, Right for English).

---

## Version 7.7: Wide Environmental Full-Body Placement & Vertical Clearance (`[v7.7-wide-actor-placement]`)
*Date: September 2026*

### Core Architectural Principles:
1. **Wide-Angle Full-Body Environmental Framing:** Eliminates close-up portrait bias by commanding full-body figures with visible footwear grounded in the lower 45% of the frame.
2. **Generous Vertical Headroom (Top 50-55% Negative Space):** Characters' heads and faces are strictly kept below the 45% horizontal midline, ensuring the top half of the canvas remains open sky, ceiling, or distant atmospheric background.
3. **Zero Confusion Language:** Strictly avoids mentioning layout reasons (e.g. no mentions of "text", "book cover", or "title") to prevent generative models from hallucinating text or watermarks.

### Standard v7.7 Cover Prompt Template:
```text
[v7.7-wide-actor-placement]

CHARACTER CASTING & SOURCE REFERENCES:
- Image 1: Approved character reference image for [[HERO_1]] ([Name], a [Age]-year-old child).

CHARACTER CASTING & SCENE PLACEMENT:
- [[HERO_1]] ([Name], a [Age]-year-old child): The protagonist in this image is the EXACT child shown in Image 1. Place this specific child into the new scene and action described below.
  * DYNAMIC ISOLATION RULE: Isolate ONLY the character figure from Image 1. Completely discard and ignore all background scenery, surrounding environment, animals, objects, textures, and props visible in Image 1.
  * 1:1 IDENTITY PRESERVATION: Maintain exact 1:1 facial likeness from Image 1: head and jaw shape, cheek structure, eye shape and color, eyebrow arch, nose and mouth geometry, skin tone, and exact hairstyle/hairline. Do NOT re-imagine, further stylize, or replace with a generic cartoon face.

WARDROBE & ATTIRE LOCK:
- [[HERO_1]] ([Name]): Must strictly wear: [Outfit]. Maintain this exact clothing and footwear across all full-body, standing, and seated poses.

ART STYLE MATCHING:
- Inherit the visual style, lighting quality, textures, and medium directly from the character reference image(s). Do not introduce contrasting art styles or simplify into flat cartoon vectors.

Scene: Set in [Setting/Location] (Environment: [Type], Time of Day: [Time], Mood: [Mood], Lighting: [Lighting]).

Action: Show [[HERO_1]] [Dynamic Action], with a [Expression] expression.
Hero Expression: Ensure the hero's face is always charming, cute, and lovable with sweet, endearing childlike appeal.

Props to include: [Scene Props].

Composition: Single panoramic seamless illustration spread across the entire wide canvas. Extreme wide-angle full-body environmental shot. Place all main characters and the primary hero action strictly on the [RIGHT/LEFT] side of the frame, confined entirely within the bottom 45% height of the [right/left] half with full bodies and feet visible on the ground. The entire upper 55% of the [right/left] side must remain calm, expansive open negative space with vast empty sky or soft ambient background scenery. Characters' heads and faces must remain strictly below the 45% horizontal midline. The entire opposite side of the frame must contain calm, peaceful ambient background scenery without any character figures. No vertical lines, creases, splits, borders, or text.

Constraints: Strictly no letters, numbers, signs, text, logos, or watermarks anywhere in the illustration. Must be a wide 16:9 horizontal image. Illustrate the new pose and action described above, while strictly maintaining each character's exact face, hairstyle, and locked wardrobe from their reference and instructions.
```

## Version 7.8: Generalized Style-DNA Lock & Proportion Parity (`[v7.8-style-dna-lock]`)
*Date: September 2026*

### Core Architectural Principles:
1. **Dynamic Style Profile & Medium Injection:** Fully dynamic integration of the active `StyleProfile` (`positive_style_lock`, `character_rendering_rules`, `texture_rules`, and `forbidden_styles`). Removes all hardcoded style assumptions and protects all book styles (3D Adventure, 2D Watercolor, Dreamy Realism, Anime, etc.) equally.
2. **1:1 Anatomical & Stylization Parity:** Explicitly commands diffusion models to maintain the exact anatomical scale (e.g. eye-to-head proportion ratio) and stylization depth established in the Character DNA Reference Image (Image 1), preventing unprompted cartoon caricaturing or doll-face distortion in realistic books.
3. **Elimination of Hardcoded Caricature Tropes:** Strips unconditional boilerplate strings (such as *"Ensure the hero's face is always charming, cute, and lovable with sweet, endearing childlike appeal"*) and replaces them with authentic, narrative-grounded emotional expressions.
4. **Dynamic QA Alignment:** Live QA audits feature proportions and medium parity relative to the Character DNA Reference Image and Target Style Profile, triggering automated surgical prompt repairs via Prompt Doctor upon detecting any stylization drift.

### Standard v7.8 Prompt Template:
```text
[v7.8-style-dna-lock]

CHARACTER CASTING & SOURCE REFERENCES:
- Image 1: Approved character reference image for [[HERO_1]] ([Name], a [Age]-year-old child).

CHARACTER CASTING & SCENE PLACEMENT:
- [[HERO_1]] ([Name], a [Age]-year-old child): The protagonist in this image is the EXACT child shown in Image 1. Place this specific child into the new scene and action described below.
  * DYNAMIC ISOLATION RULE: Isolate ONLY the character figure from Image 1. Completely discard and ignore all background scenery, surrounding environment, animals, objects, textures, and props visible in Image 1.
  * 1:1 IDENTITY & ANATOMY FIDELITY: Maintain exact 1:1 facial likeness from Image 1: head and jaw shape, cheek structure, eye shape and color, eyebrow arch, nose and mouth geometry, skin tone, and exact hairstyle/hairline. Strictly preserve the established anatomical scale and facial feature proportions from Image 1 (including eye-to-face proportion ratio). Do NOT alter stylization depth, re-imagine, or substitute with generic caricature.

WARDROBE & ATTIRE LOCK:
- [[HERO_1]] ([Name]): Must strictly wear: [Outfit]. Maintain this exact clothing and footwear across all full-body, standing, and seated poses.

ART STYLE & STYLIZATION FIDELITY:
- Target Style: [Active Style Profile Name]. [Positive Style Lock] [Character Rendering Rules] [Texture Rules]
- Inherit the visual artistic medium, lighting quality, surface textures, and stylization depth directly from the character reference image(s). Strictly maintain the artistic medium, dimensionality, and stylization level of Image 1. Strictly avoid incompatible art styles, medium drift, or unapproved rendering techniques: [Forbidden Styles].

Scene: Set in [Setting/Location] (Environment: [Type], Time of Day: [Time], Mood: [Mood], Lighting: [Lighting]).

Action: Show [[HERO_1]] [Dynamic Action], with a [Expression] expression.

Props to include: [Scene Props].

Composition: Wide-angle full-body environmental shot with generous vertical clearance. Ground all characters, actions, and key props strictly in the lower 45% of the frame on the [RIGHT/LEFT] side, showing full figures from head to toe with feet visible on the ground. The upper 50% of the frame must remain expansive, open negative space with empty sky, high ceiling, or soft atmospheric background scenery. The top of the characters' heads must remain strictly below the 45% horizontal midline. The opposite side must remain calm, open negative space with simple, soft background scenery.

Constraints: Strictly no letters, numbers, signs, text, logos, or watermarks anywhere in the illustration. Must be a wide 16:9 horizontal image. Illustrate the new pose and action described above, while strictly maintaining each character's exact face, hairstyle, and locked wardrobe from their reference and instructions.
```
