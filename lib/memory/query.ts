import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

// Timeout constants for reliability
const MEMORY_SEARCH_TIMEOUT_MS = 10000; // 10 seconds per search
const EMBEDDING_TIMEOUT_MS = 15000; // 15 seconds for embedding

/**
 * Wrap a promise with timeout - returns null on timeout instead of throwing
 */
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T | null> {
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => {
      console.warn(`[Memory] ${operationName} timed out after ${timeoutMs}ms`);
      resolve(null);
    }, timeoutMs);
  });

  return Promise.race([promise, timeoutPromise]);
}

export interface MemoryChunk {
  id: string;
  title: string;
  content: string;
  created_at: string;
  similarity: number;
  layer_index: number;
}

export interface LearnedFactResult {
  fact: string;
  category: string;
  similarity: number;
}

// Database row types for proper typing
interface ChunkRpcRow {
  id: string;
  user_id: string;
  conversation_id: string;
  title: string | null;
  content: string;
  chunk_tier: string;
  message_count: number;
  created_at: string;
  similarity: number;
}

interface ChunkTableRow {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
}

interface LearnedFactRow {
  fact: string;
  category: string;
  similarity: number;
}


// Helper to get lazy client
function getBedrockClient() {
  return new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Embed a query using Amazon Titan Embed v2 (768 dimensions)
 * Must match the model used in rlm-service/processors/embedding_generator.py
 */
export async function embedQuery(text: string): Promise<number[]> {
  const client = getBedrockClient();

  const command = new InvokeModelCommand({
    modelId: 'amazon.titan-embed-text-v2:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      inputText: text.slice(0, 8000), // Titan v2 max ~8192 tokens, truncate conservatively
      dimensions: 768,
      normalize: true,
    }),
  });

  const embedPromise = async (): Promise<number[]> => {
    const response = await client.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    return result.embedding; // Titan v2 returns { embedding: number[] }
  };

  try {
    const result = await withTimeout(embedPromise(), EMBEDDING_TIMEOUT_MS, 'embedQuery');
    if (result === null) {
      throw new Error('Embedding timed out');
    }
    return result;
  } catch (error) {
    console.error('[Embed] Titan v2 error:', error);
    throw new Error(`Titan embedding error: ${error}`);
  }
}

/**
 * Batch embed multiple texts using Titan Embed v2
 * Note: Titan v2 does NOT support native batching, so we call sequentially
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  const allEmbeddings: number[][] = [];

  for (const text of texts) {
    const embedding = await embedQuery(text);
    allEmbeddings.push(embedding);
  }

  return allEmbeddings;
}

/**
 * Search conversation_chunks by vector similarity using match_conversation_chunks RPC
 */
export async function searchChunksSemantic(
  userId: string,
  queryEmbedding: number[],
  topK: number = 10,
  minSimilarity: number = 0.3,
): Promise<MemoryChunk[]> {
  const supabase = getSupabaseAdmin();

  const searchPromise = async (): Promise<MemoryChunk[]> => {
    const { data, error } = await supabase.rpc('match_conversation_chunks', {
      query_embedding: queryEmbedding,
      match_user_id: userId,
      match_count: topK,
      match_threshold: minSimilarity,
    });

    if (error) {
      console.error('[Memory] Semantic search RPC error:', error.message);
      throw new Error(`Failed to search memory: ${error.message}`);
    }

    return (data || []).map((row: ChunkRpcRow) => ({
      id: row.id,
      title: row.title || 'Untitled',
      content: row.content,
      created_at: row.created_at,
      similarity: row.similarity,
      layer_index: 1, // Not used in new approach, kept for interface compat
    }));
  };

  const result = await withTimeout(
    searchPromise(),
    MEMORY_SEARCH_TIMEOUT_MS,
    'searchChunksSemantic'
  );

  return result || [];
}

/**
 * Fallback keyword search (with timeout)
 */
async function keywordSearch(
  userId: string,
  query: string,
  limit: number = 5
): Promise<MemoryChunk[]> {
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 5);

  if (keywords.length === 0) return [];

  const searchPromise = async (): Promise<MemoryChunk[]> => {
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('conversation_chunks')
      .select('id, title, content, created_at')
      .eq('user_id', userId)
      .or(keywords.map(k => `content.ilike.%${k}%`).join(','))
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.log('[Memory] Keyword search error:', error.message);
      return [];
    }

    return (data || []).map((row: ChunkTableRow, i: number) => ({
      id: row.id,
      title: row.title || 'Untitled',
      content: row.content,
      created_at: row.created_at,
      similarity: 0.5 - (i * 0.05),
      layer_index: 1, // Not used in new approach, kept for interface compat
    }));
  };

  const result = await withTimeout(searchPromise(), MEMORY_SEARCH_TIMEOUT_MS, 'keywordSearch');
  return result || [];
}

/**
 * Search learned facts (with timeout)
 */
async function searchLearnedFacts(
  userId: string,
  queryEmbedding: number[],
  limit: number = 5,
  threshold: number = 0.5
): Promise<LearnedFactResult[]> {
  const searchPromise = async (): Promise<LearnedFactResult[]> => {
    const supabase = getSupabaseAdmin();
    const { data, error } = await supabase.rpc('match_learned_facts', {
      query_embedding: queryEmbedding,
      match_user_id: userId,
      match_count: limit,
      match_threshold: threshold,
    });
    if (error) {
      console.log('[Memory] Learned facts retrieval failed:', error.message);
      return [];
    }
    return (data || []).map((row: LearnedFactRow) => ({
      fact: row.fact,
      category: row.category,
      similarity: row.similarity,
    }));
  };

  try {
    const result = await withTimeout(searchPromise(), MEMORY_SEARCH_TIMEOUT_MS, 'searchLearnedFacts');
    return result || [];
  } catch (e) {
    console.log('[Memory] Learned facts access error:', e);
    return [];
  }
}

// Overall timeout for entire memory context fetch (30s)
const MEMORY_CONTEXT_TIMEOUT_MS = 30000;

/**
 * Get memory context for a chat query via semantic search.
 * Embeds the query with Titan Embed v2, searches conversation_chunks via cosine
 * similarity, and formats results as context text for the LLM.
 *
 * Falls back to keyword search if embedding/vector search fails.
 */
export async function getMemoryContext(
  userId: string,
  query: string,
  maxChunks: number = 10
): Promise<{ chunks: MemoryChunk[]; contextText: string; method: string; learnedFacts: LearnedFactResult[] }> {
  const emptyResult = { chunks: [], contextText: '', method: 'timeout', learnedFacts: [] };

  const fetchContext = async () => {
    let chunks: MemoryChunk[] = [];
    let learnedFacts: LearnedFactResult[] = [];
    let method = 'none';

    try {
      // Embed query with Titan v2 (768-dim)
      const queryEmbedding = await embedQuery(query);

      // Semantic search via match_conversation_chunks RPC
      chunks = await searchChunksSemantic(userId, queryEmbedding, maxChunks, 0.3);
      method = chunks.length > 0 ? 'semantic_vector' : 'none';

      console.log(`[Memory] Semantic search found ${chunks.length} relevant chunks for user ${userId}`);

      // Also get learned facts
      learnedFacts = await searchLearnedFacts(userId, queryEmbedding, 10, 0.4);

    } catch (error) {
      console.log('[Memory] Vector search failed:', error);
      // Fallback to keyword search
      chunks = await keywordSearch(userId, query, maxChunks);
      method = chunks.length > 0 ? 'keyword' : 'none';
    }

    if (chunks.length === 0 && learnedFacts.length === 0) {
      return { chunks: [], contextText: '', method, learnedFacts: [] };
    }

    // Format context
    const contextParts: string[] = [];

    // Facts first
    if (learnedFacts.length > 0) {
      const factsText = learnedFacts
        .map(f => `- [Fact] ${f.fact}`)
        .join('\n');
      contextParts.push(`[Learned Facts]\n${factsText}`);
    }

    // Memory chunks (sorted by similarity, highest first)
    if (chunks.length > 0) {
      const formattedChunks = chunks.map(chunk => {
        const maxLen = 2000;
        const truncated = chunk.content.length > maxLen
          ? chunk.content.slice(0, maxLen) + '...'
          : chunk.content;
        return `[Memory: ${chunk.title}] (relevance: ${chunk.similarity.toFixed(2)})\n${truncated}`;
      }).join('\n\n');
      contextParts.push(formattedChunks);
    }

    return {
      chunks,
      contextText: contextParts.join('\n\n---\n\n'),
      method,
      learnedFacts
    };
  };

  // Wrap entire memory fetch with overall timeout
  const result = await withTimeout(fetchContext(), MEMORY_CONTEXT_TIMEOUT_MS, 'getMemoryContext');
  if (result === null) {
    console.warn('[Memory] Entire memory context fetch timed out, proceeding without memory');
    return emptyResult;
  }
  return result;
}
