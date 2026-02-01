# Technology Stack

**Analysis Date:** 2026-02-01

## Languages

**Primary:**
- TypeScript 5.x - Full codebase (React components, Next.js routes, utilities)
- JavaScript - Node.js runtime for API routes and backend logic

**Secondary:**
- HTML/CSS - Tailwind CSS framework for styling

## Runtime

**Environment:**
- Node.js (deployment on Vercel + Render)

**Package Manager:**
- npm
- Lockfile: `package-lock.json` (present)

## Frameworks

**Core:**
- Next.js 16.1.5 - Full-stack React framework, API routes via `app/api/`
- React 19.2.3 - UI component library
- React DOM 19.2.3 - DOM rendering

**UI Components:**
- Radix UI (v1.x) - Headless component library: accordion, avatar, dialog, scroll-area, select, slider, tooltip, etc.
- Lucide React 0.563.0 - Icon library for UI components
- Tailwind CSS 3.4.19 - Utility-first CSS framework
- Tailwind Merge 3.4.0 - Conditional CSS class merging
- Tailwindcss Animate 1.0.7 - Animation utilities
- Framer Motion 12.29.2 - Advanced animation library
- Motion 12.29.2 - Motion primitives library

**Testing:**
- Not detected (no Jest, Vitest, or Playwright in dependencies)

**Build/Dev:**
- PostCSS 8.5.6 - CSS processing
- ESLint 9 - Code linting
- ESLint Config Next 16.1.5 - Next.js-specific linting rules
- Sharp 0.34.5 - Image optimization (dev dependency)
- Autoprefixer 10.4.23 - CSS vendor prefix generation

## Key Dependencies

**Critical:**
- `@supabase/supabase-js` 2.93.1 - Database, auth, and real-time messaging
- `@supabase/ssr` 0.8.0 - Server-side Supabase integration for Next.js
- `@aws-sdk/client-bedrock-runtime` 3.975.0 - AWS Bedrock Claude LLM calls
- `@aws-sdk/client-s3` 3.975.0 - AWS S3 / Cloudflare R2 file storage
- `@aws-sdk/s3-request-presigner` 3.975.0 - S3 signed URL generation
- `openai` 6.17.0 - OpenAI API (embeddings, transcription, image generation)

**Search & Knowledge Retrieval:**
- `@tavily/core` 0.7.1 - Web search API
- googleapis 170.1.0 - Google APIs (Gmail integration)

**Infrastructure & External APIs:**
- `nodemailer` 7.0.13 - Email sending via Gmail OAuth2
- `resend` 6.9.1 - Alternative email service
- `cloudinary` 2.9.0 - Image CDN and generation storage
- `jszip` 3.10.1 - ZIP file handling for data export/import

**UI/UX Utilities:**
- `class-variance-authority` 0.7.1 - CSS variant generation
- `clsx` 2.1.1 - Conditional class names
- `next-themes` 0.4.6 - Dark mode theme switching
- `use-stick-to-bottom` 1.1.2 - Chat UI scroll behavior

## Configuration

**Environment:**
- `.env.local` - Local development and deployed secrets
- Environment variables required:
  - Supabase: `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY`
  - AWS: `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `BEDROCK_MODEL_ID`
  - S3/R2: `R2_ENDPOINT`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`
  - OpenAI: `OPENAI_API_KEY`
  - Search: `PERPLEXITY_API_KEY`, `TAVILY_API_KEY`
  - Gmail: `GMAIL_USER`, `GMAIL_CLIENT_ID`, `GMAIL_CLIENT_SECRET`, `GMAIL_REFRESH_TOKEN`
  - Resend: `RESEND_API_KEY`
  - CRM: `STREAK_API_KEY`, `STREAK_PIPELINE_KEY`
  - RLM Service: `RLM_SERVICE_URL` (external microservice)
  - Other: `NEXT_PUBLIC_SITE_URL`, `OLLAMA_URL`, `ASSEMBLYAI_API_KEY`

**Build:**
- `next.config.ts` - Next.js configuration with security headers and 50MB body size limit for chat exports
- `tsconfig.json` - TypeScript compiler config with path alias `@/*` for root imports
- `tailwind.config.ts` - Tailwind CSS configuration
- `postcss.config.mjs` - PostCSS plugins
- `eslint.config.mjs` - ESLint rules

## Platform Requirements

**Development:**
- Node.js 18+
- npm or yarn
- Browser with WebRTC support (for voice features)

**Production:**
- Vercel (primary hosting for Next.js frontend)
- Supabase (database, auth, storage)
- AWS Bedrock (LLM inference)
- Cloudflare R2 or AWS S3 (file uploads)
- RLM Service (Render - external service for memory/retrieval)

---

*Stack analysis: 2026-02-01*
