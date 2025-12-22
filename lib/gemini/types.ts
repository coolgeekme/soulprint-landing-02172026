// SoulPrint types based on the SoulPrint Framework

export interface SoulPrintPillar {
    summary: string;
    markers: string[];
    ai_instruction: string;
}

export interface SoulPrintData {
    soulprint_version: string;
    generated_at: string;
    identity_signature: string;
    archetype: string;
    pillars: {
        communication_style: SoulPrintPillar & { voice_markers: string[] };
        emotional_alignment: SoulPrintPillar & { emotional_markers: string[] };
        decision_making: SoulPrintPillar & { decision_markers: string[] };
        social_cultural: SoulPrintPillar & { identity_markers: string[] };
        cognitive_processing: SoulPrintPillar & { processing_markers: string[] };
        assertiveness_conflict: SoulPrintPillar & { conflict_markers: string[] };
    };
    flinch_warnings: string[];
    full_system_prompt: string;
}

export interface QuestionnaireAnswers {
    // Sliders (s1-s18): 0-100 values
    s1: number; s2: number; s3: number; s4: number; s5: number; s6: number;
    s7: number; s8: number; s9: number; s10: number; s11: number; s12: number;
    s13: number; s14: number; s15: number; s16: number; s17: number; s18: number;
    // Text questions (q1-q18)
    q1: string; q2: string; q3: string; q4: string; q5: string; q6: string;
    q7: string; q8: string; q9: string; q10: string; q11: string; q12: string;
    q13: string; q14: string; q15: string; q16: string; q17: string; q18: string;
}

export interface GenerateSoulPrintRequest {
    user_id: string;
    answers: QuestionnaireAnswers;
}

export interface FileSearchStore {
    name: string;
    displayName: string;
}

export interface UploadOperation {
    name: string;
    done: boolean;
    error?: { message: string };
}

export interface ChatMessage {
    role: 'user' | 'assistant' | 'system';
    content: string;
}

export interface GeminiChatRequest {
    messages: ChatMessage[];
    storeId?: string;
    systemPrompt?: string;
}

export interface GeminiChatResponse {
    text: string;
    citations?: Array<{
        source: string;
        content: string;
    }>;
}
