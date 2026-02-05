# PROJECT: SoulPrint Memory System v2

## Vision
Replace custom RLM memory system with **Mem0** — proven, open-source memory layer with 12k GitHub stars.

## Problem Statement
Current RLM system is custom code, fragile at scale, no fact extraction. Users import years of ChatGPT history (10GB+). Need bulletproof memory.

## Solution: Fork & Integrate Open Source

### Stack (All Apache 2.0 / MIT)

**1. mem0ai/mem0** ⭐12k
- Universal memory layer for AI agents
- Auto-recall + auto-capture
- Fact extraction built-in
- Has Vercel AI SDK provider
- **Already has OpenClaw plugin!**

**2. chat-export-structurer**
- Parses ChatGPT/Claude/Grok exports
- Streaming (handles 10GB+)
- Outputs structured data

### Architecture
```
ChatGPT ZIP → chat-export-structurer → Structured Messages
                                              ↓
                                           Mem0
                                      ↙         ↘
                               Facts          Vectors
                                      ↘         ↙
                                     Memory API
                                          ↓
                              @mem0/vercel-ai-provider
                                          ↓
                                   SoulPrint Chat
```

## Repos Cloned
- `/home/drewpullen/clawd/mem0-fork` — Mem0 (Apache 2.0)
- `/home/drewpullen/clawd/chat-export-structurer` — Import parser (MIT)

## Key Discoveries
1. Mem0 has `/openclaw/` folder — full OpenClaw plugin ready to use
2. Mem0 has `/vercel-ai-sdk/` — Next.js integration
3. Mem0 has `/openmemory/` — Full MCP server with UI
4. Auto-recall + auto-capture = no manual memory management

## Constraints
- Keep existing Next.js frontend
- Keep Supabase for auth
- Must handle 10GB+ imports
- Open source (for OpenClaw)

## Success Criteria
- [ ] Import 1.8GB ChatGPT export
- [ ] Query returns relevant context in < 500ms
- [ ] Facts automatically extracted
- [ ] Chat feels like AI "knows" user
- [ ] Fully open source

## Stakeholders
- Drew (product owner)
- Asset (implementation)

## Timeline
~1 week to working prototype (faster now with existing code)
