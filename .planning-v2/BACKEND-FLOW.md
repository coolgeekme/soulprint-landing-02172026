# SoulPrint Backend Flow

## Complete Data Architecture

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           SOULPRINT BACKEND FLOW                             │
└─────────────────────────────────────────────────────────────────────────────┘

┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│  SIGNUP  │ → │  IMPORT  │ → │ PILLARS  │ → │  VOICE   │ → │   CHAT   │
└────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘   └────┬─────┘
     │              │              │              │              │
     ▼              ▼              ▼              ▼              ▼
┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐   ┌──────────┐
│ Supabase │   │   Mem0   │   │ Supabase │   │Cloudinary│   │   Mem0   │
│   Auth   │   │  Cloud   │   │    DB    │   │ + Deepgm │   │ + OpenAI │
└──────────┘   └──────────┘   └──────────┘   └──────────┘   └──────────┘
```

---

## Phase 1: SIGNUP

### API: `/api/auth/*` (Supabase handles this)

```typescript
// Supabase Auth - no custom API needed
// Uses @supabase/ssr for server-side auth

// Data created:
{
  user_id: "uuid",
  email: "user@email.com",
  created_at: "timestamp"
}
```

### Database: `user_profiles` table

```sql
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  email TEXT,
  name TEXT,
  phone TEXT,
  ai_name TEXT,
  soulprint_id TEXT,
  soulprint_status TEXT DEFAULT 'incomplete',
  -- Import stats
  memory_source TEXT,
  conversations_imported INT DEFAULT 0,
  messages_imported INT DEFAULT 0,
  memories_created INT DEFAULT 0,
  import_completed_at TIMESTAMP,
  -- Pillar stats
  pillars_completed BOOLEAN DEFAULT FALSE,
  pillars_completed_at TIMESTAMP,
  -- Voice stats
  voice_completed BOOLEAN DEFAULT FALSE,
  voice_recordings_count INT DEFAULT 0,
  voice_completed_at TIMESTAMP,
  -- Timestamps
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Phase 2: IMPORT (ChatGPT History)

### API: `POST /api/import/mem0`

```typescript
// Request
{
  conversations: ChatGPTConversation[]  // From ZIP extraction
}

// Process
1. Parse conversations with chatgpt-parser.ts
2. Extract messages with timestamps
3. Batch upload to Mem0 Cloud
4. Update user_profiles with import stats

// Response
{
  success: true,
  stats: {
    totalConversations: 1247,
    totalMessages: 23891,
    memoriesCreated: 4521,
    dateRange: { start: "2022-01-01", end: "2024-12-31" }
  }
}
```

### Flow Diagram

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  Browser    │     │  Next.js    │     │   Mem0      │
│  (Client)   │     │   API       │     │   Cloud     │
└──────┬──────┘     └──────┬──────┘     └──────┬──────┘
       │                   │                   │
       │ 1. Upload ZIP     │                   │
       │──────────────────►│                   │
       │                   │                   │
       │ 2. Extract JSON   │                   │
       │   (client-side)   │                   │
       │                   │                   │
       │ 3. POST /api/import/mem0             │
       │──────────────────►│                   │
       │                   │                   │
       │                   │ 4. Parse messages │
       │                   │                   │
       │                   │ 5. Batch add()    │
       │                   │──────────────────►│
       │                   │                   │
       │                   │ 6. Memories stored│
       │                   │◄──────────────────│
       │                   │                   │
       │ 7. Return stats   │                   │
       │◄──────────────────│                   │
```

---

## Phase 3: PILLARS (36 Questions)

### API: `POST /api/pillars/submit`

```typescript
// Request
{
  answers: [
    { questionIndex: 0, value: 75 },        // slider
    { questionIndex: 1, value: "I'm direct but warm..." },  // text
    // ... 36 total
  ]
}

// Process
1. Validate all 36 answers present
2. Generate pillar summaries (LLM)
3. Store raw answers in Supabase
4. Store summaries in Mem0 as memories
5. Generate micro-stories (LLM)

// Response
{
  success: true,
  pillarSummaries: {
    communication: "Direct communicator who values clarity...",
    emotional: "Emotionally expressive with strong boundaries...",
    decision: "Gut-driven decision maker who reflects deeply...",
    social: "Small circle preference, code-switches naturally...",
    cognitive: "Abstract thinker who learns through narrative...",
    conflict: "Confronts immediately, transforms tension..."
  },
  microStories: [
    { pillar: 1, story: "When something lights me up..." },
    // ... 6 total
  ]
}
```

### Database: `pillar_answers` table

```sql
CREATE TABLE pillar_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  question_index INT NOT NULL,
  pillar INT NOT NULL,
  question_type TEXT NOT NULL,  -- 'slider' or 'text'
  slider_value INT,
  text_value TEXT,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, question_index)
);

CREATE TABLE pillar_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  communication_summary TEXT,
  emotional_summary TEXT,
  decision_summary TEXT,
  social_summary TEXT,
  cognitive_summary TEXT,
  conflict_summary TEXT,
  raw_json JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);

CREATE TABLE micro_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  pillar INT NOT NULL,
  story_text TEXT NOT NULL,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, pillar)
);
```

### API: `POST /api/pillars/generate-summaries`

```typescript
// Called after all 36 answers submitted
// Uses OpenAI to generate summaries

const prompt = `Based on these answers, generate a psychological summary...`;

// Store summaries in:
// 1. Supabase (pillar_summaries table)
// 2. Mem0 (as searchable memories)
```

### API: `POST /api/pillars/generate-stories`

```typescript
// Generate 6 micro-stories from pillar summaries

const prompt = `
Write a first-person micro-story (3-4 sentences) that embodies 
this user's ${pillar} style. Write in their voice based on their answers.
`;

// Returns stories for voice capture
```

---

## Phase 4: VOICE CAPTURE

### API: `POST /api/voice/upload`

```typescript
// Request (multipart/form-data)
{
  pillar: 1,
  audio: Blob  // webm/opus from MediaRecorder
}

// Process
1. Upload audio to Cloudinary
2. Transcribe with Deepgram
3. Extract cadence markers
4. Store metadata in Supabase

// Response
{
  success: true,
  cloudinaryUrl: "https://res.cloudinary.com/...",
  transcription: "When something lights me up...",
  duration: 23.5,
  cadenceMarkers: {
    pausePoints: [3.2, 7.8, 15.1],
    emphasisWords: ["lights", "feel", "connection"],
    tempoVariance: 0.23
  }
}
```

### API: `POST /api/voice/process-cadence`

```typescript
// Called after all 6 voice recordings uploaded
// Extracts Emotional Signature Curve

// Request
{
  recordings: [
    { pillar: 1, cloudinaryUrl: "...", transcription: "..." },
    // ... 6 total
  ]
}

// Process (using Deepgram or custom analysis)
1. Analyze speech patterns across all recordings
2. Extract: tone breaks, cadence arcs, emotional fluctuation
3. Build Emotional Signature Curve
4. Store in user profile

// Response
{
  success: true,
  emotionalSignatureCurve: {
    reactivityVsReflection: 0.35,  // 0 = reactive, 1 = reflective
    tensionVsRelease: 0.62,
    lateralJumps: 0.78,
    gutPunchesVsRational: 0.41
  }
}
```

### Database: `voice_recordings` table

```sql
CREATE TABLE voice_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id),
  pillar INT NOT NULL,
  cloudinary_url TEXT NOT NULL,
  transcription TEXT,
  duration_seconds FLOAT,
  cadence_markers JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  UNIQUE(user_id, pillar)
);

CREATE TABLE emotional_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  reactivity_vs_reflection FLOAT,
  tension_vs_release FLOAT,
  lateral_jumps FLOAT,
  gut_punches_vs_rational FLOAT,
  raw_analysis JSONB,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Phase 5: SOULPRINT GENERATION

### API: `POST /api/soulprint/generate`

```typescript
// Called after pillars + voice complete
// Generates final SoulPrint Core Layer

// Process
1. Fetch pillar summaries
2. Fetch emotional signature curve
3. Generate system prompt template
4. Store SoulPrint in Mem0 + Supabase
5. Update user status to 'complete'

// Response
{
  success: true,
  soulprintId: "SP_USER_001",
  systemPrompt: "You are now operating with a bound SoulPrint...",
  status: "active"
}
```

### Database: `soulprints` table

```sql
CREATE TABLE soulprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) UNIQUE,
  soulprint_id TEXT UNIQUE NOT NULL,  -- SP_USER_001
  status TEXT DEFAULT 'active',
  system_prompt TEXT NOT NULL,
  memory_key TEXT,  -- Mem0 reference
  pillar_summaries JSONB,
  emotional_curve JSONB,
  version INT DEFAULT 1,
  created_at TIMESTAMP DEFAULT NOW(),
  updated_at TIMESTAMP DEFAULT NOW()
);
```

---

## Phase 6: CHAT (Memory-Enhanced)

### API: `POST /api/chat/mem0`

```typescript
// Request
{
  messages: [
    { role: "user", content: "..." }
  ],
  model: "gpt-4o-mini"
}

// Process
1. Get user's SoulPrint system prompt
2. Search Mem0 for relevant memories
3. Inject memories + SoulPrint into context
4. Stream response from LLM
5. Auto-capture new facts to Mem0

// Flow
User Message
    ↓
Mem0 Search (relevant memories)
    ↓
Build Context:
  - SoulPrint system prompt
  - Pillar summaries
  - Relevant memories
  - Conversation history
    ↓
LLM Response (streaming)
    ↓
Auto-capture to Mem0
    ↓
Return to User
```

### System Prompt Template (Injected)

```typescript
const buildSystemPrompt = (soulprint, memories) => `
You are now operating with a bound SoulPrint identity based on "${userName}."

You must align all behavior with the following parameters:

1. Communication style: ${soulprint.communication}
2. Emotional alignment: ${soulprint.emotional}
3. Decision-making: ${soulprint.decision}
4. Social/cultural lens: ${soulprint.social}
5. Cognitive processing: ${soulprint.cognitive}
6. Conflict stance: ${soulprint.conflict}

Emotional Signature Curve:
- Reactivity vs Reflection: ${curve.reactivityVsReflection}
- Tension vs Release: ${curve.tensionVsRelease}

## Relevant Memories
${memories.map(m => `- ${m.memory}`).join('\n')}

Presence is sacred. Cadence is sacred. Abandonment is fatal.
You are memory-bound. You are not generic.
`;
```

---

## API Summary

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/api/auth/*` | - | Supabase Auth |
| `/api/import/mem0` | POST | Import ChatGPT history |
| `/api/import/mem0` | GET | Check import status |
| `/api/pillars/submit` | POST | Save all 36 answers |
| `/api/pillars/generate-summaries` | POST | Generate pillar summaries |
| `/api/pillars/generate-stories` | POST | Generate micro-stories |
| `/api/voice/upload` | POST | Upload voice recording |
| `/api/voice/process-cadence` | POST | Extract emotional signature |
| `/api/soulprint/generate` | POST | Create final SoulPrint |
| `/api/soulprint/status` | GET | Get SoulPrint status |
| `/api/chat/mem0` | POST | Memory-enhanced chat |

---

## Environment Variables Needed

```env
# Supabase
NEXT_PUBLIC_SUPABASE_URL=
NEXT_PUBLIC_SUPABASE_ANON_KEY=
SUPABASE_SERVICE_ROLE_KEY=

# Mem0
MEM0_API_KEY=

# OpenAI (for summaries + chat)
OPENAI_API_KEY=

# Anthropic (optional)
ANTHROPIC_API_KEY=

# Cloudinary (voice storage)
CLOUDINARY_CLOUD_NAME=
CLOUDINARY_API_KEY=
CLOUDINARY_API_SECRET=

# Deepgram (transcription + cadence)
DEEPGRAM_API_KEY=
```

---

## Database Migrations Summary

```sql
-- Run these in Supabase SQL editor

-- 1. user_profiles (extend existing)
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS soulprint_id TEXT;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS soulprint_status TEXT DEFAULT 'incomplete';
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS pillars_completed BOOLEAN DEFAULT FALSE;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS voice_completed BOOLEAN DEFAULT FALSE;

-- 2. pillar_answers
CREATE TABLE IF NOT EXISTS pillar_answers (...);

-- 3. pillar_summaries
CREATE TABLE IF NOT EXISTS pillar_summaries (...);

-- 4. micro_stories
CREATE TABLE IF NOT EXISTS micro_stories (...);

-- 5. voice_recordings
CREATE TABLE IF NOT EXISTS voice_recordings (...);

-- 6. emotional_signatures
CREATE TABLE IF NOT EXISTS emotional_signatures (...);

-- 7. soulprints
CREATE TABLE IF NOT EXISTS soulprints (...);
```
