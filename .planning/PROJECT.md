# PROJECT: SoulPrint V2

**Started:** 2026-02-05  
**Status:** 🔴 Discovery  
**Team:** Drew (owner), Asset (builder)

---

## Vision

**One sentence:** An AI that truly knows you — your best friend with perfect memory.

**The problem:** Current AI chatbots forget everything. You repeat yourself constantly.

**The solution:** SoulPrint imports your history, learns who you are, and remembers everything forever.

---

## Core Requirements

### Must Have (V2)
1. **Robust import** — Handle 1-5GB exports without failing
2. **Unbreakable memory** — Never lose data, always recall relevant context
3. **Natural AI** — Acts like a best friend, not a robot
4. **Great mobile UX** — Chat feels native, not janky

### Nice to Have
- Voice input/output
- Proactive check-ins
- Multi-platform (SMS, web, app)

---

## Technical Stack

### Current (V1)
| Layer | Tech | Status |
|-------|------|--------|
| Frontend | Next.js 16 | Keep |
| Auth | Supabase Auth | Keep |
| Database | Supabase Postgres | Keep |
| Storage | Supabase Storage | Keep |
| Memory | RLM (Render) | **REPLACE** |
| Embeddings | AWS Bedrock Cohere | TBD |
| LLM | AWS Bedrock Claude | Keep |

### Proposed (V2)
| Layer | Tech | Status |
|-------|------|--------|
| Frontend | Next.js + shadcn | Upgrade |
| Auth | Supabase Auth | Keep |
| Database | Supabase Postgres | Keep |
| Storage | Supabase Storage | Keep |
| Memory | **NEW SYSTEM** | 🔴 Waiting for repo |
| Embeddings | TBD | Depends on memory choice |
| LLM | AWS Bedrock Claude | Keep |

---

## Key Decisions Needed

### 1. Memory System
**Question:** Which repo/system for memory?  
**Options:** (waiting for Drew's link)  
**Decision:** TBD

### 2. Embedding Provider
**Question:** Keep Bedrock Cohere or switch?  
**Options:** OpenAI, Cohere, Voyage, local  
**Decision:** TBD (depends on memory system)

### 3. Mobile UX Approach
**Question:** Fix current chat or rebuild?  
**Options:** Patch telegram-chat-v2 vs. rebuild with shadcn  
**Decision:** TBD

### 4. AI Personality
**Question:** How should SoulPrint behave?  
**Status:** Spec started at `specs/SOULPRINT-INSTRUCTIONS.md`  
**Decision:** TBD (6 questions pending)

---

## Success Metrics

1. **Import success rate:** 99%+ (currently failing)
2. **Memory recall accuracy:** Relevant context in 95%+ of responses
3. **Response latency:** <3s for most queries
4. **Mobile UX score:** No complaints from Drew 😅

---

## Timeline

| Phase | Duration | Status |
|-------|----------|--------|
| Discovery | 1-2 days | 🔴 Now |
| Specs | 1-2 days | Pending |
| Build | TBD | Pending |
| Test | TBD | Pending |
| Launch | TBD | Pending |

---

## Open Questions

1. **Memory repo link?** — BLOCKING
2. **Budget constraints?** — Affects provider choices
3. **Figma designs?** — For mobile UX
4. **Timeline pressure?** — How fast do we need this?

---

## Files

```
.planning/
├── PROJECT.md      # This file
├── GSD-MAP.md      # System audit
├── STATE.md        # Current progress
├── ROADMAP.md      # Phases & milestones
└── specs/
    ├── MEMORY-V2.md
    ├── SOULPRINT-AI.md
    └── MOBILE-UX.md
```
