# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-08)

**Core value:** The AI must feel like YOUR AI -- genuinely human, deeply personalized, systematically evaluated.

**Current focus:** Phase 2 - Prompt Template System (Phase 1 complete)

## Current Position

Phase: 1 of 5 (Evaluation Foundation) -- COMPLETE
Plan: 2 of 2 in phase
Status: Phase complete
Last activity: 2026-02-08 - Completed 01-02-PLAN.md (experiment runner, baseline, CLI scripts)

Progress: [██░░░░░░░░] 20% (1 phase complete, 2/2 plans in Phase 1)

## Performance Metrics

**Velocity:**
- Total plans completed: 49 (from v1.0-v2.0)
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
| v2.0 AI Quality | 5 | 2 | In Progress |

*Metrics updated: 2026-02-08*

## Accumulated Context

### Decisions

Decisions are logged in PROJECT.md Key Decisions table.

**Carried forward from v1.5:**
- Separate soulprint-rlm repo -- Production RLM deploys from Pu11en/soulprint-rlm
- Sonnet 4.5 on Bedrock for chat quality (switched from Nova Lite)
- OpenClaw-style prompt: minimal preamble, sections define personality
- Two-pass generation: quick pass (~30s, Haiku 4.5) + full pass (RLM background)
- 7-section structured context (SOUL, IDENTITY, USER, AGENTS, TOOLS, MEMORY, daily memory)

**v2.0 Architecture decisions:**
- Evaluation-first approach: build measurement before changing prompts
- Phase 1 -> Phase 2 dependency: need metrics before prompt changes
- Phases 3 and 4 can run in parallel after Phase 2

**From 01-01 (Evaluation Core Library):**
- ChatEvalItem uses index signature for Opik DatasetItemData compatibility
- zod v4 z.record() requires two args (key type + value type)
- Minimum 10 valid pairs enforced for dataset statistical significance
- BaseMetric extension pattern: validationSchema + score with safeParse guard

**From 01-02 (Experiment Runner & CLI Scripts):**
- V1 prompt builder copied inline in baseline.ts (not extracted from chat route) to freeze baseline snapshot
- Array.from(Map.entries()) pattern for ES2017 target compatibility
- PromptVariant interface: { name, buildSystemPrompt } for pluggable prompt strategies
- CLI scripts use DOTENV_CONFIG_PATH=.env.local with import dotenv/config

### Pending Todos

- Run `scripts/rls-audit.sql` in Supabase SQL Editor (from v1.1 Phase 4)

### Blockers/Concerns

**For v2.0 planning:**
- Phase 2 needs RLM prompt sync strategy (two prompt builders must produce identical output)
- Phase 3 needs uncanny valley threshold research (how much mirroring is too much)
- Quality scoring metrics need validation that they correlate r>0.7 with user satisfaction

**Carried forward from v1.5:**
- Web search (smartSearch) exists but citations not validated against hallucination

## Session Continuity

Last session: 2026-02-08
Stopped at: Completed 01-02-PLAN.md (experiment runner, baseline, CLI scripts) -- Phase 1 complete
Resume file: None

---
*Last updated: 2026-02-08 -- Phase 1 (Evaluation Foundation) complete, ready for Phase 2 (Prompt Template System)*
