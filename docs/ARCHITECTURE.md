# SoulPrint Architecture

## System Overview

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              SOULPRINT                                   │
│                         "AI that remembers you"                          │
└─────────────────────────────────────────────────────────────────────────┘

┌─────────────┐     ┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│   Landing   │────▶│   Sign Up   │────▶│   Import    │────▶│    Chat     │
│     /       │     │  /signup    │     │  /import    │     │   /chat     │
└─────────────┘     └─────────────┘     └─────────────┘     └─────────────┘
                           │                   │                   │
                           ▼                   ▼                   ▼
                    ┌─────────────────────────────────────────────────────┐
                    │                    SUPABASE                          │
                    │  ┌──────────┐  ┌──────────┐  ┌──────────────────┐   │
                    │  │   Auth   │  │ Storage  │  │    PostgreSQL    │   │
                    │  │  Users   │  │ Exports  │  │ + pgvector       │   │
                    │  └──────────┘  └──────────┘  └──────────────────┘   │
                    └─────────────────────────────────────────────────────┘
                                              │
                                              ▼
                    ┌─────────────────────────────────────────────────────┐
                    │              RLM SERVICE (Render)                    │
                    │         soulprint-landing.onrender.com               │
                    │  ┌──────────────┐  ┌────────────────────────────┐   │
                    │  │  Embeddings  │  │   Soulprint Generation     │   │
                    │  │  (Bedrock)   │  │   (Bedrock Claude)         │   │
                    │  └──────────────┘  └────────────────────────────┘   │
                    └─────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Import Flow
```
User uploads ChatGPT ZIP
         │
         ▼
┌─────────────────────┐
│  Client-side Parse  │  ← Handles 10GB+ locally
│  (lib/import/)      │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Multi-tier Chunk   │
│  100 / 500 / 2000   │  ← Different granularities for retrieval
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│   RLM Service       │
│  - Generate embeds  │
│  - Create soulprint │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│   Supabase Store    │
│  - user_profiles    │
│  - conversation_    │
│    chunks           │
└─────────────────────┘
```

### 2. Chat Flow
```
User sends message
         │
         ▼
┌─────────────────────┐
│  Memory Query       │  ← Semantic search on chunks
│  /api/memory/query  │
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Context Injection  │  ← Relevant memories → system prompt
└─────────────────────┘
         │
         ▼
┌─────────────────────┐
│  Streaming Response │  ← Bedrock Claude via RLM
│  /api/chat          │
└─────────────────────┘
```

## Database Schema

### user_profiles
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to auth.users |
| ai_name | text | User's AI clone name |
| ai_avatar_url | text | Avatar image URL |
| soulprint_text | text | Generated personality |
| import_status | text | none/processing/complete/failed |
| total_conversations | int | Import stats |
| total_messages | int | Import stats |
| soul_md | text | Generated SOUL.md |

### conversation_chunks
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | FK to auth.users |
| content | text | Chunk text |
| embedding | vector(1536) | Semantic embedding |
| tier | int | 1=100ch, 2=500ch, 3=2000ch |
| metadata | jsonb | Source info |

## API Routes

### Auth
- `POST /api/auth/signout` - Sign out user

### Import
- `POST /api/import/process-server` - Process uploaded ZIP
- `POST /api/import/complete` - Mark import done
- `GET /api/import/motia/status` - Check processing status

### Chat
- `POST /api/chat` - Send message, get streaming response

### Memory
- `POST /api/memory/query` - Semantic search
- `GET /api/memory/list` - List memories
- `POST /api/memory/synthesize` - Generate summary
- `DELETE /api/memory/delete` - Remove memory

### Profile
- `POST /api/profile/ai-name` - Set AI name
- `POST /api/profile/ai-avatar` - Generate avatar

### Gamification
- `GET /api/gamification/stats` - User XP/level
- `GET /api/gamification/achievements` - Unlocked achievements
- `POST /api/gamification/xp` - Award XP

## Tech Stack

| Layer | Technology |
|-------|------------|
| Frontend | Next.js 16, React 19, Tailwind |
| Backend | Next.js API Routes |
| Database | Supabase (Postgres + pgvector) |
| Auth | Supabase Auth |
| Storage | Supabase Storage + Cloudinary |
| AI/ML | AWS Bedrock (Claude, Embeddings) |
| Hosting | Vercel (frontend), Render (RLM) |
| Email | Resend |

## Environment Variables

```bash
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
SUPABASE_SERVICE_ROLE_KEY=

# RLM Service
RLM_SERVICE_URL=https://soulprint-landing.onrender.com

# External Services
RESEND_API_KEY=
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=
```

## Key Files

```
soulprint-landing/
├── app/
│   ├── page.tsx              # Landing
│   ├── chat/page.tsx         # Main chat UI
│   ├── import/page.tsx       # Upload flow
│   └── api/                  # 28 API routes
├── components/
│   ├── ui/                   # Radix-based components
│   └── chat-variants/        # Chat UI variants
├── lib/
│   ├── supabase/             # DB clients
│   ├── import/               # Parser logic
│   ├── memory/               # Query utils
│   └── rlm/                  # RLM client
└── .planning/                # Specs & roadmaps
```

---
Generated: 2026-02-05
