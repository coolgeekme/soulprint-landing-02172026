import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@supabase/supabase-js';
import { createHash } from 'crypto';
import { chatWithFileSearch } from '@/lib/gemini';
import type { ChatMessage } from '@/lib/gemini';

// Supabase admin client
const supabaseAdmin = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY! || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(request: NextRequest) {
    try {
        // 1. Extract API Key (same pattern as existing chat endpoint)
        const authHeader = request.headers.get('authorization');
        if (!authHeader || !authHeader.startsWith('Bearer sk-soulprint-')) {
            return NextResponse.json(
                { error: 'Missing or invalid API key' },
                { status: 401 }
            );
        }

        const rawKey = authHeader.replace('Bearer ', '');
        const hashedKey = createHash('sha256').update(rawKey).digest('hex');

        console.log('🔑 Validating API key for Gemini chat...');

        // 2. Validate Key
        let keyData: { user_id: string } | null = null;

        // Check for demo fallback key
        if (rawKey === 'sk-soulprint-demo-fallback-123456') {
            keyData = { user_id: '4316c8f3-a383-4260-8cbc-daadea2ad142' };
            console.log('🎭 Demo mode activated');
        } else {
            const { data, error } = await supabaseAdmin
                .from('api_keys')
                .select('user_id')
                .eq('key_hash', hashedKey)
                .single();

            if (error || !data) {
                return NextResponse.json(
                    { error: 'Invalid API key' },
                    { status: 401 }
                );
            }
            keyData = data;
        }

        console.log('✅ API key valid for user:', keyData.user_id);

        // 3. Parse request body
        const body = await request.json();
        const { messages } = body as { messages: ChatMessage[] };

        if (!messages || !Array.isArray(messages) || messages.length === 0) {
            return NextResponse.json(
                { error: 'messages array is required' },
                { status: 400 }
            );
        }

        // 4. Get user's SoulPrint for system prompt
        const { data: soulprint } = await supabaseAdmin
            .from('soulprints')
            .select('soulprint_data')
            .eq('user_id', keyData.user_id)
            .single();

        let systemPrompt = 'You are a helpful AI assistant.';

        if (soulprint?.soulprint_data) {
            let soulprintObj = soulprint.soulprint_data;
            if (typeof soulprintObj === 'string') {
                try {
                    soulprintObj = JSON.parse(soulprintObj);
                } catch {
                    // Keep as-is if parsing fails
                }
            }

            // Use full_system_prompt if available
            if (soulprintObj?.full_system_prompt) {
                systemPrompt = soulprintObj.full_system_prompt;
                console.log('📋 Using SoulPrint system prompt');
            }
        }

        // 5. Get user's File Search Store
        const { data: storeData } = await supabaseAdmin
            .from('gemini_file_stores')
            .select('store_name')
            .eq('user_id', keyData.user_id)
            .single();

        const storeNames = storeData?.store_name ? [storeData.store_name] : [];

        if (storeNames.length > 0) {
            console.log('📚 Using File Search Store:', storeNames[0]);
        } else {
            console.log('⚠️ No File Search Store found for user');
        }

        // 6. Call Gemini with File Search
        const response = await chatWithFileSearch(messages, storeNames, systemPrompt);

        console.log('✅ Gemini response received');

        // 7. Return response in OpenAI-compatible format
        return NextResponse.json({
            id: `chatcmpl-${Date.now()}`,
            object: 'chat.completion',
            created: Math.floor(Date.now() / 1000),
            model: 'gemini-2.5-flash',
            choices: [
                {
                    index: 0,
                    message: {
                        role: 'assistant',
                        content: response.text
                    },
                    finish_reason: 'stop'
                }
            ],
            // Include citations if available
            citations: response.citations,
            usage: {
                prompt_tokens: 0, // Gemini doesn't provide these in this format
                completion_tokens: 0,
                total_tokens: 0
            }
        });

    } catch (error) {
        console.error('Gemini chat error:', error);
        return NextResponse.json(
            {
                error: 'Failed to generate response',
                details: error instanceof Error ? error.message : String(error)
            },
            { status: 500 }
        );
    }
}
