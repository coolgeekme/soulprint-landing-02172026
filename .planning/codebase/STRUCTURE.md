# Codebase Structure

**Analysis Date:** 2026-02-01

## Directory Layout

```
soulprint-landing/
├── app/                    # Next.js App Router - pages, API routes, server actions
│   ├── page.tsx            # Landing page (/) with hero and feature sections
│   ├── layout.tsx          # Root layout with global providers and fonts
│   ├── globals.css         # Global styles
│   ├── actions/            # Server actions for auth and data mutations
│   ├── api/                # API routes for backend logic
│   │   ├── chat/           # Chat message handling and responses
│   │   ├── import/         # ChatGPT export processing
│   │   ├── admin/          # Admin utilities (health, metrics, migrations)
│   │   ├── auth/           # Authentication endpoints
│   │   ├── gamification/   # User achievements and XP
│   │   ├── memory/         # Memory status queries
│   │   └── profile/        # User profile management
│   ├── chat/               # Chat interface page
│   ├── import/             # Import workflow page
│   ├── login/              # Login form page
│   ├── signup/             # Signup form page
│   ├── auth/               # OAuth callback handler
│   ├── admin/              # Admin dashboard pages
│   ├── achievements/       # User achievements display
│   ├── memory/             # Memory browser (if implemented)
│   └── [other-pages]/      # Test pages, demo pages, whitepaper
│
├── components/             # Reusable React components
│   ├── chat/               # Chat UI components
│   │   ├── telegram-chat-v2.tsx    # Main chat interface (Telegram-style)
│   │   ├── ChatMessage.tsx          # Individual message display
│   │   ├── ChatInput.tsx            # Message input box
│   │   ├── BackgroundSync.tsx       # Background import sync
│   │   └── message-content.tsx      # Message content rendering
│   ├── auth/               # Authentication components
│   │   ├── login-form.tsx           # Email/password login
│   │   ├── signup-modal.tsx         # Registration form
│   │   └── security-access-modal.tsx
│   ├── sections/           # Landing page sections
│   │   ├── hero.tsx                 # Hero section
│   │   ├── features.tsx             # Feature showcase
│   │   ├── pricing.tsx              # Pricing section
│   │   ├── faq-section.tsx          # FAQ
│   │   ├── footer.tsx               # Footer
│   │   └── [other-sections]/
│   ├── ui/                 # Shadcn/ui and custom UI components
│   │   ├── button.tsx               # Button component
│   │   ├── accordion.tsx            # Accordion
│   │   ├── dialog.tsx               # Modal dialog
│   │   ├── ring-progress.tsx        # Circular progress indicator
│   │   ├── AddToHomeScreen.tsx      # iOS A2HS prompt
│   │   └── [other-ui]/
│   ├── AchievementToast.tsx # Achievement notification component
│   ├── Navbar.tsx          # Navigation bar
│   └── auth-modal.tsx      # Auth modal for modal-based login
│
├── lib/                    # Core business logic and utilities
│   ├── supabase/           # Supabase integration
│   │   ├── client.ts       # Client-side Supabase initialization
│   │   ├── server.ts       # Server-side Supabase with SSR
│   │   └── middleware.ts   # Session refresh middleware
│   ├── import/             # ChatGPT export import pipeline
│   │   ├── parser.ts       # Parse ChatGPT export JSON/ZIP
│   │   ├── chunker.ts      # Split conversations into hierarchical chunks
│   │   ├── embedder.ts     # Generate embeddings via Bedrock
│   │   ├── soulprint.ts    # Generate user profile/personality analysis
│   │   ├── client-soulprint.ts     # Quick client-side soulprint generation
│   │   ├── personality-analysis.ts # LLM-based personality extraction
│   │   └── utilities
│   ├── memory/             # Memory retrieval and learning
│   │   ├── query.ts        # Vector search and hierarchical context retrieval
│   │   ├── learning.ts     # Extract and store learned facts
│   │   ├── facts.ts        # Fact extraction patterns
│   │   └── utilities
│   ├── search/             # Web search integrations
│   │   ├── perplexity.ts   # Perplexity AI search
│   │   ├── tavily.ts       # Tavily search (fallback)
│   │   └── utilities
│   ├── gamification/       # Achievement and XP system
│   │   ├── xp.ts           # XP calculation and leveling
│   │   └── achievements.ts # Achievement tracking
│   ├── email/              # Email sending
│   │   ├── send.ts         # Resend.com integration
│   │   └── templates.ts
│   ├── versioning/         # Git branch management for A/B testing
│   │   └── branch-manager.ts
│   └── utils.ts            # General utilities (clsx, cn)
│
├── public/                 # Static assets
│   ├── logo.svg            # SoulPrint logo
│   ├── apple-touch-icon.png
│   ├── manifest.json       # PWA manifest
│   └── [other-assets]/
│
├── middleware.ts           # Next.js middleware for session refresh
├── next.config.ts          # Next.js configuration
├── tsconfig.json           # TypeScript configuration
├── tailwind.config.ts      # Tailwind CSS configuration
├── components.json         # Shadcn/ui component registry
├── package.json            # Dependencies
└── supabase/               # Supabase configuration and migrations
    └── migrations/         # Database migrations
```

## Directory Purposes

**app/**
- Purpose: Next.js App Router structure with all pages, API routes, and server actions
- Contains: Page components (.tsx), layout components, API endpoint handlers, server functions
- Key files: `page.tsx` (landing), `api/chat/route.ts` (main chat logic), `import/page.tsx` (import UI)

**components/**
- Purpose: Reusable React components organized by feature/type
- Contains: Chat UI, auth forms, landing page sections, shadcn/ui components
- Key files: `chat/telegram-chat-v2.tsx` (main chat interface), `auth/login-form.tsx`, `sections/hero.tsx`

**lib/**
- Purpose: Core business logic, utilities, and third-party integrations
- Contains: Supabase setup, ChatGPT import pipeline, vector search, LLM interactions, email service
- Key files: `memory/query.ts` (vector search), `import/soulprint.ts` (profile generation), `supabase/server.ts` (auth)

**public/**
- Purpose: Static assets served directly by Next.js
- Contains: Logo, favicon, PWA manifest, images
- Key files: `logo.svg`, `manifest.json`

**supabase/**
- Purpose: Supabase backend configuration and migrations
- Contains: SQL migrations, RPC functions, schema definitions
- Key files: Migration files in `migrations/` directory

## Key File Locations

**Entry Points:**
- `app/layout.tsx`: Root layout with providers and fonts
- `app/page.tsx`: Landing page - checks auth and shows hero
- `app/chat/page.tsx`: Chat interface - main authenticated experience
- `middleware.ts`: Intercepts all requests to refresh Supabase session

**Authentication:**
- `app/actions/auth.ts`: Server actions for sign up, sign in, sign out
- `lib/supabase/server.ts`: Server-side Supabase client with cookie handling
- `lib/supabase/client.ts`: Client-side Supabase instance
- `app/auth/callback/route.ts`: OAuth callback handler

**Chat & Memory:**
- `app/api/chat/route.ts`: Main chat endpoint - calls RLM or Bedrock
- `lib/memory/query.ts`: Vector search with hierarchical layers
- `lib/import/soulprint.ts`: Generate user soulprint (personality profile)
- `components/chat/telegram-chat-v2.tsx`: Chat UI component

**Import Pipeline:**
- `app/import/page.tsx`: Import UI - file upload and progress
- `lib/import/parser.ts`: Parse ChatGPT export (JSON/ZIP)
- `lib/import/chunker.ts`: Split into hierarchical layers (MICRO, THEMATIC, MACRO)
- `lib/import/embedder.ts`: Generate embeddings via Bedrock
- `app/api/import/process/route.ts`: Process uploaded export asynchronously

**Configuration:**
- `tsconfig.json`: TypeScript with path alias `@/` for imports
- `next.config.ts`: Next.js settings (domains, redirects)
- `tailwind.config.ts`: Tailwind CSS setup with custom colors (orange #EA580C)
- `components.json`: Shadcn/ui configuration

## Naming Conventions

**Files:**
- Page components: `page.tsx` (Next.js convention)
- Route handlers: `route.ts` (Next.js convention)
- Reusable components: PascalCase (`ChatMessage.tsx`, `Hero.tsx`)
- Utilities/functions: camelCase (`utils.ts`, `embedder.ts`)
- Server actions: camelCase (`auth.ts`, `referral.ts`)
- Types: Inline in files with PascalCase (`ChatMessage` interface)

**Directories:**
- Feature modules: kebab-case (`chat/`, `import/`, `memory/`)
- UI components: `ui/` for design system components
- API routes: Follow path structure (`api/chat/messages/route.ts` → `POST /api/chat/messages`)

**Functions & Variables:**
- Async API calls: `fetch()` wrapped in try-catch
- Event handlers: `handle*` prefix (`handleSendMessage`, `handleRename`)
- Server functions: `use server` directive; snake_case for database operations
- Component state: `useState` hooks with descriptive names (`messages`, `isLoading`)

**Type Naming:**
- API request/response types: PascalCase with suffix (`ChatMessage`, `SoulprintResponse`)
- Database row types: `*Row` suffix (`ChunkRpcRow`, `ChunkTableRow`)
- Interfaces: PascalCase (`UserProfile`, `MemoryChunk`)

## Where to Add New Code

**New Feature (e.g., new chat capability):**
- Frontend UI: `components/chat/[feature-name].tsx`
- API endpoint: `app/api/chat/[feature]/route.ts`
- Core logic: `lib/[domain]/[feature].ts`
- Tests: Co-located in same directory if test structure existed

**New Component/Module:**
- Presentation: `components/[feature]/Component.tsx`
- Business logic: `lib/[feature]/index.ts` or `lib/[feature]/utility.ts`
- API: `app/api/[feature]/route.ts`

**Utilities & Helpers:**
- Shared helpers: `lib/utils.ts` (for small utilities like `cn()`)
- Feature-specific: `lib/[feature]/utilities.ts` or `lib/[feature]/helpers.ts`
- Type helpers: Define inline in files where used, or in `lib/types/` if shared across multiple features

**Styling:**
- Global styles: `app/globals.css`
- Component scoping: Use Tailwind classes directly in components (no separate CSS)
- Design tokens: Defined in `tailwind.config.ts`

## Special Directories

**app/api/admin/**
- Purpose: Admin utilities for maintenance and debugging
- Generated: No (manually created routes)
- Committed: Yes
- Contains: Health checks, metrics, migrations, user resets

**app/test*, app/chat-demo, app/chat-preview**
- Purpose: Testing and demo pages for development
- Generated: No
- Committed: Yes
- Note: Some may be unused and could be removed in cleanup phase

**rlm-service/**
- Purpose: External Python service for advanced memory retrieval
- Generated: No
- Committed: Yes
- Note: Not integrated into main codebase; separate deployment

**moodboard/**
- Purpose: Design and visual asset references
- Generated: No
- Committed: Yes

**.next/**
- Purpose: Next.js build output
- Generated: Yes (built during `npm run build`)
- Committed: No (in .gitignore)

**node_modules/**
- Purpose: Installed dependencies
- Generated: Yes (from package-lock.json)
- Committed: No (in .gitignore)

---

*Structure analysis: 2026-02-01*
