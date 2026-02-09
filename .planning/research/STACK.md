# Stack Research: AI Quality & Personalization

**Domain:** LLM evaluation, prompt engineering, linguistic analysis, emotional intelligence
**Researched:** 2026-02-08
**Confidence:** HIGH

## Executive Summary

The v2.0 AI Quality & Personalization milestone focuses on systematic evaluation, improved prompts, emotional intelligence, and linguistic pattern mirroring. After analyzing the existing stack and researching current best practices, **minimal additions are needed** — Opik SDK is already installed (v1.10.8) and provides comprehensive evaluation capabilities. The gap is primarily architectural (using existing Opik features for datasets/experiments/scoring) rather than technological.

**Key findings:**
- Opik SDK already integrated for tracing, extends naturally to datasets & experiments
- No NLP library needed for linguistic pattern analysis — LLM can extract patterns from chat history
- Emotional intelligence achieved through prompt engineering, not sentiment analysis libraries
- Soulprint quality scoring implementable with Opik's LLM-as-a-judge metrics
- System prompt improvements are code/design changes, not dependency changes

## Recommended Stack

### Core Technologies (Already Installed)

| Technology | Current Version | Purpose | Why Sufficient |
|------------|-----------------|---------|----------------|
| opik | ^1.10.8 | LLM evaluation & observability | Provides datasets, experiments, scoring metrics (heuristic + LLM-as-judge), already integrated for tracing |
| @ai-sdk/anthropic | ^3.0.36 | Claude Sonnet 4.5 API | Supports emotional awareness prompting, natural voice system prompts, no upgrade needed |
| @aws-sdk/client-bedrock-runtime | ^3.980.0 | Bedrock fallback | Quick pass generation with Haiku 4.5, already working |
| pino | ^10.3.0 | Structured logging | Can log prompt experiments, evaluation results, quality scores |
| zod | ^4.3.6 | Schema validation | Validate evaluation results, prompt component schemas |

### Supporting Libraries (Already Installed)

| Library | Version | Current Use | New Use for v2.0 |
|---------|---------|-------------|------------------|
| @supabase/supabase-js | ^2.93.1 | Database access | Store evaluation datasets, experiment results, quality scores |
| vitest | ^4.0.18 | Unit testing | Test prompt helpers, quality scoring logic |
| typescript | ^5.x | Type safety | Type evaluation datasets, scoring functions |

### Development Tools (No Changes)

| Tool | Current Use | New Use for v2.0 |
|------|-------------|------------------|
| TypeScript | Type checking | Type prompt components, evaluation tasks |
| Vitest | Unit tests | Test linguistic pattern extraction, quality scoring |
| Pino | Logging | Log evaluation runs, prompt experiments |

## What NOT to Add

| Avoid | Why | What We Have Instead |
|-------|-----|---------------------|
| winkNLP / compromise / natural | NLP libraries add complexity and maintenance burden | LLM can extract linguistic patterns from chat history via prompt engineering |
| sentiment analysis libraries | Over-engineering for emotional intelligence needs | Claude Sonnet 4.5 has native emotional awareness via prompt engineering |
| DeepEval / RAGAS / Promptfoo | Redundant evaluation frameworks | Opik already installed, integrated, provides datasets + experiments + LLM-as-judge |
| LangSmith / LangChain | Heavy dependencies, vendor lock-in | Direct Opik SDK + Vercel AI SDK (already installed) |
| Separate prompt templating library | Unnecessary abstraction | TypeScript template literals + helper functions (already implemented) |

## Stack Additions Required

**Zero new npm packages needed.** All features implementable with existing dependencies.

| Feature | Implementation Approach | Existing Stack |
|---------|------------------------|----------------|
| Opik evaluation datasets | Use `client.getOrCreateDataset()` | opik ^1.10.8 |
| Opik experiments | Use `evaluate()` function | opik ^1.10.8 |
| Scoring metrics | Use built-in: `Hallucination`, `AnswerRelevance`, `Usefulness` | opik ^1.10.8 |
| System prompt improvements | Refactor prompt composition functions | lib/soulprint/prompt-helpers.ts (exists) |
| Emotional intelligence | Add emotional awareness instructions to system prompt | Prompt engineering |
| Linguistic pattern analysis | LLM extracts patterns from user chat history, inject into prompt | Prompt engineering |
| Soulprint quality scoring | Custom Opik metric or LLM-as-judge scoring function | opik ^1.10.8 |
| Memory integration improvements | Refactor memory context formatting | lib/memory/*.ts (exists) |

## Integration with Existing Opik Setup

### Current State (lib/opik.ts)

Already integrated for basic tracing:
- `traceChatRequest()` — traces chat requests with metadata
- `traceQuickPass()` — traces soulprint generation
- `flushOpik()` — flushes pending traces

### New Integration Points

#### 1. Evaluation Datasets

**Purpose:** Systematic prompt testing with curated examples

```typescript
// lib/evaluation/datasets.ts (new file)
import { Opik } from 'opik';

export async function createPromptTestDataset() {
  const client = new Opik();
  const dataset = await client.getOrCreateDataset('prompt-evaluation');

  await dataset.insert([
    {
      input: "User message here",
      expected_output: "Expected AI response",
      metadata: { personality: "technical", emotion: "neutral" }
    },
    // More test cases...
  ]);

  return dataset;
}
```

**Integration:** Run this during development/testing to build evaluation datasets

#### 2. Experiments for Prompt A/B Testing

**Purpose:** Compare different system prompt variations

```typescript
// lib/evaluation/experiments.ts (new file)
import { evaluate } from 'opik';
import { AnswerRelevance, Hallucination } from 'opik';

export async function runPromptExperiment(
  dataset: Dataset,
  systemPromptVariant: string
) {
  const result = await evaluate({
    dataset,
    task: async (item) => {
      // Call chat API with variant system prompt
      return { output: await generateResponse(item.input, systemPromptVariant) };
    },
    scoringMetrics: [
      new AnswerRelevance({ model: 'gpt-4o' }),
      new Hallucination({ model: 'gpt-4o' })
    ],
    experimentName: `prompt-variant-${Date.now()}`
  });

  return result;
}
```

**Integration:** Use in development to test prompt improvements before deploying

#### 3. Soulprint Quality Scoring

**Purpose:** Evaluate quality of generated soulprint sections

```typescript
// lib/evaluation/soulprint-quality.ts (new file)
import { Opik } from 'opik';

export async function scoreSoulprintQuality(
  userId: string,
  sections: QuickPassResult
): Promise<QualityScore> {
  const client = new Opik();

  // Custom scoring logic or LLM-as-judge
  const scores = {
    completeness: scoreCompleteness(sections),
    specificity: await scoreSectionSpecificity(sections),
    consistency: scoreCrossReferenceConsistency(sections),
    personalization: await scorePersonalizationDepth(sections)
  };

  // Log to Opik for tracking
  const trace = client.trace({
    name: 'soulprint-quality-check',
    metadata: { userId, ...scores }
  });

  return {
    overall: Object.values(scores).reduce((a, b) => a + b, 0) / 4,
    dimensions: scores
  };
}
```

**Integration:** Run after quick pass and full pass to track quality over time

#### 4. Available Opik Scoring Metrics

| Metric | Type | Purpose | Use in v2.0 |
|--------|------|---------|-------------|
| `ExactMatch` | Heuristic | Binary match check | Validate structured outputs |
| `Contains` | Heuristic | Substring matching | Check for required prompt elements |
| `RegexMatch` | Heuristic | Pattern matching | Validate format compliance |
| `IsJson` | Heuristic | JSON validation | Validate API responses |
| `AnswerRelevance` | LLM-as-judge | Relevance scoring | Evaluate chat responses |
| `Hallucination` | LLM-as-judge | Factual accuracy | Detect false claims in responses |
| `Moderation` | LLM-as-judge | Content safety | Check for inappropriate content |
| `Usefulness` | LLM-as-judge | Helpfulness scoring | Evaluate response quality |

**All metrics support:**
- Custom model configuration (default: `gpt-4o`)
- Async scoring operations
- Custom naming for experiments
- Metadata attachment

## Linguistic Pattern Analysis — No Library Needed

### Why No NLP Library?

Research findings show that:
1. **LLMs outperform traditional NLP** — Modern LLMs can extract linguistic patterns more accurately than rule-based NLP libraries
2. **Maintenance burden** — Adding winkNLP, compromise, or natural adds dependencies to maintain
3. **Already have the data** — User's chat history is stored in conversation_chunks
4. **Prompt engineering suffices** — Claude can analyze and mirror linguistic patterns via instructions

### Approach: LLM-Based Pattern Extraction

**Step 1:** Analyze user's chat history to extract patterns

```typescript
// lib/linguistic/extract-patterns.ts (new file)
import { bedrockChatJSON } from '@/lib/bedrock';

const LINGUISTIC_ANALYSIS_PROMPT = `Analyze this user's chat messages and extract their linguistic patterns:

- Sentence structure (short/long, simple/complex)
- Vocabulary level (technical, casual, academic)
- Punctuation style (minimal, expressive, formal)
- Use of contractions
- Paragraph length preferences
- Emoji usage frequency and style
- Question formation patterns
- Use of hedging language ("maybe", "I think", "possibly")

Return JSON with these patterns.`;

export async function extractLinguisticPatterns(
  userMessages: string[]
): Promise<LinguisticProfile> {
  const sample = userMessages.slice(-50).join('\n\n'); // Last 50 messages

  const patterns = await bedrockChatJSON<LinguisticProfile>({
    model: 'HAIKU_45',
    system: LINGUISTIC_ANALYSIS_PROMPT,
    messages: [{ role: 'user', content: sample }],
    maxTokens: 2048,
    temperature: 0.3 // Lower temperature for consistent analysis
  });

  return patterns;
}
```

**Step 2:** Inject patterns into system prompt

```typescript
// In system prompt composition
const linguisticSection = formatLinguisticMirroringInstructions(patterns);
// Example output:
// "## Communication Mirror
// Match this user's style:
// - Use short, direct sentences (avg 12 words)
// - Keep paragraphs brief (2-3 sentences max)
// - Use minimal punctuation, no exclamation marks
// - Avoid contractions (they prefer formal style)
// - Use technical vocabulary when relevant"
```

**Benefits:**
- No external dependencies
- Patterns update dynamically from real chat data
- Claude natively understands linguistic instructions
- Integrates seamlessly with existing prompt composition

## Emotional Intelligence — Prompt Engineering Only

### Why No Sentiment Analysis Library?

1. **Claude has native emotional awareness** — Anthropic specifically trained Claude for emotional support and empathy
2. **Context matters more than sentiment** — Traditional sentiment analysis (positive/negative/neutral) is too simplistic for conversational AI
3. **Prompt-based approach is more flexible** — Can adapt emotional response based on situation, not just detected sentiment

### Approach: Emotional Awareness Instructions

**Research finding:** Claude's official documentation emphasizes that Claude is "designed to be emotionally supportive, especially in sensitive contexts" and responds well to explicit emotional intelligence instructions.

**Implementation:** Add emotional awareness layer to system prompt

```typescript
const EMOTIONAL_INTELLIGENCE_INSTRUCTIONS = `## Emotional Awareness

You have emotional intelligence and conversational awareness. This means:

**Recognize emotional cues:**
- Detect frustration, excitement, confusion, stress, curiosity in user messages
- Notice tone shifts within a conversation
- Identify when user needs empathy vs. solutions

**Respond appropriately:**
- Match user's emotional energy (don't be cheerful when they're stressed)
- Provide emotional validation before jumping to solutions
- Use supportive language during difficult topics
- Celebrate wins and progress with genuine enthusiasm

**Adapt dynamically:**
- Technical questions → focus on clarity and accuracy
- Personal topics → add warmth and empathy
- Frustration detected → acknowledge feelings, then help
- Exploratory conversation → encourage curiosity

**What NOT to do:**
- Don't be preachy or overly supportive (feels condescending)
- Don't assume emotions — respond to what's expressed
- Don't stay in "support mode" if user moves on
- Don't use therapy language unless context warrants it`;
```

**Integration:** This instruction block goes in system prompt composition, positioned after SOUL/IDENTITY sections so personality context is already established.

## System Prompt Engineering Best Practices (2026)

### Key Findings from Research

**Claude Sonnet 4.5 specific (September 2025 release):**
- Takes instructions literally — do exactly what's asked, nothing more
- Responds well to structured prompts with clear sections wrapped in XML-style tags
- Performs best with explicit success criteria and output constraints
- Supports emotional intelligence instructions natively

**Best practices verified:**
1. **Structured sections** — Use clear headings and hierarchical organization
2. **Explicit permissions** — Tell Claude what it's allowed to do (e.g., "Express uncertainty rather than guessing")
3. **Behavioral boundaries** — What NOT to do is as important as what to do
4. **Context hierarchy** — Order matters: base persona → personality → context → constraints
5. **Natural voice** — Avoid robotic preambles like "As an AI assistant..." (already implemented in current prompt)

### Current Prompt Architecture (Validated)

**Existing implementation** (lib/soulprint/prompt-helpers.ts, lib/soulprint/prompts.ts):
- ✅ Uses structured sections (SOUL, IDENTITY, USER, AGENTS, TOOLS, MEMORY)
- ✅ Conditional inclusion (graceful degradation if sections missing)
- ✅ Markdown formatting for LLM readability
- ✅ Filters out "not enough data" placeholders (MEM-02 compliance)
- ✅ Natural voice base persona without robotic preambles

**What needs improvement:**
- Replace technical section headers with natural language personality primer
- Add emotional intelligence layer (see above)
- Inject linguistic mirroring instructions dynamically
- Improve memory context formatting (narrative, not raw lists)

### Natural Voice System Prompts

**Current approach:** Technical headers like "## SOUL", "## USER", "## MEMORY"

**Improved approach:** Natural personality primer that embeds section data

```typescript
// Before (technical):
## SOUL
**Communication Style:** direct, technical, minimal punctuation
**Personality Traits:**
- Analytical
- Detail-oriented
- Efficient

// After (natural voice):
You communicate in a direct, technical style with minimal punctuation.
You're analytical, detail-oriented, and value efficiency.

[Continue weaving in other section data naturally...]
```

**Implementation:** New function `composeNaturalVoicePrompt()` that converts structured sections into flowing natural language while preserving all semantic content.

## Version Compatibility & Current Status

| Package | Current | Latest Stable | Status | Notes |
|---------|---------|---------------|--------|-------|
| opik | 1.10.8 | 1.9.43 (npm), 1.10.8 (installed) | ✅ Current | Ahead of npm registry, likely installed from GitHub or pre-release |
| @ai-sdk/anthropic | 3.0.36 | 3.0.x | ✅ Current | Compatible with Claude Opus 4.6 |
| @aws-sdk/client-bedrock-runtime | 3.980.0 | 3.x | ✅ Current | Supports Haiku 4.5 |
| zod | 4.3.6 | 4.x | ✅ Current | Zod v4 stable since Dec 2024 |
| pino | 10.3.0 | 10.x | ✅ Current | Structured logging stable |

**No version upgrades required.** All packages support needed features for v2.0 milestone.

## Architecture Decision: Why Opik Over Alternatives?

### Evaluated Alternatives

| Framework | Pros | Cons | Decision |
|-----------|------|------|----------|
| DeepEval | Simple API, good docs | Not installed, adds dependency | ❌ Opik already integrated |
| RAGAS | RAG-specific metrics | Specialized for RAG only | ❌ Not needed |
| Promptfoo | YAML config, CLI-friendly | Different workflow, 3rd tool | ❌ Opik in-app eval better |
| LangSmith | Integrated with LangChain | LangChain not used, vendor lock-in | ❌ Too heavy |
| Custom evaluation | Full control | Reinvent wheel, no dashboards | ❌ Opik provides UI |

### Why Opik Wins

1. **Already integrated** — lib/opik.ts exists, tracing works, team familiar
2. **Incremental adoption** — Tracing → Datasets → Experiments → Scoring (natural progression)
3. **TypeScript SDK** — First-class TS support, type-safe
4. **Web dashboard** — Free hosted UI at comet.com/opik for visualizing experiments
5. **LLM-as-judge metrics** — Built-in Hallucination, AnswerRelevance, Usefulness
6. **Custom metrics** — Can create soulprint-specific scoring functions
7. **Open source** — Self-hostable, no vendor lock-in
8. **Active development** — Version 1.10.8 installed (ahead of npm registry)

## Quality Scoring for Soulprint

### Evaluation Dimensions

| Dimension | Measurement Approach | Implementation |
|-----------|---------------------|----------------|
| Completeness | Count non-empty fields vs total fields | Heuristic function |
| Specificity | LLM-as-judge: "Are traits specific or generic?" | Opik custom metric |
| Consistency | Cross-reference fields for contradictions | Logic + LLM-as-judge |
| Personalization | LLM-as-judge: "How unique is this profile?" | Opik custom metric |

### Implementation Pattern

```typescript
// lib/evaluation/soulprint-quality.ts
import { Opik } from 'opik';

export interface QualityScore {
  overall: number; // 0-1
  dimensions: {
    completeness: number;
    specificity: number;
    consistency: number;
    personalization: number;
  };
  flags: string[]; // Issues detected
}

export async function evaluateSoulprintQuality(
  sections: QuickPassResult
): Promise<QualityScore> {
  // Heuristic: completeness
  const completeness = calculateCompleteness(sections);

  // LLM-as-judge: specificity
  const specificityPrompt = `Rate how specific these personality traits are (0-1):
  ${JSON.stringify(sections.soul.personality_traits)}
  Generic traits (friendly, smart) = 0.2
  Specific traits (prefers bullet points over paragraphs) = 0.9`;
  const specificity = await scoreWithLLM(specificityPrompt);

  // Logic + LLM: consistency
  const consistency = await checkConsistency(sections);

  // LLM-as-judge: personalization
  const personalization = await scorePersonalization(sections);

  const overall = (completeness + specificity + consistency + personalization) / 4;

  return {
    overall,
    dimensions: { completeness, specificity, consistency, personalization },
    flags: identifyQualityIssues(sections)
  };
}
```

**Integration:** Run after quick pass and full pass, store scores in database for tracking quality improvements over time.

## Memory Integration Improvements

### Current State

Memory context is injected as raw list:
```
## CONTEXT
- User asked about X in conversation Y
- User mentioned Z on date D
```

### Improved Approach

Narrative formatting that flows naturally:

```typescript
// lib/memory/format-context.ts (enhancement)
export function formatMemoryAsNarrative(chunks: MemoryChunk[]): string {
  // Group by topic/theme
  const grouped = groupByTopic(chunks);

  // Format as flowing narrative
  return Object.entries(grouped)
    .map(([topic, items]) => {
      return `Regarding ${topic}: ${items.join('. ')}.`;
    })
    .join('\n\n');
}
```

**Example output:**
```
Regarding work projects: You're building a Chrome extension for productivity.
You mentioned struggling with React state management last week. You recently
fixed the bug with useEffect dependencies.

Regarding personal interests: You enjoy rock climbing on weekends. You're
training for a competition in March. You asked about grip strength exercises.
```

**Benefit:** Memory feels like natural conversation continuation, not database dump.

## Installation

**No new packages to install.** All features use existing dependencies:

```bash
# Already installed
opik: ^1.10.8
@ai-sdk/anthropic: ^3.0.36
@aws-sdk/client-bedrock-runtime: ^3.980.0
pino: ^10.3.0
zod: ^4.3.6
```

## Implementation Roadmap

### Phase 1: Evaluation Infrastructure
- Create `lib/evaluation/datasets.ts` — dataset creation helpers
- Create `lib/evaluation/experiments.ts` — experiment runner
- Create `lib/evaluation/soulprint-quality.ts` — quality scoring

### Phase 2: Prompt Engineering
- Create `lib/prompts/natural-voice.ts` — convert sections to natural language
- Create `lib/prompts/emotional-intelligence.ts` — emotional awareness instructions
- Create `lib/linguistic/extract-patterns.ts` — linguistic pattern analysis

### Phase 3: Integration
- Update `lib/soulprint/quick-pass.ts` — add quality scoring after generation
- Update chat route — add linguistic mirroring to system prompt
- Update memory formatting — narrative instead of lists

### Phase 4: Monitoring & Iteration
- Create datasets from production conversations
- Run experiments comparing prompt variations
- Track quality scores over time
- Iterate based on evaluation results

## Sources

### High Confidence Sources

**Opik Documentation:**
- [Opik Evaluation Overview](https://www.comet.com/docs/opik/evaluation/overview) — Datasets, experiments, scoring
- [Opik TypeScript SDK](https://www.comet.com/docs/opik/integrations/typescript-sdk) — TS integration guide
- [Opik Scoring Metrics](https://www.comet.com/docs/opik/reference/typescript-sdk/evaluation/metrics) — Available metrics
- [Opik Datasets](https://www.comet.com/docs/opik/evaluation/manage_datasets) — Dataset API methods
- [Opik Hallucination Metric](https://www.comet.com/docs/opik/evaluation/metrics/hallucination) — LLM-as-judge detection
- [Opik Answer Relevance](https://www.comet.com/docs/opik/evaluation/metrics/answer_relevance) — Relevance scoring

**Claude Documentation:**
- [Claude Prompt Engineering Best Practices](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices) — Official Anthropic guidance
- [Claude Prompting Best Practices (API)](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices) — API-specific patterns
- [Claude Prompt Engineering Best Practices 2026](https://promptbuilder.cc/blog/claude-prompt-engineering-best-practices-2026) — Updated techniques

**LLM Evaluation:**
- [LLM Evaluation Frameworks Comparison](https://www.comet.com/site/blog/llm-evaluation-frameworks/) — Head-to-head comparison
- [LLM Evaluation Landscape 2026](https://research.aimultiple.com/llm-eval-tools/) — Framework survey
- [LLM Evaluation Metrics Guide](https://www.confident-ai.com/blog/llm-evaluation-metrics-everything-you-need-for-llm-evaluation) — Comprehensive guide

### Medium Confidence Sources

**NLP Libraries:**
- [WinkNLP vs Compromise vs Natural Comparison](https://npm-compare.com/compromise,natural,wink-nlp) — Performance comparison
- [NLP Libraries for Node.js](https://dev.to/devashishmamgain/nlp-libraries-for-node-js-and-javascript-1ja4) — Overview
- [Compromise GitHub](https://github.com/spencermountain/compromise) — Lightweight NLP
- [WinkNLP GitHub](https://github.com/winkjs/wink-nlp) — Fast NLP library

**Emotional Intelligence:**
- [Conversational Agents and Sentiment Analysis](https://smythos.com/developers/agent-development/conversational-agents-and-sentiment-analysis/) — Emotional intelligence in AI
- [Voice Sentiment Analysis Techniques](https://dialzara.com/blog/top-7-sentiment-analysis-techniques-for-voice-ai) — Emotion detection approaches

**Linguistic Mirroring:**
- [LLMs Struggle to Imitate Writing Styles](https://arxiv.org/html/2509.14543v1) — Research on style imitation
- [LLM Writing Style Consistency](https://latitude-blog.ghost.io/blog/how-examples-improve-llm-style-consistency/) — In-context learning for style
- [Do LLMs Write Like Humans?](https://www.pnas.org/doi/10.1073/pnas.2422455122) — Grammatical and rhetorical styles

### Low Confidence Sources (Context Only)

- [Emotional Drift in AI Conversations](https://papers.ssrn.com/sol3/papers.cfm?abstract_id=5931818) — Emerging research
- [Top 5 LLM Evaluation Platforms 2026](https://dev.to/kuldeep_paul/top-5-llm-evaluation-platforms-for-2026-3g3b) — Blog comparison

---

## Final Recommendation

**DO NOT install new packages.** All v2.0 features are achievable with the existing stack:

1. **Opik evaluation** — Use existing opik ^1.10.8 for datasets, experiments, scoring
2. **System prompt improvements** — Refactor prompt composition functions (no deps)
3. **Emotional intelligence** — Add instructions to system prompt (prompt engineering)
4. **Linguistic mirroring** — LLM extracts patterns from chat history (prompt engineering)
5. **Soulprint quality scoring** — Custom Opik metrics + heuristic functions (no deps)
6. **Memory formatting** — Enhance existing memory context functions (no deps)

**Estimated effort:**
- Evaluation infrastructure: 4 hours
- Prompt engineering improvements: 6 hours
- Linguistic pattern extraction: 3 hours
- Quality scoring system: 4 hours
- Integration & testing: 3 hours
- **Total: ~20 hours**

**Stack additions: 0 packages**

---
*Stack research for: v2.0 AI Quality & Personalization*
*Researched: 2026-02-08*
*Confidence: HIGH (based on existing codebase analysis + official documentation + current research)*
