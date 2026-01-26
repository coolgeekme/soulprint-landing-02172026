/**
 * RLM Memory Client
 * TypeScript client for the RLM Memory microservice
 */

const RLM_SERVICE_URL = process.env.RLM_SERVICE_URL || 'http://localhost:8100';

export interface MemoryResult {
    content: string;
    timestamp?: string;
    significance?: 'high' | 'medium' | 'low' | 'unknown';
}

export interface RLMMemoryResponse {
    relevant_memories: MemoryResult[];
    patterns_detected: string[];
    user_context: string;
    raw_response?: string;
    iterations?: number;
    success: boolean;
    error?: string;
}

export interface RLMQueryOptions {
    maxDepth?: number;
    maxIterations?: number;
}

/**
 * Query user's memory using RLM for intelligent recursive exploration.
 * Replaces traditional vector-based RAG with recursive LLM exploration.
 */
export async function queryMemoryRLM(
    userId: string,
    query: string,
    history: string,
    options: RLMQueryOptions = {}
): Promise<RLMMemoryResponse> {
    try {
        const response = await fetch(`${RLM_SERVICE_URL}/query`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                query,
                history,
                max_depth: options.maxDepth ?? 1,
                max_iterations: options.maxIterations ?? 20,
            }),
        });

        if (!response.ok) {
            throw new Error(`RLM service error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('[RLM] Query failed:', error);
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
 * Explore user's history for patterns and insights (no specific query).
 */
export async function exploreHistoryRLM(
    userId: string,
    history: string,
    options: RLMQueryOptions = {}
): Promise<RLMMemoryResponse> {
    try {
        const response = await fetch(`${RLM_SERVICE_URL}/explore`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                user_id: userId,
                query: '', // Explore doesn't need a query
                history,
                max_depth: options.maxDepth ?? 1,
                max_iterations: options.maxIterations ?? 30,
            }),
        });

        if (!response.ok) {
            throw new Error(`RLM service error: ${response.status}`);
        }

        return await response.json();
    } catch (error) {
        console.error('[RLM] Explore failed:', error);
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
 * Check if RLM service is available
 */
export async function checkRLMHealth(): Promise<boolean> {
    try {
        const response = await fetch(`${RLM_SERVICE_URL}/health`, {
            method: 'GET',
            signal: AbortSignal.timeout(2000),
        });
        return response.ok;
    } catch {
        return false;
    }
}

/**
 * Format RLM memories for injection into system prompt
 */
export function formatRLMMemoriesForPrompt(response: RLMMemoryResponse): string {
    if (!response.success || response.relevant_memories.length === 0) {
        return '';
    }

    let block = '\n### MEMORY CONTEXT (via RLM)\n';
    
    // Add relevant memories
    for (const mem of response.relevant_memories) {
        const sig = mem.significance ? `[${mem.significance.toUpperCase()}]` : '';
        block += `${sig} ${mem.content}\n`;
    }
    
    // Add patterns if detected
    if (response.patterns_detected.length > 0) {
        block += '\n**Detected Patterns:**\n';
        for (const pattern of response.patterns_detected) {
            block += `- ${pattern}\n`;
        }
    }
    
    // Add user context summary
    if (response.user_context) {
        block += `\n**User Context:** ${response.user_context}\n`;
    }
    
    return block;
}
