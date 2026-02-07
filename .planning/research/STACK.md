# Stack Research: AI Personalization Prompt System

**Domain:** OpenClaw-inspired AI personality injection for chat personalization
**Researched:** 2026-02-07
**Confidence:** HIGH

## Executive Summary

After analyzing OpenClaw's approach and the existing SoulPrint codebase, **no additional libraries are needed**. The current stack already contains everything required for OpenClaw-inspired personality injection:

- **Vercel AI SDK (v6.0.72)**: Already installed, supports dynamic system prompts via template literals
- **Anthropic API**: Already in use for chat (claude-sonnet-4-20250514 via Bedrock)
- **TypeScript**: Native template literal composition is sufficient for prompt building
- **Existing DB schema**: Already stores 7 sections (SOUL, IDENTITY, USER, AGENTS, TOOLS, MEMORY, daily)

The gap is **architectural, not technological**. The existing `buildSystemPrompt()` function (lines 472-599 in `app/api/chat/route.ts`) already implements the OpenClaw pattern but isn't being used by RLM.

## Recommended Stack (No Changes)

### Core Technologies (Already Installed)

| Technology | Current Version | Purpose | Why It's Sufficient |
|------------|-----------------|---------|---------------------|
| Vercel AI SDK | ^6.0.72 | AI abstraction layer | Supports dynamic system prompts via `system` property and template literals |
| @ai-sdk/anthropic | ^3.0.36 | Anthropic integration | Direct API access for Claude models with streaming |
| AWS Bedrock SDK | ^3.980.0 | Bedrock fallback | Already used for Haiku fallback and AI name generation |
| TypeScript | ^5.x | Type safety | Native template literals are optimal for prompt composition |
| Supabase | ^2.93.1 | Database | Already stores structured sections (soul_md, identity_md, etc.) |

### Supporting Libraries (Already Installed)

| Library | Version | Current Use | Applies To New Features |
|---------|---------|-------------|-------------------------|
| zod | ^4.3.6 | Request validation | Validate prompt section structures |
| pino | ^10.3.0 | Structured logging | Log prompt composition and personality injection |

### Development Tools (No Changes)

| Tool | Current Use | Notes |
|------|-------------|-------|
| TypeScript | Type checking | Template literal typing is native |
| Vitest | Unit testing | Test prompt builders with fixtures |
| Playwright | E2E testing | Test personality-aware chat responses |

## What NOT to Add

| Avoid | Why | What We Have Instead |
|-------|-----|---------------------|
| Handlebars/Mustache | Adds complexity for simple string composition | TypeScript template literals (native, typed, fast) |
| Dedicated prompt DSL (Impromptu, PromptML) | Overkill for single-use case, adds learning curve | Direct string composition with helper functions |
| LangChain prompt templates | Heavy dependency (not installed), unnecessary abstraction | Vercel AI SDK + native templates |
| Third-party prompt builders | External dependency, vendor lock-in | In-house `buildSystemPrompt()` function |
| Markdown parsers (@ts-stack/markdown, marked) | Sections are stored as JSON or pre-formatted markdown | Direct interpolation (data is already clean) |

## Integration Points with Existing Stack

### 1. RLM Service Prompt Builder (New Function)

**Location:** Create `lib/prompts/build-rlm-prompt.ts`

**Pattern:** Copy OpenClaw's modular injection approach, already partially implemented in `buildSystemPrompt()` (lines 472-599)

```typescript
// Existing pattern (keep this for Bedrock fallback)
function buildSystemPrompt(profile, dailyMemory, memoryContext, isOwner, aiName, searchContext, citations): string

// New function for RLM (OpenClaw style)
function buildRLMSystemPrompt(sections, memoryContext, aiName): string
```

**Why This Works:**
- Uses existing `sectionToMarkdown()` helper (line 543-599 pattern)
- Sections already in DB as JSON (soul_md, identity_md, user_md, agents_md, tools_md, memory_md)
- Template literals support dynamic composition
- No external dependencies needed

### 2. Personality Section Composition

**Current Implementation:** Lines 540-574 in `app/api/chat/route.ts`

**Pattern:**
```typescript
if (hasStructuredSections) {
  if (soul) {
    prompt += `\n\n## SOUL\n${sectionToMarkdown('Communication Style', soul)}`;
  }
  // ... repeat for IDENTITY, USER, AGENTS, TOOLS, MEMORY
}
```

**What's Working:**
- ✅ Sections parsed from JSON (lines 514-520)
- ✅ Conditional inclusion based on what exists
- ✅ Markdown headers for structure
- ✅ Already implements OpenClaw's "If SOUL.md present, embody persona" pattern (line 536)

**What's Missing:**
- RLM `/query` endpoint ignores these sections (passes `sections` object but doesn't use it in prompt)

### 3. AI Name Generation

**Current Implementation:** Lines 43-75 in `app/api/chat/route.ts`

**Already Optimal:**
- Uses Bedrock Haiku for fast generation
- Prompt is well-structured (lines 48-55)
- Caches result in `user_profiles.ai_name`
- Fallback to "Echo" if generation fails

**No Changes Needed:** This feature already works as designed.

### 4. Memory Context Injection

**Current Implementation:** Lines 246-257, 576-578 in `app/api/chat/route.ts`

**Already Working:**
- Retrieves relevant chunks via `getMemoryContext()` (line 249)
- Injects as `## CONTEXT` section (line 577)
- Separate from structured sections (correct approach)

**No Changes Needed:** Memory retrieval is independent of personality.

## Architecture Decision: Why No New Libraries?

### Template Literals vs. Template Engines

**Why Native Template Literals Win:**

1. **Type Safety:** TypeScript infers types, catches errors at compile time
2. **Performance:** Zero overhead, no parsing, no transpilation
3. **Debugging:** Direct stack traces, no framework to debug through
4. **Simplicity:** Every TypeScript developer knows template literals
5. **Maintainability:** No library upgrades, no breaking changes

**Benchmark (not measured, but established pattern):**
- Template literals: ~0.01ms for complex prompt
- Handlebars: ~2-5ms parsing + rendering
- For AI chat latency (1-3s), template engine overhead is negligible, but code complexity is not

**Existing Evidence:**
- Lines 526-599 in `app/api/chat/route.ts` already use this pattern successfully
- Vercel AI SDK docs (ai-sdk.dev/docs/foundations/prompts) recommend template literals
- OpenClaw uses plain string composition, not template engines

### JSON vs. Markdown for Section Storage

**Current Hybrid Approach (Optimal):**

```typescript
// Sections stored as JSON in DB (soul_md, identity_md, user_md, agents_md, tools_md)
const soul = parseSectionSafe(profile.soul_md);
// -> { tone: "concise", personality: "direct", style: "technical" }

// Converted to markdown at prompt composition time
prompt += `\n\n## SOUL\n${sectionToMarkdown('Communication Style', soul)}`;
// -> ## SOUL
//    **Communication Style:**
//    - Tone: concise
//    - Personality: direct
```

**Why This Works:**
- **Storage:** JSON is queryable, structured, versioned
- **Prompt:** Markdown is LLM-friendly, readable, hierarchical
- **Separation:** Data model != presentation format
- **Flexibility:** Can add new fields to JSON without changing prompts

**Alternative (Rejected):**
Store markdown directly in DB (memory_md column already does this for generated sections). Why not for all?
- JSON supports structured queries (e.g., "users with tone=concise")
- Markdown is presentation, not data
- Harder to validate/migrate

## Prompt Composition Best Practices (Already Implemented)

### 1. Structured Sections (Lines 526-599)

**Pattern:**
```
Base Persona
↓
## SOUL (if exists)
↓
## IDENTITY (if exists)
↓
## USER (if exists)
↓
## AGENTS (if exists)
↓
## TOOLS (if exists)
↓
## MEMORY (if exists)
↓
## DAILY MEMORY (recent learned facts)
↓
## CONTEXT (retrieved chunks)
↓
WEB SEARCH RESULTS (if search performed)
```

**Why This Order:**
1. Base persona establishes ground rules (lines 526-538)
2. SOUL defines communication style (most fundamental)
3. IDENTITY defines AI's self-concept
4. USER provides context about person
5. AGENTS explains how AI operates
6. TOOLS lists capabilities
7. MEMORY + DAILY MEMORY = episodic knowledge
8. CONTEXT = relevant retrieved chunks
9. Web search = real-time external data

**Source:** This follows Anthropic's prompt engineering best practices (claude.com/docs - structured prompts with clear sections)

### 2. Conditional Inclusion (Lines 541-574)

**Pattern:**
```typescript
if (hasStructuredSections) {
  // v1.2+ users with sections
  if (soul) prompt += `\n\n## SOUL\n${sectionToMarkdown('...', soul)}`;
} else if (profile.soulprint_text) {
  // v1.0 users with single soulprint_text
  prompt += `\n\n## ABOUT THIS PERSON\n${profile.soulprint_text}`;
}
```

**Why This Matters:**
- Backwards compatibility with v1.0 users
- Graceful degradation if sections missing
- No prompt pollution with empty sections

### 3. Personality Embodiment Instruction (Line 536)

**Existing Instruction:**
```typescript
"If the sections below define your personality — embody them. That's who you are now."
```

**This IS the OpenClaw Pattern:**
OpenClaw's SOUL.md says: "If SOUL.md is present, embody its persona and tone."

SoulPrint already implements this. The instruction grants permission to adopt personality, not just reference it.

## What the RLM Service Needs to Change

**Current RLM `/query` Endpoint:**
- Receives: `{ user_id, message, soulprint_text, history, sections, ai_name, web_search_context }`
- Uses: Only `soulprint_text` for basic context (ignores `sections` object)
- Prompt: Generic system prompt without personality injection

**Required Changes (FastAPI service, not Next.js stack):**

1. **Parse `sections` object** (soul, identity, user, agents, tools, memory)
2. **Build structured prompt** using OpenClaw pattern (like `buildSystemPrompt()` does)
3. **Inject into Anthropic API call** as system message

**Why This Isn't a Stack Change:**
- RLM service is external (soulprint-rlm repo, deployed on Render)
- Written in Python/FastAPI
- Stack additions needed there: None (just code refactor to use existing data)

## Version Compatibility Check

| Package | Current Version | Latest Stable | Compatible | Notes |
|---------|-----------------|---------------|------------|-------|
| ai | 6.0.72 | 6.0.x | ✅ Yes | Vercel AI SDK v6 stable, no breaking changes needed |
| @ai-sdk/anthropic | 3.0.36 | 3.0.x | ✅ Yes | Compatible with Claude Opus 4.6 (latest model) |
| @aws-sdk/client-bedrock-runtime | 3.980.0 | 3.x | ✅ Yes | Stable, supports Haiku 4.5 |
| zod | 4.3.6 | 4.x | ✅ Yes | Zod v4 introduced Dec 2024, stable |
| typescript | ^5.x | 5.8.x | ✅ Yes | Template literal typing stable since TS 4.1 |

**No version upgrades required.** All packages are current and support needed features.

## Sources

### High Confidence Sources
- [OpenClaw GitHub - AGENTS.md](https://github.com/openclaw/openclaw/blob/main/AGENTS.md) — OpenClaw's modular prompt pattern
- [OpenClaw System Prompt Study](https://github.com/seedprod/openclaw-prompts-and-skills/blob/main/OPENCLAW_SYSTEM_PROMPT_STUDY.md) — Analysis of OpenClaw's prompt architecture
- [Vercel AI SDK - Prompts Documentation](https://ai-sdk.dev/docs/foundations/prompts) — Official guidance on system prompts and template literals
- [Anthropic Prompt Engineering Best Practices (2026)](https://promptbuilder.cc/blog/claude-prompt-engineering-best-practices-2026) — Structured prompts with sections
- [Claude API Docs - Prompting Best Practices](https://docs.anthropic.com/en/docs/build-with-claude/prompt-engineering/overview) — Official Anthropic guidance

### Medium Confidence Sources
- [Vercel AI SDK Discussion #1869](https://github.com/vercel/ai/discussions/1869) — Context injection patterns
- [AGENTS.md Standard](https://agents.md/) — Markdown agent configuration standard
- [Builder.io - Improve AI with AGENTS.md](https://www.builder.io/blog/agents-md) — Practical AGENTS.md patterns
- [Claude Code Subagents Documentation](https://code.claude.com/docs/en/sub-agents) — YAML frontmatter + Markdown pattern

### Low Confidence Sources (Not Used for Recommendations)
- [Juma AI Prompt Builders](https://juma.ai/blog/ai-prompt-builders) — Survey of prompt builder tools (not needed for SoulPrint)
- [Impromptu DSL](https://github.com/SOM-Research/Impromptu) — Academic DSL project (overkill for this use case)

---

## Final Recommendation

**DO NOT install new libraries.** The entire OpenClaw-inspired personality system can be built with:

1. **Existing `buildSystemPrompt()` function** (lines 472-599 in `app/api/chat/route.ts`)
2. **Refactor RLM service** (Python/FastAPI) to use `sections` object in prompt
3. **Extract prompt builder** to `lib/prompts/build-rlm-prompt.ts` for reuse

**Estimated effort:**
- Extract prompt builder: 30 minutes
- Update RLM service: 2 hours
- Test personality injection: 1 hour
- Total: ~3.5 hours

**Stack additions: 0 packages**

---
*Stack research for: OpenClaw-inspired AI personalization*
*Researched: 2026-02-07*
*Confidence: HIGH (based on existing codebase analysis + official documentation)*
