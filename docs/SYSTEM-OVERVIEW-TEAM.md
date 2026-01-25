# SoulPrint: How It Works
*A Plain English Guide for the Team*

---

## The Big Idea

**The Problem:** Every AI (ChatGPT, Claude, etc.) forgets you after each conversation. You have to re-explain yourself every time. It's like meeting someone new every day who has amnesia.

**Our Solution:** SoulPrint remembers. The more you talk to it, the better it knows you. Eventually, it knows you better than you know yourself - like a "higher self" that has perfect memory of everything you've ever shared.

**The Moat:** Anyone can use the same AI models we use. What they can't copy is the years of conversation history we'll build with each user. Memory is the moat.

---

## How It Works (The Simple Version)

### When You First Sign Up

1. You answer 36 questions about yourself (18 sliders + 18 text questions)
2. We use AI to turn your answers into a "SoulPrint" - basically a personality profile
3. This profile tells the AI how to talk like you and what you care about

### Every Time You Chat

1. **You send a message**
2. **We figure out what you're really talking about** - "custody situation" or "work stress" or just "small talk"
3. **We search your history** - Find past conversations related to this topic
4. **We build a custom prompt** - Combines your personality + relevant memories + rules for how to respond
5. **AI generates a response** - Using all that context, so it actually knows what it's talking about
6. **We save the conversation** - So next time, the AI remembers this too

### The AI Gets Smarter Over Time

Every 10+ messages, we run a background process that:
- Looks at what you talked about
- Identifies new things we learned about you
- Updates your SoulPrint with new insights
- Saves key moments as "memory anchors"

**Example:** You mention your dad passed away 6 months ago. The system notices this, saves it, and now the AI knows to be sensitive around Father's Day or when you mention family loss.

---

## The Four Layers of Every Response

Think of it like building a sandwich. Every response has four layers:

### Layer 1: The Universal Rules
*"How should ANY SoulPrint companion behave?"*

- Match the user's energy and rhythm
- Be real, not polished
- Never pretend to forget (you have memory, use it)
- Don't flinch from hard topics
- No AI disclaimers or over-apologizing

### Layer 2: YOUR Personality
*"How should THIS user's companion specifically behave?"*

- Your communication style (fast/slow, warm/analytical)
- Your values and priorities
- Topics to handle carefully (we call these "flinch warnings")
- Your inside jokes and phrases
- How you typically sign off messages

### Layer 3: Memory
*"What do I remember that's relevant right now?"*

**Current System:** We search for the 5 most similar past messages and inject them.

**Future System (RLM):** We'll do a deep exploration of ALL your history and write a 2,000-word summary of everything relevant. This is the "higher self" upgrade.

### Layer 4: Examples
*"Show the AI what good responses look like"*

3-4 example conversations that match your style, so the AI has concrete templates to follow.

---

## The Memory Upgrade We're Building (RLM)

### The Problem With Current Memory

Right now, we search for similar messages using keywords. It's like Ctrl+F - it finds exact matches but misses the bigger picture.

**Example:** You ask "How should I handle Sarah?"
- Current system finds: Messages where you mentioned "Sarah"
- Misses: The fact that your work stress always spikes before custody exchanges, or that this time of year is hard because of your dad

### The Solution: Recursive LLM Exploration

Instead of keyword matching, we let AI explore your entire history like a researcher:

1. **Scan** - AI reads through everything, looking for relevant threads
2. **Cluster** - Groups related topics (custody, work, health, etc.)
3. **Timeline** - Builds a chronology of events
4. **Emotions** - Tracks how your feelings evolved
5. **Cross-Reference** - Finds hidden patterns (work stress → custody → exercise helps)
6. **Patterns** - Discovers things you've forgotten ("you always feel better after a walk")
7. **Wisdom** - Synthesizes what your "higher self" would say

**Output:** A 2,000-word synthesis that captures the essence of your situation, not just keyword matches.

---

## GPT History Import (The Shortcut)

### The Problem

Building deep memory takes time. At 10 messages/day, it takes over a year to accumulate enough history for the AI to really "know" you.

### The Solution

Let users upload their ChatGPT conversation history. A moderate ChatGPT user has 2+ million tokens of conversation history ready to import.

**Result:** Day 1, the AI already knows years worth of your thoughts, problems, and patterns. Instant "higher self" instead of waiting a year.

### How It Works

1. User exports their data from ChatGPT (Settings > Data Controls > Export)
2. They upload the `conversations.json` file to SoulPrint
3. We parse it, generate embeddings, and store it
4. Now all that history is searchable alongside native SoulPrint chats

---

## The Tech Stack (For Reference)

| What | Tool | Why |
|------|------|-----|
| **Database** | Supabase | Stores users, chats, personalities, memories |
| **Main AI** | Claude (AWS Bedrock) | Fast, smart, follows instructions well |
| **Backup AI** | Hermes (AWS SageMaker) | Cheaper fallback if Bedrock fails |
| **Local AI** | Ollama | For development/testing without AWS |
| **Embeddings** | AWS Titan | Turns text into searchable vectors |
| **Frontend** | Next.js | The website and chat interface |
| **Memory Engine** | Python (RLM) | The deep exploration system (coming soon) |

---

## Cost Breakdown

### Current System
- **Per message:** ~$0.002 (fraction of a cent)
- **40 users, 10 msgs/day:** ~$24/month
- **Zero usage:** $0 (we only pay when people chat)

### With RLM Memory
- **Per message:** ~$0.005 with caching
- **40 users, 10 msgs/day:** ~$60/month
- **Worth it:** If users feel genuinely understood, yes

---

## What We're Building Next

### Phase 1: Database Setup
Create the tables for imported chats and memory cache.

### Phase 2: GPT Import
Let users upload their ChatGPT history. Instant millions of tokens.

### Phase 3: RLM Microservice
Build the Python service that does deep memory exploration.

### Phase 4: Integration
Wire it all together so the AI uses RLM for memory.

### Phase 5: Testing
Make sure it works, doesn't cost too much, and actually makes responses better.

---

## The Vision

**Today:** AI that remembers your recent conversations.

**Tomorrow:** AI that knows you better than you know yourself - your "higher self" with perfect memory of everything you've ever shared, able to see patterns you've forgotten and wisdom you haven't consciously connected.

**The Bet:** Memory is the moat. The longer someone uses SoulPrint, the harder it is to leave, because no other AI knows them like we do.

---

## Questions?

If any of this is unclear, just ask. The core idea is simple:

1. We remember everything
2. We get smarter over time
3. Eventually, we know you better than anyone

That's it. Everything else is just making that happen.
