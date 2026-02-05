/**
 * ChatGPT Export Parser
 * Converts ChatGPT conversations.json to Mem0-compatible format
 * Based on: github.com/1ch1n/chat-export-structurer
 */

export interface ChatGPTMessage {
  id: string;
  author: {
    role: 'user' | 'assistant' | 'system' | 'tool';
    name?: string;
  };
  content: {
    content_type: string;
    parts?: (string | object)[];
    text?: string;
  };
  create_time: number | null;
  update_time: number | null;
  metadata?: Record<string, unknown>;
}

export interface ChatGPTConversation {
  id: string;
  title: string;
  create_time: number;
  update_time: number;
  mapping: Record<string, {
    id: string;
    message: ChatGPTMessage | null;
    parent: string | null;
    children: string[];
  }>;
}

export interface ParsedMessage {
  threadId: string;
  threadTitle: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  createdAt: number;
}

export interface Mem0Message {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Extract text content from ChatGPT's content structure
 */
function extractTextFromContent(content: ChatGPTMessage['content']): string {
  if (!content) return '';
  
  // Handle text field directly
  if (content.text) return content.text;
  
  // Handle parts array
  const parts = content.parts || [];
  const textParts: string[] = [];
  
  for (const part of parts) {
    if (typeof part === 'string') {
      textParts.push(part);
    } else if (typeof part === 'object' && part !== null) {
      // Handle multimodal content - extract any text fields
      const obj = part as Record<string, unknown>;
      if (obj.text && typeof obj.text === 'string') {
        textParts.push(obj.text);
      }
    }
  }
  
  return textParts.filter(t => t.trim()).join('\n');
}

/**
 * Parse a single ChatGPT conversation
 */
function* parseConversation(convo: ChatGPTConversation): Generator<ParsedMessage> {
  const threadId = convo.id;
  const title = convo.title || 'Untitled';
  const mapping = convo.mapping || {};
  
  const messages: ParsedMessage[] = [];
  
  for (const [nodeId, node] of Object.entries(mapping)) {
    const msg = node.message;
    if (!msg) continue;
    
    const role = msg.author?.role;
    if (!role || !['user', 'assistant', 'system'].includes(role)) continue;
    
    const content = extractTextFromContent(msg.content);
    if (!content.trim()) continue;
    
    const timestamp = msg.create_time || msg.update_time;
    if (!timestamp) continue;
    
    messages.push({
      threadId,
      threadTitle: title,
      role: role as 'user' | 'assistant' | 'system',
      content,
      createdAt: timestamp,
    });
  }
  
  // Sort by timestamp
  messages.sort((a, b) => a.createdAt - b.createdAt);
  
  for (const msg of messages) {
    yield msg;
  }
}

/**
 * Parse ChatGPT export JSON (streaming)
 * Handles both array format and single conversation
 */
export async function* parseChatGPTExport(
  jsonContent: string | ChatGPTConversation[]
): AsyncGenerator<ParsedMessage> {
  let conversations: ChatGPTConversation[];
  
  if (typeof jsonContent === 'string') {
    try {
      const parsed = JSON.parse(jsonContent);
      conversations = Array.isArray(parsed) ? parsed : [parsed];
    } catch (e) {
      throw new Error(`Invalid JSON: ${e}`);
    }
  } else {
    conversations = jsonContent;
  }
  
  for (const convo of conversations) {
    if (typeof convo === 'object' && convo !== null) {
      yield* parseConversation(convo);
    }
  }
}

/**
 * Group parsed messages into conversation threads for Mem0
 */
export function groupByThread(messages: ParsedMessage[]): Map<string, ParsedMessage[]> {
  const threads = new Map<string, ParsedMessage[]>();
  
  for (const msg of messages) {
    const existing = threads.get(msg.threadId) || [];
    existing.push(msg);
    threads.set(msg.threadId, existing);
  }
  
  // Sort each thread by timestamp
  for (const [threadId, msgs] of threads) {
    msgs.sort((a, b) => a.createdAt - b.createdAt);
  }
  
  return threads;
}

/**
 * Convert parsed messages to Mem0 message format
 */
export function toMem0Messages(messages: ParsedMessage[]): Mem0Message[] {
  return messages.map(msg => ({
    role: msg.role,
    content: msg.content,
  }));
}

/**
 * Get conversation stats
 */
export function getStats(messages: ParsedMessage[]): {
  totalMessages: number;
  totalConversations: number;
  dateRange: { start: Date; end: Date } | null;
  userMessages: number;
  assistantMessages: number;
} {
  const threads = new Set(messages.map(m => m.threadId));
  const timestamps = messages.map(m => m.createdAt).filter(t => t > 0);
  
  return {
    totalMessages: messages.length,
    totalConversations: threads.size,
    dateRange: timestamps.length > 0 ? {
      start: new Date(Math.min(...timestamps) * 1000),
      end: new Date(Math.max(...timestamps) * 1000),
    } : null,
    userMessages: messages.filter(m => m.role === 'user').length,
    assistantMessages: messages.filter(m => m.role === 'assistant').length,
  };
}
