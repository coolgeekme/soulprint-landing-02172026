# SoulPrint Import Flow

## Overview

The import flow takes a user's ChatGPT export (ZIP file) and transforms it into a personalized AI memory system.

---

## Flow Diagram

```
User uploads ZIP
       ↓
┌─────────────────────────────────────────┐
│  1. UPLOAD (Client → Supabase Storage)  │
│     /import page                         │
│     - Get signed URL from API            │
│     - Upload ZIP directly to Supabase    │
└─────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────┐
│  2. QUEUE (Vercel → Vercel)             │
│     /api/import/queue-processing         │
│     - Update user status to 'processing' │
│     - Fire off process-server (async)    │
│     - Return immediately to client       │
└─────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────┐
│  3. PROCESS (Vercel, 5 min max)         │
│     /api/import/process-server           │
│     - Download ZIP from Supabase Storage │
│     - Extract conversations.json         │
│     - Parse all conversations            │
│     - Generate soulprint via RLM         │
│     - Save chunks to conversation_chunks │
│     - Trigger embed-background           │
└─────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────┐
│  4. EMBED (Vercel, background)          │
│     /api/import/embed-background         │
│     - Fetch unembedded chunks            │
│     - Generate vector embeddings         │
│     - Store in conversation_chunks       │
│     - Update embedding_progress          │
└─────────────────────────────────────────┘
       ↓
┌─────────────────────────────────────────┐
│  5. CHAT READY                          │
│     /chat page                           │
│     - Check /api/memory/status           │
│     - Show progress if still embedding   │
│     - Full memory available when done    │
└─────────────────────────────────────────┘
```

---

## API Endpoints

### `/api/import/get-upload-url` (POST)
**Purpose:** Generate signed URL for direct upload to Supabase Storage

**Request:**
```json
{ "filename": "export.zip" }
```

**Response:**
```json
{
  "uploadUrl": "https://...supabase.co/storage/v1/...",
  "path": "imports/{user_id}/{timestamp}-export.zip"
}
```

---

### `/api/import/queue-processing` (POST)
**Purpose:** Start background processing after upload completes

**Request:**
```json
{
  "storagePath": "imports/{user_id}/...",
  "filename": "export.zip",
  "fileSize": 1234567
}
```

**Actions:**
1. Update `user_profiles.import_status` → `'processing'`
2. Fire async request to `/api/import/process-server`
3. Return success immediately (user can close page)

---

### `/api/import/process-server` (POST)
**Purpose:** Main processing logic (runs up to 5 minutes on Vercel)

**Request:**
```json
{
  "storagePath": "imports/{user_id}/...",
  "userId": "uuid"
}
```

**Actions:**
1. Download file from Supabase Storage
2. If ZIP: extract `conversations.json`
3. Parse all conversations
4. Send sample to RLM for soulprint generation
5. Save soulprint to `user_profiles`
6. Chunk conversations and save to `conversation_chunks`
7. Trigger `/api/import/embed-background`
8. Delete uploaded file from storage

---

### `/api/import/embed-background` (POST)
**Purpose:** Generate vector embeddings for memory search

**Request:**
```json
{ "userId": "uuid" }
```

**Actions:**
1. Fetch chunks without embeddings
2. Generate embeddings via OpenAI
3. Update chunks with vectors
4. Update `user_profiles.embedding_progress`

---

### `/api/memory/status` (GET)
**Purpose:** Check import/memory status for current user

**Response:**
```json
{
  "status": "ready" | "processing" | "failed" | "none",
  "hasSoulprint": true,
  "totalChunks": 500,
  "embeddingProgress": 75,
  "embeddingStatus": "processing",
  "importError": null
}
```

---

## Database Tables

### `user_profiles`
| Column | Type | Description |
|--------|------|-------------|
| user_id | uuid | Primary key, links to auth.users |
| soulprint | jsonb | Generated personality profile |
| import_status | text | none → processing → complete/failed |
| import_error | text | Error message if failed |
| total_chunks | int | Number of conversation chunks |
| embedding_progress | int | 0-100 percentage |
| embedding_status | text | null → processing → complete |

### `conversation_chunks`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| content | text | Chunk text for search |
| embedding | vector | 1536-dim OpenAI embedding |
| title | text | Conversation title |
| message_count | int | Messages in this chunk |

### `raw_conversations`
| Column | Type | Description |
|--------|------|-------------|
| id | uuid | Primary key |
| user_id | uuid | Owner |
| conversation_id | text | Original ChatGPT ID |
| title | text | Conversation title |
| messages | jsonb | Full message history |

---

## Storage

**Bucket:** `imports`
**Path:** `{user_id}/{timestamp}-{filename}`
**Lifecycle:** Files deleted after processing

---

## Error Handling

1. **Upload fails:** Client shows error, user can retry
2. **Processing fails:** 
   - `import_status` set to `'failed'`
   - `import_error` contains message
   - Chat page shows error with "Try Again" button
3. **Embedding fails:**
   - `embedding_status` set to `'failed'`
   - User can still chat (just without full memory)

---

## Timeouts

| Stage | Timeout | Notes |
|-------|---------|-------|
| Upload | 10 min | Large files (1GB+) |
| Queue Processing | 30 sec | Just triggers background |
| Process Server | 5 min | Vercel Pro limit |
| Embed Background | 5 min | Per batch |

---

## RLM Integration

The RLM (Retrieval-augmented Language Model) service on Render handles:
- Soulprint generation from conversation samples
- Deep personality analysis
- Memory queries during chat

**URL:** `https://soulprint-landing.onrender.com`
**Endpoints:**
- `/analyze` - Generate soulprint from conversations
- `/health` - Service status
