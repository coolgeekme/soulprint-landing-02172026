import { NextRequest, NextResponse } from 'next/server';
import { searchWeb, formatResultsForLLM } from '@/lib/tavily';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { 
      query, 
      maxResults = 5, 
      includeAnswer = true,
      searchDepth = 'basic',
      formatForLLM = false,
      includeDomains,
      excludeDomains,
    } = body;

    if (!query || typeof query !== 'string') {
      return NextResponse.json(
        { error: 'Query is required and must be a string' },
        { status: 400 }
      );
    }

    if (!process.env.TAVILY_API_KEY) {
      return NextResponse.json(
        { error: 'Tavily API key not configured' },
        { status: 500 }
      );
    }

    const results = await searchWeb(query, {
      maxResults,
      includeAnswer,
      searchDepth,
      includeDomains,
      excludeDomains,
    });

    // If formatForLLM is true, return formatted string for direct injection
    if (formatForLLM) {
      return NextResponse.json({
        formatted: formatResultsForLLM(results),
        query: results.query,
      });
    }

    return NextResponse.json(results);

  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Search failed', details: error instanceof Error ? error.message : 'Unknown error' },
      { status: 500 }
    );
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const query = searchParams.get('q');
  
  if (!query) {
    return NextResponse.json(
      { error: 'Query parameter "q" is required' },
      { status: 400 }
    );
  }

  if (!process.env.TAVILY_API_KEY) {
    return NextResponse.json(
      { error: 'Tavily API key not configured' },
      { status: 500 }
    );
  }

  try {
    const results = await searchWeb(query, {
      maxResults: 5,
      includeAnswer: true,
    });

    return NextResponse.json(results);
  } catch (error) {
    console.error('Search API error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
