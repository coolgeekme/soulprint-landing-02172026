# Phase 3: UX Enhancement - Progress and Error Clarity - Research

**Researched:** 2026-02-09
**Domain:** React polling UX, error message classification, mobile upload reliability, background tab handling
**Confidence:** HIGH

## Summary

Phase 3 enhances the import flow user experience across three requirements: real processing stage progress (UXP-01), actionable error messages (UXP-02), and cross-device import reliability (UXP-03). The codebase already has the core infrastructure in place -- RLM writes `progress_percent` and `import_stage` to `user_profiles`, the frontend polls every 2 seconds, and the `RingProgress` SVG component exists but is imported and unused in the processing step. The primary work is **frontend refinement**, not backend architecture.

Research reveals three critical gaps in the current implementation:
1. **Progress UI is a generic spinner** -- the processing step shows `<Loader2 className="animate-spin" />` instead of the existing `RingProgress` component with real percentage, and stage text is displayed but not visually distinguished by stage
2. **Error messages are partially actionable** -- the client-side `processFile` function maps some errors (network, timeout, format) but many server/RLM errors arrive as raw technical strings stored in `import_error`
3. **Background tab polling degrades** -- Chrome throttles `setInterval` to once per minute after 5 minutes in background, meaning users who tab away during 3-5 minute imports see stale progress; Page Visibility API should adjust polling frequency

**Primary recommendation:** Replace the spinner-based processing UI with stage-aware progress (using existing `RingProgress` + `import_stage` data), create an error classification layer that maps raw errors to user-friendly messages with actionable next steps, and add Visibility API-aware polling that recovers immediately when the tab becomes visible.

## Standard Stack

No new libraries needed. Everything required is already in the project.

### Core (Already Installed)
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| framer-motion | ^12.29.2 | AnimatePresence for step transitions, motion.div for progress animations | Already used throughout import page |
| lucide-react | ^0.563.0 | Icons for error states, stage indicators | Already used for Upload, Shield, AlertCircle etc. |
| @supabase/supabase-js | ^2.93.1 | Direct DB polling for progress_percent and import_stage | Already used for auth and polling |
| RingProgress | custom | SVG ring progress with percentage display | Already imported in import page but unused in processing step |

### Supporting (Already Available)
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| zod | ^4.3.6 | Validate error response shapes from API | Already used for schema validation |
| Page Visibility API | browser native | Detect background tab state | Adjust polling frequency when tab hidden/visible |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| setInterval polling | Supabase Realtime subscriptions | More complex, requires Realtime channel setup, polling already works and is explicitly scoped |
| Page Visibility API | Web Worker for polling | Over-engineered -- Visibility API detection + immediate poll on focus is sufficient |
| Custom error mapping | react-hot-toast / sonner | Adding a toast library for one page is overkill; inline error display matches existing design |

**Installation:**
```bash
# No new packages needed -- all dependencies already installed
```

## Architecture Patterns

### Current File Structure (Relevant Files)
```
app/
  import/page.tsx              # Frontend upload + progress UI (MAIN CHANGE TARGET)
  api/
    import/trigger/route.ts    # Thin proxy, sets initial import_stage
    memory/status/route.ts     # Status endpoint used by chat page
components/ui/
  ring-progress.tsx            # Existing SVG ring progress (unused in processing step)
  background-beams.tsx         # Decorative background
lib/
  api/error-handler.ts         # Server-side error handler (generic)
  api/schemas.ts               # Zod schemas
rlm-service/
  processors/streaming_import.py  # RLM progress updates (update_progress function)
```

### Pattern 1: Stage-Aware Progress Display
**What:** Map `import_stage` strings from RLM to visual stage indicators with descriptions
**When to use:** Processing step of import flow
**How it works:**
- RLM writes these stages: `"Starting..."` (Vercel trigger), `"Downloading export"` (0%), `"Parsing conversations"` (20%), `"Generating soulprint"` (50%), `"Complete"` (100%)
- Frontend maps each `import_stage` string to an icon, description, and color
- `RingProgress` component shows `progress_percent` with animated transitions
- Stage list shows completed/current/upcoming stages

```typescript
// Stage configuration based on actual RLM import_stage values
const IMPORT_STAGES = [
  { key: 'downloading', match: /download/i, label: 'Downloading your export', icon: Download, threshold: 0 },
  { key: 'parsing', match: /pars/i, label: 'Reading conversations', icon: FileArchive, threshold: 20 },
  { key: 'generating', match: /generat|soulprint/i, label: 'Building your profile', icon: Loader2, threshold: 50 },
  { key: 'complete', match: /complete/i, label: 'Analysis complete!', icon: CheckCircle2, threshold: 100 },
] as const;

function getCurrentStage(importStage: string): typeof IMPORT_STAGES[number] {
  return IMPORT_STAGES.find(s => s.match.test(importStage)) ?? IMPORT_STAGES[0];
}
```

### Pattern 2: Error Classification Layer
**What:** Map raw `import_error` strings to user-friendly messages with specific actions
**When to use:** When `import_status === 'failed'` during polling or on page load
**How it works:**
- Client receives raw `import_error` from DB poll or `/api/memory/status`
- Classification function matches error patterns to categories
- Each category has a user-facing title, message, and specific action

```typescript
interface ClassifiedError {
  title: string;       // Short heading: "File too large"
  message: string;     // Explanation: "Your export is 2.3GB..."
  action: string;      // What to do: "Try from a desktop browser"
  canRetry: boolean;   // Show retry button?
  severity: 'warning' | 'error';
}

function classifyImportError(rawError: string): ClassifiedError {
  const lower = rawError.toLowerCase();

  if (lower.includes('no conversations') || lower.includes('empty'))
    return { title: 'Empty export', message: 'No conversations were found in your file.', action: 'Make sure you have ChatGPT history before exporting.', canRetry: false, severity: 'error' };

  if (lower.includes('json') || lower.includes('format') || lower.includes("doesn't look like"))
    return { title: 'Wrong file format', message: 'This file is not a valid ChatGPT export.', action: 'Go to ChatGPT Settings > Data Controls > Export Data, then upload the ZIP file you receive by email.', canRetry: false, severity: 'error' };

  if (lower.includes('download') || lower.includes('storage'))
    return { title: 'Download failed', message: 'We could not retrieve your uploaded file.', action: 'Please try uploading again.', canRetry: true, severity: 'error' };

  if (lower.includes('rlm error') || lower.includes('quick pass'))
    return { title: 'Processing error', message: 'Our analysis service encountered an issue.', action: 'This is usually temporary. Please try again in a few minutes.', canRetry: true, severity: 'error' };

  if (lower.includes('network') || lower.includes('fetch') || lower.includes('timeout'))
    return { title: 'Connection issue', message: 'The connection was interrupted during processing.', action: 'Check your internet connection and try again.', canRetry: true, severity: 'warning' };

  // Default: pass through but wrap in friendly framing
  return { title: 'Something went wrong', message: rawError, action: 'Please try again. If the problem persists, contact support.', canRetry: true, severity: 'error' };
}
```

### Pattern 3: Visibility-Aware Polling
**What:** Adjust polling frequency based on tab visibility, immediate poll on tab focus
**When to use:** During import processing polling (2s interval)
**Why needed:** Chrome throttles `setInterval` to once per minute after 5 minutes in a background tab (Chrome 88+). When user returns to tab, they see stale progress.

```typescript
// Use Page Visibility API to handle background tabs
useEffect(() => {
  const handleVisibilityChange = () => {
    if (document.visibilityState === 'visible' && progressIntervalRef.current) {
      // Immediately poll when tab becomes visible
      pollProgress();
    }
  };

  document.addEventListener('visibilitychange', handleVisibilityChange);
  return () => document.removeEventListener('visibilitychange', handleVisibilityChange);
}, []);
```

### Pattern 4: Returning User Progress Recovery
**What:** When user closes browser and returns, detect in-progress import and resume progress UI
**When to use:** On import page load (already partially implemented in `checkExisting`)
**Current state:** The `checkExisting` useEffect already handles `data.status === 'processing'` and starts polling. But it hardcodes `setProgress(60)` and a generic stage message instead of reading real values from the database.

```typescript
// CURRENT (hardcoded):
if (data.status === 'processing') {
  setCurrentStep('processing');
  setStatus('processing');
  setProgress(60);  // <-- Hardcoded, not real
  setProgressStage('Processing your conversations...');  // <-- Generic, not real

// SHOULD BE (read from DB):
if (data.status === 'processing') {
  setCurrentStep('processing');
  setStatus('processing');
  // Read real values from user_profiles (need to add to /api/memory/status response)
  setProgress(data.progress_percent ?? 0);
  setProgressStage(data.import_stage ?? 'Processing...');
```

### Anti-Patterns to Avoid
- **Fake progress animations:** Never animate progress that isn't real. The user must see actual stage transitions from the database, not a CSS animation that pretends to move forward.
- **Swallowing error details:** The classification layer must preserve the raw error for logging/debugging while showing the user-friendly version. Never discard the original error.
- **Polling without cleanup:** Every `setInterval` must have corresponding `clearInterval` in cleanup. Use refs (already done correctly in current code).
- **Blocking mobile users unnecessarily:** The 200MB file size warning for mobile is appropriate, but it should be a warning, not a hard block (current code correctly uses `return` -- this should become a non-blocking warning).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Progress ring visualization | Custom canvas/SVG drawing | Existing `RingProgress` component | Already built, tested, matches design system |
| Animated step transitions | Manual CSS transitions | framer-motion `AnimatePresence` + `motion.div` | Already used in import page, handles mount/unmount cleanly |
| Background tab detection | Custom focus/blur listeners | `document.visibilityState` + `visibilitychange` event | Standard browser API, more reliable than focus/blur |
| Icon library | Custom SVG icons | lucide-react (already installed) | Consistent icon set, already used throughout |
| Error toast/banner | Third-party toast library | Inline error display matching existing pattern | Import page already has error display pattern, adding toast lib for one page is overkill |

**Key insight:** This phase is purely frontend refinement. All the backend infrastructure (progress columns, RLM stage updates, polling mechanism) already exists. The work is making the existing data visible to users in a clear, helpful way.

## Common Pitfalls

### Pitfall 1: Hardcoded Progress Values for Returning Users
**What goes wrong:** User closes browser during import, returns later, sees progress stuck at 60% even though import is at 95%
**Why it happens:** Current `checkExisting` hardcodes `setProgress(60)` instead of reading real `progress_percent` from the database
**How to avoid:** Add `progress_percent` and `import_stage` to the `/api/memory/status` response. Read and display real values on page load.
**Warning signs:** Users report "progress seems stuck" after returning to the tab

### Pitfall 2: Chrome Background Tab Timer Throttling
**What goes wrong:** User switches to another tab during 3-5 minute import, progress appears frozen when they return
**Why it happens:** Chrome 88+ throttles `setInterval` to once per minute for tabs inactive >5 minutes. The 2-second polling interval becomes 60-second polling.
**How to avoid:** Add `visibilitychange` event listener that immediately polls on tab focus. The throttled interval handles background updates (once per minute is fine for background), and immediate poll on visibility ensures fresh data when user looks.
**Warning signs:** Users manually refresh the page to see current progress

### Pitfall 3: Generic "Something went wrong" for All Errors
**What goes wrong:** User gets unhelpful error, has no idea what to do, abandons the import
**Why it happens:** Current error display wraps all errors in a generic "Something went wrong" heading (line 858 of import page)
**How to avoid:** Classify errors into categories with specific titles, explanations, and next-step actions
**Warning signs:** Support requests saying "it says something went wrong but I don't know what"

### Pitfall 4: Error Banner Already Showing "Something went wrong" Title
**What goes wrong:** The error banner (line 659) shows "Something went wrong" as the heading regardless of error type, even when the error message itself is descriptive
**Why it happens:** The banner has a hardcoded `<p className="text-red-400 text-sm font-medium">Something went wrong</p>` title
**How to avoid:** Use the classified error's title instead of hardcoded text
**Warning signs:** Error details are present but the heading makes every error look the same

### Pitfall 5: Mobile File Size Warning Blocks Import
**What goes wrong:** Mobile user with a 250MB export sees error and thinks they can't import
**Why it happens:** Current code returns early (line 308: `return;`) for mobile files >200MB, effectively blocking the import
**How to avoid:** Show a warning but let the user proceed. The upload path for mobile (full ZIP) works -- it's just slower. Only block for truly impossible sizes (>2GB, which is the chunked upload threshold).
**Warning signs:** Mobile users can't import their ChatGPT exports even though the system can handle them

### Pitfall 6: Processing Step Shows Spinner Instead of Ring Progress
**What goes wrong:** User sees a generic spinning icon instead of actual progress percentage
**Why it happens:** The processing step renders `<Loader2 className="animate-spin" />` (line 881) instead of the `RingProgress` component that's imported but unused
**How to avoid:** Replace the Loader2 spinner with `RingProgress` showing `progress_percent` from polling
**Warning signs:** Users have no sense of how far along processing is

## Code Examples

### Example 1: Enhanced Processing Step UI
```tsx
// Replace the current processing step (line 870-908) with stage-aware progress
{currentStep === 'processing' && status !== 'error' && (
  <motion.div
    key="processing"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="w-full max-w-md flex flex-col justify-center text-center"
  >
    {/* Ring progress with real percentage */}
    <div className="mb-4 flex flex-col items-center">
      <RingProgress
        progress={progress}
        size={80}
        strokeWidth={6}
        showPercentage={true}
      />
    </div>

    {/* Stage-specific heading */}
    <h2 className="text-lg font-bold text-white mb-1">
      {getCurrentStage(progressStage).label}
    </h2>

    {/* Stage indicator dots */}
    <div className="flex items-center justify-center gap-3 mt-4">
      {IMPORT_STAGES.slice(0, -1).map((stage, i) => {
        const isComplete = progress >= (IMPORT_STAGES[i + 1]?.threshold ?? 100);
        const isCurrent = !isComplete && progress >= stage.threshold;
        return (
          <div key={stage.key} className="flex items-center gap-3">
            <div className={`w-2.5 h-2.5 rounded-full transition-colors ${
              isComplete ? 'bg-green-500' :
              isCurrent ? 'bg-orange-500 animate-pulse' :
              'bg-white/20'
            }`} />
            {i < IMPORT_STAGES.length - 2 && (
              <div className={`w-6 h-0.5 ${isComplete ? 'bg-green-500' : 'bg-white/10'}`} />
            )}
          </div>
        );
      })}
    </div>

    {/* Safe to close message (only after upload complete) */}
    {progress >= 55 ? (
      <p className="text-green-400/80 text-xs mt-4">
        Safe to close this tab -- we'll finish processing in the background
      </p>
    ) : (
      <p className="text-orange-400/80 text-xs mt-4">
        Please keep this tab open until upload completes
      </p>
    )}
  </motion.div>
)}
```

### Example 2: Enhanced Error Display
```tsx
// Replace the error state (line 846-867)
{status === 'error' && (
  <motion.div
    key="error"
    initial={{ opacity: 0, scale: 0.95 }}
    animate={{ opacity: 1, scale: 1 }}
    exit={{ opacity: 0, scale: 0.95 }}
    className="w-full max-w-sm flex flex-col justify-center text-center"
  >
    {(() => {
      const classified = classifyImportError(errorMessage);
      return (
        <>
          <div className={`w-12 h-12 rounded-full flex items-center justify-center mx-auto mb-3 ${
            classified.severity === 'warning' ? 'bg-yellow-500/15' : 'bg-red-500/15'
          }`}>
            <AlertCircle className={`w-6 h-6 ${
              classified.severity === 'warning' ? 'text-yellow-500' : 'text-red-500'
            }`} />
          </div>
          <h2 className="text-lg font-bold text-white mb-1">{classified.title}</h2>
          <p className="text-white/60 text-sm mb-2">{classified.message}</p>
          <p className="text-white/40 text-xs mb-4">{classified.action}</p>
          {classified.canRetry && (
            <Button
              onClick={handleRetry}
              variant="outline"
              className="border-white/20 text-white hover:bg-white/10"
            >
              Try Again
            </Button>
          )}
        </>
      );
    })()}
  </motion.div>
)}
```

### Example 3: Visibility-Aware Polling Setup
```typescript
// Add to processFile function, after setting up the polling interval
const pollProgress = async () => {
  try {
    const { data, error } = await supabase
      .from('user_profiles')
      .select('progress_percent, import_stage, import_status, import_error')
      .eq('user_id', user.id)
      .single();

    if (error || !data) return;

    setProgress(data.progress_percent || 0);
    setProgressStage(data.import_stage || 'Processing...');

    if (data.import_status === 'quick_ready' || data.import_status === 'complete') {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setProgress(100);
      setProgressStage('Analysis complete! Opening chat...');
      await new Promise(r => setTimeout(r, 800));
      router.push('/chat');
    } else if (data.import_status === 'failed') {
      if (progressIntervalRef.current) {
        clearInterval(progressIntervalRef.current);
        progressIntervalRef.current = null;
      }
      setErrorMessage(data.import_error || 'Import failed');
      setStatus('error');
    }
  } catch (e) {
    console.error('[Import] Progress polling error:', e);
  }
};

// Visibility change handler for immediate refresh
const handleVisibilityChange = () => {
  if (document.visibilityState === 'visible') {
    pollProgress(); // Immediate poll when tab becomes visible
  }
};
document.addEventListener('visibilitychange', handleVisibilityChange);
```

### Example 4: Memory Status API Enhancement
```typescript
// Add progress_percent and import_stage to /api/memory/status response
// In app/api/memory/status/route.ts, add to the select query:
const { data: profile } = await supabase
  .from('user_profiles')
  .select('import_status, import_error, processing_started_at, progress_percent, import_stage, ...')
  .eq('user_id', user.id)
  .single();

// Add to response JSON:
return NextResponse.json({
  status,
  // ... existing fields ...
  progress_percent: profile?.progress_percent ?? 0,
  import_stage: profile?.import_stage ?? null,
});
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Generic spinner for all processing | Stage-aware progress with RingProgress | This phase | User sees real progress and knows what's happening |
| "Something went wrong" for all errors | Classified errors with actionable guidance | This phase | User knows what went wrong and what to do |
| Fixed 2s polling regardless of tab state | Visibility-aware polling with immediate refresh | This phase | Progress stays current even after tab switch |
| Hardcoded progress on page return | Real progress from DB on page load | This phase | Returning user sees actual import state |
| Hard block for mobile 200MB+ files | Warning with option to proceed | This phase | Mobile users can import large exports |

## Open Questions

1. **RLM stage granularity during "Generating soulprint" (50-100%)**
   - What we know: RLM updates progress at 0%, 20%, 50%, 100% (4 discrete updates)
   - What's unclear: Whether we can add sub-stage updates (e.g., 60%, 70%, 80%) during quick pass generation
   - Recommendation: Accept the current 4-stage granularity for this phase. The RingProgress component smoothly animates between values, so jumps from 50% to 100% will look fine with `transition: duration-500`. Adding more granular updates to RLM is a separate concern.

2. **Email notification on completion**
   - What we know: CLAUDE.md mentions email notification and `lib/email/send.ts` exists
   - What's unclear: Whether email notification is in scope for this phase or a separate concern
   - Recommendation: Out of scope for Phase 3 unless explicitly requested. The success criteria focus on in-app UX, not email.

3. **Chat page import_status gate behavior**
   - What we know: Chat page redirects to /import if `status === 'processing'` (line 231)
   - What's unclear: Whether this redirect should also happen for `quick_ready` (user has soulprint but full pass still running)
   - Recommendation: Keep current behavior -- `quick_ready` is treated as `ready` in memory status API, so user can chat while full pass runs in background.

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `app/import/page.tsx`, `app/chat/page.tsx`, `app/api/import/trigger/route.ts`, `app/api/memory/status/route.ts`, `rlm-service/processors/streaming_import.py`, `rlm-service/main.py`, `components/ui/ring-progress.tsx`, `lib/api/error-handler.ts`
- Phase 1 research: `.planning/phases/01-core-migration/01-RESEARCH.md` -- confirmed architecture patterns
- Phase 1 plan: `.planning/phases/01-core-migration/01-04-PLAN.md` -- confirmed polling pattern decisions

### Secondary (MEDIUM confidence)
- [Chrome timer throttling (Chrome 88+)](https://developer.chrome.com/blog/timer-throttling-in-chrome-88) -- Background tab setInterval throttling details
- [Overcoming browser throttling of setInterval](https://medium.com/@adithyaviswam/overcoming-browser-throttling-of-setinterval-executions-45387853a826) -- Web Worker and Visibility API workarounds
- [Background Fetch API - MDN](https://developer.mozilla.org/en-US/docs/Web/API/Background_Fetch_API) -- Not applicable here but confirms browser limitations
- [Error message UX patterns - NN/g](https://www.nngroup.com/articles/error-message-guidelines/) -- Actionable error message guidelines
- [How to write error messages - UX Content Collective](https://uxcontent.com/how-to-write-error-messages/) -- Error message writing best practices

### Tertiary (LOW confidence)
- [iOS Safari large file upload issues](https://discussions.apple.com/thread/613542) -- Historical Safari upload crash reports, may be resolved in iOS 18+
- [Apple Developer Forums - XHR file uploads](https://developer.apple.com/forums/thread/11997) -- Mobile Safari XHR limitations, older discussion

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH -- No new libraries needed, all components already exist in codebase
- Architecture: HIGH -- Patterns verified against existing code, RLM stage values confirmed from streaming_import.py
- Pitfalls: HIGH -- All pitfalls identified from direct codebase analysis (hardcoded values, missing data, throttling)
- Error classification: MEDIUM -- Pattern-matching approach is standard, but specific error strings from RLM may change

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days -- stable frontend patterns, unlikely to change)
