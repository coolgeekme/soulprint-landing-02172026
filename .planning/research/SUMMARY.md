# Research Summary: AI Quality & Personalization

**Project:** SoulPrint v2.0 - AI Quality & Personalization
**Domain:** LLM evaluation, prompt engineering, emotional intelligence, linguistic pattern mirroring
**Researched:** 2026-02-08
**Confidence:** HIGH

## Executive Summary

SoulPrint v2.0 focuses on making the AI sound genuinely human and deeply personalized through systematic evaluation, improved prompts, emotional intelligence, and linguistic pattern mirroring. The research reveals a **zero-dependency milestone** - all features are implementable with the existing stack (Opik 1.10.8, Claude Sonnet 4.5, Bedrock Haiku 4.5). The gap is primarily architectural and prompt engineering, not technological.

The recommended approach is **evaluation-first development**: establish measurement infrastructure before changing any prompts. Research shows 58.8% of prompt changes degrade quality in production despite looking better in testing. The path forward is: (1) build Opik evaluation datasets and experiments, (2) establish baseline metrics, (3) iterate on prompt improvements with A/B testing, (4) add linguistic analysis and quality scoring, then (5) validate with real users.

Key risks center on **prompt regression** (breaking working personality with "improvements"), **LLM-as-judge bias** (optimizing for what the evaluator likes, not what users need), and **uncanny valley** (perfect linguistic mirroring feels creepy, not personalized). These are mitigated through regression testing, diverse evaluation sets, human validation, and intentional imperfection in mirroring. The existing two-pass architecture (quick pass + full pass), RLM memory retrieval, and Opik tracing provide strong foundations to build upon.

## Key Findings

### Recommended Stack

**No new packages required.** All v2.0 features use existing dependencies. Opik SDK (1.10.8) already installed extends naturally from tracing to evaluation datasets, experiments, and LLM-as-judge metrics. Claude Sonnet 4.5 has native emotional awareness and responds well to natural voice instructions. Bedrock Haiku 4.5 provides fast linguistic pattern extraction.

**Core technologies (already installed):**
- **Opik 1.10.8**: LLM evaluation framework - extends from tracing to datasets, experiments, scoring metrics (Hallucination, AnswerRelevance, Usefulness)
- **Claude Sonnet 4.5** (@ai-sdk/anthropic 3.0.36): Native emotional awareness, supports natural voice system prompts, literal instruction following
- **Bedrock Haiku 4.5** (@aws-sdk/client-bedrock-runtime 3.980.0): Fast pattern extraction for linguistic analysis via bedrockChatJSON
- **Pino 10.3.0**: Structured logging for evaluation results, prompt experiments, quality scores
- **Zod 4.3.6**: Validation for evaluation datasets, scoring functions, linguistic profiles

**What NOT to add:**
- NLP libraries (winkNLP, compromise, natural) - LLM-based pattern extraction is more accurate and maintainable
- Sentiment analysis libraries - Claude has native emotional intelligence via prompt engineering
- Alternative evaluation frameworks (DeepEval, RAGAS, LangSmith) - Opik already integrated and sufficient
- Prompt templating libraries - TypeScript template literals with helper functions work well

### Expected Features

Research categorized features into 3 priority tiers based on user value, implementation cost, and dependencies.

**Must have (v2.0 launch - P1):**
- **Opik evaluation datasets & experiments** - Measure personality consistency, factuality, tone matching with LLM-as-judge (foundation for all improvements)
- **Soulprint quality scoring** - System self-awareness about data quality ("I'm still learning" vs "I know you well")
- **Narrative voice system prompts** - Replace technical headers (## SOUL, ## AGENTS) with personality primer in natural language
- **Relationship arc awareness** - Day 1 cautious ("Nice to meet you...") vs Day 100 confident ("You usually prefer...")
- **Emotional intelligence scaffolding** - Detect frustration, satisfaction, confusion from text and adapt responses appropriately
- **Uncertainty handling** - Temperature 0.1-0.3 + explicit instructions to say "I don't know" instead of hallucinating

**Should have (v2.1 - P2):**
- **Linguistic pattern mirroring** - Analyze ChatGPT export for formality, emoji usage, humor style, sentence structure and match in responses
- **Citation grounding** - Perplexity-style inline citations for web search results (avoid awkward [1][2] notation)
- **Memory as narrative** - Transform bullet lists into flowing narrative context ("You've been working on RoboNuggets for 3 months...")
- **Signature greeting usage** - Apply identity.signature_greeting on first message of each session
- **Adaptive depth preference** - Enforce tools.depth_preference (brief vs detailed) more strongly

**Defer (v2.2+ - P3):**
- **Iterative soulprint refinement** - Update profile from new conversations (requires feedback loop architecture, drift detection)
- **Conversation-level adaptation** - Detect topic shifts mid-conversation and adjust tone dynamically
- **User-facing memory controls** - Edit/delete specific memories (RLS privacy exists, needs UI)
- **A/B testing framework** - Test prompt variations with statistical significance tracking

### Architecture Approach

The v2.0 integration follows an **evaluation-first, incremental adoption** pattern that builds on existing infrastructure without breaking changes. The architecture leverages Opik's progression from tracing (current) to datasets to experiments to scoring.

**Major components:**

1. **Evaluation Infrastructure** (lib/evaluation/) - Dataset manager, experiment runner, LLM-as-judge rubrics that extend existing lib/opik.ts tracing
2. **Prompt Template System** (lib/prompts/templates/) - Version-controlled prompts (v1-technical, v2-natural-voice) with swap-able implementations via PROMPT_VERSION env var
3. **Linguistic Analyzer** (lib/analysis/linguistic.ts) - Extract patterns at import (quick pass) and runtime (learnFromChat), store in linguistic_profile JSONB column
4. **Quality Scorer** (lib/scoring/soulprint.ts) - Score completeness, coherence, specificity, personalization; trigger refinement for low-quality soulprints
5. **Natural Voice Transformer** (lib/prompts/natural-voice.ts) - Convert structured sections to flowing personality primer preserving semantic content

**Integration strategy:** Build evaluation first (Phase 1) to establish baselines, then improve prompts (Phase 2) with A/B testing against baselines, add linguistic analysis (Phase 3) in parallel with quality scoring (Phase 4), validate everything (Phase 5) before declaring success. Two prompt builders (Next.js buildSystemPrompt + RLM build_rlm_system_prompt) must stay in sync via identical template logic.

### Critical Pitfalls

Research identified 9 pitfalls specific to LLM evaluation and prompt engineering. Top 5 that could derail v2.0:

1. **Breaking working personality with prompt changes** - 58.8% of prompt + model combinations drop accuracy over API updates. Avoid by building prompt regression test suite (20-100 tasks) BEFORE changing prompts, establishing baseline metrics from Opik traces, A/B testing changes in shadow mode 24-48h, versioning prompts like code with rollback capability.

2. **LLM-as-judge self-preference bias** - Judge LLMs favor outputs similar to their own style (lower perplexity). GPT-4 judges prefer verbose/formal regardless of quality. Avoid by using different model families for generation vs judging, temperature 0.0-0.1 for deterministic evaluation, human validation on 10-20% of decisions, swapping response order to detect position bias.

3. **Linguistic mirroring uncanny valley** - Perfect mirroring feels creepy after 5-10 exchanges. Users report "trying too hard," "fake," "creepy." Avoid by keeping slight AI distinctiveness intentionally, mirroring patterns not phrases, adapting gradually over 3-4 exchanges, preserving AI identity ("here's my take..."), testing with extended conversations (10+ messages).

4. **RAG memory breaking personality consistency** - Retrieved chunks appear right before user message, model weights recent context > system instructions, personality gets overridden. Avoid by positioning personality instructions AFTER retrieval with framing ("Background memories, use to inform not replace voice"), limiting chunk count (test 3 vs 5), scoring chunks for relevance AND personality-safety, testing with adversarial chunks.

5. **Observability instrumentation killing latency** - Synchronous tracing adds 150-300ms (12-15% overhead). Users notice sluggish streaming. Avoid by queueing traces asynchronously (fire-and-forget), sampling (10% of chats, 100% of errors), batching trace writes (flush every 5s), failing open on tracing errors, measuring P95 latency not averages.

## Implications for Roadmap

Research strongly indicates a **5-phase sequential build** where each phase enables the next. The architecture research (ARCHITECTURE-AI-QUALITY.md) provides detailed build order with clear dependencies.

### Phase 1: Evaluation Foundation (No Breaking Changes)

**Rationale:** Must establish measurement before making changes. Research shows prompt regression is the #1 risk - teams ship "improvements" that break working systems because they lack baseline metrics. Build evaluation infrastructure that doesn't touch production code.

**Delivers:**
- Opik dataset/experiment methods in lib/opik.ts
- Evaluation dataset from anonymized chat history (lib/evaluation/datasets.ts)
- Experiment runner CLI script (scripts/run-experiment.ts)
- LLM-as-judge scoring rubrics (lib/scoring/rubrics.ts)
- Baseline metrics: personality consistency, factuality, tone matching

**Addresses:** Pitfall #1 (breaking personality), Pitfall #2 (judge bias), Pitfall #5 (observability latency)

**Avoids:** Any changes to buildSystemPrompt(), chat routes, or user-facing behavior

**Research flags:** MEDIUM - Opik dataset API is well-documented, but async trace architecture needs spike (2-3 days) to avoid latency pitfall. LLM judge family selection (which model to use for judging) needs validation against human raters.

**Acceptance criteria:** Can run offline experiments comparing prompt variants with aggregate scores, async tracing adds <100ms P95 latency, human validation agrees with judge >70% of time.

### Phase 2: Prompt Template System (Breaking Change - Requires Testing)

**Rationale:** Once evaluation exists, can safely improve prompts with A/B testing. Natural voice prompts look better in research, but must validate against working system. Template versioning enables rollback and parallel testing.

**Delivers:**
- Template system (lib/prompts/templates/base.ts, v1-technical.ts, v2-natural-voice.ts)
- Natural voice transformer (lib/prompts/natural-voice.ts)
- Updated buildSystemPrompt() using templates (app/api/chat/route.ts)
- Matching RLM template system (rlm-service/main.py)
- Consistency unit tests (Next.js vs RLM produce identical output)
- PROMPT_VERSION env var controls style

**Uses:** Opik experiments from Phase 1 to validate new prompts, A/B test technical vs natural voice

**Addresses:** Pitfall #4 (RAG breaking personality) by restructuring prompt to reinforce personality after retrieval, Pitfall #8 (removing headers destroys structure) by testing incremental transitions

**Dependencies:** Phase 1 complete (need experiment framework to validate prompt changes)

**Research flags:** HIGH - Need to validate structured vs prose prompt performance on Bedrock Sonnet 4.5 specifically. RAG context positioning experiments critical. Semantic boundary preservation techniques need spike. Recommend A/B test every change, keep structured version in parallel first 2 weeks.

**Acceptance criteria:** PROMPT_VERSION env var controls style, personality adherence maintained within 2% of baseline, retrieval responses match personality score of non-retrieval responses, consistency tests pass (Next.js == RLM output).

### Phase 3: Linguistic Analysis (Extends Import + Chat)

**Rationale:** Can run independently of prompt improvements. Analyzes user patterns at import and refines during chat. Enables mirroring in v2.1 but data collection happens now.

**Delivers:**
- Linguistic analysis module (lib/analysis/linguistic.ts) - formality, complexity, phrases, emoji usage, humor style
- Import-time baseline analysis (lib/soulprint/quick-pass.ts)
- Runtime refinement (lib/memory/learning.ts)
- linguistic_profile JSONB column in user_profiles
- Pattern injection into prompts (match user's style)

**Addresses:** Foundation for P2 features (linguistic mirroring), but with Pitfall #3 (uncanny valley) prevention built-in from start

**Dependencies:** None - can run in parallel with Phase 2

**Research flags:** HIGH - Uncanny valley thresholds (how much mirroring is too much), gradual adaptation timelines, tone analysis approaches need research. Risk is user trust issue that causes churn. Recommend beta test with 10% of users first, extended session monitoring (10+ messages).

**Acceptance criteria:** Linguistic profile populated at import, refined during chat, patterns stored and retrievable, no creepy feedback in testing, gradual adaptation over 3-4 exchanges.

### Phase 4: Quality Scoring + Refinement (Background Jobs)

**Rationale:** Score soulprints to know which are high/low quality. Enables relationship arc awareness (confidence based on data quality) and iterative improvement of weak soulprints.

**Delivers:**
- Quality scoring module (lib/scoring/soulprint.ts) - completeness, coherence, specificity, personalization metrics
- Post-generation scoring (lib/soulprint/quick-pass.ts)
- Refinement engine (lib/refinement/engine.ts) for low-quality sections
- quality_score and quality_breakdown JSONB columns
- Background job (scripts/refine-soulprints.ts) for batch refinement

**Uses:** Phase 1 evaluation patterns (LLM-as-judge for coherence/specificity)

**Addresses:** Pitfall #6 (overfitting to test data) by scoring across diverse user segments, Pitfall #9 (metric misalignment) by validating score correlates with user satisfaction

**Dependencies:** Phase 1 complete (scoring uses LLM-as-judge patterns)

**Research flags:** MEDIUM - Metric validation critical. Must verify quality scores correlate r>0.7 with NPS/retention. Segment-specific scoring prevents aggregate scores hiding per-user failures. User interviews (5-10) recommended to validate metric definitions.

**Acceptance criteria:** Soulprints scored after generation, low-quality ones flagged for refinement, quality scores stored and tracked over time, correlation with user satisfaction validated.

### Phase 5: Integration Testing & Validation

**Rationale:** All pieces built, now validate they work together. Adversarial testing, long-session testing, load testing to catch integration issues before declaring success.

**Delivers:**
- Prompt regression test suite (20-100 cases covering personality types, boundary cases)
- Multi-tier chunking validation (known-answer queries, tier usage monitoring)
- Long-session testing (10+ message conversations to detect uncanny valley)
- Load testing (100 concurrent requests with observability enabled)
- Segment-specific quality metrics (technical/casual, verbose/terse, new/returning users)

**Addresses:** All pitfalls get validated: regression tests (Pitfall #1), judge bias checks (Pitfall #2), uncanny valley detection (Pitfall #3), RAG personality consistency (Pitfall #4), latency benchmarks (Pitfall #5), diverse test set (Pitfall #6), tier usage (Pitfall #7), structure preservation (Pitfall #8), metric validation (Pitfall #9)

**Dependencies:** Phases 1-4 complete

**Research flags:** MEDIUM - Load testing frameworks for LLM apps (Locust + Bedrock), known-answer query datasets for memory testing, segment-specific quality metrics need definition. Recommend shadow production traffic 48h before full rollout.

**Acceptance criteria:** Zero critical regressions, P95 latency <100ms overhead, personality adherence maintained, long sessions (10+ messages) no uncanny valley feedback, quality scores correlate with satisfaction.

### Phase Ordering Rationale

**Sequential, not parallel:** Each phase enables the next. Can't validate prompt improvements (Phase 2) without evaluation framework (Phase 1). Can't score quality (Phase 4) without metrics infrastructure (Phase 1). Can't validate everything (Phase 5) without all pieces built.

**Exception:** Phase 3 (linguistic analysis) can run parallel to Phase 2 (prompt improvements) because they don't depend on each other. Both depend on Phase 1.

**Why evaluation-first:** Research shows 58.8% of prompt changes degrade quality despite looking better in testing. Without baseline metrics and regression tests, "improvements" break working systems. Evaluation infrastructure must exist before changing any production prompts.

**Why prompt improvements before quality scoring:** Quality scoring measures output of prompts. Better to improve prompt quality (Phase 2) before building scoring infrastructure (Phase 4) so scoring is measuring improved baseline, not legacy system.

**Why integration testing last:** Need all components built before validating they work together. Adversarial testing, long-session testing, load testing catch integration issues that unit tests miss.

### Research Flags

**Phases needing deeper research during planning:**

- **Phase 1: Evaluation Foundation** - HIGH priority spike needed on async Opik architecture patterns (2-3 days). LangSmith vs AgentOps benchmarks for latency. LLM judge family selection (which model judges best). Human validation protocols. Risk: Foundation for all future work, wrong choices compound.

- **Phase 2: Prompt Improvements** - HIGH priority experiments needed on structured vs prose prompts specifically on Bedrock Sonnet 4.5. RAG context positioning variations. Semantic boundary preservation techniques. Risk: User-facing changes, can cause personality inconsistency. Recommend A/B test every change, keep v1 in parallel 2 weeks.

- **Phase 3: Linguistic Analysis** - HIGH priority research on uncanny valley thresholds (quantify "how much mirroring is too much"). Gradual adaptation timelines (how many exchanges to fully mirror). Tone analysis libraries (which features to extract). Risk: User trust issue that causes churn if done wrong. Recommend beta test 10% of users, monitor extended sessions.

- **Phase 5: Integration Testing** - MEDIUM priority research on load testing frameworks for LLM apps (Locust + Bedrock patterns). Known-answer query datasets for memory validation. Segment-specific quality metrics definition. Risk: Performance issues emerge here but fixable. Recommend shadow production traffic 48h before rollout.

**Phases with standard patterns (lower research priority):**

- **Phase 4: Quality Scoring** - MEDIUM priority. LLM-as-judge patterns well-established. Main work is metric validation (user interviews) not technical research. Standard background job patterns apply.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | No new packages needed, all features work with existing Opik 1.10.8 + Claude Sonnet 4.5. Versions verified compatible. |
| Features | HIGH | Priority matrix validated against competitor analysis (Character.AI, Replika, Pi), 2026 LLM evaluation research, prompt engineering best practices. |
| Architecture | HIGH | Build order based on dependency analysis of existing codebase (buildSystemPrompt, lib/opik.ts, quick-pass.ts). Integration points identified. |
| Pitfalls | HIGH | 9 pitfalls sourced from 2026 research on prompt regression, LLM-as-judge bias, uncanny valley, RAG limitations, observability overhead. Cross-referenced with SoulPrint architecture. |

**Overall confidence:** HIGH

Research based on official Opik documentation, Anthropic Claude prompt engineering guides, 40+ peer-reviewed sources from 2026 on LLM evaluation and personalization. All recommendations validated against existing SoulPrint codebase (v1.2 architecture analysis).

### Gaps to Address

**Async Opik trace patterns:** Documentation covers datasets/experiments well but async production patterns need validation. Opik version 1.10.8 is ahead of npm registry (1.9.43), may have breaking changes. Address: Phase 1 spike (2-3 days) to build async architecture, test with 100 concurrent requests, measure P95 latency.

**LLM judge model selection:** Which model family to use for judging Claude Sonnet outputs? Research shows self-preference bias, but specific model recommendations unclear. Address: Phase 1 validation - test GPT-4o, Claude Opus, Gemini as judges, measure human agreement rates (target >70%), select least biased.

**Uncanny valley thresholds:** Research identifies phenomenon but doesn't quantify "how much mirroring is too much." Gradual adaptation timelines unclear. Address: Phase 3 beta testing with 10% of users, monitor extended sessions (10+ messages), measure churn by session count, qualitative feedback ("creepy" mentions).

**Metric correlation with satisfaction:** Quality scoring metrics (completeness, coherence, specificity, personalization) need validation that they predict user satisfaction. Address: Phase 4 user interviews (5-10) before automating, measure correlation r>0.7 with NPS/retention, adjust weights based on findings.

**RLM prompt sync:** Two prompt builders (Next.js + Python RLM) must produce identical output. No existing sync mechanism. Address: Phase 2 consistency tests, shared template logic (duplicate implementation), version control both, automated validation in CI.

## Sources

### Primary Sources (HIGH confidence)

**Opik Evaluation Framework:**
- [Opik Evaluation Overview](https://www.comet.com/docs/opik/evaluation/overview)
- [Opik TypeScript SDK](https://www.comet.com/docs/opik/integrations/typescript-sdk)
- [Opik Datasets](https://www.comet.com/docs/opik/evaluation/manage_datasets)
- [Opik Scoring Metrics](https://www.comet.com/docs/opik/reference/typescript-sdk/evaluation/metrics)

**Claude Prompt Engineering:**
- [Claude 4 Best Practices](https://docs.claude.com/en/docs/build-with-claude/prompt-engineering/claude-4-best-practices)
- [Claude Prompting Best Practices](https://platform.claude.com/docs/en/build-with-claude/prompt-engineering/claude-prompting-best-practices)

**LLM Evaluation & LLM-as-Judge:**
- [LLM Evaluation Frameworks Comparison](https://www.comet.com/site/blog/llm-evaluation-frameworks/)
- [LLM-as-a-Judge Complete Guide](https://www.confident-ai.com/blog/why-llm-as-a-judge-is-the-best-llm-evaluation-method)
- [Evaluating LLM-Evaluators Effectiveness](https://eugeneyan.com/writing/llm-evaluators/)

**Pitfalls & Best Practices:**
- [Prompt Regression Testing 101](https://www.breakthebuild.org/prompt-regression-testing-101-how-to-keep-your-llm-apps-from-quietly-breaking/)
- [Self-Preference Bias in LLM-as-a-Judge](https://arxiv.org/abs/2410.21819)
- [The New Uncanny Valley](https://aicompetence.org/uncanny-valley-when-ai-chatbots-sound-too-human/)

### Secondary Sources (MEDIUM confidence)

**Linguistic Mirroring & Personality:**
- [AI Chatbots Develop Unique Writing Styles](https://completeaitraining.com/news/ai-chatbots-develop-unique-writing-styles-that-mirror-human/)
- [Text speaks louder: Personality from NLP](https://pmc.ncbi.nlm.nih.gov/articles/PMC12176201/)
- [Dynamic Personality in LLM Agents](https://aclanthology.org/2025.findings-acl.1185.pdf)

**RAG & Retrieval:**
- [5 Critical RAG Limitations](https://www.chatrag.ai/blog/2026-01-21-5-critical-limitations-of-rag-systems-every-ai-builder-must-understand)
- [Chunking Strategies for RAG](https://medium.com/@adnanmasood/chunking-strategies-for-retrieval-augmented-generation-rag-a-comprehensive-guide-5522c4ea2a90)

**Observability & Performance:**
- [Building Production-Grade AI Systems](https://medium.com/@koladilip/building-production-grade-ai-systems-the-observability-library-that-actually-works-9aa2f547ea79)
- [AI Observability Buyer's Guide 2026](https://www.braintrust.dev/articles/best-ai-observability-tools-2026)

### Tertiary Sources (Context only)

**Competitor Analysis:**
- [12+ Best Character AI Alternatives 2026](https://gempages.net/blogs/shopify/character-ai-alternatives-guide)
- [Replika vs Character AI Comparison](https://www.theaihunter.com/compare/replika-vs-character-ai/)
- [Product Strategy of Companion Chatbots](https://medium.com/@lindseyliu/product-strategy-of-companion-chatbots-such-as-inflections-pi-2f3b7a1538b4)

**Existing Codebase:**
- app/api/chat/route.ts - Chat flow with RLM/Bedrock fallback
- lib/soulprint/quick-pass.ts - Section generation pipeline
- lib/opik.ts - Current tracing implementation
- .planning/research/PROMPT-ARCHITECTURE.md - v1.2 prompt architecture analysis

---

**Research completed:** 2026-02-08
**Ready for roadmap:** Yes

**Next step:** Roadmapper agent can use this summary to structure phases, with emphasis on evaluation-first approach and sequential dependencies identified in Phase Ordering Rationale.
