# Project Research Summary

**Project:** SoulPrint v1.4 Chat Personalization Quality
**Domain:** AI Chat Personalization with OpenClaw-inspired Personality Injection
**Researched:** 2026-02-07
**Confidence:** HIGH

## Executive Summary

SoulPrint v1.4 requires implementing OpenClaw-inspired personality injection into the existing chat system. The good news: **no new libraries needed**. The existing stack (Vercel AI SDK, Anthropic, TypeScript) already contains everything required. The gap is architectural, not technological — sections exist in the database, but the RLM service doesn't properly compose them into personality-aware prompts, and the Next.js fallback diverges from the RLM implementation.

The recommended approach is a two-phase build: **Phase 1** fixes prompt composition consistency (extracting shared builders, filtering "not enough data" placeholders, implementing token budgets), and **Phase 2** enhances quality (section validation, quality scoring, name generation improvements). This order avoids the dual-service prompt divergence pitfall while establishing a foundation for personality injection that actually works.

The critical risk is context window bloat. With 7 sections + conversation history + retrieved memory + web search results, prompts can easily balloon to 30k-60k tokens per request, creating unsustainable costs ($180-360/month per heavy user) and performance degradation. Prevention requires token budgeting from day one, progressive context loading based on message complexity, and Anthropic's prompt caching for static sections. The second major risk is prompt injection via conversation imports — user uploads can contain jailbreak instructions that get extracted into behavioral rules and persist across all future chats, requiring sanitization at import time and section output validation.

## Key Findings

### Recommended Stack

**No additions required.** The current stack already supports OpenClaw-style personality injection:

**Sufficient technologies:**
- **Vercel AI SDK (^6.0.72)**: Dynamic system prompts via template literals — supports the OpenClaw pattern natively
- **Anthropic API (@ai-sdk/anthropic ^3.0.36)**: Direct Claude Sonnet 4 access with streaming and prompt caching
- **TypeScript (^5.x)**: Native template literals are optimal for prompt composition (faster and safer than Handlebars/Mustache)
- **Supabase (^2.93.1)**: Already stores 7 structured sections (soul_md, identity_md, user_md, agents_md, tools_md, memory_md, ai_name)
- **Zod (^4.3.6)**: Request validation — extend for prompt section validation

**What NOT to add:**
- Template engines (Handlebars, Mustache) — adds complexity for simple string composition
- Prompt DSLs (Impromptu, PromptML) — overkill for this use case
- LangChain — heavy dependency not needed when Vercel AI SDK + native templates suffice
- Markdown parsers — sections stored as JSON, converted to markdown at prompt time

**The gap:** The existing `buildSystemPrompt()` function (lines 472-599 in `app/api/chat/route.ts`) already implements the OpenClaw pattern but has two problems: (1) RLM service has a separate implementation that doesn't filter placeholders consistently, and (2) sections aren't being fully utilized in prompts.

### Expected Features

**Must have (P1 — this milestone):**
- **Personality injection from 7 sections** — Build system prompt that includes SOUL/IDENTITY/USER/AGENTS/TOOLS/MEMORY/daily context (essential: transforms generic AI into YOUR AI)
- **Context-aware greeting** — First message uses IDENTITY.md to craft personalized welcome (essential: first impression sets tone)
- **AI self-identification with generated name** — Use `ai_name` from database, refer to self naturally (essential: "I'm Echo" vs "I am an AI assistant")
- **Anti-generic language instructions** — System prompt explicitly forbids chatbot clichés (essential: breaks generic feel)
- **Natural language personality definition** — System prompt uses values/principles from SOUL.md, not robotic rules (essential: OpenClaw pattern, creates human-like AI)
- **Memory context in responses** — System prompt instructs model to USE retrieved conversation chunks naturally (essential: "Like we discussed..." vs ignoring context)
- **Consistent tone across sessions** — Personality doesn't reset per-conversation (essential: trust building)

**Should have (P2 — post-launch iteration):**
- Conversation topic detection (analyze message, influence AGENTS.md behavior)
- Personality refinement UI (let users manually edit SOUL.md/IDENTITY.md if AI doesn't match)
- Enhanced AI name generation (use all 7 sections + archetype, not just soulprint_text slice)
- Response format preferences (extract from TOOLS.md: bullet points vs paragraphs)

**Defer (v2+ — after product-market fit):**
- Real-time tone mirroring (sentiment analysis → dynamic warmth/formality adjustment)
- Progressive learning from chats (trigger fact extraction monthly, merge into MEMORY.md)
- Multi-workspace personas (separate AGENTS.md behaviors per project)
- Voice personalization (entirely different tech stack)

### Architecture Approach

The system has three layers: **Next.js chat route** parses sections from Supabase and passes them to **RLM service** which builds the system prompt and calls **Anthropic API**. When RLM is unavailable, Next.js has a **Bedrock fallback** that composes prompts locally. The critical architectural gap: two different prompt builders (Next.js `buildSystemPrompt()` vs RLM `build_rlm_system_prompt()`) that must produce identical output but currently diverge.

**Major components:**

1. **Section Parser** — Convert DB strings (JSON) → typed objects (Next.js route.ts lines 311-322, already implemented)
2. **Section Validator** — Check for "not enough data" placeholders, filter empty fields (NEW — prevents prompt pollution)
3. **Section Composer** — Convert section object → markdown with consistent formatting (exists: `sectionToMarkdown()` in quick-pass.ts, needs extraction for reuse)
4. **Prompt Builder** — Assemble final system prompt from composed sections (exists in both Next.js + RLM but needs consistency)
5. **Token Budget Monitor** — Track context size, implement progressive loading (NEW — prevents cost explosion)

**Build order recommendation:**
1. Fix prompt consistency (extract shared composition helpers, ensure Next.js and RLM produce identical prompts)
2. Add section validation (filter "not enough data", implement quality scoring)
3. Implement token budgeting (monitor usage, progressive context loading, prompt caching)
4. Enhance name generation (multi-candidate selection with validation, offensive pattern detection)

### Critical Pitfalls

1. **Context Window Bloat Leading to Cost Explosion** — 7 sections + history + memory + web search = 30k-60k tokens per request → $180-360/month per heavy user. Prevention: token budgets from day one, progressive context loading based on query complexity, Anthropic prompt caching for static sections (90% cost reduction), dense formatting (bullets not verbose markdown). Warning signs: avg request cost >$0.05, token count grows unbounded with user history, no token monitoring in logs.

2. **Dual-Service Prompt Divergence** — Next.js and RLM build prompts differently → personality shifts during fallback, bug fixes don't propagate. Prevention: shared prompt template in `.planning/prompts/base.md`, cross-service consistency tests, prompt hash monitoring to detect divergence. Warning signs: user reports "AI changed" after RLM downtime, string manipulation in code instead of template files, different section ordering in logs.

3. **AI-Generated Names Producing Offensive Results** — Haiku generates "ChadGPT", "MasterMind", "Daddy" → user recoils, loses trust. Prevention: multi-candidate generation with validation, forbidden pattern detection (daddy/master/chad/etc), moderation API safety check, user-friendly rename flow. Warning signs: support tickets asking "can I change name?", names from generic list (Echo/Atlas/Nova), no validation before saving to DB.

4. **Quick Pass Section Quality Too Low** — Haiku generates generic sections ("helpful, curious") that provide no actual personalization → user notices AI sounds identical to base Claude. Prevention: section quality scoring (detect generic phrases, count "not enough data"), threshold enforcement (don't save if quality <60), hybrid quick/deep pass (upgrade to Sonnet if quality poor), user feedback loop. Warning signs: sections contain "helpful, curious, friendly", AI responses indistinguishable from base model, users ask "is personalization working?"

5. **Memory-Based Prompt Injection** — User uploads ChatGPT export containing jailbreak instructions → extracted into behavioral rules → persists across all chats. Prevention: sanitization at import (regex filter injection patterns), section output validation (detect keywords in behavioral_rules), prompt firewall in chat endpoint, sandbox system constraints. Warning signs: no sanitization in upload pipeline, sections saved without security validation, web search results injected directly into prompt.

## Implications for Roadmap

Based on research, suggested phase structure:

### Phase 1: Prompt Foundation & Token Management

**Rationale:** Must fix dual-service divergence and implement token budgeting before any other work. Context bloat affects all downstream features, and prompt inconsistency makes testing unreliable. These are foundational issues that block quality improvements.

**Delivers:**
- Shared prompt template in `.planning/prompts/base.md` used by both Next.js and RLM
- Section validation helper that filters "not enough data" placeholders
- Token budget system with progressive context loading
- Anthropic prompt caching implementation (90% cost reduction on static content)
- Cross-service consistency tests (verify Next.js and RLM produce identical prompts)

**Addresses (from FEATURES.md):**
- Consistent tone across sessions (prompt doesn't diverge)
- Memory context in responses (proper section injection)

**Avoids (from PITFALLS.md):**
- Context window bloat (token budgeting prevents)
- Dual-service prompt divergence (shared template fixes)

**Research flag:** Standard implementation — no additional research needed. Patterns well-documented in Anthropic docs and existing codebase.

### Phase 2: Name Generation & Section Quality

**Rationale:** With prompt foundation solid, improve input quality (section generation) and user-facing outputs (AI names). Name generation happens during import and affects first impression. Section quality affects every chat message. Both are user-facing quality issues that should be addressed early.

**Delivers:**
- AI name validation pipeline (forbidden patterns, genericness detection, moderation API check)
- Multi-candidate name generation (generate 5, score and rank, select best)
- Curated fallback names (safe alternatives to generic Echo/Atlas/Nova)
- User-friendly rename UI in settings
- Section quality scorer (detect generic phrases, count placeholders, compute 0-100 score)
- Quality threshold enforcement (don't save if score <60)

**Addresses (from FEATURES.md):**
- AI self-identification with generated name (improved quality)
- Personality injection from sections (validated quality)

**Avoids (from PITFALLS.md):**
- AI names producing offensive results (validation prevents)
- Quick pass quality too low (scoring detects)

**Research flag:** Standard patterns — name validation and quality scoring are established practices. No research needed.

### Phase 3: Personality Injection & Anti-Generic Language

**Rationale:** With foundation and quality in place, implement the core personalization features. This is where OpenClaw patterns get applied — composing sections into prompts that create "YOUR AI" feeling rather than generic assistant.

**Delivers:**
- System prompt builder using OpenClaw pattern (SOUL → IDENTITY → USER → AGENTS → TOOLS → MEMORY → CONTEXT)
- Anti-generic language instructions (explicit prohibition of "I'd be happy to help!")
- Context-aware greeting generation (uses IDENTITY.md, not generic "Hello")
- Natural language personality definition (values/principles, not robotic rules)
- Memory context usage instructions (direct model to USE retrieved chunks naturally)

**Addresses (from FEATURES.md):**
- Personality injection from 7 sections ✓
- Context-aware greetings ✓
- Anti-generic language instructions ✓
- Natural language personality definition ✓
- Memory context in responses ✓

**Avoids (from PITFALLS.md):**
- Generic prompts that create robotic responses
- Ignoring retrieved context (explicit instruction to USE memories)

**Research flag:** Standard implementation — OpenClaw patterns documented, existing `buildSystemPrompt()` already partially implements this.

### Phase 4: Security & Injection Prevention

**Rationale:** Before exposing to more users, implement security measures. Prompt injection is a critical vulnerability that can persist in long-term memory and affect all future chats. This phase addresses the highest-severity security risk identified in PITFALLS.md.

**Delivers:**
- Conversation sanitization at import (regex filter jailbreak patterns)
- Section output validation (detect injection keywords in behavioral_rules)
- Prompt firewall in chat endpoint (detect injection attempts in user messages)
- Sandbox system constraints (safety rules that override user preferences)
- Web search result sanitization (mark as untrusted, filter adversarial content)

**Addresses (from FEATURES.md):**
- Privacy-first memory (prevents weaponization of stored data)

**Avoids (from PITFALLS.md):**
- Memory-based prompt injection attacks (sanitization prevents)

**Research flag:** Needs review of latest prompt injection techniques during planning — attack vectors evolve rapidly in 2026.

### Phase Ordering Rationale

- **Phase 1 first** because prompt divergence contaminates all testing (can't validate personality if Bedrock fallback produces different results). Token budgeting prevents cost explosion that would make iteration expensive.

- **Phase 2 before 3** because section quality and name quality directly affect user perception of personalization. If sections are generic, even perfect prompt composition won't create "YOUR AI" feeling.

- **Phase 3 is core value** — this is where OpenClaw patterns get applied and users experience true personalization. Can't do this until foundation (Phase 1) and quality (Phase 2) are solid.

- **Phase 4 before public launch** because prompt injection is a critical security vulnerability. Can defer during beta with small trusted users, but must implement before scaling.

### Research Flags

**Phases needing deeper research during planning:**
- **Phase 4 (Security):** Prompt injection techniques evolve rapidly. Need fresh research on 2026 attack vectors, updated sanitization patterns, and Anthropic's latest safety recommendations.

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Prompt Foundation):** Template extraction, token counting, prompt caching — all well-documented in Anthropic docs
- **Phase 2 (Quality):** Name validation, quality scoring — established patterns in existing codebase
- **Phase 3 (Personality):** OpenClaw implementation already partially exists in `buildSystemPrompt()` — refactor not research

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | Based on direct codebase analysis. No new packages needed — everything exists. |
| Features | HIGH | Based on OpenClaw documentation, Custom GPTs patterns, Character.ai research. P1 features well-defined. |
| Architecture | HIGH | Based on existing SoulPrint codebase analysis. Current implementation ~60% complete, gaps identified precisely. |
| Pitfalls | HIGH | Based on 2026 industry research (context engineering, LLM security, cost management) and real-world production AI patterns. |

**Overall confidence:** HIGH

### Gaps to Address

**Token counting accuracy:** Need to implement actual token counting (not just character estimates) to validate budget thresholds. Use `@anthropic-ai/tokenizer` or API token counting. Address during Phase 1 planning.

**Prompt caching effectiveness:** Anthropic's prompt caching is theoretically 90% cost reduction, but need to measure actual savings with SoulPrint's specific prompt structure. Monitor during Phase 1 execution.

**Section schema evolution:** Quick pass generates v1 sections, full pass regenerates as v2. Need schema versioning strategy to handle users with mixed versions. Address during Phase 2 — add `sections_version` column.

**Injection detection false positives:** Regex-based injection detection may flag legitimate conversation content (e.g., user discussing prompt engineering). Need balanced approach during Phase 4 — consider LLM-based detection alongside regex.

## Sources

### Primary (HIGH confidence)

**Stack research:**
- OpenClaw GitHub AGENTS.md — Modular prompt pattern reference
- OpenClaw System Prompt Study — Detailed analysis of bootstrap injection
- Vercel AI SDK Documentation (ai-sdk.dev/docs/foundations/prompts) — Official guidance on template literals
- Anthropic Prompt Engineering Best Practices (2026) — Structured prompts with sections
- Direct codebase analysis (app/api/chat/route.ts, rlm-service/main.py, lib/soulprint/quick-pass.ts)

**Features research:**
- OpenClaw System Prompt Architecture (docs.openclaw.ai) — Bootstrap injection, SOUL.md pattern
- OpenAI Custom GPTs Documentation — Personality presets, tone controls
- Character.ai 2026 Features Guide (autoppt.com) — Personality design, greeting messages
- Perplexity AI Assistants with Memory — Context retrieval vs training data
- AWS RAG Documentation — Authoritative knowledge base retrieval patterns

**Pitfalls research:**
- LLM Context Management (eval.16x.engineer) — Token budgeting, progressive loading strategies
- Context Window Overflow 2026 (redis.io) — Performance degradation patterns
- Understanding LLM Cost Per Token (silicondata.com) — 2026 pricing guide
- Schneier on Security: Why AI Keeps Falling for Prompt Injection — Attack vectors and mitigations
- LLM Security Risks 2026 (sombrainc.com) — RAG security, shadow AI risks

### Secondary (MEDIUM confidence)

- PsychAdapter personality matching (94.5% accuracy Big Five traits) — Tone mirroring future feature
- Dream Companion layered memory architecture — Emotional intelligence patterns
- Conversational AI design 2026 (botpress.com) — Tone consistency best practices
- Data Consistency in Microservices (oreateai.com) — Multi-service prompt divergence prevention

### Tertiary (LOW confidence, deferred)

- Voice AI trends 2026 (elevenlabs.io) — Deferred to v2+ (out of scope for this milestone)
- Universal AI long-term memory (plurality.network) — Interesting but speculative (not actionable)

---

*Research completed: 2026-02-07*
*Ready for roadmap: yes*
