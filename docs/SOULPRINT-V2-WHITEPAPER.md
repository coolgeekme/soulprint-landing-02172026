# SoulPrint V2: Personal AI Infrastructure

## Executive Summary

SoulPrint V2 transforms from a chat-with-memory app into a **full personal AI assistant platform**. Each user gets their own cloud-hosted AI agent that:

- Lives on their preferred channels (SMS, Telegram, WhatsApp, Discord)
- Knows them deeply (via ChatGPT import or onboarding questionnaire)
- Can take real actions (file management, web browsing, automations)
- Runs 24/7 without requiring technical setup

**The pitch:** "Your own AI assistant, trained on you, available everywhere."

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    SOULPRINT CLOUD                          │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│   ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│   │  User A's   │  │  User B's   │  │  User C's   │  ...   │
│   │  Instance   │  │  Instance   │  │  Instance   │        │
│   │  (Gateway)  │  │  (Gateway)  │  │  (Gateway)  │        │
│   └──────┬──────┘  └──────┬──────┘  └──────┬──────┘        │
│          │                │                │               │
│   ┌──────┴──────┐  ┌──────┴──────┐  ┌──────┴──────┐        │
│   │ Channels:   │  │ Channels:   │  │ Channels:   │        │
│   │ - SMS       │  │ - Telegram  │  │ - WhatsApp  │        │
│   │ - Telegram  │  │ - Discord   │  │ - SMS       │        │
│   │ - WhatsApp  │  │             │  │ - Slack     │        │
│   └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼
┌─────────────────────────────────────────────────────────────┐
│                    SOULPRINT PLATFORM                       │
├─────────────────────────────────────────────────────────────┤
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Dashboard   │  │   Instance   │  │   Billing    │      │
│  │   (Next.js)  │  │  Orchestrator│  │   (Stripe)   │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
│                                                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐      │
│  │  Onboarding  │  │   Memory     │  │   SoulPrint  │      │
│  │  (Import/Q)  │  │   (Supabase) │  │   Generator  │      │
│  └──────────────┘  └──────────────┘  └──────────────┘      │
└─────────────────────────────────────────────────────────────┘
```

---

## User Journey

### Step 1: Sign Up
- User creates account at soulprintengine.ai
- Chooses plan (Free tier / Pro / Enterprise)

### Step 2: Personality Onboarding
**Option A: ChatGPT Import**
- Upload ChatGPT export ZIP
- We analyze conversation patterns, preferences, communication style
- Generate SOUL.md (personality) + USER.md (facts about them)
- Build semantic memory from their history

**Option B: Questionnaire**
- 10-15 minute guided questionnaire
- Covers: communication style, values, interests, preferences
- AI generates personality profile from responses

### Step 3: Instance Provisioning
- System spins up dedicated Gateway container
- Configures with user's SoulPrint
- Assigns unique subdomain: `{username}.soulprint.run`

### Step 4: Channel Connection
Dashboard walks through connecting:
- **SMS** (via Twilio - we provide number or they bring their own)
- **Telegram** (bot token generation wizard)
- **WhatsApp** (WhatsApp Business API or Baileys bridge)
- **Discord** (bot invite flow)
- **Slack** (OAuth app install)

### Step 5: Go Live
- AI is now reachable on all connected channels
- Dashboard shows conversations, settings, memory
- User can customize behavior, add skills, set preferences

---

## Technical Implementation

### Per-User Infrastructure (Options)

#### Option A: Container Per User
```
User signs up
    ↓
Kubernetes spins up dedicated pod
    ↓
Pod runs: Gateway + Agent + Channel Bridges
    ↓
Persistent volume for: memory, files, config
```

**Pros:** True isolation, full OpenClaw capabilities
**Cons:** Expensive at scale (~$5-15/user/month infra cost)

#### Option B: Shared Gateway, Isolated Sessions
```
Shared Gateway cluster
    ↓
Routes to user's agent session
    ↓
Shared DB with user isolation (RLS)
    ↓
Channels route via user-specific credentials
```

**Pros:** Much cheaper (~$0.50-2/user/month), easier scaling
**Cons:** Less isolation, can't run arbitrary user code

#### Option C: Hybrid (Recommended)
```
Shared platform for:
  - Channel bridges
  - Memory/database
  - Dashboard/API

Per-user compute for:
  - Agent execution (sandboxed)
  - File operations
  - Custom skills
```

**Pros:** Balance of cost and capability
**Cons:** More complex architecture

### Recommended Stack

| Component | Technology | Notes |
|-----------|------------|-------|
| Orchestration | Kubernetes (EKS/GKE) | Auto-scaling user pods |
| Containers | Docker | OpenClaw base image |
| Gateway | OpenClaw Gateway | Fork + customize |
| Database | Supabase (Postgres) | RLS for user isolation |
| Memory/Vectors | pgvector | Semantic search |
| File Storage | Cloudflare R2 | Per-user buckets |
| Channels | OpenClaw bridges | Telegram, WhatsApp, SMS, Discord |
| SMS Provider | Twilio or Telnyx | Pooled numbers or BYO |
| Dashboard | Next.js | Existing soulprint-landing |
| Compute | Fly.io or Modal | On-demand agent execution |

---

## Channel Integration Details

### SMS (Twilio)
```
User options:
1. We assign them a number from our pool ($1/mo)
2. They bring their own Twilio account
3. They port existing number to us

Flow:
SMS → Twilio webhook → Our router → User's Gateway → Agent → Response → Twilio → SMS
```

### Telegram
```
User creates bot via @BotFather
Pastes token into dashboard
We store encrypted, connect to their Gateway

Flow:
Telegram → Webhook → Router → Gateway → Agent → Response → Telegram API
```

### WhatsApp
```
Options:
1. WhatsApp Business API (expensive, official)
2. Baileys bridge (free, gray area)
3. WhatsApp Cloud API (Meta's official free tier)

Flow:
WhatsApp → Webhook/Bridge → Router → Gateway → Agent → Response → WhatsApp
```

### Discord
```
User clicks "Add to Discord"
OAuth flow installs bot to their server
They choose which channels to activate

Flow:
Discord → Gateway socket → Agent → Response → Discord API
```

---

## The SoulPrint Moat (Why This Isn't Just OpenClaw)

### What OpenClaw Does
- Self-hosted personal AI
- Connects to channels
- Has memory and tools
- Requires technical setup

### What SoulPrint Adds

1. **Zero Setup**
   - No command line
   - No self-hosting
   - Just click and connect

2. **Personality Engine**
   - Deep personality modeling from ChatGPT history
   - Behavioral governors (cadence, timing, emotional state)
   - Evolves from every conversation

3. **Execution Coupling (The Lock)**
   - SoulPrint behaviors only resolve at runtime
   - Cadence, silence handling, memory decay
   - Can't be exported and run elsewhere

4. **Managed Experience**
   - We handle updates, security, uptime
   - Dashboard for non-technical users
   - Support and onboarding

5. **Vertical Integration**
   - SMS numbers included
   - WhatsApp bridging handled
   - Channel setup wizards

---

## Pricing Model

### Free Tier
- 1 channel (Telegram or Discord)
- 100 messages/day
- Basic memory (7-day retention)
- SoulPrint branding in responses

### Pro ($19/month)
- Unlimited channels
- Unlimited messages
- Persistent memory
- Custom AI name
- No branding
- Priority support

### Enterprise ($99/month)
- Everything in Pro
- Custom domain
- API access
- Team members
- Dedicated compute
- SLA guarantee

### Usage-Based Add-ons
- SMS: $0.01/message (or BYO Twilio)
- WhatsApp Business API: $0.05/message
- Extra storage: $1/GB/month
- Voice calls: $0.05/minute

---

## Infrastructure Costs (Per User)

### Minimal Setup (Shared Everything)
| Resource | Cost/User/Month |
|----------|-----------------|
| Compute (shared) | $0.50 |
| Database | $0.25 |
| Storage | $0.10 |
| Bandwidth | $0.15 |
| **Total** | **~$1.00** |

### Premium Setup (Dedicated Container)
| Resource | Cost/User/Month |
|----------|-----------------|
| Container (256MB) | $5.00 |
| Database | $0.50 |
| Storage | $0.25 |
| Bandwidth | $0.25 |
| **Total** | **~$6.00** |

**Margin at $19/mo Pro tier:** 68-95% depending on setup

---

## Implementation Phases

### Phase 1: MVP (4-6 weeks)
- [ ] Fork OpenClaw, strip to essentials
- [ ] Build provisioning API (spin up user Gateway)
- [ ] Telegram integration in dashboard
- [ ] Basic settings management
- [ ] Deploy on Fly.io or Railway

### Phase 2: Multi-Channel (4 weeks)
- [ ] Add WhatsApp (Baileys)
- [ ] Add SMS (Twilio)
- [ ] Add Discord
- [ ] Channel management dashboard

### Phase 3: Memory Integration (2 weeks)
- [ ] Connect existing SoulPrint memory system
- [ ] Per-user vector stores
- [ ] Import flow → Gateway provisioning

### Phase 4: Polish (2 weeks)
- [ ] Onboarding wizard
- [ ] Settings UI
- [ ] Billing integration
- [ ] Monitoring/alerting

### Phase 5: Scale (Ongoing)
- [ ] Kubernetes migration
- [ ] Auto-scaling
- [ ] Cost optimization
- [ ] Enterprise features

---

## Risks & Mitigations

| Risk | Impact | Mitigation |
|------|--------|------------|
| WhatsApp TOS violation | Account bans | Offer official API option, warn users |
| Per-user compute costs | Margin erosion | Shared compute default, premium for dedicated |
| OpenClaw upstream changes | Breaking updates | Fork + selective merge |
| Channel API changes | Integration breaks | Abstract channel layer, quick patches |
| User data breaches | Trust loss, legal | Strong isolation, encryption, audits |

---

## Competitive Landscape

| Product | Model | Channels | Personality | Price |
|---------|-------|----------|-------------|-------|
| **SoulPrint V2** | Hosted | All | Deep (import) | $19/mo |
| OpenClaw | Self-hosted | All | Basic | Free |
| Replika | Hosted | App only | Shallow | $20/mo |
| Character.AI | Hosted | Web only | Roleplay | $10/mo |
| Personal.ai | Hosted | Limited | Medium | $40/mo |

**SoulPrint differentiation:**
1. Real channel presence (not just an app)
2. Deep personality from actual chat history
3. Full agent capabilities (not just chat)
4. Competitive pricing

---

## Open Questions

1. **Branding:** Is this still "SoulPrint" or new brand?
2. **OpenClaw attribution:** Required by license? (Check Apache/MIT terms)
3. **WhatsApp risk tolerance:** Official API only, or Baileys too?
4. **Compute model:** Shared (cheap) vs dedicated (isolated)?
5. **SMS numbers:** Pooled, or per-user?
6. **Voice:** Include ElevenLabs integration?

---

## Next Steps

1. **Fork OpenClaw** - Strip to core Gateway + Telegram
2. **Build provisioning POC** - Spin up container per user
3. **Connect to existing dashboard** - Add instance management
4. **Test with beta users** - Drew + 5 friends
5. **Iterate on UX** - Dashboard, onboarding, channel setup

---

*Draft: 2026-02-06*
*Author: Asset (via Drew's direction)*
