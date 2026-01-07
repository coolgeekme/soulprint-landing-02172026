// OpenAI Service Layer exports (replaces Gemini)
export { DEFAULT_MODEL, generateContent, streamContent, chatCompletion } from './client';
export type { ChatMessage, OpenAIConfig } from './client';

// Re-export types from gemini/types for backward compatibility
export type {
    QuestionnaireAnswers,
    SoulPrintData,
    SoulPrintPillar,
} from '@/lib/gemini/types';

// Re-export generator
export { generateSoulPrint, soulPrintToDocument } from './soulprint-generator';
