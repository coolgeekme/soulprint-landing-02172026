import { createClient } from '@/lib/supabase/server';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';

export interface MemoryChunk {
  id: string;
  title: string;
  content: string;
  created_at: string;
  similarity: number;
}

export interface LearnedFactResult {
  fact: string;
  category: string;
  similarity: number;
}

// Initialize Bedrock client for Cohere Embed v4
const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * Embed a query using Cohere Embed v4 on AWS Bedrock
 * 1536 dimensions, enterprise-grade accuracy for pinpoint memory
 * 128K context length, handles noisy real-world data
 */
export async function embedQuery(text: string): Promise<number[]> {
  const command = new InvokeModelCommand({
    modelId: 'cohere.embed-v4',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      texts: [text.slice(0, 128000)], // Cohere v4 supports 128K context
      input_type: 'search_query',
      embedding_types: ['float'],
      truncate: 'END',
    }),
  });

  try {
    const response = await bedrockClient.send(command);
    const result = JSON.parse(new TextDecoder().decode(response.body));
    return result.embeddings.float[0];
  } catch (error) {
    console.error('[Embed] Cohere v4 error:', error);
    throw new Error(`Cohere embedding error: ${error}`);
  }
}

/**
 * Batch embed multiple texts using Cohere Embed v4 on Bedrock
 * More efficient than one-by-one
 */
export async function embedBatch(texts: string[]): Promise<number[][]> {
  // Cohere v4 supports batch embedding natively
  // Process in chunks of 96 (Cohere batch limit)
  const BATCH_SIZE = 96;
  const allEmbeddings: number[][] = [];

  for (let i = 0; i < texts.length; i += BATCH_SIZE) {
    const batch = texts.slice(i, i + BATCH_SIZE).map(t => t.slice(0, 128000));
    
    const command = new InvokeModelCommand({
      modelId: 'cohere.embed-v4',
      contentType: 'application/json',
      accept: 'application/json',
      body: JSON.stringify({
        texts: batch,
        input_type: 'search_document', // Use 'search_document' for corpus
        embedding_types: ['float'],
        truncate: 'END',
      }),
    });

    try {
      const response = await bedrockClient.send(command);
      const result = JSON.parse(new TextDecoder().decode(response.body));
      allEmbeddings.push(...result.embeddings.float);
    } catch (error) {
      console.error('[Embed] Cohere v4 batch error:', error);
      throw new Error(`Cohere batch embedding error: ${error}`);
    }
  }

  return allEmbeddings;
}

/**
 * Search conversation_chunks by vector similarity
 * Returns top-k relevant chunks filtered by user_id
 */
export async function searchMemory(
  userId: string,
  query: string,
  topK: number = 5,
  minSimilarity: number = 0.3  // Lowered from 0.5 to catch more relevant memories
): Promise<MemoryChunk[]> {
  // Embed the query
  const queryEmbedding = await embedQuery(query);
  
  // Create Supabase client
  const supabase = await createClient();
  
  // Call the vector similarity search function
  const { data, error } = await supabase.rpc('match_conversation_chunks', {
    query_embedding: queryEmbedding,
    match_user_id: userId,
    match_count: topK,
    match_threshold: minSimilarity,
  });

  if (error) {
    console.error('Memory search error:', error);
    throw new Error(`Failed to search memory: ${error.message}`);
  }

  return (data || []).map((row: {
    id: string;
    title: string;
    content: string;
    created_at: string;
    similarity: number;
  }) => ({
    id: row.id,
    title: row.title || 'Untitled',
    content: row.content,
    created_at: row.created_at,
    similarity: row.similarity,
  }));
}

/**
 * Fallback keyword search when embeddings not available
 */
async function keywordSearch(
  userId: string,
  query: string,
  limit: number = 5
): Promise<MemoryChunk[]> {
  const supabase = await createClient();
  
  // Extract keywords
  const keywords = query
    .toLowerCase()
    .split(/\s+/)
    .filter(w => w.length > 3)
    .slice(0, 5);
  
  if (keywords.length === 0) {
    return [];
  }
  
  const { data, error } = await supabase
    .from('conversation_chunks')
    .select('id, title, content, created_at')
    .eq('user_id', userId)
    .or(keywords.map(k => `content.ilike.%${k}%`).join(','))
    .order('is_recent', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit);
  
  if (error) {
    console.log('[Memory] Keyword search error:', error.message);
    return [];
  }
  
  return (data || []).map((row, i) => ({
    id: row.id,
    title: row.title || 'Untitled',
    content: row.content,
    created_at: row.created_at,
    similarity: 0.5 - (i * 0.05), // Fake similarity for ordering
  }));
}

/**
 * Search learned facts by vector similarity
 */
async function searchLearnedFacts(
  userId: string,
  queryEmbedding: number[],
  limit: number = 5,
  threshold: number = 0.5
): Promise<LearnedFactResult[]> {
  const supabase = getSupabaseAdmin();

  try {
    const { data, error } = await supabase.rpc('match_learned_facts', {
      query_embedding: queryEmbedding,
      match_user_id: userId,
      match_count: limit,
      match_threshold: threshold,
    });

    if (error) {
      console.log('[Memory] Learned facts search failed:', error.message);
      return [];
    }

    return (data || []).map((row: { fact: string; category: string; similarity: number }) => ({
      fact: row.fact,
      category: row.category,
      similarity: row.similarity,
    }));
  } catch (error) {
    // Table might not exist yet
    console.log('[Memory] Learned facts search unavailable');
    return [];
  }
}

/**
 * Get memory context formatted for chat
 * Uses vector search if available, falls back to keyword search
 * Also includes learned facts from ongoing conversations
 */
export async function getMemoryContext(
  userId: string,
  query: string,
  maxChunks: number = 5
): Promise<{ chunks: MemoryChunk[]; contextText: string; method: string; learnedFacts: LearnedFactResult[] }> {
  let chunks: MemoryChunk[] = [];
  let learnedFacts: LearnedFactResult[] = [];
  let method = 'none';
  let queryEmbedding: number[] | null = null;
  
  // Try vector search first
  if (process.env.OPENAI_API_KEY) {
    try {
      // Get embedding for the query
      queryEmbedding = await embedQuery(query);
      
      // Search conversation chunks
      chunks = await searchMemory(userId, query, maxChunks);
      method = 'vector';
      console.log(`[Memory] Vector search found ${chunks.length} chunks`);
      
      // Also search learned facts
      if (queryEmbedding) {
        learnedFacts = await searchLearnedFacts(userId, queryEmbedding, 10, 0.35);
        console.log(`[Memory] Found ${learnedFacts.length} relevant learned facts`);
      }
    } catch (error) {
      console.log('[Memory] Vector search failed, trying keyword fallback:', error);
    }
  }
  
  // Fallback to keyword search
  if (chunks.length === 0) {
    try {
      chunks = await keywordSearch(userId, query, maxChunks);
      method = chunks.length > 0 ? 'keyword' : 'none';
      console.log(`[Memory] Keyword search found ${chunks.length} chunks`);
    } catch (error) {
      console.log('[Memory] Keyword search failed:', error);
    }
  }
  
  if (chunks.length === 0 && learnedFacts.length === 0) {
    return { chunks: [], contextText: '', method, learnedFacts: [] };
  }

  // Build context text from both sources
  const contextParts: string[] = [];
  
  // Add learned facts first (more recent/relevant)
  if (learnedFacts.length > 0) {
    const factsText = learnedFacts
      .map(f => `• [${f.category}] ${f.fact}`)
      .join('\n');
    contextParts.push(`[Learned Facts]\n${factsText}`);
  }
  
  // Add conversation memories
  if (chunks.length > 0) {
    const chunksText = chunks
      .map((chunk, i) => `[Memory ${i + 1}: ${chunk.title}] ${chunk.content.slice(0, 1500)}`)
      .join('\n\n');
    contextParts.push(chunksText);
  }

  const contextText = contextParts.join('\n\n---\n\n');

  return { chunks, contextText, method, learnedFacts };
}
