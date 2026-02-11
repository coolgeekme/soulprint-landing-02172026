# Architecture Research: Import Progress UX & Chat Transition

**Domain:** Animated multi-stage progress UI with SSE backend integration
**Researched:** 2026-02-11
**Confidence:** HIGH

## Executive Summary

This research covers how to integrate animated stage-based progress indicators with the existing SSE-like polling architecture and create smooth page transitions from import completion to chat. The existing system uses database polling (not true SSE streaming), so the architecture must map discrete database state updates to animated UI stages.

**Key Finding:** Current polling every 3s from `user_profiles.progress_percent` and `import_stage` provides sufficient granularity for stage-based animation. The challenge is mapping RLM's 3 backend stages (0-20% download, 20-50% parse, 50-100% soulprint) to 4-5 visually distinct frontend stages with smooth animations.

## Current Architecture

### Existing Data Flow

```
User uploads ZIP
    ↓
[app/import/page.tsx] TUS upload (10-50% local progress)
    ↓
POST /api/import/trigger → RLM /import-full
    ↓
[RLM streaming_import.py] Updates user_profiles:
    - progress_percent (0, 20, 50, 100)
    - import_stage ("Downloading export", "Parsing conversations", "Generating soulprint", "Complete")
    - import_status ("processing" → "quick_ready")
    ↓
[app/import/page.tsx] Polls every 3s via /api/memory/status
    ↓
Redirect to /chat when import_status = "quick_ready"
```

### Existing Progress Update Points

**RLM Backend (`rlm-service/processors/streaming_import.py`):**
```python
await update_progress(user_id, 0, "Downloading export")     # Stage 1
await update_progress(user_id, 20, "Parsing conversations") # Stage 2
await update_progress(user_id, 50, "Generating soulprint")  # Stage 3
# Sets progress_percent=100, import_stage="Complete", import_status="quick_ready"
```

**Frontend Polling (`app/import/page.tsx` lines 36-68):**
```typescript
pollRef.current = setInterval(async () => {
  const { data } = await supabase
    .from('user_profiles')
    .select('progress_percent, import_stage, import_status, import_error')
    .eq('user_id', userId)
    .single();

  setProgress(data.progress_percent || 0);
  setStage(data.import_stage || 'Processing...');

  if (data.import_status === 'quick_ready' || data.import_status === 'complete') {
    setProgress(100);
    setStage('Done! Opening chat...');
    setTimeout(() => router.push('/chat'), 800); // JARRING REDIRECT
  }
}, 3000);
```

### Problems with Current Implementation

1. **Percentage jumping:** Frontend manually sets progress ranges (10-50% for upload, 55% post-trigger) that don't align with backend percentages (0, 20, 50, 100)
2. **Stage text stalls:** Backend only updates at 3 discrete points (0%, 20%, 50%), frontend shows same stage text for long periods
3. **Jarring redirect:** 800ms setTimeout then hard navigation to /chat with no transition animation
4. **No visual stage progression:** Uses single RingProgress + text, no multi-step indicator showing "Extract → Parse → Analyze → Done"

## Recommended Architecture

### Stage-Based Progress Model

Map backend progress to 5 distinct visual stages with animations:

```
Stage 1: Uploading (0-30%)
  - Frontend: TUS upload progress bar
  - Animation: File icon → Server icon with transfer animation
  - Backend milestone: None (client-side only)

Stage 2: Extracting (30-40%)
  - Frontend: Extraction animation (ZIP → JSON)
  - Animation: Archive icon opens, documents fly out
  - Backend milestone: progress_percent=0-20, import_stage="Downloading export"

Stage 3: Parsing (40-60%)
  - Frontend: Parsing animation (scrolling text/data visualization)
  - Animation: Documents → structured data grid
  - Backend milestone: progress_percent=20, import_stage="Parsing conversations"

Stage 4: Building Profile (60-95%)
  - Frontend: AI generation animation (particles/neural network)
  - Animation: Data points connect to form profile shape
  - Backend milestone: progress_percent=50, import_stage="Generating soulprint"

Stage 5: Complete (95-100%)
  - Frontend: Success checkmark animation + fade-to-chat transition
  - Animation: Checkmark expands, page fades/slides to chat
  - Backend milestone: progress_percent=100, import_status="quick_ready"
```

### Component Architecture

```
app/import/page.tsx
├── <AnimatedProgressStages />   (NEW)
│   ├── <StageIndicator stage={currentStage} />
│   ├── <StageAnimation stage={currentStage} />
│   └── <ProgressBar percent={mappedPercent} />
└── <PageTransition />           (NEW - wraps entire app)
    └── Framer Motion AnimatePresence

components/import/
├── animated-progress-stages.tsx  (NEW - main progress component)
├── stage-indicator.tsx           (NEW - stepper-style stage display)
├── stage-animations.tsx          (NEW - Lottie or Framer animations per stage)
└── page-transition.tsx           (NEW - fade/slide transition wrapper)
```

### Data Flow Changes

#### 1. Progress Mapping Function

```typescript
// lib/import/progress-mapper.ts (NEW)
export function mapBackendProgressToStage(
  backendPercent: number,
  backendStage: string,
  uploadPercent?: number
): { stage: number; percent: number; animation: string } {

  // Stage 1: Uploading (0-30%)
  if (!uploadPercent || uploadPercent < 100) {
    return {
      stage: 1,
      percent: (uploadPercent || 0) * 0.3, // Map 0-100 upload to 0-30%
      animation: 'uploading'
    };
  }

  // Stage 2: Extracting (30-40%)
  if (backendPercent < 20) {
    return {
      stage: 2,
      percent: 30 + (backendPercent / 20) * 10, // Map 0-20 to 30-40%
      animation: 'extracting'
    };
  }

  // Stage 3: Parsing (40-60%)
  if (backendPercent < 50) {
    return {
      stage: 3,
      percent: 40 + ((backendPercent - 20) / 30) * 20, // Map 20-50 to 40-60%
      animation: 'parsing'
    };
  }

  // Stage 4: Building Profile (60-95%)
  if (backendPercent < 100) {
    return {
      stage: 4,
      percent: 60 + ((backendPercent - 50) / 50) * 35, // Map 50-100 to 60-95%
      animation: 'building'
    };
  }

  // Stage 5: Complete (95-100%)
  return {
    stage: 5,
    percent: 100,
    animation: 'complete'
  };
}
```

#### 2. Smooth Transition Handler

```typescript
// lib/import/transition.ts (NEW)
export async function transitionToChat(router: NextRouter) {
  // Phase 1: Completion animation (500ms)
  await animateCompletion();

  // Phase 2: Pre-fetch chat data (parallel with animation)
  const prefetchPromise = router.prefetch('/chat');

  // Phase 3: Fade-out current page (300ms)
  await fadeOut();

  // Phase 4: Navigate (will trigger page transition animation)
  await prefetchPromise;
  router.push('/chat');

  // Phase 5: AnimatePresence in app/template.tsx handles fade-in
}
```

### Integration Points

#### Modified Files

| File | Changes | Lines Affected |
|------|---------|---------------|
| `app/import/page.tsx` | Replace RingProgress with AnimatedProgressStages, replace setTimeout redirect with transitionToChat | ~50-100 lines modified |
| `app/layout.tsx` | Add PageTransitionProvider wrapper | ~5 lines added |
| Database schema | NO CHANGES (progress_percent, import_stage already exist) | 0 |

#### New Files

| File | Purpose | Complexity |
|------|---------|------------|
| `components/import/animated-progress-stages.tsx` | Main animated progress component with stage mapping | Medium (150-200 lines) |
| `components/import/stage-indicator.tsx` | Visual stepper showing 5 stages | Low (50-80 lines, uses existing Stepper component) |
| `components/import/stage-animations.tsx` | Framer Motion animations for each stage | Medium (100-150 lines) |
| `components/ui/page-transition.tsx` | Reusable page transition wrapper | Low (40-60 lines) |
| `lib/import/progress-mapper.ts` | Progress mapping logic | Low (80-100 lines) |
| `lib/import/transition.ts` | Smooth transition orchestration | Low (50-70 lines) |
| `app/template.tsx` | Next.js App Router template for page transitions | Low (20-30 lines) |

### Page Transition Architecture

**Using Next.js App Router template.tsx pattern:**

```typescript
// app/template.tsx (NEW)
'use client';

import { motion } from 'framer-motion';

export default function Template({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -20 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
    >
      {children}
    </motion.div>
  );
}
```

**Why template.tsx over _app.tsx + AnimatePresence:**
- Next.js 13+ App Router automatically remounts template.tsx on navigation
- Simpler than Pages Router AnimatePresence pattern
- No need to track route changes manually
- Works natively with router.push()

### Animation Library Choice

**Recommendation: Framer Motion (already installed)**

**Pros:**
- Already used in project (`app/import/page.tsx` line 6)
- Excellent React integration
- Built-in spring physics for natural motion
- AnimatePresence for enter/exit transitions
- Small bundle size (~30kb)

**Cons:**
- Limited pre-built animations (need custom keyframes)

**Alternative: Lottie + Framer Motion hybrid**
- Use Lottie for complex stage animations (file upload, data parsing visuals)
- Use Framer Motion for transitions and simple animations
- Requires additional dependency (`lottie-react` ~50kb)

**Verdict:** Start with Framer Motion only, add Lottie later if custom animations are too complex.

## Architectural Patterns

### Pattern 1: Progress State Machine

**What:** Treat progress as a finite state machine with defined states and transitions.

**States:**
```typescript
type ProgressState =
  | { stage: 'uploading'; percent: 0-30 }
  | { stage: 'extracting'; percent: 30-40 }
  | { stage: 'parsing'; percent: 40-60 }
  | { stage: 'building'; percent: 60-95 }
  | { stage: 'complete'; percent: 95-100 };
```

**Transitions:**
- Only move forward (no backward transitions)
- Automatic transition when backend milestone reached
- Smooth animation between states (300ms ease-out)

**Trade-offs:**
- **Pro:** Clear state model, easy to reason about
- **Pro:** Prevents UI bugs (can't go from "complete" to "parsing")
- **Con:** Less flexible if backend adds stages later

### Pattern 2: Optimistic Progress Animation

**What:** Animate progress smoothly between known milestones instead of jumping.

**Implementation:**
```typescript
// When backend says 50%, but UI is at 45%
// Animate from 45% → 50% over 500ms instead of instant jump
const [displayPercent, setDisplayPercent] = useState(0);

useEffect(() => {
  const duration = 500;
  const steps = 60;
  const increment = (backendPercent - displayPercent) / steps;

  const interval = setInterval(() => {
    setDisplayPercent(prev => {
      const next = prev + increment;
      if (next >= backendPercent) {
        clearInterval(interval);
        return backendPercent;
      }
      return next;
    });
  }, duration / steps);
}, [backendPercent]);
```

**Trade-offs:**
- **Pro:** Smooth, polished UX (no jumpy progress bars)
- **Pro:** Masks backend update latency (3s polling)
- **Con:** Displayed progress lags real progress by up to 500ms
- **Con:** More complex state management

### Pattern 3: Prefetch + Transition Orchestration

**What:** Overlap page prefetching with exit animation to reduce perceived transition time.

**Sequence:**
```
User reaches 100%
    ↓
┌───────────────────────────────────┐
│  Completion Animation (500ms)     │ ← User sees success
└───────────────────────────────────┘
    ↓
┌───────────────────────────────────┐
│  Prefetch /chat (parallel)        │ ← Background data load
│  Fade Out (300ms)                 │ ← Smooth exit
└───────────────────────────────────┘
    ↓
router.push('/chat') ← Instant because prefetched
    ↓
┌───────────────────────────────────┐
│  Fade In via template.tsx (300ms) │ ← Smooth entrance
└───────────────────────────────────┘
```

**Trade-offs:**
- **Pro:** Perceived instant transition (animation masks loading)
- **Pro:** No blank screens or loading spinners
- **Con:** Consumes bandwidth prefetching (minimal for chat page)

## Data Flow: Before vs After

### Before (Current Implementation)

```
Backend: 0% → 20% → 50% → 100%
Frontend: 0% → 10% (upload) → 55% (trigger) → 0% (poll) → 100% (poll)
         ↑ Percentage jumps backward!

Stage text: "Processing..." (stuck for 30s+)

Redirect: setTimeout 800ms → router.push('/chat')
         ↑ Hard navigation, no transition
```

### After (Proposed)

```
Backend: 0% → 20% → 50% → 100%
Frontend: 0% (upload) → 30% (extract) → 40% (parse start) → 60% (build start) → 100%
         ↑ Smooth mapping, always increasing

Stage indicator:
  1. Upload ✓
  2. Extract ✓
  3. Parse ✓
  4. Build (in progress)
  5. Complete

Transition:
  Complete animation (500ms)
  → Fade out (300ms)
  → router.push('/chat')
  → template.tsx fade in (300ms)
  Total: 1100ms smooth transition vs 800ms jarring jump
```

## Scaling Considerations

| Scale | Considerations |
|-------|---------------|
| 0-1k users | Current architecture fine (3s polling acceptable) |
| 1k-10k users | Consider true SSE streaming to reduce polling load |
| 10k+ users | Move to WebSocket or server-push for real-time updates |

**Current bottleneck:** Database polling every 3s per user during import. With 100 concurrent imports = 33 queries/second to Supabase.

**Mitigation (if needed):**
- Increase poll interval to 5s (reduces QPS by 40%)
- Add Redis cache for progress state (current value cached 2s)
- Switch to true SSE streaming (RLM can stream progress events)

**Verdict:** Current polling architecture sufficient for MVP. Optimize only if seeing 100+ concurrent imports.

## Anti-Patterns

### Anti-Pattern 1: Percentage Mismatch

**What people do:** Frontend manually maps progress without coordinating with backend stages.

**Why it's wrong:** Causes percentage to jump backward (current bug: 55% trigger → 0% poll).

**Do this instead:** Single source of truth for progress mapping. Backend owns milestones, frontend maps display percentage from backend values only.

### Anti-Pattern 2: Instant Redirects

**What people do:** `router.push('/chat')` immediately when import completes.

**Why it's wrong:** Jarring UX, no visual confirmation of success, no smooth transition.

**Do this instead:** Animate success state (500ms) → prefetch destination → fade out → navigate → fade in via template.

### Anti-Pattern 3: Animation During Data Loading

**What people do:** Start page transition animation while chat data still loading.

**Why it's wrong:** Animation completes but page shows loading spinner (feels broken).

**Do this instead:** Prefetch data during exit animation, only navigate once prefetch completes.

### Anti-Pattern 4: Overusing Stepper Component for Progress

**What people do:** Use `components/ui/stepper.tsx` (1000+ lines) directly for import progress.

**Why it's wrong:** Stepper is for multi-step forms (user controls), not automated progress (system controls).

**Do this instead:** Build custom stage indicator inspired by Stepper visuals but optimized for automated progression.

## Implementation Recommendations

### Build Order (Dependency-Based)

1. **lib/import/progress-mapper.ts** (no dependencies)
   - Pure function mapping backend → frontend progress
   - Unit testable
   - Approx 80 lines

2. **components/import/stage-indicator.tsx** (depends on: progress-mapper)
   - Visual stepper showing 5 stages
   - Uses existing UI components (cn, badge)
   - Approx 80 lines

3. **components/import/stage-animations.tsx** (no dependencies)
   - Framer Motion animations per stage
   - Can start with simple opacity/scale, enhance later
   - Approx 150 lines

4. **components/import/animated-progress-stages.tsx** (depends on: all above)
   - Combines stage-indicator + stage-animations + progress bar
   - Main integration component
   - Approx 200 lines

5. **app/template.tsx** (no dependencies)
   - Simple Framer Motion wrapper
   - Approx 25 lines

6. **lib/import/transition.ts** (depends on: template.tsx)
   - Transition orchestration logic
   - Approx 70 lines

7. **app/import/page.tsx modifications** (depends on: all above)
   - Replace RingProgress with AnimatedProgressStages
   - Replace setTimeout with transitionToChat
   - Approx 50 lines changed, 30 lines removed

### Testing Strategy

**Unit tests:**
- `progress-mapper.ts`: Test all stage boundaries (0%, 20%, 50%, 100%)
- `transition.ts`: Mock router, verify prefetch called before navigate

**Integration tests:**
- Mock backend progress updates, verify stage transitions
- Verify animations don't block navigation
- Test backward compatibility (what if backend skips milestone?)

**Manual QA:**
- Upload small file (<10MB) - stages should change quickly
- Upload large file (>100MB) - verify smooth progress, no jumps
- Verify transition feels smooth (not jarring)

## Sources

- [Real-Time UI Updates with SSE: Simpler Than WebSockets](https://www.codingwithmuhib.com/blogs/real-time-ui-updates-with-sse-simpler-than-websockets)
- [Progress Trackers and Indicators – With 6 Examples To Do It Right](https://userguiding.com/blog/progress-trackers-and-indicators)
- [Motion UI Trends 2026: Interactive Design & Examples](https://lomatechnology.com/blog/motion-ui-trends-2026/2911)
- [How to Make Creative Page Transitions using Next.js and Framer Motion](https://blog.olivierlarose.com/articles/nextjs-page-transition-guide)
- [Solving Framer Motion Page Transitions in Next.js App Router](https://www.imcorfitz.com/posts/adding-framer-motion-page-transitions-to-next-js-app-router)
- [The Complete Guide to React Step Progress Bars in 2026](https://copyprogramming.com/howto/react-step-progress-bar-line)
- Existing codebase analysis: `app/import/page.tsx`, `rlm-service/processors/streaming_import.py`, `components/ui/stepper.tsx`

---
*Architecture research for: Import Progress UX & Chat Transition*
*Researched: 2026-02-11*
