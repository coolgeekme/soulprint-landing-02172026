# Architecture Research: AI Quality & Personalization Integration

**Domain:** AI Evaluation & Prompt Improvement
**Researched:** 2026-02-08
**Confidence:** HIGH

## Current Architecture Overview

### Existing System (v1.2)

```
┌────────────────────────────────────────────────────────────────┐
│                      IMPORT FLOW                               │
├────────────────────────────────────────────────────────────────┤
│  User uploads ChatGPT ZIP                                      │
│       ↓                                                        │
│  Quick Pass (Haiku 4.5, ~30s)                                 │
│    - Sample 30-50 richest conversations                       │
│    - Generate 5 sections: SOUL, IDENTITY, USER, AGENTS, TOOLS │
│    - Store as JSON in user_profiles columns                   │
│       ↓                                                        │
│  User can chat immediately (import_status: 'quick_ready')     │
│       ↓                                                        │
│  Full Pass (RLM background)                                   │
│    - Process all conversations                                │
│    - Extract facts → MEMORY section                           │
│    - Regenerate 5 sections as v2 with complete data           │
│    - Update sections silently (no user interruption)          │
└────────────────────────────────────────────────────────────────┘

┌────────────────────────────────────────────────────────────────┐
│                      CHAT FLOW                                 │
├────────────────────────────────────────────────────────────────┤
│  User sends message                                            │
│       ↓                                                        │
│  app/api/chat/route.ts                                         │
│    - Fetch user_profiles (soul_md, identity_md, etc.)         │
│    - Parse JSON sections + memory_md                          │
│    - Get learned_facts (daily memory from past chats)         │
│    - Search conversation_chunks for context                   │
│       ↓                                                        │
│  Try RLM Service (15s timeout)                                │
│    - Pass sections dict + ai_name + history                   │
│    - RLM builds system prompt via build_rlm_system_prompt()   │
│    - Calls Anthropic Sonnet 4.5 with built prompt             │
│    - Returns streaming response                               │
│       ↓                                                        │
│  Fallback to Bedrock (if RLM fails)                           │
│    - buildSystemPrompt() composes from sections locally       │
│    - Calls Bedrock Haiku 4.5 with Converse API                │
│    - Streams response                                         │
│       ↓                                                        │
│  Post-response learning                                       │
│    - extractFactsFromChat() analyzes exchange                 │
│    - storeLearnedFacts() saves to learned_facts table         │
│       ↓                                                        │
│  Opik Tracing (optional, if OPIK_API_KEY set)                 │
│    - traceChatRequest() logs user/message/response            │
│    - traceQuickPass() logs generation latency                 │
│    - flushOpik() sends to Comet.com dashboard                 │
└────────────────────────────────────────────────────────────────┘
```

### Key Integration Points

| Component | Location | Current Responsibility | Integration Opportunity |
|-----------|----------|------------------------|-------------------------|
| `buildSystemPrompt()` | app/api/chat/route.ts lines 427-602 | Compose 7-section prompt | **PROMPT IMPROVEMENT** - Replace with natural voice |
| `bedrockChatJSON()` | lib/bedrock.ts | Quick pass generation | **EVALUATION** - Score output quality |
| `generateQuickPass()` | lib/soulprint/quick-pass.ts | Section generation | **SCORING** - Assess completeness/coherence |
| `build_rlm_system_prompt()` | rlm-service/main.py lines 194-293 | RLM prompt composition | **CONSISTENCY** - Must match Next.js version |
| `learnFromChat()` | lib/memory/learning.ts | Extract facts from chat | **LINGUISTIC ANALYSIS** - Analyze patterns here |
| Opik tracing | lib/opik.ts | Log traces for monitoring | **EVALUATION** - Add dataset/experiment support |

## Problem Statement: Integration Challenges

### Challenge 1: Opik Evaluation vs Tracing

**Current:** Opik is used for passive tracing only (lines 19, 331-338 in route.ts)
- `traceChatRequest()` logs each chat interaction
- `traceQuickPass()` logs quick pass generation
- `flushOpik()` sends data to dashboard
- No evaluation datasets, no experiments, no scoring

**Gap:**
- Tracing shows what happened, not whether it was good
- No systematic way to test prompt changes before deployment
- No quality baseline to measure improvements against

**Architecture Question:**
- Where do evaluation datasets live? (Opik cloud? Supabase? Local files?)
- When do experiments run? (CI/CD? Manual script? Background job?)
- How do experiments integrate with tracing? (Same spans? Separate?)

### Challenge 2: Prompt Improvement Flow

**Current:** Technical, structured prompts
```markdown
## SOUL
**Communication Style:** Direct, casual, uses technical jargon
**Personality Traits:**
- pragmatic
- curious
- impatient
```

**Target:** Natural voice prompts
```markdown
You communicate directly and casually with a lot of technical jargon.
You're pragmatic, curious, and impatient — you get straight to the point.
```

**Gap:**
- Two prompt builders: `buildSystemPrompt()` (Next.js) and `build_rlm_system_prompt()` (RLM)
- No mechanism to A/B test prompt styles
- No quality metric to determine if natural voice is actually better

**Architecture Question:**
- How do prompt changes flow through the system? (Version prompt templates? Dynamic generation?)
- Where is the natural voice transformation applied? (At generation time? At chat time? Pre-computed?)
- How do we ensure RLM and Next.js produce identical prompts?

### Challenge 3: Linguistic Analysis Timing

**Current:** Pattern extraction happens post-response
- `extractFactsFromChat()` analyzes user message + AI response (learning.ts lines 43-123)
- Extracts facts but not linguistic patterns (formality, vocabulary, syntax)

**Options:**
1. **Import-time analysis** - Analyze ChatGPT export during quick/full pass
2. **Runtime analysis** - Analyze each user message during chat
3. **Hybrid** - Initial baseline at import, refinement at runtime

**Architecture Question:**
- Where does linguistic analysis run? (Quick pass? Full pass? Chat API?)
- What's analyzed? (User messages only? Chat history? Both?)
- How are patterns stored? (New DB table? Extend existing sections?)

### Challenge 4: Soulprint Quality Scoring

**Current:** No quality measurement
- Sections are generated but never scored
- No way to know if quick pass v1 or full pass v2 is better
- No iterative refinement based on quality metrics

**Gap:**
- What makes a soulprint "high quality"? (Completeness? Coherence? Specificity?)
- How do we score it? (LLM-as-judge? Rule-based? User feedback?)
- When do we regenerate? (On schedule? When quality drops? Never?)

**Architecture Question:**
- Where does quality scoring run? (After generation? Background job? Manual?)
- What's the scoring pipeline? (Single evaluator? Multiple metrics?)
- How does scoring trigger refinement? (Automatic? Manual review?)

## Recommended Architecture: v2.0 Integration

### Component Responsibilities

| Component | Purpose | Location | New/Modified |
|-----------|---------|----------|--------------|
| **Evaluation Dataset Manager** | Create/manage Opik datasets from chat history | lib/evaluation/datasets.ts | NEW |
| **Experiment Runner** | Run prompt experiments with scoring | lib/evaluation/experiments.ts | NEW |
| **Prompt Template System** | Version-controlled prompt templates | lib/prompts/templates/ | NEW |
| **Natural Voice Transformer** | Convert sections → natural language | lib/prompts/natural-voice.ts | NEW |
| **Linguistic Analyzer** | Extract patterns from user text | lib/analysis/linguistic.ts | NEW |
| **Soulprint Scorer** | Quality metrics for sections | lib/scoring/soulprint.ts | NEW |
| **Refinement Engine** | Iteratively improve low-quality sections | lib/refinement/engine.ts | NEW |
| **buildSystemPrompt()** | Use templates + natural voice | app/api/chat/route.ts | MODIFIED |
| **generateQuickPass()** | Add linguistic analysis step | lib/soulprint/quick-pass.ts | MODIFIED |
| **Opik client** | Support datasets + experiments | lib/opik.ts | MODIFIED |

### Data Flow: Evaluation Pipeline

```
┌──────────────────────────────────────────────────────────────┐
│              EVALUATION DATASET CREATION                     │
├──────────────────────────────────────────────────────────────┤
│  Manual/Automated Selection:                                 │
│    - Real user chat history (anonymized)                     │
│    - Synthetic test cases (edge cases, personas)             │
│    - Golden examples (human-rated "good" responses)          │
│       ↓                                                      │
│  lib/evaluation/datasets.ts                                  │
│    - createDataset(name, items[])                           │
│    - items: { input: message, expected_output: ideal }       │
│    - Opik.create_dataset() or store in Supabase             │
│       ↓                                                      │
│  Stored as:                                                  │
│    - Opik cloud dataset (via Python SDK/REST API)           │
│    - OR evaluation_datasets table in Supabase               │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│              EXPERIMENT EXECUTION                            │
├──────────────────────────────────────────────────────────────┤
│  Trigger: Manual CLI script or CI/CD                         │
│       ↓                                                      │
│  lib/evaluation/experiments.ts                               │
│    - runExperiment(datasetId, promptVariant)                │
│    - For each dataset item:                                  │
│       1. Generate response with variant prompt               │
│       2. Score response with LLM-as-judge                    │
│       3. Log to Opik experiment                              │
│       ↓                                                      │
│  Scoring Metrics (LLM-as-judge):                             │
│    - Personality coherence (0-1)                             │
│    - Natural voice (0-1)                                     │
│    - Context awareness (0-1)                                 │
│    - Emotional intelligence (0-1)                            │
│    - Factual accuracy (0-1)                                  │
│       ↓                                                      │
│  Results stored:                                             │
│    - Opik experiment with aggregate scores                   │
│    - Compare variants: technical vs natural voice            │
│       ↓                                                      │
│  Decision:                                                   │
│    - If new variant scores >10% better → deploy             │
│    - If worse → rollback, iterate                            │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow: Prompt Improvement

```
┌──────────────────────────────────────────────────────────────┐
│         PROMPT TEMPLATE VERSIONING                           │
├──────────────────────────────────────────────────────────────┤
│  lib/prompts/templates/                                      │
│    - v1-technical.ts (current)                               │
│    - v2-natural-voice.ts (new)                               │
│    - v3-dynamic-primer.ts (future)                           │
│       ↓                                                      │
│  Template structure:                                         │
│    {                                                         │
│      version: 'v2-natural-voice',                            │
│      buildPrompt(sections, context) {                        │
│        // Transform sections to natural language             │
│        return naturalVoiceTransform(sections)                │
│      }                                                       │
│    }                                                         │
│       ↓                                                      │
│  Configuration (env var or DB):                              │
│    PROMPT_TEMPLATE_VERSION=v2-natural-voice                  │
│       ↓                                                      │
│  Runtime usage:                                              │
│    const template = getPromptTemplate(version)               │
│    const prompt = template.buildPrompt(sections, context)    │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│         NATURAL VOICE TRANSFORMATION                         │
├──────────────────────────────────────────────────────────────┤
│  Input: Structured sections (JSON)                           │
│    soul: {                                                   │
│      communication_style: "Direct, casual",                  │
│      personality_traits: ["pragmatic", "curious"]            │
│    }                                                         │
│       ↓                                                      │
│  lib/prompts/natural-voice.ts                                │
│    - transformSection(section) → natural language            │
│    - Rules:                                                  │
│      • No markdown headers                                   │
│      • First person narrative                                │
│      • Conversational tone                                   │
│      • Integrate traits into flow                            │
│       ↓                                                      │
│  Output: Natural language prompt                             │
│    "You communicate directly and casually. You're pragmatic  │
│     and curious, always questioning assumptions. You get     │
│     straight to the point without pleasantries."             │
│       ↓                                                      │
│  Integration:                                                │
│    - buildSystemPrompt() calls transformSection() per section│
│    - RLM build_rlm_system_prompt() uses identical logic      │
│    - Cached in prompt_cache column (invalidate on regen)     │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow: Linguistic Analysis

```
┌──────────────────────────────────────────────────────────────┐
│         IMPORT-TIME BASELINE ANALYSIS                        │
├──────────────────────────────────────────────────────────────┤
│  During Quick Pass (generateQuickPass):                      │
│    - Sample conversations already loaded                     │
│    - Extract user messages only (filter role: 'user')        │
│       ↓                                                      │
│  lib/analysis/linguistic.ts                                  │
│    - analyzeUserLanguage(userMessages[]) → LinguisticProfile │
│      • Formality score (0-1)                                 │
│      • Vocabulary complexity (Flesch-Kincaid)                │
│      • Sentence structure (avg length, complexity)           │
│      • Punctuation style (!, ?, emoji usage)                 │
│      • Common phrases (3-5 word n-grams)                     │
│      • Topic distribution (technical, personal, creative)    │
│       ↓                                                      │
│  Store in user_profiles:                                     │
│    - linguistic_profile (JSONB column)                       │
│    - Used by prompt to mirror user's style                   │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│         RUNTIME PATTERN REFINEMENT                           │
├──────────────────────────────────────────────────────────────┘
│  During Chat (learnFromChat):                                │
│    - Already extracting facts from user messages             │
│    - Add linguistic pattern extraction                       │
│       ↓                                                      │
│  lib/analysis/linguistic.ts                                  │
│    - extractPatterns(userMessage) → {                        │
│        formality_shift: +0.1,  // getting more casual        │
│        new_phrases: ["let's ship it"],                       │
│        emoji_trend: increasing                               │
│      }                                                       │
│       ↓                                                      │
│  Update linguistic_profile incrementally:                    │
│    - Running average for scores                              │
│    - Append to common_phrases list                           │
│    - Track trends over time                                  │
│       ↓                                                      │
│  Trigger section regeneration if drift detected:             │
│    - If formality changes >0.3 → update SOUL section         │
│    - If new topic emerges → update INTERESTS                 │
└──────────────────────────────────────────────────────────────┘
```

### Data Flow: Soulprint Quality Scoring

```
┌──────────────────────────────────────────────────────────────┐
│         QUALITY SCORING PIPELINE                             │
├──────────────────────────────────────────────────────────────┤
│  Trigger: After section generation (quick or full pass)      │
│       ↓                                                      │
│  lib/scoring/soulprint.ts                                    │
│    - scoreSoulprint(sections) → QualityReport               │
│       ↓                                                      │
│  Metrics:                                                    │
│    1. Completeness (0-1)                                     │
│       - % of fields populated (not "not enough data")        │
│       - Weighted by importance (ai_name critical)            │
│                                                              │
│    2. Coherence (0-1) - LLM-as-judge                         │
│       - Do sections align internally?                        │
│       - Prompt: "Do these personality traits and tone        │
│         preferences contradict each other?"                  │
│                                                              │
│    3. Specificity (0-1)                                      │
│       - Generic: "likes technology" → 0.3                    │
│       - Specific: "prefers React over Vue" → 0.9             │
│       - Rule-based: check for vague words                    │
│                                                              │
│    4. Evidence Grounding (0-1)                               │
│       - Does MEMORY section support claims?                  │
│       - Cross-reference facts with sections                  │
│       ↓                                                      │
│  Aggregate Score:                                            │
│    - overall_quality = weighted_avg(metrics)                 │
│    - flag_for_refinement = overall_quality < 0.6             │
│       ↓                                                      │
│  Store in user_profiles:                                     │
│    - soulprint_quality_score FLOAT                           │
│    - quality_breakdown JSONB (per-metric scores)             │
│    - last_scored_at TIMESTAMP                                │
└──────────────────────────────────────────────────────────────┘

┌──────────────────────────────────────────────────────────────┐
│         ITERATIVE REFINEMENT ENGINE                          │
├──────────────────────────────────────────────────────────────┤
│  Trigger: Background job (daily cron) or on-demand           │
│       ↓                                                      │
│  lib/refinement/engine.ts                                    │
│    - findLowQualitySoulprints() → users with score < 0.6    │
│       ↓                                                      │
│  For each flagged user:                                      │
│    1. Identify weak sections (coherence < 0.5, etc.)         │
│    2. Re-prompt with focused instructions                    │
│       - Example: "The SOUL section is too generic.           │
│         Provide specific examples of communication style."   │
│    3. Generate refined section (Haiku 4.5)                   │
│    4. Re-score refined version                               │
│    5. If improved → save, else → flag for manual review      │
│       ↓                                                      │
│  Convergence:                                                │
│    - Max 3 refinement iterations                             │
│    - Stop if score plateaus                                  │
│    - Human review for persistent low scores                  │
└──────────────────────────────────────────────────────────────┘
```

## Architectural Patterns

### Pattern 1: Opik Evaluation + Tracing Separation

**What:** Use Opik tracing for production monitoring, separate evaluation datasets for offline testing.

**When to use:** When you need both real-time observability and systematic quality testing.

**Trade-offs:**
- ✓ Clean separation: production traces don't pollute evaluation data
- ✓ Offline experiments don't affect live users
- ✓ Can replay evaluation datasets on new prompt versions
- ✗ Two data pipelines to maintain
- ✗ Evaluation datasets can drift from real usage

**Implementation:**
```typescript
// Production tracing (existing)
const opikTrace = traceChatRequest({ userId, message, ... });
// ... chat logic ...
opikTrace.end();
flushOpik();

// Offline evaluation (new)
// lib/evaluation/experiments.ts
async function runExperiment(datasetId: string, promptVersion: string) {
  const dataset = await opik.getDataset(datasetId);
  const experiment = opik.createExperiment({ name: `prompt-${promptVersion}` });

  for (const item of dataset.items) {
    const response = await generateWithPrompt(item.input, promptVersion);
    const score = await scoreResponse(response, item.expected_output);
    experiment.logItem({ input: item.input, output: response, score });
  }

  return experiment.getResults();
}
```

**Integration Points:**
- Opik client (lib/opik.ts) - Add dataset/experiment methods
- New file: lib/evaluation/experiments.ts - Experiment runner
- New file: lib/evaluation/datasets.ts - Dataset manager
- CI/CD: Run experiments on PR before merge

### Pattern 2: Template-Based Prompt System

**What:** Version-controlled prompt templates with swap-able implementations.

**When to use:** When you need to A/B test prompt styles without code changes.

**Trade-offs:**
- ✓ Easy to rollback prompt changes
- ✓ Can deploy new prompts without redeploying code
- ✓ Templates are testable in isolation
- ✗ Indirection makes debugging harder
- ✗ Templates need to stay in sync (Next.js + RLM)

**Implementation:**
```typescript
// lib/prompts/templates/base.ts
export interface PromptTemplate {
  version: string;
  buildPrompt(sections: Sections, context: Context): string;
}

// lib/prompts/templates/v1-technical.ts
export const v1Technical: PromptTemplate = {
  version: 'v1-technical',
  buildPrompt(sections, context) {
    let prompt = `You are ${context.aiName}.\n\n`;
    if (sections.soul) {
      prompt += `## SOUL\n${formatSection(sections.soul)}\n`;
    }
    // ... rest of sections
    return prompt;
  }
};

// lib/prompts/templates/v2-natural-voice.ts
export const v2NaturalVoice: PromptTemplate = {
  version: 'v2-natural-voice',
  buildPrompt(sections, context) {
    let prompt = `You are ${context.aiName}. `;
    if (sections.soul) {
      prompt += transformToNaturalVoice(sections.soul) + ' ';
    }
    // ... rest of sections
    return prompt;
  }
};

// lib/prompts/registry.ts
const TEMPLATES = {
  'v1-technical': v1Technical,
  'v2-natural-voice': v2NaturalVoice,
};

export function getPromptTemplate(version: string = process.env.PROMPT_VERSION || 'v1-technical') {
  return TEMPLATES[version] || TEMPLATES['v1-technical'];
}

// Usage in buildSystemPrompt()
const template = getPromptTemplate();
return template.buildPrompt(sections, { aiName, memoryContext, ... });
```

**Integration Points:**
- app/api/chat/route.ts - Replace buildSystemPrompt() with template.buildPrompt()
- rlm-service/main.py - Implement identical template system in Python
- lib/prompts/ - New directory for templates
- Environment variable: PROMPT_VERSION (v1-technical, v2-natural-voice)

### Pattern 3: Import-Time + Runtime Linguistic Analysis

**What:** Extract baseline linguistic profile at import, refine at runtime.

**When to use:** When you need accurate initial analysis but also adapt to changes.

**Trade-offs:**
- ✓ Fast initial analysis (already sampling conversations)
- ✓ Adapts to user's evolving style over time
- ✓ Baseline prevents over-fitting to single messages
- ✗ Two analysis points to maintain
- ✗ Need to handle profile drift gracefully

**Integration Points:**
- lib/soulprint/quick-pass.ts - Add analyzeUserLanguage() call
- lib/memory/learning.ts - Add updateLinguisticProfile() call
- Database: Add linguistic_profile JSONB column to user_profiles
- Prompt builder: Use linguistic_profile to match user's style

### Pattern 4: LLM-as-Judge Quality Scoring

**What:** Use an LLM to evaluate soulprint quality with structured rubrics.

**When to use:** When quality criteria are subjective (coherence, naturalness).

**Trade-offs:**
- ✓ Captures nuanced quality issues rule-based systems miss
- ✓ Can evaluate "does this sound human?" effectively
- ✓ Rubrics are versioned and improvable
- ✗ Costs tokens for every evaluation
- ✗ LLM judges can be biased or inconsistent
- ✗ Slower than rule-based metrics

**Integration Points:**
- lib/soulprint/quick-pass.ts - Call scoreSoulprint() after generation
- Database: Add quality_score, quality_breakdown to user_profiles
- lib/refinement/engine.ts - Use scores to trigger refinement

## Scaling Considerations

| Scale | Architecture Adjustments |
|-------|--------------------------|
| 0-1k users | Current architecture + evaluation datasets (Opik cloud storage OK) |
| 1k-10k users | Pre-compute linguistic profiles at import, cache prompt templates |
| 10k-100k users | Batch quality scoring (nightly job), separate evaluation service |
| 100k+ users | Distributed evaluation with queue, prompt caching at Anthropic layer |

### Optimization Priorities

**1. First bottleneck: Quality scoring latency**
- Problem: LLM-as-judge adds ~2-3s per soulprint
- Fix: Score asynchronously after generation, don't block import
- Alternative: Batch scoring (daily job evaluates all recent soulprints)

**2. Second bottleneck: Linguistic analysis CPU**
- Problem: NLP analysis (Flesch-Kincaid, n-grams) is CPU-intensive
- Fix: Run analysis in background job, not in request path
- Alternative: Use simpler rule-based metrics for real-time, detailed analysis offline

**3. Third bottleneck: Experiment dataset size**
- Problem: Large evaluation datasets (1000+ items) take hours to score
- Fix: Stratified sampling (100 representative examples)
- Alternative: Progressive evaluation (start with 10 items, expand if unclear)

## Anti-Patterns

### Anti-Pattern 1: Evaluation Without Baselines

**What people do:** Run experiments but don't record baseline scores before changes.
**Why it's wrong:** Can't tell if prompt change improved or degraded quality.
**Do this instead:**
```typescript
// WRONG: Just score new prompt
const newScore = await scorePrompt(v2NaturalVoice, dataset);

// CORRECT: Compare against baseline
const baseline = await scorePrompt(v1Technical, dataset);
const newScore = await scorePrompt(v2NaturalVoice, dataset);
const improvement = ((newScore - baseline) / baseline) * 100;

console.log(`Improvement: ${improvement.toFixed(1)}%`);
if (improvement < 5) {
  console.warn('Minimal improvement, consider iterating');
}
```

### Anti-Pattern 2: Runtime Linguistic Analysis in Request Path

**What people do:** Run complex NLP analysis during chat request.
**Why it's wrong:** Adds 500ms+ latency, blocks streaming response.
**Do this instead:**
```typescript
// WRONG: Blocking analysis
const profile = await analyzeUserLanguage(userMessage);  // 500ms
const response = await chat(message, profile);

// CORRECT: Async update
const response = await chat(message);  // Use cached profile
updateLinguisticProfile(userId, userMessage)
  .catch(err => console.error('Profile update failed:', err));
```

### Anti-Pattern 3: Inconsistent Prompt Composition (Next.js vs RLM)

**What people do:** Maintain separate prompt builders that drift over time.
**Why it's wrong:** RLM and Bedrock fallback produce different personalities.
**Do this instead:**
- Extract prompt composition into shared helper (duplicate in Python/TypeScript)
- Unit test: given same sections, both produce identical output
- Version prompts: PROMPT_VERSION env var controls both

### Anti-Pattern 4: Iterative Refinement Without Convergence

**What people do:** Regenerate sections indefinitely, hoping for improvement.
**Why it's wrong:** Wastes tokens, causes personality drift, confuses users.
**Do this instead:** Max 3 iterations, stop if plateau, flag for manual review if still low quality.

## Integration Plan: Suggested Build Order

### Phase 1: Evaluation Foundation (No Breaking Changes)

**Goal:** Set up evaluation infrastructure without changing production code.

**Tasks:**
1. Extend Opik client with dataset/experiment support (lib/opik.ts)
2. Create evaluation dataset from anonymized chat history (lib/evaluation/datasets.ts)
3. Build experiment runner CLI script (scripts/run-experiment.ts)
4. Define LLM-as-judge scoring rubrics (lib/scoring/rubrics.ts)

**Files:**
- lib/opik.ts - Add createDataset(), runExperiment() methods
- lib/evaluation/datasets.ts - Dataset management
- lib/evaluation/experiments.ts - Experiment execution
- lib/scoring/rubrics.ts - Scoring prompt templates
- scripts/run-experiment.ts - CLI for manual experiments

**Acceptance:** Can run offline experiments comparing prompt variants with aggregate scores.

**Dependencies:** None (new code only)

### Phase 2: Prompt Template System (Breaking Change - Requires Testing)

**Goal:** Replace hardcoded buildSystemPrompt() with template system.

**Tasks:**
1. Extract current prompt logic into v1-technical template
2. Create natural voice transformer (lib/prompts/natural-voice.ts)
3. Build v2-natural-voice template using transformer
4. Update buildSystemPrompt() to use templates
5. Update RLM build_rlm_system_prompt() with identical logic
6. Add consistency unit tests

**Files:**
- lib/prompts/templates/base.ts - Template interface
- lib/prompts/templates/v1-technical.ts - Current logic
- lib/prompts/templates/v2-natural-voice.ts - New natural voice
- lib/prompts/natural-voice.ts - Section → natural language
- lib/prompts/registry.ts - Template selector
- app/api/chat/route.ts - Use templates (lines 427-602)
- rlm-service/main.py - Python template system (lines 194-293)
- lib/prompts/__tests__/consistency.test.ts - Cross-version tests

**Acceptance:** PROMPT_VERSION env var controls prompt style, both produce identical output.

**Dependencies:** Phase 1 (need experiments to validate new prompts)

### Phase 3: Linguistic Analysis (Extends Import + Chat)

**Goal:** Extract and track user linguistic patterns.

**Tasks:**
1. Build linguistic analysis module (formality, complexity, phrases)
2. Add analyzeUserLanguage() to quick pass generation
3. Add updateLinguisticProfile() to chat learning
4. Create linguistic_profile column in user_profiles
5. Use profile to match user's style in prompts

**Files:**
- lib/analysis/linguistic.ts - Pattern extraction
- lib/soulprint/quick-pass.ts - Call analyzeUserLanguage()
- lib/memory/learning.ts - Call updateLinguisticProfile()
- supabase/migrations/YYYYMMDD_linguistic_profile.sql
- lib/prompts/templates/v2-natural-voice.ts - Use linguistic_profile

**Acceptance:** Linguistic profile populated at import, refined during chat, used in prompts.

**Dependencies:** None (can run independently)

### Phase 4: Quality Scoring + Refinement (Background Jobs)

**Goal:** Score soulprints and iteratively improve low-quality ones.

**Tasks:**
1. Build quality scoring module (completeness, coherence, specificity)
2. Add scoreSoulprint() call after quick/full pass
3. Create refinement engine for low-quality sections
4. Schedule background job for batch scoring + refinement
5. Add quality_score columns to user_profiles

**Files:**
- lib/scoring/soulprint.ts - Quality metrics
- lib/refinement/engine.ts - Iterative improvement
- lib/soulprint/quick-pass.ts - Score after generation
- supabase/migrations/YYYYMMDD_quality_scoring.sql
- scripts/refine-soulprints.ts - Batch refinement job

**Acceptance:** Soulprints have quality scores, low-quality ones auto-improve or flag for review.

**Dependencies:** Phase 1 (scoring uses LLM-as-judge patterns)

### Phase 5: Dynamic Personality Primer (Advanced - Future)

**Goal:** Adapt prompt based on relationship stage and data quality.

**Tasks:**
1. Define relationship stages (first chat, 10 chats, 100 chats)
2. Create adaptive primer templates per stage
3. Track chat count and data quality metrics
4. Swap primer based on stage + quality

**Files:**
- lib/prompts/templates/dynamic-primer/ - Stage-specific templates
- lib/prompts/relationship-stage.ts - Stage detection
- app/api/chat/route.ts - Select primer based on stage

**Acceptance:** New users get cautious primer, established users get confident primer.

**Dependencies:** Phase 4 (uses quality scores to inform primer selection)

## Component Integration Map

### New Components

| Component | Purpose | Priority | Dependencies |
|-----------|---------|----------|--------------|
| lib/evaluation/datasets.ts | Manage Opik datasets | HIGH | Opik SDK |
| lib/evaluation/experiments.ts | Run prompt experiments | HIGH | datasets.ts, rubrics.ts |
| lib/scoring/rubrics.ts | LLM-as-judge prompts | HIGH | None |
| lib/prompts/templates/ | Version-controlled prompts | HIGH | None |
| lib/prompts/natural-voice.ts | Transform sections | HIGH | None |
| lib/analysis/linguistic.ts | Extract language patterns | MEDIUM | None |
| lib/scoring/soulprint.ts | Quality metrics | MEDIUM | rubrics.ts |
| lib/refinement/engine.ts | Iterative improvement | MEDIUM | scoring/soulprint.ts |
| scripts/run-experiment.ts | CLI for experiments | HIGH | evaluation/ |
| scripts/refine-soulprints.ts | Batch refinement job | LOW | refinement/engine.ts |

### Modified Components

| Component | Changes | Priority | Files |
|-----------|---------|----------|-------|
| lib/opik.ts | Add dataset/experiment support | HIGH | lib/opik.ts |
| buildSystemPrompt() | Use template system | HIGH | app/api/chat/route.ts:427-602 |
| build_rlm_system_prompt() | Match Next.js templates | HIGH | rlm-service/main.py:194-293 |
| generateQuickPass() | Add linguistic analysis | MEDIUM | lib/soulprint/quick-pass.ts |
| learnFromChat() | Update linguistic profile | MEDIUM | lib/memory/learning.ts |
| user_profiles schema | Add quality_score, linguistic_profile | MEDIUM | supabase/migrations/ |

## Sources

### Opik Evaluation & Experiments
- [Opik Evaluation Datasets Documentation](https://www.comet.com/docs/opik/evaluation/manage_datasets)
- [A Practical Guide to Integrate Evaluation and Observability into LLM Apps](https://www.dailydoseofds.com/a-practical-guide-to-integrate-evaluation-and-observability-into-llm-apps/)
- [Opik Dataset Python SDK Reference](https://www.comet.com/docs/opik/python-sdk-reference/evaluation/Dataset.html)
- [Opik Experiment Reference](https://www.comet.com/docs/opik/python-sdk-reference/Objects/Experiment.html)
- [GitHub: comet-ml/opik](https://github.com/comet-ml/opik)

### LLM-as-Judge Scoring
- [LLM-as-a-Judge: A Complete Guide](https://www.evidentlyai.com/llm-guide/llm-as-a-judge)
- [LLM-as-a-Judge Prompt Optimization - Phoenix](https://arize.com/docs/phoenix/cookbook/prompt-engineering/llm-as-a-judge-prompt-optimization)
- [Using LLM-as-a-Judge For Evaluation: A Complete Guide](https://hamel.dev/blog/posts/llm-judge/)
- [LLM-as-a-Judge Simply Explained](https://www.confident-ai.com/blog/why-llm-as-a-judge-is-the-best-llm-evaluation-method)
- [Evaluating the Effectiveness of LLM-Evaluators](https://eugeneyan.com/writing/llm-evaluators/)

### Linguistic Analysis & Personality Patterns
- [Text speaks louder: Insights into personality from NLP - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC12176201/)
- [Psychometric Evaluation of LLM Embeddings for Personality Trait Prediction](https://pmc.ncbi.nlm.nih.gov/articles/PMC12262148/)
- [Personality Expression Across Contexts: Linguistic and Behavioral Variation in LLM Agents](https://arxiv.org/html/2602.01063)
- [Generative AI predicts personality traits on open-ended narratives - Nature](https://www.nature.com/articles/s41562-025-02397-x)

### Dynamic Personality & Adaptation
- [Dynamic Personality in LLM Agents - ACL Anthology](https://aclanthology.org/2025.findings-acl.1185.pdf)
- [How AI Adapts to Personality Types in Real Time](https://www.personos.ai/post/how-ai-adapts-personality-types-real-time)
- [Dynamic Personality Adjustment in AI Agents](https://www.emergentmind.com/topics/dynamic-personality-adjustment)
- [Fine-Tuning LLMs for Personality Preservation in AI Assistants](https://ijrmeet.org/wp-content/uploads/2025/04/in_ijrmeet_Apr_2025_GC250263-AP04_Fine-Tuning-LLMs-for-Personality-Preservation-in-AI-Assistants-172-191.pdf)

### Emotional Intelligence & Conversational Awareness
- [Exploring emotional intelligence in AI systems - PMC](https://pmc.ncbi.nlm.nih.gov/articles/PMC11305735/)
- [Top 10+ Emotional AI Examples & Use Cases in 2026](https://research.aimultiple.com/emotional-ai-examples/)
- [Affective Computing: In-Depth Guide to Emotion AI in 2026](https://research.aimultiple.com/affective-computing/)
- [Top 10 Emotion AI Tools Tested in 2026](https://research.aimultiple.com/emotion-ai-tools/)

### Existing Codebase Architecture
- app/api/chat/route.ts - Chat flow with RLM/Bedrock fallback
- lib/soulprint/quick-pass.ts - Section generation pipeline
- lib/soulprint/prompts.ts - Quick pass system prompt
- lib/soulprint/prompt-helpers.ts - Section formatting utilities
- lib/opik.ts - Current tracing implementation
- lib/memory/learning.ts - Chat-based fact extraction
- .planning/research/PROMPT-ARCHITECTURE.md - v1.2 prompt architecture analysis

---
*Architecture research for: SoulPrint v2.0 AI Quality & Personalization*
*Researched: 2026-02-08*
*Confidence: HIGH (based on existing codebase analysis + current AI evaluation research)*
