# Phase 1: Core Migration - RLM Pipeline with Streaming - Research

**Researched:** 2026-02-09
**Domain:** Python FastAPI streaming import pipeline, Supabase Storage integration, AWS Bedrock
**Confidence:** HIGH

## Summary

Phase 1 migrates all heavy import processing from Vercel serverless (1GB RAM, 300s timeout) to RLM service on Render with streaming JSON parsing for constant-memory processing of any size ChatGPT export. Current implementation downloads and parses entire exports in Vercel's process-server endpoint, causing OOM failures on 300MB+ files. The target architecture uses Vercel as a thin authentication proxy that triggers RLM processing and returns 202 Accepted immediately, while RLM streams the download from Supabase Storage, uses ijson for constant-memory JSON parsing, and updates database progress throughout.

Research confirms ijson is the standard Python library for streaming JSON parsing with constant memory usage. httpx provides streaming download capabilities via `httpx.stream()` and `iter_bytes()`. The Anthropic SDK supports AWS Bedrock via `anthropic[bedrock]` package, providing cleaner API than boto3's Converse API. FastAPI's BackgroundTasks handles lightweight async jobs, but long-running imports require fire-and-forget HTTP trigger pattern. Database progress tracking follows the standard "job status table" pattern with progress_percent, stage, and timestamps.

**Primary recommendation:** Use ijson streaming parser → httpx streaming download → Anthropic SDK with Bedrock → FastAPI endpoint that returns 202 immediately → database progress tracking via update_user_profile helper.

## Standard Stack

The established libraries/tools for this domain:

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| ijson | 3.3.0+ | Streaming JSON parser | Industry standard for constant-memory JSON parsing, handles multi-GB files |
| httpx | 0.26.0+ | Async HTTP with streaming | Official async HTTP library, built-in streaming support via `stream()` context manager |
| anthropic | 0.18.0+ | Anthropic SDK with Bedrock | Official SDK, cleaner API than boto3, supports Bedrock via `anthropic[bedrock]` extra |
| FastAPI | 0.109.0+ | Async web framework | Already in use, BackgroundTasks for async jobs |
| supabase-py | 2.13.0+ | Supabase Python client | Official Supabase SDK for Storage downloads |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| boto3 | 1.34.0+ | AWS SDK for Bedrock | Alternative to Anthropic SDK if using Converse API directly |
| memory_profiler | 0.61.0+ | Memory usage profiling | Development/debugging memory leaks in streaming pipeline |
| gzip (stdlib) | N/A | Decompress Storage files | Supabase Storage files may be gzipped |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| ijson | json-stream | ijson more mature, better documentation, proven at scale |
| httpx | requests + iter_content | httpx native async, better for FastAPI integration |
| anthropic[bedrock] | boto3 ConverseCommand | boto3 more verbose, anthropic SDK cleaner for LLM calls |

**Installation:**
```bash
# RLM service (rlm-service/requirements.txt)
ijson>=3.3.0
anthropic[bedrock]>=0.18.0
httpx>=0.26.0
supabase>=2.13.0
fastapi>=0.109.0
uvicorn>=0.27.0
python-dotenv>=1.0.0

# Optional for development
memory-profiler>=0.61.0  # memory debugging
```

## Architecture Patterns

### Recommended Project Structure
```
rlm-service/
├── main.py                           # FastAPI app with /import-full endpoint
├── processors/
│   ├── streaming_parser.py          # ijson ChatGPT export parser
│   ├── quick_pass.py                 # Haiku 4.5 via Bedrock
│   └── storage_downloader.py        # Supabase Storage streaming download
├── lib/
│   ├── bedrock_client.py            # Anthropic SDK Bedrock wrapper
│   └── progress_tracker.py          # Database progress updates
└── requirements.txt
```

### Pattern 1: Streaming JSON Parsing with ijson
**What:** Parse large JSON files (300MB-2GB) with constant memory usage
**When to use:** ChatGPT exports can be 300MB+ uncompressed, traditional json.loads() causes OOM
**Example:**
```python
# Source: https://github.com/ICRAR/ijson
import ijson
import httpx

async def parse_chatgpt_export_streaming(file_stream):
    """Parse ChatGPT conversations.json with constant memory."""
    conversations = []

    # ijson iterates over JSON array items without loading entire file
    parser = ijson.items(file_stream, 'item')

    for conversation in parser:
        # Each conversation is a dict with 'mapping', 'title', 'create_time'
        # Process one at a time — memory usage is constant
        conversations.append(parse_conversation(conversation))

        # Optional: yield for true streaming (generator pattern)
        if len(conversations) >= 100:
            yield conversations
            conversations = []
```

### Pattern 2: Streaming Download from Supabase Storage
**What:** Download large files from Supabase Storage without loading into RAM
**When to use:** Files >100MB should be streamed chunk-by-chunk to avoid memory spikes
**Example:**
```python
# Source: https://www.python-httpx.org/quickstart/
import httpx
from supabase import create_client

async def download_from_storage_streaming(bucket: str, path: str):
    """Stream download from Supabase Storage with constant memory."""
    # Get signed URL from Supabase (or use service role key)
    supabase = create_client(SUPABASE_URL, SUPABASE_SERVICE_KEY)

    # Supabase storage download URL
    url = f"{SUPABASE_URL}/storage/v1/object/{bucket}/{path}"

    async with httpx.AsyncClient() as client:
        async with client.stream('GET', url, headers={
            'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}'
        }) as response:
            # Stream bytes in chunks (default 64KB)
            async for chunk in response.aiter_bytes():
                yield chunk  # Process or write chunk-by-chunk
```

### Pattern 3: Bedrock Haiku 4.5 via Anthropic SDK
**What:** Call AWS Bedrock Claude models using Anthropic SDK instead of boto3
**When to use:** Quick pass generation needs Haiku 4.5 from Python RLM service
**Example:**
```python
# Source: https://docs.anthropic.com/en/api/claude-on-amazon-bedrock
from anthropic import AnthropicBedrock

# Install: pip install anthropic[bedrock]
# Set: AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION

client = AnthropicBedrock(
    aws_access_key=AWS_ACCESS_KEY_ID,
    aws_secret_key=AWS_SECRET_ACCESS_KEY,
    aws_region=AWS_REGION,  # e.g., us-east-1
)

message = client.messages.create(
    model="us.anthropic.claude-haiku-4-5-20251001-v1:0",
    max_tokens=8192,
    temperature=0.7,
    system="You are a personality analyzer...",
    messages=[{"role": "user", "content": formatted_conversations}]
)

result = message.content[0].text
```

### Pattern 4: Fire-and-Forget Long-Running Jobs
**What:** FastAPI endpoint returns 202 Accepted immediately, processes async in background
**When to use:** Import takes 30-300s, cannot block HTTP request (Vercel proxy has timeout)
**Example:**
```python
# Source: https://fastapi.tiangolo.com/tutorial/background-tasks/
from fastapi import FastAPI, BackgroundTasks
import asyncio

app = FastAPI()

async def process_import_job(user_id: str, storage_path: str):
    """Long-running import pipeline — runs independently."""
    try:
        await update_progress(user_id, 0, "Downloading export")
        file_stream = await download_streaming(storage_path)

        await update_progress(user_id, 20, "Parsing conversations")
        conversations = await parse_streaming(file_stream)

        await update_progress(user_id, 50, "Generating soulprint")
        soulprint = await quick_pass(conversations)

        await update_progress(user_id, 100, "Complete")
    except Exception as e:
        await update_status(user_id, 'failed', str(e))

@app.post("/import-full")
async def import_full(request: ImportRequest):
    """Accept import job, return 202 immediately."""
    # Don't use BackgroundTasks for long jobs (>60s) — fire asyncio task
    asyncio.create_task(process_import_job(request.user_id, request.storage_path))
    return {"status": "accepted", "message": "Processing started"}, 202
```

### Pattern 5: Database Progress Tracking
**What:** Update user_profiles table with progress_percent and stage throughout pipeline
**When to use:** User needs real-time progress updates, frontend polls database
**Example:**
```python
# Source: https://medium.com/@AlexanderObregon/tracking-background-job-status-with-spring-boot-and-a-database-table-5cf184a419c9
import httpx

async def update_progress(user_id: str, percent: int, stage: str):
    """Update user_profiles.progress_percent and import_stage."""
    async with httpx.AsyncClient() as client:
        await client.patch(
            f"{SUPABASE_URL}/rest/v1/user_profiles?user_id=eq.{user_id}",
            json={
                "progress_percent": percent,
                "import_stage": stage,
                "updated_at": datetime.utcnow().isoformat()
            },
            headers={
                "apikey": SUPABASE_SERVICE_KEY,
                "Authorization": f"Bearer {SUPABASE_SERVICE_KEY}",
                "Content-Type": "application/json"
            }
        )
```

### Anti-Patterns to Avoid
- **Loading entire JSON before parsing:** Traditional `json.loads()` reads entire file into RAM — causes OOM on large exports
- **Synchronous downloads in async context:** Using `requests` library blocks event loop — use httpx.AsyncClient
- **BackgroundTasks for long jobs:** FastAPI BackgroundTasks tied to request lifecycle — use asyncio.create_task for >60s jobs
- **boto3 for Bedrock when anthropic SDK available:** boto3 ConverseCommand more verbose, anthropic SDK cleaner API
- **Missing progress updates:** Users see "processing" for 5+ minutes with no feedback — update every major stage

## Don't Hand-Roll

Problems that look simple but have existing solutions:

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Streaming JSON parsing | Custom incremental parser | ijson library | Handles edge cases (nested arrays, escaped quotes, multi-GB files), battle-tested |
| Streaming HTTP downloads | Manual chunk reading | httpx.stream() + aiter_bytes() | Handles connection errors, retries, proper cleanup |
| AWS Bedrock API calls | Raw boto3 ConverseCommand | anthropic[bedrock] SDK | Cleaner API, automatic retries, better error messages |
| Progress tracking | Custom WebSocket server | Database polling pattern | Over-engineered for import use case, DB polling sufficient |
| File format detection | Custom ZIP/JSON detection | Check file extension + try/except | ZIP vs JSON distinction is simple, don't overcomplicate |

**Key insight:** Streaming pipelines have subtle edge cases (incomplete chunks, connection drops, memory leaks). Use proven libraries that handle these.

## Common Pitfalls

### Pitfall 1: Memory Leaks in Streaming Pipeline
**What goes wrong:** Despite using ijson, memory usage grows unbounded over time
**Why it happens:** Accumulating parsed conversations in a list instead of processing/discarding incrementally
**How to avoid:** Use generator pattern — yield results immediately, don't accumulate in memory
**Warning signs:** Memory usage grows linearly with file size despite using streaming parser
```python
# BAD: Accumulates all conversations in RAM
async def parse_all_conversations(stream):
    conversations = []
    for item in ijson.items(stream, 'item'):
        conversations.append(item)  # Memory grows
    return conversations

# GOOD: Process incrementally
async def parse_conversations_streaming(stream):
    for conversation in ijson.items(stream, 'item'):
        yield process_conversation(conversation)  # Constant memory
```

### Pitfall 2: Supabase Storage Download Without Streaming
**What goes wrong:** RLM service OOMs downloading 300MB+ files from Storage
**Why it happens:** Using `supabase.storage.from_().download()` loads entire file into bytes object
**How to avoid:** Use httpx.stream() with Storage URL and service role key authorization
**Warning signs:** RLM crashes on large files despite using ijson (download happens before parsing)
```python
# BAD: Loads entire file into RAM before parsing
file_data = supabase.storage.from_('user-imports').download(path)
conversations = ijson.items(file_data, 'item')  # Too late, already in RAM

# GOOD: Stream download directly to parser
async with httpx.AsyncClient() as client:
    async with client.stream('GET', storage_url) as response:
        # Feed response stream directly to ijson
        for conv in ijson.items(response.aiter_bytes(), 'item'):
            yield conv
```

### Pitfall 3: Blocking Event Loop with boto3
**What goes wrong:** FastAPI endpoint hangs, other requests timeout
**Why it happens:** boto3 is synchronous, blocks async event loop when calling Bedrock
**How to avoid:** Use anthropic SDK with async support, or wrap boto3 in `asyncio.to_thread()`
**Warning signs:** Single import blocks all RLM requests, CPU usage near 100% on single core
```python
# BAD: boto3 blocks event loop
import boto3
async def quick_pass(conversations):
    client = boto3.client('bedrock-runtime')
    response = client.converse(...)  # Blocks entire FastAPI app

# GOOD: anthropic SDK with async
from anthropic import AsyncAnthropicBedrock
async def quick_pass(conversations):
    client = AsyncAnthropicBedrock(...)
    response = await client.messages.create(...)  # Non-blocking
```

### Pitfall 4: Missing Progress Updates
**What goes wrong:** User sees "Processing..." for 5+ minutes with no indication of progress
**Why it happens:** Progress updates only at start/end, not during long-running stages
**How to avoid:** Update progress_percent at every major stage (download, parse, quick pass, chunk)
**Warning signs:** Users abandon imports thinking they're stuck, no way to debug slow stages
```python
# BAD: Only start/end updates
await update_progress(user_id, 0, "Processing")
# ... 5 minutes of work ...
await update_progress(user_id, 100, "Complete")

# GOOD: Updates at every stage
await update_progress(user_id, 0, "Downloading export")
# download...
await update_progress(user_id, 20, "Parsing conversations")
# parse...
await update_progress(user_id, 50, "Generating soulprint")
# quick pass...
await update_progress(user_id, 80, "Creating memory chunks")
# chunk...
await update_progress(user_id, 100, "Complete")
```

### Pitfall 5: Error Messages Without Context
**What goes wrong:** Import fails with "Processing failed", no actionable information
**Why it happens:** Generic catch-all exception handler doesn't preserve error details
**How to avoid:** Log full stack trace, save specific error message to import_error column
**Warning signs:** Users report failures but can't reproduce, no way to debug production issues
```python
# BAD: Generic error
try:
    await process_import()
except Exception:
    await update_status(user_id, 'failed', 'Processing failed')

# GOOD: Specific error with context
try:
    await process_import()
except ijson.JSONError as e:
    error_msg = f"Invalid JSON format at position {e.pos}: {e.msg}"
    logger.error(f"Import failed for {user_id}: {error_msg}", exc_info=True)
    await update_status(user_id, 'failed', error_msg)
except httpx.HTTPError as e:
    error_msg = f"Storage download failed: {e.response.status_code}"
    logger.error(f"Import failed for {user_id}: {error_msg}", exc_info=True)
    await update_status(user_id, 'failed', error_msg)
```

## Code Examples

Verified patterns from official sources:

### Complete Streaming Import Pipeline
```python
# Source: Patterns from ijson, httpx, anthropic SDK official docs
import ijson
import httpx
from anthropic import AsyncAnthropicBedrock
from datetime import datetime

async def import_full_streaming(user_id: str, storage_path: str):
    """
    Complete streaming import pipeline with constant memory usage.

    Stages:
    1. Stream download from Supabase Storage (httpx.stream)
    2. Parse conversations incrementally (ijson)
    3. Generate quick pass soulprint (Bedrock Haiku 4.5)
    4. Update database progress throughout
    """
    try:
        # Stage 1: Download (0-20%)
        await update_progress(user_id, 0, "Downloading export")

        storage_url = f"{SUPABASE_URL}/storage/v1/object/{storage_path}"

        async with httpx.AsyncClient() as http_client:
            async with http_client.stream('GET', storage_url, headers={
                'Authorization': f'Bearer {SUPABASE_SERVICE_KEY}'
            }) as response:
                response.raise_for_status()

                # Stage 2: Parse (20-50%)
                await update_progress(user_id, 20, "Parsing conversations")

                # ijson parses incrementally from async byte stream
                conversations = []
                parser = ijson.items(response.aiter_bytes(), 'item')

                for conv in parser:
                    parsed = parse_conversation(conv)
                    conversations.append(parsed)

                    # Optional: yield every N conversations for chunked processing
                    if len(conversations) >= 100:
                        await process_conversation_batch(user_id, conversations)
                        conversations = []

        # Stage 3: Quick Pass (50-100%)
        await update_progress(user_id, 50, "Generating soulprint")

        bedrock_client = AsyncAnthropicBedrock(
            aws_access_key=AWS_ACCESS_KEY_ID,
            aws_secret_key=AWS_SECRET_ACCESS_KEY,
            aws_region='us-east-1'
        )

        message = await bedrock_client.messages.create(
            model="us.anthropic.claude-haiku-4-5-20251001-v1:0",
            max_tokens=8192,
            temperature=0.7,
            system=QUICK_PASS_SYSTEM_PROMPT,
            messages=[{"role": "user", "content": format_conversations(conversations)}]
        )

        soulprint_sections = parse_quick_pass_result(message.content[0].text)

        # Save to database
        await save_soulprint(user_id, soulprint_sections)
        await update_progress(user_id, 100, "Complete")

    except Exception as e:
        logger.error(f"Import failed for {user_id}", exc_info=True)
        await update_status(user_id, 'failed', str(e)[:500])
```

### Database Schema for Progress Tracking
```sql
-- Add to user_profiles table migration
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0;
ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS import_stage TEXT;

-- progress_percent: 0-100 integer
-- import_stage: "Downloading export", "Parsing conversations", "Generating soulprint", etc.
-- Existing columns: import_status ('none'|'processing'|'complete'|'failed'), import_error
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| Vercel serverless processing | RLM service on Render | v2.2 (2026-02) | Removes 1GB RAM, 300s timeout limits |
| json.loads() entire file | ijson streaming parser | v2.2 (2026-02) | Constant memory regardless of file size |
| boto3 ConverseCommand | anthropic[bedrock] SDK | v2.2 (2026-02) | Cleaner API, async support |
| BackgroundTasks for imports | Fire-and-forget asyncio.create_task | v2.2 (2026-02) | Supports long-running jobs (5+ min) |
| Generic "Processing..." status | Stage-based progress tracking | v2.2 (2026-02) | User sees real progress |

**Deprecated/outdated:**
- **Vercel process-server endpoint:** Replaced by RLM import-full endpoint (v2.2)
- **OpenAI embeddings:** Replaced by Bedrock Titan embeddings (v1.2)
- **json.loads() parsing:** Replaced by ijson streaming (v2.2)

## Open Questions

Things that couldn't be fully resolved:

1. **Supabase Storage streaming download pattern**
   - What we know: supabase-py `download()` method loads entire file into memory
   - What's unclear: Whether supabase-py supports streaming downloads natively
   - Recommendation: Use httpx.stream() with direct Storage URL and service role key (bypasses SDK limitation)

2. **ijson performance with nested ChatGPT structure**
   - What we know: ChatGPT exports have deep nesting (`mapping` object with UUIDs as keys)
   - What's unclear: Whether ijson path syntax can efficiently extract conversations from wrapped format `{ conversations: [...] }`
   - Recommendation: Test both `ijson.items(stream, 'item')` for `[...]` and `ijson.items(stream, 'conversations.item')` for wrapped format

3. **Progress_percent granularity during parsing**
   - What we know: Parsing is the longest stage (20-50% of total time)
   - What's unclear: How to estimate progress during streaming parse (file size not known until complete)
   - Recommendation: Use fixed stage percentages (download=20%, parse=30%, quick_pass=50%) until streaming metrics available

4. **Anthropic SDK Bedrock credentials**
   - What we know: Anthropic SDK requires AWS_ACCESS_KEY_ID, AWS_SECRET_ACCESS_KEY, AWS_REGION
   - What's unclear: Whether it supports AWS credential profiles or needs explicit keys
   - Recommendation: Use explicit environment variables (ANTHROPIC_AWS_ACCESS_KEY, etc.) to avoid confusion with other AWS services

## Sources

### Primary (HIGH confidence)
- [ijson GitHub Repository](https://github.com/ICRAR/ijson) - Streaming JSON parser official docs
- [httpx Official Documentation](https://www.python-httpx.org/quickstart/) - Streaming downloads
- [Anthropic Claude on Amazon Bedrock](https://docs.anthropic.com/en/api/claude-on-amazon-bedrock) - Official Bedrock SDK docs
- [FastAPI Background Tasks](https://fastapi.tiangolo.com/tutorial/background-tasks/) - Official FastAPI docs
- [AWS Bedrock Claude Models](https://docs.aws.amazon.com/bedrock/latest/userguide/model-parameters-claude.html) - Model IDs and parameters

### Secondary (MEDIUM confidence)
- [JSON Streaming: How to Work with Large JSON Files Efficiently](https://medium.com/@AlexanderObregon/json-streaming-how-to-work-with-large-json-files-efficiently-c7203de60ac2) - ijson patterns
- [Processing large JSON files in Python without running out of memory](https://pythonspeed.com/articles/json-memory-streaming/) - Memory profiling
- [Python httpx.stream() Guide](https://pytutorial.com/python-httpxstream-guide-stream-http-requests/) - Streaming examples
- [Tracking Background Job Status with Spring Boot and a Database Table](https://medium.com/@AlexanderObregon/tracking-background-job-status-with-spring-boot-and-a-database-table-5cf184a419c9) - Progress tracking pattern
- [Managing Long Running Tasks Pattern](https://www.hellointerview.com/learn/system-design/patterns/long-running-tasks) - System design pattern

### Tertiary (LOW confidence - verify before using)
- [Supabase Storage Python download](https://supabase.com/docs/reference/python/storage-from-download) - Doesn't document streaming, may need workaround
- [ChatGPT export conversations.json format](https://community.openai.com/t/questions-about-the-json-structures-in-the-exported-conversations-json/954762) - Community discussion, not official docs

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - ijson, httpx, anthropic SDK are well-documented, current libraries
- Architecture: HIGH - Streaming patterns verified with official docs, examples from production systems
- Pitfalls: MEDIUM - Based on common Python async/streaming issues, verified via web search, not project-specific

**Research date:** 2026-02-09
**Valid until:** 2026-03-09 (30 days - stable libraries, unlikely to change)
