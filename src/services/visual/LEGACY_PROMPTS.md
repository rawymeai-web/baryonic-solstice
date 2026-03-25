# Legacy Prompts (Pre-JSON Structure Upgrade)
_Archived on March 24, 2026_

This file contains the legacy unstructured / string-based prompt functions before the transition to the highly-structural JSON Vision Output schema. If the JSON pipeline needs to be rolled back, these source functions can be copy-pasted back into `imageGenerator.ts` and `promptEngineer.ts`.

### 1. `imageGenerator.ts` -> `describeSubject()`
```typescript
export async function describeSubject(imageBase64: string): Promise<string> {
    return withRetry(async () => {
        try {
            const model = ai().getGenerativeModel({ model: 'gemini-2.0-flash-thinking-preview' });
            const response = await model.generateContent([
                { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
                { text: "ROLE: World-class character designer. TASK: Analyze the provided photo of a child and describe their physical identity in detail. FOCUS: Hair color/style, eye color, face shape, skin tone, and unique identifiers. MANDATE: Be extremely specific about facial topology to ensure the AI can replicate this EXACT child across different scenes. Output strictly the descriptive text for an AI artist." }
            ]);
            return response.response.text().trim() || "A child";
        } catch (e) {
            console.error("Describe Subject Failed", e);
            throw e; // Rethrow to let withRetry handle it
        }
    }, 2, 5000, "A child");
}
```

### 2. `imageGenerator.ts` -> `generateTechnicalStyleGuide()`
```typescript
export async function generateTechnicalStyleGuide(imageBase64: string, stylePrompt: string): Promise<string> {
    return withRetry(async () => {
        try {
            const model = ai().getGenerativeModel({ model: 'gemini-2.0-flash' });
            const prompt = \`**TASK:** Analyze the attached image and describe its "Technical Style Guide" for an AI artist.
        
**OBJECTIVE:** Create a 3-sentence technical prompt that describes the lighting, brushstrokes, color temperature, and texture of this specific image. 

**CONTEXT:** This image uses the style: "\${stylePrompt}". Focus on how this style is unique in THIS specific rendering.

**OUTPUT:** Provide ONLY the 3-sentence technical description. No introduction.\`;

            const response = await model.generateContent([
                { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
                { text: prompt }
            ]);

            return response.response.text().trim() || "A consistent artistic style.";
        } catch (e) {
            console.error("Style Guide Generation Failed", e);
            throw e;
        }
    }, 2, 3000, \`A consistent rendering in the style of \${stylePrompt}.\`);
}
```

### 3. `imageGenerator.ts` -> `generateMethod4Image()` Base Prompts
```typescript
const basePromptText = \`**CHARACTER REFERENCE (IMAGE 1):**
- Identity: \${sanitizedDesc}
- Focus: Match the face, hair features, and physical traits of the child in the first attached image exactly.

**SCENE DESCRIPTION:**
\${sanitizedPrompt}

**VISUAL CONSISTENCY MANDATE:**
1. **HERO IDENTITY:** The attached IMAGE 1 is the primary reference. Replicate facial features, hair pattern, and body proportions exactly based on the photo and description.
2. **STYLE LOCK:** Render the scene using the provided art style keywords: "\${sanitizedStyle}". Ensure the rendering technique (brushwork/color grading) matches IMAGE 1.
3. **AESTHETIC:** Maintain a consistent painterly aesthetic. Keep lighting soft and artistic.
4. **ASPECT RATIO:** Generate a horizontal 16:9 panoramic image.
5. **QUALITY:** Render in ultra-high resolution, 4K quality, sharp details, flawless rendering, masterpiece, maximum resolution available.\`;
```

### 4. `promptEngineer.ts` -> `generatePrompts()` Core Block
```typescript
const imagePrompt = \`**CHARACTER REFERENCES:**
- [IMAGE 1]: \${heroRef}\${secRef}

**STYLE:**
\${safeDNA}
\${(spread.timeOfDay || 'day').toLowerCase() === 'night' ? 'Cool, soft ambient palette' : 'Warm color palette'} — consistent with IMAGE 1's art style.
Painterly brushwork, soft linework.
Flat 2D illustrated rendering. No photographic shadows.

**SCENE:**
- Setting: \${safeSetting} (\${spread.environmentType})
\${theme ? \`- Story Theme Focus (CRITICAL): \${theme}\\n\` : ""}\${occasion ? \`- Special Occasion context: \${occasion}\\n\` : ""}\${extraItems ? \`- Additional items/props to include: \${extraItems}\\n\` : ""}- Time of Day: \${spread.timeOfDay}
- Mood: \${spread.mood || "Wonder"}
- Action: \${safeAction}

**COMPOSITION:**
- \${secComp}
- The \${oppSide || 'left'} side must be completely open and empty background space. Do NOT generate text, lettering, or words in this space.
- Framing: Wide establishing shot, \${finalCameraAngle}. No dutch angles.

--no text, letters, words, typography, watermarks, photorealistic lighting\`;
```
