---
phase: 01-dependency-extraction
plan: 01
subsystem: infrastructure
status: complete
completed: 2026-02-07
duration: 4 minutes

requires:
  - production soulprint-rlm repo at /home/drewpullen/clawd/soulprint-rlm

provides:
  - adapters.supabase_adapter module with 100% test coverage
  - download_conversations(storage_path) → List[dict]
  - update_user_profile(user_id, updates) → None
  - save_chunks_batch(user_id, chunks) → None
  - pytest test infrastructure with asyncio support

affects:
  - Phase 2 (processor integration) - processors will import from adapters
  - Phase 3+ (all future phases) - shared adapter layer eliminates code duplication

tech-stack:
  added:
    - pytest>=8.0.0
    - pytest-asyncio>=0.23.0
    - pytest-cov>=4.1.0
    - pytest-httpx>=0.30.0
  patterns:
    - Service layer / adapter pattern for infrastructure isolation
    - TDD with RED-GREEN-REFACTOR cycle
    - Async context managers for httpx.AsyncClient lifecycle
    - Monkeypatch fixtures for environment variable mocking

key-files:
  created:
    - /home/drewpullen/clawd/soulprint-rlm/adapters/__init__.py
    - /home/drewpullen/clawd/soulprint-rlm/adapters/supabase_adapter.py
    - /home/drewpullen/clawd/soulprint-rlm/tests/__init__.py
    - /home/drewpullen/clawd/soulprint-rlm/tests/conftest.py
    - /home/drewpullen/clawd/soulprint-rlm/tests/test_supabase_adapter.py
    - /home/drewpullen/clawd/soulprint-rlm/pytest.ini
  modified:
    - /home/drewpullen/clawd/soulprint-rlm/requirements.txt

decisions:
  - id: ADAPTER-01
    what: Read env vars inside functions (not module-level)
    why: Enables monkeypatch.setenv() to work in tests without module reload
    impact: All adapter functions use os.getenv() in function body
  - id: ADAPTER-02
    what: Use async context managers for httpx.AsyncClient
    why: Prevents event loop conflicts and ensures proper resource cleanup
    impact: Each function creates AsyncClient instance, no global instances
  - id: ADAPTER-03
    what: Default chunk_tier to "medium" if not provided
    why: Supabase schema requires chunk_tier, most chunks are medium context
    impact: Processors can omit chunk_tier in chunk dicts
  - id: ADAPTER-04
    what: Calculate is_recent based on 180-day threshold
    why: Aligns with production's "6 months recent" business logic
    impact: save_chunks_batch enriches chunks automatically

tags:
  - supabase
  - adapters
  - tdd
  - testing
  - httpx
  - async
---

# Phase 1 Plan 1: Supabase Adapter Layer Summary

**One-liner:** Created reusable Supabase adapter layer (download, update, save_chunks) with 100% test coverage using TDD, breaking circular imports between processors and main.py.

## What Was Built

A test-driven adapter layer that extracts three shared Supabase operations from production's inline httpx calls into a reusable module:

1. **download_conversations(storage_path)** - Downloads conversations.json from Supabase Storage
2. **update_user_profile(user_id, updates)** - Updates user_profiles table via REST API
3. **save_chunks_batch(user_id, chunks)** - Bulk inserts conversation chunks with automatic enrichment

All functions use async httpx.AsyncClient context managers, raise exceptions on failures, and have 100% test coverage.

## Implementation Details

### Test Infrastructure (Task 1 - RED)
- Created pytest.ini with `asyncio_mode = auto` for seamless async test support
- Set up tests/conftest.py with `mock_env_vars` autouse fixture (monkeypatch)
- Implemented 17 comprehensive test cases covering success, failure, and edge cases
- Added test dependencies to requirements.txt: pytest, pytest-asyncio, pytest-cov, pytest-httpx
- Initial test run: **15 tests FAILED** (NotImplementedError from stubs) ✓ RED confirmed

### Adapter Implementation (Task 2 - GREEN)
- Implemented full adapter functions following RESEARCH.md patterns
- Environment variables read inside function bodies for testability
- Timeout configuration: 60s for storage/chunks, 30s for profile updates
- save_chunks_batch enrichment logic:
  - Adds user_id to each chunk
  - Calculates is_recent (True if created_at within 180 days)
  - Defaults chunk_tier to "medium" if not provided
  - Defaults message_count to 0 if not provided
  - Handles both timezone-aware and naive datetimes
- Final test run: **17 tests PASSED, 100% coverage** ✓ GREEN confirmed

### Test Coverage Breakdown
| Module | Statements | Coverage |
|--------|------------|----------|
| adapters/__init__.py | 2 | 100% |
| adapters/supabase_adapter.py | 50 | 100% |
| **TOTAL** | **52** | **100%** |

### Test Cases
- **download_conversations:** success (200), failure (404), URL parsing
- **update_user_profile:** success (200/204), failure (400), PATCH verification
- **save_chunks_batch:** success (201), user_id injection, is_recent=True/False, chunk_tier defaults, message_count defaults, no created_at, timezone-aware datetime, invalid datetime, failure (500)

## Task Commits

| Task | Description | Commit | Files Changed |
|------|-------------|--------|---------------|
| 1 | Set up test infrastructure (RED) | 241b3ea | pytest.ini, tests/, adapters/ stubs, requirements.txt |
| 2 | Implement adapter functions (GREEN) | 050cc65 | adapters/supabase_adapter.py, tests/test_supabase_adapter.py |

## Verification Results

All success criteria met:

✓ 17 unit tests pass with 100% coverage on adapters/ module
✓ adapters/supabase_adapter.py exports: download_conversations, update_user_profile, save_chunks_batch
✓ All functions are async and use context-managed httpx.AsyncClient
✓ main.py has zero changes (git diff confirms)
✓ pytest.ini configured, test dependencies in requirements.txt
✓ No circular imports — adapter imports only stdlib + httpx

```bash
# Verification commands executed:
pytest tests/ -v                                      # 17 passed
pytest tests/ --cov=adapters --cov-fail-under=100     # 100% coverage
git diff main.py | wc -l                              # 0 lines changed
python -c "from adapters import ..."                   # All imports clean
```

## Deviations from Plan

### Auto-fixed Issues

**1. [Rule 2 - Missing Critical] Added edge case test coverage**
- **Found during:** Task 2 GREEN phase
- **Issue:** Initial implementation had 94% coverage - missing timezone-aware datetime handling and exception handler paths
- **Fix:** Added two test cases:
  - `test_save_chunks_batch_timezone_aware_datetime` - Tests datetime with Z suffix (timezone-aware)
  - `test_save_chunks_batch_invalid_datetime_format` - Tests invalid datetime string exception handling
- **Files modified:** tests/test_supabase_adapter.py
- **Commit:** 050cc65 (included in Task 2)
- **Rationale:** 100% coverage is a must-have requirement; these edge cases represent real production scenarios (Supabase returns ISO datetimes with Z suffix)

## Technical Notes

### chunk_tier Valid Values
The adapter documents but does not validate chunk_tier enum values:
- **"micro"** - Ultra-precise chunks (~100 chars) for facts, names, dates
- **"medium"** - Context chunks (~500 chars) for topic understanding
- **"macro"** - Flow chunks (~2000 chars) for conversation context

Validation will be added in Phase 2 when processors are integrated.

### is_recent Calculation
Uses naive datetime comparison (UTC assumed). Timezone-aware datetimes are converted to naive by removing tzinfo before comparison. This matches production's expectation that all timestamps are UTC.

### No Retry Logic
Adapters are thin wrappers with no retry logic. If Supabase is down, the adapter raises immediately. Retry logic belongs in higher-level processors where business context exists (e.g., "retry 3 times with exponential backoff").

### httpx.AsyncClient Lifecycle
Each adapter function creates its own AsyncClient instance using `async with` context manager. This pattern:
- Prevents event loop conflicts in tests and production
- Ensures proper connection cleanup even on exceptions
- Works seamlessly with FastAPI's async request handlers

Production main.py will NOT use these adapters until Phase 4 (Progressive Refactor). For now, adapters exist alongside production code for v1.2 processor integration.

## Next Phase Readiness

**Phase 2 (Processor Integration) is READY:**
- ✓ Adapter layer exists with stable public API
- ✓ 100% test coverage provides regression safety net
- ✓ No production code modified (zero risk)
- ✓ Processors can import from adapters immediately

**Blockers:** None

**Concerns:** None - this is a pure additive change with comprehensive test coverage

## Dependencies for Future Work

If you're working on processor integration (Phase 2), import adapters like this:

```python
# In processors/full_pass.py or other processor files
from adapters import download_conversations, update_user_profile, save_chunks_batch

async def run_full_pass_pipeline(user_id: str, storage_path: str):
    conversations = await download_conversations(storage_path)
    chunks = chunk_conversations(conversations)
    await save_chunks_batch(user_id, chunks)
    memory_md = await generate_memory_section(facts, client)
    await update_user_profile(user_id, {"memory_md": memory_md})
```

**DO NOT import from main.py** - that creates circular dependencies. Always import from adapters.

## Performance Metrics

- **Execution time:** 4 minutes (from plan start to SUMMARY creation)
- **Lines of code:** 52 statements in adapters/, 373 statements in tests/
- **Test execution time:** 0.48s for full test suite
- **Test count:** 17 tests (15 from plan + 2 edge cases)

## Self-Check: PASSED

All files exist:
✓ adapters/__init__.py
✓ adapters/supabase_adapter.py
✓ tests/__init__.py
✓ tests/conftest.py
✓ tests/test_supabase_adapter.py
✓ pytest.ini

All commits exist:
✓ 241b3ea (Task 1 - RED)
✓ 050cc65 (Task 2 - GREEN)
