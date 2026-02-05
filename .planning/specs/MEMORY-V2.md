# MEMORY V2: Rebuild Specification

**Status:** 📋 Research Complete  
**Created:** 2026-02-05  
**Priority:** 🔴 CRITICAL

---

## Executive Summary

Replace current RLM (Render) memory system with a robust, production-grade solution using:

1. **Motia** — Backend framework (APIs, jobs, workflows)
2. **Mem0** — Memory layer (best-in-class accuracy & speed)

---

## Research Findings

### Memory Systems Compared

| System | Accuracy | Latency | Tokens | Self-Host | Notes |
|--------|----------|---------|--------|-----------|-------|
| **Mem0** | 66.9% (+26% vs OpenAI) | 0.20s | 90% fewer | ✅ Yes | Best overall, YC backed |
| Supermemory | SOTA on LongMemEval | Low | 50M tokens/user | ❌ No | SaaS only |
| OpenMemory | Unknown | Local | N/A | ✅ Yes | Local-first |
| memU | Unknown | Unknown | N/A | ✅ Yes | Built for OpenClaw |
| Current RLM | ~40%? | ~2-5s | High | ✅ Yes | Failing, unreliable |

**Recommendation: Mem0** — Best accuracy, fastest, most tokens saved, can self-host.

---

### Backend Framework: Motia

**What:** Unified backend framework that handles APIs, background jobs, queues, workflows, AI agents with one primitive: "Step"

**Why:**
- Single codebase for all backend logic
- Built-in observability
- State management
- Multi-language (TS, Python)
- Works with Vercel
- Active development (Vercel OSS program)

**GitHub:** https://github.com/MotiaDev/motia  
**Docs:** https://motia.dev/docs

---

## Proposed Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                      SOULPRINT V2                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐  │
│  │   Next.js   │────▶│   Motia     │────▶│    Mem0     │  │
│  │  Frontend   │     │  Backend    │     │   Memory    │  │
│  └─────────────┘     └─────────────┘     └─────────────┘  │
│         │                   │                   │          │
│         │                   │                   │          │
│         ▼                   ▼                   ▼          │
│  ┌─────────────┐     ┌─────────────┐     ┌─────────────┐  │
│  │  Supabase   │     │   Bedrock   │     │  Qdrant/    │  │
│  │  Auth + DB  │     │    LLM      │     │  Postgres   │  │
│  └─────────────┘     └─────────────┘     └─────────────┘  │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Component Breakdown

| Component | Current | V2 | Migration |
|-----------|---------|----|-----------| 
| Frontend | Next.js | Next.js + shadcn | Upgrade UI |
| Auth | Supabase | Supabase | Keep |
| Database | Supabase Postgres | Supabase Postgres | Keep |
| Backend API | Next.js API routes | **Motia Steps** | Replace |
| Memory | RLM (custom) | **Mem0** | Replace |
| Embeddings | Bedrock Cohere | Mem0 built-in | Simplify |
| LLM (fast) | Bedrock Claude | **Bedrock Haiku 3.5** | Keep |
| LLM (smart) | — | **Bedrock Opus 4.5** | Add |
| Vector Store | Supabase pgvector | Mem0 (Qdrant/PG) | Replace |
| Channels | Web only | **Web + SMS** | Add |

---

## Motia Implementation

### Steps to Create

```
motia/
├── steps/
│   ├── import/
│   │   ├── upload.step.ts        # Handle file upload
│   │   ├── parse.step.ts         # Parse ChatGPT export
│   │   ├── chunk.step.ts         # Chunk conversations
│   │   └── embed.step.ts         # Create embeddings via Mem0
│   │
│   ├── chat/
│   │   ├── receive.step.ts       # API: receive message
│   │   ├── memory.step.ts        # Query Mem0 for context
│   │   ├── respond.step.ts       # Generate LLM response
│   │   └── learn.step.ts         # Store new memories
│   │
│   └── soulprint/
│       ├── generate.step.ts      # Generate personality
│       └── update.step.ts        # Update on new data
```

### Example Step (Chat)

```typescript
// steps/chat/receive.step.ts
export const config = {
  name: 'ReceiveMessage',
  type: 'api',
  path: '/chat',
  method: 'POST',
  emits: ['chat.received']
};

export const handler = async (req, { emit, state }) => {
  const { userId, message } = req.body;
  
  await emit({
    topic: 'chat.received',
    data: { userId, message, timestamp: Date.now() }
  });
  
  return { status: 200, body: { received: true } };
};
```

---

## Mem0 Implementation

### Setup

```typescript
import { Memory } from 'mem0ai';

const memory = new Memory({
  // Can use hosted or self-hosted
  api_key: process.env.MEM0_API_KEY, // Hosted
  // OR
  vector_store: {
    provider: "qdrant", // or "pgvector" with Supabase
    config: { ... }
  }
});
```

### Core Operations

```typescript
// Add memory from conversation
await memory.add(messages, { user_id: userId });

// Search relevant memories
const memories = await memory.search(query, { 
  user_id: userId, 
  limit: 5 
});

// Get all user memories
const all = await memory.getAll({ user_id: userId });
```

### Why Mem0 > Current RLM

| Feature | RLM | Mem0 |
|---------|-----|------|
| Memory extraction | Manual chunking | Automatic |
| Relevance scoring | Basic similarity | ML-powered |
| Deduplication | None | Built-in |
| Conflict resolution | None | Built-in |
| API simplicity | Complex | 3 methods |
| Reliability | Failing | Production-ready |

---

## Migration Plan

### Phase 1: Setup (Day 1)
- [ ] Create Motia project structure
- [ ] Set up Mem0 (hosted or self-hosted)
- [ ] Create basic Steps scaffold

### Phase 2: Import Flow (Day 2)
- [ ] Upload step (handle 1-5GB files)
- [ ] Parse step (ChatGPT JSON)
- [ ] Memory ingestion via Mem0

### Phase 3: Chat Flow (Day 3)
- [ ] Message receive step
- [ ] Memory query via Mem0
- [ ] Response generation
- [ ] Memory learning

### Phase 4: SoulPrint (Day 4)
- [ ] Personality generation
- [ ] System prompt building
- [ ] AI instructions

### Phase 5: Integration (Day 5)
- [ ] Connect to Next.js frontend
- [ ] Test full flow
- [ ] Deploy

---

## Open Questions

1. **Mem0 hosted vs self-hosted?**
   - Hosted: Faster setup, managed, costs $$$
   - Self-hosted: More control, free, more work

2. **Keep Supabase pgvector or use Qdrant?**
   - pgvector: Already have, simpler
   - Qdrant: Mem0's recommended, faster

3. **Motia hosting?**
   - Vercel (if supported)
   - Railway
   - Render
   - Self-hosted

4. **Budget?**
   - Mem0 hosted pricing
   - Compute costs for Motia

---

## Resources

- **Motia:** https://github.com/MotiaDev/motia
- **Mem0:** https://github.com/mem0ai/mem0
- **Mem0 Docs:** https://docs.mem0.ai
- **Mem0 Research:** https://mem0.ai/research

---

## Next Steps

1. ⏳ Drew reviews this spec
2. ⏳ Answers open questions
3. ⏳ Approves architecture
4. 🚀 Start building
