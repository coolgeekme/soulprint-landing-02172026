import { tavily } from '@tavily/core';

// Initialize Tavily client
const tavilyClient = tavily({ apiKey: process.env.TAVILY_API_KEY! });

export interface WebSearchResult {
  title: string;
  url: string;
  content: string;
  score: number;
}

export interface WebSearchResponse {
  query: string;
  results: WebSearchResult[];
  answer?: string; // AI-generated answer summary
}

/**
 * Search the web using Tavily's AI-powered search
 * Optimized for LLM consumption - returns clean, relevant text
 */
export async function searchWeb(
  query: string,
  options?: {
    maxResults?: number;
    includeAnswer?: boolean;
    searchDepth?: 'basic' | 'advanced';
    includeDomains?: string[];
    excludeDomains?: string[];
  }
): Promise<WebSearchResponse> {
  const {
    maxResults = 5,
    includeAnswer = true,
    searchDepth = 'basic',
    includeDomains,
    excludeDomains,
  } = options || {};

  try {
    const response = await tavilyClient.search(query, {
      maxResults,
      includeAnswer,
      searchDepth,
      includeDomains,
      excludeDomains,
    });

    return {
      query,
      answer: response.answer,
      results: response.results.map((r) => ({
        title: r.title,
        url: r.url,
        content: r.content,
        score: r.score,
      })),
    };
  } catch (error) {
    console.error('Tavily search error:', error);
    throw new Error(`Web search failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Get a quick AI-generated answer for a query
 * Best for factual questions where you just need the answer
 */
export async function quickAnswer(query: string): Promise<string> {
  const response = await tavilyClient.search(query, {
    maxResults: 3,
    includeAnswer: true,
    searchDepth: 'basic',
  });

  return response.answer || 'No answer found for this query.';
}

/**
 * Extract and summarize content from specific URLs
 */
export async function extractContent(urls: string[]): Promise<{ url: string; content: string }[]> {
  const response = await tavilyClient.extract(urls);
  
  return response.results.map((r) => ({
    url: r.url,
    content: r.rawContent,
  }));
}

/**
 * Format search results for injection into LLM context
 */
export function formatResultsForLLM(response: WebSearchResponse): string {
  let formatted = `## Web Search Results for: "${response.query}"\n\n`;
  
  if (response.answer) {
    formatted += `### Quick Answer\n${response.answer}\n\n`;
  }
  
  formatted += `### Sources\n`;
  response.results.forEach((result, i) => {
    formatted += `\n**${i + 1}. ${result.title}**\n`;
    formatted += `URL: ${result.url}\n`;
    formatted += `${result.content}\n`;
  });
  
  return formatted;
}
