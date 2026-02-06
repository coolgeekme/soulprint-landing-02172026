# Technology Stack

**Analysis Date:** 2026-02-06

## Languages

**Primary:**
- TypeScript 5 - All source code, APIs, and components
- JavaScript - Configuration files, ESLint config

**Secondary:**
- JSX/TSX - React components throughout `app/` and `components/`

## Runtime

**Environment:**
- Node.js (version managed via `.nvmrc` or Vercel default)

**Package Manager:**
- npm (lockfile: present)

## Frameworks

**Core:**
- Next.js 16.1.5 - Full-stack React framework with API routes
  - App Router architecture (`app/` directory)
  - Server components and server actions for backend operations
  - Streaming responses with `NextResponse`
  - Maximum body size configured to 50MB for file uploads (`next.config.ts`)

**Frontend/UI:**
- React 19.2.3 - Component library
- Radix UI (multiple components) - Unstyled, accessible component primitives
  - `@radix-ui/react-accordion`, `@radix-ui/react-dialog`, `@radix-ui/react-select`, `@radix-ui/react-slider`, `@radix-ui/react-tooltip`, etc.
- Tailwind CSS 3.4.19 - Utility-first CSS framework
- Framer Motion 12.29.2 - Animation library
- Lucide React 0.563.0 - Icon library
- Class Variance Authority 0.7.1 - Component variant management

**Backend/API:**
- AWS Bedrock Runtime - LLM inference through Claude models (Sonnet, Haiku, Opus)
- Supabase 2.93.1 - PostgreSQL database + Auth + Storage
  - `@supabase/ssr` for SSR integration
  - Row-level security for database access
  - Object storage for file uploads

**AI & Language Models:**
- AWS Bedrock (via `@aws-sdk/client-bedrock-runtime`) - Claude 3.5 models
  - Converse API for chat completions
  - ConverseStream API for streaming responses
  - Titan embedding model for vector embeddings
- Vercel AI SDK 6.0.72 (`ai` package) - Unified LLM interface (legacy, being replaced by Bedrock)
  - `@ai-sdk/anthropic` for Anthropic integration
  - `@ai-sdk/openai` for OpenAI fallback/embeddings

**Search & Real-Time Info:**
- Tavily 0.7.1 (`@tavily/core`) - Web search integration with answer extraction
- Perplexity API - Real-time information and deep research (custom integration)

**Testing:**
- Not detected in current setup (no Jest, Vitest, or test files present)

**Build/Dev:**
- Autoprefixer 10.4.23 - CSS vendor prefix automation
- PostCSS 8.5.6 - CSS transformation
- Sharp 0.34.5 - Image optimization (Next.js requirement)
- ESLint 9 - JavaScript linting with Next.js config
  - `eslint-config-next` for React and Next.js rules
  - Flat config format (`eslint.config.mjs`)

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.93.1 - Database and auth client
- `@aws-sdk/client-bedrock-runtime` 3.980.0 - Claude LLM inference
- `@aws-sdk/client-s3` 3.975.0 - S3/R2 object storage
- `resend` 6.9.1 - Transactional email service
- `jszip` 3.10.1 - ZIP file parsing for ChatGPT export imports

**Infrastructure:**
- `nodemailer` 7.0.13 - Email sending fallback
- `web-push` 3.6.7 - Web push notifications
- `googleapis` 170.1.0 - Google APIs (YouTube, Drive, etc.)
- `cloudinary` 2.9.0 - Cloud image storage and manipulation
- `next-themes` 0.4.6 - Theme management (light/dark mode)

**Utilities:**
- `clsx` 2.1.1 - Conditional className utility
- `tailwind-merge` 3.4.0 - Tailwind class conflict resolution
- `tailwindcss-animate` 1.0.7 - Animation preset plugins
- `motion` 12.29.2 - Advanced animation library
- `use-stick-to-bottom` 1.1.2 - Scroll-to-bottom hook for chat

**AWS SDK:**
- `@aws-sdk/s3-request-presigner` 3.975.0 - Generate presigned S3 URLs
- `@aws-sdk/client-bedrock-runtime` - LLM and embedding models

## Configuration

**Environment:**
- Environment variables in `.env.local` (present, never committed)
- Configuration via `next.config.ts` with security headers and body size limits

**Required Environment Variables:**
- `NEXT_PUBLIC_SUPABASE_URL` - Supabase project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Supabase public anon key
- `SUPABASE_SERVICE_ROLE_KEY` - Supabase service role (server-side only)
- `AWS_REGION` - AWS region for Bedrock/S3 (default: us-east-1)
- `AWS_ACCESS_KEY_ID` - AWS credentials for Bedrock
- `AWS_SECRET_ACCESS_KEY` - AWS credentials for Bedrock
- `BEDROCK_MODEL_ID` - Claude model to use (e.g., `us.anthropic.claude-3-5-haiku-20241022-v1:0`)
- `RESEND_API_KEY` - Resend email service API key
- `TAVILY_API_KEY` - Tavily search API key
- `PERPLEXITY_API_KEY` - Perplexity real-time search API key
- `DEEPGRAM_API_KEY` - Deepgram speech-to-text API key
- `RLM_SERVICE_URL` - Remote Learning Model service URL (e.g., https://soulprint-landing.onrender.com)
- `R2_ENDPOINT` - Cloudflare R2 endpoint URL
- `R2_ACCESS_KEY_ID` - R2 credentials
- `R2_SECRET_ACCESS_KEY` - R2 credentials
- `R2_BUCKET_NAME` - R2 bucket name

**Build:**
- `next.config.ts` - Next.js configuration with:
  - 50MB server action body limit for file uploads
  - Security headers (X-Frame-Options, X-Content-Type-Options, X-XSS-Protection, Referrer-Policy)
- `tsconfig.json` - TypeScript strict mode, path aliases (`@/*`)
- `eslint.config.mjs` - ESLint flat config with Next.js rules

## Platform Requirements

**Development:**
- Node.js (version unspecified, likely latest LTS)
- npm package manager

**Production:**
- Deployment: Vercel (via git push, auto-deploys)
- Database: Supabase (PostgreSQL hosted)
- Object Storage: Supabase Storage, AWS S3, Cloudflare R2
- AI Service: AWS Bedrock
- Search: Tavily API, Perplexity API
- Auth: Supabase Auth
- Email: Resend API
- Speech: Deepgram API

## Architecture Notes

**Streaming:**
- Server components support streaming with `bedrockChatStream()` generator in `lib/bedrock.ts`
- Chat streaming implemented via Bedrock ConverseStream API

**File Upload:**
- Multi-part chunked upload via `app/api/import/chunked-upload/route.ts`
- Chunks assembled server-side and uploaded to Supabase Storage
- Support for files up to 50MB

**Embeddings:**
- Bedrock Titan v2 embedding model (`amazon.titan-embed-text-v2:0`)
- 768-dimensional embeddings generated via `bedrockEmbed()` in `lib/bedrock.ts`

**Circuit Breaker Pattern:**
- RLM service has circuit breaker in `lib/rlm/health.ts` to fail fast when service is down
- Health check every 30 seconds in OPEN state

---

*Stack analysis: 2026-02-06*
