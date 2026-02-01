/**
 * Smart Search - Intelligent real-time web search with auto-detection
 *
 * Features:
 * - Auto-detects when web search is needed (no manual toggle required)
 * - Perplexity → Tavily fallback chain
 * - Caches recent searches (5 min TTL)
 * - Rate limiting protection
 * - Graceful degradation on errors
 */

import { queryPerplexity, needsRealtimeInfo, formatPerplexityContext } from './perplexity';
import { searchWeb, formatSearchContext } from './tavily';

// Simple in-memory cache (5 minute TTL)
interface CacheEntry {
  result: SmartSearchResult;
  timestamp: number;
}
const searchCache = new Map<string, CacheEntry>();
const CACHE_TTL_MS = 5 * 60 * 1000; // 5 minutes

// Rate limiting - max 10 searches per minute per user
const rateLimitMap = new Map<string, number[]>();
const RATE_LIMIT_WINDOW_MS = 60 * 1000;
const RATE_LIMIT_MAX = 10;

export interface SmartSearchResult {
  needed: boolean;           // Was search actually needed?
  performed: boolean;        // Did we perform a search?
  source: 'perplexity' | 'tavily' | 'cache' | 'none';
  answer?: string;           // Direct answer (Perplexity)
  context: string;           // Formatted context for AI
  citations: string[];       // Source URLs
  error?: string;            // If search failed
  reason: string;            // Why we did/didn't search
}

/**
 * Normalize query for cache key
 */
function normalizeQuery(query: string): string {
  return query.toLowerCase().trim().replace(/\s+/g, ' ').slice(0, 200);
}

/**
 * Check if query is in cache and still valid
 */
function checkCache(query: string): SmartSearchResult | null {
  const key = normalizeQuery(query);
  const entry = searchCache.get(key);

  if (!entry) return null;

  const age = Date.now() - entry.timestamp;
  if (age > CACHE_TTL_MS) {
    searchCache.delete(key);
    return null;
  }

  console.log(`[SmartSearch] Cache hit (${Math.round(age / 1000)}s old)`);
  return { ...entry.result, source: 'cache' };
}

/**
 * Add result to cache
 */
function addToCache(query: string, result: SmartSearchResult): void {
  const key = normalizeQuery(query);
  searchCache.set(key, { result, timestamp: Date.now() });

  // Cleanup old entries (keep max 100)
  if (searchCache.size > 100) {
    const oldest = [...searchCache.entries()]
      .sort((a, b) => a[1].timestamp - b[1].timestamp)
      .slice(0, 20);
    oldest.forEach(([k]) => searchCache.delete(k));
  }
}

/**
 * Check rate limit for user
 */
function checkRateLimit(userId: string): boolean {
  const now = Date.now();
  const userRequests = rateLimitMap.get(userId) || [];

  // Remove old requests
  const recentRequests = userRequests.filter(t => now - t < RATE_LIMIT_WINDOW_MS);
  rateLimitMap.set(userId, recentRequests);

  if (recentRequests.length >= RATE_LIMIT_MAX) {
    console.log(`[SmartSearch] Rate limited user ${userId.slice(0, 8)}...`);
    return false;
  }

  return true;
}

/**
 * Record a search request for rate limiting
 */
function recordRequest(userId: string): void {
  const requests = rateLimitMap.get(userId) || [];
  requests.push(Date.now());
  rateLimitMap.set(userId, requests);
}

/**
 * Knowledge cutoff detection - things the AI definitely doesn't know
 */
function needsFreshData(message: string): { needed: boolean; reason: string } {
  const lowerMessage = message.toLowerCase();

  // Explicit current events
  const currentEventPatterns = [
    /what('s| is) (happening|going on)/i,
    /latest (news|update|on)/i,
    /today('s)?/i,
    /right now/i,
    /current(ly)?/i,
    /this (week|month|year)/i,
    /recent(ly)?/i,
  ];

  if (currentEventPatterns.some(p => p.test(message))) {
    return { needed: true, reason: 'current_events' };
  }

  // Prices, scores, weather - always changing
  const dynamicDataPatterns = [
    /\b(stock|price|worth|cost|rate)\b/i,
    /\b(weather|forecast|temperature)\b/i,
    /\b(score|game|match|playing)\b/i,
    /\b(election|poll|vote|results)\b/i,
    /\b(crypto|bitcoin|ethereum)\b/i,
  ];

  if (dynamicDataPatterns.some(p => p.test(message))) {
    return { needed: true, reason: 'dynamic_data' };
  }

  // Future dates (2024+)
  if (/\b202[4-9]\b|\b20[3-9]\d\b/.test(message)) {
    return { needed: true, reason: 'future_date' };
  }

  // Questions about specific entities that might have recent news
  const entityPatterns = [
    /who is \w+/i,
    /what happened to/i,
    /did .+ (announce|release|launch)/i,
  ];

  if (entityPatterns.some(p => p.test(message))) {
    return { needed: true, reason: 'entity_news' };
  }

  return { needed: false, reason: 'static_knowledge' };
}

/**
 * Smart Search - Main function
 *
 * Automatically determines if search is needed and performs it.
 * Returns formatted context for the AI.
 */
export async function smartSearch(
  message: string,
  userId: string,
  options: {
    forceSearch?: boolean;      // Override auto-detection
    skipCache?: boolean;        // Skip cache lookup
    preferDeep?: boolean;       // Use deep research mode
  } = {}
): Promise<SmartSearchResult> {
  const { forceSearch = false, skipCache = false, preferDeep = false } = options;

  console.log(`[SmartSearch] Analyzing: "${message.slice(0, 50)}..."`);

  // Step 1: Check if search is needed
  const freshDataCheck = needsFreshData(message);
  const perplexityCheck = needsRealtimeInfo(message);
  const searchNeeded = forceSearch || freshDataCheck.needed || perplexityCheck;

  if (!searchNeeded) {
    return {
      needed: false,
      performed: false,
      source: 'none',
      context: '',
      citations: [],
      reason: `Auto-skip: ${freshDataCheck.reason}`,
    };
  }

  const reason = forceSearch ? 'forced' : freshDataCheck.reason;
  console.log(`[SmartSearch] Search needed: ${reason}`);

  // Step 2: Check cache
  if (!skipCache) {
    const cached = checkCache(message);
    if (cached) {
      return { ...cached, needed: true, reason: `${reason} (cached)` };
    }
  }

  // Step 3: Check rate limit
  if (!checkRateLimit(userId)) {
    return {
      needed: true,
      performed: false,
      source: 'none',
      context: '',
      citations: [],
      reason: 'rate_limited',
      error: 'Too many searches, please wait a moment',
    };
  }

  recordRequest(userId);

  // Step 4: Try Perplexity first (fast, good answers)
  if (process.env.PERPLEXITY_API_KEY) {
    try {
      console.log('[SmartSearch] Trying Perplexity...');
      const model = preferDeep ? 'sonar-deep-research' : 'sonar';
      const result = await queryPerplexity(message, { model });

      const searchResult: SmartSearchResult = {
        needed: true,
        performed: true,
        source: 'perplexity',
        answer: result.answer,
        context: formatPerplexityContext(result),
        citations: result.citations,
        reason,
      };

      addToCache(message, searchResult);
      console.log(`[SmartSearch] Perplexity success: ${result.citations.length} citations`);
      return searchResult;

    } catch (error) {
      console.error('[SmartSearch] Perplexity failed:', error);
      // Fall through to Tavily
    }
  }

  // Step 5: Tavily fallback
  if (process.env.TAVILY_API_KEY) {
    try {
      console.log('[SmartSearch] Trying Tavily fallback...');
      const result = await searchWeb(message, {
        maxResults: 5,
        searchDepth: preferDeep ? 'advanced' : 'basic',
        includeAnswer: true,
      });

      const searchResult: SmartSearchResult = {
        needed: true,
        performed: true,
        source: 'tavily',
        answer: result.answer,
        context: formatSearchContext(result),
        citations: result.results.map(r => r.url),
        reason,
      };

      addToCache(message, searchResult);
      console.log(`[SmartSearch] Tavily success: ${result.results.length} results`);
      return searchResult;

    } catch (error) {
      console.error('[SmartSearch] Tavily also failed:', error);
    }
  }

  // Step 6: Both failed - graceful degradation
  console.log('[SmartSearch] All search providers failed');
  return {
    needed: true,
    performed: false,
    source: 'none',
    context: '',
    citations: [],
    reason,
    error: 'Search unavailable, using cached knowledge',
  };
}

/**
 * Cleanup function - call periodically or on shutdown
 */
export function clearSearchCache(): void {
  searchCache.clear();
  rateLimitMap.clear();
}

/**
 * Get cache stats for monitoring
 */
export function getSearchStats(): {
  cacheSize: number;
  rateLimitedUsers: number;
} {
  return {
    cacheSize: searchCache.size,
    rateLimitedUsers: rateLimitMap.size,
  };
}
