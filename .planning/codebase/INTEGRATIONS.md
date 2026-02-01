# External Integrations

**Analysis Date:** 2026-02-01

## APIs & External Services

**LLM / AI Models:**
- AWS Bedrock (Claude 3.5 Haiku) - Primary LLM for chat responses
  - SDK: `@aws-sdk/client-bedrock-runtime`
  - Auth: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`
  - Model ID: `us.anthropic.claude-3-5-haiku-20241022-v1:0`
  - Used in: `app/api/chat/route.ts`, `app/api/import/create-soulprint/route.ts`, `app/api/memory/synthesize/route.ts`

- OpenAI - Embeddings, transcription, and fallback generation
  - SDK: `openai`
  - Auth: `OPENAI_API_KEY`
  - Features: Embeddings (text-embedding-3-small), Whisper transcription, image generation
  - Used in: `app/api/transcribe/route.ts`, `app/api/embeddings/process/route.ts`, `app/api/import/process/route.ts`

- Google Gemini - Image generation for AI avatars
  - SDK: Via REST API (no SDK)
  - Auth: `GEMINI_API_KEY`
  - Endpoint: Not directly exposed (called via Cloudinary)
  - Used in: `app/api/profile/ai-avatar/route.ts`

**Web Search & Information Retrieval:**
- Perplexity AI (Sonar model) - Real-time web search with citations
  - SDK: Custom HTTP wrapper in `lib/search/perplexity.ts`
  - Auth: `PERPLEXITY_API_KEY`
  - Endpoint: `https://api.perplexity.ai/chat/completions`
  - Features: Real-time search, citations, deep research mode (30s timeout)
  - Used in: `app/api/chat/route.ts`, `lib/search/perplexity.ts`

- Tavily API - Fallback web search for current events
  - SDK: `@tavily/core`
  - Auth: `TAVILY_API_KEY`
  - Features: Web search results, answer extraction
  - Used in: `app/api/chat/route.ts`, `lib/search/tavily.ts`

**RLM Service (Memory Retrieval & Learning):**
- Custom microservice hosted on Render
  - Service URL: `RLM_SERVICE_URL` (https://soulprint-landing.onrender.com)
  - Endpoint: `/query` (POST)
  - Purpose: Memory context retrieval and dynamic response generation
  - Fallback behavior: Falls back to Bedrock if RLM unavailable
  - Used in: `app/api/chat/route.ts`

## Data Storage

**Databases:**
- Supabase (PostgreSQL)
  - Connection: `NEXT_PUBLIC_SUPABASE_URL`
  - Service Role Key: `SUPABASE_SERVICE_ROLE_KEY`
  - Anon Key: `NEXT_PUBLIC_SUPABASE_ANON_KEY`
  - ORM/Client: `@supabase/supabase-js` 2.93.1, `@supabase/ssr` 0.8.0
  - Tables: `user_profiles`, `import_jobs`, `conversation_chunks`, `user_memories`, `pending_waitlist`, `gamification_*`
  - Features: Auth, storage, real-time subscriptions, vector search (pgvector for embeddings)
  - Used in: Nearly all API routes and utilities

**File Storage:**
- Cloudflare R2 (AWS S3-compatible) - Primary file uploads
  - Connection: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
  - SDK: `@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`
  - Bucket: `soulprint-uploads`
  - Used in: `app/api/import/upload/route.ts`, `app/api/test-r2/route.ts`

- Supabase Storage - Secondary storage
  - Bucket: `imports` (for conversation file uploads)
  - Used in: `app/api/import/get-upload-url/route.ts`

**Caching:**
- None detected (no Redis or similar)

## Authentication & Identity

**Auth Provider:**
- Supabase Auth
  - Implementation: OAuth2/PKCE flow with server-side sessions
  - Cookie handling: 30-day max age, Safari-compatible settings
  - Routes: `app/auth/`, `app/login/`, `app/signup/`, `app/api/auth/signout/route.ts`
  - Client: `lib/supabase/server.ts` (server), `lib/supabase/client.ts` (client)

## Communication & Messaging

**Email:**
- Resend (Primary)
  - SDK: `resend`
  - Auth: `RESEND_API_KEY`
  - From: `SoulPrint <noreply@soulprint.so>`
  - Features: Transactional email templates
  - Used in: `lib/email/send.ts` (soulprint ready notifications)

- Gmail OAuth2 (Fallback)
  - SDK: `nodemailer`
  - Auth: `GMAIL_USER`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`
  - From: SoulPrint <waitlist@archeforge.com>
  - Used in: `lib/email.ts` (task notifications, waitlist confirmations)

**Voice:**
- OpenAI Whisper - Audio transcription
  - Endpoint: `https://api.openai.com/v1/audio/transcriptions`
  - Auth: `OPENAI_API_KEY`
  - Model: `whisper-1`
  - Features: Multi-format audio transcription (webm, mp4, ogg, wav)
  - Used in: `app/api/transcribe/route.ts`

- Voice Verification (Placeholder)
  - Current: Simple fingerprint comparison in `app/api/voice/enroll/route.ts` and `app/api/voice/verify/route.ts`
  - Note: Production implementation would use voice embedding similarity

## Monitoring & Observability

**Error Tracking:**
- Not detected (no Sentry, LogRocket, or similar)

**Logs:**
- Console logging with prefixes: `[Chat]`, `[Import]`, `[Email]`, `[Transcribe]`, etc.
- No centralized logging service detected

**Health Checks:**
- `app/api/admin/health/route.ts` - System health dashboard
- `app/api/chat/health/route.ts` - Chat service status
- `app/api/rlm/health/route.ts` - RLM service status
- `app/api/health/supabase/route.ts` - Database connectivity

## CRM & Lead Management

**Streak CRM:**
- Service: Gmail-based CRM for lead tracking
  - Auth: `STREAK_API_KEY`, `STREAK_PIPELINE_KEY`
  - Endpoint: `https://api.streak.com/api/v2/pipelines/{key}/boxes`
  - Features: Add confirmed waitlist signups to pipeline
  - Used in: `app/api/waitlist/confirm/route.ts`

## CI/CD & Deployment

**Hosting:**
- Vercel - Primary (Next.js frontend & API routes)
  - Auth: `VERCEL_OIDC_TOKEN` for deployment authorization

- Render - Secondary (RLM microservice)
  - Service: `https://soulprint-landing.onrender.com`

**CI Pipeline:**
- Not detected (no GitHub Actions, CircleCI, or GitLab CI configuration)

## Feature Flags & Configuration

**Admin/Debug Routes:**
- `app/api/admin/migrate/route.ts` - Database migrations
- `app/api/admin/health/route.ts` - System health
- `app/api/debug/test-import/route.ts` - Import testing
- Auth: `ADMIN_MIGRATION_SECRET` header validation

## Webhooks & Callbacks

**Incoming:**
- `app/api/waitlist/route.ts` - Waitlist form submissions
- `app/api/waitlist/confirm/route.ts` - Email confirmation callbacks
- `app/api/tasks/route.ts` - Cron job task execution

**Outgoing:**
- Streak CRM API calls when user confirms waitlist email
- RLM service calls for every chat message (via `POST /query`)
- Email notifications (Resend/Gmail) when soulprint is ready

## Environment Configuration

**Required env vars for development:**
```
NEXT_PUBLIC_SUPABASE_URL=https://swvljsixpvvcirjmflze.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<jwt-token>
SUPABASE_SERVICE_ROLE_KEY=<service-role-jwt>

AWS_ACCESS_KEY_ID=<aws-key>
AWS_SECRET_ACCESS_KEY=<aws-secret>
AWS_REGION=us-east-1
BEDROCK_MODEL_ID=us.anthropic.claude-3-5-haiku-20241022-v1:0

R2_ENDPOINT=https://<account-id>.r2.cloudflarestorage.com
R2_ACCESS_KEY_ID=<r2-key>
R2_SECRET_ACCESS_KEY=<r2-secret>
R2_BUCKET_NAME=soulprint-uploads

OPENAI_API_KEY=sk-proj-...
PERPLEXITY_API_KEY=pplx-...
TAVILY_API_KEY=tvly-dev-...

GMAIL_USER=waitlist@archeforge.com
GMAIL_CLIENT_ID=<client-id>
GMAIL_CLIENT_SECRET=<secret>
GMAIL_REFRESH_TOKEN=<refresh-token>

RESEND_API_KEY=<api-key>

STREAK_API_KEY=strk_...
STREAK_PIPELINE_KEY=agxz...

RLM_SERVICE_URL=https://soulprint-landing.onrender.com
NEXT_PUBLIC_SITE_URL=https://www.soulprintengine.ai
```

**Secrets location:**
- `.env.local` (development)
- Vercel Environment Variables (production)

---

*Integration audit: 2026-02-01*
