/**
 * Mem0-Enhanced Chat API
 * Uses Mem0 for automatic memory recall and capture
 */

import { NextRequest } from 'next/server';
import { createServerClient } from '@supabase/ssr';
import { cookies } from 'next/headers';
import { streamText, convertToModelMessages, UIMessage } from 'ai';
import { openai } from '@ai-sdk/openai';
import { anthropic } from '@ai-sdk/anthropic';
import { Mem0Client } from '@/lib/mem0';

export const maxDuration = 60;
export const dynamic = 'force-dynamic';

interface ChatMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface ChatRequest {
  messages: ChatMessage[];
  model?: string;
  systemPrompt?: string;
}

/**
 * Build system prompt with memory context
 */
function buildSystemPrompt(
  basePrompt: string,
  memories: Array<{ memory: string; score?: number }>,
  aiName?: string
): string {
  const name = aiName || 'SoulPrint';
  
  let prompt = basePrompt || `You are ${name}, a personalized AI assistant with memory of past conversations. 
You remember details about the user from previous interactions and use this knowledge to provide helpful, contextual responses.
Be warm, helpful, and reference past conversations when relevant.`;

  if (memories.length > 0) {
    const memoryContext = memories
      .map((m, i) => `${i + 1}. ${m.memory}`)
      .join('\n');
    
    prompt += `\n\n## Relevant Memories from Past Conversations\n${memoryContext}\n\nUse these memories to personalize your response when relevant.`;
  }

  return prompt;
}

/**
 * Extract text content from a message
 */
function getMessageText(message: ChatMessage): string {
  return message.content || '';
}

/**
 * POST /api/chat/mem0
 * Memory-enhanced chat with streaming
 */
export async function POST(request: NextRequest) {
  try {
    // Auth check
    const cookieStore = await cookies();
    const supabase = createServerClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
      {
        cookies: {
          get(name: string) {
            return cookieStore.get(name)?.value;
          },
        },
      }
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return new Response('Unauthorized', { status: 401 });
    }

    // Parse request
    const body: ChatRequest = await request.json();
    const { messages, model = 'gpt-4o-mini', systemPrompt } = body;

    if (!messages || !Array.isArray(messages)) {
      return new Response('messages array required', { status: 400 });
    }

    // Get the latest user message for memory search
    const latestUserMessage = [...messages]
      .reverse()
      .find(m => m.role === 'user');

    // Fetch relevant memories from Mem0
    let memories: Array<{ memory: string; score?: number }> = [];
    
    const mem0ApiKey = process.env.MEM0_API_KEY;
    if (mem0ApiKey && latestUserMessage) {
      try {
        const client = new Mem0Client({
          mode: 'cloud',
          apiKey: mem0ApiKey,
        });

        const userContent = getMessageText(latestUserMessage);

        const searchResult = await client.search(
          userContent,
          {
            userId: user.id,
            limit: 5,
            threshold: 0.3,
          }
        );

        memories = searchResult.results || [];
        console.log(`[Mem0 Chat] Found ${memories.length} relevant memories`);
      } catch (memError) {
        console.error('[Mem0 Chat] Memory search failed:', memError);
        // Continue without memories
      }
    }

    // Get user's AI name from profile
    const { data: profile } = await supabase
      .from('user_profiles')
      .select('ai_name')
      .eq('user_id', user.id)
      .single();

    // Build system prompt with memories
    const enhancedSystemPrompt = buildSystemPrompt(
      systemPrompt || '',
      memories,
      profile?.ai_name
    );

    // Select model provider
    let aiModel;
    if (model.startsWith('claude') || model.startsWith('anthropic')) {
      const modelId = model.includes('/') ? model.split('/')[1] : model;
      aiModel = anthropic(modelId as any);
    } else {
      const modelId = model.includes('/') ? model.split('/')[1] : model;
      aiModel = openai(modelId as any);
    }

    // Convert messages to core format for AI SDK
    const coreMessages = messages.map(m => ({
      role: m.role as 'user' | 'assistant' | 'system',
      content: m.content,
    }));

    // Stream the response
    const result = streamText({
      model: aiModel,
      system: enhancedSystemPrompt,
      messages: coreMessages,
      async onFinish({ text }) {
        // Auto-capture: Store the conversation exchange to Mem0
        if (mem0ApiKey && latestUserMessage) {
          try {
            const client = new Mem0Client({
              mode: 'cloud',
              apiKey: mem0ApiKey,
            });

            const userContent = getMessageText(latestUserMessage);

            await client.add(
              [
                { role: 'user', content: userContent },
                { role: 'assistant', content: text },
              ],
              {
                userId: user.id,
                metadata: {
                  source: 'soulprint-chat',
                  capturedAt: new Date().toISOString(),
                },
              }
            );
            console.log('[Mem0 Chat] Auto-captured conversation exchange');
          } catch (captureError) {
            console.error('[Mem0 Chat] Auto-capture failed:', captureError);
          }
        }
      },
    });

    return result.toTextStreamResponse();

  } catch (error) {
    console.error('[Mem0 Chat] Error:', error);
    return new Response(
      error instanceof Error ? error.message : 'Chat failed',
      { status: 500 }
    );
  }
}
