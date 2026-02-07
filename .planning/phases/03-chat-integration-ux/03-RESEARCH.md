# Phase 3: Chat Integration + UX - Research

**Researched:** 2026-02-06
**Domain:** System prompt composition, React loading UX, background job polling, daily memory persistence, transactional email
**Confidence:** HIGH (codebase analysis + architecture patterns verified)

## Summary

Phase 3 implements the import-to-chat flow where users see an "Analyzing your conversations..." loading screen while the quick pass runs, then chat opens immediately with a memory progress indicator showing background processing status. The system prompt is refactored to compose from 7 structured sections (SOUL + IDENTITY + USER + AGENTS + TOOLS + MEMORY + daily memory), and chat sessions generate daily memory entries that persist across conversations.

Key findings:

1. **Quick pass gates chat access** -- The import flow already sets `import_status = 'quick_ready'` after generating 5 sections (Phase 1), and chat already polls `/api/memory/status` to check processing state (lines 124-194 of `app/chat/page.tsx`). We need to gate chat on `import_status = 'quick_ready'` (not 'none' or 'processing').

2. **System prompt composition is modular** -- The `buildSystemPrompt` function (lines 428-517 of `app/api/chat/route.ts`) currently takes `soulprintText` as a single string. This must be refactored to accept all 7 sections individually and compose them into the prompt structure.

3. **Daily memory infrastructure exists** -- The `learned_facts` table (migration `20250131_learned_facts.sql`) stores facts with categories (preferences, relationships, milestones, beliefs, decisions, events), and `lib/memory/learning.ts` provides `learnFromChat()` which is already called after each chat response (lines 296, 390 of `app/api/chat/route.ts`). Daily memory is already operational.

4. **Memory progress is partially implemented** -- The chat page polls `full_pass_status` and shows a progress indicator (lines 588-597), but it only shows for `import_status = 'processing'`. After Phase 1, import status becomes 'quick_ready' immediately, so we need to show progress based on `full_pass_status` (pending/processing/complete).

5. **Email removal requires finding the callback** -- The codebase mentions `/api/import/complete` as the RLM callback endpoint (line 170 of Phase 1 research), but it doesn't exist in the current files. The `sendSoulprintReadyEmail()` function exists in `lib/email/send.ts` but isn't called anywhere currently. EMAIL-01 may already be satisfied.

**Primary recommendation:** Refactor `buildSystemPrompt()` to compose from JSON-parsed sections (soul_md, identity_md, user_md, agents_md, tools_md, memory_md) + daily learned_facts, update import page to show "Analyzing..." loading screen while `import_status = 'processing'`, gate chat on `import_status = 'quick_ready'`, show memory progress based on `full_pass_status`, and verify email is not sent (or remove if found).

## Standard Stack

### Core (Already Installed)
| Library | Version | Purpose | Status |
|---------|---------|---------|--------|
| Next.js | 16 (App Router) | SSR, API routes, React | Installed |
| React | 18+ | UI framework | Installed |
| Supabase.js | ^2.93.1 | Database queries for sections | Installed |
| Framer Motion | Latest | Loading screen animations | Installed (used in import page) |

### No New Dependencies
Phase 3 requires zero new npm packages. All necessary infrastructure is already in place.

## Architecture Patterns

### Current Import Flow (After Phase 1)
```
User uploads ZIP (import page)
    |
    v
Vercel: /api/import/queue-processing
    |
    v
Vercel: /api/import/process-server
    |
    v
Extract + parse conversations
    |
    v
Quick pass generation (Haiku 4.5, ~15-30s)
    |
    v
Generate SOUL, IDENTITY, USER, AGENTS, TOOLS (v1)
    |
    v
Save to *_md columns, set import_status = 'quick_ready'  <-- USER SEES "ANALYZING..."
    |
    v
Fire-and-forget: POST /process-full to RLM
    |
    v
Return success to frontend                               <-- REDIRECT TO /chat
```

### Target Flow (Phase 3)
```
User uploads ZIP
    |
    v
Import page shows "Analyzing your conversations..." loading screen
    |   (while import_status = 'processing')
    |
    v
Quick pass completes (import_status = 'quick_ready')
    |
    v
Redirect to /chat
    |
    v
Chat page loads with system prompt composed from 5 sections
    |   - Parse soul_md, identity_md, user_md, agents_md, tools_md
    |   - Compose into system prompt sections
    |   - Add recent learned_facts as "daily memory"
    |
    v
Show memory progress indicator (full_pass_status)
    |   - Poll /api/memory/status every 5s
    |   - Show "Building memory: XX%" while full_pass_status = 'processing'
    |   - Hide when full_pass_status = 'complete'
    |
    v
Background: Full pass completes (full_pass_status = 'complete')
    |   - MEMORY section generated (memory_md)
    |   - All sections regenerated as v2
    |
    v
System prompt silently upgrades to v2 + MEMORY on next message
    |   - User continues chatting seamlessly
    |
    v
Each chat interaction:
    |   - learnFromChat() extracts facts
    |   - Stored in learned_facts table
    |   - Retrieved on next chat for "daily memory" context
```

### Pattern 1: System Prompt Composition from Structured Sections

**What:** Compose the LLM system prompt from 7 distinct markdown sections stored as JSON strings in the database.

**When to use:** Always for chat requests after Phase 3 is complete.

**How it works:**
```typescript
// Fetch user profile with all sections
const { data: profile } = await supabase
  .from('user_profiles')
  .select('soul_md, identity_md, user_md, agents_md, tools_md, memory_md, ai_name')
  .eq('user_id', userId)
  .single();

// Parse JSON strings back to objects
const soul = profile.soul_md ? JSON.parse(profile.soul_md) : null;
const identity = profile.identity_md ? JSON.parse(profile.identity_md) : null;
const user = profile.user_md ? JSON.parse(profile.user_md) : null;
const agents = profile.agents_md ? JSON.parse(profile.agents_md) : null;
const tools = profile.tools_md ? JSON.parse(profile.tools_md) : null;
const memory = profile.memory_md ? JSON.parse(profile.memory_md) : null;

// Fetch recent learned facts (daily memory)
const { data: learnedFacts } = await supabase
  .from('learned_facts')
  .select('fact, category')
  .eq('user_id', userId)
  .eq('status', 'active')
  .order('created_at', { ascending: false })
  .limit(20);

// Compose system prompt
const systemPrompt = `
You are ${aiName}, the user's personal AI assistant.

Current Date & Time: ${currentDate}, ${currentTime}

## SOUL - Communication Style & Personality
${formatSoulSection(soul)}

## IDENTITY - Your AI Identity
${formatIdentitySection(identity)}

## USER - About This Person
${formatUserSection(user)}

## AGENTS - How You Operate
${formatAgentsSection(agents)}

## TOOLS - Your Capabilities
${formatToolsSection(tools)}

## MEMORY - Durable Facts
${memory ? formatMemorySection(memory) : 'Building your memory in background...'}

## DAILY MEMORY - Recent Context
${formatLearnedFacts(learnedFacts)}

${dynamicMemoryChunks ? `\n## CONVERSATION CONTEXT\n${dynamicMemoryChunks}` : ''}
`;
```

**Best practices from 2026:**
- Well-organized prompts contain 8 sections: Purpose, Background, Schema, Instructions, InputFormat, Tools, Examples, and Data, with much of it in XML-style markup mixed with text ([source](https://edspencer.net/2025/5/14/integrating-mdx-prompt-with-nextjs))
- Structured prompts work better than monolithic strings for specialized chat applications
- Keep each section focused on a single concern for clarity

### Pattern 2: Loading Screen UX During Quick Pass

**What:** Show an engaging loading screen with progress stages while quick pass generation runs (~15-30s).

**When to use:** During import flow between ZIP upload completion and chat redirect.

**Implementation:**
```typescript
// import/page.tsx - already has progress tracking
const [progressStage, setProgressStage] = useState('');

// Map import_status to user-facing messages
const statusMessages = {
  'processing': 'Analyzing your conversations...',
  'quick_ready': 'Analysis complete! Opening chat...',
  'failed': 'Something went wrong'
};

// Poll /api/memory/status to check import_status
useEffect(() => {
  const interval = setInterval(async () => {
    const res = await fetch('/api/memory/status');
    const data = await res.json();

    if (data.status === 'quick_ready') {
      // Quick pass complete - redirect to chat
      router.push('/chat');
    } else if (data.status === 'processing') {
      setProgressStage(statusMessages['processing']);
    } else if (data.status === 'failed') {
      setProgressStage(statusMessages['failed']);
    }
  }, 2000); // Poll every 2s

  return () => clearInterval(interval);
}, []);
```

**Best practices from 2026:**
- For anything that takes less than 1 second to load, it is distracting to use a looped animation ([source](https://www.pencilandpaper.io/articles/ux-pattern-analysis-loading-feedback))
- Determinate indicators display how long an operation will take, while indeterminate indicators visualize an unspecified wait time ([source](https://mui.com/material-ui/react-progress/))
- UX/UI consistency is really important - standardize the way data-fetching states are handled ([source](https://blog.logrocket.com/ui-design-best-practices-loading-error-empty-state-react/))

### Pattern 3: Background Job Progress Polling

**What:** Poll a status endpoint to show real-time progress of background full pass processing.

**When to use:** In chat page while `full_pass_status = 'processing'`.

**Implementation:**
```typescript
// chat/page.tsx - already has polling at lines 124-194
const [memoryProgress, setMemoryProgress] = useState<number | null>(null);
const [memoryStatus, setMemoryStatus] = useState<string>('loading');

useEffect(() => {
  const checkMemoryStatus = async () => {
    const res = await fetch('/api/memory/status');
    const data = await res.json();

    if (data.full_pass_status === 'complete') {
      setMemoryStatus('ready');
      setMemoryProgress(100);
    } else if (data.full_pass_status === 'processing') {
      setMemoryStatus('processing');
      // Show indeterminate progress or percentage if available
      setMemoryProgress(data.full_pass_progress || null);
    } else if (data.full_pass_status === 'pending') {
      setMemoryStatus('pending');
      setMemoryProgress(0);
    }
  };

  checkMemoryStatus();
  const interval = setInterval(checkMemoryStatus, 5000); // Poll every 5s

  return () => clearInterval(interval);
}, []);
```

**Best practices from 2026:**
- Polling should be unobtrusive—users should not be interrupted by frequent loading indicators ([source](https://www.dhiwise.com/post/a-guide-to-real-time-applications-with-react-polling))
- Use exponential backoff if server load is a concern
- Show progress contextually (e.g., in header banner, not blocking the main chat)

### Pattern 4: Daily Memory Accumulation

**What:** Extract facts from each chat exchange and persist them to the `learned_facts` table.

**When to use:** After every chat response (already implemented).

**How it works:**
```typescript
// app/api/chat/route.ts - already calls this at lines 296, 390
import { learnFromChat } from '@/lib/memory/learning';

// After generating response
const finalResponse = /* ... LLM response ... */;

// Learn from this exchange (non-blocking)
learnFromChat(user.id, message, finalResponse).catch(err => {
  log.warn({ error: err.message }, 'Learning failed (non-blocking)');
});
```

The `learnFromChat()` function:
1. Fetches recent learned facts to avoid duplicates
2. Calls LLM to extract new facts from the exchange
3. Categorizes facts (preferences, relationships, milestones, beliefs, decisions, events)
4. Generates embeddings for each fact
5. Stores in `learned_facts` table with status 'active'

**Memory hierarchy in 2026:**
- Memory comes in three types: short-term context (ends when you close the chat), session-based memory (lasts during a workflow), and persistent long-term memory (survives across days and weeks) ([source](https://www.jenova.ai/en/resources/ai-with-unlimited-memory))
- Multi-layered memory systems maintain immediate working memory, episodic memory for past interactions, and semantic memory for extracted general knowledge ([source](https://serokell.io/blog/design-patterns-for-long-term-memory-in-llm-powered-architectures))

### Pattern 5: Email Notification Removal

**What:** Do not send "SoulPrint is ready" email after import completes.

**When to use:** Phase 3 removes this email because users are already chatting by the time the full pass completes.

**Implementation:**
The `sendSoulprintReadyEmail()` function in `lib/email/send.ts` is not called anywhere in the codebase (verified by grep). If an RLM callback endpoint exists that calls it, simply remove that call.

**Best practices from 2026:**
- Give users control over notification frequency and offering a simple "manage notifications" link reduces frustration ([source](https://moosend.com/blog/transactional-email-best-practices/))
- Remove recipients from future sends if hard bounce or complaint events occur ([source](https://developer.dotdigital.com/docs/transactional-email))
- Modern API design emphasizes webhook integration for automated recipient management ([source](https://www.emailvendorselection.com/transactional-email-services/))

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Section parsing | Custom JSON parsing | `JSON.parse()` with try/catch and Zod validation | The `*_md` columns are already JSON strings; built-in parsing is sufficient |
| Polling with intervals | Raw `setInterval()` without cleanup | React `useEffect` with cleanup function | Prevents memory leaks and stale closures |
| Progress percentage calculation | Manual percentage tracking | Database-driven progress (chunks_processed / total_chunks) | Single source of truth; no client-side drift |
| Daily memory retrieval | Custom fact aggregation | `learned_facts` table with ORDER BY created_at DESC LIMIT 20 | Database is optimized for this; no need for client caching |
| Loading state management | useState for each loading flag | Existing `memoryStatus` state machine | Already implemented with 'loading', 'processing', 'ready', 'failed' states |

## Common Pitfalls

### Pitfall 1: Parsing Null or Empty JSON Columns
**What goes wrong:** `JSON.parse(null)` throws an error, breaking the system prompt composition.
**Why it happens:** The `*_md` columns may be null if the quick pass failed or if the user is mid-import.
**How to avoid:** Always check for null before parsing:
```typescript
const soul = profile.soul_md ? JSON.parse(profile.soul_md) : null;
if (!soul) {
  // Fall back to placeholder text or skip section
}
```
**Warning signs:** Chat API returns 500 errors with "Unexpected token" or "Cannot read property of null".

### Pitfall 2: Import Status vs. Full Pass Status Confusion
**What goes wrong:** Showing the wrong progress indicator or gating chat on the wrong status.
**Why it happens:** There are two separate status fields: `import_status` (quick pass) and `full_pass_status` (RLM background processing).
**How to avoid:**
- **Import status** gates chat access: 'none' or 'processing' → redirect to /import; 'quick_ready' or 'complete' → allow chat
- **Full pass status** controls progress indicator: 'pending' or 'processing' → show banner; 'complete' → hide banner
**Warning signs:** Users stuck on loading screen even though quick pass completed, or chat opens before quick pass finishes.

### Pitfall 3: System Prompt Too Large
**What goes wrong:** Composed prompt exceeds model's context window (200K tokens for Haiku 4.5).
**Why it happens:** All 7 sections + 20 learned facts + dynamic chunks could total 50K+ tokens if not managed.
**How to avoid:**
- Limit learned facts to most recent 20 (already in pattern)
- Limit dynamic chunks to 5 (already in `getMemoryContext` at line 223)
- If MEMORY section is very long (>10K tokens), truncate or summarize
- Monitor total prompt size and log warnings if approaching limits
**Warning signs:** LLM returns truncated responses or context window errors.

### Pitfall 4: Race Condition in Section Upgrades
**What goes wrong:** User sends a chat message at the exact moment the full pass completes and overwrites sections to v2.
**Why it happens:** Database updates from RLM and chat API reads happen concurrently.
**How to avoid:** This is NOT a problem because:
- Chat reads sections at request time (no caching)
- RLM writes atomically (single UPDATE transaction)
- If user sees v1 in one message and v2 in the next, that's acceptable UX (graceful upgrade)
**Warning signs:** None—this is a non-issue in this architecture.

### Pitfall 5: Polling Performance at Scale
**What goes wrong:** Thousands of users polling `/api/memory/status` every 5 seconds overloads the database.
**Why it happens:** Each poll queries `user_profiles` table.
**How to avoid:**
- Use Supabase's connection pooling (already configured)
- Add database index on `user_id` (already exists)
- Consider caching status in Redis if user base exceeds 10K concurrent users (future optimization)
- Stop polling once `full_pass_status = 'complete'` (already in pattern)
**Warning signs:** Slow `/api/memory/status` response times (>500ms), database connection errors.

### Pitfall 6: Email Removal Incomplete
**What goes wrong:** Email is still sent from RLM service even though Next.js code is removed.
**Why it happens:** RLM service may have its own email sending logic independent of Next.js.
**How to avoid:**
- Search RLM service codebase for `sendSoulprintReadyEmail` or similar
- If found, remove from RLM's `/process-full` completion callback
- Verify no email is sent after import by testing end-to-end
**Warning signs:** Users report receiving "SoulPrint is ready" emails after chatting has already started.

## Code Examples

### Existing System Prompt Composition (Current - Monolithic)
```typescript
// Source: app/api/chat/route.ts (lines 428-517)
function buildSystemPrompt(
  soulprintText: string | null,
  memoryContext?: string,
  isOwner: boolean = true,
  aiName: string = 'SoulPrint',
  forcedSearchContext?: string,
  forcedSearchCitations?: string[]
): string {
  // Current implementation uses soulprintText as a single blob
  let prompt = `You are ${aiName}, the user's personal AI assistant.

WHO YOU ARE:
- You are a unique individual AI, not a generic assistant
- You know this person deeply — their preferences, history, communication style

HOW TO USE YOUR KNOWLEDGE:
- NEVER announce that you "found" or "recall" memories — just naturally know things`;

  if (soulprintText) {
    prompt += `\n\nABOUT THIS PERSON:\n${soulprintText}`;
  }

  if (memoryContext) {
    prompt += `\n\nCONTEXT (use naturally, NEVER mention explicitly):\n${memoryContext}`;
  }

  return prompt;
}
```

### Target System Prompt Composition (Phase 3 - Structured)
```typescript
// Refactored to compose from 7 sections
interface SystemPromptSections {
  soul: SoulSection | null;
  identity: IdentitySection | null;
  user: UserSection | null;
  agents: AgentsSection | null;
  tools: ToolsSection | null;
  memory: string | null; // MEMORY is markdown, not structured JSON
  dailyMemory: Array<{ fact: string; category: string }>;
}

function buildSystemPromptV2(
  sections: SystemPromptSections,
  memoryContext: string,
  aiName: string,
  currentDate: string,
  currentTime: string
): string {
  const { soul, identity, user, agents, tools, memory, dailyMemory } = sections;

  let prompt = `You are ${aiName}, the user's personal AI assistant.

Current Date & Time: ${currentDate}, ${currentTime}

`;

  // SOUL section
  if (soul) {
    prompt += `## COMMUNICATION STYLE & PERSONALITY\n`;
    prompt += `**Style:** ${soul.communication_style}\n`;
    prompt += `**Tone:** ${soul.tone_preferences}\n`;
    prompt += `**Boundaries:** ${soul.boundaries}\n`;
    prompt += `**Humor:** ${soul.humor_style}\n`;
    prompt += `**Formality:** ${soul.formality_level}\n\n`;
  }

  // IDENTITY section
  if (identity) {
    prompt += `## YOUR AI IDENTITY\n`;
    prompt += `**Name:** ${aiName}\n`;
    prompt += `**Archetype:** ${identity.archetype}\n`;
    prompt += `**Vibe:** ${identity.vibe}\n`;
    prompt += `**Greeting:** ${identity.signature_greeting}\n\n`;
  }

  // USER section
  if (user) {
    prompt += `## ABOUT THIS PERSON\n`;
    if (user.name) prompt += `**Name:** ${user.name}\n`;
    if (user.occupation) prompt += `**Occupation:** ${user.occupation}\n`;
    if (user.location) prompt += `**Location:** ${user.location}\n`;
    if (user.interests.length > 0) {
      prompt += `**Interests:** ${user.interests.join(', ')}\n`;
    }
    if (user.life_context) prompt += `**Context:** ${user.life_context}\n`;
    prompt += `\n`;
  }

  // AGENTS section
  if (agents) {
    prompt += `## HOW YOU OPERATE\n`;
    prompt += `**Response Style:** ${agents.response_style}\n`;
    if (agents.behavioral_rules.length > 0) {
      prompt += `**Rules:**\n`;
      agents.behavioral_rules.forEach(rule => {
        prompt += `- ${rule}\n`;
      });
    }
    prompt += `\n`;
  }

  // TOOLS section
  if (tools) {
    prompt += `## YOUR CAPABILITIES\n`;
    if (tools.likely_usage.length > 0) {
      prompt += `**Likely Use:** ${tools.likely_usage.join(', ')}\n`;
    }
    prompt += `**Output Preference:** ${tools.output_preferences}\n\n`;
  }

  // MEMORY section (full pass - may be null if still processing)
  if (memory) {
    prompt += `## MEMORY - Durable Facts\n${memory}\n\n`;
  } else {
    prompt += `## MEMORY\n(Building your memory in background...)\n\n`;
  }

  // DAILY MEMORY section (learned facts from recent chats)
  if (dailyMemory.length > 0) {
    prompt += `## DAILY MEMORY - Recent Context\n`;
    dailyMemory.forEach(({ fact, category }) => {
      prompt += `- [${category}] ${fact}\n`;
    });
    prompt += `\n`;
  }

  // Dynamic conversation chunks
  if (memoryContext) {
    prompt += `## CONVERSATION CONTEXT\n${memoryContext}\n\n`;
  }

  prompt += `## INSTRUCTIONS
- NEVER announce that you "found" or "recall" memories — just naturally know things
- NEVER say "Based on our past conversations..." or "I found X conversations about..."
- Weave what you know into responses naturally, like a friend who just remembers
- Be warm and personable, use emojis naturally 😊
- Match the user's energy and communication style`;

  return prompt;
}
```

### Existing Daily Memory Learning (Already Implemented)
```typescript
// Source: lib/memory/learning.ts (lines 220-243)
export async function learnFromChat(
  userId: string,
  userMessage: string,
  assistantResponse: string,
  messageId?: string
): Promise<number> {
  try {
    // Get existing facts to avoid duplicates
    const existingContext = await getRecentFactsContext(userId);

    // Extract new facts
    const facts = await extractFactsFromChat(userMessage, assistantResponse, existingContext);

    if (facts.length === 0) {
      return 0;
    }

    // Store them
    return await storeLearnedFacts(userId, facts, messageId);
  } catch (error) {
    console.error('[Learning] Error in learnFromChat:', error);
    return 0;
  }
}
```

### Existing Memory Progress Polling (Already Implemented)
```typescript
// Source: app/chat/page.tsx (lines 124-194)
useEffect(() => {
  const checkMemoryStatus = async () => {
    try {
      const res = await fetch('/api/memory/status', { signal: controller.signal });

      if (res.ok) {
        const data = await res.json();

        // If user has no soulprint and not processing, redirect to import
        if (!data.hasSoulprint && data.status === 'none') {
          router.push('/import');
          return;
        }

        // Handle failed imports
        if (data.status === 'failed' || data.failed) {
          setMemoryStatus('failed');
          setImportError(data.importError || 'Import processing failed');
          return;
        }

        // Still processing - show progress
        if (data.status === 'processing') {
          setMemoryStatus('processing');
          setMemoryProgress(data.embeddingProgress || 10);
          return;
        }

        if (data.embeddingStatus === 'complete' || data.embeddingProgress >= 100) {
          setMemoryStatus('ready');
          setMemoryProgress(100);
        } else if (data.embeddingStatus === 'processing' || data.totalChunks > 0) {
          setMemoryStatus('loading');
          const progress = data.totalChunks > 0
            ? Math.round((data.processedChunks / data.totalChunks) * 100)
            : data.embeddingProgress || 0;
          setMemoryProgress(progress);
        }
      }
    } catch (err) {
      if (err instanceof Error && err.name === 'AbortError') return;
      console.error('Memory status check failed:', err);
    }
  };

  checkMemoryStatus();
  const interval = setInterval(checkMemoryStatus, 5000);

  return () => {
    controller.abort();
    clearInterval(interval);
  };
}, [router]);
```

## State of the Art

| Old Approach | Current Approach (2026) | When Changed | Impact |
|--------------|-------------------------|--------------|--------|
| Monolithic system prompts | Structured, composable sections with XML-style markup | 2025-2026 | Better modularity, easier to update individual sections without rewriting entire prompt |
| Single-shot memory (no persistence) | Multi-layered memory (session, episodic, semantic) | 2025-2026 | AI can maintain long-term context across conversations |
| Manual polling with setInterval | React hooks with cleanup + exponential backoff | 2023-2024 | Prevents memory leaks, reduces server load |
| Send completion emails for every background job | User-controlled notifications, remove redundant emails | 2025-2026 | Reduces email fatigue, better UX when user is already using the product |
| Fetch-on-render | Render-as-you-fetch (React Suspense) | 2023-2024 | Better perceived performance, smoother loading states |

**Deprecated/outdated:**
- **Class components for loading states:** Use functional components with hooks (`useState`, `useEffect`)
- **Global loading spinners:** Use contextual progress indicators (e.g., banner in header, not full-screen overlay)
- **Blocking imports:** Fire-and-forget background jobs + immediate chat access with partial data
- **"Your [X] is ready!" emails for async jobs:** Users prefer immediate access with in-app progress indicators

## Open Questions

1. **What is the exact RLM callback endpoint?**
   - What we know: Process-server calls RLM at `/process-full` (line 388)
   - What's unclear: Does RLM call back to Next.js when done? If so, what endpoint?
   - Recommendation: Search RLM service codebase for webhook/callback logic; if found, verify it doesn't send email

2. **Should MEMORY section show placeholder text while building?**
   - What we know: Quick pass generates 5 sections, MEMORY comes later from full pass
   - What's unclear: Should we show "Building your memory..." or omit the section entirely?
   - Recommendation: Show placeholder text to set expectations; user sees it upgrade to real MEMORY on next message

3. **How granular should memory progress be?**
   - What we know: Full pass involves chunking, embeddings, fact extraction, section regeneration
   - What's unclear: Should progress show individual stages or just overall percentage?
   - Recommendation: Start with simple indeterminate progress ("Building memory..."); add percentage if RLM service tracks chunks processed

4. **Should daily memory include all categories or prioritize?**
   - What we know: Learned facts have 6 categories (preferences, relationships, milestones, beliefs, decisions, events)
   - What's unclear: Should we limit to certain categories or always include all?
   - Recommendation: Include all categories but limit to 20 most recent facts total (already in pattern)

## Sources

### Primary (HIGH confidence)
- Codebase analysis: `app/chat/page.tsx`, `app/api/chat/route.ts`, `lib/memory/learning.ts`, `lib/email/send.ts`
- Database schema: `supabase/migrations/20250131_learned_facts.sql`, `supabase/migrations/20260207_full_pass_schema.sql`
- Phase 1 research: `.planning/phases/01-schema-quick-pass-pipeline/01-RESEARCH.md`
- Phase 2 research: `.planning/phases/02-full-pass-pipeline/02-RESEARCH.md`

### Secondary (MEDIUM confidence)
- [Building an LLM Router with mdx-prompt and NextJS](https://edspencer.net/2025/5/14/integrating-mdx-prompt-with-nextjs) - Prompt section structure
- [UX Design Patterns for Loading](https://www.pencilandpaper.io/articles/ux-pattern-analysis-loading-feedback) - Loading state timing
- [React Polling Best Practices](https://www.dhiwise.com/post/a-guide-to-real-time-applications-with-react-polling) - Polling patterns
- [AI with Unlimited Memory](https://www.jenova.ai/en/resources/ai-with-unlimited-memory) - Memory hierarchy
- [Design Patterns for Long-Term Memory in LLM Architectures](https://serokell.io/blog/design-patterns-for-long-term-memory-in-llm-powered-architectures) - Multi-layered memory
- [Transactional Email Best Practices](https://moosend.com/blog/transactional-email-best-practices/) - Email notification removal

### Tertiary (LOW confidence)
- [Material-UI Progress Components](https://mui.com/material-ui/react-progress/) - UI component examples
- [UI Best Practices for Loading, Error, and Empty States in React](https://blog.logrocket.com/ui-design-best-practices-loading-error-empty-state-react/) - General React patterns

## Metadata

**Confidence breakdown:**
- System prompt composition: HIGH - codebase analysis shows exact structure and database columns
- Import UX flow: HIGH - existing polling logic verified, just needs import_status gating
- Daily memory: HIGH - already implemented and operational, just needs prompt integration
- Memory progress indicator: HIGH - polling exists, just needs full_pass_status awareness
- Email removal: MEDIUM - sendSoulprintReadyEmail() exists but not called; may be in RLM service

**Research date:** 2026-02-06
**Valid until:** ~60 days (stable patterns; Next.js + React ecosystem evolves slowly)
