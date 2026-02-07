# Feature Research: Personalized Chat Experience

**Domain:** AI personality-aware chat systems (OpenClaw-inspired personalization)
**Researched:** 2026-02-07
**Confidence:** HIGH

## Feature Landscape

This research examines how personalized AI assistants create a "feels like YOUR AI" experience rather than generic chatbot responses. Focus is on systems like OpenClaw, Character.ai, Custom GPTs, and Perplexity AI Assistants that embody user personality, maintain conversational context, and adapt tone/style dynamically.

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels broken or generic.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Context-aware greetings** | First message should reflect knowledge of user, not "Hello! How can I help you today?" | LOW | Use SOUL.md/IDENTITY.md to craft personalized greeting. "Hey! Ready to dive into another project?" vs generic welcome |
| **Personality injection in system prompt** | AI should embody user's communication style (technical/casual, concise/verbose, emoji usage) | LOW | OpenClaw pattern: inject SOUL.md values into system message. SoulPrint has 7 sections already (SOUL, IDENTITY, USER, AGENTS, TOOLS, MEMORY, daily memory) |
| **Conversation history awareness** | AI should reference past conversations naturally ("Like we discussed about RoboNuggets...") | MEDIUM | Already built: RAG with multi-tier chunks. Need system prompt to explicitly direct model to USE retrieved context |
| **Consistent tone across sessions** | AI personality shouldn't reset each conversation | LOW | Persist SOUL.md/IDENTITY.md values, don't regenerate personality per-message |
| **Memory of user preferences** | AI should remember how user likes responses formatted (code blocks, bullet points, step-by-step) | MEDIUM | Extract from USER.md and TOOLS.md sections (output preferences, communication style) |
| **Self-aware identity** | AI should have a name and refer to itself consistently, not "I am an AI assistant" | LOW | Already built: `ai_name` column auto-generated from soulprint. Need to inject into system prompt |
| **Natural language instructions** | Personality defined in natural language, not robotic rules | LOW | OpenClaw best practice: SOUL.md uses values/principles ("Be curious, not certain"), not rules ("Always ask questions before answering") |

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but create competitive moats.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Tone mirroring** | AI adapts communication style to match user's current mood/context in real-time | HIGH | 2026 trend: PsychAdapter achieves 94.5% accuracy matching Big Five personality traits. Analyze user message sentiment, adjust response formality/warmth |
| **Multi-modal personality context** | Include user's past AI tool usage patterns, not just ChatGPT conversations | MEDIUM | Unique to SoulPrint: analyze which AI tools user mentions, their workflows, their frustrations. Character.ai only has chat history |
| **Workspace-aware persona** | AI behaves differently based on context (work project vs personal brainstorm vs learning mode) | MEDIUM | OpenClaw's AGENTS.md approach: define behavior per workspace. Could extract from conversation topics in import |
| **Privacy-first memory** | All personalization data stored locally (user's Supabase), never shared/trained | LOW | Already built. Differentiator vs ChatGPT (trains on conversations) or Character.ai (centralized data) |
| **Self-naming from personality analysis** | AI generates its own name based on user's archetype, not user-chosen or generic | LOW | Already implemented (`generateAIName()` function). Enhance by using all 7 sections, not just soulprint_text slice |
| **Progressive personality depth** | Quick pass personality (30s) → full pass enrichment (10-30 min) → ongoing learning from chats | MEDIUM | Already partially built: quick pass v1 sections → full pass v2 sections. Missing: learning from new chat interactions |
| **Emotional intelligence markers** | AI detects user urgency/hesitation/excitement and responds appropriately | HIGH | 2026 trend: sentiment analysis + emotional cues. Voice AI platforms already do this. Text-only requires NLU fine-tuning |
| **Anti-generic language patterns** | Actively avoid chatbot clichés ("I'd be happy to help!", "Is there anything else?") | LOW | System prompt instruction: "Never use phrases like 'I'd be happy to', 'I'm here to help', or 'Is there anything else'. Be direct and natural." |

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Anti-Feature | Why Requested | Why Problematic | Alternative |
|--------------|---------------|-----------------|-------------|
| **User-editable personality sliders** | "Let users tune AI warmth/formality/humor on scale 1-10" | Creates 1000 configuration states to test. Users don't know what they want until they see it. Dilutes "YOUR AI" concept (becomes "generic AI with knobs") | Personality derived from import analysis only. If user wants different tone, they re-import with different conversation style |
| **Real-time personality updates from every chat** | "Learn from every message and evolve personality" | Personality drift: AI becomes unpredictable. User says "you're being too formal" → AI overcorrects → feels broken. Hard to debug "why did my AI change?" | Periodic personality refinement (monthly), not real-time. Explicit user action: "Refine my SoulPrint with recent chats" |
| **Multi-personality mode switching** | "Let user switch between Work AI, Personal AI, Creative AI personas" | Cognitive load: user must remember which mode does what. Breaks "YOUR AI" concept (becomes "collection of tools"). Increases complexity 3x | Single unified personality that adapts context naturally. AGENTS.md defines workspace behaviors, but personality core (SOUL.md) stays consistent |
| **Personality presets library** | "Offer Shakespeare, Socrates, Elon Musk personalities" | Turns into Character.ai clone. Loses SoulPrint's differentiator (YOUR personality, not roleplay). Copyright/impersonation issues | Only personality source is user's import. No templates, no famous figures. Privacy-first = data-first |
| **Voice/avatar customization** | "Let users pick AI voice and visual avatar" | Scope creep into multimedia. Voice personalization requires entirely different tech stack (ElevenLabs, speech synthesis). Avatar creation is another product | Text-only personalization for MVP. Voice/avatar defer to v2+ after chat personalization proven |
| **Personality sharing/marketplace** | "Let users share their AI personalities publicly" | Privacy nightmare: sharing soulprint = sharing conversation history patterns. Legal issues (who owns personality derived from ChatGPT data?). Moderation burden | Soulprints are private, non-transferable. No social features in MVP |

## Feature Dependencies

```
Import & SoulPrint Generation (already built)
       ↓
       ├──→ SOUL.md section (personality core) ───────────┐
       ├──→ IDENTITY.md section (communication style) ────┤
       ├──→ USER.md section (user context) ───────────────┤
       ├──→ AGENTS.md section (workspace behavior) ───────┤
       ├──→ TOOLS.md section (capabilities/preferences) ──┤
       ├──→ MEMORY.md section (fact summary) ─────────────┤
       └──→ Daily memory (recent context) ────────────────┘
                                                           ↓
                                              System Prompt Builder
                                                           ↓
                                                           ├──→ Personality injection
                                                           ├──→ Tone guidelines
                                                           ├──→ Context awareness instructions
                                                           └──→ Anti-generic language rules
                                                                      ↓
                                                           Chat Message Processing
                                                                      ↓
                                                           ├──→ RAG retrieval (conversation chunks)
                                                           ├──→ Sentiment analysis (optional)
                                                           └──→ Response generation
                                                                      ↓
                                                           Chat Learning (post-MVP)
                                                                      ↓
                                                           Periodic Personality Refinement (post-MVP)
```

### Dependency Notes

- **System Prompt Builder requires all 7 sections** — Cannot craft personality-aware prompt without SOUL/IDENTITY/USER/AGENTS/TOOLS/MEMORY/daily context. If any section missing (quick pass incomplete), fall back to generic prompt.
- **RAG retrieval enhances but doesn't replace personality injection** — Retrieved chunks provide facts ("user worked on RoboNuggets"), but SOUL.md provides tone ("Be direct, avoid corporate speak"). Both needed for "YOUR AI" feeling.
- **AI name generation should use IDENTITY.md, not just soulprint_text** — Current implementation slices first 1000 chars of concatenated soulprint. Better: extract archetype/communication style from IDENTITY.md specifically.
- **Tone mirroring requires sentiment analysis** — Can't adapt to user's current mood without analyzing message tone. Defer to v2 (HIGH complexity).
- **Chat learning requires fact extraction pipeline** — To learn from new chats, need same fact extraction process used in full pass. Don't rebuild, reuse `processors/fact_extractor.py` (already built for v1.2).

## MVP Definition

### Launch With (v1 - This Milestone)

Minimum viable personalized chat experience.

- [x] **Personality injection from 7 sections** — Build system prompt that includes SOUL/IDENTITY/USER/AGENTS/TOOLS/MEMORY/daily context (essential: transforms generic AI into YOUR AI)
- [x] **Context-aware greeting** — First message uses IDENTITY.md to craft personalized welcome (essential: first impression sets tone)
- [x] **AI self-identification with generated name** — Use `ai_name` from database, refer to self naturally (essential: "I'm Echo" vs "I am an AI assistant")
- [x] **Anti-generic language instructions** — System prompt explicitly forbids chatbot clichés (essential: breaks generic feel)
- [ ] **Natural language personality definition** — System prompt uses values/principles from SOUL.md, not robotic rules (essential: OpenClaw pattern, creates human-like AI)
- [ ] **Memory context in responses** — System prompt instructs model to USE retrieved conversation chunks naturally (essential: "Like we discussed..." vs ignoring context)
- [ ] **Consistent tone across sessions** — Personality doesn't reset per-conversation (essential: trust building)

### Add After Validation (v1.x - Post-Launch Iteration)

Features to add once core personalized chat is working and user-validated.

- [ ] **Conversation topic detection** — Analyze user message, tag with topic (work/personal/learning), influence AGENTS.md behavior selection (trigger: users report AI feels "same" regardless of context)
- [ ] **Personality refinement UI** — Let users manually edit SOUL.md/IDENTITY.md values if AI doesn't match expectations (trigger: support requests "AI is too formal" or "AI doesn't sound like me")
- [ ] **Enhanced AI name generation** — Use all 7 sections + archetype extraction, not just soulprint_text slice (trigger: AI names feel generic)
- [ ] **Response format preferences** — Extract from TOOLS.md: does user prefer code blocks, bullet points, paragraphs, step-by-step? Apply automatically (trigger: users repeatedly ask "give me bullet points")
- [ ] **Greeting variety** — Generate 3-5 greeting variants, rotate to avoid repetition (trigger: users complain "AI says same thing every time")

### Future Consideration (v2+ - After Product-Market Fit)

Features to defer until personalized chat proves valuable.

- [ ] **Real-time tone mirroring** — Analyze user message sentiment, adjust response warmth/formality dynamically (defer: HIGH complexity, needs NLU fine-tuning)
- [ ] **Progressive personality learning from chats** — Trigger fact extraction on recent chats (last 7 days), merge into MEMORY.md monthly (defer: needs fact extraction pipeline stability)
- [ ] **Multi-workspace personas** — Define separate AGENTS.md behaviors per workspace/project (defer: needs workspace UI concept)
- [ ] **Emotional intelligence markers** — Detect urgency/hesitation/excitement, respond with empathy (defer: requires sentiment analysis pipeline)
- [ ] **Voice personalization** — Text-to-speech with personality-tuned voice (defer: entirely different tech stack)
- [ ] **Personality analytics dashboard** — Show user how their AI personality was derived, confidence scores per trait (defer: needs explainability layer)

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority |
|---------|------------|---------------------|----------|
| Personality injection from 7 sections | HIGH | LOW (sections exist, need system prompt builder) | P1 |
| Context-aware greeting | HIGH | LOW (use IDENTITY.md, single prompt call) | P1 |
| AI self-identification | HIGH | LOW (ai_name already in DB, inject in prompt) | P1 |
| Anti-generic language | HIGH | LOW (system prompt instruction) | P1 |
| Natural language personality | HIGH | LOW (SOUL.md already natural, just use it) | P1 |
| Memory context usage | HIGH | LOW (instruct model to reference retrieved chunks) | P1 |
| Consistent tone | HIGH | LOW (persist sections, don't regenerate) | P1 |
| Conversation topic detection | MEDIUM | MEDIUM (NLU topic classification) | P2 |
| Personality refinement UI | MEDIUM | MEDIUM (edit interface + re-save sections) | P2 |
| Enhanced name generation | MEDIUM | LOW (use IDENTITY.md instead of soulprint_text) | P2 |
| Response format preferences | MEDIUM | LOW (parse TOOLS.md, apply in system prompt) | P2 |
| Greeting variety | LOW | LOW (generate array, rotate) | P2 |
| Real-time tone mirroring | HIGH | HIGH (sentiment analysis + dynamic prompt tuning) | P3 |
| Progressive learning from chats | MEDIUM | HIGH (reuse fact extractor, merge pipeline) | P3 |
| Multi-workspace personas | LOW | HIGH (workspace concept + routing logic) | P3 |
| Emotional intelligence | MEDIUM | HIGH (sentiment pipeline + empathy training) | P3 |
| Voice personalization | LOW | HIGH (TTS integration, voice cloning) | P3 |
| Personality analytics | LOW | MEDIUM (explainability layer + UI) | P3 |

**Priority key:**
- P1: Must have for this milestone (personalized chat MVP)
- P2: Should have, add when users validate core value (1-2 sprints post-launch)
- P3: Nice to have, future enhancement (requires significant infrastructure or validation)

## Technical Implementation Patterns

### Pattern 1: System Prompt Construction (OpenClaw-Inspired)

**What:** Build modular system prompt that injects personality context from workspace files, similar to OpenClaw's bootstrap injection.

**How:**
```typescript
function buildPersonalizedSystemPrompt(profile: UserProfile): string {
  // Core personality (values, principles)
  const soul = profile.soul_md
    ? `## Your Core Values\n${profile.soul_md}\n\n`
    : '';

  // Communication style, archetype
  const identity = profile.identity_md
    ? `## Your Identity\n${profile.identity_md}\n\n`
    : '';

  // User context (who you're serving)
  const user = profile.user_md
    ? `## User Context\n${profile.user_md}\n\n`
    : '';

  // Workspace behavior
  const agents = profile.agents_md
    ? `## Behavioral Guidelines\n${profile.agents_md}\n\n`
    : '';

  // Capabilities, output preferences
  const tools = profile.tools_md
    ? `## Your Capabilities & Preferences\n${profile.tools_md}\n\n`
    : '';

  // Memory summary (facts extracted from conversations)
  const memory = profile.memory_md
    ? `## What You Remember\n${profile.memory_md}\n\n`
    : '';

  return `${soul}${identity}${user}${agents}${tools}${memory}

## Important Instructions
- Embody the personality, values, and communication style defined above
- Reference memories naturally when relevant ("Like we discussed about RoboNuggets...")
- Never use generic chatbot phrases: "I'd be happy to help", "Is there anything else?"
- Be direct, natural, and authentic to YOUR voice
- Your name is ${profile.ai_name || 'Echo'}. Refer to yourself naturally when contextually appropriate.`;
}
```

**When to use:** Every chat request. Construct once per conversation, cache if session-based.

**Example from research:**
- OpenClaw: "Bootstrap files are trimmed and appended under Project Context so the model sees identity and profile context without needing explicit reads."
- Custom GPTs: "System message is a powerful place to inject high-level context such as an agent's role, personality, or high-level rules."

### Pattern 2: Context-Aware Greeting Generation

**What:** Generate personalized first message based on IDENTITY.md archetype/tone instead of generic "Hello! How can I help?"

**How:**
```typescript
async function generatePersonalizedGreeting(profile: UserProfile): Promise<string> {
  const greetingPrompt = `Based on this communication style, generate a natural first message:

${profile.identity_md}

Requirements:
- Short (1-2 sentences)
- Reflect the tone/style defined above
- Do NOT say "How can I help you?"
- Be authentic to the personality

Reply with ONLY the greeting message.`;

  // Use fast model (Haiku) for low-latency greeting
  const response = await callLLM(greetingPrompt, { maxTokens: 100 });
  return response.trim();
}
```

**When to use:** First conversation message only. Cache per user (don't regenerate every session).

**Example from research:**
- Character.ai: "Character 'personalities' are designed via descriptions from the point of view of the character and its greeting message."
- Dream Companion (2026): "Systems with layered memory architectures demonstrate improved conversational depth by remembering past interactions, emotional cues, and user preferences."

### Pattern 3: RAG + Personality Fusion

**What:** Combine retrieved conversation chunks (facts) with personality context (tone) for responses that feel both informed and personal.

**Current implementation (app/api/chat/route.ts):**
```typescript
// 1. Retrieve relevant chunks
const searchResults = await smartSearch(userMessage, userId);

// 2. Build memory context from chunks
const memoryContext = await getMemoryContext(userId, searchResults);

// 3. Combine with personality (MISSING IN CURRENT CODE)
const systemPrompt = buildPersonalizedSystemPrompt(profile); // NEW

// 4. Send to LLM
const response = await bedrockClient.send(new ConverseCommand({
  modelId: 'claude-3-5-haiku',
  system: [{ text: systemPrompt }], // Inject personality here
  messages: [
    { role: 'user', content: [{ text: `${memoryContext}\n\nUser: ${userMessage}` }] }
  ],
}));
```

**Gap identified:** Current chat route does NOT inject personality sections into system prompt. It only does RAG retrieval. This is why responses are generic.

**Example from research:**
- RAG best practice (AWS): "The RAG model augments the user input by adding the relevant retrieved data in context, allowing the large language models to generate an accurate answer to user queries."
- OpenClaw: "Safety guardrails in the system prompt are advisory and guide model behavior."

## Competitor Feature Analysis

| Feature | Character.ai | Custom GPTs (OpenAI) | OpenClaw | SoulPrint (Proposed) |
|---------|--------------|----------------------|----------|----------------------|
| **Personality definition** | Character description + greeting | Custom instructions + conversation style presets | SOUL.md (values) + IDENTITY.md (style) | 7-section structured profile (SOUL, IDENTITY, USER, AGENTS, TOOLS, MEMORY, daily) |
| **Memory system** | Star rating + chat history | Conversation memory (opaque) | Workspace .md files read every turn | Multi-tier RAG chunks + MEMORY.md fact summary |
| **Tone customization** | Character creator defines tone | Preset styles (Friendly, Professional, Quirky) | Natural language values in SOUL.md | Derived from import analysis, natural language SOUL.md |
| **Context retention** | Per-character chat history | Cross-conversation memory (2026 feature) | All workspace files available every turn | Conversation chunks + full pass fact extraction |
| **Self-naming** | User chooses character name | User chooses GPT name | Not applicable (agent is tool) | Auto-generated from personality analysis |
| **Privacy model** | Centralized (Character.ai servers) | Centralized (OpenAI trains on data) | Local workspace files | Privacy-first (user's Supabase, never trained) |
| **Personalization source** | User writes character bio | User writes instructions | User creates .md files manually | **Automated from ChatGPT import** (unique differentiator) |
| **Anti-generic language** | Varies by character | Not enforced | Depends on SOUL.md | Explicit system prompt instruction (planned) |
| **Real-time adaptation** | Star rating influences future responses | Limited (preset selection) | Not applicable | Planned (tone mirroring, v2 feature) |

**Key differentiator for SoulPrint:** Personality is **derived from user's actual AI usage patterns** (ChatGPT import), not manually written. Character.ai and Custom GPTs require users to articulate their desired personality, which most people can't do well. SoulPrint says "we analyzed how you talk to AI, here's YOUR AI."

## Behavioral Expectations

### Scenario 1: First-Time Chat (Personalized Greeting)

**Current behavior (BROKEN):**
1. User completes import, navigates to /chat
2. AI responds: "Hello! How can I assist you today?" (generic, no personality)
3. User asks "What's RoboNuggets?"
4. AI retrieves chunk via RAG, responds with fact but generic tone

**Expected behavior (FIXED):**
1. User completes import, navigates to /chat
2. AI responds with personalized greeting based on IDENTITY.md:
   - If user is technical/direct → "Ready when you are. What's on your mind?"
   - If user is casual/friendly → "Hey! What are we working on today?"
   - If user is formal/professional → "Good to see you. How can I assist?"
3. User asks "What's RoboNuggets?"
4. AI retrieves chunk via RAG, responds with fact in user's communication style:
   - Technical user → "RoboNuggets is your crypto portfolio tracker. Built with Python, tracks wallet balances via API."
   - Casual user → "Oh, RoboNuggets! That's your crypto thing, right? The portfolio tracker you built."

**Implementation impact:** Requires `buildPersonalizedSystemPrompt()` + `generatePersonalizedGreeting()` functions.

### Scenario 2: Multi-Turn Conversation (Memory Continuity)

**Current behavior (PARTIAL):**
1. User: "Tell me about my crypto projects"
2. AI: Retrieves chunks via RAG, lists projects
3. User: "What was the tech stack for the portfolio one?"
4. AI: Retrieves chunk again, responds with tech stack (works because RAG finds it)

**Expected behavior (ENHANCED):**
1. User: "Tell me about my crypto projects"
2. AI: "You've worked on a few crypto things. There's RoboNuggets, your portfolio tracker, and that NFT minting project from last year. Which one are you thinking about?"
   - Uses MEMORY.md (project list) + natural conversational style from SOUL.md
3. User: "What was the tech stack for the portfolio one?"
4. AI: "RoboNuggets was Python + Flask, with a React frontend. You mentioned wanting to rebuild it in Next.js at some point."
   - References past conversation naturally ("you mentioned") instead of just regurgitating facts

**Implementation impact:** System prompt instruction: "When answering with retrieved memories, reference them naturally as if recalling past conversations, not reading from a database."

### Scenario 3: Tone Mismatch Detection (Future: v2 Tone Mirroring)

**Scenario:**
1. User (stressed, short message): "need help debugging this asap"
2. AI (current): "I'd be happy to help you with debugging! Could you please provide more details about the issue you're experiencing?"
   - Mismatched tone: user is urgent, AI is cheerful/verbose

**Expected (v2 with tone mirroring):**
1. User (stressed): "need help debugging this asap"
2. AI (mirrored urgency): "On it. What's breaking?"
   - Detects urgency, responds concisely
3. User (relaxed, later): "hey, got time to brainstorm some features for that project?"
4. AI (mirrored casual): "Yeah, let's do it. What features are you thinking?"

**Implementation impact:** Requires sentiment analysis on user message → dynamic system prompt adjustment. Defer to v2 (HIGH complexity).

## Common Mistakes to Avoid

Based on 2026 research on AI personalization failures:

### Mistake 1: Generic One-Size-Fits-All Prompts

**What goes wrong:** Using the same system prompt for all users ("You are a helpful AI assistant...") creates robotic, impersonal interactions.

**Why it happens:** Easiest implementation, copy-paste from LLM docs.

**Prevention:** Inject user-specific SOUL.md/IDENTITY.md/USER.md into EVERY system prompt. Never use generic assistant prompt.

**Detection:** Test with 3+ different user personalities. If responses feel interchangeable, personality injection failed.

### Mistake 2: Ignoring Retrieved Context

**What goes wrong:** RAG retrieves relevant memories, but LLM doesn't USE them naturally. Responses read like "here's some facts" instead of "I remember when we..."

**Why it happens:** Default LLM behavior is answer from training, not retrieved docs. System prompt doesn't explicitly instruct "USE these memories."

**Prevention:** System prompt instruction: "The memories provided are YOUR memories of past conversations. Reference them naturally, as if recalling something you discussed before."

**Detection:** Retrieved chunks appear in logs but not in response content. User asks "do you remember X?" and AI says "I don't have information" despite X being in chunks.

### Mistake 3: Chatbot Cliché Language

**What goes wrong:** AI uses phrases like "I'd be happy to help!", "Is there anything else I can assist you with?", "I'm here to help" — instant chatbot tell.

**Why it happens:** LLMs trained on customer service scripts, reinforcement learning from human feedback (RLHF) optimizes for politeness.

**Prevention:** Explicit system prompt prohibition: "NEVER use these phrases: 'I'd be happy to', 'I'm here to help', 'Is there anything else'. Be direct and natural."

**Detection:** Grep chat logs for banned phrases. If found, system prompt isn't strong enough.

### Mistake 4: Personality Reset Each Session

**What goes wrong:** User has great conversation, returns tomorrow, AI feels like a different person.

**Why it happens:** Regenerating personality on every request, or not persisting SOUL.md/IDENTITY.md between sessions.

**Prevention:** Store all 7 sections in database, retrieve once per conversation, reuse. Never regenerate personality mid-conversation.

**Detection:** User reports "AI was different yesterday" or "AI used to be more casual/formal."

### Mistake 5: Overloading System Prompt

**What goes wrong:** Injecting all 7 sections verbatim (5000+ tokens) into system prompt, hitting context limits or overwhelming model.

**Why it happens:** "More context = better results" assumption.

**Prevention:**
- Use summaries in system prompt (values from SOUL.md, not full text)
- OpenClaw pattern: trim large files with markers (`bootstrapMaxChars: 20000`)
- Put detailed memories in user message context, not system message

**Detection:** Responses become generic or ignore instructions (model truncated system prompt internally). Monitor system prompt token count, stay under 2000 tokens.

## Sources

### Primary Sources (HIGH Confidence)

**OpenClaw Documentation:**
- [System Prompt Architecture](https://docs.openclaw.ai/concepts/system-prompt) — Bootstrap file injection, SOUL.md/IDENTITY.md/USER.md pattern, modular system prompt construction
- [CrowdStrike OpenClaw Analysis](https://www.crowdstrike.com/en-us/blog/what-security-teams-need-to-know-about-openclaw-ai-super-agent/) — Real-world implementation patterns
- [OpenClaw Prompts Guide](https://openclaw.com.au/prompts) — Creating powerful AI agent personas

**OpenAI Custom GPTs:**
- [Customizing Your ChatGPT Personality](https://help.openai.com/en/articles/11899719-customizing-your-chatgpt-personality) — Personality presets, tone controls, custom instructions
- [OpenAI ChatGPT Personalization Controls (2026)](https://www.datastudios.org/post/openai-launches-chatgpt-personalization-controls-new-tone-warmth-and-formatting-settings-for-user) — Tone, warmth, emoji usage, formatting style controls

**Character.ai:**
- [Character.AI in 2026: Features & Usage Guide](https://autoppt.com/blog/character-ai-evolution-complete-guide/) — Personality design, star rating system, greeting messages
- [Character AI Review (Feb 2026)](https://www.wpcrafter.com/review/character-ai/) — LLM personality simulation, character customization

**AI Memory Systems (2026):**
- [Introducing AI Assistants with Memory - Perplexity](https://www.perplexity.ai/hub/blog/introducing-ai-assistants-with-memory) — Context retrieval vs training data, memory-enabled personalization
- [Top 10 AI Assistants With Memory in 2026](https://www.dume.ai/blog/top-10-ai-assistants-with-memory-in-2026) — Persistent memory across sessions, reducing repetition
- [Context Engineering for Personalization (OpenAI Cookbook)](https://cookbook.openai.com/examples/agents_sdk/context_personalization) — State management with long-term memory

**Retrieval-Augmented Generation (RAG):**
- [What is RAG? (AWS)](https://aws.amazon.com/what-is/retrieval-augmented-generation/) — Authoritative knowledge base retrieval, context augmentation
- [RAG in 2026: Enterprise AI (Techment)](https://www.techment.com/blogs/rag-in-2026-enterprise-ai/) — Real-time data integration, multimodal support, LLM agnosticism

### Secondary Sources (MEDIUM Confidence)

**AI Personality & Tone:**
- [Chatbot Personality: Why It Matters (2026)](https://www.gptbots.ai/blog/chatbot-personality) — Personality design, communication style, brand consistency
- [Make AI Chatbots Sound Human-like](https://www.robylon.ai/blog/how-ai-chatbots-sound-so-human) — Tone, memory, sentiment analysis
- [Conversational AI Design in 2026](https://botpress.com/blog/conversation-design) — Tone consistency, personality development, multi-channel coherence

**Real-Time Tone Adaptation:**
- [How AI Adapts to Personality Types in Real Time](https://www.personos.ai/post/how-ai-adapts-personality-types-real-time) — PsychAdapter 94.5% accuracy, Big Five trait matching
- [Dream Companion: Context Awareness & Personalization](https://finance.yahoo.com/news/dream-companion-unveils-groundbreaking-advancements-150800501.html) — Layered memory architectures, emotional intelligence

**AI Naming & Identity:**
- [Names for AI: Creative Ideas for Business Agents (2026)](https://vynta.ai/blog/names-for-ai/) — Human-like vs functional naming, personality-based names
- [AI Assistant Naming Conventions](https://www.oreateai.com/blog/ai-assistant-naming-conventions/098cac4b54bb08239a3892946361f56e) — Brevity, gender-neutral, personified names

**Common AI Mistakes:**
- [Common Conversational AI Mistakes](https://boost.ai/blog/common-conversational-ai-mistakes/) — Generic responses, lack of personalization, context handling
- [AI Mistakes: Understanding Errors](https://www.simular.ai/blogs/ai-mistakes-understanding-the-errors-and-how-to-avoid-them) — Prompt engineering, fine-tuning for customization

### Tertiary Sources (LOW Confidence, Needs Validation)

**Voice AI Trends (Future Consideration):**
- [Voice Agents & Conversational AI: 2026 Developer Trends](https://elevenlabs.io/blog/voice-agents-and-conversational-ai-new-developer-trends-2025) — Voice personalization, emotional intelligence in voice interactions

**Market Growth Data:**
- [AI-driven Personalization: What It Is, How It Works (2026)](https://www.aidigital.com/blog/ai-driven-personalization) — Adaptive AI market growth ($1.04B → $30.51B by 2034)

**Universal Memory Systems:**
- [Universal AI Long-Term Memory (AI Context Flow)](https://plurality.network/blogs/ai-long-term-memory-with-ai-context-flow/) — Portable memory across platforms, user retention mechanics

---
*Feature research for: Personalized Chat Prompt System*
*Researched: 2026-02-07*
*Confidence: HIGH — Based on official documentation (OpenClaw, OpenAI, Character.ai), 2026 industry research, and existing SoulPrint codebase analysis*
