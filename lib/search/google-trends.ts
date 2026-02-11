/**
 * Google Trends Integration
 *
 * Fetches trending topics, filters by user interests, and formats
 * for injection into the prompt as dailyMemory entries.
 *
 * - 24-hour in-memory cache (fail-open: stale data > no data)
 * - Category extraction via keyword mapping
 * - Compatible with existing dailyMemory format (zero PromptBuilder changes)
 */

import { dailyTrends } from 'google-trends-api';

// ============================================
// Types
// ============================================

export interface TrendingTopic {
  title: string;
  /** Approximate daily search volume */
  traffic: string;
  /** Related article snippets */
  articles: Array<{ title: string; snippet: string; url: string }>;
  /** Inferred category from keyword matching */
  category: string;
}

// ============================================
// In-Memory Cache (24h TTL)
// ============================================

interface TrendsCache {
  topics: TrendingTopic[];
  fetchedAt: number;
}

let _cache: TrendsCache | null = null;
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

function getCachedTrends(): TrendingTopic[] | null {
  if (!_cache) return null;
  if (Date.now() - _cache.fetchedAt > CACHE_TTL_MS) return null;
  return _cache.topics;
}

function setCachedTrends(topics: TrendingTopic[]): void {
  _cache = { topics, fetchedAt: Date.now() };
}

// ============================================
// Category Extraction
// ============================================

const CATEGORY_KEYWORDS: Record<string, string[]> = {
  tech: ['ai', 'google', 'apple', 'microsoft', 'meta', 'openai', 'nvidia', 'software', 'app', 'update', 'launch', 'chip', 'robot', 'android', 'ios', 'iphone', 'samsung'],
  crypto: ['bitcoin', 'btc', 'ethereum', 'eth', 'crypto', 'token', 'blockchain', 'binance', 'coinbase', 'defi', 'nft', 'solana', 'dogecoin'],
  sports: ['nba', 'nfl', 'mlb', 'nhl', 'fifa', 'ufc', 'game', 'score', 'playoffs', 'championship', 'team', 'player', 'match', 'league', 'season', 'tournament', 'tennis', 'golf', 'f1', 'race'],
  health: ['health', 'covid', 'vaccine', 'fda', 'drug', 'medical', 'disease', 'fitness', 'diet', 'mental health', 'doctor', 'hospital'],
  business: ['stock', 'market', 'economy', 'fed', 'inflation', 'jobs', 'trade', 'earnings', 'ipo', 'merger', 'acquisition', 'revenue', 'gdp', 'recession', 'bank'],
  politics: ['election', 'president', 'congress', 'senate', 'bill', 'law', 'policy', 'vote', 'campaign', 'democrat', 'republican', 'political', 'government'],
  entertainment: ['movie', 'film', 'show', 'series', 'music', 'album', 'concert', 'celebrity', 'award', 'oscar', 'grammy', 'netflix', 'disney', 'streaming', 'trailer'],
  science: ['space', 'nasa', 'climate', 'research', 'study', 'discover', 'planet', 'rocket', 'mars', 'moon', 'ocean', 'environment'],
};

function inferCategory(title: string): string {
  const lower = title.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some(kw => lower.includes(kw))) {
      return category;
    }
  }
  return 'general';
}

// ============================================
// Core Functions
// ============================================

/**
 * Fetch daily trending topics from Google Trends.
 * Returns cached data if available and fresh. Fail-open: returns stale cache
 * or empty array on error.
 */
export async function fetchDailyTrends(geo = 'US'): Promise<TrendingTopic[]> {
  // Check cache first
  const cached = getCachedTrends();
  if (cached) {
    return cached;
  }

  try {
    const raw = await dailyTrends({ geo });
    const parsed = JSON.parse(raw);

    // Google Trends returns a nested structure
    const trendingDays = parsed?.default?.trendingSearchesDays;
    if (!Array.isArray(trendingDays) || trendingDays.length === 0) {
      console.warn('[GoogleTrends] No trending days in response');
      return _cache?.topics || []; // stale cache fallback
    }

    // Take the most recent day's trends
    const todayTrends = trendingDays[0]?.trendingSearches;
    if (!Array.isArray(todayTrends)) {
      console.warn('[GoogleTrends] No trending searches for today');
      return _cache?.topics || [];
    }

    const topics: TrendingTopic[] = todayTrends.map((trend: Record<string, unknown>) => {
      const title = (trend.title as Record<string, string>)?.query || '';
      const traffic = (trend.formattedTraffic as string) || '';
      const rawArticles = (trend.articles as Array<Record<string, string>>) || [];

      return {
        title,
        traffic,
        articles: rawArticles.slice(0, 2).map(a => ({
          title: a.title || '',
          snippet: a.snippet || '',
          url: a.url || '',
        })),
        category: inferCategory(title),
      };
    }).filter((t: TrendingTopic) => t.title.length > 0);

    setCachedTrends(topics);
    console.log(`[GoogleTrends] Fetched ${topics.length} trends (geo=${geo})`);
    return topics;
  } catch (error) {
    console.error('[GoogleTrends] Fetch failed:', error instanceof Error ? error.message : String(error));
    // Fail-open: return stale cache or empty
    return _cache?.topics || [];
  }
}

/**
 * Filter trending topics by user interests.
 * Matches trend categories against the user's interest list.
 */
export function filterTrendsByInterests(
  topics: TrendingTopic[],
  interests: string[],
  max = 5
): TrendingTopic[] {
  if (!interests || interests.length === 0) {
    // No interests — return top trends by default
    return topics.slice(0, max);
  }

  const normalizedInterests = interests.map(i => i.toLowerCase().trim());

  // Score each topic: direct interest match > keyword overlap > general
  const scored = topics.map(topic => {
    const titleLower = topic.title.toLowerCase();
    let score = 0;

    // Category matches user interest directly
    if (normalizedInterests.includes(topic.category)) {
      score += 10;
    }

    // Title contains an interest keyword
    if (normalizedInterests.some(interest => titleLower.includes(interest))) {
      score += 5;
    }

    // Interest keyword appears in articles
    for (const article of topic.articles) {
      const snippetLower = (article.snippet || '').toLowerCase();
      if (normalizedInterests.some(interest => snippetLower.includes(interest))) {
        score += 2;
        break; // only count once
      }
    }

    return { topic, score };
  });

  // Sort by score descending, take top N
  scored.sort((a, b) => b.score - a.score);

  // Include at least some general trends even if no matches
  const results = scored.slice(0, max).map(s => s.topic);
  return results;
}

/**
 * Format trending topics for injection into dailyMemory.
 * Returns entries compatible with `Array<{ fact: string; category: string }>`
 * so they can be merged directly with learned facts — zero PromptBuilder changes.
 */
export function formatTrendsForPrompt(
  topics: TrendingTopic[]
): Array<{ fact: string; category: string }> {
  return topics.map(topic => {
    // Build a concise fact string
    const headline = topic.articles[0]?.title;
    const fact = headline
      ? `Trending: "${topic.title}" — ${headline} (${topic.traffic} searches)`
      : `Trending: "${topic.title}" (${topic.traffic} searches)`;

    return { fact, category: 'trending' };
  });
}
