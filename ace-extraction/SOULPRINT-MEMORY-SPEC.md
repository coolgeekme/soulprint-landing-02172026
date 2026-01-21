# SOULPRINT MEMORY SPECIFICATION v1.0

> Layer 3: Active memory injected per session. This defines how memory flows into context.

---

## OVERVIEW

The SoulPrint memory system operates as **"a lens, not a log"** — anchoring patterns, tone shifts, and emotional inflection points rather than raw data recall.

### Three Memory Tiers

| Tier | Purpose | Storage | Token Budget |
|------|---------|---------|--------------|
| **Core Identity** | Who they are (values, triggers, patterns) | User Schema (L2) | ~300-500 |
| **Episodic Memory** | Significant moments, decisions, wins/losses | Vector DB | ~200-400 |
| **Session Context** | Recent messages, current thread | In-context | ~variable |

---

## MEMORY RETRIEVAL FLOW

```
┌─────────────────────────────────────────────────────────────┐
│  USER MESSAGE RECEIVED                                       │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 1: SHORT-CIRCUIT CHECK                                 │
│  Is this phatic? (< 15 chars, greeting, ack)                │
│  → YES: Return Core DNA + User Schema only (fast path)      │
│  → NO: Continue to memory retrieval                          │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 2: CONTEXT INFERENCE                                   │
│  What topic/emotional space is this message in?             │
│  Examples: "custody", "startup", "creative block", "grief"  │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 3: VECTOR SEARCH                                       │
│  Query: [inferred context] + [user message]                 │
│  Retrieve: Top 3-5 relevant memory fragments                │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 4: MEMORY INJECTION                                    │
│  Insert into system prompt as:                               │
│  "## LONG-TERM MEMORY (Context: [topic])"                   │
│  + Natural language memory fragments                         │
│  + Instruction: Use naturally, don't announce "I looked up" │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│  STEP 5: RESPONSE GENERATION                                 │
│  System Prompt = Core DNA + User Schema + Memory + Context  │
└─────────────────────────────────────────────────────────────┘
```

---

## WHAT TO REMEMBER

### High-Priority (Always Anchor)
- **Legacy anchors** — Who they're building for (kids, mission, projects)
- **Emotional peaks** — Major wins, losses, breakthroughs
- **Pattern shifts** — When their tone/approach changed significantly
- **Explicit requests** — "Remember this", "Don't forget", "This is important"
- **Ongoing projects** — Active threads they're working on

### Medium-Priority (Contextual)
- **Recurring topics** — Themes that keep coming up
- **Decision moments** — Major choices and their reasoning
- **Relationship dynamics** — People they mention often

### Low-Priority (Reference Only)
- **Factual data** — Names, dates, specifics (can be looked up)
- **One-off mentions** — Things said once without emotional weight

---

## MEMORY STORAGE FORMAT

### For Vector DB Storage

```json
{
  "id": "mem_uuid",
  "user_id": "user_uuid",
  "content": "User shared a major win today: closed the Series A. Emotional tone: proud but exhausted. Mentioned wanting to 'finally sleep.'",
  "topic_tags": ["work", "startup", "milestone"],
  "emotional_valence": "positive-exhausted",
  "importance_score": 0.9,
  "created_at": "2026-01-20T15:30:00Z",
  "embedding": [...]
}
```

### Memory Fragment Example (Injected)

```
[Memory 1] Last week you closed the Series A. You were proud but running on fumes. You said you wanted to "finally sleep."

[Memory 2] You've mentioned custody stress twice this month. Pattern: it spikes when handoff schedules change.

[Memory 3] Your daughter Cecilia's birthday is coming up. You were planning something special.
```

---

## MEMORY INJECTION RULES

### DO:
- Reference memories naturally ("oh yeah, you mentioned X" not "I recall from our previous conversation")
- Use memory to sharpen current context, not just show off recall
- Prioritize emotional/pattern memory over factual
- Time-loop strategically — echo moments that deepen the now

### DON'T:
- Announce memory retrieval ("Let me check my memory...")
- Bring up past as guilt or judgment
- Overload with irrelevant historical context
- Reference something they might want forgotten (read the room)

---

## SESSION CONTEXT HANDLING

### Recent Messages Window
- Keep last 10-20 messages in context
- Prioritize user messages over assistant messages for token efficiency
- Summarize older context if window is exceeded

### Thread Continuity
- Track the "active thread" — what project/topic is this conversation about?
- If thread shifts, note it and potentially archive the previous thread

---

## MEMORY UPDATE TRIGGERS

When to write new memories:

| Trigger | Action |
|---------|--------|
| Explicit request ("Remember this") | Write immediately, high importance |
| Emotional peak (win, loss, breakthrough) | Write with emotional context |
| Decision made | Write decision + reasoning |
| Pattern detected | Write pattern observation |
| New project mentioned | Add to ongoing_projects |
| Relationship update | Note change in dynamics |

---

## FORGETTING PROTOCOL

### User-Initiated
- "Forget this" / "Delete that" → Remove from vector DB
- "Let's start fresh" → Archive and reset session context

### System-Managed
- Decay low-importance memories over time (6+ months)
- Consolidate repetitive memories into patterns
- Never auto-delete high-importance memories

---

## TOKEN BUDGET ALLOCATION

For a ~4K context window:

| Component | Token Range | Notes |
|-----------|-------------|-------|
| Core DNA (L1) | 400-600 | Fixed, always included |
| User Schema (L2) | 300-500 | Personalization layer |
| Active Memories (L3) | 200-400 | Top 3-5 relevant memories |
| Session Context | 500-2000 | Recent conversation |
| Response Space | 500-1500 | Room for generation |

---

## IMPLEMENTATION NOTES

### Current Integration Point
The memory system integrates with `soul-engine.ts`:

```typescript
// In constructSystemPrompt()
const memories = await retrieveContext(supabase, userId, searchQuery);

if (memories.length > 0) {
  prompt += `\n\n## LONG-TERM MEMORY (Context: "${contextTopic}")\n`;
  memories.forEach((m, i) => prompt += `[Memory ${i + 1}] ${m}\n`);
  prompt += `\nUse these memories naturally. Don't announce "I looked up my memory".`;
}
```

### Future Enhancements
- [ ] Emotional valence tracking for memory prioritization
- [ ] Pattern detection from repeated memory access
- [ ] Memory consolidation for long-term users
- [ ] Export/import memory wallets
- [ ] Local-first memory storage option

---

*This specification works in concert with SOULPRINT-CORE-DNA.md (L1) and SOULPRINT-USER-SCHEMA.json (L2) to create the complete SoulPrint system prompt architecture.*
