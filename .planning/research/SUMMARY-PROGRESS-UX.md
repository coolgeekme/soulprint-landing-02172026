# Project Research Summary

**Project:** v2.4 Import UX Polish
**Domain:** Animated stage-based progress indicators for file upload/processing flows
**Researched:** 2026-02-11
**Confidence:** HIGH

## Executive Summary

The v2.4 Import UX Polish milestone transforms SoulPrint's existing polling-based import flow into a polished, stage-based progress experience with smooth transitions. Research shows that **perceived progress matters more than accuracy** — users trust steadily advancing bars over jumpy but accurate ones. The existing stack (Framer Motion 12.29.2, Tailwind CSS 3.4.19, React 19) provides everything needed; no new dependencies required.

The current implementation suffers from three critical UX issues: progress percentages jumping backwards (75% → 60% → 80%), long periods of visual stalling during RLM processing, and jarring redirects to chat. The solution is a **stage-based progress model** that maps backend milestones (0%, 20%, 50%, 100%) to 5 visually distinct frontend stages (Upload → Extract → Parse → Build Profile → Complete) with smooth animations between each stage. Polling every 3 seconds is sufficient for the 30-second import flow; SSE would add complexity without meaningful UX improvement.

The biggest risk is **mobile browser tab backgrounding** (iOS Safari kills connections on screen lock), but this is mitigated through existing TUS upload resilience and adding polling fallback. Framer Motion's Next.js App Router incompatibility means avoiding AnimatePresence for page transitions — use simple fade transitions via `template.tsx` instead. Priority order: fix progress state management first (monotonic guards, stage mapping), then add animations, then polish transitions.

## Key Findings

### Recommended Stack

**NO new dependencies needed.** The existing stack already provides all capabilities for animated stage-based progress UI. Current polling-based approach (3-second intervals) is adequate for the 30-second import flow.

**Core technologies:**
- **Framer Motion 12.29.2**: Stage-based animations, progress bar smoothing, icon transitions — already used in `import/page.tsx` line 316 for AnimatePresence
- **Tailwind CSS 3.4.19**: Animation utilities (animate-pulse, transitions, duration classes) — no configuration changes needed
- **React 19.2.3**: State management with useState, useEffect polling — existing polling pattern (lines 38-67) works well, just needs stage mapping enhancement
- **Database-backed progress**: Existing `user_profiles.progress_percent` + `import_stage` provide sufficient granularity for stage detection

**What NOT to add:**
- **SSE (Server-Sent Events)**: Overkill for 30s flow — polling every 3s = 10 updates max. SSE adds complexity (connection management, reconnect logic, iOS Safari bugs) for minimal UX gain.
- **react-spring or lottie-react**: Redundant with Framer Motion. Would add 180KB+ bundle for capabilities already available.
- **zustand/redux**: Progress state is page-scoped, useState is sufficient. Global state over-engineers simple polling.

### Expected Features

**Must have (table stakes):**
- Visual progress indicator (percentage + bar) — already exists, needs polish
- Stage labels ("Uploading...", "Analyzing...") — already exists, needs better text
- Smooth animation (no jumpy progress) — currently broken, needs monotonic guard
- Time remaining estimate for upload — already implemented
- Error states with retry — already implemented
- Mobile-friendly design — already mobile-first with 100dvh, safe-area insets

**Should have (competitive differentiators):**
- **Stage transition animations** — Smooth fade/slide between stage labels using Framer Motion variants
- **Visual stage indicator (stepper dots)** — Horizontal "Upload → Extract → Analyze → Profile" with active/complete states
- **Adaptive stage messaging** — "Uploading 1.1GB..." instead of generic "Uploading..." based on file size
- **Completion celebration** — Brief checkmark animation or confetti burst on 100% (canvas-confetti library, 2-3s duration)

**Defer (v2+):**
- Background mode (import continues while browsing) — requires architecture changes (global state, navigation without unmount)
- Voice feedback (sound on stage completion) — low ROI, may annoy users
- Pause/Resume — TUS protocol doesn't guarantee server-side pause state, current "safe to close" approach sufficient
- Detailed progress log (debug mode) — only valuable for technical users, not MVP

### Architecture Approach

The architecture maps discrete backend progress milestones to animated frontend stages using a **progress state machine** with client-side interpolation. Backend updates 3 times (0%, 20%, 50%, 100%) while frontend displays 5 smooth stages by interpolating between milestones. Existing polling infrastructure (every 3s via `/api/memory/status`) remains unchanged; the enhancement is pure frontend refactoring.

**Major components:**

1. **Progress Mapper (`lib/import/progress-mapper.ts`)** — Pure function mapping backend `progress_percent` + `import_stage` to frontend stage (1-5) and display percentage. Implements phase-locked ranges: Upload 0-30%, Extract 30-40%, Parse 40-60%, Build 60-95%, Complete 95-100%.

2. **Animated Progress Stages (`components/import/animated-progress-stages.tsx`)** — Main UI component combining stage indicator + stage animations + progress bar. Replaces current RingProgress. Uses Framer Motion variants for stage transitions (300ms fade + slide).

3. **Page Transition Handler (`lib/import/transition.ts`)** — Orchestrates smooth /import → /chat navigation via prefetch + fade-out + navigate sequence. Replaces current 800ms `setTimeout` with 1100ms choreographed transition (completion animation 500ms → fade out 300ms → navigate → template.tsx fade in 300ms).

4. **Template Wrapper (`app/template.tsx`)** — Next.js App Router native pattern for page transitions using Framer Motion. Simpler than AnimatePresence pattern which breaks with App Router.

**Data flow remains unchanged:** TUS upload → POST `/api/import/trigger` → RLM updates database → Frontend polls every 3s. The enhancement is mapping backend state (3 discrete milestones) to frontend state (5 smooth stages with animations).

### Critical Pitfalls

1. **Progress jumping backwards (75% → 60% → 80%)** — Caused by multiple progress sources (polling, optimistic UI) racing and overwriting each other. **Avoid with:** Client-side monotonic guard (only update if `newProgress > lastProgress`), phase-locked ranges (Upload 0-50%, Processing 50-100%), backend `max_progress_seen` column. Fix in Phase 1 before adding animations.

2. **SSE connections drop on mobile Safari (iOS kills background tabs)** — EventSource disconnects when screen locks, users return to stuck progress at 45% despite backend completing. **Avoid with:** Hybrid SSE + polling fallback (poll if SSE silent for 8+ seconds), `visibilitychange` handler to switch to polling-only when backgrounded, localStorage persistence every 5% increment. Fix in Phase 2 as polling resilience.

3. **Mobile browser tab reload loses upload state (memory pressure)** — User uploads 500MB file, switches apps, Safari reloads tab without warning, upload lost. **Avoid with:** Server-side upload only (TUS to Supabase Storage, bypass browser memory), immediate server handoff (trigger RLM at 50%, not after client extraction), localStorage tracking of `upload_id` + `bytes_uploaded`, "Keep tab open until 50%" banner. Fix in Phase 1 before animations.

4. **Framer Motion layout shift during page transitions (App Router incompatibility)** — AnimatePresence exit animations break with Next.js App Router navigation, causing FOUC and scrollbar flicker. **Avoid with:** Use `template.tsx` pattern instead of AnimatePresence, fixed viewport height (both pages use `h-[100dvh]`), simple fade-only transitions (200-300ms opacity), prefetch chat data before navigation. Fix in Phase 3 by avoiding AnimatePresence entirely.

5. **Optimistic UI progress desyncs from backend reality** — UI shows "95% - Generating soulprint..." for 45s while backend failed at 60% 30s ago. **Avoid with:** Backend-driven progress only (no client-side interpolation beyond smoothing), staleness detection (if no update for 20s, show "Checking status..."), error prioritization (check `import_status=failed` before `progress_percent`), timeout failsafe (poll force-sync if stuck 60s). Fix in Phase 1 as backend-truth principle.

6. **SVG animation performance on low-end Android (15-25 FPS jank)** — RingProgress `stroke-dashoffset` + `drop-shadow` filter tanks performance on budget phones. **Avoid with:** `will-change: stroke-dashoffset` CSS hint, remove drop-shadow filter (solid stroke instead), disable on `navigator.hardwareConcurrency < 4`, reduce transition duration to 180-250ms. Fix in Phase 2 with performance profiling.

## Implications for Roadmap

Based on research, suggested 3-phase structure over 1-2 weeks:

### Phase 1: Progress State Management
**Rationale:** Fix existing bugs before adding polish. Progress jumping backwards and desync issues undermine trust; animations on top of broken state management amplify problems instead of masking them. Dependencies must be resolved first.

**Delivers:**
- Monotonic progress (never goes backwards visually)
- Stage mapping function (backend milestones → frontend stages)
- Upload state persistence (localStorage for recovery)
- Backend-truth enforcement (no optimistic UI)

**Addresses (from FEATURES.md):**
- Table stakes: Smooth animation (fix jumpy progress)
- Table stakes: Error states with retry (staleness detection)

**Avoids (from PITFALLS.md):**
- Pitfall 1: Progress jumping backwards
- Pitfall 3: Tab reload loses state
- Pitfall 5: Optimistic UI desync

**Implementation:** 50-100 lines in `lib/import/progress-mapper.ts`, modify 30-50 lines in `app/import/page.tsx` polling logic, add localStorage hooks. Pure refactoring, no new UI.

### Phase 2: Stage-Based Animations
**Rationale:** Once progress state is reliable, add visual polish. Stage transitions and indicators build confidence by showing "where you are" in the process (2 of 4 stages complete), not just "how much is left" (67%). Research shows multi-step indicators reduce anxiety during variable-speed operations.

**Delivers:**
- Visual stage indicator (horizontal stepper: Upload → Extract → Parse → Build → Complete)
- Stage transition animations (300ms fade + slide using Framer Motion)
- Adaptive stage messaging ("Uploading 1.1GB..." instead of "Uploading...")
- Completion celebration (checkmark animation, 500ms)

**Uses (from STACK.md):**
- Framer Motion 12.29.2 variants pattern (already used in `import/page.tsx:316`)
- Tailwind animation utilities (`transition-all`, `ease-out`, custom durations)
- Existing polling infrastructure (no changes to 3s interval)

**Implements (from ARCHITECTURE.md):**
- Animated Progress Stages component (150-200 lines)
- Stage Indicator component (50-80 lines, reuses existing UI patterns)
- Stage Animations component (100-150 lines Framer Motion)

**Avoids (from PITFALLS.md):**
- Pitfall 6: SVG jank (profile on Android, add fallback if needed)

**Implementation:** 3 new components (~400 lines total), modify 20-30 lines in `app/import/page.tsx` to use new components. Visually distinct from Phase 1, can demo independently.

### Phase 3: Transition Polish
**Rationale:** Page transitions come last because they're the most fragile (Next.js App Router compatibility issues) and least critical (user sees benefit only once, at completion). Smooth /import → /chat transition is "nice to have" while progress reliability is "must have."

**Delivers:**
- Smooth page transition (/import → /chat via `template.tsx`)
- Prefetch orchestration (load chat data during exit animation)
- Fixed viewport heights (prevent scrollbar shift)
- Fade-in animation on chat page load

**Uses (from STACK.md):**
- Next.js 16.1.5 `template.tsx` pattern (App Router native)
- Framer Motion for fade transitions (NOT AnimatePresence)
- `router.prefetch()` for data loading overlap

**Implements (from ARCHITECTURE.md):**
- Template wrapper component (20-30 lines)
- Transition orchestration function (50-70 lines)

**Avoids (from PITFALLS.md):**
- Pitfall 4: Framer Motion layout shift (use `template.tsx`, not AnimatePresence)

**Implementation:** 2 new files (~100 lines total), modify 5-10 lines in `app/import/page.tsx` redirect logic, add `app/template.tsx`. Low risk, high polish ROI.

### Phase Ordering Rationale

- **Phase 1 before Phase 2:** Can't animate broken state — fix progress jumping/desync first, then add animations on top of reliable foundation
- **Phase 2 before Phase 3:** Stage animations visible for 30 seconds (entire import), page transition visible for 1 second (completion only) — prioritize higher-exposure UX improvements
- **All phases build on existing stack:** Zero new dependencies means low risk of version conflicts or bundle bloat

### Research Flags

**Phases with standard patterns (skip research-phase):**
- **Phase 1 (Progress State Management):** Well-documented React patterns (useState, monotonic guards), similar to existing polling logic (lines 38-67), low research need
- **Phase 2 (Stage Animations):** Framer Motion best practices well-documented, existing AnimatePresence usage (line 316) provides template, low research need
- **Phase 3 (Transition Polish):** Next.js `template.tsx` pattern documented in official Next.js 13+ guides, straightforward implementation, low research need

**No phases need deeper research** — this milestone is polish/refactoring, not new feature development. All patterns already proven in codebase or official documentation.

## Confidence Assessment

| Area | Confidence | Notes |
|------|------------|-------|
| Stack | HIGH | All packages installed and verified compatible (Framer Motion 12.29.2 + React 19, Tailwind 3.4.19). No upgrades needed. Existing import/page.tsx already uses Framer Motion successfully (line 316). |
| Features | HIGH | Feature research based on 14+ UX sources (NN/G, UXPin, Mobbin) + competitor analysis (GitHub, Dropbox, Notion patterns). Stage-based progress is industry standard for multi-step uploads. |
| Architecture | HIGH | Polling infrastructure already works (3s intervals, lines 38-67). Enhancement is pure frontend refactoring — no backend changes, no database schema changes. Progress mapper pattern tested in multiple production systems. |
| Pitfalls | HIGH | Pitfall research verified against known issues in Project Context ("progress percentages jump/stall", "SSE drops on mobile"). All 6 critical pitfalls have documented recovery strategies and prevention verified against 2026 sources. |

**Overall confidence:** HIGH

### Gaps to Address

- **Low-end Android performance:** Research shows SVG animation jank on budget devices (Moto G7), but no access to physical device for profiling. **Mitigation:** Add `navigator.hardwareConcurrency < 4` check to disable animations on low-end devices. Test after Phase 2 deployment via user feedback.

- **iOS Safari screen lock behavior:** Research documents EventSource failures (iOS 17.4 bugs), but exact timing of connection drops varies by iOS version. **Mitigation:** Hybrid SSE + polling fallback handles this gracefully. Monitor Sentry for `EventSource onerror` frequency after Phase 2.

- **Chat page prefetch timing:** Uncertain if `router.prefetch()` completes before transition animation ends (1100ms). **Mitigation:** Measure in production via `performance.mark()` logs. If prefetch is slow, extend exit animation to 800ms (from 300ms) to mask latency.

## Sources

### Primary (HIGH confidence)
- **Framer Motion 12.x Official Docs** (motion.dev/docs) — Animation best practices, React 19 compatibility verified, AnimatePresence patterns, variants API
- **Next.js 16 App Router Docs** (nextjs.org/docs/app) — `template.tsx` pattern for page transitions, `router.prefetch()` API, client component architecture
- **Tailwind CSS 3.4 Docs** (tailwindcss.com/docs/animation) — Animation utilities, custom keyframes, transition timing functions
- **Codebase Analysis** — `app/import/page.tsx` (existing polling + Framer Motion usage), `package.json` (verified versions), `components/ui/ring-progress.tsx` (current animation patterns)

### Secondary (MEDIUM confidence)
- **UX Research Articles** — NN/G Progress Indicators, UXPin Progress Trackers, UserGuiding 6 Examples (industry patterns for progress UX)
- **File Upload Best Practices** — Uploadcare, Cloudinary, Kombai guides (multi-stage upload patterns, time estimation, error handling)
- **Browser Compatibility** — web.dev Loading Bar Component, LambdaTest Cross-Browser Progress, Safari iOS SSE bugs (GitHub issues)
- **Animation Performance** — MDN Animation Performance, O'Reilly SVG Performance, react-native-svg Android issues (mobile optimization patterns)

### Tertiary (LOW confidence)
- **Motion UI Trends 2026** — Lomatechnology blog, Primotech micro-interactions (emerging patterns, not yet industry standard)
- **Mobile Browser Memory** — Bugzilla memory discussion, Chrome Memory Saver review (behavior varies by OS version, needs production validation)

---
*Research completed: 2026-02-11*
*Ready for roadmap: yes*
