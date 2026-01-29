/**
 * Generate embeddings for conversation chunks and store in memory_chunks
 * Run with: npx tsx scripts/generate-embeddings.ts <user_id>
 */

import { createClient } from '@supabase/supabase-js';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const BEDROCK_EMBEDDING_MODEL = process.env.BEDROCK_EMBEDDING_MODEL_ID || 'amazon.titan-embed-text-v2:0';

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);
const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });

async function generateEmbedding(text: string): Promise<number[]> {
  const command = new InvokeModelCommand({
    modelId: BEDROCK_EMBEDDING_MODEL,
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({
      inputText: text.slice(0, 8000), // Titan limit
    }),
  });

  const response = await bedrock.send(command);
  const result = JSON.parse(new TextDecoder().decode(response.body));
  return result.embedding;
}

async function processUser(userId: string) {
  console.log(`\n🔄 Processing user: ${userId}`);

  // Get conversation chunks
  const { data: chunks, error: chunksError } = await supabase
    .from('conversation_chunks')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });

  if (chunksError) {
    console.error('Error fetching chunks:', chunksError);
    return;
  }

  console.log(`📦 Found ${chunks?.length || 0} conversation chunks`);

  if (!chunks || chunks.length === 0) {
    console.log('⚠️  No chunks to process');
    return;
  }

  // Clear existing memory chunks for this user
  const { error: deleteError } = await supabase
    .from('memory_chunks')
    .delete()
    .eq('user_id', userId);

  if (deleteError) {
    console.error('Error clearing old memory chunks:', deleteError);
  }

  // Process each chunk
  let successCount = 0;
  let errorCount = 0;

  for (let i = 0; i < chunks.length; i++) {
    const chunk = chunks[i];
    console.log(`  [${i + 1}/${chunks.length}] Processing: ${chunk.title?.slice(0, 40)}...`);

    try {
      // Generate embedding
      const embedding = await generateEmbedding(chunk.content);

      // Store in memory_chunks
      const { error: insertError } = await supabase
        .from('memory_chunks')
        .insert({
          user_id: userId,
          content: chunk.content,
          embedding: embedding,
          metadata: {
            conversation_id: chunk.conversation_id,
            title: chunk.title,
            message_count: chunk.message_count,
            is_recent: chunk.is_recent,
            original_date: chunk.created_at,
          },
        });

      if (insertError) {
        console.error(`    ❌ Insert error:`, insertError.message);
        errorCount++;
      } else {
        successCount++;
      }

      // Rate limit - small delay
      await new Promise(r => setTimeout(r, 100));

    } catch (err) {
      console.error(`    ❌ Embedding error:`, err);
      errorCount++;
    }
  }

  console.log(`\n✅ Done! Success: ${successCount}, Errors: ${errorCount}`);

  // Update user profile
  await supabase
    .from('user_profiles')
    .update({
      processed_chunks: successCount,
      total_chunks: chunks.length,
      embeddings_completed_at: new Date().toISOString(),
    })
    .eq('user_id', userId);

  console.log('📊 User profile updated');
}

// Main
const userId = process.argv[2];
if (!userId) {
  console.log('Usage: npx tsx scripts/generate-embeddings.ts <user_id>');
  console.log('Example: npx tsx scripts/generate-embeddings.ts ceff050b-56aa-4074-93e2-689b159d3c86');
  process.exit(1);
}

processUser(userId).catch(console.error);
