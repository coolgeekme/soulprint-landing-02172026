import { checkHealth, streamChatCompletion as localStreamChatCompletion, chatCompletion as localChatCompletion, ChatMessage as LocalMessage } from './local-client';
import { gemini, DEFAULT_MODEL } from '@/lib/gemini/client';

export async function unifiedChatCompletion(messages: LocalMessage[], options: { model?: string } = {}) {
    // 1. Check Local AI Availability
    let isLocalUp = false;
    try {
        isLocalUp = await checkHealth();
    } catch (e) {
        console.warn('⚠️ Local AI health check failed:', e);
    }

    if (isLocalUp) {
        try {
            console.log('🚀 Using Local LLM (Hermes 3)');
            return await localChatCompletion(messages);
        } catch (error) {
            console.error('❌ Local LLM failed, falling back to Gemini:', error);
        }
    }

    // 2. Fallback to Gemini
    console.log('☁️ Using Gemini 2.0 Flash Fallback');

    // Extract system prompt if present
    const systemMsg = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');

    // Convert to Gemini format
    const contents = userMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
    }));

    try {
        const response = await gemini.models.generateContent({
            model: DEFAULT_MODEL,
            contents,
            config: systemMsg ? { systemInstruction: systemMsg.content } : undefined
        });

        const text = response.candidates?.[0]?.content?.parts?.[0]?.text;
        if (!text) {
            throw new Error('Empty response from Gemini');
        }
        return text;
    } catch (geminiError: any) {
        console.error('❌ Gemini Fallback also failed:', geminiError);
        throw new Error(`Unified LLM failed: ${geminiError.message || 'Unknown error'}`);
    }
}

export async function* unifiedStreamChatCompletion(messages: LocalMessage[], options: { model?: string } = {}) {
    // 1. Check Local AI Availability
    let isLocalUp = false;
    try {
        isLocalUp = await checkHealth();
    } catch (e) {
        console.warn('⚠️ Local AI health check failed:', e);
    }

    if (isLocalUp) {
        try {
            console.log('🚀 Streaming via Local LLM (Hermes 3)');
            for await (const chunk of localStreamChatCompletion(messages)) {
                yield chunk;
            }
            return;
        } catch (error) {
            console.error('❌ Local LLM stream failed, falling back to Gemini:', error);
        }
    }

    // 2. Fallback to Gemini
    console.log('☁️ Streaming via Gemini 2.0 Flash Fallback');

    const systemMsg = messages.find(m => m.role === 'system');
    const userMessages = messages.filter(m => m.role !== 'system');
    const contents = userMessages.map(m => ({
        role: m.role === 'assistant' ? 'model' : 'user',
        parts: [{ text: m.content }]
    }));

    try {
        const stream = await gemini.models.generateContentStream({
            model: DEFAULT_MODEL,
            contents,
            config: systemMsg ? { systemInstruction: systemMsg.content } : undefined
        });

        for await (const chunk of stream) {
            const text = chunk.text;
            if (text) yield text;
        }
    } catch (geminiError: any) {
        console.error('❌ Gemini Stream Fallback failed:', geminiError);
        // If everything fails, yield an error message instead of crashing the stream silently
        yield `[ERROR: LLM Unavailable. Details: ${geminiError.message || 'Unknown'}]`;
    }
}
