/**
 * Embedder - Uses AWS Bedrock (Cohere v3) to create embeddings
 * and stores them in Supabase
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
} from '@aws-sdk/client-bedrock-runtime';
import { createClient } from '@supabase/supabase-js';
import { Chunk } from './chunker';

// Batch size for embedding requests (Cohere supports up to 96 texts per batch)
const EMBEDDING_BATCH_SIZE = 96;
const STORE_BATCH_SIZE = 50;

interface EmbeddedChunk extends Chunk {
  embedding: number[];
}

/**
 * Create Bedrock client
 */
function getBedrockClient(): BedrockRuntimeClient {
  return new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

/**
 * Create Supabase admin client (for service role operations)
 */
function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    }
  );
}

/**
 * Embed a batch of texts using Cohere Embed v3
 */
async function embedBatch(
  client: BedrockRuntimeClient,
  texts: string[]
): Promise<number[][]> {
  const modelId = 'cohere.embed-english-v3';

  // Truncate to avoid token limits per string if needed (Cohere handles 512-ish well, allows large context)
  // Ensure texts are not empty
  const validTexts = texts.map(t => t || ' ');

  const command = new InvokeModelCommand({
    modelId,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      texts: validTexts,
      input_type: 'search_document', // Optimize for retrieval
      embedding_types: ['float'],
    }),
  });

  try {
    const response = await client.send(command);
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    return responseBody.embeddings.float;
  } catch (error) {
    console.error('Embedding error:', error);
    throw error;
  }
}

/**
 * Embed multiple chunks in batches
 */
export async function embedChunks(
  chunks: Chunk[],
  onProgress?: (processed: number, total: number) => void
): Promise<EmbeddedChunk[]> {
  const client = getBedrockClient();
  const embeddedChunks: EmbeddedChunk[] = [];

  // Process in batches
  for (let i = 0; i < chunks.length; i += EMBEDDING_BATCH_SIZE) {
    const batch = chunks.slice(i, i + EMBEDDING_BATCH_SIZE);
    const texts = batch.map(c => c.content);

    try {
      const embeddings = await embedBatch(client, texts);

      batch.forEach((chunk, idx) => {
        embeddedChunks.push({ ...chunk, embedding: embeddings[idx] });
      });

      if (onProgress) {
        onProgress(embeddedChunks.length, chunks.length);
      }
    } catch (e) {
      console.error(`Failed to embed batch ${i}:`, e);
      // Continue? Or throw? Throwing is safer for data integrity.
      throw e;
    }

    // Small delay to be nice to rate limits
    if (i + EMBEDDING_BATCH_SIZE < chunks.length) {
      await new Promise(resolve => setTimeout(resolve, 200));
    }
  }

  return embeddedChunks;
}

/**
 * Store embedded chunks in Supabase
 */
export async function storeChunks(
  userId: string,
  importJobId: string,
  embeddedChunks: EmbeddedChunk[],
  onProgress?: (stored: number, total: number) => void
): Promise<void> {
  const supabase = getSupabaseAdmin();

  // Insert in batches for efficiency
  for (let i = 0; i < embeddedChunks.length; i += STORE_BATCH_SIZE) {
    const batch = embeddedChunks.slice(i, i + STORE_BATCH_SIZE);

    // Map to table columns
    const records = batch.map(chunk => ({
      user_id: userId,
      // import_job_id: importJobId, // Check if conversation_chunks has this column?
      // conversation_chunks schema usually: id, user_id, title, content, embedding, created_at, metadata
      // We will put import info in metadata if column strictly missing
      title: chunk.metadata.conversationTitle || 'Untitled',
      content: chunk.content,
      embedding: JSON.stringify(chunk.embedding),
      created_at: chunk.metadata.conversationCreatedAt,
      is_recent: false, // Default
      metadata: { ...chunk.metadata, importJobId }, // Store extra metadata here
      // RLM Columns
      layer_index: chunk.metadata.layerIndex,
      chunk_size: chunk.metadata.chunkSize
    }));

    const { error } = await supabase
      .from('conversation_chunks') // Fixed: Target the correct table!
      .insert(records);

    if (error) {
      console.error('Insert error:', error);
      throw new Error(`Failed to store chunks: ${error.message}`);
    }

    if (onProgress) {
      onProgress(Math.min(i + STORE_BATCH_SIZE, embeddedChunks.length), embeddedChunks.length);
    }
  }
}

/**
 * Create a query embedding for search (Helper for other tools)
 */
export async function createQueryEmbedding(text: string): Promise<number[]> {
  const client = getBedrockClient();
  const result = await embedBatch(client, [text]);
  return result[0];
}
