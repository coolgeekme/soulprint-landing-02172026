/**
 * Quick Pass Generation Module
 *
 * Generates 5 structured personality sections from a user's ChatGPT
 * conversation history using Haiku 4.5 on Bedrock. Designed to run
 * in ~15-30 seconds during the import flow.
 *
 * Returns null on any failure -- the import pipeline must never fail
 * because of the quick pass.
 */

import { createLogger } from '@/lib/logger/index';
import { bedrockChatJSON } from '@/lib/bedrock';
import { sampleConversations, formatConversationsForPrompt } from '@/lib/soulprint/sample';
import { QUICK_PASS_SYSTEM_PROMPT } from '@/lib/soulprint/prompts';
import type { ParsedConversation, QuickPassResult } from '@/lib/soulprint/types';
import { quickPassResultSchema } from '@/lib/soulprint/types';
import { traceQuickPass, flushOpik } from '@/lib/opik';

const log = createLogger('Soulprint:QuickPass');

/**
 * Generate structured personality sections from ChatGPT conversations.
 *
 * Samples the richest conversations, sends them to Haiku 4.5 for analysis,
 * and validates the response with Zod. Returns null on any failure.
 *
 * @param conversations - All parsed conversations from the ChatGPT export
 * @returns QuickPassResult with all 5 sections, or null on failure
 */
export async function generateQuickPass(
  conversations: ParsedConversation[],
): Promise<QuickPassResult | null> {
  try {
    // Sample the richest conversations within token budget
    const sampled = sampleConversations(conversations);
    log.info(
      { input: conversations.length, sampled: sampled.length },
      'Conversations sampled for quick pass',
    );

    // Format as readable text for the prompt
    const formattedText = formatConversationsForPrompt(sampled);

    if (!formattedText || formattedText.trim().length === 0) {
      log.warn('No conversation text after formatting -- cannot generate quick pass');
      return null;
    }

    log.info(
      { promptChars: formattedText.length, approxTokens: Math.round(formattedText.length / 4) },
      'Calling Haiku 4.5 for quick pass',
    );

    // Opik trace for observability
    const opikTrace = traceQuickPass({
      userId: 'import', // userId not available here, set by caller
      conversationCount: conversations.length,
      messageCount: sampled.reduce((sum, c) => sum + c.messages.length, 0),
    });

    // Call Haiku 4.5 via Bedrock Converse API
    const qpStart = Date.now();
    const result = await bedrockChatJSON<QuickPassResult>({
      model: 'HAIKU_45',
      system: QUICK_PASS_SYSTEM_PROMPT,
      messages: [{ role: 'user', content: formattedText }],
      maxTokens: 8192,
      temperature: 0.7,
    });
    const qpDuration = Date.now() - qpStart;

    // Validate response against Zod schema (permissive defaults fill missing fields)
    const validation = quickPassResultSchema.safeParse(result);

    if (!validation.success) {
      log.error(
        { errors: validation.error.issues.slice(0, 10) },
        'Quick pass response failed Zod validation',
      );
      if (opikTrace) {
        opikTrace.span({ name: 'haiku-analysis', type: 'llm', input: { promptChars: formattedText.length }, output: { error: 'zod_validation_failed' }, metadata: { durationMs: qpDuration } }).end();
        opikTrace.end();
        flushOpik().catch(() => {});
      }
      return null;
    }

    // Opik: log success
    if (opikTrace) {
      opikTrace.span({
        name: 'haiku-analysis',
        type: 'llm',
        input: { promptChars: formattedText.length, sampledConversations: sampled.length },
        output: {
          aiName: validation.data.identity?.ai_name,
          archetype: validation.data.identity?.archetype,
          traitCount: validation.data.soul?.personality_traits?.length ?? 0,
        },
        metadata: { durationMs: qpDuration, model: 'haiku-4.5' },
      }).end();
      opikTrace.end();
      flushOpik().catch(() => {});
    }

    log.info('Quick pass generation succeeded');
    return validation.data;
  } catch (error) {
    // Never throw -- import must not fail because of quick pass
    log.error(
      { error: error instanceof Error ? error.message : String(error) },
      'Quick pass generation failed',
    );
    return null;
  }
}

/**
 * Convert a section object to readable markdown.
 *
 * Iterates keys of a section, formatting arrays as bullet lists and
 * strings as labeled paragraphs. Used by sectionsToSoulprintText.
 *
 * @param sectionName - Human-readable section heading
 * @param data - Section object (e.g., SoulSection, IdentitySection)
 * @returns Markdown-formatted string for the section
 */
export function sectionToMarkdown(sectionName: string, data: Record<string, unknown>): string {
  const lines: string[] = [`## ${sectionName}`];

  for (const [key, value] of Object.entries(data)) {
    // Format the key as a readable label
    const label = key
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (c) => c.toUpperCase());

    if (Array.isArray(value)) {
      if (value.length > 0) {
        lines.push(`**${label}:**`);
        for (const item of value) {
          lines.push(`- ${String(item)}`);
        }
      } else {
        lines.push(`**${label}:** not enough data`);
      }
    } else if (typeof value === 'string' && value.trim()) {
      lines.push(`**${label}:** ${value}`);
    } else {
      lines.push(`**${label}:** not enough data`);
    }
  }

  return lines.join('\n');
}

/**
 * Concatenate all 5 quick pass sections into a single markdown string
 * for backwards compatibility with `soulprint_text`.
 *
 * This text is what the chat route reads until Phase 3 refactors it
 * to use individual section columns.
 *
 * @param result - Validated QuickPassResult with all 5 sections
 * @returns Markdown-formatted string with all sections
 */
export function sectionsToSoulprintText(result: QuickPassResult): string {
  const sections = [
    sectionToMarkdown('Communication Style & Personality', result.soul as unknown as Record<string, unknown>),
    sectionToMarkdown('Your AI Identity', result.identity as unknown as Record<string, unknown>),
    sectionToMarkdown('About You', result.user as unknown as Record<string, unknown>),
    sectionToMarkdown('How I Operate', result.agents as unknown as Record<string, unknown>),
    sectionToMarkdown('My Capabilities', result.tools as unknown as Record<string, unknown>),
  ];

  return sections.join('\n\n');
}
