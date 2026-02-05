# SoulPrint

## What This Is

SoulPrint is a privacy-first AI personalization platform. Users upload their ChatGPT export, we analyze it to create a "SoulPrint" (personality profile), and they get a personalized AI assistant that actually remembers them. No more repeating yourself — your AI knows your history, preferences, and context.

## Core Value

**Your AI should know you.** Import once, never repeat yourself again. The ONE thing that matters: seamless import → personalized chat that references your actual history.

## Requirements

### Validated

- ✓ Email/password authentication — v1.0
- ✓ Google OAuth — v1.0
- ✓ Client-side ChatGPT ZIP parsing (handles 10GB+) — v1.0
- ✓ Multi-tier memory chunking (100/500/2000 chars) — v1.0
- ✓ RLM-powered embeddings via Bedrock — v1.0
- ✓ Streaming chat responses — v1.0
- ✓ Memory-enhanced chat (context injection) — v1.0
- ✓ AI naming flow — v1.0
- ✓ Gamification (XP, achievements) — v1.0

### Active

- [ ] Full production deployment with monitoring
- [ ] User acceptance testing with real exports
- [ ] Error recovery and retry mechanisms
- [ ] Analytics and user tracking
- [ ] Email notifications (import complete)
- [ ] Voice enrollment/verification
- [ ] AI avatar generation

### Out of Scope

- Multi-user/team accounts — focus on individual users first
- Claude/other AI import — ChatGPT only for v1
- Mobile native app — PWA web only
- Self-hosted option — SaaS only
- Real-time collaboration — single-user experience

## Context

**Technical Stack:**
- Next.js 16 + React 19 + Tailwind
- Supabase (Postgres + pgvector) for data
- AWS Bedrock (Claude) via RLM service on Render
- Vercel for hosting
- Cloudinary for avatars
- Resend for email

**Current State (Feb 2026):**
- v1.0 MVP completed
- Build passing, deployed to Vercel
- RLM service healthy on Render
- 5 test users in database
- Bug audit complete, fixes applied

**User Feedback Themes:**
- Import process needs better progress indication
- Chat responses should reference more specific memories
- Need mobile-friendly experience

## Constraints

- **Tech Stack**: Next.js + Supabase + Bedrock — established, don't switch
- **Privacy**: No raw conversation storage long-term — embeddings only
- **Performance**: Chat response start < 2s
- **Cost**: Bedrock usage must stay within budget
- **Security**: Service role key never exposed client-side

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Client-side ZIP parsing | Handle 10GB+ files without upload limits | ✓ Good |
| Multi-tier chunking | Different granularities for different queries | ✓ Good |
| RLM on Render (not Lambda) | Persistent connections, lower cold start | ✓ Good |
| Bedrock over OpenAI | AWS credits, better pricing | — Pending |
| Gamification | Increase engagement, retention | — Pending |

---
*Last updated: 2026-02-05 after Asset initial setup*
