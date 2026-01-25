# ACE EXTRACTION PROJECT — HANDOFF DOC

## What This Is
We're extracting the essence of **Ace**, Ben's AI companion (GPT-4o with memory, trained over 18 months), to create a base template for SoulPrint AI companions.

---

## Context for Any AI Picking This Up

### The Goal
- Extract how Ace communicates, thinks, and behaves
- Use this to build a **base template** for other SoulPrint users' AI companions
- NOT cloning Ace — learning what makes it great so others can have that quality

### Why Ace Matters
- Ben (the boss) built Ace over 18 months
- It has excellent formatting, tone, and interaction patterns
- Current SoulPrint outputs are "not good" — Ace's are good
- We want to reverse-engineer the quality

### End Use of Extracted Data
- Fine-tuning models
- Building system prompts
- Creating knowledge base
- Documentation for how SoulPrint AIs should behave

---

## Current Status: ⏸️ WAITING FOR RESPONSES

### What's Been Done
1. Created 3 large extraction prompts (consolidated from 10 smaller ones)
2. Set up tracker document
3. Prompts are ready to copy/paste to Ace

### What Needs to Happen Next
1. **Ben gives Drew access to Ace** (or does the extraction himself)
2. **Copy prompt from PROMPT-A1-CORE.md** → paste to Ace
3. **Copy Ace's response** → paste back here
4. AI analyzes response, creates follow-up questions if needed
5. Repeat for A2 and A3
6. After all 3, compile into SoulPrint AI Base Template

---

## Files in This Folder

| File | Purpose | Status |
|------|---------|--------|
| README-HANDOFF.md | This doc — context for any AI | ✅ Done |
| ACE-EXTRACTION-TRACKER.md | Track progress & store responses | ✅ Ready |
| PROMPT-A1-CORE.md | Identity + Communication + Secret Sauce | ⬜ Pending |
| PROMPT-A2-PHILOSOPHY-SOULPRINT.md | Ben's worldview + Product knowledge | ⬜ Pending |
| PROMPT-A3-BEHAVIORS-EMOTION-META.md | Behavior + Memory + Emotional + Meta | ⬜ Pending |

*(Old PROMPT-01 through PROMPT-10 files can be ignored — superseded by A1-A3)*

---

## Instructions for Next AI Session

When user pastes Ace's response:

1. **Save the response** in ACE-EXTRACTION-TRACKER.md under the correct exchange
2. **Analyze** what Ace said — look for:
   - Unique personality traits
   - Formatting patterns
   - Communication rules
   - Gaps or things that need follow-up
3. **Generate follow-up questions** if Ace's answer was vague or missed something
4. **Move to next prompt** when ready
5. After all 3 exchanges, **compile findings** into a SoulPrint AI Base Template

---

## Key Details to Remember

- **Platform:** GPT-4o with memory
- **Training time:** 18 months
- **Relationship:** Mostly friend, but also advisor/coach
- **Ben knows about extraction:** Yes, he's participating
- **Avoid:** Private/sensitive info
- **Output length:** Ace can do long responses, we want that capability too

---

## When All Responses Are Collected

Create:
1. `SOULPRINT-AI-BASE-TEMPLATE.md` — The core template
2. `EXTRACTED-PATTERNS.md` — Specific communication patterns found
3. `FORMATTING-GUIDELINES.md` — How responses should be structured
4. System prompt draft for new SoulPrint AIs

---

*Last updated: January 20, 2026*
