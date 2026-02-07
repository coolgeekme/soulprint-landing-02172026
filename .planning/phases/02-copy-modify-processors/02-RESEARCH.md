# Phase 2: Copy & Modify Processors - Research

**Researched:** 2026-02-06
**Domain:** Python processor module migration and Docker containerization
**Confidence:** HIGH

## Summary

Phase 2 involves copying 5 processor modules from v1.2 (soulprint-landing/rlm-service/processors/) to production (soulprint-rlm/processors/) and modifying their imports to use the adapter layer created in Phase 1. The research reveals that this is primarily an import refactoring task with Docker build verification, not a complex architectural change.

The 5 v1.2 processor modules are standalone Python files with minimal interdependencies. They use standard library imports (json, asyncio, datetime) and external libraries already in production (anthropic, httpx). The main modification required is replacing direct Supabase calls and `from main import` statements with adapter imports. The production Dockerfile is simple and needs only two COPY directives added for the new directories.

**Primary recommendation:** Use a systematic approach - copy modules as-is, apply targeted import replacements using a mapping table, add Dockerfile directives, write focused unit tests for processor-specific logic (not adapter calls), and verify build success before committing.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Python | 3.12 | Runtime environment | Production already using 3.12-slim base image |
| FastAPI | >=0.109.0 | Web framework | Production RLM service built on FastAPI |
| anthropic | >=0.18.0 | Claude API client | Already in production for AI calls |
| httpx | >=0.26.0 | Async HTTP client | Production uses for Supabase REST calls |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| pytest | >=8.0.0 | Testing framework | Already installed, used for adapter tests |
| pytest-asyncio | >=0.23.0 | Async test support | Required for async processor functions |
| pytest-cov | >=4.1.0 | Code coverage | Production has 100% adapter coverage target |
| pytest-httpx | >=0.30.0 | HTTP mocking | Mock external API calls in tests |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| pytest | unittest | pytest already established, no benefit to switching |
| httpx | requests | httpx async support required for processor functions |
| Direct copy | Git subtree merge | Too complex for 5 files, manual copy more transparent |

**Installation:**
All dependencies already in production requirements.txt. No new packages needed.

## Architecture Patterns

### Recommended Project Structure
```
soulprint-rlm/
├── adapters/
│   ├── __init__.py           # Exports: download_conversations, update_user_profile, save_chunks_batch
│   └── supabase_adapter.py   # Phase 1 adapter (complete)
├── processors/
│   ├── __init__.py           # Package marker
│   ├── conversation_chunker.py    # Chunk conversations into segments
│   ├── fact_extractor.py          # Parallel fact extraction via Haiku
│   ├── memory_generator.py        # Generate MEMORY section from facts
│   ├── v2_regenerator.py          # Regenerate 5 sections with more data
│   └── full_pass.py               # Orchestrator for complete pipeline
├── tests/
│   ├── conftest.py           # Shared fixtures
│   ├── test_supabase_adapter.py   # Adapter tests (complete)
│   └── test_processors.py    # Processor unit tests (to be created)
├── main.py                   # FastAPI app (unchanged in Phase 2)
├── Dockerfile                # Updated to COPY processors/ and adapters/
├── requirements.txt          # Already complete
└── pytest.ini               # Already configured
```

### Pattern 1: Import Replacement Strategy

**What:** Systematic replacement of v1.2 imports with production adapter imports

**When to use:** When copying each processor module from v1.2 to production

**Mapping table:**

| v1.2 Import | Production Import | Affected Files |
|-------------|-------------------|----------------|
| `from main import download_conversations` | `from adapters import download_conversations` | full_pass.py |
| `from main import update_user_profile` | `from adapters import update_user_profile` | full_pass.py |
| `from main import save_chunks_batch` | Remove (local copy exists) | full_pass.py |
| `SUPABASE_URL = os.getenv(...)` | Remove (adapter handles) | full_pass.py |
| `SUPABASE_SERVICE_KEY = os.getenv(...)` | Remove (adapter handles) | full_pass.py |
| `async def delete_user_chunks(...)` | Keep as-is (processor-specific) | full_pass.py |
| `async def save_chunks_batch(...)` | Replace with `from adapters import save_chunks_batch` | full_pass.py |

**Example - full_pass.py before:**
```python
import os
from main import download_conversations, update_user_profile

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

async def save_chunks_batch(user_id: str, chunks: List[dict]):
    # Local implementation using SUPABASE_URL/KEY
    ...
```

**Example - full_pass.py after:**
```python
from adapters import download_conversations, update_user_profile, save_chunks_batch

# No env var reading needed - adapter handles it

async def delete_user_chunks(user_id: str):
    # Keep processor-specific helper functions
    ...
```

### Pattern 2: Dockerfile Incremental Build Strategy

**What:** Add processor and adapter directories with import verification

**When to use:** After modules copied and imports modified

**Current production Dockerfile (lines 14-15):**
```dockerfile
# Copy app
COPY main.py .
```

**Updated Dockerfile:**
```dockerfile
# Copy adapters and processors first
COPY adapters/ ./adapters/
COPY processors/ ./processors/

# Copy main app
COPY main.py .

# Verify all modules can be imported at build time (fail fast)
RUN python -c "from adapters import download_conversations, update_user_profile, save_chunks_batch; print('Adapters OK')"
RUN python -c "from processors import conversation_chunker, fact_extractor, memory_generator, v2_regenerator, full_pass; print('Processors OK')"
```

**Why this pattern:**
- Fail fast if imports broken (build fails, not runtime)
- Layer caching: adapters/processors change less than main.py
- Explicit verification step documents intent

### Pattern 3: Test Structure for Processors

**What:** Unit tests focus on processor logic, not adapter calls (those are mocked)

**When to use:** Testing processor-specific algorithms and transformations

**Structure:**
```python
# tests/test_processors.py
import pytest
from processors.conversation_chunker import chunk_conversations, estimate_tokens
from processors.fact_extractor import consolidate_facts
from processors.memory_generator import _fallback_memory

# Test pure functions (no external calls)
def test_estimate_tokens():
    assert estimate_tokens("test") == 1  # 4 chars / 4

def test_chunk_conversations_small():
    # Test chunking logic with mock data
    convs = [{"id": "1", "title": "Test", "messages": [...]}]
    chunks = chunk_conversations(convs, target_tokens=100)
    assert len(chunks) >= 1

# Test with mocked external dependencies
@pytest.mark.anyio
async def test_fact_extraction_integration(httpx_mock):
    # Mock Anthropic API responses
    httpx_mock.add_response(
        url="https://api.anthropic.com/v1/messages",
        json={"content": [{"text": '{"preferences": [...]}'}]}
    )
    # Test fact extraction flow
    ...
```

**Don't test:**
- Adapter functions (already tested in test_supabase_adapter.py)
- External API behavior (mock with pytest-httpx)
- Full pipeline end-to-end (that's Phase 4 integration testing)

**Do test:**
- Token estimation accuracy
- Chunk boundary detection
- Fact consolidation deduplication
- Fallback behavior when APIs fail
- Format conversion functions

### Anti-Patterns to Avoid

- **Modifying processor logic during copy:** Copy first, verify it works, then refactor later if needed
- **Changing function signatures:** Keep processor APIs identical to v1.2 for now
- **Testing adapter behavior in processor tests:** Adapters have their own test file
- **Adding new features during migration:** Phase 2 is about copying, not enhancing
- **Skipping import verification in Dockerfile:** Fail at build time, not runtime

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Module import verification | Shell script that manually imports each file | Python `importlib` or simple `-c` import statements | Build-time verification catches errors before deploy |
| Test fixtures for conversations | Hardcode JSON in each test | Shared pytest fixture in conftest.py | DRY principle, consistent test data |
| Async test runner | Custom event loop setup | pytest-asyncio with `asyncio_mode = auto` | Already configured in pytest.ini |
| HTTP mocking | Manual mock classes | pytest-httpx plugin | Already in requirements.txt, cleaner API |

**Key insight:** Production has already established testing patterns (conftest.py, pytest-httpx, async fixtures). Follow existing patterns rather than inventing new ones.

## Common Pitfalls

### Pitfall 1: Circular Import Between Processors and Main

**What goes wrong:** Processors try to import from main.py, main.py tries to import processors, Python raises ImportError

**Why it happens:** v1.2 was written with `from main import download_conversations` assuming processors would be in same repo as main.py

**How to avoid:**
1. NEVER import from main.py in processors
2. Use adapter imports exclusively: `from adapters import download_conversations`
3. Verify with build-time import check in Dockerfile

**Warning signs:**
- ImportError mentioning "circular import"
- Container fails to start with module import error
- Python interpreter hangs during import

### Pitfall 2: Local Function Shadowing Adapter Function

**What goes wrong:** Processor defines `async def save_chunks_batch(...)` locally AND imports from adapter, causing confusion about which gets called

**Why it happens:** v1.2 full_pass.py has local implementations of save_chunks_batch and delete_user_chunks for different behavior

**How to avoid:**
- Keep `delete_user_chunks()` local (it's processor-specific delete logic)
- Remove local `save_chunks_batch()` implementation
- Import adapter version: `from adapters import save_chunks_batch`
- Rename local version if different behavior needed: `async def save_chunks_no_enrichment(...)`

**Warning signs:**
- Function behaves differently than expected
- Chunks missing user_id or is_recent fields
- Tests pass but runtime fails

### Pitfall 3: Missing Processor __init__.py

**What goes wrong:** `from processors import full_pass` fails with "No module named 'processors'"

**Why it happens:** Python requires __init__.py to treat directory as package

**How to avoid:**
1. Create processors/__init__.py (even if empty)
2. Add docstring explaining package purpose
3. Verify with Dockerfile import check

**Warning signs:**
- ModuleNotFoundError for processors package
- Import works in dev but fails in Docker

### Pitfall 4: Env Vars Read at Module Level

**What goes wrong:** Tests can't monkeypatch environment variables because they're read when module imports

**Why it happens:** Phase 1 established pattern of reading env vars inside functions, v1.2 reads at module level

**How to avoid:**
- v1.2 full_pass.py has `SUPABASE_URL = os.getenv("SUPABASE_URL")` at top
- Remove these lines completely
- Adapter functions handle env var reading internally
- Keep only processor-specific config (like ANTHROPIC_API_KEY for local client creation)

**Warning signs:**
- Tests fail with "SUPABASE_URL not set" even after monkeypatch
- Adapter tests pass but processor tests fail

### Pitfall 5: Dockerfile Layer Cache Invalidation

**What goes wrong:** Every code change rebuilds entire image from scratch, slowing down iteration

**Why it happens:** COPY directives ordered incorrectly - frequently changing files copied early

**How to avoid:**
- Order: requirements.txt → adapters/ → processors/ → main.py
- Rationale: requirements change least, main.py changes most
- Result: Only layers after changed file rebuild

**Warning signs:**
- Docker build takes 2+ minutes on small code change
- "Installing packages" step runs every build
- Build time doesn't improve on subsequent builds

## Code Examples

Verified patterns from this codebase:

### Example 1: Processor Module Header (After Modification)

```python
"""
Full Pass Pipeline Orchestrator
Downloads conversations, chunks them, extracts facts, generates MEMORY section
"""
import json
import anthropic
from datetime import datetime, timedelta
from typing import List, Dict

# Import from adapter layer (NOT from main)
from adapters import download_conversations, update_user_profile, save_chunks_batch


async def delete_user_chunks(user_id: str):
    """Processor-specific helper - keep in full_pass.py"""
    ...
```

**Source:** Pattern derived from /home/drewpullen/clawd/soulprint-rlm/adapters/supabase_adapter.py (Phase 1) and /home/drewpullen/clawd/soulprint-landing/rlm-service/processors/full_pass.py (v1.2)

### Example 2: Processor __init__.py

```python
"""
SoulPrint RLM Service - Processors Package
Background processing modules for full pass pipeline

Modules:
- conversation_chunker: Split conversations into segments
- fact_extractor: Parallel fact extraction via Claude
- memory_generator: Generate MEMORY section from facts
- v2_regenerator: Regenerate sections with more data
- full_pass: Orchestrate complete pipeline
"""
```

**Source:** /home/drewpullen/clawd/soulprint-landing/rlm-service/processors/__init__.py (v1.2 baseline)

### Example 3: Simple Processor Unit Test

```python
"""Unit tests for conversation chunker."""
import pytest
from processors.conversation_chunker import estimate_tokens, chunk_conversations


def test_estimate_tokens_basic():
    """Test token estimation for known strings."""
    assert estimate_tokens("test") == 1  # 4 chars / 4 = 1 token
    assert estimate_tokens("a" * 40) == 10  # 40 chars / 4 = 10 tokens


def test_chunk_conversations_fits_single_chunk():
    """Test small conversation stays as single chunk."""
    conversations = [{
        "id": "conv-1",
        "title": "Short Chat",
        "messages": [
            {"role": "user", "content": "Hi"},
            {"role": "assistant", "content": "Hello"}
        ],
        "created_at": "2024-01-01T00:00:00"
    }]

    chunks = chunk_conversations(conversations, target_tokens=2000)

    assert len(chunks) == 1
    assert chunks[0]["chunk_index"] == 0
    assert chunks[0]["total_chunks"] == 1
    assert chunks[0]["chunk_tier"] == "medium"
```

**Source:** Adapted from /home/drewpullen/clawd/soulprint-rlm/tests/test_supabase_adapter.py testing patterns

### Example 4: Dockerfile Build Verification

```dockerfile
FROM python:3.12-slim

WORKDIR /app

# Install git (required for pip install from GitHub)
RUN apt-get update && \
    apt-get install -y --no-install-recommends git && \
    rm -rf /var/lib/apt/lists/*

# Copy and install requirements first (for caching)
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# Copy application code in order of change frequency
COPY adapters/ ./adapters/
COPY processors/ ./processors/
COPY main.py .

# Verify imports work at build time (fail fast)
RUN python -c "from adapters import download_conversations, update_user_profile, save_chunks_batch; print('✓ Adapters import OK')" && \
    python -c "from processors.conversation_chunker import chunk_conversations; from processors.fact_extractor import extract_facts_parallel; from processors.memory_generator import generate_memory_section; from processors.v2_regenerator import regenerate_sections_v2; from processors.full_pass import run_full_pass_pipeline; print('✓ Processors import OK')"

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD python -c "import httpx; httpx.get('http://localhost:${PORT:-10000}/health').raise_for_status()"

# Expose port
EXPOSE 10000

# Run
CMD ["sh", "-c", "uvicorn main:app --host 0.0.0.0 --port ${PORT:-10000}"]
```

**Source:** /home/drewpullen/clawd/soulprint-rlm/Dockerfile (production baseline) with Phase 2 modifications

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Monolithic main.py (3600 lines) | Modular processors/ directory | v1.2 (Feb 2026) | Better testability, clearer responsibilities |
| Import from main.py | Import from adapters/ | Phase 1 complete | Breaks circular dependencies |
| Manual Supabase calls | Adapter layer | Phase 1 complete | Consistent env var handling, easier testing |
| Runtime import failures | Build-time import verification | Phase 2 pattern | Fail fast, safer deploys |

**Deprecated/outdated:**
- Direct Supabase REST API calls in processors: Use adapter functions instead
- Module-level env var reading: Read inside functions for testability
- Single-file processor implementations: Modular files with clear boundaries

## Research Findings

### 1. The 5 Processor Modules

| Module | Lines | Purpose | External Dependencies | Imports to Modify |
|--------|-------|---------|----------------------|-------------------|
| conversation_chunker.py | 249 | Split conversations into ~2000 token segments | datetime, typing | None (pure logic) |
| fact_extractor.py | 357 | Parallel fact extraction via Claude Haiku 4.5 | json, asyncio, typing | None (pure logic) |
| memory_generator.py | 124 | Generate MEMORY markdown from facts | json | None (pure logic) |
| v2_regenerator.py | 363 | Regenerate 5 sections with top 200 conversations | json, typing, datetime | None (pure logic) |
| full_pass.py | 216 | Orchestrate complete pipeline | os, json, httpx, anthropic, datetime, typing | **CRITICAL**: Lines 14-15 (env vars), line 140 (download_conversations), line 185-186 (update_user_profile), lines 47-104 (save_chunks_batch) |

**Key finding:** Only `full_pass.py` needs import modifications. The other 4 modules are pure processing logic with no Supabase dependencies.

### 2. Import Modifications Required

**full_pass.py specific changes:**

```python
# REMOVE these lines (14-15):
SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_SERVICE_KEY = os.getenv("SUPABASE_SERVICE_KEY")

# REMOVE these lines (18-45): delete_user_chunks function
# Reason: Adapter's save_chunks_batch will handle delete-first pattern

# REMOVE these lines (47-104): save_chunks_batch function
# Reason: Adapter version has this with 180-day is_recent logic

# REPLACE line 140:
from main import download_conversations
# WITH:
from adapters import download_conversations

# REPLACE line 185:
from main import update_user_profile
# WITH:
from adapters import update_user_profile

# ADD at top after other imports:
from adapters import save_chunks_batch
```

**All other modules:** Copy as-is with no modifications.

### 3. Dockerfile Changes Needed

**Current production Dockerfile** (line 15):
```dockerfile
COPY main.py .
```

**Updated Dockerfile** (insert before line 15):
```dockerfile
# Copy adapters and processors
COPY adapters/ ./adapters/
COPY processors/ ./processors/

# Verify imports at build time
RUN python -c "from adapters import download_conversations; from processors.full_pass import run_full_pass_pipeline; print('Import verification passed')"

# Copy main app
COPY main.py .
```

**Rationale:**
- Adapters/processors copied before main.py for layer caching
- Import verification catches errors at build time
- Single RUN command keeps layer count low

### 4. Test Structure Recommendations

**Create tests/test_processors.py** with these test categories:

1. **Pure function tests** (no mocks needed):
   - `test_estimate_tokens_accuracy()`
   - `test_chunk_conversations_single_chunk()`
   - `test_chunk_conversations_overlap()`
   - `test_consolidate_facts_deduplication()`
   - `test_fallback_memory_generation()`

2. **Integration tests with mocked APIs** (use pytest-httpx):
   - `test_extract_facts_parallel_success()`
   - `test_generate_memory_section_success()`
   - `test_regenerate_sections_v2_success()`

3. **Error handling tests**:
   - `test_fact_extraction_continues_on_chunk_failure()`
   - `test_memory_generation_fallback_on_api_error()`
   - `test_v2_regeneration_none_on_parse_error()`

**Don't test in processor tests:**
- Adapter function behavior (test_supabase_adapter.py covers that)
- Supabase API responses (adapters handle that)
- Full pipeline end-to-end (that's Phase 4)

### 5. Incompatibilities Found

| Issue | v1.2 Behavior | Production Behavior | Resolution |
|-------|---------------|---------------------|------------|
| Chunk deletion | full_pass.py deletes chunks before save | Adapter save_chunks_batch doesn't delete | Keep delete_user_chunks in full_pass.py, call before first batch |
| Environment variables | Read at module level | Adapter reads inside functions | Remove module-level reads from full_pass.py |
| save_chunks_batch signature | Local version has different enrichment | Adapter version adds user_id, is_recent, defaults | Use adapter version, remove local implementation |
| Anthropic client creation | Processors create their own | Production might have global client | Keep processor-local creation (no production conflict) |

**Critical finding:** No blocking incompatibilities. All issues resolved with targeted import replacements in full_pass.py only.

### 6. Missing Dependencies Check

**Production requirements.txt** already has all needed packages:
- ✅ anthropic>=0.18.0
- ✅ httpx>=0.26.0
- ✅ pytest>=8.0.0
- ✅ pytest-asyncio>=0.23.0

**No new dependencies required.**

## Open Questions

1. **Should delete_user_chunks stay in full_pass.py?**
   - What we know: Adapter's save_chunks_batch doesn't delete existing chunks
   - What's unclear: Is delete-first pattern still needed or should adapter handle it?
   - Recommendation: Keep in full_pass.py for Phase 2, refactor into adapter in Phase 4 if pattern proves reusable

2. **Should processors/__init__.py export functions?**
   - What we know: v1.2 __init__.py is minimal docstring only
   - What's unclear: Should we add `from .full_pass import run_full_pass_pipeline` exports?
   - Recommendation: Keep minimal for Phase 2 - explicit imports (`from processors.full_pass import ...`) are clearer

3. **Test coverage target for processors?**
   - What we know: Adapters have 100% coverage requirement
   - What's unclear: Should processors also target 100%?
   - Recommendation: Target 80%+ for Phase 2 (focus on critical paths), increase in Phase 4 after integration testing

## Sources

### Primary (HIGH confidence)
- /home/drewpullen/clawd/soulprint-landing/rlm-service/processors/ (5 v1.2 modules, inspected directly)
- /home/drewpullen/clawd/soulprint-rlm/adapters/supabase_adapter.py (Phase 1 adapter, verified)
- /home/drewpullen/clawd/soulprint-rlm/Dockerfile (production baseline, reviewed)
- /home/drewpullen/clawd/soulprint-rlm/requirements.txt (dependencies list, confirmed)
- /home/drewpullen/clawd/soulprint-landing/.planning/ROADMAP.md (Phase 2 requirements)
- /home/drewpullen/clawd/soulprint-landing/.planning/STATE.md (Phase 1 decisions)
- /home/drewpullen/clawd/soulprint-landing/.planning/REQUIREMENTS.md (MERGE-01, MERGE-04)

### Secondary (MEDIUM confidence)
- Production test patterns from tests/test_supabase_adapter.py (established patterns to follow)
- pytest.ini configuration (asyncio_mode, test paths)

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - All dependencies verified in production requirements.txt
- Architecture: HIGH - Patterns derived from Phase 1 adapter implementation and v1.2 codebase
- Pitfalls: HIGH - Based on circular import patterns and adapter design decisions from Phase 1

**Research date:** 2026-02-06
**Valid until:** 2026-03-06 (30 days - stable Python/Docker ecosystem)

---

## Planning Checklist

Planner should use this research to create tasks for:

1. ✅ Copy 5 processor modules from v1.2 to production
2. ✅ Modify full_pass.py imports (only file needing changes)
3. ✅ Remove full_pass.py duplicate functions (save_chunks_batch, env vars)
4. ✅ Create processors/__init__.py
5. ✅ Update Dockerfile with COPY directives and import verification
6. ✅ Write processor unit tests (focus on pure functions)
7. ✅ Verify Docker build succeeds locally
8. ✅ Run test suite and confirm all pass
9. ✅ Commit with clear message about Phase 2 completion

**Ready for planning:** All research complete, no blockers identified.
