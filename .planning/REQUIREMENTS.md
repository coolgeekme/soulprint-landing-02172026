# Requirements: SoulPrint

**Defined:** 2026-02-11
**Core Value:** The AI must feel like YOUR AI -- genuinely human, deeply personalized, systematically evaluated.

## v2.4 Requirements

Requirements for Import UX Polish milestone. Each maps to roadmap phases.

### Import Progress

- [ ] **PROG-01**: User sees animated stage-based progress (Upload → Extract → Analyze → Build Profile) during import
- [ ] **PROG-02**: Each stage has a visual transition animation when moving to the next stage
- [ ] **PROG-03**: Progress never appears stalled — active stages show movement/animation
- [ ] **PROG-04**: Stage indicators work smoothly on mobile (iOS Safari, Chrome, Brave)

### Chat Transition

- [ ] **TRAN-01**: Import-to-chat transition uses a smooth fade instead of jarring redirect
- [ ] **TRAN-02**: No blank screen or flash during the transition to chat

## Future Requirements

### Import Polish (deferred)

- **PROG-05**: Adaptive messaging shows context-aware labels ("Uploading 1.1GB..." vs generic)
- **PROG-06**: Completion celebration animation (confetti/checkmark) on 100%
- **PROG-07**: Monotonic progress guard (percentage never goes backwards)
- **PROG-08**: localStorage persistence survives tab reload during import

## Out of Scope

| Feature | Reason |
|---------|--------|
| SSE streaming for progress | Polling every 3s sufficient for 30s flow; SSE adds complexity for marginal gain |
| Real-time accuracy progress | Perceived progress matters more than accuracy per UX research |
| AnimatePresence page transitions | Breaks with Next.js App Router; use template.tsx fade instead |
| Lottie/custom animation libraries | Framer Motion already installed and sufficient |
| Backend progress changes | Frontend-only milestone; backend SSE events already adequate |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| PROG-01 | Pending | Pending |
| PROG-02 | Pending | Pending |
| PROG-03 | Pending | Pending |
| PROG-04 | Pending | Pending |
| TRAN-01 | Pending | Pending |
| TRAN-02 | Pending | Pending |

**Coverage:**
- v2.4 requirements: 6 total
- Mapped to phases: 0
- Unmapped: 6

---
*Requirements defined: 2026-02-11*
*Last updated: 2026-02-11 after initial definition*
