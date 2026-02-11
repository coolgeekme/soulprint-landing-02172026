# Stack Research: Import Progress UX

**Domain:** Animated stage-based import progress UI and smooth transitions
**Researched:** 2026-02-11
**Confidence:** HIGH

## Executive Summary

**NO new dependencies needed.** Existing stack (Framer Motion 12.29.2, tailwindcss-animate, React 19) already provides all capabilities for animated stage-based progress UI. The milestone requires refactoring existing code, not adding libraries.

**Key finding:** Current polling-based approach (3s intervals) is sufficient for 30-second import flow. SSE would add complexity without meaningful UX improvement for this duration.

## Current Stack (Already Available)

### Animation Capabilities

| Technology | Version | Current Use | New Use for Milestone |
|------------|---------|-------------|----------------------|
| **Framer Motion** | 12.29.2 | AnimatePresence for phase transitions (import/page.tsx:316) | Stage-based animations, progress bar smoothing, icon transitions |
| **tailwindcss-animate** | 1.0.7 | Spin animations (Loader2), pulse effects (BackgroundBeams) | Stage transition effects, skeleton loaders |
| **Tailwind CSS** | 3.4.19 | Utility classes, transitions | Animation utilities (animate-pulse, animate-spin, transitions) |
| **React 19** | 19.2.3 | State management, useEffect polling | Same — no changes needed |

### State Management (Progress Updates)

| Approach | Current Implementation | Assessment |
|----------|----------------------|------------|
| **Polling** | 3-second intervals via setInterval (import/page.tsx:38-67) | **KEEP** — Adequate for 30s flow, simpler than SSE |
| **Database-backed** | user_profiles.progress_percent + import_stage | **KEEP** — Works, no changes needed |
| **Client-side state** | useState for progress/stage | **KEEP** — React best practice |

## What NOT to Add

| Library/Approach | Why Skip | Reasoning |
|-----------------|----------|-----------|
| **SSE (Server-Sent Events)** | Overkill for 30s flow | Polling every 3s = 10 updates max. SSE adds complexity (connection management, reconnect logic, error handling) for minimal UX gain. Consider SSE if flow extends >2 minutes. |
| **react-spring** | Redundant with Framer Motion | Framer Motion already handles all animation needs. react-spring would add bundle size without new capabilities. |
| **lottie-react** | Too heavy for simple animations | 180KB for JSON-based animations. CSS + Framer Motion achieve same effects at <10KB. |
| **react-transition-group** | Replaced by Framer Motion | Framer Motion's AnimatePresence is more powerful and already used project-wide. |
| **zustand/redux** | State complexity not justified | Progress state is page-scoped, useState is sufficient. Global state would over-engineer simple polling. |

## Recommended Patterns (Using Existing Stack)

### 1. Stage-Based Animations with Framer Motion

**Pattern:** Animate stage icons and text with stagger effects
**Implementation:** Use `motion` components with variants

```tsx
const stageVariants = {
  waiting: { scale: 0.8, opacity: 0.3 },
  active: { scale: 1, opacity: 1, transition: { type: "spring", stiffness: 300 } },
  complete: { scale: 1.1, opacity: 1, transition: { type: "spring", stiffness: 400 } }
};

<motion.div variants={stageVariants} animate={stageState}>
  <CheckCircle />
</motion.div>
```

**Why:** Already using Framer Motion in import/page.tsx (line 316 AnimatePresence). Extends existing pattern.

### 2. Smooth Progress Bar with CSS Transitions

**Pattern:** Tailwind transition classes + motion.div for fluid progress
**Implementation:** Combine existing pattern (import/page.tsx:395) with easing

```tsx
<motion.div
  className="h-full bg-gradient-to-r from-orange-600 to-orange-400 rounded-full"
  animate={{ width: `${progress}%` }}
  transition={{ duration: 0.5, ease: "easeOut" }} // Smoother than current 0.3s
/>
```

**Why:** Already used (line 395). Just tune timing for stage-based updates (slower transitions = smoother perceived progress).

### 3. Stage Transitions with AnimatePresence

**Pattern:** Fade-slide transitions between stage screens
**Implementation:** Already working (line 316-426), replicate for sub-stages

```tsx
<AnimatePresence mode="wait">
  {currentStage === 'upload' && (
    <motion.div
      key="upload"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3 }}
    >
      {/* Stage content */}
    </motion.div>
  )}
</AnimatePresence>
```

**Why:** Pattern proven in production (import/page.tsx phase transitions).

### 4. Mobile-Optimized Animations

**Pattern:** Reduce animation complexity on mobile, respect prefers-reduced-motion
**Implementation:** Use existing mobile patterns + media query variants

```tsx
// Already using: h-[100dvh] (line 287), safe-area-inset-top (line 291)
// Add: Conditional animation durations
const isMobile = window.innerWidth < 768;
transition={{ duration: isMobile ? 0.2 : 0.4 }}
```

**Why:** Mobile performance already optimized (100dvh, safe-area). Extend to animations.

## Integration Strategy

### Polling Enhancement (No Library Changes)

**Current:** Poll every 3s, update progress_percent + import_stage (import/page.tsx:41-52)

**Enhancement for smooth stages:**
1. **Client-side interpolation:** Animate between polled values (Framer Motion handles)
2. **Stage detection:** Map import_stage string to stage enum → drive icon states
3. **Optimistic progress:** Show 5-10% increments between polls (prevent stalls)

**Example:**
```typescript
// Current polling (keep as-is)
const { data } = await supabase
  .from('user_profiles')
  .select('progress_percent, import_stage, import_status')
  .eq('user_id', userId)
  .single();

// Add: Stage mapping
const stageMap = {
  'Starting...': { stage: 'upload', minProgress: 0 },
  'Extracting conversations...': { stage: 'extract', minProgress: 10 },
  'Analyzing your conversations...': { stage: 'analyze', minProgress: 55 },
  'Done! Opening chat...': { stage: 'complete', minProgress: 100 }
};

// Framer Motion automatically smooths progress bar between updates
setProgress(data.progress_percent); // Animates from old → new
setStage(stageMap[data.import_stage]?.stage || 'processing');
```

### Chat Transition (No Library Changes)

**Current:** router.push('/chat') after completion (line 58)

**Enhancement:**
1. Add 800ms delay (already exists, line 58) — GOOD
2. Add exit animation to progress screen (AnimatePresence)
3. Prefetch /chat route during processing (Next.js feature)

**Example:**
```typescript
// Before redirect
router.prefetch('/chat'); // Preload during processing

// Smooth exit (already has 800ms delay)
setTimeout(() => router.push('/chat'), 800);
```

## Tailwind Animation Utilities (Already Available)

### Built-in Animations

| Class | Use Case | Already Used Where |
|-------|----------|-------------------|
| `animate-spin` | Loading spinners | import/page.tsx:282 (Loader2) |
| `animate-pulse` | Subtle breathing effects | background-beams.tsx:45 |
| `transition-all` | Smooth property changes | ring-progress.tsx:56 |
| `ease-out` | Progress bar easing | Recommended for progress bars |
| `duration-[X]` | Custom timing | Available, not yet used |

### Custom Animations via Tailwind Config

**Already configured:** tailwindcss-animate plugin (tailwind.config.ts:77)
**Provides:** accordion-down, accordion-up (lines 61-72)

**Can add:** Stage-specific keyframes if needed (e.g., bounce-in for checkmarks)

## Mobile Performance Considerations

### Current Optimizations (Keep)

1. **dvh units:** `h-[100dvh]` (import/page.tsx:280) — Handles iOS Safari viewport
2. **Safe area insets:** `pt-[calc(env(safe-area-inset-top,0px)+12px)]` (line 291) — Notch avoidance
3. **Client-side extraction limit:** 100MB threshold (line 143) — Prevents OOM crashes

### Animation Performance (Add)

1. **GPU acceleration:** Use `transform` and `opacity` (already doing, motion.div handles)
2. **Reduce motion:** Respect `prefers-reduced-motion` media query
3. **Frame budget:** Keep animations <16.67ms (60fps) — Framer Motion optimizes automatically

**Recommendation:** Add `prefers-reduced-motion` check:

```tsx
const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

<motion.div
  animate={{ opacity: 1 }}
  transition={{ duration: prefersReducedMotion ? 0 : 0.4 }}
/>
```

## Framer Motion Best Practices (Current + New)

### Already Following

| Best Practice | Implementation | File |
|--------------|----------------|------|
| AnimatePresence with mode="wait" | Phase transitions | import/page.tsx:316 |
| Key prop for list items | Phase switching | import/page.tsx:320, 354, 388, 408 |
| Exit animations | Opacity fade-outs | import/page.tsx:317 |

### Add for Stage Animations

| Best Practice | Implementation | Why |
|--------------|----------------|-----|
| **Variants** | Define stage states (waiting/active/complete) | Cleaner than inline props, reusable |
| **Layout animations** | `layout` prop for reordering stages | Smooth position changes if stages reorder |
| **Stagger children** | `staggerChildren` in parent variants | Sequential stage activation feels polished |
| **Spring physics** | `type: "spring"` for organic feel | Better than linear for icon pops |

**Example variants pattern:**
```tsx
const containerVariants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { staggerChildren: 0.1 }
  }
};

const itemVariants = {
  hidden: { opacity: 0, x: -20 },
  visible: { opacity: 1, x: 0 }
};

<motion.div variants={containerVariants} initial="hidden" animate="visible">
  {stages.map(stage => (
    <motion.div key={stage.id} variants={itemVariants}>
      {stage.content}
    </motion.div>
  ))}
</motion.div>
```

## Version Compatibility

| Package | Version | Compatible With | Notes |
|---------|---------|-----------------|-------|
| framer-motion | 12.29.2 | React 19.2.3 | ✅ Verified — React 19 support added in FM 11.x |
| motion | 12.29.2 | Same as framer-motion | ✅ Separate package, same version (line 49 package.json) |
| tailwindcss-animate | 1.0.7 | Tailwind 3.4.19 | ✅ Stable, no breaking changes expected |
| next | 16.1.5 | Framer Motion 12.x | ✅ App Router works (using in import/page.tsx:20) |

**No version upgrades needed.** All packages current and compatible.

## What Would Trigger SSE Addition

If these conditions emerge, reconsider SSE:

| Condition | Why SSE Becomes Valuable | Implementation Notes |
|-----------|-------------------------|---------------------|
| Import flow >2 minutes | Real-time feedback matters more | Use EventSource API, handle reconnects |
| Multi-step failures | Granular error states per stage | SSE events for stage-specific errors |
| Background processing UI | User closes tab, returns later | Persist connection state, resume on reconnect |
| Concurrent imports | Multiple users, progress differentiation | SSE channels per user |

**Current flow:** 30 seconds, single-user, foreground-only → **Polling sufficient**

## Sources

- **Framer Motion 12.x Docs** — Animation best practices, React 19 compatibility (motion.dev/docs)
- **Tailwind CSS 3.4 Docs** — Animation utilities, custom keyframes (tailwindcss.com/docs/animation)
- **Next.js 16 App Router** — Client component patterns, router.prefetch (nextjs.org/docs/app)
- **Codebase analysis** — package.json (existing versions), import/page.tsx (current patterns), ring-progress.tsx (animation usage)

**Confidence:** HIGH — All findings verified against installed package versions and working code patterns.

---
*Stack research for: Animated import progress UX milestone*
*Researched: 2026-02-11*
*Key takeaway: Use existing stack smarter, not bigger.*
