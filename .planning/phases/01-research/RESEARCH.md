# Phase 1: Research Findings

**Completed:** 2026-01-13
**Status:** Ready for planning

---

## 1. LLM Evaluation for Self-Hosted Personality Mimicry (AWS)

### Recommendation: Qwen 3 235B or Llama 3.3 70B

#### Top Open-Source Models for Personality/Roleplay

| Model | Size | Strengths | AWS Feasibility |
|-------|------|-----------|-----------------|
| **Qwen 3 235B** | 235B | Best open-source for complex tasks, strong personality understanding | Requires multi-GPU (p4d/p5 instances) |
| **DeepSeek V3** | 671B (MoE) | Excellent reasoning, comparable to GPT-4 | Very large, expensive hosting |
| **Llama 3.3 70B** | 70B | Strong balance of quality/efficiency, well-documented | g5.12xlarge or p4d |
| **Llama 4 Scout** | 17B active (109B total) | Latest Meta model, efficient MoE | g5.xlarge sufficient |
| **MythoMax L2 13B** | 13B | Specialized for roleplay, uncensored | g5.xlarge (~$24/day) |
| **Violet-Lotus 12B** | 12B | Emotional depth, personality capture | g5.xlarge (~$24/day) |

#### Practical Recommendation for SoulPrint

**Start with Llama 3.3 70B** for quality/cost balance:
- Proven personality mimicry capabilities
- Well-supported on AWS SageMaker
- Strong community and documentation
- ~$50-100/day on p4d instance

**Alternative for budget:** MythoMax L2 13B or Violet-Lotus 12B
- Excellent for emotional/personality work
- Runs on g5.xlarge (~$24/day)
- Uncensored/less filtered for authentic personality

### Key Finding: Few-Shot Prompting Limitations

From EMNLP 2025 research (llms-implicit-writing-styles-imitation):
> "LLMs Still Struggle to Imitate the Implicit Writing Styles of Everyday Authors"

**Implications for SoulPrint:**
- Pure few-shot prompting insufficient for deep personality mimicry
- Need combination of:
  1. Rich personality profile (not just examples)
  2. Stylometric features (LIWC analysis)
  3. Semantic memory of user's patterns
  4. Fine-tuning consideration for v2

---

## 2. Companion App Architecture Patterns

### a16z/companion-app

**Key Architecture:**
- **Stack:** Next.js, Clerk auth, LangChain
- **Memory:** Pinecone/Supabase pgvector for embeddings
- **Conversation:** Upstash for recent message queue

**Character Definition Pattern:**
```
Character = Preamble + Seed Chat + Backstory

Preamble: 2-3 sentence personality summary
Seed Chat: Example dialogue showing personality
Backstory: Long-form paragraphs stored in vector DB
```

**Memory System:**
- Short-term: Last N messages in conversation queue
- Long-term: Vector similarity search on backstory + past conversations
- Context injection: Retrieve relevant memories per message

### Hukasx0/ai-companion

**Key Features:**
- Short-term memory (recent messages)
- Long-term memory (semantic associations)
- **Real-time learning** from conversations
- Time awareness (knows current date/context)
- Character cards (.json, .png formats)

**Memory Pattern:**
- Conversation context builds over time
- Semantic associations stored between concepts
- User preferences learned implicitly

### AvrilAI (MrReplikant)

**Philosophy:** Open-source, self-hostable, user-controlled

**Key Patterns:**
- User has **complete control** over AI personality
- Uses `/remember` command for explicit memory
- `/alter` command to modify AI responses
- `/forget` to remove memories
- Context window management (~1000 chars for personality)

**Insight:** User-defined personality through explicit context injection, not training.

### ChatPsychiatrist (EmoCareAI)

**Focus:** Mental health support, emotional understanding

**Architecture:**
- Fine-tuned LLaMA-7B on counseling data
- **Psych8K dataset** - 8,187 query-answer pairs from real counseling
- Built on FastChat for serving

**Evaluation Metrics (7 counseling skills):**
1. Information - accurate, relevant info
2. Direct Guidance - clear instructions
3. Approval & Reassurance - emotional support
4. Restatement, Reflection & Listening - active listening
5. Interpretation - situation analysis
6. Self-disclosure - appropriate sharing
7. Obtain Relevant Information - asking good questions

**Key Insight:** Structured evaluation metrics for personality-based conversation quality.

---

## 3. Psychological Frameworks for Personality Capture

### LIWC (Linguistic Inquiry and Word Count)

**What it is:** Gold standard for text-based psychological analysis

**How it works:**
- 100+ built-in dictionaries mapping words to psychological categories
- Calculates percentage of words matching each category
- Hierarchical structure (anger → negative emotion → emotion)

**Key Categories:**
- Emotional processes (positive/negative)
- Cognitive processes (thinking patterns)
- Social processes (affiliation, power dynamics)
- Personal concerns (work, home, leisure)
- Drives (achievement, power, affiliation)

**Psychological Insights:**
- Pronoun usage reveals social standing ("you" vs "me")
- Cognitive words show thinking complexity
- Function words (articles, prepositions) reveal personality

**Application to SoulPrint:**
- Analyze user's questionnaire responses through LIWC
- Extract psychological signature
- Use as features in personality profile

### Big Five (OCEAN) Model

**Dimensions:**
1. **Openness** - creativity, curiosity, intellectual interests
2. **Conscientiousness** - organization, dependability, self-discipline
3. **Extraversion** - sociability, assertiveness, positive emotions
4. **Agreeableness** - cooperation, trust, helpfulness
5. **Neuroticism** - emotional instability, anxiety, moodiness

**Application:**
- Can be inferred from language patterns
- Maps to conversation style preferences
- Validated across cultures and decades of research

### Myers-Briggs Type Indicator (MBTI)

**16 Types from 4 Dimensions:**
- Extraversion (E) vs Introversion (I)
- Sensing (S) vs Intuition (N)
- Thinking (T) vs Feeling (F)
- Judging (J) vs Perceiving (P)

**Research Finding:**
> "Prompt-based personality priming creates measurable differences in LLM responses"

**Application:**
- Can prime LLM with MBTI type in system prompt
- Useful for communication style alignment
- Less scientifically validated than Big Five

### Synthesis: SoulPrint Psychological Model

**Recommended Approach:**

1. **Primary Framework:** Big Five (OCEAN)
   - Scientifically validated
   - Maps to language patterns via LIWC
   - Universal across cultures

2. **Secondary:** LIWC Categories
   - Cognitive complexity
   - Emotional tone
   - Social orientation
   - Temporal focus

3. **Communication Style (Current 6 Pillars):**
   - Communication Style → Maps to LIWC function words
   - Emotional Alignment → Maps to LIWC affect categories
   - Decision-Making → Maps to cognitive processes
   - Social Identity → Maps to social categories
   - Cognitive Processing → Maps to analytical thinking
   - Assertiveness → Maps to power/status words

---

## 4. AWS LLM Hosting Patterns

### Option 1: SageMaker with vLLM (Recommended)

**Why SageMaker:**
- Managed infrastructure
- Auto-scaling built-in
- Easy deployment (13 lines of code with LMI containers)
- Supports vLLM for high-throughput inference

**Deployment Pattern:**
```python
from sagemaker.model import Model

model = Model(
    image_uri=container_uri,  # LMI container
    role=role,
    env={
        "HF_MODEL_ID": "meta-llama/Llama-3.3-70B-Instruct",
        "OPTION_ROLLING_BATCH": "vllm",
        "TENSOR_PARALLEL_DEGREE": "4",
        "OPTION_MAX_ROLLING_BATCH_SIZE": "8",
        "OPTION_DTYPE": "fp16"
    }
)
model.deploy(instance_type="ml.p4d.24xlarge")
```

**vLLM Benefits:**
- PagedAttention for efficient memory
- Continuous batching for throughput
- Streaming output support
- 2-4x throughput vs naive serving

### Option 2: EC2 with vLLM Direct

**When to use:** More control, cost optimization at scale

**Setup:**
- Launch GPU instance (g5.xlarge for 13B, p4d for 70B)
- Install vLLM: `pip install vllm`
- Run server: `python -m vllm.entrypoints.openai.api_server`

### Option 3: EKS with vLLM

**When to use:** Kubernetes-native infrastructure, multi-model serving

**Pattern:**
- Deploy vLLM pods with GPU node groups
- Use Kubernetes autoscaling
- Integrate with existing K8s infrastructure

### Cost Estimates

| Model Size | Instance | Cost/Hour | Cost/Day |
|------------|----------|-----------|----------|
| 13B (MythoMax) | g5.xlarge | ~$1.00 | ~$24 |
| 70B (Llama 3.3) | g5.12xlarge | ~$4.50 | ~$108 |
| 70B (Llama 3.3) | p4d.24xlarge | ~$13.00 | ~$312 |
| 235B (Qwen 3) | p5.48xlarge | ~$98.00 | ~$2,352 |

**Recommendation:** Start with g5.xlarge + 13B model for development, scale to 70B for production.

---

## 5. Key Architectural Decisions for SoulPrint

### Memory Architecture

Based on companion app research:

```
┌─────────────────────────────────────────────────┐
│                  SoulPrint                       │
├─────────────────────────────────────────────────┤
│  Personality Profile (Static)                    │
│  ├── OCEAN scores                               │
│  ├── LIWC signature                             │
│  ├── Communication patterns                     │
│  └── Example phrases/responses                  │
├─────────────────────────────────────────────────┤
│  Short-Term Memory (Per Session)                │
│  └── Last N messages in conversation            │
├─────────────────────────────────────────────────┤
│  Long-Term Memory (Persistent)                  │
│  ├── Vector embeddings of conversations         │
│  ├── Semantic associations                      │
│  └── Learned preferences                        │
└─────────────────────────────────────────────────┘
```

### System Prompt Structure

Based on a16z pattern:

```
[Preamble: 2-3 sentences describing core personality]

[Personality Profile: OCEAN scores, LIWC patterns]

[Communication Style: How they speak, common phrases]

[Relevant Memories: Retrieved from vector DB]

[Recent Context: Last few messages]

[Instructions: Respond as this person would]
```

### Evaluation Approach

From ChatPsychiatrist metrics:
1. Does it sound like the user?
2. Does it capture emotional tone?
3. Does it reflect thinking patterns?
4. Would others recognize it as the user?

---

## 6. Recommendations for Next Phases

### Phase 2: LLM Integration
- Start with **Llama 3.3 70B** on SageMaker
- Use vLLM with LMI container
- Implement streaming responses
- Consider 13B model for development

### Phase 3: SoulPrint Generator
- Incorporate LIWC analysis of questionnaire responses
- Extract Big Five (OCEAN) indicators
- Generate structured personality profile
- Create example phrases from user input

### Phase 4: System Prompt Builder
- Follow a16z pattern: Preamble + Profile + Memory + Context
- Dynamic memory injection per conversation
- Balance personality data with conversation context

### Phase 5: Chat Integration
- Implement short-term memory (conversation queue)
- Add long-term memory (Supabase pgvector)
- Real-time learning from conversations (v2)

### Phase 6: Validation
- Test against ChatPsychiatrist evaluation metrics
- Self-testing first
- Compare AI responses to actual user responses

---

## Sources

1. **LLM Research:**
   - LocalLLaMA community benchmarks
   - LMSys Arena leaderboard
   - EMNLP 2025: "LLMs Still Struggle to Imitate Implicit Writing Styles"

2. **Companion Apps:**
   - https://github.com/a]16z-infra/companion-app
   - https://github.com/Hukasx0/ai-companion
   - https://github.com/MrReplikant/AvrilAI
   - https://github.com/EmoCareAI/ChatPsychiatrist

3. **Psychological Frameworks:**
   - LIWC-22 Documentation (liwc.app)
   - Pennebaker, J.W. (2011). The Secret Life of Pronouns
   - Big Five personality model research

4. **AWS Hosting:**
   - AWS SageMaker LMI Container documentation
   - vLLM documentation (docs.vllm.ai)
   - DJL Large Model Inference guide

---

*Phase: 01-research*
*Research completed: 2026-01-13*
