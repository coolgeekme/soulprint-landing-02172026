# CONTEXT: Technical Decisions

## Decision Log

### 2026-02-05: Mem0 over Zep
**Decision:** Use Mem0 (not Zep)
**Reasons:**
1. 12k GitHub stars (proven)
2. Already has OpenClaw plugin built
3. Vercel AI SDK provider ready
4. Apache 2.0 license
5. YC-backed
6. +26% accuracy over OpenAI Memory (arxiv paper)
7. Perfect fit for our use case

### 2026-02-05: Use chat-export-structurer for import
**Decision:** Use 1ch1n/chat-export-structurer
**Reasons:**
1. Handles ChatGPT, Claude, Grok
2. Streaming parser (multi-GB support)
3. MIT license
4. Clean, modular design

## Repos

### mem0-fork
- **Path:** `/home/drewpullen/clawd/mem0-fork`
- **Origin:** https://github.com/mem0ai/mem0
- **License:** Apache 2.0
- **Key folders:**
  - `/openclaw/` — OpenClaw plugin (auto-recall, auto-capture)
  - `/vercel-ai-sdk/` — Next.js integration
  - `/openmemory/` — MCP server with UI
  - `/mem0-ts/` — TypeScript SDK

### chat-export-structurer
- **Path:** `/home/drewpullen/clawd/chat-export-structurer`
- **Origin:** https://github.com/1ch1n/chat-export-structurer
- **License:** MIT
- **Language:** Python
- **Output:** SQLite with full-text search

## Architecture

### Current (RLM)
```
Frontend → API Routes → RLM Service (Render) → Supabase
                           ↓
                      Custom Embeddings
```

### New (Mem0)
```
Import: ChatGPT ZIP → chat-export-structurer → Mem0
Chat:   Frontend → @mem0/vercel-ai-provider → Mem0 → LLM
```

## Mem0 Features We'll Use

1. **Auto-Capture** — After each response, extracts facts
2. **Auto-Recall** — Before each response, injects relevant memories
3. **User Scoping** — `userId` parameter keeps memories per-user
4. **Vercel AI Provider** — Drop-in for Next.js

## Integration Points

### Import Flow
1. User uploads ChatGPT ZIP
2. Extract `conversations.json`
3. Parse with chat-export-structurer logic
4. Batch `memory.add(messages, user_id=userId)`

### Chat Flow
1. User sends message
2. `@mem0/vercel-ai-provider` auto-recalls memories
3. LLM responds with context
4. Auto-capture stores new facts

## Open Questions
- [ ] Self-hosted Mem0 vs Mem0 Cloud?
- [ ] Qdrant for vectors or in-memory?
- [ ] Keep any Supabase storage or all Mem0?
