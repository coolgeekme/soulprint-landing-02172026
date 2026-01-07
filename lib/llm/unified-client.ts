import { checkHealth, streamChatCompletion as localStreamChatCompletion, chatCompletion as localChatCompletion, ChatMessage as LocalMessage } from './local-client';
import { generateContent, streamContent, ChatMessage } from '@/lib/openai/client';

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
            console.error('❌ Local LLM failed, falling back to OpenAI:', error);
        }
    }

    // 2. Fallback to OpenAI GPT-4o
    console.log('☁️ Using OpenAI GPT-4o Fallback');

    // Convert to OpenAI format
    const openaiMessages: ChatMessage[] = messages.map(m => ({
        role: m.role,
        content: m.content
    }));

    try {
        const response = await generateContent(openaiMessages, { temperature: 0.7 });

        if (!response) {
            throw new Error('Empty response from OpenAI');
        }
        return response;
    } catch (openaiError: any) {
        console.error('❌ OpenAI Fallback also failed:', openaiError);
        throw new Error(`Unified LLM failed: ${openaiError.message || 'Unknown error'}`);
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
            console.error('❌ Local LLM stream failed, falling back to OpenAI:', error);
        }
    }

    // 2. Fallback to OpenAI GPT-4o
    console.log('☁️ Streaming via OpenAI GPT-4o Fallback');

    const openaiMessages: ChatMessage[] = messages.map(m => ({
        role: m.role,
        content: m.content
    }));

    try {
        for await (const chunk of streamContent(openaiMessages, { temperature: 0.7 })) {
            yield chunk;
        }
    } catch (openaiError: any) {
        console.error('❌ OpenAI Stream Fallback failed:', openaiError);
        yield `[ERROR: LLM Unavailable. Details: ${openaiError.message || 'Unknown'}]`;
    }
}
