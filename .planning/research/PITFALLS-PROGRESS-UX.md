# Pitfalls Research

**Domain:** Animated progress UX and chat transition polish for existing file import pipeline
**Researched:** 2026-02-11
**Confidence:** HIGH

## Critical Pitfalls

### Pitfall 1: Progress Bar Jumping Backwards

**What goes wrong:**
Progress percentages jump backwards (e.g., 75% → 60% → 80%) when backend provides out-of-order or stale updates, making users think the system is broken or stuck in a loop. SoulPrint already experiences this: "progress percentages jump/stall confusing users" (Project Context).

**Why it happens:**
Multiple sources of progress updates (polling, SSE events, optimistic UI) race and overwrite each other. Backend stages complete non-linearly (upload 50% → processing 10%) but UI treats all percentages as monotonic. Database polling lags behind SSE stream by 3-5 seconds, causing stale data to overwrite fresh updates.

**How to avoid:**
- **Client-side progress guard:** Track last displayed percentage in ref, only update if `newProgress > lastProgress` ([Progress Bar Design Best Practices](https://uxplanet.org/progress-bar-design-best-practices-526f4d0a3c30))
- **Phase-locked ranges:** Reserve percentage ranges per phase (upload: 0-50%, extraction: 50-60%, embedding: 60-95%, completion: 95-100%)
- **Monotonic enforcement:** Backend maintains `max_progress_seen` in database, never writes lower values
- **Transition smoothing:** Use 180-300ms CSS transitions on width changes to mask small jumps ([How I Build a Custom Progress Bar Component in React](https://thelinuxcode.com/how-i-build-a-custom-progress-bar-component-in-react-2026-edition/))

**Warning signs:**
- Users report "progress went backwards"
- Progress sits at 100% for more than 2 seconds before completion
- Progress jumps from 10% to 90% instantly (phase transition without interpolation)
- Console shows multiple setState calls per second with decreasing values

**Phase to address:**
Phase 1 (Progress State Management) - Implement client-side monotonic guard and phase-locked ranges before adding animations.

---

### Pitfall 2: SSE Connection Drops on Mobile Safari

**What goes wrong:**
iOS Safari kills EventSource connections when screen locks, tab backgrounds, or memory pressure occurs. Users return to see stuck progress at 45% despite backend completing successfully. SoulPrint already knows: "SSE connections drop on mobile when screen locks" (Project Context).

**Why it happens:**
Safari aggressively manages battery and memory by discarding background tabs without firing `beforeunload` events ([What developers need to know about Chrome's Memory and Energy Saver modes](https://developer.chrome.com/blog/memory-and-energy-saver-mode)). EventSource reconnects fail silently if server no longer sends events for that session. iOS 17.4 introduced new SSE bugs where native EventSource fails in PWA/Add to Home Screen mode ([SSE not working on Safari iOS 17.4](https://github.com/bigskysoftware/htmx/issues/2388)).

**How to avoid:**
- **Hybrid SSE + Polling:** Use SSE for real-time updates when active, fall back to polling every 3-5s if SSE hasn't sent event in 8+ seconds
- **Visibilitychange handler:** Detect tab backgrounding and immediately switch to polling-only mode ([Mobile browser memory pressure tab reload](https://developer.chrome.com/blog/memory-and-energy-saver-mode))
- **Resume detection:** On tab foregrounding, check server state once before re-establishing SSE
- **Persistent state:** Write progress to localStorage every 5% increment so page reload recovers position
- **No SSE dependency:** Design UI to work purely on polling - SSE is optimization only

**Warning signs:**
- Progress stalls at same percentage for 30+ seconds despite backend logs showing completion
- EventSource `onerror` fires repeatedly without reconnect
- Safari devtools show "Connection closed" without corresponding server log
- Works fine on desktop Chrome/Firefox but breaks on iOS Safari

**Phase to address:**
Phase 2 (SSE Resilience) - Add polling fallback and visibilitychange handling as SSE supplement, not replacement.

---

### Pitfall 3: Mobile Browser Tab Reload Loses Upload State

**What goes wrong:**
User uploads 500MB file (10 minutes on slow connection), switches to Messages app, returns to Safari - tab reloads, upload lost, no recovery path. Extremely frustrating for large ChatGPT exports.

**Why it happens:**
Mobile browsers discard tabs under memory pressure with **no warning to JavaScript** - `beforeunload` and `unload` events don't fire ([Memory use does not go down after closing tabs](https://bugzilla.mozilla.org/show_bug.cgi?id=131456)). Chrome Memory Saver and iOS Safari aggressively reclaim memory after 5-10 minutes of backgrounding ([Chrome's Native Memory Saver](https://www.superchargebrowser.com/library/chrome-native-memory-saver-review)). Large file processing in client-side JSZip (currently 100MB limit in import/page.tsx) pushes memory over threshold faster.

**How to avoid:**
- **Server-side upload only:** TUS upload goes direct to Supabase Storage, bypassing browser memory entirely (SoulPrint already does this correctly)
- **Immediate server handoff:** Trigger RLM processing immediately after upload completes at 50%, not after client-side extraction
- **State persistence:** Save `upload_id`, `bytes_uploaded`, `user_id` to localStorage every 10% to enable resume
- **No client-side heavy ops:** Move ZIP extraction to server (already planned for >100MB files), extend to ALL files for consistency
- **Visual warning:** Show "Keep this tab open" banner until progress reaches 50% (upload complete), then "Safe to close" after server has file

**Warning signs:**
- Users report "I came back and it started over"
- Support requests mention switching apps during upload
- Analytics show high bounce rate between 20-40% progress
- Error logs show `Storage.getItem('upload_state')` returning null after user claims progress existed

**Phase to address:**
Phase 1 (Upload State Persistence) - Add localStorage tracking and "safe to close" messaging before adding animations.

---

### Pitfall 4: Framer Motion Layout Shift During Page Transitions

**What goes wrong:**
Transitioning from /import (progress screen) to /chat causes jarring layout shift, flash of unstyled content (FOUC), or double-scroll bars during animation. Undermines polish added by progress animations.

**Why it happens:**
Next.js App Router remounts components during navigation, breaking AnimatePresence exit animations ([Next 13 /app page transition bug](https://github.com/framer/motion/issues/2250)). Pages with different heights (100vh vs >100vh) cause scrollbar appearance mid-transition, pushing content laterally ([Solving Framer Motion Page Transitions in Next.js App Router](https://www.imcorfitz.com/posts/adding-framer-motion-page-transitions-to-next-js-app-router)). Router prefetching triggers layout calculations before animation completes.

**How to avoid:**
- **Use `router.push()` without AnimatePresence:** Next.js App Router fundamentally breaks AnimatePresence - avoid page-level transitions ([GitHub Discussion #42658](https://github.com/vercel/next.js/discussions/42658))
- **Fixed viewport height:** Both /import and /chat use `h-[100dvh]` to prevent scrollbar toggle
- **Fade-only transitions:** If adding transitions, use simple opacity fade (200ms) instead of complex slide/scale
- **Template.js pattern:** For App Router transitions, use `template.js` with motion.div instead of AnimatePresence in layout
- **Immediate data load:** Preload chat AI name and welcome message before navigation to avoid content pop-in

**Warning signs:**
- Horizontal scrollbar flickers during transition
- Content jumps 15-20px to the left mid-animation (scrollbar width)
- Background beams component flashes/reloads on /chat
- Console warnings: "AnimatePresence exit animations not working"

**Phase to address:**
Phase 3 (Transition Polish) - Test page transitions early, choose fixed viewport + fade over complex animations to avoid this pitfall entirely.

---

### Pitfall 5: Optimistic UI Progress Desyncs with Backend Reality

**What goes wrong:**
UI shows "95% - Generating soulprint..." for 45 seconds while backend actually failed at "60% - Embedding chunks" 30 seconds ago. User waits unnecessarily, then sees error with no context. Creates distrust.

**Why it happens:**
Optimistic progress (client-side time estimates) continues even when backend stops sending updates. Polling interval (3-5s) creates 5-15s window where failure isn't detected. Backend sets `import_status=failed` but progress stays at last known value (65%) instead of showing error state ([True Lies Of Optimistic User Interfaces](https://www.smashingmagazine.com/2016/11/true-lies-of-optimistic-user-interfaces/)). No timeout detection for stalled progress.

**How to avoid:**
- **Backend-driven progress only:** Never interpolate or estimate - display exactly what database reports
- **Staleness detection:** If no progress change for 20 seconds, show "Checking status..." overlay
- **Error prioritization:** Check `import_status=failed` BEFORE `progress_percent` in poll handler
- **Timeout failsafe:** If progress=X for 60 seconds, poll status endpoint to force sync
- **Stage validation:** Backend reports stage names ("Embedding tier 1", "Analyzing patterns") that UI validates against expected sequence

**Warning signs:**
- Users screenshot progress at 90%+ but backend logs show failure at 60%
- Support tickets: "It said almost done but then failed"
- Progress sits at exact same number (73%) for 20+ seconds
- Database shows `import_error IS NOT NULL` while frontend shows optimistic stage message

**Phase to address:**
Phase 1 (Progress State Management) - Establish backend-truth-only principle before adding micro-interactions that amplify false confidence.

---

### Pitfall 6: SVG Animation Performance on Low-End Android

**What goes wrong:**
RingProgress component (SVG circle with stroke-dashoffset animation) runs at 15-25 FPS on budget Android phones, causing visible jank during progress updates. Ironically makes experience feel *slower* than no animation.

**Why it happens:**
SVG animations consume CPU and cause jank even with small bandwidth ([Planning for Performance - Using SVG with CSS3 and HTML5](https://oreillymedia.github.io/Using_SVG/extras/ch19-performance.html)). Android SVG rendering is 2-3x slower than iOS for same animation ([Android is slow/broken](https://github.com/react-native-svg/react-native-svg/issues/137)). The 500ms transition on `strokeDashoffset` combined with `drop-shadow` filter triggers expensive paint operations. Progress updates every 3-5s cause overlapping transitions.

**How to avoid:**
- **will-change CSS hint:** Add `will-change: stroke-dashoffset` to promote to compositing layer
- **Remove drop-shadow filter:** Glow effect tanks performance on Android - use solid color stroke
- **Disable on low-end:** Detect `navigator.hardwareConcurrency < 4` and show static percentage only
- **Reduce transition duration:** 180-250ms instead of 500ms to avoid overlap ([SVG animation performance](https://www.zigpoll.com/content/how-can-i-optimize-svg-animations-to-run-smoothly-on-both-desktop-and-mobile-browsers-without-significant-performance-issues))
- **CSS transforms over SVG attrs:** Animate transform properties instead of stroke-dashoffset where possible

**Warning signs:**
- Chrome DevTools Performance shows frame rate dropping below 30 FPS during progress updates
- Android users report "laggy circle animation"
- CPU usage spikes to 80%+ on Moto G7 or similar budget device
- Animation stutters when percentage jumps by 5% or more

**Phase to address:**
Phase 2 (Animation Performance) - Profile on low-end Android before finalizing RingProgress design, consider static fallback.

---

## Technical Debt Patterns

Shortcuts that seem reasonable but create long-term problems.

| Shortcut | Immediate Benefit | Long-term Cost | When Acceptable |
|----------|-------------------|----------------|-----------------|
| Polling every 1 second instead of SSE | Simpler implementation, no EventSource debugging | 60x more database reads, battery drain on mobile, potential rate limit violations | **Never** - Use 3-5s polling minimum or SSE |
| Optimistic progress interpolation ("probably 75% by now") | Smooth progress bar, feels responsive | Users lose trust when estimates are wrong, hard to debug desyncs | Only for final 95-100% range when completion imminent |
| AnimatePresence for /import → /chat transition | Beautiful demo, impressive polish | Breaks randomly on Next.js upgrades, adds 2-3KB bundle, causes layout shift bugs | **Never with App Router** - Use simple fade or no animation |
| Client-side ZIP extraction for all file sizes | Works on dev machine, feels faster | OOM kills on iOS for large files, not recoverable, terrible UX | Files <50MB only (SoulPrint uses 100MB currently, should reduce) |
| Using progress bar library (nprogress, react-circular-progressbar) | Saves 50 lines of code | Bundle bloat (5-15KB), opinionated styling conflicts, lacks mobile optimization | For MVPs only, replace with custom component for production |

## Integration Gotchas

Common mistakes when connecting to external services.

| Integration | Common Mistake | Correct Approach |
|-------------|----------------|------------------|
| RLM Service (SSE) | Assuming SSE connection stays alive for entire 2-5 minute process | Use SSE for quick updates (<30s), fall back to polling for long operations, persist state in DB not memory |
| Supabase Storage (TUS upload) | Showing completion at 100% upload progress | Upload is 50% of process - extraction/embedding happens after. Reserve 0-50% for upload, 50-100% for processing |
| Next.js Router | Using `router.push()` during animation with expectation it waits | Router navigates immediately - handle loading state manually, show loading UI before `router.push()` |
| Database polling | Assuming `updated_at` timestamp means progress changed | Check `progress_percent !== lastProgress` - many updates don't change visible progress |
| Mobile Safari | Trusting `beforeunload` to save state | Use `visibilitychange` event and localStorage, assume tab can die without warning |

## Performance Traps

Patterns that work at small scale but fail as usage grows.

| Trap | Symptoms | Prevention | When It Breaks |
|------|----------|------------|----------------|
| Polling `/api/memory/status` every 1s | Works fine in dev with 1 user | Database connections exhausted, rate limits hit, battery drain complaints | 100+ concurrent imports, or single user with tab open 10+ minutes |
| Rendering 50+ progress stages in UI | Smooth granular updates locally | React re-renders stutter, animation frame drops, mobile overheats | Low-end Android devices, or progress updates faster than 200ms |
| Storing full progress history in state | Easy debugging with Redux DevTools | Memory leak over 5-10 minute import, tab crashes on mobile | Imports longer than 3 minutes on iOS Safari |
| Animating all stage transitions with Framer Motion | Beautiful micro-interactions | 30KB bundle increase, layout recalc on every stage change, jank | Users on 3G connections or budget phones |
| Using database triggers to broadcast progress | Real-time updates without polling | Supabase Realtime connection limits (200/project), subscription overhead | 50+ concurrent users, or users leave tabs open after completion |

## UX Pitfalls

Common user experience mistakes in this domain.

| Pitfall | User Impact | Better Approach |
|---------|-------------|-----------------|
| "Processing..." for 2 minutes with no progress indicator | User thinks it froze, closes tab, loses progress | Show percentage + stage name ("Embedding tier 2: 67%") updated every 3-5s |
| Progress jumps from 10% to 90% in one update | User thinks it's broken or fake | Interpolate jumps client-side over 2-3 seconds, or fix backend granularity |
| "Safe to close tab" message appears too early (at 20%) | User closes tab, TUS upload gets orphaned | Only show after upload completes + server confirms receipt (50%+ in SoulPrint) |
| Error message: "Import failed" with no recovery action | User has to guess what to do - re-upload? Wait? | Specific error ("File too large - max 1GB") + action button ("Try smaller file" / "Contact support") |
| Progress bar reaches 100% but waits 10s to redirect | User clicks around looking for "Continue" button that doesn't exist | Keep progress at 95% until redirect is ready, transition 95→100 during navigation |
| Identical progress UI for 30s upload vs 5min processing | User expects 30s based on upload, frustrated when it takes longer | Two-phase UI: "Uploading..." (30s) then "Analyzing... (this may take 2-3 minutes)" |

## "Looks Done But Isn't" Checklist

Things that appear complete but are missing critical pieces.

- [ ] **Progress animations:** Often missing polling fallback when SSE drops — verify works with EventSource disabled in devtools
- [ ] **Stage transitions:** Often missing error state handling — verify `import_status=failed` shows error UI, not stalled progress
- [ ] **Mobile testing:** Often missing iOS Safari + screen lock testing — verify with actual iPhone, not just Chrome devtools mobile mode
- [ ] **Percentage monotonicity:** Often missing backwards-jump guard — verify rapid backend updates (50→30→70) display as (50→70)
- [ ] **localStorage persistence:** Often missing cleanup on success — verify completed imports don't leak storage keys
- [ ] **Page transition animation:** Often missing height normalization — verify /import and /chat both fixed-height to prevent scrollbar shift
- [ ] **Low-end device testing:** Often missing budget Android testing — verify Moto G7 or similar runs at 30+ FPS
- [ ] **Tab backgrounding:** Often missing visibilitychange handler — verify progress resumes correctly after 2 minutes backgrounded

## Recovery Strategies

When pitfalls occur despite prevention, how to recover.

| Pitfall | Recovery Cost | Recovery Steps |
|---------|---------------|----------------|
| SSE connection dropped mid-import | **LOW** | Polling fallback detects completion within 3-5s, no user action needed, seamless recovery |
| Progress jumped backwards (65% → 40%) | **LOW** | Client-side monotonic guard prevents display, user sees 65% → 65% → 70% (correct), backend fix can deploy separately |
| Tab reload lost upload state | **MEDIUM** | If TUS upload completed (50%+), backend has file, re-trigger processing. If <50%, prompt re-upload with explanation |
| AnimatePresence layout shift breaks chat | **LOW** | Remove AnimatePresence, deploy simple fade, most users won't notice change, fixes immediately |
| SVG animation jank on Android | **LOW** | Add `navigator.hardwareConcurrency` check, show static percentage on low-end devices, no data loss |
| Optimistic progress stuck at 95% despite failure | **MEDIUM** | Add staleness detection (no update for 20s → force poll), show error immediately when detected, user can retry |
| Mobile Safari killed tab during processing | **LOW** | Processing continues server-side, user returns to /chat and sees completion, no data loss if backend designed correctly |

## Pitfall-to-Phase Mapping

How roadmap phases should address these pitfalls.

| Pitfall | Prevention Phase | Verification |
|---------|------------------|--------------|
| Progress jumping backwards | Phase 1: Progress State Management | Load /import, manually set DB progress to 70→50→60, verify UI shows 70→70→70 (monotonic) |
| SSE drops on mobile | Phase 2: SSE Resilience | Open /import on iOS, lock screen for 20s, unlock, verify progress updated via polling |
| Tab reload loses state | Phase 1: Upload State Persistence | Upload file to 30%, force tab reload (Cmd+R), verify localStorage shows partial state + recovery prompt |
| Framer Motion layout shift | Phase 3: Transition Polish | Navigate /import → /chat on 1080p screen, verify no horizontal scrollbar flash during fade |
| Optimistic UI desync | Phase 1: Progress State Management | Pause RLM service mid-import, verify UI shows "Checking status..." after 20s of stalled progress |
| SVG jank on Android | Phase 2: Animation Performance | Test RingProgress on Moto G7, verify maintains 30+ FPS in Chrome devtools performance tab |
| Stage transitions feel abrupt | Phase 3: Micro-interactions | Progress updates from "Uploading" → "Extracting", verify 200ms fade transition, not instant swap |
| Error state invisible | Phase 1: Progress State Management | Set DB `import_status=failed`, verify polling shows error modal within 5s |

## Sources

**SSE and Mobile Connectivity:**
- [Server-Sent Events: A WebSockets alternative ready for another look](https://ably.com/topic/server-sent-events)
- [SSE not working on Safari iOS 17.4 · Issue #2388](https://github.com/bigskysoftware/htmx/issues/2388)
- [WebSockets vs Server-Sent-Events vs Long-Polling](https://rxdb.info/articles/websockets-sse-polling-webrtc-webtransport.html)
- [HTML Standard - Server-sent events (Feb 8, 2026)](https://html.spec.whatwg.org/multipage/server-sent-events.html)

**Next.js App Router and Animation:**
- [How to animate route transitions in app directory? · Discussion #42658](https://github.com/vercel/next.js/discussions/42658)
- [Next 13 /app page transition bug / flash + scrollbar layout shift · Issue #2250](https://github.com/framer/motion/issues/2250)
- [Solving Framer Motion Page Transitions in Next.js App Router](https://www.imcorfitz.com/posts/adding-framer-motion-page-transitions-to-next-js-app-router)

**Progress Bar UX:**
- [Progress Bar Design Best Practices | UX Planet](https://uxplanet.org/progress-bar-design-best-practices-526f4d0a3c30)
- [How I Build a Custom Progress Bar Component in React (2026 Edition)](https://thelinuxcode.com/how-i-build-a-custom-progress-bar-component-in-react-2026-edition/)
- [Best Practices For Animated Progress Indicators — Smashing Magazine](https://www.smashingmagazine.com/2016/12/best-practices-for-animated-progress-indicators/)
- [Progress Indicators Make a Slow System Less Insufferable - NN/G](https://www.nngroup.com/articles/progress-indicators/)

**Mobile Browser Behavior:**
- [What developers need to know about Chrome's Memory and Energy Saver modes](https://developer.chrome.com/blog/memory-and-energy-saver-mode)
- [Turn off "This webpage was reloaded becau… - Apple Community](https://discussions.apple.com/thread/252354711)
- [Chrome's Native Memory Saver (2026) | SuperchargeBrowser](https://www.superchargebrowser.com/library/chrome-native-memory-saver-review)

**SVG Animation Performance:**
- [Planning for Performance — Using SVG with CSS3 and HTML5](https://oreillymedia.github.io/Using_SVG/extras/ch19-performance.html)
- [Android is slow/broken · Issue #137 · react-native-svg](https://github.com/react-native-svg/react-native-svg/issues/137)
- [How can I optimize SVG animations to run smoothly on both desktop and mobile browsers](https://www.zigpoll.com/content/how-can-i-optimize-svg-animations-to-run-smoothly-on-both-desktop-and-mobile-browsers-without-significant-performance-issues)
- [Animation performance and frame rate - MDN](https://developer.mozilla.org/en-US/docs/Web/Performance/Guides/Animation_performance_and_frame_rate)

**Optimistic UI and Perceived Performance:**
- [True Lies Of Optimistic User Interfaces — Smashing Magazine](https://www.smashingmagazine.com/2016/11/true-lies-of-optimistic-user-interfaces/)
- [Optimistic UI Patterns for Improved Perceived Performance](https://simonhearne.com/2021/optimistic-ui-patterns/)
- [Skeleton loading screen design — How to improve perceived performance](https://blog.logrocket.com/ux-design/skeleton-loading-screen-design/)

**2026 UX Trends:**
- [UI/UX Evolution 2026: Micro-Interactions & Motion](https://primotech.com/ui-ux-evolution-2026-why-micro-interactions-and-motion-matter-more-than-ever/)
- [Motion UI Trends 2026: Interactive Design & Examples](https://lomatechnology.com/blog/motion-ui-trends-2026/2911)

---
*Pitfalls research for: SoulPrint import progress UX and chat transition polish*
*Researched: 2026-02-11*
*Confidence: HIGH (known issues from project context + verified 2026 sources)*
