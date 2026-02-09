# Phase 3: Web Search Citation Validation - Research

**Researched:** 2026-02-09
**Domain:** Web search citation validation and hallucination detection
**Confidence:** HIGH

## Summary

SoulPrint currently uses Perplexity (primary) and Tavily (fallback) web search APIs that return citations with their responses. These citations flow through the system but are **NOT validated** against actual source content before display. The LLM (Bedrock Claude or RLM service) receives search results and citations in the system prompt, generates responses mentioning sources, but there's no verification that:

1. The cited URLs are reachable
2. The cited content actually appears at those URLs
3. The LLM isn't hallucinating additional citations not from the search API

**Current flow:** User message → Smart Search (Perplexity/Tavily) → Citations array → System prompt → LLM response → User sees unvalidated citations

**Gap:** WSRV-01 requires validation before surfacing citations. WSRV-02 requires filtering hallucinated/unreachable sources. WSRV-03 requires domain indicators.

**Primary recommendation:** Implement post-search URL validation before adding citations to system prompt. Extract domain names from validated URLs. Add citation metadata to chat messages for frontend display.

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| Perplexity API | Current | Primary web search with citations | Already integrated, `return_citations: true` returns verified URLs |
| Tavily API | @tavily/core@0.7.1 | Fallback web search | Already integrated, returns `results[].url` |
| Node.js fetch | Native | URL validation via HEAD requests | Built-in, no dependencies, sufficient for validation |
| Next.js URL parsing | Native | Domain extraction from URLs | Built-in `new URL(string).hostname` |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| Zod | 4.3.6 (installed) | Schema validation for citation data | Already used project-wide, use for citation response validation |
| AbortController | Native | Request timeouts for validation | Prevent hanging on slow/dead URLs |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| HEAD requests | Full GET + content scraping (Cheerio) | HEAD is faster (no body download), sufficient for existence check |
| Native fetch | Puppeteer for JS-rendered content | Puppeteer adds 300MB+ dependencies, overkill for citation validation |
| Post-prompt validation | Pre-prompt validation | Post-prompt would catch LLM hallucinations but add latency to user response |

**Installation:**
No new dependencies required. All validation can use native Node.js features.

## Architecture Patterns

### Current Web Search Flow
```
app/api/chat/route.ts (POST)
  ↓
smartSearch(message, userId, { forceSearch, preferDeep })
  → lib/search/smart-search.ts
    ↓
  Perplexity (primary): lib/search/perplexity.ts
    → Returns { answer, citations: string[] }
  OR Tavily (fallback): lib/search/tavily.ts
    → Returns { results: [{ url, title, content }], answer }
    ↓
  SmartSearchResult: { context, citations: string[], source }
  ↓
webSearchCitations array → PromptBuilder
  → Adds to system prompt: "Sources to cite:\n1. url1\n2. url2"
  ↓
LLM generates response (may cite sources, may hallucinate)
  ↓
Response streamed to user (no citation metadata)
```

### Recommended Validation Flow
```
smartSearch() returns citations
  ↓
validateCitations(citations: string[])
  → For each URL:
    1. Check format (valid URL structure)
    2. Check domain (not blocked/internal)
    3. HEAD request with 3s timeout
    4. HTTP 200/301/302 = valid, else invalid
  → Returns: { valid: string[], invalid: string[] }
  ↓
Only valid citations → system prompt
  ↓
LLM response includes citations in structured format
  ↓
Frontend displays domain indicators
```

### Pattern 1: Citation Validation Function
**What:** Async function that validates URLs before passing to LLM
**When to use:** After smartSearch() returns, before buildSystemPrompt()
**Example:**
```typescript
// lib/search/citation-validator.ts

interface ValidationResult {
  valid: string[];
  invalid: string[];
  errors: Record<string, string>; // url -> error reason
}

export async function validateCitations(
  urls: string[],
  options: { timeout?: number } = {}
): Promise<ValidationResult> {
  const { timeout = 3000 } = options;

  const valid: string[] = [];
  const invalid: string[] = [];
  const errors: Record<string, string> = {};

  // Validate in parallel with Promise.allSettled
  const results = await Promise.allSettled(
    urls.map(url => validateSingleCitation(url, timeout))
  );

  results.forEach((result, i) => {
    const url = urls[i];
    if (result.status === 'fulfilled' && result.value.valid) {
      valid.push(url);
    } else {
      invalid.push(url);
      errors[url] = result.status === 'rejected'
        ? result.reason
        : result.value.error;
    }
  });

  return { valid, invalid, errors };
}

async function validateSingleCitation(
  url: string,
  timeout: number
): Promise<{ valid: boolean; error?: string }> {
  // 1. URL format check
  try {
    const parsed = new URL(url);

    // 2. Block internal/dangerous domains
    if (parsed.hostname === 'localhost' ||
        parsed.hostname.startsWith('127.') ||
        parsed.hostname.startsWith('192.168.') ||
        parsed.hostname.startsWith('10.')) {
      return { valid: false, error: 'Internal URL blocked' };
    }
  } catch {
    return { valid: false, error: 'Invalid URL format' };
  }

  // 3. HEAD request with timeout
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      method: 'HEAD',
      signal: controller.signal,
      headers: {
        'User-Agent': 'SoulPrint/1.0 (Citation Validator)'
      },
      redirect: 'follow' // Follow redirects
    });

    clearTimeout(timeoutId);

    // Accept 2xx and 3xx status codes
    if (response.ok || (response.status >= 300 && response.status < 400)) {
      return { valid: true };
    }

    return { valid: false, error: `HTTP ${response.status}` };

  } catch (error) {
    clearTimeout(timeoutId);
    if (error instanceof Error && error.name === 'AbortError') {
      return { valid: false, error: 'Timeout' };
    }
    return { valid: false, error: 'Network error' };
  }
}
```

### Pattern 2: Domain Name Extraction
**What:** Extract clean domain name for display
**When to use:** When formatting citations for frontend display
**Example:**
```typescript
// lib/search/citation-formatter.ts

export function extractDomain(url: string): string {
  try {
    const parsed = new URL(url);
    return parsed.hostname.replace(/^www\./, '');
  } catch {
    return url; // Fallback to full URL if parsing fails
  }
}

export interface CitationMetadata {
  url: string;
  domain: string;
  title?: string; // From search API if available
}

export function formatCitationsForDisplay(
  citations: string[],
  titles?: string[]
): CitationMetadata[] {
  return citations.map((url, i) => ({
    url,
    domain: extractDomain(url),
    title: titles?.[i]
  }));
}
```

### Pattern 3: Structured Citation in Chat Messages
**What:** Store citation metadata with chat messages for frontend rendering
**When to use:** When saving chat message to database or returning in API response
**Example:**
```typescript
// Extend Message type
interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp?: Date;
  citations?: CitationMetadata[]; // NEW
  searchSource?: 'perplexity' | 'tavily' | 'none'; // NEW
}

// In chat API route after LLM response
if (webSearchCitations.length > 0) {
  const citationMeta = formatCitationsForDisplay(
    webSearchCitations,
    searchResult.titles // If available from Tavily
  );

  // Include in SSE stream
  const metadata = `data: ${JSON.stringify({
    type: 'citations',
    data: citationMeta
  })}\n\n`;
  controller.enqueue(new TextEncoder().encode(metadata));
}
```

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| URL content verification | Custom web scraper with Cheerio/Puppeteer | HEAD requests only | Scraping is slow (download full HTML), prone to blocking, and unnecessary for existence check |
| SSRF protection | Manual IP/domain allowlist | URL parsing + basic checks | Next.js already has SSRF mitigations; just block localhost/internal IPs |
| Citation hallucination detection | LLM-based verification | Search API citations as ground truth | Perplexity/Tavily already validate sources; trust their citations, just verify reachability |
| Domain name display | Regex parsing | `new URL().hostname` | URL parsing is complex (ports, subdomains, IDNs); use browser-tested API |

**Key insight:** The search APIs (Perplexity/Tavily) already perform the hard work of finding relevant, credible sources. Our validation only needs to confirm **reachability**, not **content relevance**. The LLM might hallucinate *additional* citations, but if we only pass validated search API citations to the prompt, we prevent most hallucination vectors.

## Common Pitfalls

### Pitfall 1: Validating After LLM Response
**What goes wrong:** Waiting until after the LLM generates a response to validate citations adds latency and doesn't prevent hallucinated citations from appearing in the response text.
**Why it happens:** Seems logical to validate what the LLM actually cited, but LLM can cite sources not from the search API.
**How to avoid:** Validate citations **before** adding them to the system prompt. Only give the LLM validated sources to work with.
**Warning signs:** User sees "Validating sources..." spinner after response is generated.

### Pitfall 2: Full Content Scraping for Validation
**What goes wrong:** Using Cheerio or Puppeteer to download and parse full HTML content adds 500ms-2s latency per URL, increases memory usage, and risks blocking/CAPTCHAs.
**Why it happens:** Over-engineering—thinking validation requires content matching.
**How to avoid:** Use HEAD requests (0 bytes downloaded) just to check if URL is reachable. Content verification is the search API's job.
**Warning signs:** Web search queries take >5s, 429 rate limit errors from target sites, memory spikes.

### Pitfall 3: Blocking Legitimate Redirects
**What goes wrong:** Sites often redirect HTTP→HTTPS or www→non-www. Treating 301/302 as invalid removes valid sources.
**Why it happens:** Only checking for HTTP 200 status.
**How to avoid:** Use `redirect: 'follow'` in fetch options and accept 2xx/3xx status codes.
**Warning signs:** Major news sites (CNN, NYTimes) get filtered out despite being valid.

### Pitfall 4: SSRF Vulnerability in Validation
**What goes wrong:** Allowing validation of internal URLs (localhost, 192.168.x.x, 10.x.x.x) lets attackers probe internal network.
**Why it happens:** Not filtering URLs before making HEAD request.
**How to avoid:** Parse URL and block internal/private IP ranges before validation fetch.
**Warning signs:** Security audit finds SSRF in citation validator, could access internal services.

### Pitfall 5: No Timeout on Validation Requests
**What goes wrong:** Dead URLs or slow servers cause validation to hang indefinitely, blocking chat response.
**Why it happens:** Not using AbortController with timeout.
**How to avoid:** Always use AbortSignal.timeout() or manual AbortController with 3s timeout.
**Warning signs:** Some chat requests never complete, server logs show hanging fetch calls.

### Pitfall 6: Serial Validation (Slow)
**What goes wrong:** Validating URLs one-by-one: 5 URLs × 3s timeout = 15s total wait time.
**Why it happens:** Using `await` in a loop instead of `Promise.all()`.
**How to avoid:** Use `Promise.allSettled()` to validate all URLs in parallel.
**Warning signs:** Web search queries add 5-15s latency even when all URLs are fast.

## Code Examples

### Integration Point in app/api/chat/route.ts
```typescript
// Source: Current implementation + recommended addition
// After smartSearch() returns (line ~326)

import { validateCitations } from '@/lib/search/citation-validator';
import { formatCitationsForDisplay } from '@/lib/search/citation-formatter';

// ... inside POST handler ...

try {
  searchResult = await smartSearch(message, user.id, {
    forceSearch: deepSearch,
    preferDeep: deepSearch,
  });

  if (searchResult.performed) {
    // NEW: Validate citations before passing to LLM
    const validation = await validateCitations(searchResult.citations, {
      timeout: 3000
    });

    if (validation.invalid.length > 0) {
      reqLog.warn({
        invalid: validation.invalid.length,
        errors: validation.errors
      }, 'Some citations invalid, filtering');
    }

    // Only use validated citations
    webSearchCitations = validation.valid;
    webSearchContext = searchResult.context;

    reqLog.info({
      source: searchResult.source,
      totalCitations: searchResult.citations.length,
      validCitations: validation.valid.length,
      invalidCitations: validation.invalid.length
    }, 'Citations validated');
  }
} catch (error) {
  reqLog.error({ error }, 'Smart search error');
}

// ... later when building citation metadata for response ...

const citationMetadata = formatCitationsForDisplay(webSearchCitations);
// Include in streaming response or message save
```

### Frontend Citation Display (components/chat/message-content.tsx)
```typescript
// Add to MessageContentProps
interface MessageContentProps {
  content: string;
  isUser?: boolean;
  citations?: CitationMetadata[]; // NEW
}

export function MessageContent({ content, isUser, citations }: MessageContentProps) {
  // ... existing rendering ...

  return (
    <div>
      {/* Existing markdown content */}
      <ReactMarkdown>{content}</ReactMarkdown>

      {/* NEW: Citation footer */}
      {citations && citations.length > 0 && (
        <div className="mt-3 pt-3 border-t border-border/50">
          <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
            <span>📚 Sources:</span>
          </div>
          <div className="flex flex-wrap gap-2">
            {citations.map((citation, i) => (
              <a
                key={i}
                href={citation.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-muted/50 hover:bg-muted text-xs transition-colors"
                title={citation.title || citation.url}
              >
                <span className="font-medium">{citation.domain}</span>
              </a>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| No citation validation | HEAD requests + domain filtering | 2026 (this phase) | Prevents 404s and hallucinated sources from appearing |
| Full URL displayed | Domain name only | 2026 trend | Cleaner UI, less overwhelming for users |
| Post-hoc LLM verification | Pre-prompt validation | 2026 research | GPTZero's hallucination detector validates before generation |
| Content scraping | Reachability check only | 2026 best practice | Faster, avoids CAPTCHA/blocking |

**Deprecated/outdated:**
- **Content matching validation:** 2024 approach was to scrape URL content and check if LLM's cited snippet appears. Current approach: trust search API's relevance ranking, only validate reachability.
- **Regex URL parsing:** Modern code uses `new URL()` API for robust parsing.

## Open Questions

1. **Should we store citation metadata in the database?**
   - What we know: Current `chat_messages` table stores `content: text` only
   - What's unclear: Whether to add `citations: jsonb` column or keep ephemeral
   - Recommendation: Start ephemeral (return in API response only), add DB persistence in v2.2 if users request "view sources later" feature

2. **How to handle LLM hallucinating additional citations?**
   - What we know: Even with validated sources in prompt, LLM might invent new URLs
   - What's unclear: Detection strategy (regex scan response text? compare against provided list?)
   - Recommendation: Phase 1 MVP only validates search API citations. Phase 2 could add response text scanning for hallucinated URLs

3. **Should validation be cached?**
   - What we know: Same URLs might appear across multiple searches
   - What's unclear: Cache TTL, invalidation strategy, memory usage
   - Recommendation: Start without caching (simple), add Redis cache in v2.2 if performance becomes issue

4. **What about citation validation failures blocking responses?**
   - What we know: If all citations fail validation, user gets no sources
   - What's unclear: Should we proceed with search context but no citations? Or skip web search entirely?
   - Recommendation: Proceed with search context, inform user "sources unavailable", better than no answer

## Sources

### Primary (HIGH confidence)
- `/app/api/chat/route.ts` - Current web search integration (lines 293-326)
- `/lib/search/smart-search.ts` - SmartSearchResult interface and flow
- `/lib/search/perplexity.ts` - Perplexity API integration with citations array
- `/lib/search/tavily.ts` - Tavily API integration with results[].url
- `/components/chat/telegram-chat-v2.tsx` - Current chat UI rendering
- `/components/chat/message-content.tsx` - Message content rendering with ReactMarkdown

### Secondary (MEDIUM confidence)
- [GPTZero Hallucination Detection](https://gptzero.me/news/iclr-2026/) - Real-world hallucination detection, 99/100 catch rate for flawed citations
- [FACTUM: Citation Hallucination Detection](https://arxiv.org/pdf/2601.05866) - Research on mechanistic detection patterns
- [LLM-Cite: URL Generation for Verification](https://openreview.net/pdf?id=qb2QRoE4W3) - Attribution via URL validation
- [Next.js SSRF Prevention](https://www.intigriti.com/researchers/blog/hacking-tools/ssrf-vulnerabilities-in-nextjs-targets) - Security best practices for URL validation

### Tertiary (LOW confidence - WebSearch only)
- [Perplexity vs Tavily Comparison](https://alphacorp.ai/perplexity-search-api-vs-tavily-the-better-choice-for-rag-and-agents-in-2025/) - Both APIs prioritize citations, reduce hallucination
- [Node.js Web Scraping Guide](https://medium.com/@muhannad.salkini/web-scraping-and-automation-with-node-js-and-typescript-cheerio-puppeteer-5cc476c57f4d) - Cheerio vs Puppeteer tradeoffs
- [SSRF Prevention in Node.js (OWASP)](https://owasp.org/www-community/pages/controls/SSRF_Prevention_in_Nodejs) - Best practices for URL validation

## Metadata

**Confidence breakdown:**
- Current implementation: HIGH - Direct codebase inspection shows exact flow
- Validation approach: HIGH - Node.js fetch + URL API are well-documented, battle-tested
- UI patterns: HIGH - Domain extraction and display are standard web practices
- Hallucination detection: MEDIUM - Academic research is recent (2026), but not yet industry standard

**Research date:** 2026-02-09
**Valid until:** 30 days (stable domain - web APIs don't change rapidly)
