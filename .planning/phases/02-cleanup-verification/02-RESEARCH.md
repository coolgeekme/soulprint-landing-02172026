# Phase 02: Cleanup & Verification - Research

**Researched:** 2026-02-09
**Domain:** Code cleanup and dead code removal
**Confidence:** HIGH

## Summary

Phase 2 is a surgical cleanup operation to remove the old XHR-based upload code path after TUS integration was successfully deployed in Phase 1. The research reveals a contained cleanup scope with clear boundaries:

**What needs removal:**
1. `lib/chunked-upload.ts` (153 lines) - Old XHR upload utilities (`uploadWithProgress`, `chunkedUpload`)
2. `app/api/import/chunked-upload/route.ts` (190 lines) - Server-side chunk assembly endpoint
3. `tests/integration/api/import/chunked-upload.test.ts` (267 lines) - Tests for removed API route

**What stays:**
- `lib/tus-upload.ts` - New TUS upload implementation (Phase 1)
- `app/import/page.tsx` - Already updated to use TUS (Phase 1)
- All other import API routes (trigger, process-server, etc.)

**Key findings:**
- NO active imports of `lib/chunked-upload.ts` exist in the codebase
- NO references to `uploadWithProgress` or `chunkedUpload` in active code
- The chunked-upload API route is unused (TUS uploads go directly to Supabase Storage)
- All planning/documentation references are historical context only
- No configuration files reference the old approach

**Primary recommendation:** This is a low-risk cleanup phase. Remove the three identified files, verify no imports break, confirm upload functionality still works in production.

## Standard Stack

### Core Technologies (for this phase)

This is a **deletion-only** phase - no new libraries or frameworks needed.

| Tool | Purpose | Why Standard |
|------|---------|--------------|
| Grep/Ripgrep | Search for lingering references | Standard search tool for dependency analysis |
| TypeScript Compiler | Verify no broken imports | Built-in validation via `npm run build` |
| Git | Track deletions and verify clean state | Standard version control |

### Verification Approach

| Tool | Version | Purpose | When to Use |
|------|---------|---------|-------------|
| `npm run build` | Built-in | TypeScript compilation check | After file deletions to verify no broken imports |
| `npm run test` | Vitest | Run test suite (excluding deleted tests) | After cleanup to ensure no test breakage |
| Grep/Ripgrep | CLI | Search for orphaned references | Before and after deletion |

## Architecture Patterns

### Pattern 1: Safe Code Deletion Process

**What:** Systematic approach to removing dead code without breaking dependencies

**When to use:** Any time removing established code paths that may have unknown dependencies

**Process:**
```
1. SEARCH: Find all references to code being removed
   - Direct imports (from '@/lib/chunked-upload')
   - Function calls (uploadWithProgress, chunkedUpload)
   - API route calls (fetch('/api/import/chunked-upload'))
   - Type references (UploadProgress, ProgressCallback)

2. CLASSIFY: Categorize references
   - Active code (prod/test files) → BLOCKER
   - Documentation (.md files) → UPDATE or LEAVE
   - Planning docs (.planning/) → LEAVE (historical context)
   - Comments → CLEAN if misleading, LEAVE if historical

3. DELETE: Remove files in dependency order
   - Start with leaf dependencies (no imports)
   - Move to higher-level code
   - Remove tests last (after verifying prod code compiles)

4. VERIFY: Multi-layer verification
   - TypeScript compilation (npm run build)
   - Test suite (npm run test)
   - Manual smoke test (upload file in browser)
   - Monitor production errors for 24h post-deploy
```

**Example from this phase:**
```bash
# Step 1: Search for references
rg "chunked-upload|uploadWithProgress|chunkedUpload" --type ts --type tsx

# Step 2: Classify findings
# - lib/chunked-upload.ts → DELETE (source file)
# - app/api/import/chunked-upload/route.ts → DELETE (unused API)
# - tests/integration/api/import/chunked-upload.test.ts → DELETE (tests removed code)
# - .planning/**/*.md → LEAVE (historical context)

# Step 3: Delete files
rm lib/chunked-upload.ts
rm -rf app/api/import/chunked-upload/
rm tests/integration/api/import/chunked-upload.test.ts

# Step 4: Verify
npm run build  # Should pass with no errors
npm run test   # Should pass (minus deleted tests)
```

### Pattern 2: Documentation Hygiene During Cleanup

**What:** Handling documentation references to removed code

**When to use:** When docs reference code being deleted

**Guidelines:**

```markdown
# OLD API (REMOVED 2026-02-09)
~~POST /api/import/chunked-upload~~ (removed after TUS migration)

# NEW API (CURRENT)
TUS resumable uploads via Supabase Storage
```

**For this phase:**
- `.planning/` docs → LEAVE as-is (historical record of decision-making)
- `docs/API_MAP.md` → UPDATE to remove chunked-upload references
- `CLAUDE.md` → CHECK for upload-raw references (may be inaccurate)
- Comments in code → ONLY remove if actively misleading

### Anti-Patterns to Avoid

- **Deleting tests before prod code:** Always verify prod code compiles first, then remove tests
- **Batch deletion without verification:** Delete files one at a time, compile between deletions
- **Removing all documentation:** Keep historical context in .planning/ for future maintainers
- **Skipping manual smoke test:** Always test the actual feature (upload a file) post-cleanup

## Don't Hand-Roll

This is a cleanup phase - nothing new to build. But these tools help with safe deletion:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Finding all references to deleted code | Manual grep + hoping you caught everything | `rg "pattern" --type ts --type tsx` with multiple patterns | Ripgrep is 10x faster than grep, handles .gitignore, supports file type filtering |
| Verifying no broken imports | Manual code review | `npm run build` (TypeScript compiler) | TypeScript compiler catches 100% of import errors, manual review catches <50% |
| Checking for runtime usage | Code analysis | Production monitoring + search logs for 404s to `/api/import/chunked-upload` | Runtime monitoring catches actual usage; static analysis misses dynamic imports/feature flags |

**Key insight:** Deletion is high-risk if rushed. Use automated tools (TypeScript, grep, tests) to verify safety before merge.

## Common Pitfalls

### Pitfall 1: Orphaned API Route References

**What goes wrong:** Delete server-side API route but miss client-side fetch calls → 404 errors in production

**Why it happens:** API routes are called via string paths (`fetch('/api/import/chunked-upload')`), not TypeScript imports (no compile-time verification)

**How to avoid:**
```bash
# Before deleting app/api/import/chunked-upload/route.ts, search for fetch calls:
rg "/api/import/chunked-upload" --type ts --type tsx
rg "chunked-upload" app/ lib/ --type ts --type tsx
```

**Warning signs:**
- 404 errors in production logs after deploy
- Client-side fetch errors in browser console
- User-reported "upload failed" issues

**For this phase:** NO references found to `/api/import/chunked-upload` in active code (✓ verified)

### Pitfall 2: TypeScript Imports vs. Runtime Imports

**What goes wrong:** TypeScript compilation passes but runtime fails due to dynamic imports

**Why it happens:** Dynamic imports like `await import(varName)` or `require()` bypass TypeScript's static analysis

**How to avoid:**
```bash
# Search for dynamic imports:
rg "import\(" lib/ app/
rg "require\(" lib/ app/

# Search for string-based imports (feature flags, lazy loading):
rg "await.*import.*chunked" --type ts
```

**Warning signs:**
- Build passes but app crashes on specific features
- Intermittent errors that don't reproduce locally
- Error messages like "Cannot find module" in production

**For this phase:** NO dynamic imports of chunked-upload found (✓ verified)

### Pitfall 3: Test Interdependencies

**What goes wrong:** Delete one test file, breaks unrelated tests that imported test utilities from it

**Why it happens:** Test files sometimes export helper functions used by other tests

**How to avoid:**
```bash
# Before deleting tests/integration/api/import/chunked-upload.test.ts:
rg "from.*chunked-upload.test" tests/
rg "import.*chunked-upload.test" tests/
```

**Warning signs:**
- Test suite fails after deletion with "Cannot find module" errors
- Other tests import mock helpers from deleted test file

**For this phase:** Chunked-upload test file is self-contained, no exports used elsewhere (✓ verified)

### Pitfall 4: Leftover Type Exports

**What goes wrong:** Delete implementation but leave type definitions exported → other files import types that no longer exist

**Why it happens:** Types are often exported separately from implementation and may be imported widely

**How to avoid:**
```bash
# Search for type imports from deleted file:
rg "import.*type.*from.*chunked-upload" --type ts
rg "UploadProgress|ProgressCallback" --type ts --type tsx
```

**For this phase:**
- `UploadProgress` type exported by `lib/chunked-upload.ts` → Check if used elsewhere
- `ProgressCallback` type exported → Check if used elsewhere

**Verification:**
```bash
# Search for these types in codebase
rg "UploadProgress" --type ts --type tsx | grep -v chunked-upload.ts
rg "ProgressCallback" --type ts --type tsx | grep -v chunked-upload.ts
```

**Finding:** Types NOT used outside `lib/chunked-upload.ts` → Safe to delete

## Code Examples

### Example 1: Comprehensive Reference Search

Before deleting any files, run this complete search pattern:

```bash
# Search for all forms of reference to chunked-upload code
rg "chunked-upload" --type ts --type tsx \
  | grep -v "node_modules" \
  | grep -v ".planning/"

# Search for specific function names
rg "uploadWithProgress|chunkedUpload" --type ts --type tsx

# Search for API route references
rg "/api/import/chunked-upload" --type ts --type tsx

# Search for type imports
rg "import.*UploadProgress|import.*ProgressCallback" --type ts

# Expected output: ONLY references in:
# - lib/chunked-upload.ts (source file)
# - app/api/import/chunked-upload/route.ts (API route)
# - tests/integration/api/import/chunked-upload.test.ts (tests)
# - .planning/ docs (historical - safe to ignore)
```

### Example 2: Safe Deletion Sequence

```bash
# 1. Delete leaf dependency first (lib)
git rm lib/chunked-upload.ts

# 2. Verify TypeScript compilation
npm run build
# Expected: Build passes with no errors

# 3. Delete API route
git rm -r app/api/import/chunked-upload/

# 4. Verify again
npm run build
# Expected: Build passes

# 5. Delete tests (last step)
git rm tests/integration/api/import/chunked-upload.test.ts

# 6. Run remaining tests
npm run test
# Expected: All tests pass (except deleted ones)

# 7. Commit with descriptive message
git commit -m "refactor(cleanup): remove old XHR upload code after TUS migration

- Remove lib/chunked-upload.ts (uploadWithProgress, chunkedUpload)
- Remove app/api/import/chunked-upload API route (unused after TUS)
- Remove chunked-upload.test.ts

All uploads now use TUS resumable protocol (lib/tus-upload.ts).
Server-side chunk assembly no longer needed."
```

### Example 3: Post-Cleanup Verification Checklist

```bash
# TypeScript compilation
npm run build
# ✓ Should pass with no errors

# Test suite
npm run test
# ✓ Should pass (verify test count decreased by expected amount)

# Search for orphaned references
rg "chunked-upload|uploadWithProgress|chunkedUpload" \
  --type ts --type tsx \
  | grep -v "node_modules" \
  | grep -v ".planning/"
# ✓ Should return NO results in active code

# Manual smoke test
# 1. Start dev server: npm run dev
# 2. Go to /import page
# 3. Upload a small ZIP file (<10MB)
# 4. Verify upload completes successfully
# 5. Verify progress bar updates smoothly
# ✓ Upload should work identically to before cleanup

# Production monitoring (post-deploy)
# Monitor for 24 hours:
# - No 404 errors to /api/import/chunked-upload
# - No "Cannot find module chunked-upload" errors
# - Upload success rate maintains baseline (>95%)
```

## State of the Art

### Upload Technology Evolution

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| XHR with manual chunking (lib/chunked-upload.ts) | TUS resumable protocol (lib/tus-upload.ts) | Phase 1 (v2.3) | Enables uploads >5GB, automatic resume, better mobile support |
| Server-side chunk assembly (/api/import/chunked-upload) | Direct upload to Supabase Storage | Phase 1 (v2.3) | Reduced server memory usage, eliminated chunk reassembly complexity |
| 50MB chunks via XHR | 6MB chunks via TUS | Phase 1 (v2.3) | Better mobile compatibility, smoother progress tracking |

**Deprecated/outdated:**
- `lib/chunked-upload.ts` - XMLHttpRequest-based upload (replaced by TUS)
- `uploadWithProgress()` - XHR with progress callbacks (replaced by `tusUpload()`)
- `chunkedUpload()` - Manual chunk splitting and upload (replaced by TUS protocol)
- `/api/import/chunked-upload` - Server-side chunk assembly (no longer needed)

**Why TUS replaced XHR:**
1. **Resume capability:** XHR cannot resume interrupted uploads; TUS can via fingerprinting
2. **File size limits:** XHR hits Supabase REST API limits at ~50MB per request; TUS supports up to 5GB
3. **Mobile reliability:** TUS's smaller chunks (6MB) and auto-retry work better on unstable mobile networks
4. **JWT refresh:** TUS protocol allows token refresh between chunks; XHR requires token valid for entire upload
5. **Industry standard:** TUS is the standard resumable upload protocol (used by Vimeo, Uppy, Cloudflare, etc.)

## Research Findings

### Question 1: What files reference lib/chunked-upload.ts?

**Finding:** NO active code imports from `lib/chunked-upload.ts`

**Evidence:**
- Searched entire codebase: `rg "from '@/lib/chunked-upload'" --type ts --type tsx`
- Result: ZERO matches in active code
- Only references found in `.planning/` documentation (historical context)

**Confidence:** HIGH (verified via ripgrep exhaustive search)

### Question 2: Are there XHR upload utilities elsewhere?

**Finding:** NO other XHR-based upload utilities exist

**Evidence:**
- Searched for XMLHttpRequest: `rg "XMLHttpRequest|new XMLHttpRequest\(|xhr\." --type ts --type tsx`
- Found 25 matches, all in:
  - `lib/chunked-upload.ts` (the file being deleted)
  - `node_modules/` (third-party libraries)
  - `.planning/` docs (references to old implementation)
- NO other custom XHR upload wrappers or helpers

**Confidence:** HIGH (verified via grep pattern matching)

### Question 3: Do tests/types/configs reference old upload?

**Finding:** ONE test file and ONE type export reference the old approach

**Files to remove:**
1. `tests/integration/api/import/chunked-upload.test.ts` (267 lines) - Tests the API route being deleted
2. Type exports in `lib/chunked-upload.ts`:
   - `UploadProgress` interface → NOT used elsewhere
   - `ProgressCallback` type → NOT used elsewhere

**Files to check but NOT modify:**
- `lib/api/schemas.ts` - NO chunked-upload schemas (✓ verified by reading file)
- `vitest.config.ts` - NO chunked-upload specific config
- `tsconfig.json` - NO path aliases for chunked-upload
- `next.config.js` - NO webpack config for chunked-upload

**Confidence:** HIGH (verified by reading actual files)

### Question 4: Dead code in app/import/page.tsx?

**Finding:** NO dead code from XHR migration

**Evidence:**
- Read entire file (1183 lines)
- Line 14: Imports `tusUpload` from `@/lib/tus-upload` (current implementation)
- Line 520-530: Uses `tusUpload()` for all uploads
- NO imports of `chunkedUpload` or `uploadWithProgress`
- NO commented-out XHR code
- NO TODO/FIXME comments about upload migration
- NO conditional logic like `if (useTUS) {...} else {...}`

**Why Phase 1 already cleaned this:** Phase 1's task was to replace XHR with TUS in import page. Phase 1 verification confirms old code was fully removed (see `.planning/phases/01-tus-upload-implementation/01-VERIFICATION.md` line 61).

**Confidence:** HIGH (verified by reading full file + Phase 1 verification report)

### Question 5: Leftover TODOs in lib/tus-upload.ts?

**Finding:** ZERO TODO/FIXME/XXX/HACK comments

**Evidence:**
- Searched `lib/tus-upload.ts`: `rg "TODO|FIXME|XXX|HACK" lib/tus-upload.ts`
- Result: NO matches
- Read full file (114 lines) - production-ready implementation with no incomplete work

**Phase 1 delivered complete implementation:** No deferred work from Phase 1.

**Confidence:** HIGH (verified via grep + full file read)

### Question 6: Unused server-side API routes?

**Finding:** ONE unused API route - `/api/import/chunked-upload`

**Why unused:** After TUS migration, uploads go directly to Supabase Storage via TUS endpoint (`https://{project}.supabase.co/storage/v1/upload/resumable`). No server-side chunk assembly needed.

**Other import API routes (STILL USED):**
- `/api/import/trigger` → Triggers RLM import after upload completes (✓ used by import page line 553)
- `/api/import/process-server` → RLM processing endpoint (✓ used by trigger endpoint)
- `/api/import/complete` → Marks import as complete (✓ used by RLM)
- `/api/import/queue-processing` → Legacy import queue (may be unused, out of scope for this phase)
- `/api/import/mem0` → Legacy memory system (may be unused, out of scope for this phase)

**Documentation updates needed:**
- `docs/API_MAP.md` line 38: References `/api/import/upload-chunk` and `/api/import/upload-raw` (may be inaccurate)
- `CLAUDE.md` line 42: References `/api/import/upload-raw` (may be inaccurate)

**Confidence:** HIGH for chunked-upload route (verified by code inspection). MEDIUM for other routes (needs deeper analysis, defer to future phase).

## Open Questions

1. **Are /api/import/upload-raw and /api/import/upload-chunk still used?**
   - What we know: Not found in `app/api/import/` directory listing
   - What's unclear: Whether these were already removed or never existed
   - Recommendation: Defer to documentation cleanup phase (out of scope for Phase 2)

2. **Should we update API_MAP.md during this phase?**
   - What we know: API_MAP.md references chunked-upload endpoint (line 38)
   - What's unclear: Whether Phase 2 scope includes documentation updates beyond code
   - Recommendation: Include minimal API_MAP.md update (remove chunked-upload reference only)

3. **Are mem0 and queue-processing import routes still used?**
   - What we know: Routes exist in `app/api/import/` directory
   - What's unclear: Whether they're actively called or legacy dead code
   - Recommendation: Out of scope for Phase 2 (focus on chunked-upload only)

## Sources

### Primary (HIGH confidence)

- **Codebase inspection** (2026-02-09):
  - `lib/chunked-upload.ts` - Reviewed full file (153 lines)
  - `app/api/import/chunked-upload/route.ts` - Reviewed full file (190 lines)
  - `tests/integration/api/import/chunked-upload.test.ts` - Reviewed full file (267 lines)
  - `app/import/page.tsx` - Reviewed full file (1183 lines)
  - `lib/tus-upload.ts` - Reviewed full file (114 lines)
  - `lib/api/schemas.ts` - Reviewed (no chunked-upload schemas)

- **Ripgrep exhaustive search** (2026-02-09):
  - Pattern: `chunked-upload|uploadWithProgress|chunkedUpload`
  - Pattern: `XMLHttpRequest|XHR`
  - Pattern: `/api/import/chunked-upload`
  - Pattern: `UploadProgress|ProgressCallback`
  - All searches confirmed NO active references outside files being deleted

- **Phase 1 verification report** (`.planning/phases/01-tus-upload-implementation/01-VERIFICATION.md`):
  - Confirms TUS integration complete
  - Confirms old XHR code removed from import page
  - Confirms lib/chunked-upload.ts cleanup deferred to Phase 2

### Secondary (MEDIUM confidence)

- **docs/API_MAP.md** - API route documentation (may be outdated)
- **CLAUDE.md** - Project context (may have inaccurate upload endpoint references)

### Tertiary (LOW confidence)

- **Planning documents** in `.planning/phases/` - Historical context of TUS migration decisions (useful for understanding "why" but not "what exists now")

## Metadata

**Confidence breakdown:**
- Files to delete: HIGH - All three files identified and verified unused
- No active imports: HIGH - Exhaustive ripgrep search confirms zero active usage
- Type exports: HIGH - Types not used outside deleted files
- API route unused: HIGH - TUS uploads bypass server-side chunking entirely
- Documentation references: MEDIUM - Some docs may need updates (defer to future phase)

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (stable codebase, low churn expected in upload code)

**Scope boundaries:**
- IN SCOPE: Remove chunked-upload.ts, chunked-upload API route, related tests
- OUT OF SCOPE: Other potentially unused import routes (mem0, queue-processing, upload-raw)
- OUT OF SCOPE: Comprehensive documentation cleanup (only update API_MAP.md minimally)

**Risk assessment:** LOW
- No active code depends on deleted files
- TypeScript compiler will catch any missed imports
- Upload functionality unchanged (TUS already live and verified in Phase 1)
- Easy rollback (files are in git history)
