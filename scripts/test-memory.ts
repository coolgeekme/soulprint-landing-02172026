import { createClient } from '@supabase/supabase-js';
import { BedrockRuntimeClient, InvokeModelCommand } from '@aws-sdk/client-bedrock-runtime';

const supabase = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!);
const bedrock = new BedrockRuntimeClient({ region: 'us-east-1' });

async function generateEmbedding(text: string): Promise<number[]> {
  const command = new InvokeModelCommand({
    modelId: 'amazon.titan-embed-text-v2:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: JSON.stringify({ inputText: text }),
  });
  const response = await bedrock.send(command);
  return JSON.parse(new TextDecoder().decode(response.body)).embedding;
}

async function testMemory(query: string, userId: string) {
  console.log(`\n🔍 "${query}"`);
  const queryEmbedding = await generateEmbedding(query);
  const { data } = await supabase.rpc('match_memory_chunks', {
    query_embedding: queryEmbedding, match_user_id: userId, match_count: 3, match_threshold: 0.0
  });
  if (data) {
    for (const chunk of data.slice(0, 2)) {
      console.log(`   [${chunk.similarity?.toFixed(2)}] ${chunk.metadata?.title}`);
    }
  }
}

async function main() {
  const userId = 'ceff050b-56aa-4074-93e2-689b159d3c86';
  await testMemory('3D printing problems', userId);
  await testMemory('social media marketing', userId);
  await testMemory('where do I live', userId);
}

main().catch(console.error);
