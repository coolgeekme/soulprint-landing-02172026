/**
 * Analyze user's chat history and generate a SoulPrint (SOUL.md style profile)
 */

import { createClient } from '@supabase/supabase-js';
import { invokeBedrockModel } from '@/lib/aws/bedrock';

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

const ANALYSIS_PROMPT = `You are an expert at understanding people through their conversations. Analyze the following chat history and create a detailed personality profile.

CHAT HISTORY:
{history}

---

Based on this conversation history, create a personality profile in this exact format:

## Communication Style
- How do they typically write? (formal/casual, long/short messages, emoji usage)
- What's their tone? (serious, playful, direct, thoughtful)
- How do they ask questions?
- How do they respond to information?

## Personality Traits
- List 5-7 key personality traits you observe
- Are they analytical or intuitive?
- Introverted or extroverted tendencies?
- How do they handle problems?

## Interests & Topics
- What subjects do they frequently discuss?
- What are they passionate about?
- What do they spend time thinking about?

## Values & Preferences
- What seems important to them?
- What do they care about?
- Any preferences in how they like information presented?

## How to Talk to Them
- What communication approach works best?
- What should be avoided?
- How detailed should responses be?

---

Now, write a concise system prompt (2-3 paragraphs) that an AI assistant should use to communicate with this person effectively. This should be written in second person ("You are talking to someone who...") and capture the essence of how to best serve this user.

Return your response as JSON:
{
  "communication_style": "brief summary",
  "personality_traits": ["trait1", "trait2", ...],
  "interests": ["interest1", "interest2", ...],
  "values": ["value1", "value2", ...],
  "soul_prompt": "The full system prompt for the AI to use"
}

Return ONLY valid JSON.`;

export async function analyzeChatHistory(userId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    console.log(`[Analyze] Starting analysis for user ${userId}`);

    // Get user's imported chat history
    const { data: chats, error: chatError } = await supabaseAdmin
      .from('imported_chats')
      .select('role, content, conversation_title')
      .eq('user_id', userId)
      .order('original_timestamp', { ascending: true })
      .limit(500); // Analyze up to 500 messages

    if (chatError) {
      throw new Error(`Failed to fetch chats: ${chatError.message}`);
    }

    if (!chats || chats.length < 10) {
      console.log(`[Analyze] Not enough messages (${chats?.length || 0}), skipping analysis`);
      return { success: true }; // Not an error, just not enough data
    }

    // Format history for analysis
    let history = '';
    let currentConvo = '';
    for (const chat of chats) {
      if (chat.conversation_title !== currentConvo) {
        if (currentConvo) history += '\n---\n';
        currentConvo = chat.conversation_title || 'Untitled';
        history += `\n[${currentConvo}]\n`;
      }
      const role = chat.role === 'user' ? 'User' : 'Assistant';
      history += `${role}: ${chat.content}\n`;
    }

    // Truncate if too long (keep under 30k chars for context)
    if (history.length > 30000) {
      history = history.substring(0, 30000) + '\n[...truncated...]';
    }

    console.log(`[Analyze] Analyzing ${chats.length} messages...`);

    // Call Claude to analyze
    const prompt = ANALYSIS_PROMPT.replace('{history}', history);
    const response = await invokeBedrockModel([
      { role: 'user', content: prompt }
    ]);

    // Parse the JSON response
    let analysis;
    try {
      const jsonStart = response.indexOf('{');
      const jsonEnd = response.lastIndexOf('}') + 1;
      if (jsonStart >= 0 && jsonEnd > jsonStart) {
        analysis = JSON.parse(response.substring(jsonStart, jsonEnd));
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      console.error('[Analyze] Failed to parse response:', parseError);
      // Create a basic profile from the raw response
      analysis = {
        soul_prompt: response.substring(0, 2000),
        communication_style: 'conversational',
        personality_traits: [],
        interests: [],
        values: [],
      };
    }

    // Save to soulprints table
    const { error: upsertError } = await supabaseAdmin
      .from('soulprints')
      .upsert({
        user_id: userId,
        soulprint_data: {
          ...analysis,
          analyzed_at: new Date().toISOString(),
          message_count: chats.length,
        },
      }, {
        onConflict: 'user_id',
      });

    if (upsertError) {
      throw new Error(`Failed to save soulprint: ${upsertError.message}`);
    }

    console.log(`[Analyze] Successfully created SoulPrint for user ${userId}`);
    return { success: true };

  } catch (error) {
    console.error('[Analyze] Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
