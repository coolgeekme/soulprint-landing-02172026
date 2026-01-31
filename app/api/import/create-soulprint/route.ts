/**
 * Create soulprint via RLM or Bedrock fallback
 * Analyzes conversations to generate personality profile
 */

import { NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import {
  BedrockRuntimeClient,
  ConverseCommand,
  ContentBlock,
} from '@aws-sdk/client-bedrock-runtime';

export const runtime = 'nodejs';
export const maxDuration = 300; // 5 minutes for exhaustive analysis

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: Request) {
  try {
    const supabase = await createClient();
    const { data: { user }, error: authError } = await supabase.auth.getUser();
    
    if (authError || !user) {
      return NextResponse.json({ error: 'Not authenticated' }, { status: 401 });
    }

    const { conversations, stats } = await request.json();

    if (!conversations || !Array.isArray(conversations)) {
      return NextResponse.json({ error: 'Conversations array required' }, { status: 400 });
    }

    const rlmUrl = process.env.RLM_SERVICE_URL;
    
    // Try RLM service first
    if (rlmUrl) {
      try {
        console.log(`[CreateSoulprint] Calling RLM for user ${user.id} with ${conversations.length} conversations`);
        
        const response = await fetch(`${rlmUrl}/create-soulprint`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: user.id,
            conversations,
            stats,
          }),
          signal: AbortSignal.timeout(280000), // 4.5 minutes for exhaustive analysis
        });

        if (response.ok) {
          const data = await response.json();
          console.log(`[CreateSoulprint] RLM success - archetype: ${data.archetype}`);
          return NextResponse.json({
            success: true,
            soulprint: data.soulprint,
            archetype: data.archetype,
            method: 'rlm',
          });
        }
      } catch (rlmError) {
        console.warn('[CreateSoulprint] RLM failed:', rlmError);
      }
    }

    // Fallback: Generate soulprint via Bedrock
    console.log('[CreateSoulprint] Using Bedrock fallback');
    
    try {
      const result = await generateSoulprintViaBedrock(conversations, stats);
      return NextResponse.json({
        success: true,
        soulprint: result.soulprint,
        archetype: result.archetype,
        method: 'bedrock',
      });
    } catch (bedrockError) {
      console.error('[CreateSoulprint] Bedrock fallback failed:', bedrockError);
      
      // Last resort: basic soulprint
      const soulprintText = generateBasicSoulprint(conversations, stats);
      return NextResponse.json({
        success: true,
        soulprint: { soulprintText, stats },
        archetype: 'Unique Individual',
        method: 'basic',
      });
    }

  } catch (error) {
    console.error('[CreateSoulprint] Error:', error);
    return NextResponse.json({ 
      error: error instanceof Error ? error.message : 'Unknown error' 
    }, { status: 500 });
  }
}

async function generateSoulprintViaBedrock(
  conversations: any[],
  stats: any
): Promise<{ soulprint: any; archetype: string }> {
  // Prepare conversation samples for analysis (limit to avoid token overflow)
  const samples = conversations
    .slice(0, 50)
    .map(c => {
      const content = typeof c.messages === 'string' 
        ? c.messages 
        : (c.content || c.messages?.map((m: any) => `${m.role}: ${m.content}`).join('\n') || '');
      return `=== ${c.title || 'Conversation'} ===\n${content.slice(0, 1000)}`;
    })
    .join('\n\n')
    .slice(0, 40000);

  const command = new ConverseCommand({
    modelId: process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
    system: [{
      text: `You are analyzing a user's ChatGPT conversation history to create their personality profile ("SoulPrint").

Based on the conversations provided, write a personality profile (3-4 paragraphs) that describes:
1. Their communication style - casual/formal, concise/verbose, emoji usage, signature phrases
2. How they approach problems and think through challenges
3. Their main interests and topics they engage with
4. Unique traits, patterns, or quirks that make them distinctive

Write in second person ("You..."). Be specific and insightful based on actual patterns you observe. Avoid generic statements.

After the profile, on a new line write exactly:
**Archetype: [2-4 word label]**

Example archetypes: "The Systematic Builder", "The Creative Problem-Solver", "The Curious Explorer", "The Pragmatic Innovator"`
    }],
    messages: [{
      role: 'user',
      content: [{
        text: `Analyze these ${stats?.totalConversations || conversations.length} conversations (${stats?.totalMessages || 'many'} messages) and create the user's SoulPrint:\n\n${samples}`
      }],
    }],
    inferenceConfig: { maxTokens: 1500 },
  });

  const response = await bedrockClient.send(command);
  const textBlock = response.output?.message?.content?.find(
    (block): block is ContentBlock.TextMember => 'text' in block
  );
  
  const fullText = textBlock?.text || '';
  
  // Extract archetype
  const archetypeMatch = fullText.match(/\*\*Archetype:\s*(.+?)\*\*/i);
  const archetype = archetypeMatch?.[1]?.trim() || 'The Unique Individual';
  
  // Clean soulprint text (remove archetype line for cleaner display)
  const soulprintText = fullText.replace(/\*\*Archetype:.*?\*\*/i, '').trim();

  return {
    soulprint: {
      soulprintText,
      stats,
      aiPersona: {
        soulMd: soulprintText,
      },
    },
    archetype,
  };
}

function generateBasicSoulprint(conversations: any[], stats: any): string {
  const topics = new Map<string, number>();
  
  conversations.forEach(c => {
    const title = c.title?.toLowerCase() || '';
    const words = title.split(/\s+/).filter((w: string) => w.length > 4);
    words.forEach((w: string) => topics.set(w, (topics.get(w) || 0) + 1));
  });

  const topTopics = Array.from(topics.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([topic]) => topic);

  return `# Your SoulPrint

## Overview
- Total conversations: ${stats?.totalConversations || conversations.length}
- Total messages: ${stats?.totalMessages || 'Unknown'}
- Active period: ${stats?.activeDays || 'Unknown'} days

## Key Interests
${topTopics.map(t => `- ${t}`).join('\n')}

## Communication Style
Based on your conversation history, you engage deeply with topics and seek thorough understanding.

*This soulprint will evolve as you continue chatting.*`;
}
