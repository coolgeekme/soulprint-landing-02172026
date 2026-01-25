/**
 * GPT History Parser
 * Parses ChatGPT conversation exports (conversations.json)
 * and prepares them for import into SoulPrint's memory system.
 *
 * ChatGPT Export Format:
 * - User exports from Settings > Data Controls > Export Data
 * - Receives a zip file containing conversations.json
 * - conversations.json contains an array of conversation objects
 */

import { generateEmbeddings } from '@/lib/aws/embeddings';
import { createClient } from '@/lib/supabase/server';

// ChatGPT export types
export interface GPTMessage {
  id: string;
  author: {
    role: 'user' | 'assistant' | 'system' | 'tool';
    name?: string;
    metadata?: Record<string, unknown>;
  };
  content: {
    content_type: string;
    parts?: string[];
    text?: string;
  };
  create_time: number | null;
  update_time: number | null;
  metadata?: Record<string, unknown>;
}

export interface GPTConversation {
  id: string;
  title: string;
  create_time: number;
  update_time: number;
  mapping: Record<string, {
    id: string;
    message: GPTMessage | null;
    parent: string | null;
    children: string[];
  }>;
  current_node: string;
  conversation_template_id?: string;
  gizmo_id?: string;
}

export interface ParsedMessage {
  originalId: string;
  conversationTitle: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  originalTimestamp: Date | null;
  metadata: Record<string, unknown>;
}

export interface ImportProgress {
  totalConversations: number;
  processedConversations: number;
  totalMessages: number;
  processedMessages: number;
  errors: string[];
}

/**
 * Extract text content from a GPT message
 */
function extractContent(message: GPTMessage): string | null {
  if (!message.content) return null;

  // Handle different content types
  if (message.content.parts && message.content.parts.length > 0) {
    // Filter out non-string parts (images, etc.)
    const textParts = message.content.parts.filter(
      (part): part is string => typeof part === 'string'
    );
    if (textParts.length > 0) {
      return textParts.join('\n');
    }
  }

  if (message.content.text) {
    return message.content.text;
  }

  return null;
}

/**
 * Parse a single GPT conversation into flat message array
 * Walks the message tree to get messages in order
 */
export function parseConversation(conversation: GPTConversation): ParsedMessage[] {
  const messages: ParsedMessage[] = [];
  const mapping = conversation.mapping;

  // Find root node (has no parent)
  let currentId = Object.keys(mapping).find(
    id => mapping[id].parent === null
  );

  // Walk the tree following children
  const visited = new Set<string>();
  const queue: string[] = currentId ? [currentId] : [];

  while (queue.length > 0) {
    const nodeId = queue.shift()!;
    if (visited.has(nodeId)) continue;
    visited.add(nodeId);

    const node = mapping[nodeId];
    if (!node) continue;

    // Process message if it exists and has content
    if (node.message) {
      const msg = node.message;
      const role = msg.author?.role;

      // Only include user and assistant messages (skip system, tool)
      if (role === 'user' || role === 'assistant') {
        const content = extractContent(msg);

        if (content && content.trim().length > 0) {
          messages.push({
            originalId: msg.id,
            conversationTitle: conversation.title || 'Untitled Conversation',
            role: role,
            content: content.trim(),
            originalTimestamp: msg.create_time
              ? new Date(msg.create_time * 1000)
              : null,
            metadata: {
              conversationId: conversation.id,
              gizmoId: conversation.gizmo_id,
            },
          });
        }
      }
    }

    // Add children to queue
    if (node.children) {
      queue.push(...node.children);
    }
  }

  // Sort by timestamp if available
  messages.sort((a, b) => {
    if (!a.originalTimestamp || !b.originalTimestamp) return 0;
    return a.originalTimestamp.getTime() - b.originalTimestamp.getTime();
  });

  return messages;
}

/**
 * Parse entire GPT export file
 */
export function parseGPTExport(jsonContent: string): {
  conversations: GPTConversation[];
  totalMessages: number;
} {
  const conversations: GPTConversation[] = JSON.parse(jsonContent);

  let totalMessages = 0;
  for (const conv of conversations) {
    const parsed = parseConversation(conv);
    totalMessages += parsed.length;
  }

  return { conversations, totalMessages };
}

/**
 * Import GPT conversations into Supabase
 * Processes in batches to handle large exports
 */
export async function importGPTConversations(
  userId: string,
  conversations: GPTConversation[],
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportProgress> {
  console.log('🔄 [GPT Parser] Starting importGPTConversations...');
  console.log('🔄 [GPT Parser] User ID:', userId);
  console.log('🔄 [GPT Parser] Conversations count:', conversations.length);

  console.log('🔄 [GPT Parser] Creating supabase client...');
  const supabase = await createClient();
  console.log('🔄 [GPT Parser] Supabase client created');

  const progress: ImportProgress = {
    totalConversations: conversations.length,
    processedConversations: 0,
    totalMessages: 0,
    processedMessages: 0,
    errors: [],
  };

  // Count total messages first
  console.log('🔄 [GPT Parser] Counting total messages...');
  for (const conv of conversations) {
    const parsed = parseConversation(conv);
    progress.totalMessages += parsed.length;
  }
  console.log('🔄 [GPT Parser] Total messages to import:', progress.totalMessages);

  onProgress?.(progress);

  // Process each conversation
  for (let convIdx = 0; convIdx < conversations.length; convIdx++) {
    const conversation = conversations[convIdx];
    console.log(`🔄 [GPT Parser] Processing conversation ${convIdx + 1}/${conversations.length}: "${conversation.title}"`);

    try {
      const messages = parseConversation(conversation);
      console.log(`🔄 [GPT Parser] Parsed ${messages.length} messages from conversation`);

      // Process messages in batches of 5 (smaller to avoid rate limiting)
      const batchSize = 5;
      for (let i = 0; i < messages.length; i += batchSize) {
        const batch = messages.slice(i, i + batchSize);
        console.log(`🔄 [GPT Parser] Processing batch ${Math.floor(i/batchSize) + 1}, ${batch.length} messages`);

        // Generate embeddings with rate limiting (3 concurrent, 200ms between batches)
        console.log('🔄 [GPT Parser] Generating embeddings...');
        const embeddingStart = Date.now();
        const embeddings = await generateEmbeddings(
          batch.map(msg => msg.content),
          { concurrency: 2, delayBetweenBatches: 300 }
        );
        console.log(`🔄 [GPT Parser] Embeddings done in ${Date.now() - embeddingStart}ms`);

        // Prepare records for insert
        const records = batch.map((msg, idx) => ({
          user_id: userId,
          source: 'chatgpt',
          original_id: msg.originalId,
          conversation_title: msg.conversationTitle,
          role: msg.role,
          content: msg.content,
          embedding: embeddings[idx].length > 0 ? embeddings[idx] : null,
          original_timestamp: msg.originalTimestamp?.toISOString() || null,
          metadata: msg.metadata,
        }));

        // Insert batch
        console.log('🔄 [GPT Parser] Inserting batch to Supabase...');
        const insertStart = Date.now();
        const { error } = await supabase
          .from('imported_chats')
          .insert(records);

        if (error) {
          console.error('❌ [GPT Parser] Insert error:', error.message);
          progress.errors.push(
            `Error importing batch from "${conversation.title}": ${error.message}`
          );
        } else {
          console.log(`✅ [GPT Parser] Batch inserted in ${Date.now() - insertStart}ms`);
          progress.processedMessages += batch.length;
        }

        onProgress?.(progress);
      }

      progress.processedConversations++;
      console.log(`✅ [GPT Parser] Conversation ${convIdx + 1} complete`);
      onProgress?.(progress);

    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      console.error(`❌ [GPT Parser] Conversation error:`, errorMsg);
      progress.errors.push(
        `Error processing conversation "${conversation.title}": ${errorMsg}`
      );
    }
  }

  console.log('✅ [GPT Parser] Import complete!');
  console.log('📊 [GPT Parser] Final stats:', progress);
  return progress;
}

/**
 * Estimate token count for GPT export
 * Rough estimate: 1 token ≈ 4 characters
 */
export function estimateTokenCount(conversations: GPTConversation[]): number {
  let totalChars = 0;

  for (const conv of conversations) {
    const messages = parseConversation(conv);
    for (const msg of messages) {
      totalChars += msg.content.length;
    }
  }

  return Math.round(totalChars / 4);
}

/**
 * FAST Import GPT conversations - NO embeddings (instant)
 * Use this for quick import, then generate embeddings in background
 */
export async function importGPTConversationsFast(
  userId: string,
  conversations: GPTConversation[],
  onProgress?: (progress: ImportProgress) => void
): Promise<ImportProgress> {
  console.log('⚡ [GPT Parser Fast] Starting fast import (no embeddings)...');
  console.log('⚡ [GPT Parser Fast] User ID:', userId);
  console.log('⚡ [GPT Parser Fast] Conversations count:', conversations.length);

  const supabase = await createClient();

  const progress: ImportProgress = {
    totalConversations: conversations.length,
    processedConversations: 0,
    totalMessages: 0,
    processedMessages: 0,
    errors: [],
  };

  // Count total messages first
  for (const conv of conversations) {
    const parsed = parseConversation(conv);
    progress.totalMessages += parsed.length;
  }
  console.log('⚡ [GPT Parser Fast] Total messages to import:', progress.totalMessages);
  onProgress?.(progress);

  // Process in larger batches since no embeddings
  const BATCH_SIZE = 100; // Much larger batches without embedding overhead
  let allMessages: {
    user_id: string;
    source: string;
    original_id: string;
    conversation_title: string;
    role: string;
    content: string;
    embedding: null;
    original_timestamp: string | null;
    metadata: Record<string, unknown>;
  }[] = [];

  // Parse all conversations
  for (const conversation of conversations) {
    try {
      const messages = parseConversation(conversation);

      for (const msg of messages) {
        allMessages.push({
          user_id: userId,
          source: 'chatgpt',
          original_id: msg.originalId,
          conversation_title: msg.conversationTitle,
          role: msg.role,
          content: msg.content,
          embedding: null, // Skip embedding - will generate later
          original_timestamp: msg.originalTimestamp?.toISOString() || null,
          metadata: msg.metadata,
        });
      }
      progress.processedConversations++;
    } catch (err) {
      const errorMsg = err instanceof Error ? err.message : 'Unknown error';
      progress.errors.push(`Error parsing "${conversation.title}": ${errorMsg}`);
    }
  }

  console.log(`⚡ [GPT Parser Fast] Parsed ${allMessages.length} messages, inserting in batches of ${BATCH_SIZE}...`);

  // Insert in batches
  for (let i = 0; i < allMessages.length; i += BATCH_SIZE) {
    const batch = allMessages.slice(i, i + BATCH_SIZE);

    const { error } = await supabase
      .from('imported_chats')
      .insert(batch);

    if (error) {
      console.error('❌ [GPT Parser Fast] Insert error:', error.message);
      progress.errors.push(`Batch insert error: ${error.message}`);
    } else {
      progress.processedMessages += batch.length;
      console.log(`⚡ [GPT Parser Fast] Inserted ${progress.processedMessages}/${allMessages.length}`);
    }

    onProgress?.(progress);
  }

  console.log('✅ [GPT Parser Fast] Import complete!');
  console.log('📊 [GPT Parser Fast] Stats:', {
    total: progress.totalMessages,
    imported: progress.processedMessages,
    errors: progress.errors.length
  });

  return progress;
}

/**
 * Get import statistics for a user
 */
export async function getImportStats(userId: string): Promise<{
  totalImported: number;
  bySource: Record<string, number>;
  oldestMessage: Date | null;
  newestMessage: Date | null;
}> {
  const supabase = await createClient();

  // Get count by source
  const { data: counts, error: countError } = await supabase
    .from('imported_chats')
    .select('source')
    .eq('user_id', userId);

  const bySource: Record<string, number> = {};
  if (counts && !countError) {
    for (const row of counts) {
      bySource[row.source] = (bySource[row.source] || 0) + 1;
    }
  }

  // Get date range
  const { data: oldest } = await supabase
    .from('imported_chats')
    .select('original_timestamp')
    .eq('user_id', userId)
    .order('original_timestamp', { ascending: true })
    .limit(1)
    .single();

  const { data: newest } = await supabase
    .from('imported_chats')
    .select('original_timestamp')
    .eq('user_id', userId)
    .order('original_timestamp', { ascending: false })
    .limit(1)
    .single();

  return {
    totalImported: counts?.length || 0,
    bySource,
    oldestMessage: oldest?.original_timestamp
      ? new Date(oldest.original_timestamp)
      : null,
    newestMessage: newest?.original_timestamp
      ? new Date(newest.original_timestamp)
      : null,
  };
}
