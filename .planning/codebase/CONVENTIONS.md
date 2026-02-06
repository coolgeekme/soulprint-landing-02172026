# Coding Conventions

**Analysis Date:** 2026-02-06

## Naming Patterns

**Files:**
- Kebab-case for most files: `telegram-chat-v2.tsx`, `theme-toggle.tsx`, `branch-manager.ts`
- PascalCase for React components: `Navbar.tsx`, `BreakpointDesktop.tsx`
- Lowercase for lib utilities: `utils.ts`, `email.ts`, `bedrock.ts`

**Functions:**
- camelCase for all functions: `getSupabaseAdmin()`, `embedQuery()`, `sendEmail()`, `getMemoryContext()`
- Prefix with verb for actions: `search*`, `create*`, `get*`, `format*`, `validate*`
- Async functions named without "async" prefix: `async function getMemoryContext()` not `getAsyncMemoryContext()`

**Variables:**
- camelCase for local variables: `queryEmbedding`, `userId`, `fileData`, `maxChunks`
- UPPERCASE_SNAKE_CASE for constants: `MAX_FILE_SIZE_MB`, `MEMORY_SEARCH_TIMEOUT_MS`, `BATCH_SIZE`, `CLAUDE_MODELS`
- Prefix meaningful names for clarity: `adminSupabase`, `queryEmbedding`, `internalUserId`, `usedChunksIDs`

**Types & Interfaces:**
- PascalCase for interfaces: `MemoryChunk`, `LearnedFactResult`, `ChatMessage`, `BedrockChatOptions`
- Suffix with Row for database types: `ChunkRpcRow`, `ChunkTableRow`, `LearnedFactRow`
- Suffix with Props for component props: `NavbarProps`
- Use `as const` for type-safe object literals: `validRoles = ['user', 'assistant'] as const`

## Code Style

**Formatting:**
- ESLint (v9) with Next.js config (`eslint.config.mjs`)
- No Prettier configured - uses ESLint defaults
- Tab indentation in tsconfig.json examples, 2-space indentation in code

**Linting:**
- Run: `npm run lint` (mapped to `eslint`)
- Uses `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Ignores: `.next/`, `out/`, `build/`, `next-env.d.ts`

**Quotes:**
- Single quotes for strings: `'use client'`, `'@/lib/supabase/server'`
- Template literals for dynamic strings: `` `[Memory] ${operationName} timed out` ``

## Import Organization

**Order:**
1. React/Next.js imports: `import { useState } from 'react'`, `import { NextResponse } from 'next/server'`
2. Third-party library imports: `import JSZip from 'jszip'`, `import { createClient } from '@supabase/supabase-js'`
3. AWS SDK imports grouped together: `import { BedrockRuntimeClient, ConverseCommand } from '@aws-sdk/client-bedrock-runtime'`
4. Internal library imports: `import { createClient } from '@/lib/supabase/server'`
5. Component/utility imports: `import { cn } from '@/lib/utils'`, `import { TelegramChatV2 } from '@/components/chat/telegram-chat-v2'`
6. Type imports: `import type { ClassValue } from 'clsx'`

**Path Aliases:**
- `@/*` maps to project root (configured in tsconfig.json)
- Use for all internal imports: `@/lib`, `@/components`, `@/app`

## Error Handling

**Patterns:**
- Try-catch blocks wrapping async operations in API routes
- Explicit error logging with context prefixes: `console.error('[Memory] Query failed:', error)`
- Return NextResponse with appropriate status codes (401, 400, 500)
- Graceful degradation on timeout: return empty array/object instead of throwing
- Specific error messages in responses: `{ error: 'Unauthorized' }`, `{ error: error.message }`

**Error Types:**
- Use Error constructor for custom errors: `throw new Error('Failed to download file from storage')`
- Log error details to console before returning to client
- Preserve error context for debugging

**Example Pattern:**
```typescript
try {
  const result = await someAsyncOperation();
  return NextResponse.json({ result });
} catch (error) {
  console.error('[ModuleName] Context:', error);
  return NextResponse.json({ error: 'User-friendly message' }, { status: 500 });
}
```

## Logging

**Framework:** Console (console.log, console.error, console.warn)

**Patterns:**
- Prefix log messages with module context in brackets: `[Memory]`, `[Email]`, `[ProcessServer]`, `[Chat]`, `[RLM]`
- Log at decision points and error conditions
- Use console.warn for timeout/fallback scenarios
- Use console.error for failures
- Use console.log for success confirmations: `console.log('[Email] Sent successfully on attempt 2')`

**Examples:**
```typescript
console.log(`[RLM] Found ${chunks.length} chunks across layers (Macro:${macroChunks.length}, Thematic:${thematicChunks.length}, Micro:${microChunks.length})`);
console.warn(`[Memory] ${operationName} timed out after ${timeoutMs}ms`);
console.error('[Chat] Name generation failed:', error);
console.log('[Memory] Learned facts retrieval failed:', error.message);
```

## Comments

**When to Comment:**
- Algorithm explanation: complex business logic, multi-tier chunking strategy
- Public function purposes: JSDoc for exported functions
- Non-obvious code paths: fallback logic, special cases
- Integration details: why external service is called, expected format

**JSDoc/TSDoc:**
- Used minimally - only for exported public functions
- Single-line format for simple functions
- Multi-line format with @param/@returns for complex functions

**Example:**
```typescript
/**
 * Embed a query using Cohere Embed v3 (with timeout protection)
 */
export async function embedQuery(text: string): Promise<number[]> {
  // Implementation
}

/**
 * Get Hierarchical (RLM) Context
 * Searches multiple layers to build a deep context window
 * Has overall timeout protection - returns empty context rather than hanging
 */
export async function getMemoryContext(
  userId: string,
  query: string,
  maxChunks: number = 5
): Promise<{ chunks: MemoryChunk[]; contextText: string; method: string; learnedFacts: LearnedFactResult[] }> {
  // Implementation
}
```

## Function Design

**Size:** Functions typically 20-100 lines, with specific purpose
- Async functions in API routes: 60-100 lines acceptable for full request handling
- Helper functions: 20-40 lines
- Retrieval/search functions: 30-80 lines

**Parameters:**
- Use object destructuring for multiple parameters: `{ to, subject, html, text }`
- Provide default values for optional params: `topK: number = 5`, `layerIndex?: number`
- Group related config into objects: `BedrockChatOptions` interface

**Return Values:**
- Always return objects with meaningful properties from API handlers: `{ success: boolean; error?: string; messageId?: string }`
- Tuple returns for multi-value results: `Promise<MemoryChunk[]>`
- Type-safe returns with explicit interface definitions

## Module Design

**Exports:**
- Named exports for utilities and helpers: `export async function embedQuery()`, `export function cn()`
- Default export only for pages and components: `export default function ChatPage()`
- Type exports: `export type ClaudeModel = keyof typeof CLAUDE_MODELS`
- Interface exports: `export interface MemoryChunk`

**Barrel Files:**
- Used in `/lib/mem0/index.ts`: re-exports for cleaner imports
```typescript
export type { ParsedMessage, Mem0Message, ChatGPTConversation } from './chatgpt-parser';
export type { Memory, SearchResult, AddMemoryResult, Mem0Config } from './client';
```

**File Organization:**
- One main export per file (can have supporting types/helpers)
- Related functions grouped by feature: query, embed, search functions together in `memory/query.ts`
- Helper functions at top of file, main exports at bottom

## Type Safety

**TypeScript:**
- Strict mode enabled: `"strict": true` in tsconfig.json
- Explicit type annotations on function parameters and returns
- Interface definitions for data structures: `interface ChunkRpcRow`, `interface UserProfile`
- Type narrowing and guards: `if (error.code === '42883') // Undefined function`, `(block): block is ContentBlock.TextMember => 'text' in block`
- Const assertions for type safety: `as const`, `as unknown`

**Validation:**
- Runtime validation of database responses: check for null/undefined before use
- Type guards for API responses: validate response shape before returning
- Safe array access: `(data || [])` fallback pattern
- Safe property access: `row.title || 'Untitled'`

---

*Convention analysis: 2026-02-06*
