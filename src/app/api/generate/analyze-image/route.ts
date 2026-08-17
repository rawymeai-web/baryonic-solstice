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

SUITABILITY CRITERIA:
1. Presence of a Child's Face: The image MUST contain a human child's face. If there is no face, or if the photo is of an object (e.g. a telephone box, car, toy), scenery, animals, or text, you MUST rate the score as "not_usable" immediately.
2. Face Visibility: The face must be fully visible, looking directly forward at the camera.
3. Lighting: The lighting must be soft and even, with no harsh shadows, overexposure, or colored tints on the face.
4. Eyes: Eyes must be open, looking at the camera, and not obscured by sunglasses, hair, or shadows.
5. Occlusions: No hands, toys, pacifiers, food, masks, hats, or hands covering any part of the face (cheeks, nose, mouth, chin, forehead).
6. Quality/Resolution: The photo must be clear, not blurry, and have reasonable resolution (not pixelated). No heavy filters.

OUTPUT RULES:
You MUST return a JSON object with this exact structure:
{
  "score": "not_usable" | "not_good" | "acceptable" | "great",
  "issues": string[], // Choose from: "no_face_detected", "poor_lighting", "blurry_or_low_res", "occluded_face", "eyes_closed", "not_front_facing", "extreme_expression", "heavy_filter"
  "feedback_en": "Clear description of the photo quality and action items in English.",
  "feedback_ar": "Clear description of the photo quality and action items in Arabic."
}

SCORING CRITERIA:
- "great": Perfect lighting, front-facing, high resolution, no occlusion, eyes wide open.
- "acceptable": Good enough to map identity. Maybe minor shadow or slight angle, but face is 100% visible and eyes open.
- "not_good": Low resolution, strong shadows, or slightly obscured. Not recommended.
- "not_usable": No child's face detected, non-human subject, objects, scenery, eyes closed, face covered, side profile only, extremely blurry, or heavy filter. Will fail generation.`;

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
