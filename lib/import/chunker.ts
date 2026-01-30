/**
 * Conversation Chunker
 * Splits conversations into ~300 char chunks for precise semantic search
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
}

// Ultra-granular chunking for better semantic search
const TARGET_CHUNK_CHARS = 300; // Small chunks = precise retrieval
const MAX_CHUNK_CHARS = 360; // Allow 20% overflow to avoid splitting mid-message

/**
 * Chunk all conversations into embedding-ready segments
 */
export function chunkConversations(conversations: ParsedConversation[]): Chunk[] {
  const allChunks: Chunk[] = [];
  
  for (const conversation of conversations) {
    const chunks = chunkConversation(conversation);
    allChunks.push(...chunks);
  }
  
  return allChunks;
}

/**
 * Chunk a single conversation
 */
export function chunkConversation(conversation: ParsedConversation): Chunk[] {
  const chunks: Chunk[] = [];
  
  if (conversation.messages.length === 0) {
    return chunks;
  }
  
  let currentChunkMessages: ParsedMessage[] = [];
  let currentChunkChars = 0;
  let chunkIndex = 0;
  
  // Add context header for each chunk
  const contextHeader = `[Conversation: ${conversation.title}]\n[Date: ${conversation.createdAt.toISOString().split('T')[0]}]\n\n`;
  const headerChars = contextHeader.length;
  
  for (const message of conversation.messages) {
    const formattedMessage = formatMessage(message);
    const messageChars = formattedMessage.length;
    
    // If adding this message would exceed max, flush current chunk
    if (currentChunkChars > 0 && currentChunkChars + messageChars + headerChars > MAX_CHUNK_CHARS) {
      // Create chunk from accumulated messages
      chunks.push(createChunk(
        conversation,
        currentChunkMessages,
        chunkIndex,
        contextHeader
      ));
      
      chunkIndex++;
      currentChunkMessages = [];
      currentChunkChars = 0;
    }
    
    currentChunkMessages.push(message);
    currentChunkChars += messageChars + 1; // +1 for newline
  }
  
  // Don't forget the last chunk
  if (currentChunkMessages.length > 0) {
    chunks.push(createChunk(
      conversation,
      currentChunkMessages,
      chunkIndex,
      contextHeader
    ));
  }
  
  // Update total chunks count in metadata
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
 * Create a chunk from messages
 */
function createChunk(
  conversation: ParsedConversation,
  messages: ParsedMessage[],
  chunkIndex: number,
  contextHeader: string
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
    },
  };
}

/**
 * Estimate token count for a string (~4 chars per token for English)
 */
export function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}
