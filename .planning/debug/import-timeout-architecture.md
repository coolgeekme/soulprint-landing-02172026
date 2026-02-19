# Debug: Import Timeout Architecture Issue

**Created:** 2026-02-03
**Status:** ACTIVE - BLOCKING
**Severity:** Critical - Product doesn't work

## Symptoms

1. Import gets stuck at 95% progress
2. Times out after ~5 minutes
3. Error: "Processing timed out. Please try with a smaller file"
4. 0/2 users have successfully imported

## Root Cause Analysis

### The Problem

Vercel serverless functions have a **hard 5-minute timeout** (maxDuration: 300).

Current flow:
```
User Upload → Vercel (5 min limit) → RLM (no limit) → Done
                    ↑
              BOTTLENECK
```

The Vercel function WAITS for RLM to finish all:
- Parsing (fast)
- Chunking (medium)
- Embedding via Bedrock (SLOW - rate limited)
- SoulPrint generation (medium)

For a 1GB file with 10,000+ conversations:
- Embedding alone could take 30+ minutes
- Vercel kills the request after 5 minutes
- User sees "timeout" error

### Why Previous "Fix" Didn't Work

Changed RLM call to fire-and-forget with 10s timeout. But:
1. RLM still needs the full data uploaded first
2. Vercel function still waits for upload + initial parse
3. Large files still timeout during upload/parse phase

## Required Architecture Change

### Option A: Client-Side Processing (Recommended)

```
Browser → Extract ZIP locally → Upload conversations.json chunks → Supabase Storage
                                            ↓
                                   Render Worker (no timeout)
                                            ↓
                                   Process in background
                                            ↓
                                   Poll for completion
```

Benefits:
- No Vercel timeout issue
- Works with ANY file size
- User can close browser, come back later
- Already partially implemented (JSZip in browser)

### Option B: Chunked Background Jobs

Use a job queue (Inngest, Trigger.dev) to process in small chunks:
- Each job processes 100 conversations
- Chain jobs until complete
- No single job exceeds timeout

### Option C: Move Everything to Render

Skip Vercel for import entirely:
- Direct upload to Render endpoint
- Render has no timeout limits
- Requires CORS setup

## Decision

**Option A** - Client-side processing is already partially built. Need to:

1. Extract ZIP in browser (done)
2. Parse conversations.json in browser (done)
3. Upload directly to Supabase Storage (needs fixing)
4. Trigger Render worker via webhook (not Vercel)
5. Poll for completion (needs building)

## Files to Change

- `app/import/page.tsx` - Full client-side flow
- `app/api/import/trigger-worker/route.ts` - New: webhook to Render
- RLM service - Accept webhook, process async
- `app/api/import/status/route.ts` - Polling endpoint

## Success Criteria

- [ ] 10GB ZIP file imports successfully
- [ ] User can close browser during processing
- [ ] No Vercel timeout errors
- [ ] Status polling shows real progress
