import { bedrock } from "@ai-sdk/amazon-bedrock";
import { streamText, convertToModelMessages, UIMessage, isTextUIPart } from "ai";
import { createClient } from "@/lib/supabase/server";
import { queryMemory, formatMemoriesForPrompt } from "@/lib/memory-service/query";

export const maxDuration = 60;

const BASE_SYSTEM_PROMPT = `You are SoulPrint, a helpful AI companion. Be friendly, warm, and conversational.

Your personality:
- Curious and thoughtful
- Supportive but honest
- Concise but thorough when needed
- You remember context from the conversation`;

// Helper to extract text content from UIMessage
function getMessageText(message: UIMessage): string | null {
  for (const part of message.parts) {
    if (isTextUIPart(part)) {
      return part.text;
    }
  }
  return null;
}

export async function POST(req: Request) {
  const { messages }: { messages: UIMessage[] } = await req.json();

  // Get user if authenticated
  let userId: string | null = null;
  let enhancedSystemPrompt = BASE_SYSTEM_PROMPT;
  
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    userId = user?.id || null;
    
    // If user is authenticated, try to enhance with memory
    if (userId) {
      const lastUserMessage = messages
        .filter((m): m is UIMessage & { role: 'user' } => m.role === 'user')
        .pop();
      
      const lastUserText = lastUserMessage ? getMessageText(lastUserMessage) : null;
      
      if (lastUserText) {
        try {
          const memoryResponse = await queryMemory(userId, lastUserText);
          
          if (memoryResponse.success && memoryResponse.relevant_memories.length > 0) {
            const memoryBlock = formatMemoriesForPrompt(memoryResponse);
            enhancedSystemPrompt = BASE_SYSTEM_PROMPT + "\n" + memoryBlock;
            console.log(`[Chat] Enhanced with ${memoryResponse.relevant_memories.length} memories`);
          }
        } catch (e) {
          console.warn("[Chat] Memory enhancement failed:", e);
          // Continue without memory enhancement
        }
      }
      
      // Check for user's soulprint data
      const { data: soulprint } = await supabase
        .from('soulprints')
        .select('soulprint_data')
        .eq('user_id', userId)
        .single();
      
      if (soulprint?.soulprint_data) {
        const sp = soulprint.soulprint_data as Record<string, unknown>;
        if (sp.soul_prompt && typeof sp.soul_prompt === 'string') {
          // Use the generated soul prompt if available
          enhancedSystemPrompt = sp.soul_prompt + "\n\n" + enhancedSystemPrompt;
        } else if (sp.archetype || sp.traits) {
          // Build from components
          const traits = Array.isArray(sp.traits) ? sp.traits.join(', ') : '';
          enhancedSystemPrompt = `You embody the "${sp.archetype || 'Companion'}" archetype.
Traits: ${traits}
Communication style: ${sp.communication_style || 'Warm and conversational'}

${enhancedSystemPrompt}`;
        }
      }
    }
  } catch (e) {
    console.warn("[Chat] Auth/enhancement failed, using base prompt:", e);
  }

  const result = streamText({
    model: bedrock(process.env.BEDROCK_MODEL_ID || "us.anthropic.claude-3-5-haiku-20241022-v1:0"),
    messages: await convertToModelMessages(messages),
    system: enhancedSystemPrompt,
  });

  return result.toUIMessageStreamResponse();
}
