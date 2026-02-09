# Project State

## Project Reference

See: .planning/PROJECT.md (updated 2026-02-08)

**Core value:** The AI must feel like YOUR AI -- genuinely human, deeply personalized, systematically evaluated.

**Current focus:** Phase 2 - Prompt Template System (COMPLETE)

## Current Position

Phase: 2 of 5 (Prompt Template System)
Plan: 3 of 3 in phase
Status: Phase complete
Last activity: 2026-02-09 - Completed 02-03-PLAN.md (v2 prompt variant wired to evaluation)

Progress: [████████░░] 80% (Phases 1-2 complete, 3 plans in Phase 2)

## Performance Metrics

**Velocity:**
- Total plans completed: 51 (from v1.0-v2.0)
- Average duration: ~20 min
- Total execution time: ~21.03 hours across 6 milestones

**By Milestone:**

| Milestone | Phases | Plans | Status |
|-----------|--------|-------|--------|
| v1.0 MVP | 1 | 1 | Shipped |
| v1.1 Stabilization | 7 | 22 | Shipped |
| v1.2 Import UX | 3 | 9 | Shipped |
| v1.3 RLM Sync | 5 | 5 | Shipped |
| v1.4 Personalization | 2 | 7 | Shipped |
| v1.5 Full Chat | 6 | 8 | Shipped |
| v2.0 AI Quality | 5 | 4 | In Progress |

*Metrics updated: 2026-02-09*

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

**From 02-01 (PromptBuilder Class):**
- PromptBuilder uses PromptParams object pattern (not positional args) for extensibility
- v2 personality sections use flowing prose, only functional sections use ## headers
- v2 section ordering: USER before AGENTS/IDENTITY, CONTEXT before REMEMBER
- getPromptVersion() exported standalone for testing/logging without instantiating builder
- PRMT-04 pattern: behavioral_rules from agents_md reinforced in ## REMEMBER after ## CONTEXT

**From 02-02 (Cross-Language Prompt Sync):**
- Python PromptBuilder mirrors TypeScript character-for-character for v1, v2, and imposter mode
- Injectable currentDate/currentTime params added to TypeScript PromptParams for deterministic testing
- Python _parse_section_safe handles both dict and JSON string inputs
- _sections_to_profile helper bridges legacy sections dict to PromptBuilder profile format
- JSON blob serialization pattern for subprocess param passing avoids shell escaping issues

**From 02-03 (Wire v2 to Evaluation):**
- v2 builder uses simplified PromptParams (no dailyMemory/memoryContext) for style comparison
- recordBaseline() accepts optional variant parameter (non-breaking change, defaults to v1)
- v1 baseline remains frozen (not refactored to use PromptBuilder) for historical accuracy
- ChatEvalItem structured sections JSON.stringify into PromptBuilder *_md fields
- VARIANTS map in CLI scripts for variant registry and name-based selection

### Pending Todos

- Run `scripts/rls-audit.sql` in Supabase SQL Editor (from v1.1 Phase 4)

### Blockers/Concerns

**For v2.0 planning:**
- Phase 3 needs uncanny valley threshold research (how much mirroring is too much)
- Quality scoring metrics need validation that they correlate r>0.7 with user satisfaction

**Carried forward from v1.5:**
- Web search (smartSearch) exists but citations not validated against hallucination

## Session Continuity

Last session: 2026-02-09
Stopped at: Completed 02-03-PLAN.md (v2 prompt variant wired to evaluation framework)
Resume file: None

---
*Last updated: 2026-02-09 -- Phase 2 COMPLETE (PromptBuilder class, Python sync, evaluation integration)*
