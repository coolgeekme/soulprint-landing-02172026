/**
 * LLM-Based Search Classifier
 *
 * Uses Haiku 4.5 to decide whether a user message needs web search.
 * Conservative by design: better to skip a search than waste an API call.
 *
 * Returns an optimized search query when search IS needed (not the raw
 * user message — this improves Perplexity/Tavily results).
 */

import { bedrockChatJSON } from '@/lib/bedrock';

// ============================================
// Types
// ============================================

export interface ClassifierInput {
  message: string;
  userInterests?: string[];
  recentContext?: string[];
}

export interface ClassifierResult {
  should_search: boolean;
  reason: string;
  search_query: string | null;
  confidence: number;
  latency_ms: number;
}

interface ClassifierResponse {
  should_search: boolean;
  reason: string;
  search_query: string | null;
  confidence: number;
}

// ============================================
// Classifier
// ============================================

const CLASSIFIER_SYSTEM = `You are a search routing classifier. Your job is to decide whether a user message requires a real-time web search or if the AI can answer from its training data alone.

You must be CONSERVATIVE — only recommend search when the answer genuinely requires current/real-time information.

SEARCH when:
- User asks about current events, news, or recent happenings
- User asks for live data: prices, stocks, weather, scores, exchange rates
- User asks "what's happening with X" or "latest on X"
- User explicitly asks to search or look something up
- The question requires information from after your training cutoff

DO NOT SEARCH when:
- User is chatting casually, venting, or asking for advice
- User wants creative help (writing, coding, brainstorming)
- User asks about personal topics (their own life, preferences, memories)
- User asks general knowledge questions the AI can answer well
- User asks how-to or tutorial questions
- User asks for opinions or recommendations based on taste
- User is greeting or saying goodbye

When search IS needed, rewrite the user's message into an optimized search query that will get better results from a search API. Strip personal context and focus on the factual question.

Respond with JSON only:
{
  "should_search": true/false,
  "reason": "brief explanation (10 words max)",
  "search_query": "optimized query" or null if no search needed,
  "confidence": 0.0-1.0
}`;

/**
 * Classify whether a message needs web search using Haiku 4.5.
 * Returns null on any failure (fail-open to heuristic fallback).
 */
export async function classifySearchNeed(
  input: ClassifierInput
): Promise<ClassifierResult | null> {
  const start = Date.now();

  try {
    // Build the user prompt with context
    let prompt = `User message: "${input.message}"`;

    if (input.userInterests && input.userInterests.length > 0) {
      prompt += `\nUser interests: ${input.userInterests.join(', ')}`;
    }

    if (input.recentContext && input.recentContext.length > 0) {
      prompt += `\nRecent conversation context:\n${input.recentContext.map(m => `- ${m}`).join('\n')}`;
    }

    const result = await bedrockChatJSON<ClassifierResponse>({
      model: 'HAIKU_45',
      system: CLASSIFIER_SYSTEM,
      messages: [{ role: 'user', content: prompt }],
      maxTokens: 150,
      temperature: 0.0,
    });

    const latency_ms = Date.now() - start;

    // Validate the response shape
    if (typeof result.should_search !== 'boolean') {
      console.warn('[SearchClassifier] Invalid response shape:', result);
      return null;
    }

    return {
      should_search: result.should_search,
      reason: result.reason || 'no reason provided',
      search_query: result.search_query || null,
      confidence: typeof result.confidence === 'number'
        ? Math.min(1, Math.max(0, result.confidence))
        : 0.5,
      latency_ms,
    };
  } catch (error) {
    console.error('[SearchClassifier] Classification failed:', error instanceof Error ? error.message : String(error));
    return null; // fail-open → heuristic fallback
  }
}
