import {
  SageMakerRuntimeClient,
  InvokeEndpointCommand,
} from '@aws-sdk/client-sagemaker-runtime';
import {
  SageMakerClient,
  CreateModelCommand,
  CreateEndpointConfigCommand,
  CreateEndpointCommand,
  DeleteEndpointCommand,
  DeleteEndpointConfigCommand,
  DeleteModelCommand,
  DescribeEndpointCommand,
} from '@aws-sdk/client-sagemaker';

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant';
  content: string;
}

export interface SageMakerChatOptions {
  temperature?: number;
  maxTokens?: number;
}

// Lazy-initialized clients (env vars must be loaded first)
let _runtimeClient: SageMakerRuntimeClient | null = null;
let _sagemakerClient: SageMakerClient | null = null;

function getRuntimeClient(): SageMakerRuntimeClient {
  if (!_runtimeClient) {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error(
        'AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.local'
      );
    }
    _runtimeClient = new SageMakerRuntimeClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return _runtimeClient;
}

function getSageMakerClient(): SageMakerClient {
  if (!_sagemakerClient) {
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      throw new Error(
        'AWS credentials not configured. Set AWS_ACCESS_KEY_ID and AWS_SECRET_ACCESS_KEY in .env.local'
      );
    }
    _sagemakerClient = new SageMakerClient({
      region: process.env.AWS_REGION || 'us-east-1',
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    });
  }
  return _sagemakerClient;
}

function getEndpointName(): string {
  return process.env.SAGEMAKER_ENDPOINT_NAME || 'soulprint-llm';
}

const MODEL_NAME = 'soulprint-llm-model';
const ENDPOINT_CONFIG_NAME = 'soulprint-llm-config';

/**
 * Format messages into a chat prompt for the LLM
 *
 * Supports multiple formats based on deployed model:
 * - Mistral: <s>[INST] {system} {user} [/INST]
 * - ChatML (Hermes): <|im_start|>role\ncontent<|im_end|>
 *
 * Currently configured for Mistral 7B Instruct (JumpStart default)
 */
function formatPrompt(messages: ChatMessage[]): string {
  // Mistral Instruct format
  let systemPrompt = '';
  let conversation = '';

  for (const msg of messages) {
    if (msg.role === 'system') {
      systemPrompt = msg.content;
    } else if (msg.role === 'user') {
      // Include system prompt with first user message
      const prefix = systemPrompt ? `${systemPrompt}\n\n` : '';
      conversation += `<s>[INST] ${prefix}${msg.content} [/INST]`;
      systemPrompt = ''; // Only include once
    } else if (msg.role === 'assistant') {
      conversation += ` ${msg.content}</s>`;
    }
  }

  return conversation;
}

/**
 * Invoke the SageMaker endpoint with chat messages
 */
export async function invokeSageMaker(
  messages: ChatMessage[],
  options: SageMakerChatOptions = {}
): Promise<string> {
  const { temperature = 0.7, maxTokens = 512 } = options;

  const prompt = formatPrompt(messages);

  const payload = {
    inputs: prompt,
    parameters: {
      max_new_tokens: maxTokens,
      temperature: temperature,
      do_sample: true,
    },
  };

  const command = new InvokeEndpointCommand({
    EndpointName: getEndpointName(),
    ContentType: 'application/json',
    Body: JSON.stringify(payload),
  });

  const response = await getRuntimeClient().send(command);

  if (!response.Body) {
    throw new Error('Empty response from SageMaker');
  }

  const responseText = new TextDecoder().decode(response.Body);
  const result = JSON.parse(responseText);

  // Handle different response formats from LMI container
  if (Array.isArray(result)) {
    return result[0]?.generated_text || '';
  } else if (result.generated_text) {
    return result.generated_text;
  } else if (typeof result === 'string') {
    return result;
  }

  throw new Error('Unexpected response format from SageMaker');
}

/**
 * Check if the SageMaker endpoint is running
 */
export async function checkEndpointStatus(): Promise<{
  status: string;
  isReady: boolean;
}> {
  try {
    const command = new DescribeEndpointCommand({
      EndpointName: getEndpointName(),
    });

    const response = await getSageMakerClient().send(command);
    const status = response.EndpointStatus || 'Unknown';

    return {
      status,
      isReady: status === 'InService',
    };
  } catch (error: any) {
    if (error.name === 'ResourceNotFoundException' ||
        error.name === 'ValidationException' ||
        error.message?.includes('Could not find')) {
      return { status: 'NotFound', isReady: false };
    }
    throw error;
  }
}

/**
 * Deploy the LLM model to SageMaker
 * Note: This takes 10-15 minutes to spin up
 */
export async function deployModel(): Promise<void> {
  if (!process.env.SAGEMAKER_EXECUTION_ROLE_ARN) {
    throw new Error(
      'SAGEMAKER_EXECUTION_ROLE_ARN not configured. Create a SageMaker execution role in IAM and add the ARN to .env.local'
    );
  }

  const region = process.env.AWS_REGION || 'us-east-1';

  // HuggingFace TGI container for text generation
  const imageUri = `763104351884.dkr.ecr.${region}.amazonaws.com/huggingface-pytorch-tgi-inference:2.1.1-tgi2.0.1-gpu-py310-cu121-ubuntu22.04`;

  // Create model - using smaller model first to test pipeline
  await getSageMakerClient().send(new CreateModelCommand({
    ModelName: MODEL_NAME,
    PrimaryContainer: {
      Image: imageUri,
      Environment: {
        HF_MODEL_ID: 'TinyLlama/TinyLlama-1.1B-Chat-v1.0',
        SM_NUM_GPUS: '1',
        MAX_INPUT_LENGTH: '1024',
        MAX_TOTAL_TOKENS: '2048',
      },
    },
    ExecutionRoleArn: process.env.SAGEMAKER_EXECUTION_ROLE_ARN!,
  }));

  // Create endpoint config
  await getSageMakerClient().send(new CreateEndpointConfigCommand({
    EndpointConfigName: ENDPOINT_CONFIG_NAME,
    ProductionVariants: [
      {
        VariantName: 'primary',
        ModelName: MODEL_NAME,
        InitialInstanceCount: 1,
        InstanceType: 'ml.g4dn.xlarge',
      },
    ],
  }));

  // Create endpoint
  await getSageMakerClient().send(new CreateEndpointCommand({
    EndpointName: getEndpointName(),
    EndpointConfigName: ENDPOINT_CONFIG_NAME,
  }));

  console.log(`Endpoint ${getEndpointName()} is being created. This takes 10-15 minutes.`);
}

/**
 * Delete the SageMaker endpoint (to save costs)
 */
export async function deleteEndpoint(): Promise<void> {
  try {
    await getSageMakerClient().send(new DeleteEndpointCommand({
      EndpointName: getEndpointName(),
    }));

    await getSageMakerClient().send(new DeleteEndpointConfigCommand({
      EndpointConfigName: ENDPOINT_CONFIG_NAME,
    }));

    await getSageMakerClient().send(new DeleteModelCommand({
      ModelName: MODEL_NAME,
    }));

    console.log(`Endpoint ${getEndpointName()} deleted successfully.`);
  } catch (error: any) {
    if (error.name !== 'ResourceNotFoundException') {
      throw error;
    }
  }
}
