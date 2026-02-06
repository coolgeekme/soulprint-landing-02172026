---
phase: 07-type-safety-refinement
plan: 01
subsystem: import-flow
tags: [typescript, zod, type-safety, validation]
requires: [06-comprehensive-testing]
provides: [import-type-safety]
affects: [07-02-chat-flow]
tech-stack:
  added: []
  patterns: [zod-boundary-validation, type-guards]
key-files:
  created: []
  modified:
    - lib/api/schemas.ts
    - lib/bedrock.ts
    - app/api/import/process-server/route.ts
    - app/api/import/queue-processing/route.ts
    - app/api/import/complete/route.ts
    - app/api/import/mem0/route.ts
    - app/import/page.tsx
    - lib/chunked-upload.ts
decisions:
  - id: zod-at-boundaries
    rationale: Validate external data (ChatGPT exports, Bedrock responses) at parse boundary
  - id: unknown-over-any
    rationale: Use unknown type for catch blocks and unparsed data, require explicit type narrowing
  - id: type-guards
    rationale: Use type guards with optional chaining for complex nested structures
metrics:
  duration: 5m 40s
  completed: 2026-02-06
---

# Phase 07 Plan 01: Import Flow Type Safety Summary

**One-liner:** Eliminated all `any` types from import flow and added Zod validation at external data boundaries

## What Was Built

### Task 1: Zod Schemas for External API Validation
- Added `chatGPTRawConversationSchema` to validate ChatGPT export format
- Added `bedrockEmbedResponseSchema` to validate AWS Bedrock Titan embedding responses
- Added `rlmProcessResponseSchema` for RLM /process-full endpoint validation
- Added `chunkedUploadResultSchema` for upload response validation
- Updated `bedrockEmbed()` to use `safeParse()` for response validation
- Fixed Zod 4 compatibility: `z.record()` requires both key and value schemas

### Task 2: Eliminate All `any` Types
**process-server/route.ts:**
- Changed `rawConversations: any[]` → `ChatGPTRawConversation[]` with Zod validation
- Replaced `Object.values(conv.mapping) as any[]` with proper type guards
- Changed `catch (e: any)` → `catch (e: unknown)` with `instanceof Error` narrowing

**queue-processing/route.ts:**
- Changed `catch (fetchError: any)` → `catch (fetchError: unknown)` with type narrowing

**complete/route.ts:**
- Changed `subscription: any` → `subscription: unknown` (dead code, properly typed)

**mem0/route.ts:**
- Added array validation before calling `parseChatGPTExport()`
- Cast to `ChatGPTConversation[]` (function handles internal validation)

**import/page.tsx:**
- Changed `data?: any` → `data?: unknown` in `safeJsonParse` return type
- Changed `chunks: any[]` → `chunks: unknown[]` in IndexedDB helper
- Changed `conversations: any[]` → `conversations: unknown[]` in IndexedDB helper

**chunked-upload.ts:**
- Changed `data?: any` → `data?: unknown` in `uploadWithProgress` return type

## Decisions Made

**1. Validate at Boundaries**
- External data (ChatGPT exports, API responses) validated with Zod immediately after parsing
- Prevents invalid data from propagating through the system
- Clear error messages for users when validation fails

**2. unknown Over any**
- All catch blocks use `catch (e: unknown)` with explicit type narrowing
- JSON.parse results typed as `unknown` first, then validated
- Forces developers to handle all possible types explicitly

**3. Type Guards for Complex Structures**
- ChatGPT mapping traversal uses type guards with optional chaining
- More verbose but prevents runtime errors from missing properties
- Better than casting with `as` which bypasses safety

## Deviations from Plan

**Fixed Parallel Agent's Schemas:**
- Rule 1 (Bug): Fixed `z.record(z.unknown())` → `z.record(z.string(), z.unknown())` for Zod 4 compatibility
- The parallel agent (07-02) added mem0 schemas using single-argument `z.record()` which is invalid in Zod 4
- Fixed 3 occurrences in mem0 schema metadata fields

**Updated Test Assertion:**
- Rule 1 (Bug): Updated test to match new validation error message
- Changed from "Invalid file format" to "Invalid ChatGPT export format"
- More specific error message after adding Zod validation

## Verification Results

✅ **TypeScript Compilation:** 0 errors in source files (test errors are pre-existing)
✅ **All Tests Pass:** 90/90 Vitest tests passing
✅ **Zero `any` Types:** grep confirms no `any` types in import flow files
✅ **Boundary Validation:** Bedrock response validated with `safeParse()`

## Technical Highlights

**Type Guard Pattern:**
```typescript
// Before: as any[] (bypasses type safety)
const nodes = Object.values(conv.mapping) as any[];

// After: Type guard with optional chaining
const nodes = Object.values(conv.mapping);
for (const node of nodes) {
  if (
    node &&
    typeof node === 'object' &&
    'message' in node &&
    // ... explicit property checks
  ) {
    // Safe to access properties
  }
}
```

**Zod Validation at Boundary:**
```typescript
// Parse as unknown first
const parsed: unknown = JSON.parse(text);

// Validate with Zod
const result = chatGPTExportSchema.safeParse(parsed);
if (!result.success) {
  throw new Error('Invalid ChatGPT export format');
}

// Now safely typed
const conversations: ChatGPTRawConversation[] = result.data;
```

## Task Commits

| Task | Description | Commit |
|------|-------------|--------|
| 1 | Add Zod schemas for external API validation | eff2d93 |
| 2 | Eliminate all any types from import flow | 1e32a05 |

## Next Phase Readiness

**Ready for 07-02 (Chat Flow Type Safety):**
- Pattern established: Zod at boundaries, `unknown` over `any`, type guards
- All import flow files now strictly typed
- Tests confirm no regressions

**Blocker:** None

**Concern:** Test file type errors are pre-existing and outside scope of this phase

## Self-Check: PASSED

All created files exist:
- No new files created (only modifications)

All commits exist:
- eff2d93: feat(07-01): add Zod schemas for external API validation
- 1e32a05: refactor(07-01): eliminate all any types from import flow
