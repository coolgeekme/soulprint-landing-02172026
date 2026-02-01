# Testing Patterns

**Analysis Date:** 2026-02-01

## Test Framework

**Runner:**
- Not detected - no test framework configured in `package.json`
- No jest.config.js, vitest.config.ts, or similar found in codebase
- No test dependencies listed (no `@testing-library/react`, `jest`, `vitest`, etc.)

**Assertion Library:**
- Not applicable - no test framework installed

**Run Commands:**
```bash
npm run lint              # Lint code (ESLint)
npm run build             # Build project (Next.js)
npm run dev               # Development mode
```

**Current Status:** Production code tested manually. No automated test suite present.

## Test File Organization

**Location:**
- No test files found in project source tree (`app/`, `components/`, `lib/`)
- Only node_modules contains test files (from dependencies like `zod`, `jimp`)

**Naming:**
- Not applicable - no custom tests

**Structure:**
- Not applicable - no test framework in use

## Testing Gaps & Recommendations

**Critical Areas Without Tests:**

### Server Actions (app/actions/auth.ts)
- Sign-up flow: form validation, error handling, referral code processing
- Sign-in flow: credential validation, session creation
- Sign-out flow: cookie cleanup, session termination
- Google OAuth: callback handling, token refresh

**Recommendation:** Add integration tests for auth flows with mocked Supabase client

### API Routes - Chat (app/api/chat/route.ts)
- User authentication and authorization
- RLM service fallback logic (try RLM, fall back to Bedrock)
- Web search integration (Perplexity + Tavily fallback)
- Memory context retrieval and usage
- System prompt generation based on user profile
- Error handling for external service failures
- SSE (Server-Sent Events) response format

**Recommendation:** Unit tests for `buildSystemPrompt()`, integration tests for POST handler with mocked services

### Import Processing (app/import/page.tsx, lib/import/*)
- File upload and validation
- ZIP extraction and parsing
- Soulprint generation with LLM
- Embedding creation and storage
- Error handling for large files
- Progress tracking simulation
- Client-side vs server-side processing logic

**Recommendation:** Unit tests for parser/chunker, integration tests for end-to-end import with fixtures

### Memory System (lib/memory/*)
- Query embedding and similarity search
- Memory context retrieval
- Learning from conversations
- Vector storage operations

**Recommendation:** Unit tests with mocked Supabase vectors

### Email Service (lib/email.ts, lib/email/send.ts)
- Email composition and formatting
- Nodemailer transporter setup
- HTML template rendering
- Resend fallback behavior

**Recommendation:** Unit tests with mocked transporter, snapshot tests for email HTML

## Mocking

**Framework:** Not established - no test framework means no mocking library in use

**What Would Need Mocking (if tests were added):**
- `@supabase/supabase-js` - all database/auth operations
- `@aws-sdk/client-bedrock-runtime` - LLM inference
- `fetch()` - external API calls (Perplexity, Tavily, RLM service)
- `nodemailer` - email sending
- `next/cache`, `next/navigation` - Next.js internals
- File system operations (JSZip, storage uploads)

**Recommended Approach:**
```typescript
// Example structure if tests were added
import { vi } from 'vitest'; // or jest

// Mock Supabase
vi.mock('@/lib/supabase/server', () => ({
  createClient: vi.fn(() => ({
    auth: {
      getUser: vi.fn(),
      signUp: vi.fn(),
      signOut: vi.fn(),
    },
    from: vi.fn(),
  })),
}));

// Mock AWS Bedrock
vi.mock('@aws-sdk/client-bedrock-runtime', () => ({
  BedrockRuntimeClient: vi.fn(),
  ConverseCommand: vi.fn(),
}));

// Mock fetch for API calls
global.fetch = vi.fn();
```

## Fixtures and Factories

**Test Data:**
- Not applicable - no test framework active

**What Fixtures Would Be Needed:**
- Sample ChatGPT export ZIP files (small, medium, large)
- Sample parsed conversation data
- Sample user profiles with various personality types
- Sample memory embeddings and search results
- Mock API responses from Perplexity, Tavily, RLM
- Mock Bedrock model responses

**Suggested Location (if tests added):**
- `tests/fixtures/` - raw test data (ZIP files, JSON samples)
- `tests/factories/` - factory functions to generate test objects
- `tests/mocks/` - mock implementations of services

## Coverage

**Requirements:** Not enforced - no test infrastructure

**Target (Recommended):**
- Server actions: 80%+ (critical auth paths)
- API routes: 80%+ (core business logic)
- Utility functions: 90%+ (parsing, chunking, formatting)
- Components: 70%+ (UI rendering, event handling)
- Overall: 75%+

## Test Types

**Unit Tests:**
- **Scope:** Individual functions in `lib/` directory
- **Examples to test:**
  - `parseExportZip()` - ZIP parsing logic
  - `chunkConversations()` - text chunking algorithm
  - `sampleConversations()` - sampling logic
  - `buildSystemPrompt()` - prompt generation
  - `cn()` utility - classname merging
  - Email formatters - HTML generation
- **Approach:** Mock external dependencies, test pure logic

**Integration Tests:**
- **Scope:** API routes, auth actions, full workflows
- **Examples to test:**
  - `/api/chat` POST - full request/response cycle
  - Sign-up flow - form submission through session creation
  - Import flow - file upload through soulprint generation
  - Memory queries - embedding through context retrieval
- **Approach:** Mock external services but preserve internal flow

**E2E Tests:**
- **Framework:** Not implemented
- **Approach (if added):** Use Playwright or Cypress for real browser testing
- **Key flows to automate:**
  - Auth signup/signin/signout cycle
  - Import process (start to completion)
  - Chat interaction with memory integration
  - UI state transitions

## Common Patterns to Test (When Framework Added)

**Async Testing:**
```typescript
// Pattern observed in codebase - if tests were added:
describe('Chat API', () => {
  it('should retrieve memory context before calling Bedrock', async () => {
    // Mock getMemoryContext to return test data
    vi.mocked(getMemoryContext).mockResolvedValue({
      contextText: 'relevant memories',
      chunks: [{ id: '1', content: 'memory' }],
      method: 'similarity'
    });

    // Call POST handler
    const response = await POST(mockRequest);

    // Assert getMemoryContext was called
    expect(getMemoryContext).toHaveBeenCalledWith(userId, message, 5);
  });
});
```

**Error Testing:**
```typescript
// Based on error handling pattern in codebase
describe('API Error Handling', () => {
  it('should return 401 for unauthorized requests', async () => {
    // Mock auth to return no user
    vi.mocked(createClient).mockReturnValue({
      auth: { getUser: vi.fn().mockResolvedValue({ data: { user: null } }) }
    });

    const response = await POST(mockRequest);

    expect(response.status).toBe(401);
    expect(await response.json()).toEqual({ error: 'Unauthorized' });
  });

  it('should fall back to Bedrock if RLM service fails', async () => {
    // Mock RLM to return null (service unavailable)
    vi.mocked(tryRLMService).mockResolvedValue(null);

    // Mock Bedrock to return response
    vi.mocked(bedrockClient.send).mockResolvedValue({ ... });

    const response = await POST(mockRequest);

    expect(response.ok).toBe(true);
  });
});
```

## Manual Testing Approach (Current)

**Testing Currently Performed:**
1. **Development mode** (`npm run dev`) - manual browser testing
2. **Production deployment** - manual testing in staging/preview environments (Vercel)
3. **Linting** - `npm run lint` for code quality
4. **Build verification** - `npm run build` before deployment

**Testing Checklist for New Features:**
- Lint passes (`npm run lint`)
- Build succeeds (`npm run build`)
- Manual browser testing in dev mode
- Edge cases tested manually (large files, network errors, edge auth states)
- API responses validated in browser DevTools

## Recommended Next Steps

1. **Install test framework:**
   ```bash
   npm install -D vitest @testing-library/react @testing-library/jest-dom @vitest/ui
   ```

2. **Create test structure:**
   ```
   tests/
   ├── unit/
   │   ├── lib/
   │   │   ├── parser.test.ts
   │   │   ├── chunker.test.ts
   │   │   └── utils.test.ts
   │   └── actions/
   │       └── auth.test.ts
   ├── integration/
   │   ├── api/
   │   │   ├── chat.test.ts
   │   │   └── import.test.ts
   │   └── workflows/
   │       └── auth-flow.test.ts
   ├── fixtures/
   │   └── chatgpt-export.zip
   └── mocks/
       ├── supabase.ts
       └── bedrock.ts
   ```

3. **Start with highest-impact tests:** Auth actions, API routes, parser logic

4. **Configure coverage:** Set up coverage reporting with target of 75%+

---

*Testing analysis: 2026-02-01*
