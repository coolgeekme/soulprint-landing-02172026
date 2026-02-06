# Codebase Structure

**Analysis Date:** 2026-02-06

## Directory Layout

```
soulprint-landing/
├── app/                                # Next.js App Router (all routes)
│   ├── page.tsx                        # Landing page (/)
│   ├── layout.tsx                      # Root layout with fonts, providers
│   ├── (auth)/                         # Auth routes group
│   │   ├── login/page.tsx
│   │   ├── signup/page.tsx
│   │   └── auth/callback/page.tsx      # OAuth callback handler
│   ├── import/page.tsx                 # Import flow UI
│   ├── chat/page.tsx                   # Main chat interface
│   ├── dashboard/page.tsx              # User dashboard
│   ├── memory/page.tsx                 # Memory management UI
│   ├── pillars/page.tsx                # Six Pillars questionnaire
│   ├── api/                            # API routes (54+ endpoints)
│   │   ├── auth/                       # Auth endpoints (signout, etc)
│   │   ├── import/                     # Import processing
│   │   │   ├── chunked-upload/route.ts # Handle large file uploads
│   │   │   ├── process-server/route.ts # Main import processor
│   │   │   ├── complete/route.ts       # Mark import done
│   │   │   └── ...
│   │   ├── chat/                       # Chat operations
│   │   │   ├── route.ts                # Main chat handler (streaming)
│   │   │   ├── messages/route.ts       # Load chat history
│   │   │   └── health/route.ts
│   │   ├── memory/                     # Memory operations
│   │   │   ├── query/route.ts          # Search memory
│   │   │   ├── list/route.ts           # List memories
│   │   │   └── delete/route.ts
│   │   ├── profile/                    # User profile
│   │   │   ├── ai-name/route.ts        # Get/set AI name
│   │   │   └── ai-avatar/route.ts      # Get/set avatar
│   │   ├── soulprint/                  # Soulprint operations
│   │   │   └── generate/route.ts
│   │   ├── admin/                      # Admin endpoints
│   │   │   ├── health/route.ts
│   │   │   ├── migrate/route.ts
│   │   │   └── rechunk/route.ts
│   │   ├── gamification/               # XP and achievements
│   │   │   ├── xp/route.ts
│   │   │   ├── achievements/route.ts
│   │   │   └── stats/route.ts
│   │   └── ...other routes
│   ├── actions/                        # Server actions
│   └── test/                           # Testing pages
├── components/                         # Reusable React components
│   ├── ui/                             # Low-level UI components
│   │   ├── button.tsx
│   │   ├── dialog.tsx
│   │   ├── input.tsx
│   │   ├── background-beams.tsx        # Visual effects
│   │   ├── ring-progress.tsx           # Progress indicator
│   │   └── ...other primitives
│   ├── chat/                           # Chat-specific components
│   │   ├── telegram-chat-v2.tsx        # Main chat UI
│   │   └── ...chat variants
│   ├── sections/                       # Page sections
│   │   ├── hero.tsx                    # Landing hero
│   │   ├── feature-blog-section.tsx
│   │   ├── memory-section.tsx
│   │   ├── faq-section.tsx
│   │   └── footer.tsx
│   ├── auth/                           # Auth components
│   │   └── auth-modal.tsx
│   ├── auth-modal.tsx
│   ├── access-code-modal.tsx
│   └── AchievementToast.tsx            # Toast notifications
├── lib/                                # Shared utilities and services
│   ├── supabase/                       # Database clients
│   │   ├── client.ts                   # Client-side Supabase
│   │   ├── server.ts                   # Server-side Supabase
│   │   └── middleware.ts               # Auth session update
│   ├── rlm/                            # Remote memory service
│   │   ├── health.ts                   # Circuit breaker
│   │   └── ...other RLM utilities
│   ├── memory/                         # Memory operations
│   │   ├── query.ts                    # Semantic search + context building
│   │   ├── learning.ts                 # Extract facts from chat
│   │   └── facts.ts                    # Fact management
│   ├── soulprint/                      # Soulprint generation
│   │   └── ...soulprint utilities
│   ├── email/                          # Email sending
│   │   └── send.ts                     # Gmail via nodemailer
│   ├── gamification/                   # XP and achievements
│   │   └── ...gamification logic
│   ├── bedrock.ts                      # AWS Bedrock LLM wrapper
│   ├── chunked-upload.ts               # Large file upload handler
│   ├── email.ts                        # Email formatting
│   ├── motia-client.ts                 # Motia integration
│   └── utils.ts                        # General utilities
├── supabase/                           # Database migrations and config
│   ├── migrations/                     # SQL migration files
│   │   ├── 20250127_user_profiles.sql
│   │   ├── 20250127000001_memory_schema.sql
│   │   ├── 20250127_chat_messages.sql
│   │   ├── 20250127_gamification.sql
│   │   ├── 20250127_ai_name.sql
│   │   ├── 20250127_ai_avatar.sql
│   │   ├── 20250131_learned_facts.sql
│   │   └── ...other migrations
│   └── config.ts
├── public/                             # Static assets
│   ├── icons/
│   ├── images/
│   ├── docs/
│   └── ...static files
├── docs/                               # Documentation
├── middleware.ts                       # Next.js middleware (auth refresh)
├── package.json                        # Dependencies
├── tsconfig.json                       # TypeScript config
├── next.config.ts                      # Next.js config
└── .env.local                          # Environment variables
```

## Directory Purposes

**app/**
- Purpose: All routable pages and API endpoints using App Router
- Contains: Page components (.tsx), API route handlers (route.ts), nested layouts
- Key files: `page.tsx`, `layout.tsx`, `route.ts` follow Next.js naming convention

**components/**
- Purpose: Reusable React components (UI primitives, sections, features)
- Contains: Client components (use 'use client'), server components, animations
- Key files: UI components in `ui/`, feature-specific in `chat/`, `sections/`, `auth/`

**lib/**
- Purpose: Shared business logic, utilities, client initialization
- Contains: Database clients, API wrappers, helper functions, services
- Key files: `supabase/*` (client/server), `rlm/*` (circuit breaker), `memory/*` (search)

**supabase/**
- Purpose: Database schema and migrations
- Contains: SQL migration files in chronological order
- Key files: `migrations/*.sql` define all tables, indexes, RLS policies, functions

**public/**
- Purpose: Static assets served directly to browser
- Contains: Images, icons, manifests, documents
- Generated: No

## Key File Locations

**Entry Points:**

- `app/page.tsx`: Landing page (/)
- `app/layout.tsx`: Root HTML structure with fonts and providers
- `middleware.ts`: Request interceptor for auth session refresh

**Authentication:**

- `app/auth/callback/page.tsx`: OAuth callback handler
- `app/api/auth/signout/route.ts`: Logout endpoint
- `lib/supabase/middleware.ts`: Session refresh logic

**Import Flow:**

- `app/import/page.tsx`: Upload UI and progress tracking
- `app/api/import/chunked-upload/route.ts`: Handle large file chunks
- `app/api/import/process-server/route.ts`: Main import processor (ZIP extraction, chunking, RLM call)
- `app/api/import/complete/route.ts`: Final status update

**Chat:**

- `app/chat/page.tsx`: Chat interface with message history
- `app/api/chat/route.ts`: Main chat handler (RLM call, streaming, history save)
- `app/api/chat/messages/route.ts`: Load chat history
- `lib/memory/query.ts`: Build memory context for chat

**Memory Management:**

- `app/memory/page.tsx`: Memory viewing/management UI
- `app/api/memory/query/route.ts`: Semantic search
- `app/api/memory/list/route.ts`: List all memories
- `lib/memory/learning.ts`: Extract facts from conversations

**Profile:**

- `app/api/profile/ai-name/route.ts`: Get/set AI personality name
- `app/api/profile/ai-avatar/route.ts`: Get/set AI avatar image

**Configuration:**

- `package.json`: Dependencies (Next.js, Supabase, AWS SDK, Radix UI)
- `tsconfig.json`: TypeScript compiler config (strict mode, path aliases)
- `next.config.ts`: Next.js build config
- `.env.local`: Runtime environment variables (secrets, URLs)

**Core Logic:**

- `lib/bedrock.ts`: AWS Bedrock LLM client (Claude models, embeddings)
- `lib/rlm/health.ts`: Circuit breaker for fault tolerance
- `lib/chunked-upload.ts`: Large file upload with multipart support
- `lib/email.ts`: Email formatting and sending

**Testing:**

- `app/test/`: Test/debug pages (test-import, test-upload, test-voice)

## Naming Conventions

**Files:**

- Pages: `page.tsx` in route directories
- Layouts: `layout.tsx`
- API routes: `route.ts` in `[method]/` subdirectories or at route level
- Components: PascalCase (`ChatInterface.tsx`, `UploadForm.tsx`)
- Utilities: camelCase (`chunked-upload.ts`, `bedrock.ts`)
- Types: camelCase or UPPERCASE constant exports
- Database migrations: `YYYYMMDD_description.sql` (chronological)

**Directories:**

- Feature groups: camelCase or kebab-case (`api/import/`, `lib/rlm/`)
- Nested routes: `(groupName)` for grouping without URL change
- Catch-all: `[...slug]` for dynamic routes

**Components:**

- Capitalized PascalCase: `Button`, `ChatInterface`, `UploadForm`
- Descriptive names: `telegram-chat-v2.tsx` (not `chat.tsx`)

**Exports:**

- Named exports for utilities: `export function queryMemory()`
- Default export for page/layout components: `export default function ChatPage()`

## Where to Add New Code

**New Feature:**

- Primary code: Create feature directory in `app/` (e.g., `app/new-feature/page.tsx`)
- API: Create feature folder in `app/api/` with `route.ts` files (e.g., `app/api/new-feature/route.ts`)
- Tests: Create in `app/test/` if test pages needed
- Components: Extract reusable UI to `components/` by feature (e.g., `components/new-feature/`)

**New Component/Module:**

- Shared UI component: `components/ui/ComponentName.tsx`
- Feature-specific component: `components/[feature]/ComponentName.tsx`
- Section (page part): `components/sections/SectionName.tsx`
- Business logic: `lib/[feature]/` directory

**Utilities:**

- Shared database helpers: `lib/supabase/`
- LLM/AI operations: `lib/bedrock.ts` or new `lib/[service]/`
- External service integration: `lib/[service-name]/` (like `lib/rlm/`)
- Email templates: `lib/email/`

**Database Changes:**

- New schema: Create `supabase/migrations/YYYYMMDD_description.sql`
- Follow migration naming: Timestamp + brief description
- Include RLS policies, indexes, and functions in same file

## Special Directories

**app/api/**
- Purpose: HTTP API endpoints following REST convention
- Generated: No
- Committed: Yes
- Pattern: `route.ts` files with `export async function POST/GET/DELETE()` handlers

**supabase/migrations/**
- Purpose: Version-controlled database schema
- Generated: Supabase CLI generates filenames, we write SQL
- Committed: Yes (migrations are source of truth)

**.next/**
- Purpose: Next.js build output
- Generated: Yes (created by `npm run build`)
- Committed: No

**node_modules/**
- Purpose: Package dependencies
- Generated: Yes (`npm install`)
- Committed: No

**public/**
- Purpose: Static files served as-is
- Generated: No (hand-created)
- Committed: Yes

---

*Structure analysis: 2026-02-06*
