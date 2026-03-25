
import { GoogleGenerativeAI } from "@google/generative-ai";

// Initialize Gemini Client
export const ai = () => {
    const key = process.env.GEMINI_API_KEY || '';
    if (!key) console.warn("WARNING: GEMINI_API_KEY is empty in modelGateway");
    return new GoogleGenerativeAI(key);
};

/**
 * Helper to clean JSON strings from Markdown code blocks
 */
export const cleanJsonString = (str: string): string => {
    if (!str) return "{}";
    return str.replace(/```json/g, '').replace(/```/g, '').trim();
};

export async function withRetry<T>(
    operation: () => Promise<T>,
    retries = 5,
    delayMs = 3000,
    fallbackValue?: T
): Promise<T> {
    try {
        return await operation();
    } catch (error: any) {
        if (retries > 0) {
            const errorMessage = (error?.message || "").toLowerCase();
            const isRateLimit = errorMessage.includes('429') || 
                               errorMessage.includes('too many requests') || 
                               errorMessage.includes('quota exceeded') || 
                               error?.status === 429;

            // Use a much larger delay for rate limits (20-30s + jitter)
            let actualDelay = delayMs;
            if (isRateLimit) {
                const jitter = Math.floor(Math.random() * 10000); // 0-10s jitter
                actualDelay = 30000 + jitter; 
                console.warn(`[429 RATE LIMIT] Quota exceeded. Waiting ${actualDelay}ms before retry...`);
            } else {
                actualDelay = delayMs * 2; // Exponential backoff for other errors
            }

            console.warn(`Operation failed, retrying... (${retries} attempts left). Delaying for ${actualDelay}ms. Error: ${error.message || error}`);

            await new Promise(resolve => setTimeout(resolve, actualDelay));

            return withRetry(operation, retries - 1, actualDelay, fallbackValue);
        } else {
            console.error("Operation failed after max retries:", error);
            if (fallbackValue !== undefined) return fallbackValue;
            throw error;
        }
    }
}
