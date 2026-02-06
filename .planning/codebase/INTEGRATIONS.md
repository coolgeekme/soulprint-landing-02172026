# External Integrations

**Analysis Date:** 2026-02-06

## APIs & External Services

**LLM Services:**
- AWS Bedrock (Claude models)
  - SDK: `@aws-sdk/client-bedrock-runtime`
  - Models: Sonnet 3.5, Haiku 3.5, Opus 3
  - Auth: AWS credentials (AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY)
  - Usage: Chat completions, streaming responses, embeddings
  - Implementation: `lib/bedrock.ts`

**Search & Real-Time Information:**
- Tavily Web Search
  - SDK: `@tavily/core`
  - Auth: TAVILY_API_KEY
  - Purpose: Real-time web search results with scoring and content extraction
  - Implementation: `lib/search/tavily.ts`

- Perplexity API
  - Direct fetch integration (no SDK)
  - Auth: PERPLEXITY_API_KEY
  - Models: `sonar` (quick search), `sonar-deep-research` (comprehensive)
  - Purpose: Real-time factual queries, news, and deep research
  - Timeouts: 10s normal, 30s deep research
  - Implementation: `lib/search/perplexity.ts`

**Speech & Audio:**
- Deepgram (Speech-to-Text)
  - SDK: Direct HTTP API calls
  - Auth: DEEPGRAM_API_KEY
  - Model: nova-2 with punctuation and smart formatting
  - Purpose: Transcribe voice recordings for emotional signature analysis
  - Implementation: `app/api/voice/process/route.ts`

**Email Service:**
- Resend
  - SDK: `resend` package (6.9.1)
  - Auth: RESEND_API_KEY
  - From: `SoulPrint <noreply@soulprint.so>`
  - Purpose: Transactional emails (soulprint ready notifications)
  - Fallback: Nodemailer for non-critical emails
  - Implementation: `lib/email/send.ts`

**Notifications:**
- Web Push Notifications
  - SDK: `web-push` package
  - Storage: Subscription saved in user_profiles.push_subscription
  - Implementation: `app/api/push/subscribe/route.ts`

**Google Services:**
- Google APIs
  - SDK: `googleapis` package
  - Purpose: YouTube, Drive integration (not actively used in current code)

## Data Storage

**Databases:**
- Supabase (PostgreSQL)
  - Connection: NEXT_PUBLIC_SUPABASE_URL + NEXT_PUBLIC_SUPABASE_ANON_KEY
  - Auth: Supabase Auth (OAuth-based)
  - Tables:
    - `user_profiles` - User metadata, soulprint, import status, AI name
    - `conversation_chunks` - Searchable memory chunks with embeddings
    - `user_messages` - Chat history
    - `achievements` - Gamification tracking
  - Client: `@supabase/supabase-js`
  - Implementation: `lib/supabase/client.ts` (browser), `lib/supabase/server.ts` (SSR)

**File Storage:**
- Supabase Storage
  - Buckets: `imports` (ChatGPT export uploads), others
  - Purpose: Store original conversation exports and processed files
  - Chunk upload: Assembled via `app/api/import/chunked-upload/route.ts`

- AWS S3 / Cloudflare R2
  - SDK: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
  - Credentials: R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_ENDPOINT
  - Purpose: Alternative object storage (testing/backup)
  - Implementation: `app/api/test-r2/route.ts`

- Cloudinary
  - SDK: `cloudinary` package
  - Purpose: Image storage and manipulation (avatars, voice waveforms)
  - References: `cloudinaryUrl`, `cloudinaryPublicId` in types
  - Implementation: Used in avatar generation flow

**Vector Embeddings:**
- Bedrock Titan Embedding v2
  - Model: `amazon.titan-embed-text-v2:0`
  - Dimensions: 768 (configurable)
  - Purpose: Generate embeddings for memory chunks and similarity search
  - Implementation: `bedrockEmbed()` in `lib/bedrock.ts`

**Caching:**
- Not explicitly configured (could use Redis but not currently set up)
- In-memory chunk store for chunked uploads: `Map<string, chunks>` in `app/api/import/chunked-upload/route.ts`

## Authentication & Identity

**Auth Provider:**
- Supabase Auth
  - Implementation: `createClient()` in `lib/supabase/server.ts` and `lib/supabase/client.ts`
  - Methods: Email/password, OAuth providers (via Supabase)
  - Session Management: Cookie-based (30-day expiration) with Safari persistence fix
  - User Context: Available via `supabase.auth.getUser()`

## Monitoring & Observability

**Error Tracking:**
- Not detected (no Sentry, DataDog, or similar service)

**Logs:**
- Console-based logging throughout
  - Prefixed with service names: `[Chat]`, `[RLM Circuit]`, `[Tavily]`, `[Perplexity]`, etc.
  - No centralized logging service configured

**Health Checks:**
- RLM Circuit Breaker: `lib/rlm/health.ts`
  - Endpoint: GET `{RLM_SERVICE_URL}/health`
  - Timeout: 5 seconds
  - Circuit breaker pattern: CLOSED → OPEN → HALF_OPEN
  - Cooldown: 30 seconds before retry
- Manual endpoints: `app/api/admin/health/route.ts`, `app/api/admin/rlm-status/route.ts`

## CI/CD & Deployment

**Hosting:**
- Vercel (primary deployment target)
- Auto-deploys on git push to main
- Render.com (RLM service URL: https://soulprint-landing.onrender.com)

**CI Pipeline:**
- Not detected (no GitHub Actions, GitLab CI config)
- Vercel handles build and deployment automatically

## Environment Configuration

**Required env vars (critical):**
- NEXT_PUBLIC_SUPABASE_URL
- NEXT_PUBLIC_SUPABASE_ANON_KEY
- SUPABASE_SERVICE_ROLE_KEY
- AWS_REGION
- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- BEDROCK_MODEL_ID
- RLM_SERVICE_URL
- RESEND_API_KEY

**Optional env vars:**
- TAVILY_API_KEY (for web search)
- PERPLEXITY_API_KEY (for real-time info)
- DEEPGRAM_API_KEY (for speech transcription)
- R2_ENDPOINT, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET_NAME (for R2 storage)
- OPENAI_API_KEY (legacy, for fallback embeddings)

**Secrets location:**
- `.env.local` (local development only, never committed)
- Vercel environment variables (production)
- GitHub Secrets (for CI/CD if needed)

## Webhooks & Callbacks

**Incoming:**
- Email confirmation webhooks (Supabase Auth)
- Push notification subscription endpoints: `app/api/push/subscribe/route.ts`

**Outgoing:**
- Email notifications via Resend on import completion
- Potential webhook callbacks from RLM service (not currently active)
- No explicit webhook framework configured

## Service Dependencies & Flows

**Import Flow:**
1. User uploads ChatGPT export ZIP
2. Extracted via `jszip` in `lib/import/client-soulprint.ts`
3. Chunked upload: `app/api/import/chunked-upload/route.ts` → Supabase Storage
4. Processing: `app/api/import/process-server/route.ts`
5. Optional: RLM generation via RLM_SERVICE_URL
6. Embeddings: Bedrock Titan v2 for each chunk
7. Database save: Chunks → conversation_chunks, metadata → user_profiles
8. Notification: Email sent via Resend

**Chat Flow:**
1. User message → `app/api/chat/route.ts`
2. Memory retrieval: `lib/memory/query.ts` queries conversation_chunks
3. Real-time info: Tavily or Perplexity (if needed)
4. LLM: Bedrock ConverseStream for streaming response
5. Memory learning: `lib/memory/learning.ts` extracts facts from conversation
6. Response streamed back to client

**RLM Integration:**
- Service URL: RLM_SERVICE_URL environment variable
- Endpoints assumed:
  - GET /health
  - POST /create-soulprint (receives chunked conversations)
  - POST /query (memory context querying)
- Circuit breaker: Auto-fails fast if RLM down for 30s

---

*Integration audit: 2026-02-06*
