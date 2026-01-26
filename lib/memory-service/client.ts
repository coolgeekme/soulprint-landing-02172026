/**
 * Memory Service Client
 * Calls the Python memory service for intelligent memory retrieval.
 * Replaces traditional RAG with LLM-powered memory exploration.
 */

const MEMORY_SERVICE_URL = process.env.MEMORY_SERVICE_URL || 'http://localhost:8100';

export interface MemoryResult {
    content: string;
    significance: 'high' | 'medium' | 'low' | 'unknown';
    context?: string;
}

export interface MemoryResponse {
    relevant_memories: MemoryResult[];
    patterns_detected: string[];
    user_context: string;
    success: boolean;
    error?: string;
}

/**
 * Check if memory service is available
 */
export async function checkMemoryServiceHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${MEMORY_SERVICE_URL}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000),
        });
        return response.ok;
    } catch {
        console.warn('[Memory] Service not available');
        return false;
    }
}

/**
 * Query memory service for relevant context
 */
export async function queryMemoryService(
    userId: string,
    query: string,
    history: string,
    maxResults: number = 10
): Promise<MemoryResponse> {
    try {
        console.log(`[Memory] Querying: "${query.substring(0, 50)}..."`);
        
        const response = await fetch(`${MEMORY_SERVICE_URL}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                query,
                history,
                max_results: maxResults,
            }),
            signal: AbortSignal.timeout(30000), // 30s timeout
        });

        if (!response.ok) {
            throw new Error(`Memory service error: ${response.status}`);
        }

        const result = await response.json();
        console.log(`[Memory] Got ${result.relevant_memories?.length || 0} memories`);
        return result;
    } catch (error) {
        console.error('[Memory] Query failed:', error);
        return {
            relevant_memories: [],
            patterns_detected: [],
            user_context: '',
            success: false,
            error: error instanceof Error ? error.message : 'Unknown error',
        };
    }
}

/**
 * Format memory response for injection into system prompt
 */
export function formatMemoriesForPrompt(response: MemoryResponse): string {
    if (!response.success || response.relevant_memories.length === 0) {
        return '';
    }

    let block = '\n### L3: ACTIVE MEMORY LAYER (LLM-Extracted)\n';
    
    // Add relevant memories with significance tags
    for (const mem of response.relevant_memories) {
        const sigTag = mem.significance !== 'unknown' ? `[${mem.significance.toUpperCase()}]` : '';
        block += `${sigTag} "${mem.content}"`;
        if (mem.context) {
            block += ` — ${mem.context}`;
        }
        block += '\n';
    }
    
    // Add detected patterns
    if (response.patterns_detected.length > 0) {
        block += '\n**User Patterns:** ' + response.patterns_detected.join(', ') + '\n';
    }
    
    // Add user context summary
    if (response.user_context) {
        block += `\n**Context:** ${response.user_context}\n`;
    }
    
    return block;
}

/**
 * Get user's full conversation history from database for memory queries
 */
export async function getUserHistoryForMemory(
    supabase: any,
    userId: string,
    limit: number = 100
): Promise<string> {
    try {
        // Get native chat logs
        const { data: nativeLogs } = await supabase
            .from('chat_logs')
            .select('role, content, created_at')
            .eq('user_id', userId)
            .order('created_at', { ascending: false })
            .limit(limit);

        // Get imported chats
        const { data: importedLogs } = await supabase
            .from('imported_chats')
            .select('role, content, original_timestamp')
            .eq('user_id', userId)
            .order('original_timestamp', { ascending: false })
            .limit(limit);

        // Format as conversation history string
        let history = '';
        
        // Add imported history first (older)
        if (importedLogs && importedLogs.length > 0) {
            history += '=== IMPORTED HISTORY ===\n';
            for (const log of importedLogs.reverse()) {
                const role = log.role === 'user' ? 'User' : 'Assistant';
                history += `${role}: ${log.content}\n`;
            }
        }
        
        // Add native history (recent)
        if (nativeLogs && nativeLogs.length > 0) {
            history += '\n=== RECENT CONVERSATIONS ===\n';
            for (const log of nativeLogs.reverse()) {
                const role = log.role === 'user' ? 'User' : 'Assistant';
                history += `${role}: ${log.content}\n`;
            }
        }

        return history || 'No conversation history available.';
    } catch (error) {
        console.error('[Memory] Failed to get user history:', error);
        return 'Error retrieving history.';
    }
}
