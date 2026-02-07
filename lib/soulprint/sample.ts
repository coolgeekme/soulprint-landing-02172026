/**
 * Conversation Sampling for Quick Pass Pipeline
 *
 * Selects the richest conversations from a user's ChatGPT export
 * and formats them as readable text for Haiku 4.5 analysis.
 */

import { createLogger } from '@/lib/logger/index';
import type { ParsedConversation } from '@/lib/soulprint/types';

const log = createLogger('Soulprint:Sample');

const MIN_MESSAGES = 4;
const DEFAULT_TARGET_TOKENS = 50000;
const HARD_CAP = 50;
const MIN_SELECTED = 5;
const CHARS_PER_TOKEN = 4;
const MAX_MESSAGE_LENGTH = 2000;

interface ScoredConversation {
  conv: ParsedConversation;
  score: number;
  chars: number;
}

/**
 * Sample the richest conversations from a parsed ChatGPT export.
 *
 * Scoring algorithm:
 * - Message count * 10 (prefer multi-turn conversations)
 * - Sum of user message lengths capped at 500 chars each (prefer substantive messages)
 * - Min(user, assistant) count * 20 (prefer balanced conversations)
 * - Slight recency bonus from createdAt timestamp
 *
 * Filters out conversations with fewer than 4 messages.
 * Selects conversations until the token budget is met.
 * Forces at least 5 conversations if available (even if over budget).
 * Hard-capped at 50 conversations.
 *
 * @param conversations - Parsed conversation array from ChatGPT export
 * @param targetTokens  - Approximate token budget (default 50,000)
 * @returns Subset of conversations ranked by richness within token budget
 */
export function sampleConversations(
  conversations: ParsedConversation[],
  targetTokens: number = DEFAULT_TARGET_TOKENS,
): ParsedConversation[] {
  // Filter out short conversations
  const eligible = conversations.filter((c) => c.messages.length >= MIN_MESSAGES);

  log.info(
    { total: conversations.length, eligible: eligible.length, minMessages: MIN_MESSAGES },
    'Filtering conversations by message count',
  );

  if (eligible.length === 0) {
    log.warn('No conversations with enough messages, returning all conversations');
    return conversations.slice(0, HARD_CAP);
  }

  // Score each conversation
  const scored: ScoredConversation[] = eligible.map((conv) => {
    const totalChars = conv.messages.reduce((sum, m) => sum + m.content.length, 0);
    const userMessages = conv.messages.filter((m) => m.role === 'user');
    const assistantMessages = conv.messages.filter((m) => m.role === 'assistant');

    const score =
      // Prefer conversations with many messages (back-and-forth)
      conv.messages.length * 10 +
      // Prefer conversations with substantial user messages (capped at 500 chars each)
      userMessages.reduce((sum, m) => sum + Math.min(m.content.length, 500), 0) +
      // Prefer balanced conversations (both user and assistant)
      Math.min(userMessages.length, assistantMessages.length) * 20 +
      // Slight recency bonus
      new Date(conv.createdAt).getTime() / 1e12;

    return { conv, score, chars: totalChars };
  });

  // Sort by score descending
  scored.sort((a, b) => b.score - a.score);

  // Select conversations within token budget
  const targetChars = targetTokens * CHARS_PER_TOKEN;
  const selected: ParsedConversation[] = [];
  let totalChars = 0;

  for (const { conv, chars } of scored) {
    if (totalChars + chars > targetChars) {
      // Force-include up to MIN_SELECTED even if over budget
      if (selected.length < MIN_SELECTED) {
        selected.push(conv);
        totalChars += chars;
        continue;
      }
      // Over budget and have enough -- skip remaining
      continue;
    }

    selected.push(conv);
    totalChars += chars;

    if (selected.length >= HARD_CAP) break;
  }

  log.info(
    {
      selected: selected.length,
      totalChars,
      targetChars,
      topScore: scored[0]?.score ?? 0,
    },
    'Conversations sampled',
  );

  return selected;
}

/**
 * Format sampled conversations as human-readable text for the LLM prompt.
 *
 * Output format:
 * ```
 * === Conversation: "Title Here" (YYYY-MM-DD) ===
 * User: message content
 * Assistant: response content
 * ```
 *
 * Messages longer than 2000 characters are truncated with "... [truncated]".
 *
 * @param conversations - Sampled conversations to format
 * @returns Formatted text block suitable for inclusion in a prompt
 */
export function formatConversationsForPrompt(conversations: ParsedConversation[]): string {
  const blocks: string[] = [];

  for (const conv of conversations) {
    const date = conv.createdAt.slice(0, 10); // YYYY-MM-DD
    const header = `=== Conversation: "${conv.title}" (${date}) ===`;

    const messages = conv.messages.map((m) => {
      const role = m.role === 'user' ? 'User' : m.role === 'assistant' ? 'Assistant' : m.role;
      let content = m.content;

      if (content.length > MAX_MESSAGE_LENGTH) {
        content = content.slice(0, MAX_MESSAGE_LENGTH) + '... [truncated]';
      }

      return `${role}: ${content}`;
    });

    blocks.push([header, ...messages].join('\n'));
  }

  const result = blocks.join('\n\n');

  log.debug(
    { conversations: conversations.length, outputChars: result.length },
    'Formatted conversations for prompt',
  );

  return result;
}
