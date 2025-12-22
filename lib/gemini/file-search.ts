import { gemini, DEFAULT_MODEL } from './client';
import type { FileSearchStore, UploadOperation, ChatMessage, GeminiChatResponse } from './types';

/**
 * Gemini File Search Service
 * Handles store management, file uploads, and RAG queries
 */

/**
 * Create a new File Search Store for a user
 */
export async function createFileSearchStore(displayName: string): Promise<FileSearchStore> {
    const store = await gemini.fileSearchStores.create({
        config: { displayName }
    });

    return {
        name: store.name!,
        displayName: store.displayName || displayName
    };
}

/**
 * Delete a File Search Store
 */
export async function deleteFileSearchStore(storeName: string): Promise<void> {
    await gemini.fileSearchStores.delete({
        name: storeName,
        config: { force: true }
    });
}

/**
 * List all File Search Stores
 */
export async function listFileSearchStores(): Promise<FileSearchStore[]> {
    const stores: FileSearchStore[] = [];
    const storeList = await gemini.fileSearchStores.list();

    for await (const store of storeList) {
        stores.push({
            name: store.name!,
            displayName: store.displayName || ''
        });
    }

    return stores;
}

/**
 * Upload content directly to a File Search Store
 * Returns the operation which can be polled for completion
 */
export async function uploadToFileSearchStore(
    storeName: string,
    content: string,
    displayName: string
): Promise<UploadOperation> {
    // Create a Blob from the content
    const blob = new Blob([content], { type: 'text/plain' });

    const operation = await gemini.fileSearchStores.uploadToFileSearchStore({
        fileSearchStoreName: storeName,
        file: blob,
        config: { displayName }
    });

    return {
        name: operation.name || '',
        done: operation.done || false,
        error: operation.error ? { message: String(operation.error) } : undefined
    };
}

/**
 * Poll an operation until complete
 */
export async function waitForOperation(
    operation: UploadOperation,
    maxWaitMs: number = 60000,
    pollIntervalMs: number = 2000
): Promise<UploadOperation> {
    const startTime = Date.now();
    let currentOp = operation;

    while (!currentOp.done && (Date.now() - startTime) < maxWaitMs) {
        await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

        // Pass operation name as string - cast to any for SDK compatibility
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const result = await gemini.operations.get({ operation: currentOp.name as any });
        currentOp = {
            name: result.name || currentOp.name,
            done: result.done || false,
            error: result.error ? { message: String(result.error) } : undefined
        };
    }

    return currentOp;
}

/**
 * Chat with RAG using File Search
 */
export async function chatWithFileSearch(
    messages: ChatMessage[],
    storeNames: string[],
    systemPrompt?: string
): Promise<GeminiChatResponse> {
    // Build contents array
    const contents: Array<{ role: string; parts: Array<{ text: string }> }> = [];

    // Add system instruction if provided (Gemini uses systemInstruction in config)
    for (const msg of messages) {
        if (msg.role === 'user' || msg.role === 'assistant') {
            contents.push({
                role: msg.role === 'assistant' ? 'model' : 'user',
                parts: [{ text: msg.content }]
            });
        }
    }

    const response = await gemini.models.generateContent({
        model: DEFAULT_MODEL,
        contents,
        config: {
            systemInstruction: systemPrompt,
            tools: storeNames.length > 0 ? [
                {
                    fileSearch: {
                        fileSearchStoreNames: storeNames
                    }
                }
            ] : undefined
        }
    });

    // Extract citations from grounding metadata
    const citations: GeminiChatResponse['citations'] = [];
    const groundingMetadata = response.candidates?.[0]?.groundingMetadata;

    if (groundingMetadata?.groundingChunks) {
        for (const chunk of groundingMetadata.groundingChunks) {
            if (chunk.retrievedContext) {
                citations.push({
                    source: chunk.retrievedContext.title || 'Unknown',
                    content: chunk.retrievedContext.text || ''
                });
            }
        }
    }

    return {
        text: response.candidates?.[0]?.content?.parts?.[0]?.text || '',
        citations: citations.length > 0 ? citations : undefined
    };
}

/**
 * Simple generation without RAG
 */
export async function generateContent(
    prompt: string,
    systemPrompt?: string
): Promise<string> {
    const response = await gemini.models.generateContent({
        model: DEFAULT_MODEL,
        contents: prompt,
        config: systemPrompt ? { systemInstruction: systemPrompt } : undefined
    });

    return response.candidates?.[0]?.content?.parts?.[0]?.text || '';
}
