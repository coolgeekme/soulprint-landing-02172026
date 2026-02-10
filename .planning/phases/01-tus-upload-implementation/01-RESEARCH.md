# Phase 1: TUS Upload Implementation - Research

**Researched:** 2026-02-09
**Domain:** TUS Resumable Uploads for ChatGPT Exports (1MB-5GB)
**Confidence:** HIGH

## Summary

Implementing TUS (The Upload Server) resumable uploads for SoulPrint is a **low-risk, high-value client-side change** that replaces the existing XHR upload mechanism with a protocol designed for large files and unreliable networks. The existing research in `.planning/research/` provides comprehensive domain knowledge — this document synthesizes those findings for Phase 1 planning.

**Critical findings:**
1. **Client-side only** — Supabase Storage natively supports TUS at `/storage/v1/upload/resumable`
2. **Zero backend changes** — Storage paths remain `imports/{user_id}/{timestamp}-{filename}` (RLM compatible)
3. **One library** — `tus-js-client` 4.3.1 (15KB, official implementation, TypeScript included)
4. **Hardcoded 6MB chunks** — Supabase requirement, not configurable
5. **JWT refresh required** — Tokens expire after 1hr, multi-hour uploads need refresh callback

**Primary recommendation:** Create `lib/tus-upload.ts` wrapper module, integrate into `app/import/page.tsx` behind feature flag, test on mobile devices, then gradual rollout (10% → 50% → 100%).

## Standard Stack

### Core

| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| **tus-js-client** | 4.3.1 | TUS protocol client | Official TUS implementation, Supabase-verified, TypeScript included, 15KB bundle |
| **@supabase/supabase-js** | 2.93.1 (existing) | Auth and session management | Already installed, provides `getSession()` for token refresh |
| **jszip** | 3.10.1 (existing) | ZIP extraction | Used in current flow, unchanged |

### Supporting

| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| **next** | 16.1.5 (existing) | Framework | Client components for upload UI |
| **framer-motion** | 12.29.2 (existing) | Progress animations | RingProgress component |
| **lucide-react** | 0.563.0 (existing) | Icons | Upload/error UI icons |

### Alternatives Considered

| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| tus-js-client | Uppy | Uppy is 300KB+ with full UI framework vs 15KB for tus-js-client. Already have custom UI. |
| TUS protocol | AWS S3 Multipart | Supabase Storage uses TUS natively, not S3 multipart API |
| Client-side TUS | Server-side TUS | Adds complexity, Supabase handles server-side TUS implementation |

**Installation:**
```bash
npm install tus-js-client
```

## Architecture Patterns

### Recommended Project Structure
```
lib/
├── tus-upload.ts           # NEW: TUS wrapper for Supabase Storage
├── chunked-upload.ts       # DEPRECATED: Remove after full cutover
└── supabase/
    └── client.ts           # UNCHANGED: Auth session access

app/
└── import/
    └── page.tsx            # MODIFIED: Use tus-upload instead of chunked-upload
```

### Pattern 1: TUS Upload Wrapper with Token Refresh

**What:** Wrap tus-js-client with Supabase-specific configuration and token refresh logic

**When to use:** For all file uploads >50MB to Supabase Storage

**Example:**
```typescript
// Source: Existing research + Supabase official docs
import * as tus from 'tus-js-client';
import { createClient } from '@/lib/supabase/client';

export async function tusUploadWithProgress(
  blob: Blob,
  userId: string,
  filename: string,
  onProgress: (percent: number) => void
): Promise<{ success: boolean; storagePath?: string; error?: string }> {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();

  if (!session?.access_token) {
    return { success: false, error: 'Not authenticated' };
  }

  const timestamp = Date.now();
  const objectName = `${userId}/${timestamp}-${filename}`;

  return new Promise((resolve) => {
    const upload = new tus.Upload(blob, {
      endpoint: `https://${process.env.NEXT_PUBLIC_SUPABASE_PROJECT_ID}.storage.supabase.co/storage/v1/upload/resumable`,

      // CRITICAL: Refresh token before each chunk (prevents 401 on long uploads)
      onBeforeRequest: async (req) => {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          throw new Error('No valid session');
        }
        req.setHeader('Authorization', `Bearer ${session.access_token}`);
      },

      // Required metadata for Supabase
      metadata: {
        bucketName: 'imports',
        objectName: objectName,
        contentType: blob.type || 'application/json',
        cacheControl: '3600'
      },

      // MUST be 6MB (Supabase requirement)
      chunkSize: 6 * 1024 * 1024,

      // Cleanup localStorage after success (prevents fingerprint collision)
      removeFingerprintOnSuccess: true,

      // Auto-retry with exponential backoff
      retryDelays: [0, 3000, 5000, 10000, 20000],

      onProgress: (bytesUploaded, bytesTotal) => {
        const percent = Math.round((bytesUploaded / bytesTotal) * 100);
        onProgress(percent);
      },

      onSuccess: () => {
        // Extract storage path from upload URL
        const storagePath = new URL(upload.url).pathname
          .replace('/storage/v1/object/', '');
        resolve({ success: true, storagePath });
      },

      onError: (error) => {
        console.error('TUS upload error:', error);
        resolve({ success: false, error: error.message });
      },
    });

    upload.start();
  });
}
```

### Pattern 2: Feature Flag Gradual Rollout

**What:** Deploy TUS behind environment variable, enable progressively

**When to use:** When replacing critical infrastructure (upload mechanism)

**Example:**
```typescript
// Source: Prior decisions from STATE.md
// app/import/page.tsx

const USE_TUS = process.env.NEXT_PUBLIC_USE_TUS_UPLOAD === 'true';

const uploadResult = USE_TUS
  ? await tusUploadWithProgress(uploadBlob, user.id, uploadFilename, onProgress)
  : await uploadWithProgress(uploadBlob, uploadUrl, accessToken, contentType, onProgress);

if (uploadResult.success) {
  // Trigger RLM processing (unchanged)
  await fetch('/api/import/trigger', {
    method: 'POST',
    body: JSON.stringify({ storagePath: uploadResult.storagePath })
  });
}
```

### Pattern 3: Mobile Device Detection and Warnings

**What:** Detect low-memory devices and warn users before large uploads

**When to use:** iOS Safari (>100MB), Android Chrome with low memory

**Example:**
```typescript
// Source: PITFALLS-TUS-RESUMABLE.md
const checkDeviceCapability = (file: File) => {
  const isIOS = /iPad|iPhone|iPod/.test(navigator.userAgent);
  const isAndroid = /Android/.test(navigator.userAgent);
  const isMobile = isIOS || isAndroid;
  const memory = navigator.deviceMemory; // GB (undefined on iOS)

  if (isMobile && file.size > 100 * 1024 * 1024) {
    if (!memory || memory < 4) {
      return {
        warning: 'Your device may not have enough memory. Close other apps before uploading.',
        canProceed: true,
      };
    }
  }

  if (isIOS && file.size > 1024 * 1024 * 1024) {
    return {
      warning: 'Large uploads on iOS may fail. Consider using a desktop browser.',
      canProceed: true,
    };
  }

  return { canProceed: true };
};
```

### Anti-Patterns to Avoid

- **Client-side ZIP extraction before upload:** Causes out-of-memory crashes on mobile (500MB+ files). Upload ZIP directly via TUS, extract server-side.
- **Using anon key instead of session token:** Causes RLS policy violations. Always use `session.access_token`.
- **Non-6MB chunk sizes:** Supabase requires exactly 6MB. Other sizes cause upload failures.
- **Forgetting `removeFingerprintOnSuccess: true`:** Causes fingerprint collisions when re-uploading same file.
- **No JWT token refresh:** Uploads >1hr fail with 401 errors. Always implement `onBeforeRequest` callback.

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Resumable uploads | Custom chunking + localStorage fingerprinting | tus-js-client | TUS protocol handles edge cases (network interruption, token expiry, upload URL expiry) |
| Progress tracking | Custom XHR event listeners | TUS onProgress callback | Built-in, handles chunk-level progress correctly |
| Retry logic | Manual retry with setTimeout | TUS retryDelays config | Exponential backoff, 401/5xx handling, configurable attempts |
| Upload recovery | Custom localStorage schema | TUS findPreviousUploads() | Protocol-standard fingerprinting, handles expired URLs |

**Key insight:** TUS protocol is 10+ years old with thousands of edge cases handled. Browser environment is hostile (network drops, tab kills, token expiry, memory limits). Don't underestimate complexity.

## Common Pitfalls

### Pitfall 1: Client-Side ZIP Extraction Memory Exhaustion (CRITICAL)

**What goes wrong:** Loading entire ZIP file into browser memory to extract `conversations.json` causes Out-of-Memory crashes on mobile devices, especially for files >500MB.

**Why it happens:**
- JSZip's `async()` and `generateAsync()` hold full file content in memory
- Browser memory severely limited on mobile (iOS Safari: ~100MB practical limit)
- Current SoulPrint code uses JSZip client-side before upload
- A 1GB ZIP file can require 2GB+ RAM due to UTF-16 encoding and decompression buffers

**How to avoid:**
- **Never extract ZIP client-side** — Upload ZIP directly via TUS
- Extract ZIP server-side (Vercel API route or background job) where memory is predictable
- If client-side extraction required: use streaming with `StreamHelper` and backpressure

**Warning signs:**
- Silent failures on mobile devices (browser tab crashes)
- "Out of Memory" error on Android Chrome
- iOS Safari kills tab without error message

**Detection:**
```typescript
// Monitor client-side memory usage
window.addEventListener('error', (e) => {
  if (e.message.includes('memory') || e.message.includes('Out of Memory')) {
    analytics.track('upload_memory_error', {
      fileSize: file.size,
      deviceMemory: navigator.deviceMemory,
      userAgent: navigator.userAgent
    });
  }
});
```

**Phase:** Must address in Phase 1 (TUS Client Implementation)

---

### Pitfall 2: JWT Token Expiry During Long Uploads (CRITICAL)

**What goes wrong:** Supabase JWT access tokens expire after 1 hour. Multi-hour uploads (large files on slow connections) fail with 401 Unauthorized mid-upload.

**Why it happens:**
- TUS uploads send multiple PATCH requests over time (one per chunk)
- Each chunk upload requires valid `Authorization: Bearer {token}` header
- Supabase access tokens expire after 1 hour by default
- tus-js-client doesn't automatically refresh tokens

**How to avoid:**
```typescript
// Implement token refresh in onBeforeRequest callback
const upload = new tus.Upload(file, {
  onBeforeRequest: async function (req) {
    // Get fresh session (handles auto-refresh)
    const { data: { session } } = await supabase.auth.getSession();

    if (!session?.access_token) {
      throw new Error('No valid session');
    }

    // Update authorization header with fresh token
    req.setHeader('Authorization', `Bearer ${session.access_token}`);
  },

  // Retry on 401 after token refresh
  onShouldRetry: function (err, retryAttempt, options) {
    const status = err?.originalResponse?.getStatus();

    if (status === 401 || (status >= 500 && status < 600)) {
      return retryAttempt < 3;
    }
    return false;
  },
});
```

**Warning signs:**
- Upload proceeds for 1 hour then fails with 401 Unauthorized
- Upload appears "stuck" at same percentage indefinitely
- User loses progress if `removeFingerprintOnSuccess: false`

**Phase:** Must address in Phase 1 (TUS Client Implementation)

---

### Pitfall 3: 6MB Chunk Size Hard Requirement (CRITICAL)

**What goes wrong:** Supabase Storage requires exactly 6MB chunks for TUS uploads. Using any other chunk size causes "upload stalled at 6MB" failures.

**Why it happens:**
- Supabase Storage backend expects 6MB chunks
- Non-6MB chunks get rejected or cause internal routing issues
- Supabase docs explicitly state: "Must be 6MB, do not change it"

**How to avoid:**
```typescript
const upload = new tus.Upload(file, {
  // MUST be exactly 6MB
  chunkSize: 6 * 1024 * 1024,  // 6MB exactly

  // DO NOT use dynamic chunk sizing
  // DO NOT use smaller chunks for mobile
});
```

**Warning signs:**
- Uploads consistently fail at 6MB mark
- Uploads never start (if using larger chunks)
- Error: "tus: failed to resume upload"
- HEAD requests fail during resumption check

**Phase:** Must address in Phase 1 (TUS Client Implementation)

---

### Pitfall 4: localStorage Fingerprint Collisions (HIGH)

**What goes wrong:** TUS client caches upload fingerprints in localStorage. When same file is uploaded twice, TUS thinks it's already uploaded and skips it, causing "upload complete" with no actual file transfer.

**Why it happens:**
- tus-js-client uses file fingerprint (name, size, type, lastModified) as localStorage key
- Default behavior: fingerprints persist after upload (`removeFingerprintOnSuccess: false`)
- Multiple uploads of same file reuse cached upload URL from localStorage
- If upload URL expired or file was deleted, upload silently fails

**How to avoid:**
```typescript
const upload = new tus.Upload(file, {
  // Critical: Remove fingerprint after success
  removeFingerprintOnSuccess: true,

  // Optional: Force unique fingerprint per upload
  metadata: {
    filename: file.name,
    filetype: file.type,
    uploadId: crypto.randomUUID(),  // Force unique
  },
});
```

**Warning signs:**
- User re-uploads same file → instant "success" but file not in storage
- Developer gets 404 errors when trying to access uploaded file
- "Instant" upload completions (< 100ms for large files)

**Phase:** Must address in Phase 1 (TUS Client Implementation)

---

### Pitfall 5: iOS Safari Memory Limits (MEDIUM)

**What goes wrong:** iOS Safari has severe memory constraints (~100MB practical limit). Large file uploads exhaust memory and kill the browser tab.

**Why it happens:**
- Mobile Safari uses RAM for file operations
- iOS 13+ aggressively kills memory-heavy apps/tabs
- File API operations load file into memory
- Background tabs get memory budget reduced

**How to avoid:**
- Use TUS resumable uploads (survives tab crashes)
- Store upload state in localStorage for recovery
- Warn users before mobile uploads >100MB
- Implement upload recovery UI (detect interrupted uploads on page load)

**Warning signs:**
- Tab crashes during upload (no error to user)
- Upload progress lost on tab reload
- User receives generic "Page reloaded" message
- Particularly bad on older devices (iPhone 8, iPad Air 2)

**Phase:** Should address in Phase 1 (UX warnings) and Phase 2 (Upload recovery UI)

## Code Examples

Verified patterns from official sources:

### Basic TUS Upload to Supabase Storage

```typescript
// Source: Supabase official docs + STACK-TUS-RESUMABLE.md
import * as tus from 'tus-js-client';
import { createClient } from '@/lib/supabase/client';

const supabase = createClient();
const { data: { session } } = await supabase.auth.getSession();

const upload = new tus.Upload(file, {
  endpoint: `https://${projectId}.storage.supabase.co/storage/v1/upload/resumable`,

  headers: {
    authorization: `Bearer ${session.access_token}`,
    apikey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  },

  metadata: {
    bucketName: 'imports',
    objectName: `${userId}/${timestamp}-${filename}`,
    contentType: file.type || 'application/json',
    cacheControl: '3600',
  },

  chunkSize: 6 * 1024 * 1024,
  removeFingerprintOnSuccess: true,
  retryDelays: [0, 3000, 5000, 10000, 20000],

  onProgress: (bytesUploaded, bytesTotal) => {
    const percent = Math.round((bytesUploaded / bytesTotal) * 100);
    console.log(`Upload progress: ${percent}%`);
  },

  onSuccess: () => {
    console.log('Upload complete!');
  },

  onError: (error) => {
    console.error('Upload failed:', error);
  },
});

upload.start();
```

### Extract Storage Path from TUS Upload URL

```typescript
// Source: ARCHITECTURE-TUS-INTEGRATION.md
onSuccess: function () {
  // upload.url = https://.../storage/v1/object/imports/{user_id}/{timestamp}-{filename}
  const storagePath = new URL(upload.url).pathname
    .replace('/storage/v1/object/', '');
  // → imports/{user_id}/{timestamp}-{filename}

  console.log('Storage path:', storagePath);
}
```

### Upload Recovery After Browser Close

```typescript
// Source: PITFALLS-TUS-RESUMABLE.md
// On page load, check for interrupted uploads
useEffect(() => {
  const checkInterruptedUploads = async () => {
    const previousUploads = await tus.Upload.getResumeableUploads();

    if (previousUploads.length > 0) {
      setShowResumeDialog(true);
      setPendingUpload(previousUploads[0]);
    }
  };

  checkInterruptedUploads();
}, []);

// Show resume dialog
{showResumeDialog && (
  <Dialog>
    <p>You have an interrupted upload. Resume?</p>
    <button onClick={() => pendingUpload.start()}>Resume</button>
    <button onClick={() => {
      pendingUpload.abort();
      setShowResumeDialog(false);
    }}>Start Over</button>
  </Dialog>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| XHR single request | TUS chunked resumable | Feb 2023 (Supabase Storage v3) | Enables 50GB+ files, auto-resume on network drop |
| 50MB chunks (current) | 6MB chunks (TUS) | Supabase requirement | Better mobile compatibility, more granular resume |
| Manual retry logic | Built-in exponential backoff | TUS protocol standard | Fewer failed uploads, better network error handling |
| No resume capability | 24hr upload URL validity | TUS protocol standard | Users can resume after browser close, network interruption |

**Deprecated/outdated:**
- **Standard XHR uploads:** Limited to ~50MB by Supabase REST endpoint body size limit
- **lib/chunked-upload.ts:** Will be deprecated after TUS full cutover
- **Uppy + TUS:** GitHub issues show 5-10% failure rate with Supabase, heavier bundle (300KB+ vs 15KB)

## Open Questions

### 1. **Vercel Edge Runtime Compatibility**
   - What we know: TUS is browser-only (client-side), Edge runtime not involved
   - What's unclear: Does Edge middleware affect TUS requests?
   - Recommendation: Test in staging, monitor network logs

### 2. **Supabase Storage Timeouts**
   - What we know: Upload URLs valid for 24 hours
   - What's unclear: Max upload duration before server-side timeout?
   - Recommendation: Test 2GB+ file on slow connection (throttled), measure duration

### 3. **Safari Private Mode localStorage**
   - What we know: TUS uses localStorage for fingerprints
   - What's unclear: Does TUS work without localStorage (Safari private mode)?
   - Recommendation: Test in Safari private window, verify resume capability

### 4. **Mobile Browser Testing Matrix**
   - What we know: iOS Safari has memory limits, Android Chrome varies by device
   - What's unclear: Exact thresholds for crash on specific devices
   - Recommendation: Test on real devices (iPhone 12 Pro, Samsung Galaxy S21, budget Android)

## Sources

### Primary (HIGH confidence)
- `.planning/research/SUMMARY.md` - Synthesized TUS integration research
- `.planning/research/STACK-TUS-RESUMABLE.md` - Library versions, configuration
- `.planning/research/PITFALLS-TUS-RESUMABLE.md` - Common mistakes, detection strategies
- `.planning/research/ARCHITECTURE-TUS-INTEGRATION.md` - Integration architecture
- [Supabase Resumable Uploads](https://supabase.com/docs/guides/storage/uploads/resumable-uploads) - Official docs
- [tus-js-client GitHub](https://github.com/tus/tus-js-client) - API reference
- [Supabase Storage v3 Blog](https://supabase.com/blog/storage-v3-resumable-uploads) - Feature announcement

### Secondary (MEDIUM confidence)
- [Supabase Storage 6MB Issue #563](https://github.com/supabase/storage/issues/563) - Chunk size requirement
- [5-10% Upload Failures #419](https://github.com/supabase/storage/issues/419) - Fingerprint collisions
- [RLS Policy Issue #22039](https://github.com/orgs/supabase/discussions/22039) - Authentication patterns
- [Secure Upload Auth #26424](https://github.com/orgs/supabase/discussions/26424) - Token refresh

### Tertiary (LOW confidence)
- [Brave Browser Upload Issues](https://community.brave.app/t/file-upload-impossible/558641) - Browser-specific failures
- [Android Chrome Memory Errors](https://dir-blogs.hashnode.dev/android-phone-cant-upload-files-in-browser-due-to-low-memory) - Mobile limitations
- [Mobile Safari Memory Limits](https://lapcatsoftware.com/articles/2026/1/7.html) - iOS constraints

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - Official docs, verified library versions, existing research
- Architecture: HIGH - Supabase docs, existing research, verified integration patterns
- Pitfalls: HIGH - Official docs + community issues + prior research verification

**Research date:** 2026-02-09
**Valid until:** 30 days (stable TUS protocol, Supabase configuration unlikely to change)

**Sources used:**
- 4 existing research documents (SUMMARY, STACK, PITFALLS, ARCHITECTURE)
- Supabase official documentation (Storage Resumable Uploads)
- tus-js-client official repository and docs
- Community GitHub issues for edge cases
- Current codebase analysis (lib/chunked-upload.ts, app/import/page.tsx)
