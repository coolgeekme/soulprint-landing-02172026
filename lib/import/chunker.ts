/**
 * Conversation Chunker
 * Splits conversations into multi-scale layers for Hierarchical RAG (RLM)
 */

import { ParsedConversation, ParsedMessage } from './parser';

export interface Chunk {
  content: string;
  metadata: ChunkMetadata;
}

export interface ChunkMetadata {
  conversationId: string;
  conversationTitle: string;
  conversationCreatedAt: string;
  chunkIndex: number;
  totalChunks?: number;
  messageIds: string[];
  startTimestamp?: string;
  endTimestamp?: string;
  // RLM Fields
  layerIndex: number; // 1-5
  chunkSize: number;  // approx chars
}

// 5-Layer RLM Configuration
const LAYERS = [
  { index: 1, size: 200, label: 'Micro' },
  { index: 2, size: 500, label: 'Flow' },
  { index: 3, size: 1000, label: 'Thematic' },
  { index: 4, size: 2000, label: 'Narrative' },
  { index: 5, size: 5000, label: 'Macro' },
];

/**
 * Chunk all conversations into hierarchical embedding-ready segments
 */
export function chunkConversations(conversations: ParsedConversation[]): Chunk[] {
  const allChunks: Chunk[] = [];

  for (const conversation of conversations) {
    // Generate chunks for ALL layers
    for (const layer of LAYERS) {
      const layerChunks = chunkConversationForLayer(conversation, layer);
      allChunks.push(...layerChunks);
    }
  }

  return allChunks;
}

/**
 * Chunk a single conversation for a specific layer
 */
function chunkConversationForLayer(
  conversation: ParsedConversation,
  layer: { index: number, size: number }
): Chunk[] {
  const chunks: Chunk[] = [];

  if (conversation.messages.length === 0) {
    return chunks;
  }

  let currentChunkMessages: ParsedMessage[] = [];
  let currentChunkChars = 0;
  let chunkIndex = 0;
  const OVERFLOW_LIMIT = layer.size * 1.2; // 20% overflow

  // Add context header (standardized across layers)
  const contextHeader = `[Conversation: ${conversation.title}]\n[Date: ${conversation.createdAt.toISOString().split('T')[0]}]\n\n`;
  const headerChars = contextHeader.length;

  for (const message of conversation.messages) {
    const formattedMessage = formatMessage(message);
    const messageChars = formattedMessage.length;

    // If adding this message would exceed max, flush current chunk
    if (currentChunkChars > 0 && currentChunkChars + messageChars + headerChars > OVERFLOW_LIMIT) {
      chunks.push(createChunk(
        conversation,
        currentChunkMessages,
        chunkIndex,
        contextHeader,
        layer
      ));

      chunkIndex++;
      currentChunkMessages = [];
      currentChunkChars = 0;
    }

    currentChunkMessages.push(message);
    currentChunkChars += messageChars + 1;
  }

  // Last chunk
  if (currentChunkMessages.length > 0) {
    chunks.push(createChunk(
      conversation,
      currentChunkMessages,
      chunkIndex,
      contextHeader,
      layer
    ));
  }

  // Update total chunks count map
  for (const chunk of chunks) {
    chunk.metadata.totalChunks = chunks.length;
  }

  return chunks;
}

/**
 * Format a message for embedding
 */
function formatMessage(message: ParsedMessage): string {
  const roleLabel = message.role === 'user' ? 'Human' : 'Assistant';
  return `${roleLabel}: ${message.content}`;
}

/**
 * Create a chunk
 */
function createChunk(
  conversation: ParsedConversation,
  messages: ParsedMessage[],
  chunkIndex: number,
  contextHeader: string,
  layer: { index: number, size: number }
): Chunk {
  const content = contextHeader + messages.map(formatMessage).join('\n\n');

  const timestamps = messages
    .map(m => m.timestamp)
    .filter((t): t is Date => t !== undefined)
    .sort((a, b) => a.getTime() - b.getTime());

  return {
    content,
    metadata: {
      conversationId: conversation.id,
      conversationTitle: conversation.title,
      conversationCreatedAt: conversation.createdAt.toISOString(),
      chunkIndex,
      messageIds: messages.map(m => m.id),
      startTimestamp: timestamps[0]?.toISOString(),
      endTimestamp: timestamps[timestamps.length - 1]?.toISOString(),
      // RLM Fields
      layerIndex: layer.index,
      chunkSize: layer.size
    },
  };
}

/**
 * Estimate token count for a string (~4 chars per token for English)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
