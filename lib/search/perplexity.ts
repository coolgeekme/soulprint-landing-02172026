/**
 * Perplexity API Integration
 * Provides real-time information for news, current events, and time-sensitive queries
 */

export interface PerplexityResponse {
  answer: string;
  query: string;
  citations: string[];
  isDeepSearch?: boolean;
}

export type PerplexityModel = 'sonar' | 'sonar-deep-research';

/**
 * Query Perplexity's sonar model for real-time information
 * @param query - The search query
 * @param options.model - 'sonar' for quick search, 'sonar-deep-research' for comprehensive research
 * @param options.maxTokens - Maximum tokens for response
 */
export async function queryPerplexity(
  query: string,
  options: {
    model?: PerplexityModel;
    maxTokens?: number;
  } = {}
): Promise<PerplexityResponse> {
  const apiKey = process.env.PERPLEXITY_API_KEY;
  if (!apiKey) {
    throw new Error('PERPLEXITY_API_KEY not configured');
  }

  const { model = 'sonar', maxTokens = model === 'sonar-deep-research' ? 4096 : 1024 } = options;
  const isDeepSearch = model === 'sonar-deep-research';

  // Deep research gets a more thorough system prompt
  const systemPrompt = isDeepSearch
    ? 'You are a comprehensive research assistant. Provide thorough, well-researched information with multiple sources. Cover all aspects of the topic, include relevant context, and cite your sources clearly.'
    : 'You are a helpful assistant. Provide accurate, up-to-date information with sources. Be concise but comprehensive.';

  console.log(`[Perplexity] Using model: ${model}, isDeepSearch: ${isDeepSearch}`);

  // Add timeout to prevent hanging - 10s for normal, 30s for deep research
  const timeoutMs = isDeepSearch ? 30000 : 10000;
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  try {
    const response = await fetch('https://api.perplexity.ai/chat/completions', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model,
        messages: [
          {
            role: 'system',
            content: systemPrompt,
          },
          {
            role: 'user',
            content: query,
          },
        ],
        max_tokens: maxTokens,
        return_citations: true,
      }),
      signal: controller.signal,
    });
    
    clearTimeout(timeoutId);

    if (!response.ok) {
      const errorText = await response.text();
      console.error('[Perplexity] API error:', response.status, errorText);
      throw new Error(`Perplexity API error: ${response.status}`);
    }

    const data = await response.json();
    
    // Extract citations from the response
    const citations: string[] = data.citations || [];
    const answer = data.choices?.[0]?.message?.content || '';

    return {
      answer,
      query,
      citations,
      isDeepSearch,
    };
  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      console.error(`[Perplexity] Request timed out after ${timeoutMs}ms`);
      throw new Error(`Perplexity request timed out after ${timeoutMs / 1000}s`);
    }
    console.error('[Perplexity] Query error:', error);
    throw error;
  }
}

/**
 * Determine if a message needs real-time data from Perplexity
 * AGGRESSIVE MODE: Default to using Perplexity for most factual questions
 * Only skip obvious memory/personal questions and simple greetings
 */
export function needsRealtimeInfo(message: string): boolean {
  const lowerMessage = message.toLowerCase().trim();

  // SKIP: Very short messages (< 10 chars) - can't be meaningful queries
  if (lowerMessage.length < 10) {
    console.log(`[Perplexity] Decision: SKIP (too short: ${lowerMessage.length} chars)`);
    return false;
  }

  // SKIP: Personal/memory questions - LLM + memory handles these
  const memoryIndicators = [
    'remember when', 'do you remember', 'we talked about', 'i told you',
    'you said', 'last time we', 'our conversation', 'my name', 'my favorite',
    'about me', 'my profile', 'what do you know about me', 'who am i',
    'tell me about myself', 'what have i', 'my preferences',
  ];
  
  if (memoryIndicators.some(ind => lowerMessage.includes(ind))) {
    console.log(`[Perplexity] Decision: SKIP (memory/personal question)`);
    return false;
  }

  // SKIP: Simple greetings and social phrases
  const greetings = [
    'hello', 'hi there', 'hey', 'good morning', 'good afternoon', 'good evening', 
    'good night', 'how are you', 'thank you', 'thanks', 'bye', 'goodbye', 
    'ok', 'okay', 'sure', 'yes', 'no', 'please', 'sorry', 'what\'s up',
  ];
  if (greetings.some(g => lowerMessage === g || lowerMessage === g + '!' || lowerMessage === g + '.')) {
    console.log(`[Perplexity] Decision: SKIP (greeting)`);
    return false;
  }

  // SKIP: Code generation / creative writing tasks - LLM handles these
  const creativeIndicators = [
    'write me a', 'write a ', 'create a ', 'generate a ', 'make me a ',
    'code for', 'function that', 'script to', 'program that', 'regex for',
    'help me write', 'compose a', 'draft a',
  ];
  if (creativeIndicators.some(ind => lowerMessage.includes(ind))) {
    console.log(`[Perplexity] Decision: SKIP (creative/code generation task)`);
    return false;
  }

  // SKIP: Conversational/opinion questions directed at the AI
  const conversationalIndicators = [
    'what do you think', 'your opinion', 'do you like', 'do you believe',
    'can you help me', 'would you', 'could you', 'tell me a joke',
    'tell me a story', 'how do you feel', 'are you able',
  ];
  if (conversationalIndicators.some(ind => lowerMessage.includes(ind))) {
    console.log(`[Perplexity] Decision: SKIP (conversational/opinion)`);
    return false;
  }

  // USE PERPLEXITY: Everything else that looks like a factual query
  // This is intentionally broad - we want to err on the side of using Perplexity

  // Strong indicators - definitely use Perplexity
  const strongIndicators = [
    // News and current events
    'news', 'headlines', 'breaking', 'update on', 'latest', 'recent',
    'today', 'yesterday', 'this week', 'this month', 'right now', 'currently',
    'just happened', 'current', 'live', 'real-time', 'trending',
    // Data that changes
    'stock', 'price', 'weather', 'score', 'election', 'results', 'worth',
    'cost', 'rate', 'forecast', 'prediction', 'market', 'crypto', 'bitcoin',
    // Question starters
    'what happened', 'who won', 'who is', 'what is the', 'where is',
    'when is', 'how much', 'how many', 'is it true', 'did they',
    // Entities that might have recent news
    'released', 'announced', 'launched', 'acquired', 'merged', 'bought',
  ];

  if (strongIndicators.some(ind => lowerMessage.includes(ind))) {
    console.log(`[Perplexity] Decision: USE (strong indicator found)`);
    return true;
  }

  // Year references (current or future)
  if (/20(2[4-9]|[3-9]\d)/.test(lowerMessage)) {
    console.log(`[Perplexity] Decision: USE (recent/future year mentioned)`);
    return true;
  }

  // Factual question patterns - use Perplexity for these too
  const factualPatterns = [
    /^(what|who|where|when|why|how|which|is|are|does|do|did|has|have|will|can|should)\b/i,
    /\?$/, // Ends with question mark
  ];
  
  if (factualPatterns.some(pattern => pattern.test(lowerMessage))) {
    console.log(`[Perplexity] Decision: USE (factual question pattern)`);
    return true;
  }

  // Contains proper nouns or entities (capitalized words after first word)
  const words = message.split(/\s+/);
  const hasProperNoun = words.slice(1).some(w => /^[A-Z][a-z]/.test(w));
  if (hasProperNoun && lowerMessage.length > 20) {
    console.log(`[Perplexity] Decision: USE (proper noun detected)`);
    return true;
  }

  // DEFAULT: For anything else with decent length, use Perplexity
  // Better to have fresh info than stale LLM knowledge
  if (lowerMessage.length > 25) {
    console.log(`[Perplexity] Decision: USE (default - substantive query)`);
    return true;
  }

  console.log(`[Perplexity] Decision: SKIP (no indicators, short query)`);
  return false;
}

/**
 * Format Perplexity response for AI context
 */
export function formatPerplexityContext(response: PerplexityResponse): string {
  if (!response.answer) {
    return '';
  }

  const header = response.isDeepSearch 
    ? '[🔍 Deep Research Results from Perplexity]'
    : '[Real-Time Information from Perplexity]';

  const lines = [header];
  lines.push(response.answer);
  
  if (response.citations.length > 0) {
    lines.push('');
    lines.push('Sources:');
    // Deep search gets more citations displayed
    const citationLimit = response.isDeepSearch ? 8 : 5;
    response.citations.slice(0, citationLimit).forEach((citation, i) => {
      lines.push(`${i + 1}. ${citation}`);
    });
  }

  return lines.join('\n');
}

/**
 * Format sources/citations for display in chat messages
 * Returns a formatted string with clickable source links
 */
export function formatSourcesForDisplay(citations: string[]): string {
  if (!citations || citations.length === 0) {
    return '';
  }

  const sources = citations.slice(0, 6).map((url, i) => {
    // Extract domain name for cleaner display
    try {
      const domain = new URL(url).hostname.replace('www.', '');
      return `[${i + 1}] ${domain}`;
    } catch {
      return `[${i + 1}] ${url}`;
    }
  });

  return `\n\n📚 **Sources:**\n${sources.join(' • ')}`;
}
