import {
  BedrockRuntimeClient,
  InvokeModelCommand
} from "@aws-sdk/client-bedrock-runtime";

const REGION = process.env.AWS_REGION || "us-east-1";

let _client: BedrockRuntimeClient | null = null;

function getClient() {
  if (!_client) {
    _client = new BedrockRuntimeClient({
      region: REGION,
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID || "",
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY || "",
        sessionToken: process.env.AWS_SESSION_TOKEN || undefined,
      },
    });
  }
  return _client;
}

/**
 * Generates embeddings using AWS Bedrock Titan Embeddings G1
 * Produces 1536-dimensional vectors (same as OpenAI text-embedding-3-small)
 */
export async function generateEmbedding(text: string): Promise<number[]> {
  // Use Titan Embeddings G1 - Text (1536 dimensions)
  const modelId = process.env.BEDROCK_EMBEDDING_MODEL_ID || "amazon.titan-embed-text-v1";

  try {
    const payload = {
      inputText: text.replace(/\n/g, ' ')
    };

    const command = new InvokeModelCommand({
      modelId,
      contentType: "application/json",
      accept: "application/json",
      body: JSON.stringify(payload)
    });

    const response = await getClient().send(command);
    
    // Parse response
    const responseBody = JSON.parse(new TextDecoder().decode(response.body));
    
    return responseBody.embedding || [];
  } catch (error) {
    console.error("AWS Bedrock Embedding Error:", error);
    return []; // Return empty on failure to not block chat
  }
}

/**
 * Batch generate embeddings (more efficient for multiple texts)
 */
export async function generateEmbeddings(texts: string[]): Promise<number[][]> {
  const embeddings = await Promise.all(
    texts.map(text => generateEmbedding(text))
  );
  return embeddings;
}
