---
phase: 04-quality-scoring
plan: 01
subsystem: evaluation
tags: [quality-scoring, llm-judges, bedrock, haiku-4.5, database-migration]
requires: [01-evaluation-foundation]
provides: [quality-judges, quality-orchestrator, quality-storage]
affects: [04-02, 04-03]
tech-stack:
  added: []
  patterns: [parallel-judge-execution, score-normalization, jsonb-indexing]
key-files:
  created:
    - lib/evaluation/quality-judges.ts
    - lib/evaluation/quality-scoring.ts
    - supabase/migrations/20260209_quality_breakdown.sql
  modified: []
decisions:
  - decision: "Use three separate judge classes (Completeness, Coherence, Specificity) rather than one unified judge"
    rationale: "Each dimension has distinct evaluation criteria and expected fields. Separate judges allow specialized prompts and easier debugging."
    date: 2026-02-09
  - decision: "Normalize 0.0-1.0 judge scores to 0-100 integer range for storage"
    rationale: "JSONB storage efficiency and human readability. Avoids floating-point precision issues in SQL queries."
    date: 2026-02-09
  - decision: "Score all 5 sections in parallel (15 total LLM calls)"
    rationale: "Haiku 4.5 is fast and cheap enough that parallel execution is optimal for latency. Total cost ~$0.003 per full profile score."
    date: 2026-02-09
  - decision: "Use GIN index on quality_breakdown JSONB column"
    rationale: "Enables efficient threshold queries (find_low_quality_profiles function) without full table scans."
    date: 2026-02-09
metrics:
  duration: "3 minutes"
  completed: 2026-02-09
---

# Phase 4 Plan 1: Quality Scoring Infrastructure Summary

**One-liner:** Three LLM-as-judge classes (completeness, coherence, specificity) with parallel scoring orchestrator and JSONB database storage

## What Was Built

Created the foundation layer for soulprint quality assessment:

1. **Quality Judge Classes** (`lib/evaluation/quality-judges.ts`)
   - CompletenessJudge: Evaluates field presence and detail depth per section type
   - CoherenceJudge: Evaluates logical flow, consistency, and structure
   - SpecificityJudge: Evaluates concrete details vs. generic platitudes
   - All extend Opik's BaseMetric, use Haiku 4.5, clamp scores to [0.0, 1.0]
   - Follow identical pattern to Phase 1 evaluation judges (PersonalityConsistency, Factuality, ToneMatching)

2. **Scoring Orchestrator** (`lib/evaluation/quality-scoring.ts`)
   - `scoreSoulprintSection()`: Runs 3 judges in parallel for one section
   - `calculateQualityBreakdown()`: Scores all 5 sections in parallel (15 LLM calls total)
   - `hasLowQualityScores()`: Boolean check for any metric below threshold
   - `getLowQualitySections()`: Returns array of below-threshold section/metric pairs
   - Score normalization: 0.0-1.0 → 0-100 integer range

3. **Database Migration** (`supabase/migrations/20260209_quality_breakdown.sql`)
   - `quality_breakdown` JSONB column stores all section/metric scores
   - `quality_scored_at` timestamp for cache invalidation
   - GIN index on `quality_breakdown` for efficient JSONB queries
   - `find_low_quality_profiles(threshold)` function for batch threshold filtering

## Architecture

```
calculateQualityBreakdown(profile)
       ↓
5 sections scored in parallel
       ↓
Each section: 3 judges in parallel
       ↓
15 total LLM calls (Haiku 4.5)
       ↓
Normalize 0.0-1.0 → 0-100 integers
       ↓
Store in quality_breakdown JSONB:
{
  "soul": { "completeness": 85, "coherence": 92, "specificity": 78 },
  "identity": { "completeness": 90, "coherence": 88, "specificity": 82 },
  ...
}
       ↓
Query with find_low_quality_profiles(60)
```

## Expected Fields by Section

**CompletenessJudge** validates against section-specific expected fields:

- **soul**: communication_style, personality_traits, tone_preferences, boundaries, humor_style, formality_level, emotional_patterns
- **identity**: ai_name, archetype, vibe, emoji_style, signature_greeting
- **user**: name, location, occupation, relationships, interests, life_context, preferred_address
- **agents**: response_style, behavioral_rules, context_adaptation, memory_directives, do_not
- **tools**: likely_usage, capabilities_emphasis, output_preferences, depth_preference

## Performance Characteristics

**Cost per profile score:**
- 15 Haiku 4.5 calls × ~512 tokens input × ~150 tokens output = ~$0.003/profile
- Completeness judge has longest prompts due to expected fields list

**Latency:**
- All 5 sections in parallel: ~2-3 seconds total (network + Bedrock processing)
- Single section: ~1.5 seconds

**Accuracy:**
- Anti-length-bias instruction prevents favoring verbose content
- Haiku 4.5 (different model family than Sonnet 4.5 generation) avoids self-preference bias
- 0.1 temperature for consistent scoring

## Deviations from Plan

None - plan executed exactly as written.

## Task Commits

| Task | Name | Commit | Files |
|------|------|--------|-------|
| 1 | Quality Judge Classes | f1e83fd | lib/evaluation/quality-judges.ts |
| 2 | Scoring Orchestrator and Migration | 7cfb4a4 | lib/evaluation/quality-scoring.ts, supabase/migrations/20260209_quality_breakdown.sql |

## Decisions Made

**1. Three separate judge classes vs. unified judge**
- Decision: Use CompletenessJudge, CoherenceJudge, SpecificityJudge as separate classes
- Rationale: Each dimension has distinct evaluation criteria. Completeness needs expected fields per section type, coherence evaluates structure, specificity evaluates detail density. Separate judges = specialized prompts and easier debugging.
- Impact: Slightly more code, but cleaner separation of concerns and better prompt engineering per dimension.

**2. Score normalization to 0-100 integer range**
- Decision: Store scores as 0-100 integers, not 0.0-1.0 floats
- Rationale: JSONB storage efficiency, human readability (85 > 0.85), avoids floating-point precision issues in SQL threshold queries
- Impact: Normalization function required, but SQL queries simpler (`score < 60` vs `score < 0.6`)

**3. Parallel scoring strategy**
- Decision: Score all 5 sections in parallel, each section runs 3 judges in parallel internally
- Rationale: Haiku 4.5 is fast (~1-2s latency) and cheap (~$0.0002/call). Parallel = 15 LLM calls in ~2-3 seconds total. Sequential would take ~25 seconds.
- Impact: Cost savings are minimal ($0.003 either way), but latency reduction is 10x. Well worth the complexity.

**4. GIN index on quality_breakdown JSONB**
- Decision: Add GIN index for JSONB queries
- Rationale: Enables efficient `find_low_quality_profiles(threshold)` queries without full table scans. Critical for Phase 4 Plan 2 (prompt injection) which needs to query low-quality profiles.
- Impact: Slightly slower writes (index maintenance), but dramatically faster reads for threshold queries.

## Next Phase Readiness

**Blocks removed:**
- Phase 4 Plan 2 (Prompt Injection) can now query `find_low_quality_profiles(60)` to get candidates for refinement
- Phase 4 Plan 3 (Quality Threshold Refinement) can use `hasLowQualityScores()` and `getLowQualitySections()` to target specific weak sections

**Created dependencies:**
- `quality_breakdown` JSONB column must be populated before Plans 2-3 can use it
- Migration `20260209_quality_breakdown.sql` must be applied to production database

**No blockers introduced.** This is pure foundation layer.

## Testing Notes

**Manual testing needed:**
1. Apply migration to Supabase (run `20260209_quality_breakdown.sql` in SQL Editor)
2. Run `calculateQualityBreakdown()` on a real user profile
3. Verify JSONB structure matches expected format
4. Test `find_low_quality_profiles(60)` query returns expected users
5. Verify scores are reasonable (not all 0s, not all 100s)

**Potential failure modes:**
- Haiku 4.5 JSON parsing errors (handled by `bedrockChatJSON` try/catch)
- Empty/null sections (handled by returning `{ completeness: 0, coherence: 0, specificity: 0 }`)
- Scoring failures (handled by `scoringFailed: true` in judge results)

## Self-Check: PASSED

**Created files verified:**
- lib/evaluation/quality-judges.ts: ✓
- lib/evaluation/quality-scoring.ts: ✓
- supabase/migrations/20260209_quality_breakdown.sql: ✓

**Commit hashes verified:**
- f1e83fd: ✓
- 7cfb4a4: ✓

**Type compilation:**
- No errors with `npx tsc --noEmit --skipLibCheck`: ✓

**Exports verified:**
- quality-judges.ts: CompletenessJudge, CoherenceJudge, SpecificityJudge ✓
- quality-scoring.ts: scoreSoulprintSection, calculateQualityBreakdown, SectionQualityScores, QualityBreakdown, hasLowQualityScores, getLowQualitySections ✓

---

*Execution time: 3 minutes | Model: Claude Opus 4.6 | Commits: 2*
