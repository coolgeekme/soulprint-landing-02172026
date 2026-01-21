/**
 * Test AWS Bedrock Embeddings
 * Verifies that embeddings work without OpenAI
 */
import dotenv from 'dotenv';
import { generateEmbedding } from '../lib/aws/embeddings';

dotenv.config({ path: '.env.local' });

async function main() {
  console.log('🧪 Testing AWS Bedrock Titan Embeddings...\n');
  console.log(`Region: ${process.env.AWS_REGION || 'us-east-1'}`);
  console.log(`Model: ${process.env.BEDROCK_EMBEDDING_MODEL_ID || 'amazon.titan-embed-text-v1'}\n`);

  try {
    const testText = "SoulPrint is an AI-powered personality analysis platform.";
    console.log(`Input: "${testText}"\n`);

    const embedding = await generateEmbedding(testText);

    if (embedding.length === 0) {
      throw new Error('Embedding generation returned empty array');
    }

    console.log('✅ Success!');
    console.log(`   Dimensions: ${embedding.length}`);
    console.log(`   First 5 values: [${embedding.slice(0, 5).map(n => n.toFixed(4)).join(', ')}...]`);
    console.log(`   Range: ${Math.min(...embedding).toFixed(4)} to ${Math.max(...embedding).toFixed(4)}\n`);

    // Verify expected dimensions
    if (embedding.length !== 1536) {
      console.warn(`⚠️  Warning: Expected 1536 dimensions, got ${embedding.length}`);
      console.warn('   You may need to update Supabase vector column size');
    }

    console.log('✅ AWS Titan Embeddings are working correctly!');
    console.log('   No OpenAI API calls made. All data stayed in AWS. 🔒\n');

  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Embedding test failed:', message);
    
    if (message.includes('credentials')) {
      console.error('\n💡 Make sure you have set:');
      console.error('   - AWS_ACCESS_KEY_ID');
      console.error('   - AWS_SECRET_ACCESS_KEY');
      console.error('   - AWS_REGION');
    }
    
    if (message.includes('model access')) {
      console.error('\n💡 Enable Titan Embeddings in AWS Console:');
      console.error('   Bedrock → Model access → Enable "amazon.titan-embed-text-v1"');
    }
    
    process.exitCode = 1;
  }
}

main();
