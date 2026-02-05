# SoulPrint V2: Product Direction

**Status:** ✅ Confirmed by Drew  
**Created:** 2026-02-05

---

## Core Product

**SoulPrint is an AI assistant you text.**

Primary channel: **SMS**  
Secondary channel: **Web UI** (mobile + desktop)

---

## Channel Strategy

### Primary: SMS
- Main way to interact with SoulPrint
- Works on any phone
- No app download required
- Onboarding happens via SMS

### Secondary: Web UI
- Mobile web (soulprintengine.ai/chat)
- Desktop web (same URL)
- Nice UI/UX for longer conversations
- Import flow lives here

### NOT Supported (Simplification)
- ❌ Telegram
- ❌ WhatsApp
- ❌ Discord
- ❌ Native apps

---

## SMS on Desktop

Users can text SoulPrint from their computer:

### Mac
- **Messages app** (built-in)
- iMessage syncs automatically
- Just text like normal

### Windows
- **Phone Link** (built-in Windows 11)
  - Links to Android phone
  - Send/receive SMS from PC
- **Intel Unison** (alternative)
- **Your Phone** app (Windows 10)

### Documentation Needed
- [ ] Guide: "How to text SoulPrint from your Mac"
- [ ] Guide: "How to text SoulPrint from Windows"
- [ ] Video walkthrough (optional)

---

## User Flow

```
1. User signs up on web (soulprintengine.ai)
2. Imports ChatGPT history (optional)
3. Gets SoulPrint's phone number
4. Saves as contact on phone
5. Texts SoulPrint anytime
6. Can also use web UI for longer chats
```

---

## Why SMS-First?

1. **Zero friction** — Everyone knows how to text
2. **Always available** — No app to open
3. **Cross-platform** — Works on any phone
4. **Intimate** — Lives in your Messages, like a friend
5. **Desktop sync** — Mac/Windows can text too

---

## Technical Implications

### SMS Provider Needed
Options:
- **Twilio** — Industry standard
- **Vonage** — Alternative
- **MessageBird** — European option

### Architecture Update

```
User Phone ──SMS──▶ Twilio ──webhook──▶ Motia ──▶ Mem0
                                         │
                                         ▼
                                      Bedrock
                                         │
                                         ▼
User Phone ◀──SMS── Twilio ◀──────── Motia
```

### Web UI
- Still exists for import flow
- Chat UI for desktop/mobile web
- Same backend (Motia + Mem0)

---

## Open Questions

1. **SMS provider?** Twilio most likely
2. **Phone number type?** 
   - Local number vs toll-free vs short code
3. **MMS support?** Images, voice notes?
4. **Rate limiting?** SMS costs money per message
5. **International?** US only or global?

---

## Next Steps

1. ✅ Product direction confirmed
2. ⏳ Choose SMS provider
3. ⏳ Build Motia backend
4. ⏳ Integrate Mem0
5. ⏳ Connect SMS webhook
6. ⏳ Update web UI
