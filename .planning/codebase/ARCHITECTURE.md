# Architecture

**Analysis Date:** 2026-02-01

## Pattern Overview

**Overall:** Next.js 16 full-stack application with client-server architecture using Server Actions, API routes, and middleware for authentication. The system implements a layered memory retrieval architecture with hierarchical context building.

**Key Characteristics:**
- Next.js App Router with client components for interactive UI and server actions for mutations
- Supabase for authentication, database, and vector similarity search
- AWS Bedrock (Claude 3.5 Haiku) for LLM inference and embeddings
- Multi-layer memory system with vector embeddings (RLM - Retrieval Layered Memory)
- Event-streaming responses with SSE (Server-Sent Events)
- Background sync for async processing of large imports
- User authentication with PKCE OAuth flow

## Layers

**Presentation Layer:**
- Purpose: User-facing React components with real-time chat interface and import workflows
- Location: `components/` and `app/*/page.tsx`
- Contains: Chat UI (`components/chat/telegram-chat-v2.tsx`), import forms, settings modals, landing page sections
- Depends on: Supabase client, API routes, state management (React hooks, refs)
- Used by: Browsers, PWA clients

**API & Route Layer:**
- Purpose: RESTful endpoints and server actions handling business logic
- Location: `app/api/*/route.ts` and `app/actions/*.ts`
- Contains: Chat processing, import analysis, profile updates, memory querying, admin operations
- Depends on: External services (AWS Bedrock, Supabase), utility functions in `lib/`
- Used by: Frontend components, cron jobs, background tasks

**Core Logic Layer:**
- Purpose: Reusable business logic for data transformation, analysis, and retrieval
- Location: `lib/` subdirectories (import/, memory/, search/, gamification/, email/)
- Contains: ChatGPT export parsing, soulprint generation, embedding/vector search, memory retrieval, web search integration
- Depends on: AWS SDK, Supabase SDK, external APIs (Perplexity, Tavily)
- Used by: API routes and server actions

**Data Layer:**
- Purpose: Database access, authentication, and external service integration
- Location: `lib/supabase/`, AWS SDK usage in routes and utilities
- Contains: Supabase client setup (server/client variants), middleware for session management, vector similarity RPCs
- Depends on: Supabase backend, AWS services
- Used by: All other layers

## Data Flow

**Chat Message Flow (Primary):**

1. User submits message via `components/chat/telegram-chat-v2.tsx`
2. `app/chat/page.tsx` queues message and calls `POST /api/chat`
3. `app/api/chat/route.ts`:
   - Authenticates user via Supabase
   - Fetches user profile (soulprint, ai_name)
   - Calls `getMemoryContext()` to search vector database for relevant memories
   - If deepSearch enabled: calls Perplexity or Tavily for web search context
   - Attempts RLM Service (external Python service) via `/query` endpoint
   - Falls back to Bedrock if RLM unavailable
   - Returns SSE stream with response chunks
4. Response is streamed to client in real-time
5. `learnFromChat()` saves interaction asynchronously for future retrieval

**Memory Retrieval Flow (RLM):**

1. Query comes from chat endpoint or search requests
2. `lib/memory/query.ts` receives user query
3. Query is embedded using Cohere Embed v3 via Bedrock
4. Vector embedding calls `match_conversation_chunks_layered` RPC on Supabase
5. Returns chunks from 3 layers: Macro (layer 5), Thematic (layer 3), Micro (layer 1)
6. Also searches learned_facts table for extracted key information
7. Formats context with layer information for LLM consumption
8. Falls back to keyword search if vector search fails

**Import & Soulprint Generation Flow:**

1. User uploads ChatGPT export (JSON or ZIP) via `app/import/page.tsx`
2. Frontend parses export using `lib/import/parser.ts`
3. Conversations are chunked into hierarchical layers (MICRO, THEMATIC, MACRO) via `lib/import/chunker.ts`
4. Client generates quick soulprint via `lib/import/client-soulprint.ts`
5. Chunks sent to `POST /api/import/process` (batch processing)
6. Server embeds chunks using Bedrock Cohere v3
7. Embeddings inserted into `conversation_chunks` table with layer indices
8. LLM analysis via `lib/import/personality-analysis.ts` extracts facts
9. Results displayed via progress polling

**Authentication Flow:**

1. User signs up/logs in via `components/auth/` forms
2. Form submission calls `signUp()` or `signIn()` server action in `app/actions/auth.ts`
3. Supabase handles credential validation and session creation
4. Session stored in secure cookies via `lib/supabase/middleware.ts`
5. Middleware refreshes token on every request
6. Routes protected by checking `supabase.auth.getUser()`

**State Management:**

- Local component state via `useState` for UI control (messages, loading, modals)
- Message queue pattern in `app/chat/page.tsx` using refs to handle concurrent messages
- Supabase session persisted via cookies (30-day max age)
- IndexedDB (browser storage) used temporarily during import for large datasets
- No global state management library; all state is local or session-based

## Key Abstractions

**SoulPrint (User Identity Model):**
- Purpose: Captures user personality, writing style, interests, and communication preferences from ChatGPT history
- Examples: `lib/import/soulprint.ts`, `lib/import/client-soulprint.ts`
- Pattern: Extract from conversations → Analyze with LLM → Generate AI persona (SOUL.md) → Use in system prompts

**Memory Chunks (Conversation Context):**
- Purpose: Split conversations into semantic pieces at 3 scales for efficient retrieval
- Examples: `conversation_chunks` table, `lib/memory/query.ts`
- Pattern: Store with embeddings and layer_index → Search by similarity → Combine by layer for hierarchical context

**AI Name & Persona:**
- Purpose: User-customizable AI identity generated from soulprint
- Examples: Auto-generated in `app/api/chat/route.ts`, user-named in chat via pattern matching
- Pattern: Generate once on first message → Store in `user_profiles.ai_name` → Refresh from database

**Search Adapters:**
- Purpose: Flexible search backends (Perplexity, Tavily, keyword)
- Examples: `lib/search/perplexity.ts`, `lib/search/tavily.ts`
- Pattern: User toggles Deep Search → Try primary provider → Fallback to secondary → Continue without if both fail

## Entry Points

**Landing Page:**
- Location: `app/page.tsx`
- Triggers: Initial visit or unauthenticated request
- Responsibilities: Check auth status, redirect authenticated users to chat, render marketing hero and feature sections

**Chat Page:**
- Location: `app/chat/page.tsx`
- Triggers: Authenticated user navigates to /chat or redirects after successful import
- Responsibilities: Load message history, manage message queue, poll memory status, display chat interface, handle AI naming

**Import Page:**
- Location: `app/import/page.tsx`
- Triggers: New user after signup or existing user manually visiting /import
- Responsibilities: Handle ChatGPT export upload, parse conversations client-side, generate quick soulprint, submit for embedding

**Chat API Endpoint:**
- Location: `app/api/chat/route.ts`
- Triggers: User sends message via chat UI
- Responsibilities: Authenticate, retrieve memories, search web if requested, call RLM or Bedrock, stream response

**Import Processing Endpoints:**
- Location: `app/api/import/*/route.ts`
- Triggers: Frontend submissions during import workflow
- Responsibilities: Parse export formats, generate soulprints, create embeddings, update import status

## Error Handling

**Strategy:** Graceful degradation with fallbacks and non-blocking async operations. Errors logged to console, user-friendly messages shown in UI.

**Patterns:**

1. **Chat Errors:** If RLM fails → Use Bedrock. If Bedrock fails → Return error message to user. If embedding fails → Skip memory context.

2. **Memory Errors:** If vector search fails (error code 42883: undefined function) → Fallback to keyword search. If all fail → Return empty context (chat still works).

3. **Search Errors:** If Perplexity fails → Try Tavily. If both fail → Continue without web search. Log errors for monitoring.

4. **Import Errors:** If import fails → Mark as `status: 'failed'` in database. User sees error banner. Can retry from import page.

5. **Auth Errors:** If session invalid → Redirect to login. If OAuth fails → Show error message, user can retry.

## Cross-Cutting Concerns

**Logging:** Console logging throughout with prefixes like `[Chat]`, `[RLM]`, `[SoulPrint]` for debugging. Server logs go to stderr/stdout. No structured logging framework.

**Validation:**
- Frontend: Form validation on inputs (name length, email format) before submission
- Backend: Type checking via TypeScript, Supabase row validation, JSON schema validation in imports
- Database: Constraints on user_id foreign keys, unique indexes on user_profiles

**Authentication:**
- Middleware-based: `lib/supabase/middleware.ts` runs on every request to refresh sessions
- Protected routes: Check `auth.getUser()` at start of protected endpoints
- Token rotation: Supabase handles via cookies

**Rate Limiting:** Not explicitly implemented; relies on API provider limits (Bedrock, Perplexity, Tavily) and implicit request throttling.

**Privacy:** User messages stored in database. No logs of embeddings. Imports marked as complete to prevent re-processing. Users can sign out to clear sessions.

---

*Architecture analysis: 2026-02-01*
