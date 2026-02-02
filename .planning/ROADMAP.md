# SoulPrint — Roadmap

## Milestones

- **v1.0 MVP** — Phase 1 (shipped 2026-02-01) — [Archive](milestones/v1.0-MVP-ROADMAP.md)
- **v1.1 Polish** — Phases 2-4 (in progress)

---

<details>
<summary>v1.0 MVP (Phase 1) — SHIPPED 2026-02-01</summary>

- [x] Phase 1: Mobile MVP (4/4 UAT tests passed)
  - Email notification after import
  - Chat loads after import
  - Memory context in responses
  - Mobile upload works

</details>

---

## Phase 2: Hardening ← CURRENT
**Goal:** Reliability for real users — validate inputs, recover from failures, clear errors

### Priority 1: Reliability
- [ ] Validate ChatGPT ZIP format (reject invalid files with clear message)
- [ ] Detect stuck imports (>10 min processing → show retry option)
- [ ] User-friendly error messages for each failure mode
- [ ] Allow retry after failure (reset import_status)

### Priority 2: Visibility (after reliability)
- [ ] Progress indicator during processing
- [ ] Embedding status in UI
- [ ] "Still working..." indicator for long imports

### Priority 3: Scale (after visibility)
- [ ] Test 5 concurrent users
- [ ] Large file handling (>500MB)

---

## Phase 3: Retention
**Goal:** Users come back

### Milestones
- [ ] Chat history persists
- [ ] Memory improves over time
- [ ] Gamification basics (XP, streaks)

---

## Phase 4: Growth
**Goal:** Viral loops

### Milestones
- [ ] Referral system
- [ ] Shareable soulprint cards
- [ ] Waitlist → onboarding flow

---

## Backlog
- Voice input/output
- Multiple conversation imports (Claude, etc.)
- Team/shared memories
- API access

---
*Last updated: 2026-01-30*
