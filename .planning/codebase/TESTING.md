# Testing Patterns

**Analysis Date:** 2026-02-06

## Test Framework

**Current Status:**
- No automated test framework configured
- No Jest, Vitest, or other test runner installed
- No test files found in codebase (*.test.ts, *.spec.ts)

**Available for Setup:**
- ESLint for linting (configured)
- TypeScript for type checking (enabled with strict mode)
- Next.js built-in dev server for manual testing

**Recommended Setup (if implementing):**
- Vitest for unit testing (fast, ESM-native, TypeScript-first)
- Testing Library for component testing
- Jest as alternative if preferred

## Test Coverage Status

**Gaps:**
- API route handlers (`/app/api/**`) have no unit tests
- Memory/search functions (`/lib/memory/query.ts`, `/lib/search/**`) untested
- Email sending logic (`lib/email.ts`) untested
- Supabase integration functions untested
- AWS Bedrock integrations untested
- React components untested

**Manual Testing Approach:**
This codebase relies on:
1. TypeScript strict mode for compile-time safety
2. ESLint for code quality
3. Manual browser testing via Next.js dev server
4. Integration testing through live API endpoints

## Type-Driven Development (Current Approach)

**TypeScript as Validation:**
- All data structures have explicit interfaces: `MemoryChunk`, `ChatMessage`, `UserProfile`
- Function parameters typed with strict mode enabled
- Return types explicitly declared: `Promise<MemoryChunk[]>`, `Promise<{ chunks: MemoryChunk[]; contextText: string; method: string; learnedFacts: LearnedFactResult[] }>`

**Example Type Safety in Place:**
```typescript
interface MemoryChunk {
  id: string;
  title: string;
  content: string;
  created_at: string;
  similarity: number;
  layer_index: number;
}

interface ChunkRpcRow {
  id: string;
  title: string | null;
  content: string;
  created_at: string;
  similarity: number;
  layer_index: number | null;
}

export async function searchMemoryLayered(
  userId: string,
  query: string,
  topK: number = 5,
  minSimilarity: number = 0.3,
  layerIndex?: number,
  queryEmbed?: number[]
): Promise<MemoryChunk[]> {
  // Implementation with strict type checking
}
```

## Manual Testing Patterns

**API Route Testing:**
- Use API client (curl, Postman, fetch) to test endpoints
- Check response status codes and JSON structure
- Verify authentication with auth header validation
- Log request/response for debugging

**Example Routes Requiring Manual Testing:**
- `POST /api/chat/messages` - Save and load chat history
- `GET /api/memory/query` - Vector search with timeout
- `POST /api/import/process-server` - Large file processing
- `POST /api/soulprint/generate` - RLM integration

**Common Error Scenarios to Test:**
- Missing authentication (should return 401)
- Invalid request body (should return 400)
- Service timeout (should return empty/fallback)
- Database connection failure (should return 500)

## Error Handling Testing

**Current Patterns to Verify:**
1. **Timeout Protection:** Functions wrapped with `withTimeout()` should return null on timeout
   - `embedQuery()` - 15 second timeout
   - `searchMemoryLayered()` - 10 second timeout
   - `getMemoryContext()` - 30 second timeout
   - Expected behavior: return empty array, not throw

2. **Graceful Degradation:**
   - Vector search fails → fallback to keyword search
   - Example in `/lib/memory/query.ts` lines 387-391
   - Test: verify fallback works when vector search unavailable

3. **Retry Logic:**
   - Email sending retries 3 times with exponential backoff
   - File uploads use chunked upload with retry
   - Test: simulate failure, verify retry occurs

4. **Fallback Values:**
   - Missing AI name → defaults to "Echo"
   - Missing chunk title → defaults to "Untitled"
   - Missing layer index → defaults to 1
   - Test: verify defaults applied when null

**Testing Error Paths:**
```typescript
// Pattern from lib/memory/query.ts:
async function withTimeout<T>(
  promise: Promise<T>,
  timeoutMs: number,
  operationName: string
): Promise<T | null> {
  const timeoutPromise = new Promise<null>((resolve) => {
    setTimeout(() => {
      console.warn(`[Memory] ${operationName} timed out after ${timeoutMs}ms`);
      resolve(null);
    }, timeoutMs);
  });
  return Promise.race([promise, timeoutPromise]);
}

// Test by intentionally slow-running operations and verifying null return
```

## Component Testing Approach

**Current Components:**
- React components in `/components/**/*.tsx`
- Client components marked with `'use client'`
- Page components in `/app/**/*.tsx`

**Component Testing Strategy (No Framework):**
1. Manual browser testing via `npm run dev`
2. Check component renders without errors
3. Verify state management with browser devtools
4. Test user interactions (clicks, form inputs)
5. Verify API calls using browser Network tab

**Example Component to Test Manually:**
- `/app/chat/page.tsx` - Complex state management, message queue
- Load chat, send message, verify API call, check history loads
- Navigate away and back, verify memory persistence
- Check responsive behavior at different breakpoints

## Integration Testing Areas

**API Integration Tests (Manual/No Framework):**

1. **Chat Flow:**
   - User logs in → queries `/api/chat/messages`
   - User sends message → POST to `/api/chat`
   - Verify RLM integration works
   - Check memory context is retrieved

2. **Memory System:**
   - Query embeddings via Bedrock
   - Search chunks with vector similarity
   - Verify layer filtering works
   - Check keyword fallback on vector search failure

3. **Import Flow:**
   - User uploads ZIP file
   - Server processes and chunks
   - RLM generates soulprint
   - Email sent on completion
   - User can now chat

4. **Voice Processing:**
   - User uploads voice file
   - Verify enrollment/verification endpoints
   - Check transcription and storage

## Mocking Strategy (If Tests Implemented)

**What to Mock:**
- AWS Bedrock API calls (expensive, external dependency)
- Supabase database queries (would need test database)
- Email sending (Resend/Gmail APIs)
- External search APIs (Perplexity, Tavily)
- File storage operations

**What NOT to Mock:**
- Core business logic (chunking, searching, memory)
- Type validation
- Timeout utilities
- Fallback/retry logic

**Mocking Examples (for future test setup):**
```typescript
// Mock Bedrock client
vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: vi.fn(),
  InvokeModelCommand: vi.fn(),
}));

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    from: vi.fn().mockReturnValue({
      select: vi.fn().mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({ data: { id: 'test' }, error: null }),
        }),
      }),
    }),
  })),
}));

// Mock email
vi.mock('@/lib/email/send', () => ({
  sendEmail: vi.fn().mockResolvedValue({ success: true }),
}));
```

## Run Commands

**Current Setup:**
```bash
npm run dev              # Start dev server with live reload
npm run build           # Build for production
npm run lint            # Run ESLint
npm start               # Start production server
```

**Testing Commands (None Configured):**
- No `npm test` script exists
- No coverage reports generated
- No CI/CD test stage configured

**Manual Testing Process:**
1. `npm run dev` - Start development server
2. Open http://localhost:3000 in browser
3. Navigate to feature/page
4. Test user interactions
5. Check browser console for errors
6. Open DevTools Network tab to verify API calls
7. Check application state in React DevTools

## Health Checks & Verification

**Built-in Endpoints:**
- `GET /api/health/supabase` - Supabase connection
- `GET /api/admin/health` - General system health
- `GET /api/rlm/health` - RLM service status
- `GET /api/chat/health` - Chat API status

**Use These for Manual Testing:**
```bash
curl http://localhost:3000/api/health/supabase
curl http://localhost:3000/api/rlm/health
```

## Key Areas Requiring Careful Testing

**1. Memory Search (`/lib/memory/query.ts`):**
- Test vector embedding with different query lengths
- Test layered search with specific layer indices
- Test timeout behavior (set timeout to 100ms, verify returns empty)
- Test fallback from vector to keyword search
- Test learned facts retrieval

**2. Import Processing (`/app/api/import/process-server/route.ts`):**
- Test with various ZIP file sizes (<100MB, >100MB, >500MB)
- Verify conversations.json parsing
- Check multi-tier chunking (100, 500, 2000 char tiers)
- Test RLM integration for soulprint generation
- Verify email notification sent

**3. Chat API (`/app/api/chat/route.ts`):**
- Test with and without memory context
- Verify AI name generation (should use soulprint)
- Test memory learning on each message
- Verify source citations in responses
- Test with different model temperatures

**4. Timeout Protection:**
- All async operations in memory search have explicit timeouts
- Test by artificially slowing operations
- Verify graceful degradation (empty results, not crash)

## Development Best Practices

**Before Committing:**
1. Run `npm run lint` - no ESLint errors
2. Test in browser manually - feature works as expected
3. Check console - no JavaScript errors
4. Verify API responses - correct status codes and data
5. Test error scenarios - auth failure, timeout, invalid input

**Type Checking:**
- TypeScript strict mode catches many issues at compile time
- Run `npm run build` to verify no type errors
- Use explicit return types on functions

---

*Testing analysis: 2026-02-06*
