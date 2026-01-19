import dotenv from 'dotenv';
import { invokeBedrockModel } from '../lib/aws/bedrock';

// Load env vars
dotenv.config({ path: '.env.local' });

async function main() {
  console.log('Testing AWS Bedrock Connection...');
  console.log(`Region: ${process.env.AWS_REGION}`);
  console.log(`Model: ${process.env.BEDROCK_MODEL_ID || 'meta.llama3-8b-instruct-v1:0 (default)'}`);

  try {
    const text = await invokeBedrockModel([
      { role: 'system', content: 'You are a helpful assistant.' },
      { role: 'user', content: "Reply with exactly: 'Yes'" },
    ]);

    console.log('✅ Success! Response:');
    console.log(text);
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('❌ Bedrock failed:', message);
    process.exitCode = 1;
  }
}

main();
