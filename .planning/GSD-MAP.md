# GSD Map: SoulPrint Rebuild

**Created:** 2026-02-05 10:20 CST  
**Status:** 🔴 MAPPING IN PROGRESS  
**Owner:** Asset (while Drew sleeps)

---

## 🎯 Mission

Rebuild SoulPrint memory system to be **ROBUST and UNBREAKABLE**.

---

## 📊 Current State Audit

### What Exists

| Component | Location | Status | Notes |
|-----------|----------|--------|-------|
| Frontend | Next.js app | 🟡 Works | Mobile UX bad |
| Auth | Supabase | 🟢 Works | |
| Chat API | `/api/chat` | 🟡 Works | Needs better prompts |
| Import | `/api/import/*` | 🟡 Fixed today | Was freezing at 50% |
| Memory/RLM | Render service | 🔴 Failing? | Need to check logs |
| Embeddings | AWS Bedrock | 🟡 Unknown | Part of RLM |
| Storage | Supabase | 🟢 Works | |

### What's Broken (Need to Investigate)

- [ ] Import failing (Drew said) - check Vercel logs
- [ ] Memory not working - check Render logs
- [ ] RLM reliability issues

---

## 🔍 Investigation TODO

### 1. Vercel Logs
```
- Check recent deployment logs
- Find import failure errors
- Document what broke
```

### 2. Render Logs (RLM)
```
URL: https://soulprint-landing.onrender.com
- Check /process-full endpoint
- Check embedding failures
- Check memory query failures
```

### 3. Supabase Data
```
- Check user_profiles for stuck imports
- Check embedding_status values
- Check for error patterns
```

---

## 🏗️ Rebuild Scope

### Confirmed Changes
1. **Memory System** - Replace RLM with new repo (WAITING FOR LINK)
2. **AI Instructions** - Full rewrite of system prompts
3. **Mobile UX** - Chat screen redesign

### Unclear (Need Drew's Input)
- Keep Supabase or switch?
- Keep Bedrock or switch embeddings?
- Keep current chat UI structure or redesign?

---

## 📁 Files to Create

```
.planning/
├── GSD-MAP.md              # This file (system overview)
├── specs/
│   ├── MEMORY-V2.md        # New memory architecture
│   ├── SOULPRINT-AI.md     # AI personality & instructions  
│   └── MOBILE-UX.md        # Chat redesign
└── debug/
    └── 2026-02-05-failure-analysis.md  # What broke today
```

---

## ⏳ Waiting On

| Item | From | Priority |
|------|------|----------|
| Memory repo link | Drew | 🔴 BLOCKING |
| Scope confirmation | Drew | 🔴 BLOCKING |
| Figma designs | Glenn? | 🟡 Nice to have |

---

## 📋 Tonight's Plan (While Drew Sleeps)

### Phase 1: Investigate (1 hour)
- [ ] Pull Vercel logs
- [ ] Pull Render logs
- [ ] Check Supabase for failures
- [ ] Document findings

### Phase 2: Research (1 hour)
- [ ] Wait for memory repo link
- [ ] Research memory alternatives if no link
- [ ] Compare options

### Phase 3: Spec Writing (2 hours)
- [ ] Draft MEMORY-V2.md architecture
- [ ] Draft SOULPRINT-AI.md instructions
- [ ] Create implementation roadmap

### Phase 4: Ready for Review
- [ ] All specs in .planning/specs/
- [ ] No code written
- [ ] Clear questions for Drew

---

## 🚫 Will NOT Do Tonight

- Write production code
- Deploy changes
- Make architectural decisions without approval
- Touch anything that works

---

## Next Update

After investigation completes, will update this map with findings.
