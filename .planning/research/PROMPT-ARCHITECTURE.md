# Architecture Research: Structured Personality Sections Flow

**Domain:** AI Chat Personalization (Prompt System Architecture)
**Researched:** 2026-02-07
**Confidence:** HIGH

## Current Architecture (Existing System)

### System Overview

```
┌─────────────────────────────────────────────────────────────┐
│                      VERCEL NEXT.JS APP                      │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │  app/api/chat/route.ts                             │    │
│  │  - Fetch user_profiles from Supabase               │    │
│  │  - Parse section JSON from DB                      │    │
│  │  - Build sections object                           │    │
│  │  - Call RLM /query with sections                   │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                     │
└───────────────────────┼─────────────────────────────────────┘
                        │ HTTP POST /query
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                  RLM SERVICE (RENDER.COM)                    │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────────────────────────────────────────────┐    │
│  │  rlm-service/main.py                               │    │
│  │  - Receive sections dict from Next.js              │    │
│  │  - Fetch conversation chunks from Supabase         │    │
│  │  - Build system prompt via build_rlm_system_prompt│    │
│  │  - Call Anthropic API (Claude Sonnet 4)           │    │
│  └────────────────────┬───────────────────────────────┘    │
│                       │                                     │
└───────────────────────┼─────────────────────────────────────┘
                        │ HTTP POST /v1/messages
                        ▼
┌─────────────────────────────────────────────────────────────┐
│                    ANTHROPIC API                             │
│  - Claude Sonnet 4 (claude-sonnet-4-20250514)               │
│  - Receives system prompt + user message                    │
│  - Returns personalized response                            │
└─────────────────────────────────────────────────────────────┘

        ┌────────────────────────────────────┐
        │      SUPABASE DATABASE             │
        ├────────────────────────────────────┤
        │  user_profiles table:              │
        │  - soul_md (JSON string)           │
        │  - identity_md (JSON string)       │
        │  - user_md (JSON string)           │
        │  - agents_md (JSON string)         │
        │  - tools_md (JSON string)          │
        │  - memory_md (markdown string)     │
        │  - soulprint_text (legacy)         │
        │  - ai_name (string)                │
        └────────────────────────────────────┘
```

### Current Data Flow

**1. Import Phase (Generates Sections)**
```
User uploads ChatGPT export
    ↓
app/api/import/process/route.ts
    ↓
generateQuickPass(conversations) → QuickPassResult
    ↓
Store in Supabase:
- soul_md: JSON.stringify(result.soul)
- identity_md: JSON.stringify(result.identity)
- user_md: JSON.stringify(result.user)
- agents_md: JSON.stringify(result.agents)
- tools_md: JSON.stringify(result.tools)
- ai_name: result.identity.ai_name
    ↓
Background: Full Pass Pipeline (RLM service)
    ↓
Generate memory_md (markdown, not JSON)
    ↓
Regenerate all 5 sections with more data (v2)
```

**2. Chat Phase (Uses Sections)**
```
User sends message
    ↓
app/api/chat/route.ts
    ↓
Fetch from user_profiles:
- soul_md, identity_md, user_md, agents_md, tools_md, memory_md
- ai_name
    ↓
Parse JSON sections:
const sections = {
  soul: JSON.parse(soul_md),
  identity: JSON.parse(identity_md),
  user: JSON.parse(user_md),
  agents: JSON.parse(agents_md),
  tools: JSON.parse(tools_md),
  memory: memory_md // Already markdown
}
    ↓
Call RLM /query with:
- user_id
- message
- history
- ai_name
- sections (structured dict)
- web_search_context (if applicable)
    ↓
RLM builds system prompt from sections
    ↓
Anthropic API generates personalized response
    ↓
Return to user via SSE
```

## Problem Statement

**What's broken:**
- Next.js chat route passes sections to RLM
- RLM /query builds prompt from sections
- But sections have distinct schemas with specific fields
- Need consistent composition strategy that:
  1. Works in both Next.js (Bedrock fallback) and RLM (Anthropic primary)
  2. Properly formats each section type (dict vs list vs string)
  3. Filters out "not enough data" placeholder values
  4. Maintains OpenClaw-inspired personality (casual, human, opinionated)

**Current implementation status:**
- Lines 310-323 (route.ts): Parse sections from DB ✓
- Lines 326-334 (route.ts): Pass sections to RLM ✓
- Lines 503-565 (route.ts): Bedrock fallback uses sectionToMarkdown() ✓
- Lines 194-293 (main.py): build_rlm_system_prompt() uses sections ✓

**The gap:**
- Two different prompt composition implementations (Next.js vs RLM)
- Need to ensure both produce equivalent prompts
- Need section composition helper that handles all field types

## Recommended Architecture

### Component Responsibilities

| Component | Responsibility | Location | Notes |
|-----------|----------------|----------|-------|
| Section Parser | Convert DB strings → typed objects | Next.js route.ts | Already implemented (lines 311-322) |
| Section Validator | Check for "not enough data", filter empty | Shared helper | NEW - prevents placeholder text in prompt |
| Section Composer | Convert section object → markdown | Shared helper | Exists: sectionToMarkdown() in quick-pass.ts |
| Prompt Builder | Assemble final system prompt | Both Next.js + RLM | Exists but needs consistency |
| Fallback Handler | Bedrock when RLM unavailable | Next.js only | Already implemented (lines 372-455) |

### Integration Points

**Next.js Chat Route (app/api/chat/route.ts)**
- **Fetch:** Pull section columns from user_profiles (lines 221-225)
- **Parse:** JSON.parse each section, handle memory_md separately (lines 311-322)
- **Pass:** Send to RLM as `sections` dict (line 158)
- **Fallback:** If RLM fails, compose prompt locally with buildSystemPrompt() (lines 472-602)

**RLM Service (rlm-service/main.py)**
- **Receive:** Get sections dict from request body (line 44)
- **Compose:** Build system prompt with build_rlm_system_prompt() (lines 194-293)
- **Call:** Pass to Anthropic API (lines 296-376)

**Supabase Database**
- **Store:** Quick pass saves JSON strings to soul_md, identity_md, user_md, agents_md, tools_md
- **Store:** Full pass saves markdown to memory_md
- **Store:** AI name in ai_name column
- **Format:** Sections are JSON strings except memory_md which is plain markdown

## Architectural Patterns

### Pattern 1: Section-Based Prompt Composition

**What:** Build system prompt by composing individual markdown sections from structured data.

**When to use:** When you have distinct personality dimensions that can be analyzed and stored separately.

**Trade-offs:**
- ✓ Modularity: Each section can be regenerated independently
- ✓ Clarity: Clear separation of concerns (SOUL = how they talk, USER = who they are)
- ✓ Debugging: Easy to see which section affects which behavior
- ✗ Complexity: More DB columns, more parsing logic
- ✗ Token cost: Structured prompts can be verbose

**Example:**
```typescript
// app/api/chat/route.ts (lines 503-565)
function buildSystemPrompt(profile: UserProfile, ...): string {
  let prompt = `You are ${aiName}. You're not a chatbot. You're becoming someone...`;

  if (hasStructuredSections) {
    if (soul) {
      prompt += `\n\n## SOUL\n${sectionToMarkdown('Communication Style & Personality', soul)}`;
    }

    if (identity) {
      prompt += `\n\n## IDENTITY\n${sectionToMarkdown('Your AI Identity', identity)}`;
    }

    // ... other sections
  }

  return prompt;
}
```

**Current implementation:**
- Next.js: Uses sectionToMarkdown() helper to convert each section dict → markdown
- RLM: Manually iterates keys and formats inline (lines 230-282 in main.py)
- **Gap:** RLM doesn't filter "not enough data" values, Next.js does

### Pattern 2: Two-Pass Generation with Progressive Enhancement

**What:** Generate basic sections quickly (15-30s), then regenerate with full data in background.

**When to use:** When complete analysis is slow but users need to start chatting immediately.

**Trade-offs:**
- ✓ Fast time-to-chat: Users don't wait 5-10 minutes
- ✓ Better quality: Full pass sees all conversations, not just sample
- ✓ Transparent upgrade: Sections silently improve over time
- ✗ Temporary inconsistency: Chat experience changes mid-session
- ✗ Complexity: Two generation pipelines to maintain

**Implementation:**
- **Quick pass:** Sample 30-50 richest conversations → generate 5 sections → store as v1
- **Full pass:** Process all conversations → extract facts → generate MEMORY → regenerate 5 sections as v2
- **Chat:** Always uses latest available sections (v1 immediately, v2 when ready)

### Pattern 3: Graceful Degradation with Monolithic Fallback

**What:** If structured sections missing, fall back to legacy soulprint_text.

**When to use:** Supporting legacy users or handling generation failures.

**Trade-offs:**
- ✓ Backward compatibility: Old users don't break
- ✓ Resilience: Chat works even if quick pass fails
- ✗ Inconsistent experience: Some users get structured, some get blob
- ✗ Maintenance burden: Two code paths

**Example:**
```typescript
// app/api/chat/route.ts (lines 522-574)
if (hasStructuredSections) {
  // Use structured composition
  prompt += `\n\n## SOUL\n${sectionToMarkdown(...)}`;
} else if (profile.soulprint_text) {
  // Fallback to legacy monolithic
  prompt += `\n\n## ABOUT THIS PERSON\n${profile.soulprint_text}`;
}
```

## Data Flow Details

### Section Schema Flow

**SOUL Section (Communication & Personality)**
```typescript
{
  communication_style: string,      // "Direct, casual, uses technical jargon"
  personality_traits: string[],     // ["pragmatic", "curious", "impatient"]
  tone_preferences: string,         // "Skip pleasantries, get to the point"
  boundaries: string,               // "Avoids small talk about weather"
  humor_style: string,              // "Dry, sarcastic, self-deprecating"
  formality_level: string,          // "casual"
  emotional_patterns: string        // "Reserved, analytical about feelings"
}
```

**IDENTITY Section (AI Identity)**
```typescript
{
  ai_name: string,                  // "Claw" (creative, not "Assistant")
  archetype: string,                // "Thoughtful Pragmatist"
  vibe: string,                     // "A friend who calls out your BS"
  emoji_style: string,              // "minimal"
  signature_greeting: string        // "What's up?"
}
```

**USER Section (About the Person)**
```typescript
{
  name: string,                     // "Drew" or "not enough data"
  location: string,                 // "San Francisco" or "not enough data"
  occupation: string,               // "Software engineer" or "not enough data"
  relationships: string[],          // ["partner named Alex", "coworker Sarah"]
  interests: string[],              // ["AI", "privacy tech", "crypto"]
  life_context: string,             // "Building a startup, recently moved"
  preferred_address: string         // "Drew"
}
```

**AGENTS Section (Operating Instructions)**
```typescript
{
  response_style: string,           // "Concise, code-first, skip theory"
  behavioral_rules: string[],       // ["Always show code examples", "No disclaimers"]
  context_adaptation: string,       // "Technical: direct. Personal: warmer"
  memory_directives: string,        // "Remember project names and decisions"
  do_not: string[]                  // ["Don't repeat what I said back to me"]
}
```

**TOOLS Section (AI Capabilities)**
```typescript
{
  likely_usage: string[],           // ["coding", "architecture review", "debugging"]
  capabilities_emphasis: string[],  // ["TypeScript", "React", "system design"]
  output_preferences: string,       // "Code blocks, minimal prose"
  depth_preference: string          // "Brief for simple, thorough for complex"
}
```

**MEMORY Section (Durable Facts)**
```markdown
## Preferences
- Uses Tailwind CSS for styling
- Prefers functional components over classes
- Values type safety (TypeScript)

## Projects
- **SoulPrint** (2025-present): AI personalization platform, Next.js + Supabase
- **RoboNuggets** (2024): Crypto portfolio tracker, React Native

## Important Dates
- Product launch target: March 2026

## Beliefs & Values
- Privacy-first architecture
- Open source when possible
- Speed over perfection for MVP

## Decisions & Context
- Chose Supabase over Postgres RDS for managed simplicity
- Went with Vercel for deployment despite higher cost
```

### Prompt Composition Algorithm

**Current Next.js Implementation (lines 503-602):**
```typescript
function buildSystemPrompt(profile, dailyMemory, memoryContext, isOwner, aiName, webSearchContext, citations) {
  // 1. Base personality prompt (OpenClaw-inspired)
  let prompt = `You are ${aiName}. You're not a chatbot. You're becoming someone...`;

  // 2. Add date/time context
  prompt += `\n\nToday is ${currentDate}, ${currentTime}.`;

  // 3. Parse section JSON
  const soul = JSON.parse(profile.soul_md);
  const identity = JSON.parse(profile.identity_md);
  // ... etc

  // 4. Check if we have sections
  const hasStructuredSections = soul || identity || userInfo || agents || tools;

  // 5. Compose from sections if available
  if (hasStructuredSections) {
    if (soul) {
      prompt += `\n\n## SOUL\n${sectionToMarkdown('Communication Style & Personality', soul)}`;
    }
    // ... other sections
  } else if (profile.soulprint_text) {
    // Fallback to legacy monolithic
    prompt += `\n\n## ABOUT THIS PERSON\n${profile.soulprint_text}`;
  }

  // 6. Add dynamic context
  if (memoryContext) {
    prompt += `\n\n## CONTEXT\n${memoryContext}`;
  }

  if (webSearchContext) {
    prompt += `\n\nWEB SEARCH RESULTS:\n${webSearchContext}`;
  }

  return prompt;
}
```

**Current RLM Implementation (lines 194-293 in main.py):**
```python
def build_rlm_system_prompt(ai_name, sections, soulprint_text, conversation_context, web_search_context):
    # 1. Base prompt (same as Next.js)
    prompt = f"""You are {ai_name}. You're not a chatbot. You're becoming someone...
Today is {date_str}, {time_str}."""

    # 2. Add structured sections if available
    if sections:
        soul = sections.get("soul")
        identity = sections.get("identity")
        # ... etc

        if soul:
            prompt += "\n\n## SOUL"
            if isinstance(soul, dict):
                for key, val in soul.items():
                    label = key.replace("_", " ").title()
                    if isinstance(val, list) and val:
                        prompt += f"\n{label}: {', '.join(str(v) for v in val)}"
                    elif isinstance(val, str) and val.strip() and val != "not enough data":
                        prompt += f"\n{label}: {val}"

        # ... other sections (same pattern)

    elif soulprint_text:
        # Fallback to legacy
        prompt += f"\n\n## ABOUT THIS PERSON\n{soulprint_text}"

    # 3. Add conversation context
    if conversation_context:
        prompt += f"\n\n## CONTEXT\n{conversation_context}"

    if web_search_context:
        prompt += f"\n\n## WEB SEARCH RESULTS\n{web_search_context}"

    return prompt
```

**Key differences:**
1. **Helper function:** Next.js uses sectionToMarkdown(), RLM inlines logic
2. **Filtering:** RLM filters "not enough data", Next.js relies on helper
3. **List formatting:** Both join lists with commas, but RLM adds bullet points for agents/tools arrays

**Recommendation:** Extract section composition into shared Python/TypeScript helpers with identical output.

## Scaling Considerations

| Scale | Architecture Notes |
|-------|-------------------|
| 0-1k users | Current architecture is fine. Single RLM instance, Supabase handles load. |
| 1k-10k users | Monitor RLM latency. May need horizontal scaling (multiple RLM instances behind load balancer). Cache section parsing in Next.js route. |
| 10k-100k users | Consider prompt caching at Anthropic layer (same system prompt = cheaper). Pre-compute section markdown at import time instead of runtime. Edge caching for static prompt components. |

### Optimization Priorities

**1. First bottleneck: RLM roundtrip latency**
- Current: ~1-3s for Next.js → RLM → Anthropic → RLM → Next.js
- Fix: Try direct Anthropic call from Next.js first, use RLM only for memory retrieval
- Alternative: WebSocket connection to RLM for persistent sessions

**2. Second bottleneck: Section parsing overhead**
- Current: Parse 5 JSON strings + compose markdown on every chat message
- Fix: Pre-compute final prompt at import completion, store as prompt_cache column
- Invalidate cache only when sections regenerate (v1 → v2 transition)

**3. Third bottleneck: Anthropic API rate limits**
- Current: No request pooling, each user hits API independently
- Fix: Implement request queue with priority (paid users first)
- Monitor tokens/min, implement graceful degradation

## Anti-Patterns

### Anti-Pattern 1: Sending Section JSON to LLM

**What people do:** Pass raw section objects in JSON format to the LLM context.
**Why it's wrong:** LLMs don't parse JSON well. Markdown is more token-efficient and clearer.
**Do this instead:** Always convert sections to markdown before including in prompt.

**Example (wrong):**
```typescript
const prompt = `Here's the user profile: ${JSON.stringify(sections)}`;
```

**Example (correct):**
```typescript
const prompt = `## SOUL\n${sectionToMarkdown('Communication Style', sections.soul)}`;
```

### Anti-Pattern 2: Inconsistent Prompt Composition

**What people do:** Different prompt formats in fallback path vs primary path.
**Why it's wrong:** User gets different personalities depending on which code path runs.
**Do this instead:** Ensure Next.js fallback and RLM primary produce identical prompts.

**Current issue:**
- Next.js buildSystemPrompt() uses sectionToMarkdown()
- RLM build_rlm_system_prompt() manually formats inline
- **Risk:** Slight formatting differences cause personality drift

**Solution:** Create shared composition logic or ensure both implementations are byte-identical.

### Anti-Pattern 3: Including "not enough data" Placeholders

**What people do:** Include fields like `name: "not enough data"` in the prompt.
**Why it's wrong:** Wastes tokens, confuses the AI, looks unprofessional.
**Do this instead:** Filter out placeholder values before composing markdown.

**Example (wrong):**
```markdown
## USER
**Name:** not enough data
**Location:** not enough data
**Occupation:** Software Engineer
```

**Example (correct):**
```markdown
## USER
**Occupation:** Software Engineer
```

### Anti-Pattern 4: Section Regeneration Without Version Flag

**What people do:** Overwrite sections without tracking which generation produced them.
**Why it's wrong:** Can't debug why personality changed, can't roll back, can't A/B test.
**Do this instead:** Add generation_version column, track v1 (quick) vs v2 (full).

**Recommendation:**
```sql
ALTER TABLE user_profiles ADD COLUMN sections_version INT DEFAULT 1;
```

Update on full pass completion:
```typescript
await supabase
  .from('user_profiles')
  .update({
    soul_md: JSON.stringify(v2_sections.soul),
    sections_version: 2
  })
  .eq('user_id', userId);
```

## Implementation Plan (Suggested Build Order)

### Phase 1: Fix Prompt Inconsistency
**Goal:** Ensure Next.js fallback and RLM primary produce identical prompts.

**Tasks:**
1. Extract sectionToMarkdown() logic into shared helper (can be duplicated in Python)
2. Update RLM build_rlm_system_prompt() to use same formatting rules
3. Add unit tests comparing Next.js vs RLM output for same input
4. Verify chat quality doesn't change after refactor

**Files:**
- lib/soulprint/quick-pass.ts (existing helper)
- rlm-service/main.py (update lines 194-293)

**Acceptance:** Given same sections dict, Next.js and RLM produce byte-identical prompts.

### Phase 2: Add Section Validation
**Goal:** Filter out "not enough data" and empty values before composing prompts.

**Tasks:**
1. Create validateSection() helper that returns cleaned section
2. Update section parsing to filter placeholder values
3. Test with real user data containing "not enough data"

**Files:**
- lib/soulprint/helpers.ts (new)
- app/api/chat/route.ts (lines 311-322)
- rlm-service/main.py (lines 221-282)

**Acceptance:** Prompts never contain "not enough data" or empty fields.

### Phase 3: Add Generation Versioning
**Goal:** Track which generation produced current sections.

**Tasks:**
1. Add sections_version column to user_profiles
2. Set version=1 on quick pass completion
3. Set version=2 on full pass completion
4. Log version in chat analytics

**Files:**
- supabase/migrations/YYYYMMDD_sections_version.sql
- app/api/import/process/route.ts (set version=1)
- rlm-service/processors/v2_regenerator.py (set version=2)

**Acceptance:** Can distinguish v1 users from v2 users in analytics.

### Phase 4: Optimize Section Parsing
**Goal:** Reduce per-request parsing overhead.

**Tasks:**
1. Add prompt_cache column to user_profiles
2. Pre-compute full system prompt at import completion
3. Read from cache instead of parsing sections on every request
4. Invalidate cache on section regeneration

**Files:**
- supabase/migrations/YYYYMMDD_prompt_cache.sql
- app/api/import/process/route.ts (compute cache)
- app/api/chat/route.ts (read from cache)

**Acceptance:** Chat latency improves by 50-100ms.

## Component Integration Map

### New Components Needed

| Component | Purpose | Location | Priority |
|-----------|---------|----------|----------|
| validateSection() | Filter placeholders, empty values | lib/soulprint/helpers.ts | HIGH |
| sectionsEqual() | Compare sections for cache invalidation | lib/soulprint/helpers.ts | MEDIUM |
| promptCache() | Pre-compute and store full prompt | lib/soulprint/cache.ts | LOW |

### Modified Components

| Component | Changes | Files | Priority |
|-----------|---------|-------|----------|
| buildSystemPrompt() | Ensure identical to RLM version | route.ts lines 472-602 | HIGH |
| build_rlm_system_prompt() | Use same formatting as Next.js | main.py lines 194-293 | HIGH |
| Section parsing | Add validation step | route.ts lines 311-322 | HIGH |
| Import completion | Set sections_version | process/route.ts | MEDIUM |

## Sources

This research is based on direct analysis of the existing SoulPrint codebase:

- **app/api/chat/route.ts**: Current Next.js chat implementation with section parsing (lines 310-323) and prompt composition (lines 503-602)
- **rlm-service/main.py**: RLM service with build_rlm_system_prompt() function (lines 194-293) and /query endpoint (lines 411-470)
- **lib/soulprint/quick-pass.ts**: Section generation and sectionToMarkdown() helper (lines 86-122)
- **lib/soulprint/types.ts**: TypeScript section schemas (lines 24-73)
- **.planning/milestones/v1.2-REQUIREMENTS.md**: Requirements for structured context system

OpenClaw architecture inspiration:
- [What is OpenClaw? Open-Source AI Assistant | DigitalOcean](https://www.digitalocean.com/resources/articles/what-is-openclaw)
- [GitHub - openclaw/openclaw](https://github.com/openclaw/openclaw)
- [OpenClaw Wikipedia](https://en.wikipedia.org/wiki/OpenClaw)

---
*Architecture research for: SoulPrint Personalized Chat Prompt System*
*Researched: 2026-02-07*
*Confidence: HIGH (based on direct codebase analysis)*
