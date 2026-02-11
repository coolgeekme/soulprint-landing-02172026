# Feature Research: Animated Stage-Based Import Progress UX

**Domain:** File upload progress and processing feedback for large file imports (100MB-1.1GB)
**Researched:** 2026-02-11
**Confidence:** HIGH

## Executive Summary

Users need confidence during long upload/processing operations. Research shows that **perceived progress matters more than accuracy** — a smoothly animating indicator that stalls feels broken, while a steadily advancing bar (even if less accurate) builds trust. The SoulPrint import flow (1-3 min uploads, 30s processing) needs stage-based transitions that keep users informed and reduce anxiety during variable-speed operations.

**Key insight:** Stage-based progress (Upload → Extract → Analyze → Build Profile) works better than percentage-only progress for multi-phase operations because it **provides context** and **masks speed variations** between stages.

## Feature Landscape

### Table Stakes (Users Expect These)

Features users assume exist. Missing these = product feels incomplete or broken.

| Feature | Why Expected | Complexity | Notes |
|---------|--------------|------------|-------|
| **Visual progress indicator** | Universal expectation for any upload/processing | LOW | Already have RingProgress + linear bar |
| **Percentage display** | Standard for determinate progress (file uploads) | LOW | Already implemented, shows 0-100% |
| **Stage labels** | Users expect "what is happening now" feedback | LOW | Have basic `stage` text, need polish |
| **Smooth animation** | Jumpy progress = broken in users' minds | LOW | CSS transitions already used, need tuning |
| **Time remaining estimate** (for upload) | Standard for file uploads >10MB | MEDIUM | Currently shows estimate during upload phase |
| **"Safe to close" messaging** | Reduces anxiety for long operations | LOW | Already implemented at 55% progress |
| **Error states** | Clear failure messaging with recovery options | LOW | Already implemented with retry flow |
| **Mobile-friendly** | Most uploads happen on mobile (iOS/Android) | MEDIUM | Already mobile-first, needs Safari/Chrome testing |

**Dependencies on existing:**
- RingProgress component (SVG-based, already working)
- Linear progress bar (framer-motion animated)
- TUS upload progress tracking (0-50%)
- Database polling for RLM progress (50-100%)

### Differentiators (Competitive Advantage)

Features that set the product apart. Not required, but valuable.

| Feature | Value Proposition | Complexity | Notes |
|---------|-------------------|------------|-------|
| **Stage transition animations** | Smooth fade/slide between stages reduces anxiety | MEDIUM | Use framer-motion AnimatePresence (already in project) |
| **Adaptive progress messaging** | "Extracting 1.1GB..." vs "Analyzing your thoughts..." feels alive | LOW | Dynamic `stage` text based on file size/progress |
| **Visual stage indicators** (stepper UI) | Horizontal dots/checkmarks show "3 of 4 stages done" | MEDIUM | Radix UI + custom styling, similar to onboarding patterns |
| **Micro-celebration on completion** | Brief confetti/checkmark animation = dopamine hit | MEDIUM | canvas-confetti library (lightweight, respects prefers-reduced-motion) |
| **Progress "easing" for stuck stages** | If progress stalls, slowly increment bar to show "still working" | MEDIUM | Fake progress with cap (never reach 100% until actually done) |
| **Background mode with notification** | "Import running" indicator in header while user browses docs | HIGH | Requires global state + navigation without unmount |
| **Voice/sound feedback** (optional) | Subtle "ding" on stage completion (off by default) | LOW | Web Audio API, toggle in settings |
| **Stage-specific illustrations** | Upload = cloud icon, Analyze = brain icon, animate in/out | MEDIUM | Lucide icons + framer-motion variants |

**Recommended for this milestone:**
1. **Stage transition animations** — Core differentiator, medium complexity
2. **Visual stage indicators** — Industry standard for multi-step processes
3. **Micro-celebration on completion** — Low-effort delight moment
4. **Adaptive progress messaging** — Already have infra, just improve copy

**Defer to future:**
- Background mode (needs architecture changes)
- Voice feedback (low ROI for effort)

### Anti-Features (Commonly Requested, Often Problematic)

Features that seem good but create problems.

| Feature | Why Requested | Why Problematic | Alternative |
|---------|---------------|-----------------|-------------|
| **Pause/Resume upload** | Users think it's like video playback | TUS protocol doesn't guarantee server-side pause state; resumable uploads already handled by TUS retry logic; adds UI complexity for edge case | Show "safe to close tab" message + TUS auto-resume on network recovery |
| **Cancel upload button** | Users want "escape hatch" | After 50% (upload complete), canceling leaves orphaned files in storage; creates ambiguous state (refund? restart?); destructive action users regret | Hide cancel after point of no return (50%); show "this will take a few minutes" upfront |
| **Real-time accuracy guarantees** | Engineers want "honest" progress | Network jitter + RLM variable processing makes accurate ETAs impossible; users prefer smooth steady progress over jumpy accurate progress (research-backed) | Use smoothed progress with caps; prioritize perceived smoothness over accuracy |
| **Detailed technical logs** | "Show me what's happening" | Confuses non-technical users; creates support burden ("what does 'chunking tier 2' mean?"); exposes implementation details that change | Provide simple stage labels for users; add debug mode (localStorage flag) for technical users |
| **Progress for indeterminate stages** | "Don't show spinner, show progress" | RLM processing has no deterministic progress (can't predict AI reasoning time); fake progress bars that stall at 98% create distrust | Use indeterminate spinner for RLM stages; stage labels ("Analyzing...") provide context without false precision |
| **Restart from checkpoint** | "If it fails, don't make me re-upload" | Adds complexity to error recovery; conflicts with data validation (partial imports = corrupt state); users rarely encounter failures | Full restart with optimized flow (skip client extraction for large files); fix root causes of failures instead |

**Critical anti-pattern:** Showing accurate but jumpy progress that stalls. Research shows users perceive steadily advancing (even if inaccurate) progress as faster and more reliable than accurate but stuttering progress.

## Feature Dependencies

```
[Stage Labels]
    └──requires──> [Database Progress Schema] (import_stage column)

[Stage Transitions]
    └──requires──> [Stage Labels]
    └──uses──> [framer-motion AnimatePresence]

[Visual Stage Indicators]
    └──requires──> [Stage Labels]
    └──enhances──> [Stage Transitions] (shows overall position)

[Micro-Celebration]
    └──requires──> [Completion Detection] (progress === 100%)
    └──uses──> [canvas-confetti or Lottie]

[Adaptive Messaging]
    └──requires──> [File Size + Progress State]
    └──enhances──> [Stage Labels]

[Progress Smoothing]
    └──requires──> [Last Progress Timestamp]
    └──conflicts──> [Real-time Accuracy] (intentional tradeoff)
```

### Dependency Notes

- **Stage Transitions require Stage Labels:** Can't animate between stages without knowing what stage we're in
- **Visual Stage Indicators enhance Stage Transitions:** Combined, they create a cohesive multi-step experience (similar to checkout flows)
- **Micro-Celebration requires Completion Detection:** Must distinguish 100% from 99% to trigger celebration once
- **Progress Smoothing conflicts with Real-time Accuracy:** This is intentional — research shows smooth > accurate for perceived performance

## MVP Definition

### Launch With (v1)

Minimum viable product — what's needed to validate the concept.

- [x] **Basic stage labels** — Already implemented (`import_stage` in DB, displayed in UI)
- [x] **Percentage progress** — Already implemented (0-100% with ring + linear bar)
- [x] **Time estimate for upload** — Already implemented (shows "~2m left" during upload)
- [x] **Mobile-responsive design** — Already implemented (tested on mobile)
- [ ] **Stage transition animations** — NEW: Smooth fade/slide between stage labels
- [ ] **Visual stage indicator** (stepper dots) — NEW: Show "Upload → Extract → Analyze → Profile" with active state
- [ ] **Adaptive stage messaging** — ENHANCE: "Uploading 1.1GB..." instead of generic "Uploading..."
- [ ] **Completion celebration** — NEW: Brief checkmark animation or confetti burst on 100%

**Why essential:** These create the "polished progress UX" that differentiates this milestone from the basic flow. Without stage transitions + visual indicators, it's just a progress bar with text labels.

### Add After Validation (v1.x)

Features to add once core is working and user feedback is gathered.

- [ ] **Progress smoothing for stalled stages** — If RLM stage stalls >10s, slowly increment bar
- [ ] **Stage-specific icons** — Upload = cloud, Extract = folder, Analyze = brain, Profile = sparkle
- [ ] **Animation variants** (slide vs fade) — Based on stage type (upload = up, extract = open, etc)
- [ ] **Accessibility improvements** — aria-live announcements for stage changes, reduced-motion support
- [ ] **Error state animations** — Shake animation on failure, clear "try again" CTA

**Trigger for adding:** User feedback shows confusion about stages, or A/B testing shows higher completion rates with these enhancements.

### Future Consideration (v2+)

Features to defer until product-market fit is established.

- [ ] **Background mode** — Import continues while user browses elsewhere on site
- [ ] **Voice feedback** — Subtle sound on stage completion
- [ ] **Detailed progress log** (debug mode) — For technical users, show RLM stages/chunks
- [ ] **Estimated time per stage** — "Upload ~2m, Analysis ~30s" breakdown
- [ ] **Pause/Resume** — Only if TUS + Supabase storage support true pause state

**Why defer:** Background mode requires architectural changes (global state, navigation without unmount). Voice feedback and detailed logs are nice-to-haves with low ROI. Pause/Resume needs significant backend work and may not align with user needs (current "safe to close" approach may be sufficient).

## Feature Prioritization Matrix

| Feature | User Value | Implementation Cost | Priority | Notes |
|---------|------------|---------------------|----------|-------|
| Stage transition animations | HIGH | LOW | P1 | framer-motion already in project, just need variants |
| Visual stage indicator (dots) | HIGH | MEDIUM | P1 | Standard pattern, clear visual progress through stages |
| Adaptive stage messaging | MEDIUM | LOW | P1 | Just conditionally set `stage` text based on state |
| Completion celebration | MEDIUM | LOW | P1 | Quick win, high delight factor, canvas-confetti is tiny |
| Progress smoothing | MEDIUM | MEDIUM | P2 | Requires state tracking + interval logic, polish not MVP |
| Stage-specific icons | LOW | LOW | P2 | Nice visual touch but not critical for understanding |
| Background mode | HIGH | HIGH | P3 | Valuable but requires state/routing changes |
| Voice feedback | LOW | LOW | P3 | Niche feature, may annoy more than help |
| Detailed progress log | LOW | MEDIUM | P3 | Only for debug, not user-facing |

**Priority key:**
- **P1 (Must have for launch):** Creates the "polished stage-based progress" experience. Without these, milestone goal not met.
- **P2 (Should have, add when possible):** Polish and edge case handling. Improves experience but not critical for launch.
- **P3 (Nice to have, future consideration):** Low ROI or high cost. Defer unless user research shows strong need.

## Technical Implementation Notes

### Browser Compatibility (Mobile Safari/Chrome/Brave)

Based on research, here are key considerations:

**CSS Animations:**
- Use `transition` on `width` for linear progress bar (works in all browsers)
- Avoid `-webkit-progress-value` pseudo-selectors (Safari inconsistency)
- Use framer-motion for complex animations (handles browser quirks)

**SVG Progress (RingProgress):**
- `stroke-dashoffset` animations work consistently
- Use `transition: all 0.5s ease-out` for smooth progress updates
- Safari supports drop-shadow filter (already used in RingProgress)

**Framer Motion:**
- AnimatePresence with `mode="wait"` for stage transitions
- Use `initial`, `animate`, `exit` variants for enter/exit
- Disable animations with `prefers-reduced-motion` media query

**Mobile-specific:**
- Test touch targets (minimum 44x44px for iOS)
- Safe area insets already handled (`pt-[calc(env(safe-area-inset-top,0px)+12px)]`)
- Viewport height issues (use `h-[100dvh]` not `h-screen`)

### Animation Performance

**Keep animations under 500ms:**
- Stage transitions: 300ms fade + slide
- Completion celebration: 2-3s confetti burst
- Progress bar updates: 300-500ms easing

**Use GPU-accelerated properties:**
- `transform` (translateX, translateY, scale) — YES
- `opacity` — YES
- `width` — OK for progress bars (less than 60fps but acceptable)

**Avoid:**
- Animating `height` (causes reflow)
- Complex box-shadow animations (use drop-shadow on SVG instead)
- Simultaneous animations of >3 elements (stagger them)

### Progress Smoothing Algorithm (for P2)

```typescript
// Pseudo-code for smoothing stalled progress
let lastProgress = 0;
let lastUpdate = Date.now();

function smoothProgress(realProgress: number) {
  const now = Date.now();
  const timeSinceUpdate = now - lastUpdate;

  if (realProgress === lastProgress && timeSinceUpdate > 10000) {
    // Stalled for 10s — slowly increment (cap at +5%)
    const fakeIncrement = Math.min((timeSinceUpdate / 10000) * 2, 5);
    return Math.min(lastProgress + fakeIncrement, realProgress + 5);
  }

  lastProgress = realProgress;
  lastUpdate = now;
  return realProgress;
}
```

**Warning:** Never let smoothed progress reach 100% before actual completion. Cap at 98% to avoid "stuck at 100%" perception.

## User Psychology Insights

### What Builds Confidence

Based on research into upload anxiety and information processing:

1. **Immediate feedback** (within 100ms of action)
   - Current: File drop triggers processing phase instantly ✅
   - Enhance: Add micro-feedback on drop (scale animation, highlight border)

2. **Consistent motion** (progress bar always moving, even slowly)
   - Current: Upload progress is smooth (TUS reports frequently) ✅
   - Problem: RLM processing stalls progress for 30s ❌
   - Fix: Add smoothing or switch to indeterminate spinner for RLM stages

3. **Clear communication** (what's happening and why it takes time)
   - Current: Stage labels like "Processing..." ✅
   - Enhance: "Analyzing 10 years of conversations..." (contextual)

4. **Sense of control** (ability to cancel or close safely)
   - Current: "Safe to close tab" message after upload ✅
   - Current: Error recovery with "Try Again" button ✅

5. **Positive reinforcement** (celebrate milestones)
   - Missing: Completion celebration ❌
   - Add: Confetti burst or checkmark animation on 100%

### What Creates Anxiety

Based on research into failed upload experiences:

1. **Stalled progress** (bar stuck at 14% for 30s)
   - Problem: RLM processing has no incremental progress
   - Solutions:
     - Switch to indeterminate spinner for RLM stages
     - Add smoothing to slowly increment bar (with cap)
     - Use "X of Y" stage indicator instead of percentage during RLM

2. **Ambiguous time estimates** ("Processing..." with no ETA)
   - Current: Time estimate only during upload phase
   - Enhance: "Usually takes ~30 seconds" for RLM stage

3. **Silent failures** (progress bar disappears with no explanation)
   - Current: Error phase with clear message ✅
   - Current: Logs client errors to server for debugging ✅

4. **Forced attention** (can't leave page during long upload)
   - Current: "Keep tab open" during upload (necessary)
   - Current: "Safe to close" after upload completes ✅

5. **Lack of progress context** (is 50% good or bad?)
   - Current: Only shows percentage
   - Enhance: Stage indicators show "2 of 4 stages complete"

## Stage Definitions

Define clear boundaries for stage-based progress:

| Stage | Progress Range | Label | Duration (typical) | User Message |
|-------|----------------|-------|-------------------|--------------|
| **Extracting** | 0-10% | "Extracting conversations.json..." | <5s | Show file size if known |
| **Uploading** | 10-50% | "Uploading [size]MB..." | 1-3 min | Show % and time remaining |
| **Starting Analysis** | 50-55% | "Starting analysis..." | <5s | Brief transition message |
| **Analyzing** | 55-100% | "Analyzing your conversations..." | ~30s | No time estimate (RLM variable) |
| **Complete** | 100% | "Done! Opening chat..." | <1s | Brief celebration then redirect |

**Implementation notes:**
- **Extracting:** Client-side JSZip (skipped for files >100MB)
- **Uploading:** TUS upload with byte-level progress (accurate)
- **Starting Analysis:** Brief gap while `/api/import/trigger` call completes
- **Analyzing:** RLM processing (no incremental progress, poll every 3s)
- **Complete:** Redirect to /chat after 800ms delay

**Visual indicator mapping:**
```
⚪ Extract  ⚪ Upload  ⚪ Analyze  ⚪ Profile
```
Progress 0-10%: 🟠 Extract  ⚪ Upload  ⚪ Analyze  ⚪ Profile
Progress 10-50%: ✅ Extract  🟠 Upload  ⚪ Analyze  ⚪ Profile
Progress 55-100%: ✅ Extract  ✅ Upload  🟠 Analyze  ⚪ Profile
Progress 100%: ✅ Extract  ✅ Upload  ✅ Analyze  ✅ Profile → 🎉
```

## Competitor Patterns Analysis

| Pattern | Where Seen | What They Do | Our Approach |
|---------|-----------|--------------|--------------|
| **Multi-stage progress** | GitHub file upload, Dropbox, Google Drive | Horizontal stepper with stage labels | Adopt: Use horizontal dots with labels |
| **Indeterminate processing** | Notion import, Linear CSV import | Spinner with "This may take a while" | Consider: Switch from % to spinner for RLM stage |
| **Background processing** | Google Drive, Notion | Upload completes, processing continues in background with notification | Defer: Requires architecture changes |
| **Celebration animation** | Duolingo, Figma, Linear | Confetti or checkmark burst on completion | Adopt: Quick win, high delight |
| **Smooth fake progress** | macOS Finder, Windows copy dialogs | Progress bar accelerates early, decelerates late | Consider: Research shows this is perceived as faster |
| **"X of Y" display** | App Store downloads, Steam | "2 of 4 stages complete" alongside % | Adopt: Combines with stage indicators |

**Key insight from competitors:** Most products use **hybrid approaches** — accurate progress for uploads (deterministic), indeterminate spinners for processing (non-deterministic). Don't force percentage progress on stages that can't provide accurate updates.

## Recommended Phasing for Implementation

### Phase 1: Visual Stage Indicators (Week 1)
- Add horizontal stepper component (4 dots: Extract → Upload → Analyze → Profile)
- Update stage labels based on progress ranges
- Show active/complete states for each stage
- Test on mobile Safari/Chrome

### Phase 2: Stage Transitions (Week 1)
- Add framer-motion variants for fade + slide
- Animate stage label changes (not just text replacement)
- Animate stage dot state changes (inactive → active → complete)
- Add easing for smooth feel

### Phase 3: Completion Celebration (Week 1-2)
- Add canvas-confetti on 100% progress
- Brief (2-3s) animation before redirect
- Respect prefers-reduced-motion
- Test on mobile (performance + visual consistency)

### Phase 4: Adaptive Messaging (Week 2)
- Add file size to stage labels ("Uploading 1.1GB...")
- Add contextual descriptions ("Analyzing 10 years of conversations...")
- Update "safe to close" messaging based on stage
- A/B test messaging variations

### Phase 5: Polish (Week 2+)
- Add progress smoothing for stalled RLM stages
- Add stage-specific icons with animations
- Accessibility improvements (aria-live, reduced-motion)
- Performance optimization (60fps target)

## Sources

### User Experience Research
- [How to Design Better Progress Trackers](https://www.uxpin.com/studio/blog/design-progress-trackers/)
- [Progress Trackers and Indicators – With 6 Examples To Do It Right](https://userguiding.com/blog/progress-trackers-and-indicators)
- [9 Progress Bar UX Examples That Users Actually Love](https://bricxlabs.com/blogs/progress-bar-ux-examples)
- [Progress Bar Indicator UX/UI Design & Feedback Notifications](https://usersnap.com/blog/progress-indicators/)
- [How to Make Progress Bars Feel Faster to Users](https://uxmovement.com/buttons/how-to-make-progress-bars-feel-faster-to-users/)

### File Upload Best Practices
- [UX best practices for designing a file uploader | Uploadcare](https://uploadcare.com/blog/file-uploader-ux-best-practices/)
- [How To Create a Progress Bar For Asset Uploads | Cloudinary](https://cloudinary.com/guides/image-effects/how-to-create-a-progress-bar-for-asset-uploads)
- [Building a Step-Based File Upload Progress with React MUI](https://kombai.com/mui/progress/)

### Multi-Stage Progress Patterns
- [Progress Indicator UI Design: Best practices, Design variants & Examples | Mobbin](https://mobbin.com/glossary/progress-indicator)
- [7 Mobile UX/UI Design Patterns Dominating 2026](https://www.sanjaydey.com/mobile-ux-ui-design-patterns-2026-data-backed/)
- [32 Stepper UI Examples and What Makes Them Work](https://www.eleken.co/blog-posts/stepper-ui-examples)

### Animation & Transitions
- [Master React Transitions: A Guide to Smooth UI Animations](https://codercrafter.in/blogs/reactjs/master-react-transitions-a-guide-to-smooth-ui-animations)
- [7 Practical Animation Tips](https://emilkowal.ski/ui/7-practical-animation-tips)
- [Ten tips for better CSS transitions and animations](https://joshcollinsworth.com/blog/great-transitions)

### Micro-Interactions & Celebrations
- [14 Micro-interaction Examples to Enhance UX](https://userpilot.com/blog/micro-interaction-examples/)
- [12 Micro Animation Examples Bringing Apps to Life in 2025](https://bricxlabs.com/blogs/micro-interactions-2025-examples)
- [Best Practices for Animating Micro-Interactions with CSS](https://blog.pixelfreestudio.com/best-practices-for-animating-micro-interactions-with-css/)

### Browser Compatibility
- [Building a loading bar component | web.dev](https://web.dev/articles/building/a-loading-bar-component)
- [How To Create A Cross Browser Compatible HTML Progress Bar? | LambdaTest](https://www.lambdatest.com/blog/how-to-create-a-cross-browser-compatible-html-progress-bar/)
- [Cross Browser HTML5 Progress Bars In Depth](https://www.useragentman.com/blog/2012/01/03/cross-browser-html5-progress-bars-in-depth/)

### Loading State Patterns
- [Skeleton Screens vs. Progress Bars vs. Spinners (Video) - NN/G](https://www.nngroup.com/videos/skeleton-screens-vs-progress-bars-vs-spinners/)
- [Skeleton loading screen design — How to improve perceived performance](https://blog.logrocket.com/ux-design/skeleton-loading-screen-design/)
- [UX Design Patterns for Loading](https://www.pencilandpaper.io/articles/ux-pattern-analysis-loading-feedback)

### User Anxiety & Processing Psychology
- [Understanding and Preventing File Upload Errors](https://woobewoo.com/glossary/understanding-and-preventing-file-upload-errors-common-causes-and-solutions/)
- [What is Information Anxiety? — IxDF](https://www.interaction-design.org/literature/topics/information-anxiety)
- [CLI UX best practices: 3 patterns for improving progress displays](https://evilmartians.com/chronicles/cli-ux-best-practices-3-patterns-for-improving-progress-displays)

---
*Feature research for: Animated Stage-Based Import Progress UX*
*Researched: 2026-02-11*
*Context: SoulPrint milestone for polished import progress and smooth chat transition*
