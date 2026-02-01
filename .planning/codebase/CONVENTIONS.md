# Coding Conventions

**Analysis Date:** 2026-02-01

## Naming Patterns

**Files:**
- Components: PascalCase with `.tsx` extension (e.g., `ChatMessage.tsx`, `AchievementToast.tsx`)
- Page routes: lowercase with hyphens (e.g., `page.tsx`, `import/page.tsx`)
- API routes: lowercase with hyphens in path structure (e.g., `/api/chat/route.ts`, `/api/import/queue-processing.ts`)
- Utilities/helpers: camelCase with `.ts` extension (e.g., `utils.ts`, `parser.ts`, `chunker.ts`)
- Directories: lowercase with hyphens for multi-word directories (e.g., `chat`, `import`, `email`)

**Functions:**
- Async functions: camelCase, often prefixed with `handle` (handlers) or descriptive verb (e.g., `handleFile`, `fetchUserProfile`, `embedChunks`)
- Helper functions: camelCase, exported with `export` keyword (e.g., `generateClientSoulprint`, `getMemoryContext`)
- Private/internal functions: camelCase, lowercase, no export (e.g., `getBedrockClient`, `extractContent`)

**Variables:**
- State variables: camelCase (e.g., `email`, `status`, `isLoading`, `hasError`)
- Constants: UPPERCASE_SNAKE_CASE for global constants (e.g., `EMBEDDING_BATCH_SIZE`, `DB_NAME`)
- Boolean variables: prefix with `is`, `has`, or `can` (e.g., `isMobileDevice`, `hasSoulprint`, `dragActive`)
- React state setters: `set` prefix (e.g., `setStatus`, `setProgress`, `setError`)

**Types:**
- Interfaces: PascalCase prefix, explicit `Props` suffix for component props (e.g., `SignUpModalProps`, `ToastProps`, `UserProfile`)
- Type aliases: PascalCase, can use suffixes like `Status`, `State` (e.g., `ImportStatus`, `ChatMessage`)
- Union types for status: camelCase string literals (e.g., `'idle' | 'processing' | 'success' | 'error'`)

## Code Style

**Formatting:**
- ESLint with Next.js core-web-vitals and TypeScript configs (see `eslint.config.mjs`)
- No explicit Prettier config; relies on ESLint defaults
- Indentation: 2 spaces (inferred from codebase)
- Line length: no strict limit enforced, but files typically stay under 80-100 chars for readability where possible
- Quotes: Single quotes for strings (e.g., `'use server'`, `'auth'`)
- Semicolons: Required at end of statements

**Linting:**
- Tool: ESLint (config: `eslint.config.mjs`)
- Extends: `eslint-config-next/core-web-vitals` and `eslint-config-next/typescript`
- Global ignores: `.next/**`, `out/**`, `build/**`, `next-env.d.ts`
- Run: `npm run lint` (command defined in `package.json` but incomplete in code)

## Import Organization

**Order:**
1. External dependencies (Node.js, third-party packages)
2. Next.js imports (`next/`, `next-themes`, etc.)
3. Internal absolute imports (using `@/` alias)
4. Local relative imports (same directory)

**Examples from codebase:**
```typescript
// From app/actions/auth.ts
import { revalidatePath } from 'next/cache'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import { createClient } from '@/lib/supabase/server'
import { recordReferral } from './referral'

// From app/import/page.tsx
import Link from 'next/link';
import { useState, useRef, useEffect, Suspense } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { AnimatePresence, motion } from 'framer-motion';
import { Upload, Shield, CheckCircle2, AlertCircle, Loader2, Lock, ExternalLink, Settings, Mail, Download, FileArchive, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { generateClientSoulprint, type ClientSoulprint } from '@/lib/import/client-soulprint';
```

**Path Aliases:**
- `@/`: Project root, used for all internal absolute imports
- Configured in `tsconfig.json`: `"@/*": ["./*"]`
- Used consistently for components, lib, app imports across codebase

## Error Handling

**Patterns:**
- Try-catch blocks for async operations, especially external API calls
- Explicit error logging with context-specific prefixes (e.g., `[Chat]`, `[Email]`, `[Import]`)
- Early returns for validation failures
- Error messages propagated up to UI or returned as object properties
- HTTP error responses use standard status codes (401, 400, 500)

**Examples:**
```typescript
// From lib/email.ts
try {
  const result = await transporter.sendMail(mailOptions);
  return { success: true, messageId: result.messageId };
} catch (error) {
  console.error('[Email] Send failed:', error);
  return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
}

// From app/api/chat/route.ts
if (authError || !user) {
  return new Response(
    JSON.stringify({ error: 'Unauthorized' }),
    { status: 401, headers: { 'Content-Type': 'application/json' } }
  );
}

// Error propagation in components (app/import/page.tsx)
catch (err) {
  console.error('Import error:', err);
  let userMessage = 'Processing failed. Please try again.';
  if (err instanceof Error) {
    const msg = err.message.toLowerCase();
    if (msg.includes('network') || msg.includes('fetch')) {
      userMessage = 'Network error. Please check your connection and try again.';
    }
    // ... more mappings
  }
  setErrorMessage(userMessage);
  setStatus('error');
}
```

## Logging

**Framework:** `console` methods (log, error, warn)

**Patterns:**
- Context prefix in square brackets: `[ContextName]` (e.g., `[Chat]`, `[Email]`, `[Import]`, `[Bedrock]`)
- Info/progress: `console.log('[Context] Message')` - logs user-relevant progress
- Errors: `console.error('[Context] Error description:', error)` - logs actual error objects
- Warnings: `console.log('[Context] Warning message')` - logs non-blocking issues
- Location: Server-side routes and lib files log extensively; client components log minimally

**Examples:**
```typescript
console.log('[Chat] Calling RLM service...');
console.error('[Chat] Perplexity failed, trying Tavily fallback:', error);
console.log('[Import] Upload success:', data);
console.error('[Import] Storage upload error:', error);
console.log('[Email] Resend not configured, skipping email');
```

## Comments

**When to Comment:**
- Complex algorithms or non-obvious logic (e.g., tree traversal in `parser.ts`)
- Business logic explanations (e.g., why we sign out first in auth)
- TODO/FIXME for incomplete work (use `//` inline, not block comments)
- Function purposes in libraries, especially public APIs
- Configuration/feature toggles

**JSDoc/TSDoc:**
- Used minimally in codebase; not every function has JSDoc
- When used, provides brief context (see `parser.ts`: `/** ChatGPT Export Parser */`)
- Interface documentation inlined where needed
- No strict enforce TSDoc on all exports

**Examples:**
```typescript
// From parser.ts
/**
 * ChatGPT Export Parser
 * Parses conversations.json from a ChatGPT data export ZIP
 */

/**
 * Parse a ChatGPT export ZIP file and extract conversations
 */
export async function parseExportZip(zipBuffer: Buffer): Promise<ParsedConversation[]>

// From auth.ts
// Sign out any existing session first to prevent data bleeding
await supabase.auth.signOut()

// From page.tsx
// Detect mobile devices (conservative - if unsure, treat as mobile)
function isMobileDevice(): boolean
```

## Function Design

**Size:**
- Prefer smaller functions (under 50 lines for clarity)
- Longer functions acceptable for page components (e.g., `app/import/page.tsx` is 800+ lines, justified by UI complexity)
- API route handlers group related logic (status check, processing, response) in single function

**Parameters:**
- Typed parameters explicitly with TypeScript
- Destructuring for objects when multiple params
- Optional parameters use `?` notation (e.g., `onProgress?: (processed: number, total: number) => void`)
- Default values in parameter list (e.g., `voiceVerified = true`)

**Return Values:**
- Async functions return typed Promise (e.g., `Promise<ParsedConversation[]>`, `Promise<{ success: boolean; error?: string }>`)
- Objects returned for multi-value returns (success + error or data + status)
- No implicit returns; explicit return statements or early returns
- Union return types for conditional logic (success or error response)

**Examples:**
```typescript
// Multiple returns via object
export async function sendEmail({ to, subject, html, text }: SendEmailOptions): Promise<{ success: boolean; error?: string; messageId?: string }>

// Typed async function
export async function parseExportZip(zipBuffer: Buffer): Promise<ParsedConversation[]>

// Optional parameter with default
async function tryRLMService(
  userId: string,
  message: string,
  soulprintText: string | null,
  history: ChatMessage[],
  webSearchContext?: string
): Promise<RLMResponse | null>
```

## Module Design

**Exports:**
- Each module exports named functions/types, rarely default exports (except Page components which must be default)
- Public APIs clearly marked as `export` keyword
- Private functions (helpers) stay lowercase, no export
- Types exported alongside implementation (e.g., `export interface ChatMessage`, `export type ImportStatus`)

**Barrel Files:**
- Not used extensively in this codebase
- Each module is self-contained (import directly from source file, not via index)
- Exception: UI component libs may group shared utilities

**Examples:**
```typescript
// lib/utils.ts - simple re-export
export function cn(...inputs: ClassValue[]) { ... }

// lib/import/parser.ts - exports types and function
export interface ChatGPTMessage { ... }
export interface ParsedConversation { ... }
export async function parseExportZip(zipBuffer: Buffer): Promise<ParsedConversation[]>

// app/page.tsx - required default export for Next.js page
export default function ImportPage() { ... }
```

---

*Convention analysis: 2026-02-01*
