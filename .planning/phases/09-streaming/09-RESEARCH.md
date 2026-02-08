# Phase 9: Streaming Responses - Research

**Researched:** 2026-02-08
**Domain:** Real-time LLM response streaming with AWS Bedrock and Next.js
**Confidence:** HIGH

## Summary

Streaming LLM responses requires coordinated changes across three layers: (1) AWS Bedrock SDK streaming API, (2) Next.js API route with SSE, and (3) React frontend with ReadableStream consumption. The current implementation already returns SSE format but sends complete responses in a single chunk—the transition to true streaming requires using `ConverseStreamCommand` instead of `ConverseCommand` in Bedrock, returning the Response immediately in Next.js (not after awaiting), and consuming the stream progressively in React.

The critical insight: **Next.js buffers responses until the handler completes unless you return the Response object immediately and stream asynchronously.** This is the #1 cause of "fake streaming" where responses appear all at once.

**Primary recommendation:** Use `ConverseStreamCommand` with `for await...of` loop, return Response immediately with ReadableStream, pass AbortSignal from request through to Bedrock for stop functionality, and update React to display chunks incrementally.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| `@aws-sdk/client-bedrock-runtime` | 3.x | Bedrock streaming API | Official AWS SDK, supports `ConverseStreamCommand` for streaming |
| ReadableStream (Web API) | Native | Server-side streaming | Built into Node.js 18+, Vercel-compatible |
| TextEncoder (Web API) | Native | Chunk encoding | Standard for SSE data encoding |
| AbortController (Web API) | Native | Request cancellation | Standard async cancellation pattern |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| `@vercel/ai-sdk` | 4.x | Streaming helpers | Optional - provides `streamText()` helper, but adds abstraction over Bedrock |
| `eventsource-parser` | 1.x | SSE parsing | Client-side SSE parsing if using EventSource format |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `ConverseStreamCommand` | `InvokeModelWithResponseStream` | Legacy API, less unified, requires manual message formatting |
| SSE (Server-Sent Events) | WebSockets | SSE is simpler, unidirectional, built into HTTP; WebSockets require more infrastructure |
| Native ReadableStream | Vercel AI SDK | AI SDK adds abstraction and features, but hides underlying stream mechanics |

**Installation:**
```bash
# Already installed
npm list @aws-sdk/client-bedrock-runtime
```

## Architecture Patterns

### Recommended Flow
```
User sends message
       ↓
Frontend: POST /api/chat with message
       ↓
Backend: Create ReadableStream, return Response immediately
       ↓
Backend (async): Call ConverseStreamCommand, iterate stream
       ↓
Backend: Enqueue SSE chunks as they arrive
       ↓
Frontend: ReadableStreamReader reads chunks
       ↓
Frontend: Update React state incrementally
       ↓
User sees token-by-token rendering
```

### Pattern 1: Bedrock Streaming with ConverseStreamCommand
**What:** Replace `ConverseCommand` with `ConverseStreamCommand` to get async iterator of response chunks
**When to use:** Always for streaming responses from Claude models on Bedrock
**Example:**
```typescript
// Source: https://docs.aws.amazon.com/bedrock/latest/userguide/bedrock-runtime_example_bedrock-runtime_ConverseStream_AnthropicClaude_section.html

import { BedrockRuntimeClient, ConverseStreamCommand } from '@aws-sdk/client-bedrock-runtime';

const client = new BedrockRuntimeClient({ region: 'us-east-1' });

const command = new ConverseStreamCommand({
  modelId: 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
  messages: conversation,
  inferenceConfig: { maxTokens: 4096, temperature: 0.7 },
  system: [{ text: systemPrompt }],
});

const response = await client.send(command);

// Iterate stream chunks
for await (const item of response.stream) {
  if (item.contentBlockDelta) {
    const text = item.contentBlockDelta.delta?.text;
    // Send this text chunk to frontend
  }
}
```

### Pattern 2: Next.js Immediate Response Return
**What:** Return Response object immediately, then start async streaming work—don't await before return
**When to use:** All streaming API routes in Next.js/Vercel
**Example:**
```typescript
// Source: https://github.com/vercel/next.js/discussions/48427 (community pattern, HIGH confidence)

export async function POST(request: NextRequest) {
  // Parse request, auth, etc.

  // Create stream and return IMMEDIATELY
  const stream = new ReadableStream({
    async start(controller) {
      // Async work happens AFTER response sent
      try {
        const response = await bedrockClient.send(command);

        for await (const item of response.stream) {
          if (item.contentBlockDelta?.delta?.text) {
            const chunk = `data: ${JSON.stringify({ content: item.contentBlockDelta.delta.text })}\n\n`;
            controller.enqueue(new TextEncoder().encode(chunk));
          }
        }

        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        controller.error(error);
      }
    }
  });

  // CRITICAL: Return immediately, don't await stream processing
  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}
```

### Pattern 3: React Incremental Rendering
**What:** Read stream chunks with ReadableStreamReader, update state on each chunk
**When to use:** All streaming response UI
**Example:**
```typescript
// Source: Current implementation (app/chat/page.tsx lines 401-433)

const reader = res.body?.getReader();
if (!reader) throw new Error('No reader');

let responseContent = '';
const aiId = (Date.now() + 1).toString();

// Add empty message immediately
setMessages(prev => [...prev, {
  id: aiId,
  role: 'assistant',
  content: '',
  timestamp: new Date()
}]);

const decoder = new TextDecoder();
while (true) {
  const { done, value } = await reader.read();
  if (done) break;

  const chunk = decoder.decode(value);
  const lines = chunk.split('\n');

  for (const line of lines) {
    if (line.startsWith('data: ')) {
      const data = line.slice(6);
      if (data === '[DONE]') continue;

      try {
        const parsed = JSON.parse(data);
        if (parsed.content) {
          responseContent += parsed.content;
          // Update message incrementally
          setMessages(prev =>
            prev.map(m => m.id === aiId ? { ...m, content: responseContent } : m)
          );
        }
      } catch {
        // Ignore parse errors
      }
    }
  }
}
```

### Pattern 4: Stop/Cancel with AbortSignal
**What:** Pass AbortSignal from request to Bedrock, cancel stream on disconnect
**When to use:** All streaming routes to prevent orphaned streams
**Example:**
```typescript
// Source: https://ai-sdk.dev/docs/advanced/stopping-streams (Vercel AI SDK pattern)

export async function POST(request: NextRequest) {
  const stream = new ReadableStream({
    async start(controller) {
      try {
        const command = new ConverseStreamCommand({
          modelId: '...',
          messages: conversation,
          inferenceConfig: { maxTokens: 4096 },
        });

        // Note: AWS SDK v3 doesn't directly support abortSignal on ConverseStreamCommand
        // Check signal manually during iteration
        const response = await bedrockClient.send(command);

        for await (const item of response.stream) {
          // Check if request was aborted
          if (request.signal.aborted) {
            controller.close();
            return;
          }

          if (item.contentBlockDelta?.delta?.text) {
            const chunk = `data: ${JSON.stringify({ content: item.contentBlockDelta.delta.text })}\n\n`;
            controller.enqueue(new TextEncoder().encode(chunk));
          }
        }

        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        if (request.signal.aborted) {
          controller.close();
        } else {
          controller.error(error);
        }
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
    },
  });
}
```

### Pattern 5: Frontend Stop Button
**What:** Cancel fetch request with AbortController from UI button
**When to use:** User-triggered stop during generation
**Example:**
```typescript
// Source: https://ai-sdk.dev/docs/advanced/stopping-streams

// In component state
const abortControllerRef = useRef<AbortController | null>(null);
const [isGenerating, setIsGenerating] = useState(false);

// When sending message
const handleSendMessage = async (content: string) => {
  const controller = new AbortController();
  abortControllerRef.current = controller;
  setIsGenerating(true);

  try {
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: content }),
      signal: controller.signal,
    });

    // Stream processing...
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Generation stopped by user');
    }
  } finally {
    setIsGenerating(false);
    abortControllerRef.current = null;
  }
};

// Stop button handler
const handleStop = () => {
  abortControllerRef.current?.abort();
  setIsGenerating(false);
};

// In JSX
{isGenerating && (
  <button onClick={handleStop}>
    Stop Generation
  </button>
)}
```

### Anti-Patterns to Avoid
- **Awaiting stream processing before return:** Causes Next.js to buffer entire response
- **Not checking AbortSignal during iteration:** Stream continues even after client disconnect
- **Setting state on every character:** Causes excessive React re-renders, use debouncing or batch updates
- **Forgetting TextEncoder:** Chunks must be Uint8Array for ReadableStream
- **Not handling DONE marker:** Frontend won't know when stream completes

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| SSE parsing on client | Custom string splitting logic | Native ReadableStream + TextDecoder | Handles partial chunks correctly, no corruption |
| Stream cancellation | Manual timeout tracking | AbortController + AbortSignal | Standard web API, works across fetch/streams |
| Chunk batching | Custom debounce logic | ReadableStream backpressure | Built-in flow control prevents memory issues |
| Reconnection logic | Custom retry with cursor | Vercel AI SDK `useChat` with `streamMode: "text"` | Handles dropped connections automatically |

**Key insight:** ReadableStream and AbortController are web standards that handle edge cases (partial UTF-8 characters, backpressure, cancellation) that hand-rolled solutions get wrong.

## Common Pitfalls

### Pitfall 1: Buffering Instead of Streaming
**What goes wrong:** Response appears all at once instead of token-by-token, even though code "looks" like streaming
**Why it happens:** Next.js waits for the entire route handler to complete before sending Response to client. If you `await` the stream processing inside the handler, Next.js buffers everything.
**How to avoid:** Return the Response object immediately with a ReadableStream, then do async work in the `start()` callback WITHOUT awaiting at the top level
**Warning signs:**
- Using `for await` loop BEFORE `return new Response()`
- "Streaming" works locally but buffers on Vercel
- Network tab shows single large response instead of chunked transfer

### Pitfall 2: Memory Leaks from Abandoned Streams
**What goes wrong:** Backend continues processing after client disconnects, wastes resources and may hit rate limits
**Why it happens:** Bedrock stream iteration doesn't automatically stop when Next.js request is aborted
**How to avoid:** Check `request.signal.aborted` inside the iteration loop and break early
**Warning signs:**
- Server logs show "stream completed" after client already closed connection
- High memory usage on long responses
- Rate limit errors when users refresh mid-stream

### Pitfall 3: Vercel Function Timeout on Long Responses
**What goes wrong:** Response cuts off mid-stream with 504 error on production
**Why it happens:** Vercel Hobby plan has 10s timeout, Pro has 60s timeout for serverless functions
**How to avoid:**
- Keep responses under timeout limit (use `maxTokens` in Bedrock config)
- Upgrade to Pro plan for longer responses
- Use Edge Runtime (300s timeout as of March 2025) for very long responses
**Warning signs:**
- Works locally but times out in production
- Logs show stream started but never completed
- 504 Gateway Timeout errors

### Pitfall 4: React Re-render Thrashing
**What goes wrong:** UI becomes sluggish or freezes during fast streaming
**Why it happens:** Setting state on every small chunk causes React to re-render on every token
**How to avoid:**
- Batch updates (accumulate 50-100 chars before setState)
- Use `useMemo` for message rendering
- Consider `useTransition` for lower-priority updates
**Warning signs:**
- Chat feels laggy during streaming
- High CPU usage in browser during generation
- Dropped frames in React DevTools profiler

### Pitfall 5: RLM Service Not Streaming
**What goes wrong:** Next.js streams correctly but RLM service still waits for complete response
**Why it happens:** RLM service (Python FastAPI) needs to use `StreamingResponse` with async generator
**How to avoid:** Update RLM `/query` endpoint to yield chunks instead of returning complete response
**Warning signs:**
- Network shows streaming from Next.js, but delays before first chunk
- RLM logs show complete Bedrock response before Next.js sends first chunk

### Pitfall 6: CORS Issues with Streaming
**What goes wrong:** Streaming works in development but fails in production with CORS errors
**Why it happens:** Some proxies/CDNs buffer SSE responses or strip streaming headers
**How to avoid:** Ensure CORS headers are set on Response, not middleware
**Warning signs:**
- Works on localhost but fails on deployed domain
- Browser console shows CORS error
- Response has `Content-Type: text/event-stream` but still buffers

### Pitfall 7: Character Encoding Corruption
**What goes wrong:** Emojis or special characters appear broken (�) mid-word
**Why it happens:** UTF-8 characters can span multiple bytes, and chunk boundaries may split them
**How to avoid:** Use TextDecoder with `stream: true` option to handle partial characters
**Warning signs:**
- Replacement characters (�) appear temporarily then disappear
- Works with ASCII but breaks with emojis/unicode
- Character corruption at chunk boundaries

## Code Examples

Verified patterns from official sources:

### Complete Streaming API Route
```typescript
// Source: AWS SDK + Next.js best practices (HIGH confidence)
import { NextRequest } from 'next/server';
import { BedrockRuntimeClient, ConverseStreamCommand } from '@aws-sdk/client-bedrock-runtime';

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

export async function POST(request: NextRequest) {
  // Auth and validation here...
  const { message, history } = await request.json();

  const stream = new ReadableStream({
    async start(controller) {
      try {
        const command = new ConverseStreamCommand({
          modelId: process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-3-5-sonnet-20241022-v2:0',
          messages: [
            ...history.map(m => ({ role: m.role, content: [{ text: m.content }] })),
            { role: 'user', content: [{ text: message }] },
          ],
          inferenceConfig: { maxTokens: 4096 },
          system: [{ text: systemPrompt }],
        });

        const response = await bedrockClient.send(command);

        for await (const item of response.stream) {
          // Check abort signal
          if (request.signal.aborted) {
            controller.close();
            return;
          }

          if (item.contentBlockDelta?.delta?.text) {
            const text = item.contentBlockDelta.delta.text;
            const chunk = `data: ${JSON.stringify({ content: text })}\n\n`;
            controller.enqueue(new TextEncoder().encode(chunk));
          }
        }

        // Send completion marker
        controller.enqueue(new TextEncoder().encode('data: [DONE]\n\n'));
        controller.close();
      } catch (error) {
        console.error('Stream error:', error);
        if (!request.signal.aborted) {
          const errorChunk = `data: ${JSON.stringify({ error: 'Stream failed' })}\n\n`;
          controller.enqueue(new TextEncoder().encode(errorChunk));
        }
        controller.close();
      }
    },
    cancel() {
      // Cleanup when client aborts
      console.log('Stream cancelled by client');
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

// CRITICAL: Add runtime config for Vercel
export const runtime = 'nodejs'; // or 'edge' for 300s timeout
export const maxDuration = 60; // Max duration in seconds (Pro plan)
```

### Frontend Stream Consumer with Stop
```typescript
// Source: Current implementation + AbortController pattern
const [isGenerating, setIsGenerating] = useState(false);
const abortControllerRef = useRef<AbortController | null>(null);

const handleSendMessage = async (content: string) => {
  const controller = new AbortController();
  abortControllerRef.current = controller;
  setIsGenerating(true);

  try {
    const csrfToken = await getCsrfToken();
    const res = await fetch('/api/chat', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-Token': csrfToken,
      },
      body: JSON.stringify({ message: content, history }),
      signal: controller.signal,
    });

    if (!res.ok) throw new Error('Chat failed');

    const reader = res.body?.getReader();
    if (!reader) throw new Error('No reader');

    let responseContent = '';
    const aiId = Date.now().toString();

    // Add empty message
    setMessages(prev => [...prev, {
      id: aiId,
      role: 'assistant',
      content: '',
      timestamp: new Date()
    }]);

    const decoder = new TextDecoder();
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const data = line.slice(6);
          if (data === '[DONE]') continue;

          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              responseContent += parsed.content;
              // Update incrementally
              setMessages(prev =>
                prev.map(m => m.id === aiId ? { ...m, content: responseContent } : m)
              );
            }
          } catch {
            // Ignore parse errors
          }
        }
      }
    }
  } catch (error) {
    if (error.name === 'AbortError') {
      console.log('Generation stopped');
    } else {
      console.error('Stream error:', error);
    }
  } finally {
    setIsGenerating(false);
    abortControllerRef.current = null;
  }
};

const handleStop = () => {
  if (abortControllerRef.current) {
    abortControllerRef.current.abort();
    setIsGenerating(false);
  }
};

// In JSX
{isGenerating && (
  <button onClick={handleStop} className="...">
    <Square className="w-4 h-4" />
    Stop
  </button>
)}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `InvokeModelWithResponseStream` | `ConverseStreamCommand` | AWS SDK v3 (2024) | Unified API across models, simpler message format |
| Buffered responses | Native ReadableStream | Node.js 18+ (2022) | True streaming without libraries |
| EventSource API | Fetch + ReadableStream | Modern browsers (2023) | More control, supports POST, handles errors better |
| Edge Runtime required | Node.js runtime supports streaming | Next.js 13.4+ (2023) | No need to migrate to Edge for streaming |
| 25s Edge timeout | 300s Edge timeout | Vercel (March 2025) | Long-form content now possible |

**Deprecated/outdated:**
- `InvokeModel` (non-streaming): Use `ConverseStreamCommand` for better UX
- EventSource API for SSE: Use fetch + ReadableStream for more control
- Vercel AI SDK required: Optional now, native APIs are stable

## Open Questions

Things that couldn't be fully resolved:

1. **RLM Service Streaming**
   - What we know: RLM service (Python FastAPI) currently proxies Bedrock but returns complete response
   - What's unclear: Whether RLM should stream from Bedrock → RLM → Next.js, or if Next.js should call Bedrock directly for streaming while RLM handles memory/context
   - Recommendation: Start with direct Bedrock streaming in Next.js (Phase 9), defer RLM streaming until we measure if it adds latency

2. **AbortSignal Propagation to Bedrock**
   - What we know: AWS SDK v3 `ConverseStreamCommand` doesn't have explicit `abortSignal` parameter in documentation
   - What's unclear: Whether breaking the `for await` loop properly closes the Bedrock connection or leaves it hanging
   - Recommendation: Check `request.signal.aborted` in loop and break early, test with Bedrock billing to confirm charges stop

3. **Optimal Chunk Size for UI Updates**
   - What we know: Bedrock sends variable-sized chunks, React setState on every chunk may be expensive
   - What's unclear: Whether batching (e.g., every 50 chars) improves performance or makes streaming feel laggy
   - Recommendation: Start with per-chunk updates (simpler), profile with React DevTools, batch if measurements show slowdown

## Sources

### Primary (HIGH confidence)
- [AWS Bedrock ConverseStreamCommand Documentation](https://docs.aws.amazon.com/bedrock/latest/userguide/bedrock-runtime_example_bedrock-runtime_ConverseStream_AnthropicClaude_section.html) - Official AWS streaming API
- [Vercel Streaming Blog](https://vercel.com/blog/streaming-for-serverless-node-js-and-edge-runtimes-with-vercel-functions) - Node.js and Edge streaming support
- [MDN ReadableStream](https://developer.mozilla.org/en-US/docs/Web/API/ReadableStream) - Web API standard
- [MDN AbortController](https://developer.mozilla.org/en-US/docs/Web/API/AbortController) - Cancellation standard

### Secondary (MEDIUM confidence)
- [Vercel AI SDK - Stopping Streams](https://ai-sdk.dev/docs/advanced/stopping-streams) - AbortSignal patterns (verified pattern, optional SDK)
- [Next.js Discussion #48427](https://github.com/vercel/next.js/discussions/48427) - SSE streaming community best practices
- [Vercel Edge Timeout Changelog](https://vercel.com/changelog/new-execution-duration-limit-for-edge-functions) - 300s timeout as of March 2025
- [Vercel Function Timeouts](https://vercel.com/kb/guide/what-can-i-do-about-vercel-serverless-functions-timing-out) - Hobby 10s, Pro 60s limits

### Tertiary (LOW confidence)
- [Medium: Fixing Slow SSE](https://medium.com/@oyetoketoby80/fixing-slow-sse-server-sent-events-streaming-in-next-js-and-vercel-99f42fbdb996) - Community pattern, needs verification
- [DEV.to: LLM Streaming Best Practices](https://dev.to/abhinav__ap/from-waiting-to-streaming-how-to-handle-llm-responses-like-a-pro-especially-with-json-2lgh) - General patterns, not Next.js-specific

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH - AWS SDK is official, ReadableStream is web standard
- Architecture: HIGH - Patterns verified from AWS docs and Next.js community
- Pitfalls: HIGH - Common issues documented in GitHub discussions and production deployments
- RLM streaming: MEDIUM - Requires coordination with separate repo, unclear if RLM should stream or be bypassed

**Research date:** 2026-02-08
**Valid until:** 60 days (stable APIs, but Vercel config may change)
