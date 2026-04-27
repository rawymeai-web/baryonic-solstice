export const BACKEND_URL = process.env.NEXT_PUBLIC_BACKEND_URL || process.env.VITE_BACKEND_URL || '/api';

/**
 * Interface for backend API responses to maintain consistency
 */
export interface ApiResponse<T> {
    data?: T;
    error?: string;
    logs?: any[];
}

/**
 * Centralized API handler for frontend to backend communication
 */
async function fetchBackend<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const url = `${BACKEND_URL}${endpoint}`;
    
    // Diagnostic Payload Analyzer
    let payloadStr = "";
    if (options.body && typeof options.body === 'string') {
        const payloadBytes = new TextEncoder().encode(options.body).length;
        if (payloadBytes > 1024 * 1024) {
            payloadStr = `[Payload: ${(payloadBytes / (1024 * 1024)).toFixed(2)} MB]`;
        } else {
            payloadStr = `[Payload: ${(payloadBytes / 1024).toFixed(1)} KB]`;
        }
    }
    
    try {
        console.log(`📡 [API] Request => ${options.method || 'GET'} ${url} ${payloadStr}`);
        
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
            },
        });

        if (!response.ok) {
            // Server responded, but with an error status (e.g. 500 or 400)
            const errorText = await response.text();
            let parsedError: any = {};
            try { parsedError = JSON.parse(errorText); } catch(e) {}
            
            const fullMessage = [
                parsedError.error,
                parsedError.details,
                parsedError.hint
            ].filter(Boolean).join(' | ');
            
            throw new Error(`[HTTP ${response.status}] ${fullMessage || errorText || 'Server Error'}`);
        }

        return await response.json();
        
    } catch (networkError: any) {
        // Network-level drops (CORS, 413 abrupt closure, invalid URL)
        if (networkError.name === 'TypeError' || networkError.message === 'Failed to fetch') {
            const extraHint = payloadStr.includes('MB') ? " (POSSIBLE VERCEL 4.5MB PAYLOAD LIMIT REACHED)" : " (POSSIBLE CORS OR TIMEOUT)";
            throw new Error(`Network Connection Dropped => ${url} ${payloadStr}${extraHint}. Verify VITE_BACKEND_URL or Backend Health.`);
        }
        throw networkError;
    }
}

export const backendApi = {
    // Catalog
    getCatalog: () => fetchBackend('/catalog'),

    // Generation
    generateDna: (payload: any) => fetchBackend('/generate/dna', {
        method: 'POST',
        body: JSON.stringify(payload)
    }),

    generateBlueprint: (payload: any) => fetchBackend('/generate/blueprint', {
        method: 'POST',
        body: JSON.stringify(payload)
    }),

    generateStory: (payload: any) => fetchBackend('/generate/story', {
        method: 'POST',
        body: JSON.stringify(payload)
    }),

    generateVisualPlan: (payload: any) => fetchBackend('/generate/plan', {
        method: 'POST',
        body: JSON.stringify(payload)
    }),

    generatePrompts: (payload: any) => fetchBackend('/generate/prompts', {
        method: 'POST',
        body: JSON.stringify(payload)
    }),

    generateSpreadText: (payload: { blueprint: any, language: string, childName: string, spreadIndex: number, currentText: string, age: string }) => fetchBackend<{ text: string }>('/generate/spread-text', {
        method: 'POST',
        body: JSON.stringify(payload)
    }),

    generateImage: (payload: any) => fetchBackend('/generate/image', {
        method: 'POST',
        body: JSON.stringify(payload)
    }),

    editSpreadImage: (payload: { imageBase64: string; editInstruction: string; stylePrompt: string; childDNA?: string; secondDNA?: string }) =>
        fetchBackend<{ imageBase64: string }>('/generate/edit-image', {
            method: 'POST',
            body: JSON.stringify(payload)
        }),


    generatePreview: (payload: { character: any, secondCharacter?: any, themeDescription: string, themeId?: string, stylePrompt: string, age: string }) => fetchBackend<{ imageBase64: string, prompt: string, secondImageBase64?: string, secondPrompt?: string }>('/generate/preview', {
        method: 'POST',
        body: JSON.stringify(payload)
    }),

    generateStyleGuide: (payload: { imageBase64: string, stylePrompt: string }) => fetchBackend<{ guide: string }>('/generate/style-guide', {
        method: 'POST',
        body: JSON.stringify(payload)
    }),

    describeSubject: (payload: { imageBase64: string }) => fetchBackend<{ description: string }>('/generate/describe-subject', {
        method: 'POST',
        body: JSON.stringify(payload)
    }),

    // Drafts / Orders V2
    createDraftOrder: (payload: { storyData: any, customerEmail?: string, userId?: string, customerName?: string, total?: number }) => fetchBackend<{ success: boolean; orderId: string; message: string }>('/orders/draft', {
        method: 'POST',
        body: JSON.stringify(payload)
    }),

    updateDraftOrder: (payload: { orderId: string, storyData?: any, stepProgress?: number, status?: string, shippingDetails?: any }) => fetchBackend<{ success: boolean; message: string }>('/orders/draft', {
        method: 'PUT',
        body: JSON.stringify(payload)
    }),

    // Admin Tools
    triggerCron: () => fetchBackend<{ executedTasks: number; failedTasks: number }>('/cron', {
        method: 'GET'
    })
};
