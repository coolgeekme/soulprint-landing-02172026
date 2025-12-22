// Gemini Service Layer exports
export { gemini, DEFAULT_MODEL } from './client';
export { generateSoulPrint, soulPrintToDocument } from './soulprint-generator';
export {
    createFileSearchStore,
    deleteFileSearchStore,
    listFileSearchStores,
    uploadToFileSearchStore,
    waitForOperation,
    chatWithFileSearch,
    generateContent
} from './file-search';
export type {
    SoulPrintData,
    SoulPrintPillar,
    QuestionnaireAnswers,
    GenerateSoulPrintRequest,
    FileSearchStore,
    UploadOperation,
    ChatMessage,
    GeminiChatRequest,
    GeminiChatResponse
} from './types';
