
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

export interface RetryOptions<T> {
    retries?: number;
    delayMs?: number;
    maxDelayMs?: number;
    rateLimitDelayMs?: number;
    fallbackValue?: T;
}

export async function withRetry<T>(
    operation: () => Promise<T>,
    retriesOrOptions: number | RetryOptions<T> = 5,
    delayMs = 3000,
    fallbackValue?: T
): Promise<T> {
    const options: RetryOptions<T> = typeof retriesOrOptions === 'object'
        ? retriesOrOptions
        : { retries: retriesOrOptions, delayMs, fallbackValue };

    const retries = options.retries ?? 5;
    const baseDelay = options.delayMs ?? 3000;
    const maxDelay = options.maxDelayMs ?? 45000;
    const rateLimitDelay = options.rateLimitDelayMs ?? 30000;
    const fallback = options.fallbackValue;

    try {
        return await operation();
    } catch (error: any) {
        if (retries > 0) {
            const errorMessage = (error?.message || "").toLowerCase();
            const isRateLimit = errorMessage.includes('429') || 
                               errorMessage.includes('too many requests') || 
                               errorMessage.includes('quota exceeded') || 
                               error?.status === 429;

            let actualDelay: number;
            if (isRateLimit) {
                const jitter = Math.floor(Math.random() * 3000); // 0-3s jitter
                actualDelay = Math.min(rateLimitDelay + jitter, maxDelay);
                console.warn(`[429 RATE LIMIT] Quota exceeded. Waiting ${actualDelay}ms before retry...`);
            } else {
                actualDelay = Math.min(baseDelay * 2, maxDelay); // Exponential backoff for other errors
            }

            console.warn(`Operation failed, retrying... (${retries} attempts left). Delaying for ${actualDelay}ms. Error: ${error.message || error}`);

            await new Promise(resolve => setTimeout(resolve, actualDelay));

            return withRetry(operation, {
                ...options,
                retries: retries - 1,
                delayMs: actualDelay
            });
        } else {
            console.error("Operation failed after max retries:", error);
            if (fallback !== undefined) return fallback;
            throw error;
        }
    }
}

