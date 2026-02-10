"use client";

import { useState } from "react";

type Tab = "overview" | "import" | "chat" | "status";

export default function ArchitecturePage() {
  const [activeTab, setActiveTab] = useState<Tab>("overview");

  return (
    <div className="min-h-screen bg-[#0a0a0f] text-white font-mono">
      {/* Header */}
      <header className="border-b border-white/10 px-6 py-4">
        <h1 className="text-2xl font-bold tracking-tight">
          SoulPrint <span className="text-purple-400">Architecture Map</span>
        </h1>
        <p className="text-sm text-white/50 mt-1">
          Two repos, one system — how everything connects
        </p>
      </header>

      {/* Tabs */}
      <nav className="flex gap-1 px-6 pt-4 border-b border-white/10">
        {(
          [
            ["overview", "System Overview"],
            ["import", "Import Pipeline"],
            ["chat", "Chat Flow"],
            ["status", "Implementation Status"],
          ] as const
        ).map(([key, label]) => (
          <button
            key={key}
            onClick={() => setActiveTab(key)}
            className={`px-4 py-2 text-sm rounded-t-lg transition-colors ${
              activeTab === key
                ? "bg-white/10 text-white border border-white/20 border-b-transparent"
                : "text-white/40 hover:text-white/70"
            }`}
          >
            {label}
          </button>
        ))}
      </nav>

      {/* Content */}
      <main className="p-6 max-w-7xl mx-auto">
        {activeTab === "overview" && <SystemOverview />}
        {activeTab === "import" && <ImportPipeline />}
        {activeTab === "chat" && <ChatFlow />}
        {activeTab === "status" && <ImplementationStatus />}
      </main>
    </div>
  );
}

/* ─── Reusable Components ─── */

function Box({
  title,
  subtitle,
  children,
  color = "white",
  glow = false,
}: {
  title: string;
  subtitle?: string;
  children?: React.ReactNode;
  color?: string;
  glow?: boolean;
}) {
  const colorMap: Record<string, string> = {
    white: "border-white/20 bg-white/5",
    purple: "border-purple-500/40 bg-purple-500/10",
    blue: "border-blue-500/40 bg-blue-500/10",
    green: "border-green-500/40 bg-green-500/10",
    orange: "border-orange-500/40 bg-orange-500/10",
    red: "border-red-500/40 bg-red-500/10",
    cyan: "border-cyan-500/40 bg-cyan-500/10",
    yellow: "border-yellow-500/40 bg-yellow-500/10",
  };

  return (
    <div
      className={`border rounded-xl p-4 ${colorMap[color] || colorMap.white} ${
        glow ? "shadow-lg shadow-purple-500/20" : ""
      }`}
    >
      <h3 className="font-bold text-sm">{title}</h3>
      {subtitle && (
        <p className="text-xs text-white/40 mt-0.5">{subtitle}</p>
      )}
      {children && <div className="mt-3 text-xs text-white/70">{children}</div>}
    </div>
  );
}

function Arrow({ label, direction = "down" }: { label?: string; direction?: "down" | "right" | "both" }) {
  if (direction === "right") {
    return (
      <div className="flex items-center gap-1 px-2 self-center">
        <div className="h-px w-8 bg-white/30" />
        <span className="text-[10px] text-white/40 whitespace-nowrap">{label}</span>
        <div className="h-px w-8 bg-white/30" />
        <span className="text-white/30">&#x2192;</span>
      </div>
    );
  }
  if (direction === "both") {
    return (
      <div className="flex items-center gap-1 px-2 self-center">
        <span className="text-white/30">&#x2190;</span>
        <div className="h-px w-6 bg-white/30" />
        <span className="text-[10px] text-white/40 whitespace-nowrap">{label}</span>
        <div className="h-px w-6 bg-white/30" />
        <span className="text-white/30">&#x2192;</span>
      </div>
    );
  }
  return (
    <div className="flex flex-col items-center py-1">
      <div className="w-px h-4 bg-white/30" />
      {label && <span className="text-[10px] text-white/40 px-1">{label}</span>}
      <span className="text-white/30 text-xs">&#x25BC;</span>
    </div>
  );
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return (
    <h2 className="text-lg font-bold mb-4 flex items-center gap-2">
      {children}
    </h2>
  );
}

function Legend({ items }: { items: { color: string; label: string }[] }) {
  const dotColors: Record<string, string> = {
    purple: "bg-purple-400",
    blue: "bg-blue-400",
    green: "bg-green-400",
    orange: "bg-orange-400",
    red: "bg-red-400",
    cyan: "bg-cyan-400",
    yellow: "bg-yellow-400",
    white: "bg-white",
  };
  return (
    <div className="flex flex-wrap gap-4 mb-6 text-xs text-white/50">
      {items.map((item) => (
        <span key={item.label} className="flex items-center gap-1.5">
          <span className={`w-2 h-2 rounded-full ${dotColors[item.color] || "bg-white"}`} />
          {item.label}
        </span>
      ))}
    </div>
  );
}

/* ─── Tab: System Overview ─── */

function SystemOverview() {
  return (
    <div>
      <SectionTitle>Full System Architecture</SectionTitle>
      <Legend
        items={[
          { color: "purple", label: "soulprint-landing (Next.js / Vercel)" },
          { color: "blue", label: "soulprint-rlm (Python / Render)" },
          { color: "green", label: "Supabase (Postgres + Storage)" },
          { color: "orange", label: "AWS Bedrock (LLM + Embeddings)" },
          { color: "cyan", label: "External APIs" },
        ]}
      />

      {/* Row 1: User */}
      <div className="flex justify-center mb-2">
        <Box title="User (Browser)" color="white">
          <p>React SPA &mdash; Next.js App Router</p>
          <p className="mt-1 text-white/40">
            /import &bull; /chat &bull; /dashboard
          </p>
        </Box>
      </div>

      <Arrow label="HTTPS (Vercel)" />

      {/* Row 2: Next.js Backend */}
      <div className="border border-purple-500/30 rounded-2xl p-4 bg-purple-500/5 mb-2">
        <h4 className="text-xs text-purple-400 font-bold mb-3">
          soulprint-landing &mdash; Next.js API Routes (Vercel)
        </h4>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <Box title="/api/import/*" subtitle="Upload + trigger RLM" color="purple" />
          <Box title="/api/chat" subtitle="Streaming chat + memory" color="purple" />
          <Box title="/api/memory/*" subtitle="Status, query, synthesize" color="purple" />
          <Box title="/api/conversations/*" subtitle="CRUD conversations" color="purple" />
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-3">
          <Box title="Middleware" subtitle="CSRF + Auth guard" color="purple" />
          <Box title="lib/search/*" subtitle="Perplexity + Tavily" color="purple" />
          <Box title="lib/memory/*" subtitle="Vector search, facts" color="purple" />
          <Box title="lib/rlm/health" subtitle="Circuit breaker" color="purple" />
        </div>
      </div>

      <div className="flex justify-center gap-8 items-start">
        {/* Left: RLM */}
        <div className="flex flex-col items-center flex-1">
          <Arrow label="HTTP (fire & forget)" />
          <div className="border border-blue-500/30 rounded-2xl p-4 bg-blue-500/5 w-full">
            <h4 className="text-xs text-blue-400 font-bold mb-3">
              soulprint-rlm &mdash; FastAPI (Render)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Box title="/import-full" subtitle="Streaming import v2.2" color="blue" />
              <Box title="/process-import" subtitle="Quick pass soulprint" color="blue" />
              <Box title="/query" subtitle="Hybrid memory search" color="blue" />
              <Box title="/chat" subtitle="Memory-aware responses" color="blue" />
            </div>
            <div className="mt-3 grid grid-cols-1 md:grid-cols-3 gap-3">
              <Box title="Processors" color="blue">
                <ul className="space-y-0.5">
                  <li>quick_pass.py</li>
                  <li>full_pass.py (9-step)</li>
                  <li>streaming_import.py</li>
                  <li>conversation_chunker.py</li>
                  <li>fact_extractor.py</li>
                  <li>v2_regenerator.py</li>
                </ul>
              </Box>
              <Box title="Adapters" color="blue">
                <p>supabase_adapter.py</p>
                <p className="text-white/40 mt-1">Download, update profiles, save chunks via REST</p>
              </Box>
              <Box title="Models Used" color="blue">
                <ul className="space-y-0.5">
                  <li>Claude Haiku 4.5</li>
                  <li>Claude Sonnet 4.5</li>
                  <li>Nova Micro/Lite/Pro</li>
                  <li>Titan v2 (embeddings)</li>
                </ul>
              </Box>
            </div>
          </div>
        </div>

        {/* Right: Supabase */}
        <div className="flex flex-col items-center flex-1">
          <Arrow label="Supabase SDK / REST" />
          <div className="border border-green-500/30 rounded-2xl p-4 bg-green-500/5 w-full">
            <h4 className="text-xs text-green-400 font-bold mb-3">
              Supabase (Postgres + pgvector)
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <Box title="user_profiles" color="green">
                <p>soulprint_text, import_status, progress_percent, soul_md, identity_md, user_md, agents_md</p>
              </Box>
              <Box title="conversation_chunks" color="green">
                <p>Multi-tier vectors (100/500/2000 chars), layer tags, embeddings (1024d)</p>
              </Box>
              <Box title="chat_messages" color="green">
                <p>User &amp; AI messages, conversation threads</p>
              </Box>
              <Box title="learned_facts" color="green">
                <p>Auto-extracted facts with embeddings, categories, confidence scores</p>
              </Box>
            </div>
            <div className="mt-3">
              <Box title="Storage: imports bucket" subtitle="ChatGPT export ZIPs / JSON (gzip)" color="green" />
            </div>
          </div>
        </div>
      </div>

      {/* Bottom: External Services */}
      <div className="mt-4 flex justify-center">
        <Arrow label="" />
      </div>
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        <Box title="AWS Bedrock" subtitle="Claude + Titan embeddings" color="orange" />
        <Box title="Perplexity API" subtitle="Real-time web search" color="cyan" />
        <Box title="Tavily API" subtitle="Web search fallback" color="cyan" />
        <Box title="Resend" subtitle="Email notifications" color="cyan" />
      </div>
    </div>
  );
}

/* ─── Tab: Import Pipeline ─── */

function ImportPipeline() {
  return (
    <div>
      <SectionTitle>Import Pipeline (ChatGPT Export &rarr; SoulPrint)</SectionTitle>
      <p className="text-sm text-white/50 mb-6">
        Two paths: Desktop extracts JSON client-side (smaller upload), Mobile sends full ZIP.
        Both trigger the RLM service which processes in the background.
      </p>

      <div className="flex flex-col items-center max-w-2xl mx-auto">
        {/* Step 1 */}
        <Box title="1. User uploads ChatGPT export ZIP" color="white" glow>
          <p>/import page &mdash; file input or drag-and-drop</p>
        </Box>
        <Arrow />

        {/* Step 2 */}
        <Box title="2. Client-side extraction (Desktop)" color="purple">
          <p>JSZip extracts conversations.json from ZIP</p>
          <p className="text-white/40 mt-1">Mobile skips this &mdash; uploads full ZIP</p>
        </Box>
        <Arrow label="Upload to Supabase Storage" />

        {/* Step 3 */}
        <Box title="3. Store in Supabase Storage" color="green">
          <p>imports bucket &mdash; conversations.json (or full ZIP)</p>
          <p className="text-white/40 mt-1">Path: user_id/conversations.json</p>
        </Box>
        <Arrow label="POST /api/import/trigger" />

        {/* Step 4 */}
        <Box title="4. Next.js triggers RLM" color="purple">
          <p>/api/import/trigger &rarr; returns 202 immediately</p>
          <p className="text-white/40 mt-1">Sets import_status = &apos;processing&apos;</p>
        </Box>
        <Arrow label="POST /import-full (fire & forget)" />

        {/* Step 5 */}
        <div className="border border-blue-500/30 rounded-2xl p-4 bg-blue-500/5 w-full">
          <h4 className="text-xs text-blue-400 font-bold mb-3">
            5. RLM Service Processing (Background)
          </h4>
          <div className="space-y-2">
            <StepRow phase="Download" pct="0-20%" desc="Stream conversations.json from Supabase Storage" />
            <StepRow phase="Parse" pct="20-50%" desc="ijson streaming parser extracts conversations" />
            <StepRow phase="Quick Pass" pct="50-80%" desc="Sample richest 30-50 conversations, send to Claude Haiku 4.5" />
            <StepRow phase="Save" pct="80-95%" desc="Write soul_md, identity_md, user_md, agents_md to user_profiles" />
            <StepRow phase="Done" pct="100%" desc="Set import_status = 'quick_ready' or 'complete'" />
          </div>
          <div className="mt-4 border-t border-blue-500/20 pt-3">
            <p className="text-xs text-blue-300 font-bold">Full Pass (runs after quick pass):</p>
            <div className="space-y-1 mt-2">
              <StepRow phase="Chunk" pct="" desc="~2000-token chunks with 200-token overlap" />
              <StepRow phase="Embed" pct="" desc="Titan v2 embeddings (1024d) for all chunks" />
              <StepRow phase="Facts" pct="" desc="Parallel fact extraction with Claude Haiku" />
              <StepRow phase="Memory" pct="" desc="Generate MEMORY.md section" />
              <StepRow phase="V2 Regen" pct="" desc="Re-synthesize all 5 sections with full context" />
            </div>
          </div>
        </div>
        <Arrow label="Frontend polls /api/memory/status every 2s" />

        {/* Step 6 */}
        <Box title="6. Progress UI" color="purple">
          <p>Animated progress bar tracking progress_percent + import_stage</p>
          <p className="text-white/40 mt-1">Once complete &rarr; redirect to /chat</p>
        </Box>
        <Arrow label="Email via Resend" />

        {/* Step 7 */}
        <Box title="7. Email notification" color="cyan">
          <p>&quot;Your SoulPrint is ready!&quot; &mdash; link to /chat</p>
        </Box>
      </div>

      {/* Status States */}
      <div className="mt-8">
        <h3 className="text-sm font-bold mb-3">import_status State Machine</h3>
        <div className="flex flex-wrap items-center gap-2 text-xs">
          <span className="px-3 py-1.5 bg-white/10 rounded-lg border border-white/20">none</span>
          <span className="text-white/30">&rarr;</span>
          <span className="px-3 py-1.5 bg-yellow-500/20 rounded-lg border border-yellow-500/30 text-yellow-300">processing</span>
          <span className="text-white/30">&rarr;</span>
          <span className="px-3 py-1.5 bg-blue-500/20 rounded-lg border border-blue-500/30 text-blue-300">quick_ready</span>
          <span className="text-white/30">&rarr;</span>
          <span className="px-3 py-1.5 bg-green-500/20 rounded-lg border border-green-500/30 text-green-300">complete</span>
          <span className="text-white/30 ml-4">|</span>
          <span className="px-3 py-1.5 bg-red-500/20 rounded-lg border border-red-500/30 text-red-300">failed</span>
        </div>
        <div className="mt-3 text-xs text-white/40 space-y-1">
          <p><strong className="text-white/70">none</strong> &rarr; No import started, redirect to /import</p>
          <p><strong className="text-yellow-300/70">processing</strong> &rarr; RLM working, show progress bar, block chat</p>
          <p><strong className="text-blue-300/70">quick_ready</strong> &rarr; Quick soulprint done, chat allowed, full pass still running</p>
          <p><strong className="text-green-300/70">complete</strong> &rarr; Everything done, full memory available</p>
          <p><strong className="text-red-300/70">failed</strong> &rarr; Error occurred, show error + allow re-import</p>
        </div>
      </div>
    </div>
  );
}

function StepRow({ phase, pct, desc }: { phase: string; pct: string; desc: string }) {
  return (
    <div className="flex items-start gap-3 text-xs">
      <span className="text-blue-300 font-bold w-16 shrink-0">{phase}</span>
      {pct && <span className="text-white/30 w-12 shrink-0">{pct}</span>}
      <span className="text-white/60">{desc}</span>
    </div>
  );
}

/* ─── Tab: Chat Flow ─── */

function ChatFlow() {
  return (
    <div>
      <SectionTitle>Chat Flow (Message &rarr; Response)</SectionTitle>
      <p className="text-sm text-white/50 mb-6">
        Every message goes through memory retrieval, optional web search, prompt building,
        then streaming response. Facts are extracted after each exchange.
      </p>

      <div className="flex flex-col items-center max-w-2xl mx-auto">
        <Box title="User types message" color="white" glow>
          <p>TelegramChatV2 component &rarr; POST /api/chat</p>
        </Box>
        <Arrow label="With CSRF token + session" />

        <Box title="Auth + Rate Limit Check" color="purple">
          <p>Verify Supabase session, check rate limits, validate input (Zod)</p>
        </Box>
        <Arrow />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <div className="flex flex-col items-center">
            <Box title="Memory Retrieval" color="green">
              <p>1. Embed user query (Cohere v3 / Titan v2)</p>
              <p>2. Vector search conversation_chunks</p>
              <p>3. Hierarchical: macro &rarr; thematic &rarr; micro</p>
              <p>4. ~9 chunks + learned_facts returned</p>
            </Box>
          </div>
          <div className="flex flex-col items-center">
            <Box title="Web Search Decision" color="cyan">
              <p>needsRealtimeInfo() checks:</p>
              <p>&bull; News, prices, current events &rarr; search</p>
              <p>&bull; Memory questions, code &rarr; skip</p>
              <p>Perplexity (primary) / Tavily (fallback)</p>
            </Box>
          </div>
        </div>
        <Arrow label="Combine context" />

        <Box title="Prompt Builder" color="purple">
          <div className="space-y-1">
            <p><strong className="text-white/90">System prompt includes:</strong></p>
            <p>&bull; SoulPrint personality data (soul_md, identity_md, etc.)</p>
            <p>&bull; Retrieved memory chunks</p>
            <p>&bull; Learned facts about user</p>
            <p>&bull; Emotional intelligence adjustments</p>
            <p>&bull; Web search results (if any)</p>
            <p>&bull; Conversation history</p>
          </div>
        </Box>
        <Arrow label="Stream to Bedrock" />

        <Box title="AWS Bedrock &mdash; Claude 3.5 Haiku" color="orange">
          <p>Streaming response via InvokeModelWithResponseStream</p>
          <p className="text-white/40 mt-1">Each token chunk sent as JSON event to browser</p>
        </Box>
        <Arrow label="Stream to browser" />

        <Box title="Display in Chat UI" color="white">
          <p>Real-time token rendering in message bubble</p>
          <p className="text-white/40 mt-1">Citations shown if web search was used</p>
        </Box>
        <Arrow label="After response complete" />

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full">
          <Box title="Save Messages" color="green">
            <p>Both user + AI messages saved to chat_messages table</p>
          </Box>
          <Box title="Learn Facts" color="blue">
            <p>Claude extracts new facts from exchange</p>
            <p className="text-white/40 mt-1">Stored with embeddings, categories, confidence &ge; 0.7</p>
          </Box>
        </div>

        <div className="mt-4 w-full">
          <Arrow label="Auto-features (first message)" />
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Box title="AI Name Gen" subtitle="From soulprint personality" color="purple" />
            <Box title="Conv Title Gen" subtitle="From first exchange" color="purple" />
            <Box title="Rename Detection" subtitle="'Call yourself X'" color="purple" />
          </div>
        </div>
      </div>

      {/* Circuit Breaker */}
      <div className="mt-8 max-w-2xl mx-auto">
        <h3 className="text-sm font-bold mb-3">RLM Circuit Breaker</h3>
        <div className="flex items-center gap-2 text-xs">
          <span className="px-3 py-1.5 bg-green-500/20 rounded-lg border border-green-500/30 text-green-300">CLOSED (healthy)</span>
          <span className="text-white/30">&rarr; 2 failures &rarr;</span>
          <span className="px-3 py-1.5 bg-red-500/20 rounded-lg border border-red-500/30 text-red-300">OPEN (blocked)</span>
          <span className="text-white/30">&rarr; 30s cooldown &rarr;</span>
          <span className="px-3 py-1.5 bg-yellow-500/20 rounded-lg border border-yellow-500/30 text-yellow-300">HALF_OPEN (test)</span>
          <span className="text-white/30">&rarr; success &rarr;</span>
          <span className="px-3 py-1.5 bg-green-500/20 rounded-lg border border-green-500/30 text-green-300">CLOSED</span>
        </div>
      </div>
    </div>
  );
}

/* ─── Tab: Implementation Status ─── */

function ImplementationStatus() {
  return (
    <div>
      <SectionTitle>Implementation Status</SectionTitle>
      <p className="text-sm text-white/50 mb-6">
        Current state of the project across both repositories.
      </p>

      <div className="space-y-6">
        {/* Working */}
        <StatusSection
          title="Working"
          color="green"
          items={[
            { name: "Authentication", detail: "Email/password + Google OAuth via Supabase" },
            { name: "Chat Interface", detail: "Streaming responses, multi-conversation, sidebar, rename/delete" },
            { name: "Memory Retrieval", detail: "Hybrid keyword+vector search across 3-tier chunks" },
            { name: "Web Search", detail: "Perplexity primary, Tavily fallback, smart decision logic" },
            { name: "Database Schema", detail: "All tables + pgvector + RLS policies + migrations" },
            { name: "Import Trigger", detail: "Upload to Supabase Storage, fire-and-forget to RLM" },
            { name: "Quick Pass Soulprint", detail: "RLM samples 30-50 convos, generates 5 profile sections" },
            { name: "Progress Polling", detail: "Frontend polls /api/memory/status every 2s with progress bar" },
            { name: "Learned Facts", detail: "Auto-extraction from chat with embeddings + confidence scores" },
            { name: "Circuit Breaker", detail: "RLM health monitoring with CLOSED/OPEN/HALF_OPEN states" },
            { name: "CSRF Protection", detail: "Double submit cookie pattern on all mutating endpoints" },
            { name: "Cron Jobs", detail: "Memory synthesis (6h), quality refinement (daily)" },
          ]}
        />

        {/* In Progress */}
        <StatusSection
          title="In Progress"
          color="yellow"
          items={[
            { name: "Full Pass Pipeline", detail: "9-step deep analysis: chunking, facts, memory, v2 regen" },
            { name: "V2 Regeneration", detail: "Re-synthesize all 5 sections with full context (top 200 convos)" },
            { name: "Streaming Import", detail: "Memory-efficient ijson parsing for 300MB+ files" },
            { name: "Email Notifications", detail: "Resend integration ready, needs end-to-end testing" },
            { name: "Progress Tracking", detail: "import_stage + progress_percent columns (recently added)" },
            { name: "Job Recovery", detail: "RLM auto-resumes stuck jobs on startup (attempts < 3)" },
          ]}
        />

        {/* Not Implemented */}
        <StatusSection
          title="Not Implemented"
          color="red"
          items={[
            { name: "Voice Features", detail: "Enrollment, verification, transcription (routes exist, no logic)" },
            { name: "Full Admin Dashboard", detail: "Partial tools exist, no complete UI" },
            { name: "Push Notifications", detail: "Infrastructure present, not wired up" },
            { name: "Re-Import Flow", detail: "UI exists but full clear + reimport cycle needs testing" },
          ]}
        />

        {/* Tech Stack Summary */}
        <div className="mt-8">
          <h3 className="text-sm font-bold mb-3">Tech Stack At A Glance</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="border border-purple-500/30 rounded-xl p-4 bg-purple-500/5">
              <h4 className="text-xs text-purple-400 font-bold mb-2">soulprint-landing (Frontend + API)</h4>
              <div className="text-xs text-white/60 space-y-1">
                <p>Next.js 16 &bull; React 19 &bull; TypeScript</p>
                <p>Tailwind CSS &bull; shadcn/ui &bull; Framer Motion</p>
                <p>Supabase SDK &bull; AWS Bedrock SDK</p>
                <p>Zod validation &bull; Pino logging</p>
                <p className="text-white/40 mt-2">Deployed: Vercel (auto-deploy on push to main)</p>
              </div>
            </div>
            <div className="border border-blue-500/30 rounded-xl p-4 bg-blue-500/5">
              <h4 className="text-xs text-blue-400 font-bold mb-2">soulprint-rlm (Processing Service)</h4>
              <div className="text-xs text-white/60 space-y-1">
                <p>Python 3.12 &bull; FastAPI &bull; Uvicorn</p>
                <p>Anthropic SDK &bull; boto3 (Bedrock)</p>
                <p>ijson (streaming parser) &bull; httpx (async HTTP)</p>
                <p>Docker &bull; pytest</p>
                <p className="text-white/40 mt-2">Deployed: Render (Docker, port 10000)</p>
              </div>
            </div>
          </div>
        </div>

        {/* Key Files Reference */}
        <div className="mt-6">
          <h3 className="text-sm font-bold mb-3">Key Files Quick Reference</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div>
              <h4 className="text-purple-400 font-bold mb-2">soulprint-landing</h4>
              <table className="w-full">
                <tbody className="text-white/60">
                  <FileRow path="app/import/page.tsx" desc="Upload UI" />
                  <FileRow path="app/chat/page.tsx" desc="Chat interface" />
                  <FileRow path="app/api/import/trigger/route.ts" desc="RLM trigger" />
                  <FileRow path="app/api/chat/route.ts" desc="Chat streaming" />
                  <FileRow path="app/api/memory/status/route.ts" desc="Progress polling" />
                  <FileRow path="lib/memory/query.ts" desc="Vector search" />
                  <FileRow path="lib/rlm/health.ts" desc="Circuit breaker" />
                  <FileRow path="lib/search/smart-search.ts" desc="Web search logic" />
                  <FileRow path="middleware.ts" desc="CSRF + auth" />
                </tbody>
              </table>
            </div>
            <div>
              <h4 className="text-blue-400 font-bold mb-2">soulprint-rlm</h4>
              <table className="w-full">
                <tbody className="text-white/60">
                  <FileRow path="main.py" desc="FastAPI endpoints" />
                  <FileRow path="processors/quick_pass.py" desc="Fast soulprint" />
                  <FileRow path="processors/full_pass.py" desc="9-step deep analysis" />
                  <FileRow path="processors/streaming_import.py" desc="Large file import" />
                  <FileRow path="processors/fact_extractor.py" desc="Fact extraction" />
                  <FileRow path="processors/v2_regenerator.py" desc="Section re-synthesis" />
                  <FileRow path="adapters/supabase_adapter.py" desc="DB adapter" />
                  <FileRow path="prompt_helpers.py" desc="Markdown formatting" />
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function StatusSection({
  title,
  color,
  items,
}: {
  title: string;
  color: "green" | "yellow" | "red";
  items: { name: string; detail: string }[];
}) {
  const styles = {
    green: { dot: "bg-green-400", border: "border-green-500/30", bg: "bg-green-500/5", label: "text-green-400" },
    yellow: { dot: "bg-yellow-400", border: "border-yellow-500/30", bg: "bg-yellow-500/5", label: "text-yellow-400" },
    red: { dot: "bg-red-400", border: "border-red-500/30", bg: "bg-red-500/5", label: "text-red-400" },
  };
  const s = styles[color];

  return (
    <div className={`border ${s.border} rounded-xl p-4 ${s.bg}`}>
      <h3 className={`text-sm font-bold ${s.label} mb-3`}>
        {title} ({items.length})
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6 gap-y-2">
        {items.map((item) => (
          <div key={item.name} className="flex items-start gap-2 text-xs">
            <span className={`w-1.5 h-1.5 rounded-full ${s.dot} mt-1 shrink-0`} />
            <span>
              <strong className="text-white/90">{item.name}</strong>
              <span className="text-white/40"> &mdash; {item.detail}</span>
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

function FileRow({ path, desc }: { path: string; desc: string }) {
  return (
    <tr>
      <td className="py-0.5 pr-3 text-white/80 font-mono">{path}</td>
      <td className="py-0.5 text-white/40">{desc}</td>
    </tr>
  );
}
