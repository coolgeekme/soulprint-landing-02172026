# RLM Memory Service

Replaces traditional RAG (vector search) with Recursive Language Model exploration for intelligent memory retrieval.

## Why RLM over RAG?

**RAG (Traditional):**
- Embed query → Vector search → Top K chunks → Stuff into prompt
- Dumb similarity matching, misses context and connections

**RLM (New):**
- Query → LLM recursively explores full history → Returns insights with connections
- Intelligent exploration, finds patterns and relationships

## Quick Start

```bash
# From the services/rlm-memory directory:
./start.sh
```

This will:
1. Create a Python virtual environment
2. Install dependencies (including RLM core)
3. Start the FastAPI server on port 8100

## API Endpoints

### Health Check
```
GET /health
```

### Query Memory
```
POST /query
{
    "user_id": "uuid",
    "query": "What did I say about my startup?",
    "history": "... full conversation history ...",
    "max_depth": 1,
    "max_iterations": 20
}
```

### Explore History (Open-ended)
```
POST /explore
{
    "user_id": "uuid",
    "query": "",
    "history": "... full conversation history ..."
}
```

## Integration with Next.js

```typescript
import { queryMemoryRLM, formatRLMMemoriesForPrompt } from '@/lib/rlm/client';

// In your chat API route:
const history = await getFullUserHistory(userId);
const memories = await queryMemoryRLM(userId, userMessage, history);

if (memories.success) {
    systemPrompt += formatRLMMemoriesForPrompt(memories);
}
```

## Environment Variables

Uses same AWS credentials as the main app:
- `AWS_ACCESS_KEY_ID`
- `AWS_SECRET_ACCESS_KEY`
- `AWS_REGION`
- `BEDROCK_MODEL_ID`

Optional:
- `RLM_PORT` - Service port (default: 8100)
- `RLM_SERVICE_URL` - For the TS client (default: http://localhost:8100)

## Architecture

```
┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
│   Next.js App   │────▶│  RLM Memory     │────▶│  AWS Bedrock    │
│   (TypeScript)  │     │  (Python/FastAPI)│     │  (Claude Haiku) │
└─────────────────┘     └─────────────────┘     └─────────────────┘
                               │
                               ▼
                        ┌─────────────────┐
                        │   RLM Core      │
                        │ (Recursive LM)  │
                        └─────────────────┘
```

## Production Deployment

For production, consider:
1. **Docker** - `environment="docker"` in RLM config for isolation
2. **Modal** - `environment="modal"` for serverless execution
3. **Separate service** - Deploy as standalone container
