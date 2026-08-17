import { NextRequest, NextResponse } from 'next/server';
import { ai, withRetry } from '@/services/generation/modelGateway';
import { checkRateLimit, logRequest } from '@/utils/rateLimiter';

export const maxDuration = 300;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { imageBase64, email } = body;

    if (!imageBase64) {
      return NextResponse.json({ error: 'Missing imageBase64' }, { status: 400 });
    }

    // 1. IP and Email Rate Limiter Check
    const ip = req.headers.get('x-forwarded-for') || req.headers.get('x-real-ip') || '127.0.0.1';
    const clientEmail = email || null;
    const rateCheck = await checkRateLimit(ip, clientEmail, 15, 1);
    if (!rateCheck.allowed) {
      return NextResponse.json({ 
        error: "Rate limit exceeded. Maximum 15 photo scans per hour allowed. Please try again later.",
        remaining: 0,
        resetTime: rateCheck.resetTime.toISOString()
      }, { status: 429 });
    }

    // Call Gemini multimodal analysis
    const result = await withRetry(async () => {
      const model = ai().getGenerativeModel({
        model: 'gemini-2.5-flash',
        generationConfig: { responseMimeType: 'application/json' }
      });

      const prompt = `ROLE: Professional portrait photographer and AI image processing validator.

TASK:
Analyze the uploaded photo of a child and determine if it is suitable to serve as the authoritative facial DNA mapping reference to generate custom storybook illustrations.

PERMISSIVENESS MANDATE:
Be EXTREMELY lenient, permissive, and forgiving. This is a consumer app, and users will upload typical home photos taken on mobile cameras. Do NOT be strict or pedantic.
- You MUST rate the photo as "great" or "acceptable" in almost all normal face photo cases.
- If the lighting is average, if there are normal shadows, if the child has a slight smile or is looking slightly off-camera, or has hair over their forehead, rate it as "great" or "acceptable".
- ONLY score a photo as "not_usable" if it is absolutely IMPOSSIBLE to use (e.g. it does not contain a child/human's face at all, it's an object like a telephone box, toy, scenery, animal, text, or a completely black/corrupt image).
- Do not use "not_good" at all. Standardize on "great", "acceptable", or "not_usable".

SUITABILITY CRITERIA:
1. Presence of a Child's Face: The image MUST contain a human face. If there is no face, or if the photo is of an object (e.g. a telephone box, car, toy), scenery, animals, or text, you MUST rate the score as "not_usable" immediately.
2. Visibility: The face should be mostly visible and not completely covered by hands, toys, pacifiers, masks, or extreme blur.

OUTPUT RULES:
You MUST return a JSON object with this exact structure:
{
  "score": "not_usable" | "acceptable" | "great",
  "issues": string[], // Choose from: "no_face_detected", "extremely_blurry", "occluded_face"
  "feedback_en": "A warm, helpful quality check comment in English.",
  "feedback_ar": "A warm, helpful quality check comment in Arabic."
}

SCORING CRITERIA:
- "great": Normal child face photo with decent lighting, eyes open, and clear features.
- "acceptable": Normal child photo that may have room shadows, average resolution, minor angle, or slight occlusion but face is still clearly visible.
- "not_usable": No child's face detected, non-human subject, scenery, completely blurry, face completely hidden, or corrupt image. Will fail generation.`;

      const response = await model.generateContent([
        { inlineData: { mimeType: 'image/jpeg', data: imageBase64 } },
        { text: prompt }
      ]);

      const text = response.response.text();
      return JSON.parse(text.replace(/```json/g, '').replace(/```/g, '').trim());
    });

    await logRequest(ip, clientEmail);
    return NextResponse.json(result);

  } catch (error: any) {
    console.error("Image Analysis API Error:", error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
