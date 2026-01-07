/**
 * OpenAI Client - Replaces Gemini for all LLM operations
 */

const OPENAI_API_KEY = process.env.OPENAI_API_KEY;

if (!OPENAI_API_KEY) {
    if (process.env.NODE_ENV !== 'production') {
        console.warn('[OpenAI] OPENAI_API_KEY not set - OpenAI features will not work');
    }
}

export const DEFAULT_MODEL = 'gpt-4o';

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface OpenAIConfig {
    temperature?: number;
    maxTokens?: number;
    responseFormat?: 'text' | 'json_object';
}

/**
 * Generate content using OpenAI Chat Completions API
 */
export async function generateContent(
    messages: ChatMessage[],
    config: OpenAIConfig = {}
): Promise<string> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: DEFAULT_MODEL,
            messages,
            temperature: config.temperature ?? 0.7,
            max_tokens: config.maxTokens ?? 4096,
            ...(config.responseFormat === 'json_object' && {
                response_format: { type: 'json_object' }
            })
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(error)}`);
    }

    const data = await response.json();
    return data.choices?.[0]?.message?.content || '';
}

/**
 * Stream content using OpenAI Chat Completions API
 */
export async function* streamContent(
    messages: ChatMessage[],
    config: OpenAIConfig = {}
): AsyncGenerator<string, void, unknown> {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${OPENAI_API_KEY}`
        },
        body: JSON.stringify({
            model: DEFAULT_MODEL,
            messages,
            temperature: config.temperature ?? 0.7,
            max_tokens: config.maxTokens ?? 4096,
            stream: true
        })
    });

    if (!response.ok) {
        const error = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${JSON.stringify(error)}`);
    }

    if (!response.body) {
        throw new Error('No response body from OpenAI');
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
            if (line.startsWith('data: ')) {
                const data = line.slice(6);
                if (data === '[DONE]') return;

                try {
                    const json = JSON.parse(data);
                    const content = json.choices?.[0]?.delta?.content;
                    if (content) {
                        yield content;
                    }
                } catch (e) {
                    // Skip invalid JSON
                }
            }
        }
    }
}

/**
 * Chat completion (simple wrapper)
 */
export async function chatCompletion(
    messages: ChatMessage[],
    config: OpenAIConfig = {}
): Promise<string> {
    return generateContent(messages, config);
}
