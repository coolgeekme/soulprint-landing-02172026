# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-08)

**Core value:** The AI must feel like YOUR AI -- genuinely human, deeply personalized, systematically evaluated.
**Current focus:** v2.0 AI Quality & Personalization -- defining requirements

## Current Position

Phase: Not started (defining requirements)
Plan: —
Status: Defining requirements
Last activity: 2026-02-08 — Milestone v2.0 started

Progress: [>..........] 0% (0 phases complete)

## Performance Metrics

**Velocity:**
- Total plans completed: 47
- Average duration: ~23 min
- Total execution time: ~21 hours across 6 milestones

**By Milestone:**

| Milestone | Phases | Plans | Status |
|-----------|--------|-------|--------|
| v1.0 MVP | 1 | 1 | Shipped |
| v1.1 Stabilization | 7 | 22 | Shipped |
| v1.2 Import UX | 3 | 9 | Shipped |
| v1.3 RLM Sync | 5 | 5 | Shipped |
| v1.4 Personalization | 2 | 7 | Shipped |
| v1.5 Full Chat | 6 | 8 | Shipped |
| v2.0 AI Quality | 0 | 0 | In Progress |

*Metrics updated: 2026-02-08*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

**Carried forward:**
- Separate soulprint-rlm repo -- Production RLM deploys from Pu11en/soulprint-rlm
- Sonnet 4.5 on Bedrock for chat quality (switched from Nova Lite)
- OpenClaw-style prompt: minimal preamble, sections define personality
- Focus on RLM primary path, not Bedrock fallback
- ESM imports for react-syntax-highlighter (not CJS - TypeScript compatibility)
- User messages as plain text, AI messages as markdown (ChatGPT/Claude pattern)
- next-themes for dark mode with system preference detection
- Tailwind CSS variable system for theme-aware UI (bg-background, text-foreground, etc.)
- Mounted guard pattern for theme toggle to prevent hydration mismatch
- RLM responses chunked in ~20-char increments with 10ms delay for progressive rendering
- Bedrock uses ConverseStreamCommand for true token-by-token streaming
- ReadableStream pattern: return Response immediately, async work in start() callback
- maxDuration=60 for Vercel function timeout on long-running streams
- AbortController pattern for fetch cancellation: create before fetch, store in ref, abort on stop
- isGenerating state separate from isLoading to distinguish streaming vs pre-streaming phases
- Stop button (red square icon) replaces send/mic during generation with graceful abort
- Haiku 3.5 for title generation (fast/cheap for 3-8 word summaries)
- conversation_id required in saveMessageSchema (every message belongs to conversation)
- Conversation.updated_at refreshed on message save for sidebar recency sorting

### Pending Todos

- Run `scripts/rls-audit.sql` in Supabase SQL Editor (from v1.1 Phase 4)

### Blockers/Concerns

- Web search (smartSearch) exists but citations not validated against hallucination

## Session Continuity

Last session: 2026-02-08
Stopped at: Milestone v2.0 initialization
Resume file: None

---
*Last updated: 2026-02-08 -- v2.0 AI Quality & Personalization milestone started. Defining requirements.*
