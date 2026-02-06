# Architecture

**Analysis Date:** 2026-02-06

## Pattern Overview

**Overall:** Monolithic Next.js app with server-side API routes, client components, and external service integration (RLM, AWS Bedrock, Supabase)

**Key Characteristics:**
- Next.js App Router with file-based routing
- Server-side import processing with multi-tier chunking
- RLM circuit breaker for fault tolerance
- AWS Bedrock for LLM operations (Claude Sonnet/Haiku)
- Supabase PostgreSQL for persistence and vector search
- Memory-aware file upload with chunked transfer for large files

## Layers

**Presentation Layer:**
- Purpose: Client-side UI components and pages
- Location: `app/` (pages), `components/`
- Contains: Page components (`.tsx`), client-side state management, forms, animations
- Depends on: Supabase client, API routes, local storage/IndexedDB
- Used by: Browser/users

**API Layer:**
- Purpose: HTTP endpoints for all server operations (import, chat, profile, memory)
- Location: `app/api/`
- Contains: 54+ route handlers, auth middleware, streaming responses
- Depends on: Supabase admin client, AWS Bedrock, RLM service, external APIs
- Used by: Frontend components, cron jobs, external services

**Service/Business Logic Layer:**
- Purpose: Reusable logic for memory search, LLM calls, soulprint generation, embedding
- Location: `lib/`
- Contains: RLM health management, memory querying, chat utilities, email sending
- Depends on: Supabase, AWS SDK, external service clients
- Used by: API routes

**Data Access Layer:**
- Purpose: Database abstraction and authenticated client creation
- Location: `lib/supabase/` (client.ts, server.ts, middleware.ts)
- Contains: Supabase client factories with auth context
- Depends on: @supabase/supabase-js
- Used by: API routes, client components, middleware

**External Integrations:**
- RLM Service: `https://soulprint-landing.onrender.com` - Remote memory with inference
- AWS Bedrock: Claude models for LLM, Titan for embeddings
- Supabase PostgreSQL: User profiles, memory chunks, chat history, learned facts
- Gmail OAuth2: Email notifications via nodemailer

## Data Flow

**User Import Flow:**

1. User navigates to `/import` (client component)
2. Uploads ChatGPT export (ZIP or JSON) via `uploadWithProgress()`
3. File sent to `/api/import/chunked-upload` (handles large files)
4. Raw storage path returned to client
5. Client triggers `/api/import/process-server` with storage path
6. Server downloads file from Supabase Storage
7. Extracts conversations.json and validates structure
8. Creates multi-tier chunks:
   - Tier 1: 100 chars (facts, names, dates)
   - Tier 2: 500 chars (context, topics)
   - Tier 3: 2000 chars (full conversation flow)
9. Sends chunks to RLM service: `POST /create-soulprint`
10. RLM returns soulprint_text
11. Store in `user_profiles.soulprint_text`
12. Set `import_status = 'complete'`
13. Send email notification
14. User can now chat

**Chat Flow:**

1. User enters message on `/chat` (client component)
2. Sent to `/api/chat` (POST)
3. Fetch user's soulprint_text from `user_profiles`
4. Build memory context with `getMemoryContext()`:
   - Query `conversation_chunks` for semantic similarity
   - Combine top chunks with system prompt
5. Try RLM service `/query` (with circuit breaker check):
   - Pass user message, history, soulprint_text, memory context
   - RLM returns response using user's memory + Claude
6. If RLM fails or circuit open: fallback to direct Bedrock call
   - Use Bedrock ConverseStream for streaming response
7. Save message to `chat_messages` table
8. Learn facts from conversation with `learnFromChat()`
9. Stream response back to client (Server-Sent Events)

**Memory Learning Flow:**

1. After chat response completes
2. Extract facts/names/topics from latest Q&A with `learnFromChat()`
3. Store in `learned_facts` table
4. Update `user_profiles.processed_chunks`

**State Management:**

- **User Profile:** Stored in `user_profiles` (soulprint, import_status, timestamps)
- **Chat History:** Stored in `chat_messages` (user_id, content, role, created_at)
- **Memory Chunks:** Stored in `memory_chunks` with pgvector embeddings
- **Learned Facts:** Stored in `learned_facts` (fact, category, timestamps)
- **Profile Customization:** `user_profiles` (ai_name, ai_avatar_url, settings)

## Key Abstractions

**RLM Circuit Breaker:**
- Purpose: Fast-fail when RLM service is down (avoid 60s timeouts)
- Examples: `lib/rlm/health.ts`
- Pattern: Three states (CLOSED → OPEN → HALF_OPEN)
- Tracks: Last failure time, consecutive failures, state transitions
- Behavior: Opens after 2 failures, tests recovery every 30s

**Memory Query Interface:**
- Purpose: Unified memory search supporting different chunk layers
- Examples: `lib/memory/query.ts`, `lib/memory/learning.ts`
- Pattern: Timeout-safe async operations with fallbacks
- Layers: Can search different tier sizes depending on query complexity

**Bedrock LLM Wrapper:**
- Purpose: Unified interface for Claude model calls (chat, JSON parsing, streaming)
- Examples: `lib/bedrock.ts`
- Pattern: Lazy client initialization, model abstraction (Sonnet/Haiku/Opus)
- Features: Timeout handling, JSON extraction from markdown blocks, streaming support

**Chunked Upload Manager:**
- Purpose: Handle files >100MB on mobile with automatic chunking
- Examples: `lib/chunked-upload.ts`
- Pattern: Client-side chunking with progress callbacks
- Handles: S3 multipart upload coordination, resume capability

## Entry Points

**Web Application Entry:**
- Location: `app/page.tsx` (landing page)
- Triggers: Page load in browser
- Responsibilities: Auth check → redirect to dashboard if authenticated, show marketing sections

**Import Entry:**
- Location: `app/import/page.tsx`
- Triggers: User navigates to /import
- Responsibilities: File upload UI, progress tracking, status polling

**Chat Entry:**
- Location: `app/chat/page.tsx`
- Triggers: Authenticated user navigates to /chat
- Responsibilities: Chat interface, message handling, streaming responses

**API Import Processing:**
- Location: `app/api/import/process-server/route.ts`
- Triggers: Client calls after upload completes
- Responsibilities: Download/extract/validate/chunk/embed/notify

**API Chat:**
- Location: `app/api/chat/route.ts`
- Triggers: User submits chat message
- Responsibilities: Fetch context, call RLM (or fallback), stream response, save history

**Middleware:**
- Location: `middleware.ts`
- Triggers: Every request matching `/((?!_next|favicon|static|images|svg).*).*`
- Responsibilities: Update Supabase auth session, refresh tokens

## Error Handling

**Strategy:** Graceful degradation with circuit breakers and fallbacks

**Patterns:**

- **RLM Service Down:** Circuit breaker opens → fallback to direct Bedrock LLM
- **Memory Search Timeout:** Returns null after 10s → uses soulprint_text directly
- **Embedding Timeout:** Skips embedding tier, uses available memory
- **Large File Upload:** Chunked multipart upload → resume on failure
- **Chat Generation Failure:** Retry with exponential backoff → fallback response
- **Email Send Failure:** 3 retry attempts with 1s/2s/4s delays

## Cross-Cutting Concerns

**Logging:** Console.log with `[ComponentName]` prefixes for easy grep/debugging

**Validation:**
- ZIP extraction: Checks for conversations.json existence
- ChatGPT export: Validates array structure, presence of mapping field
- User data: Type guards in profile validation (e.g., `validateProfile()`)

**Authentication:**
- Supabase OAuth via client + server auth flows
- Service role client for server operations (bypasses RLS)
- Header-based auth for internal server-to-server calls (`X-Internal-User-Id`)

**Rate Limiting:**
- Handled at API route level per endpoint need
- RLM service manages its own rate limits
- Bedrock API uses built-in quotas

**Security:**
- Row-level security on all tables (user_id checks)
- Service role client isolated to backend
- Environment variables for secrets (API keys, URLs)
- Chunked upload with validation before processing

---

*Architecture analysis: 2026-02-06*
