import { ai, withRetry } from './modelGateway';
import { supabase } from '@/utils/supabaseClient';

export interface GeneratePropAssetOptions {
    orderId?: string;
    assetName: string;
    assetDescription: string;
    stylePrompt: string;
    referenceBase64?: string; // Optional reference image if user provided an object photo
}

export interface GeneratePropAssetResult {
    imageBase64: string;
    imageUrl?: string;
    prompt: string;
    assetName: string;
}

/**
 * Generates an isolated, canonical 1:1 render of a primary recurring storybook prop/vehicle
 * on a clean neutral studio backdrop matching the selected art style.
 */
export async function generatePropAssetImage(options: GeneratePropAssetOptions): Promise<GeneratePropAssetResult> {
    const { orderId, assetName, assetDescription, stylePrompt, referenceBase64 } = options;

    return withRetry(async () => {
        const cleanStyle = (stylePrompt || "high quality painterly children's book illustration").trim();
        
        const promptText = `**TASK:** Generate an isolated, high-resolution canonical reference illustration of a primary recurring storybook object/vehicle.

**OBJECT NAME:** ${assetName}
**PHYSICAL & VISUAL SPECIFICATION:**
${assetDescription}

**ART STYLE & RENDERING SPECIFICATION:**
- **STYLE:** ${cleanStyle}
- Render the object strictly adhering to the lighting, color depth, materials, and stroke aesthetics of this style.

**STRICT COMPOSITION & STUDIO MANDATES:**
- 1:1 Aspect Ratio.
- Clean, centered hero object product/studio shot.
- **ISOLATED BACKDROP:** The object MUST be presented against a soft, clean, neutral gradient studio backdrop with soft ambient rim lighting.
- ❌ **ABSOLUTELY NO ENVIRONMENT:** STRICTLY NO bedroom, NO landscape, NO sky, NO rooms, NO floor clutter, NO human characters, NO hands holding the object.
- ❌ **ABSOLUTELY NO TEXT OR WATERMARKS:** No logos, labels, or framing borders.
- Make the silhouette, geometric proportions, colors, and unique physical trims hyper-clear and memorable so it can serve as a downstream identity anchor across all spreads.`;

        const contents: any[] = [];
        if (referenceBase64 && referenceBase64.length > 50) {
            const cleanB64 = referenceBase64.includes('base64,') ? referenceBase64.split('base64,')[1] : referenceBase64;
            contents.push({
                inlineData: {
                    mimeType: 'image/jpeg',
                    data: cleanB64
                }
            });
            contents.push({
                text: `${promptText}\n\n**REFERENCE INPUT:** See Image 1 as the reference shape/concept for this object, but render it fully in the requested '${cleanStyle}' art style.`
            });
        } else {
            contents.push({
                text: promptText
            });
        }

        const candidateModels = [
            'gemini-3-pro-image-preview',
            'gemini-3-pro-image',
            'gemini-3.1-flash-image',
            'gemini-3.1-flash-image-preview',
            'gemini-2.5-flash-image'
        ];

        let imageBase64 = '';
        let lastError: any = null;

        for (const candidateModel of candidateModels) {
            try {
                console.log(`[AssetGenerator] Calling model ${candidateModel} for Prop: "${assetName}"...`);
                const model = ai().getGenerativeModel({ model: candidateModel });
                const response = await model.generateContent(contents);

                const candidates = response.response.candidates || [];
                if (candidates.length > 0 && candidates[0].content?.parts) {
                    for (const part of candidates[0].content.parts) {
                        if (part.inlineData?.data) {
                            imageBase64 = part.inlineData.data;
                            break;
                        }
                    }
                }

                if (imageBase64) {
                    console.log(`✓ Prop asset generated successfully with model: ${candidateModel}`);
                    break;
                }
            } catch (error: any) {
                lastError = error;
                console.warn(`[AssetGenerator] Model ${candidateModel} failed: ${error.message || error}. Trying fallback...`);
            }
        }

        if (!imageBase64) {
            throw new Error(`[AssetGenerator] Vision Model returned no image data for prop "${assetName}". Last error: ${lastError?.message || 'Unknown'}`);
        }

        let imageUrl: string | undefined = undefined;

        // Upload to storage bucket and log to order_dna if orderId is provided
        if (orderId && imageBase64.length > 100) {
            try {
                const cleanB64 = imageBase64.includes('base64,') ? imageBase64.split('base64,')[1] : imageBase64;
                const buffer = Buffer.from(cleanB64, 'base64');
                const safeName = assetName.replace(/[^a-zA-Z0-9_-]/g, '_').substring(0, 30);
                const filename = `${orderId}/Prop_${safeName}_${Date.now()}.jpg`;

                const { error: uploadErr } = await supabase.storage.from('dna-images').upload(filename, buffer, {
                    contentType: 'image/jpeg',
                    upsert: true
                });

                if (!uploadErr) {
                    const { data: publicData } = supabase.storage.from('dna-images').getPublicUrl(filename);
                    imageUrl = publicData.publicUrl;

                    // Log to order_dna table for persistent retrieval
                    await supabase.from('order_dna').insert({
                        order_id: orderId,
                        hero_label: 'Prop Asset',
                        image_type: 'Canonical Asset',
                        image_url: imageUrl
                    });

                    console.log(`[AssetGenerator] Logged Prop Asset for ${orderId} to order_dna (${imageUrl}).`);
                } else {
                    console.warn(`[AssetGenerator] Failed to upload prop asset image:`, uploadErr);
                }
            } catch (err: any) {
                console.warn(`[AssetGenerator] Error logging prop asset to order_dna:`, err.message);
            }
        }

        return {
            imageBase64,
            imageUrl,
            prompt: promptText,
            assetName
        };
    }, 2, 5000);
}
