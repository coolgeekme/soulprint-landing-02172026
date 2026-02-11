/**
 * Custom LLM-as-Judge Scoring Metrics
 *
 * Three judge classes that extend Opik's BaseMetric to evaluate
 * personalized AI assistant responses against soulprint expectations.
 *
 * All judges use Haiku 4.5 (different model family than Sonnet 4.5 generation)
 * to avoid self-preference bias in scoring.
 *
 * Satisfies: EVAL-02 (judge rubrics exist)
 */

import { BaseMetric, z } from 'opik';
import type { EvaluationScoreResult } from 'opik';
import { bedrockChatJSON } from '@/lib/bedrock';

/** Expected JSON response from the judge LLM */
interface JudgeResponse {
  score: number;
  reasoning: string;
}

/** Clamp a value to [0.0, 1.0] range */
function clampScore(value: number): number {
  if (typeof value !== 'number' || isNaN(value)) return 0;
  return Math.min(1.0, Math.max(0.0, value));
}

/**
 * Shared anti-length-bias instruction appended to all judge prompts.
 * Research shows LLM judges favor longer responses by 10-20% without this.
 */
const ANTI_LENGTH_BIAS = `
CRITICAL EVALUATION RULE:
Do NOT favor longer responses. Judge based on quality, not quantity. Conciseness is a virtue.
A short, precise answer that perfectly matches the criteria is better than a verbose one that meanders.
`;

/**
 * Shared system instruction for all judge LLMs.
 */
const JUDGE_SYSTEM = 'You are an objective AI evaluator. Be precise, fair, and unbiased. Always respond with valid JSON only.';

// ============================================
// PersonalityConsistencyJudge
// ============================================

const personalitySchema = z.object({
  input: z.string(),
  output: z.string(),
  expected_traits: z.array(z.string()),
  soulprint_context: z.record(z.string(), z.unknown()).optional(),
});

type PersonalityInput = z.infer<typeof personalitySchema>;

/**
 * Evaluates whether an assistant response matches the expected personality traits
 * from the user's soulprint profile.
 *
 * Scores 0.0-1.0 based on:
 * - Communication style alignment
 * - Tone preference adherence
 * - Personality trait reflection
 * - Boundary respect
 */
export class PersonalityConsistencyJudge extends BaseMetric<typeof personalitySchema> {
  readonly validationSchema = personalitySchema;

  constructor() {
    super('personality_consistency');
  }

  async score(input: unknown): Promise<EvaluationScoreResult> {
    const parsed = this.validationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        name: this.name,
        value: 0,
        reason: `Invalid input: ${parsed.error.message}`,
        scoringFailed: true,
      };
    }

    const data = parsed.data as PersonalityInput;

    const traitsDisplay = data.expected_traits.length > 0
      ? data.expected_traits.map((t) => `- ${t}`).join('\n')
      : '(no specific traits listed — evaluate based on soulprint context below)';

    const contextDisplay = data.soulprint_context
      ? JSON.stringify(data.soulprint_context, null, 2)
      : '(no soulprint context available)';

    const prompt = `You are evaluating whether a personalized AI assistant's response is consistent with the user's personality profile.

This is a PERSONALIZED assistant — it has been configured with the user's personality data to respond in a way that matches THEIR preferences. The response should feel like talking to someone who knows the user.

EXPECTED PERSONALITY TRAITS:
${traitsDisplay}

FULL SOULPRINT CONTEXT (the personality data the assistant was given):
${contextDisplay}

USER MESSAGE:
${data.input}

ASSISTANT RESPONSE:
${data.output}

Evaluate on a scale of 0.0 to 1.0 how well the response reflects the personality profile:

1. Does the response feel personalized (not generic)? If the soulprint mentions communication style preferences, are they reflected?
2. Does the tone feel natural and human-like (not robotic or chatbot-like)?
3. If personality traits are listed, are they reflected naturally (not forced)?
4. Does the response avoid starting with greetings like "Hey!", "Hi there!", "Great question!" — jumping straight to substance?
5. Does the response feel like it comes from someone who KNOWS the user?

SCORING GUIDANCE:
- 0.8-1.0: Response clearly reflects the personality profile. Feels personalized, natural, and aligned with stated preferences.
- 0.6-0.79: Mostly consistent. Shows some personalization but could better reflect specific traits.
- 0.4-0.59: Mixed. Some generic elements but also some personalization signals.
- 0.0-0.39: Generic chatbot response. No evidence of personality alignment.

Important: A direct, concise, helpful response that avoids chatbot patterns IS a sign of good personality consistency for most soulprint profiles. Don't penalize for being brief if the profile calls for direct communication.

${ANTI_LENGTH_BIAS}

Respond with JSON only:
{
  "score": 0.85,
  "reasoning": "Brief explanation of score."
}`;

    try {
      const result = await bedrockChatJSON<JudgeResponse>({
        model: 'HAIKU_45',
        system: JUDGE_SYSTEM,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 512,
        temperature: 0.1,
      });

      return {
        name: this.name,
        value: clampScore(result.score),
        reason: result.reasoning || 'No reasoning provided',
      };
    } catch (error) {
      return {
        name: this.name,
        value: 0,
        reason: `Judge scoring failed: ${error instanceof Error ? error.message : String(error)}`,
        scoringFailed: true,
      };
    }
  }
}

// ============================================
// FactualityJudge
// ============================================

const factualitySchema = z.object({
  input: z.string(),
  output: z.string(),
  context: z.array(z.string()).optional(),
  soulprint_context: z.record(z.string(), z.unknown()).optional(),
});

type FactualityInput = z.infer<typeof factualitySchema>;

/**
 * Evaluates whether an assistant response is factually grounded
 * and avoids hallucinating personal details about the user.
 *
 * Scores 0.0-1.0 based on:
 * - Claims supported by context or general knowledge
 * - No fabrication of personal details or memories
 * - Appropriate acknowledgment of uncertainty
 * - No hallucinated specific facts about the user
 */
export class FactualityJudge extends BaseMetric<typeof factualitySchema> {
  readonly validationSchema = factualitySchema;

  constructor() {
    super('factuality');
  }

  async score(input: unknown): Promise<EvaluationScoreResult> {
    const parsed = this.validationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        name: this.name,
        value: 0,
        reason: `Invalid input: ${parsed.error.message}`,
        scoringFailed: true,
      };
    }

    const data = parsed.data as FactualityInput;

    const contextDisplay = data.context && data.context.length > 0
      ? data.context.map((c, i) => `[${i + 1}] ${c}`).join('\n')
      : '(no specific context provided)';

    const soulprintDisplay = data.soulprint_context
      ? JSON.stringify(data.soulprint_context, null, 2)
      : '';

    const prompt = `You are evaluating whether a personalized AI assistant's response is factually grounded.

This assistant has been given personality and preference data about the user (shown below as "context"). Using this data to personalize responses is CORRECT behavior, not hallucination.

AVAILABLE CONTEXT (personality/preference data the assistant was given):
${contextDisplay}

${soulprintDisplay ? `SOULPRINT DATA:\n${soulprintDisplay}\n` : ''}

USER MESSAGE:
${data.input}

ASSISTANT RESPONSE:
${data.output}

Evaluate on a scale of 0.0 (fabricated) to 1.0 (fully grounded):

1. Are factual claims either supported by the provided context, or based on general knowledge?
2. Does the response avoid INVENTING specific personal details that aren't in the context?
3. If the response references the user's preferences/personality, is it consistent with the provided soulprint data?
4. Does it express appropriate uncertainty when venturing beyond the provided context?

SCORING GUIDANCE:
- 0.8-1.0: All claims are grounded in context or general knowledge. References to user's personality/preferences align with the soulprint data. No fabrication.
- 0.6-0.79: Mostly grounded. Minor claims that can't be verified but aren't clearly wrong.
- 0.4-0.59: Some grounded content mixed with unverifiable claims.
- 0.0-0.39: Significant fabrication of personal details or facts.

IMPORTANT: Using personality data to shape tone/style is NOT hallucination. The assistant is SUPPOSED to use the soulprint. Only penalize for inventing FACTS that aren't in the context.

${ANTI_LENGTH_BIAS}

Respond with JSON only:
{
  "score": 0.85,
  "reasoning": "Brief explanation of score."
}`;

    try {
      const result = await bedrockChatJSON<JudgeResponse>({
        model: 'HAIKU_45',
        system: JUDGE_SYSTEM,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 512,
        temperature: 0.1,
      });

      return {
        name: this.name,
        value: clampScore(result.score),
        reason: result.reasoning || 'No reasoning provided',
      };
    } catch (error) {
      return {
        name: this.name,
        value: 0,
        reason: `Judge scoring failed: ${error instanceof Error ? error.message : String(error)}`,
        scoringFailed: true,
      };
    }
  }
}

// ============================================
// ToneMatchingJudge
// ============================================

const toneSchema = z.object({
  input: z.string(),
  output: z.string(),
  expected_tone: z.string().optional().default('natural and conversational'),
  expected_style: z.string().optional().default('direct and helpful'),
  soulprint_context: z.record(z.string(), z.unknown()).optional(),
});

type ToneInput = z.infer<typeof toneSchema>;

/**
 * Evaluates whether an assistant response matches the expected tone
 * and response style from the user's soulprint profile.
 *
 * Scores 0.0-1.0 based on:
 * - Tone matching (casual, formal, etc.)
 * - Response style adherence (concise, detailed, etc.)
 * - Appropriate formality level
 * - Avoidance of chatbot-like patterns
 */
export class ToneMatchingJudge extends BaseMetric<typeof toneSchema> {
  readonly validationSchema = toneSchema;

  constructor() {
    super('tone_matching');
  }

  async score(input: unknown): Promise<EvaluationScoreResult> {
    const parsed = this.validationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        name: this.name,
        value: 0,
        reason: `Invalid input: ${parsed.error.message}`,
        scoringFailed: true,
      };
    }

    const data = parsed.data as ToneInput;

    const toneDisplay = data.expected_tone || 'natural and conversational';
    const styleDisplay = data.expected_style || 'direct and helpful';

    // Pull extra tone/style info from soulprint if available
    let extraContext = '';
    if (data.soulprint_context) {
      const soul = data.soulprint_context.soul as Record<string, unknown> | null;
      const agents = data.soulprint_context.agents as Record<string, unknown> | null;
      if (soul) {
        const commStyle = soul.communication_style;
        const humor = soul.humor_style;
        if (commStyle) extraContext += `\nCommunication style: ${JSON.stringify(commStyle)}`;
        if (humor) extraContext += `\nHumor style: ${JSON.stringify(humor)}`;
      }
      if (agents) {
        const respStyle = agents.response_style;
        if (respStyle) extraContext += `\nResponse style preference: ${JSON.stringify(respStyle)}`;
      }
    }

    const prompt = `You are evaluating whether a personalized AI assistant's response matches the expected tone and communication style.

EXPECTED TONE: ${toneDisplay}
EXPECTED RESPONSE STYLE: ${styleDisplay}
${extraContext ? `\nADDITIONAL STYLE CONTEXT:${extraContext}` : ''}

USER MESSAGE:
${data.input}

ASSISTANT RESPONSE:
${data.output}

Evaluate on a scale of 0.0 (completely wrong tone/style) to 1.0 (perfect match):

1. Tone matching — does the response feel ${toneDisplay}?
2. Response style — does it follow a ${styleDisplay} approach?
3. Formality level — is the formality appropriate?
4. Chatbot-free — does the response avoid chatbot patterns?
   - No "Great question!" or "I'd be happy to help!"
   - No excessive greetings or disclaimers
   - No "As an AI..." or "I don't have personal..."
   - Jumps straight into substance
5. Natural feel — does the response read like a real person, not a customer service bot?

SCORING GUIDANCE:
- 0.8-1.0: Perfect tone match. Feels natural, human-like, and matches the expected style. No chatbot patterns.
- 0.6-0.79: Good match. Mostly natural with minor chatbot slip-ups or slight tone mismatches.
- 0.4-0.59: Mixed. Some natural elements but also noticeable chatbot patterns or tone issues.
- 0.0-0.39: Generic chatbot response. Excessive hedging, disclaimers, or completely wrong formality.

IMPORTANT: A response that is direct, concise, and avoids chatbot filler should score WELL. Being brief and to-the-point is a positive signal, not a negative one.

${ANTI_LENGTH_BIAS}

Respond with JSON only:
{
  "score": 0.85,
  "reasoning": "Brief explanation of score."
}`;

    try {
      const result = await bedrockChatJSON<JudgeResponse>({
        model: 'HAIKU_45',
        system: JUDGE_SYSTEM,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 512,
        temperature: 0.1,
      });

      return {
        name: this.name,
        value: clampScore(result.score),
        reason: result.reasoning || 'No reasoning provided',
      };
    } catch (error) {
      return {
        name: this.name,
        value: 0,
        reason: `Judge scoring failed: ${error instanceof Error ? error.message : String(error)}`,
        scoringFailed: true,
      };
    }
  }
}

// ============================================
// SearchValueJudge
// ============================================

const searchValueSchema = z.object({
  input: z.string(),
  output: z.string(),
  search_performed: z.boolean(),
  search_context: z.string().optional(),
  search_reason: z.string().optional(),
});

type SearchValueInput = z.infer<typeof searchValueSchema>;

/**
 * Evaluates whether the search routing decision was correct.
 *
 * Two modes:
 * - Search performed: "Did the search add value? Would response be worse without it?"
 * - Search skipped: "Was skipping correct? Would search have improved the response?"
 *
 * Score 1.0 = correct decision (valuable search OR correct skip)
 * Score 0.0 = wrong decision (unnecessary search OR missed opportunity)
 */
export class SearchValueJudge extends BaseMetric<typeof searchValueSchema> {
  readonly validationSchema = searchValueSchema;

  constructor() {
    super('search_value');
  }

  async score(input: unknown): Promise<EvaluationScoreResult> {
    const parsed = this.validationSchema.safeParse(input);
    if (!parsed.success) {
      return {
        name: this.name,
        value: 0,
        reason: `Invalid input: ${parsed.error.message}`,
        scoringFailed: true,
      };
    }

    const data = parsed.data as SearchValueInput;

    const prompt = data.search_performed
      ? `You are evaluating whether a web search was VALUABLE for answering a user's question.

USER MESSAGE:
${data.input}

SEARCH CONTEXT PROVIDED:
${data.search_context || '(no search context available)'}

ASSISTANT RESPONSE (using search results):
${data.output}

SEARCH REASON: ${data.search_reason || 'not specified'}

Evaluate on a scale of 0.0 to 1.0 whether the search was valuable:

1. Did the search provide information the AI couldn't have known from training data?
2. Is the response more accurate, timely, or helpful because of the search?
3. Would the response have been just as good without the search?

SCORING GUIDANCE:
- 0.8-1.0: Search was clearly valuable — provided fresh data, current prices, breaking news, etc.
- 0.5-0.79: Search was somewhat helpful but the AI probably could have answered decently without it.
- 0.0-0.49: Search was unnecessary — the AI's training data was sufficient for this question.

${ANTI_LENGTH_BIAS}

Respond with JSON only:
{
  "score": 0.85,
  "reasoning": "Brief explanation of score."
}`
      : `You are evaluating whether SKIPPING a web search was the correct decision for answering a user's question.

USER MESSAGE:
${data.input}

ASSISTANT RESPONSE (without search):
${data.output}

SKIP REASON: ${data.search_reason || 'not specified'}

Evaluate on a scale of 0.0 to 1.0 whether skipping the search was correct:

1. Does the response contain all necessary information without needing current data?
2. Would a web search have significantly improved the answer?
3. Is the question about current events, live data, or recent information that the AI might get wrong?

SCORING GUIDANCE:
- 0.8-1.0: Correct skip — question is about personal advice, creative tasks, general knowledge, or opinion. No search needed.
- 0.5-0.79: Borderline — search might have helped slightly but wasn't critical.
- 0.0-0.49: Wrong skip — the question clearly needed current/real-time data and the response likely has stale information.

${ANTI_LENGTH_BIAS}

Respond with JSON only:
{
  "score": 0.85,
  "reasoning": "Brief explanation of score."
}`;

    try {
      const result = await bedrockChatJSON<JudgeResponse>({
        model: 'HAIKU_45',
        system: JUDGE_SYSTEM,
        messages: [{ role: 'user', content: prompt }],
        maxTokens: 512,
        temperature: 0.1,
      });

      return {
        name: this.name,
        value: clampScore(result.score),
        reason: result.reasoning || 'No reasoning provided',
      };
    } catch (error) {
      return {
        name: this.name,
        value: 0,
        reason: `Judge scoring failed: ${error instanceof Error ? error.message : String(error)}`,
        scoringFailed: true,
      };
    }
  }
}
