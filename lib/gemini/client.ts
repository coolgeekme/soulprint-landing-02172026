import { GoogleGenAI } from '@google/genai';

// Gemini client singleton
const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.warn('[Gemini] GEMINI_API_KEY not set - Gemini features will not work');
}

export const gemini = new GoogleGenAI({ apiKey: apiKey || '' });

// Default model for generation tasks
export const DEFAULT_MODEL = 'gemini-flash-latest';

// Re-export for convenience
export { GoogleGenAI };
