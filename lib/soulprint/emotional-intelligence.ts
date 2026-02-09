/**
 * Emotional Intelligence Module
 *
 * Provides emotion detection, relationship arc tracking, dynamic temperature tuning,
 * and prompt section builders for emotionally adaptive AI responses.
 *
 * Satisfies: EMOT-01 (adaptive tone), EMOT-02 (uncertainty acknowledgment),
 * EMOT-03 (relationship arc)
 */

import {
  BedrockRuntimeClient,
  ConverseCommand,
  ContentBlock,
} from '@aws-sdk/client-bedrock-runtime';

// ============================================
// Types
// ============================================

export interface EmotionalState {
  primary: 'frustrated' | 'satisfied' | 'confused' | 'neutral';
  confidence: number; // 0.0-1.0
  cues: string[];
}

// ============================================
// Bedrock Client (module-level singleton)
// ============================================

const bedrockClient = new BedrockRuntimeClient({
  region: process.env.AWS_REGION || 'us-east-1',
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
  },
});

// ============================================
// Emotion Detection
// ============================================

/**
 * Detect user's emotional state from their message and recent conversation history.
 *
 * Uses Haiku 4.5 on Bedrock for fast, cheap emotion classification.
 * Returns neutral default on any error (fail-safe, never crash chat).
 *
 * @param userMessage - Current user message
 * @param recentHistory - Last 3-5 messages for context
 * @returns EmotionalState with primary emotion, confidence, and detected cues
 */
export async function detectEmotion(
  userMessage: string,
  recentHistory: Array<{ role: string; content: string }>
): Promise<EmotionalState> {
  const neutralDefault: EmotionalState = {
    primary: 'neutral',
    confidence: 0.5,
    cues: [],
  };

  try {
    const detectionPrompt = `Analyze the user's emotional state from their message and recent conversation history.

Classify their emotion as one of:
- **frustrated**: Repeated questions, short/terse responses, complaints, negative language, impatience
- **satisfied**: Positive words, enthusiasm, gratitude, success expressions, collaborative tone
- **confused**: Clarification requests, contradictory follow-ups, uncertainty signals, "I don't understand"
- **neutral**: Standard questions, neutral tone, no strong emotional signals

Recent conversation history:
${recentHistory.map(msg => `${msg.role}: ${msg.content}`).join('\n')}

Current message: ${userMessage}

Respond with ONLY valid JSON in this exact format:
{
  "primary": "frustrated" | "satisfied" | "confused" | "neutral",
  "confidence": 0.0-1.0,
  "cues": ["specific phrase or signal detected", ...]
}`;

    const command = new ConverseCommand({
      modelId: 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
      system: [{ text: 'You are an emotion detection system. Respond only with valid JSON.' }],
      messages: [{
        role: 'user',
        content: [{ text: detectionPrompt }],
      }],
      inferenceConfig: {
        maxTokens: 150,
        temperature: 0.2, // Low temp for consistent detection (no top_p - Pitfall 7)
      },
    });

    const response = await bedrockClient.send(command);
    const textBlock = response.output?.message?.content?.find(
      (block): block is ContentBlock.TextMember => 'text' in block
    );

    if (!textBlock?.text) {
      return neutralDefault;
    }

    // Parse JSON response
    const parsed = JSON.parse(textBlock.text.trim());

    // Validate response structure
    const validEmotions = ['frustrated', 'satisfied', 'confused', 'neutral'];
    if (
      !parsed ||
      typeof parsed !== 'object' ||
      !validEmotions.includes(parsed.primary) ||
      typeof parsed.confidence !== 'number' ||
      !Array.isArray(parsed.cues)
    ) {
      return neutralDefault;
    }

    // If confidence too low, return neutral
    if (parsed.confidence < 0.6) {
      return {
        primary: 'neutral',
        confidence: 0.5,
        cues: [],
      };
    }

    return {
      primary: parsed.primary,
      confidence: Math.min(1.0, Math.max(0.0, parsed.confidence)), // Clamp to [0, 1]
      cues: parsed.cues.filter((cue: unknown) => typeof cue === 'string'),
    };
  } catch (error) {
    // Fail-safe: on ANY error, return neutral (never crash chat)
    console.warn('[EmotionalIntelligence] Emotion detection failed:', error);
    return neutralDefault;
  }
}

// ============================================
// Relationship Arc
// ============================================

/**
 * Determine relationship stage based on conversation count.
 *
 * Pure function, no async needed.
 *
 * @param messageCount - Total messages in conversation history
 * @returns Relationship stage and message count
 */
export function getRelationshipArc(messageCount: number): {
  stage: 'early' | 'developing' | 'established';
  messageCount: number;
} {
  if (messageCount < 10) {
    return { stage: 'early', messageCount };
  }
  if (messageCount >= 10 && messageCount < 50) {
    return { stage: 'developing', messageCount };
  }
  return { stage: 'established', messageCount };
}

// ============================================
// Dynamic Temperature
// ============================================

/**
 * Determine optimal temperature based on query type, emotion, and memory context.
 *
 * Pure function, no async needed.
 *
 * @param userMessage - Current user message
 * @param emotionalState - Detected emotional state
 * @param hasMemoryContext - Whether memory retrieval found relevant context
 * @returns Temperature value and reasoning
 */
export function determineTemperature(
  userMessage: string,
  emotionalState: EmotionalState,
  hasMemoryContext: boolean
): { temperature: number; reason: string } {
  // Factual queries without memory context -> low temp for precision
  const factualPattern = /^(what is|who is|when did|where is|how does)/i;
  if (factualPattern.test(userMessage.trim()) && !hasMemoryContext) {
    return {
      temperature: 0.2,
      reason: 'Factual query without memory context - prioritize precision',
    };
  }

  // Confused user -> low temp for clarity
  if (emotionalState.primary === 'confused') {
    return {
      temperature: 0.25,
      reason: 'User confused - prioritize clear, consistent explanations',
    };
  }

  // Creative tasks -> high temp for diversity
  const creativePattern = /brainstorm|ideas|creative|suggest|imagine/i;
  if (creativePattern.test(userMessage)) {
    return {
      temperature: 0.8,
      reason: 'Creative task detected - encourage diverse responses',
    };
  }

  // Default balanced temperature
  return {
    temperature: 0.7,
    reason: 'Standard conversational temperature',
  };
}

// ============================================
// Prompt Section Builders
// ============================================

/**
 * Build uncertainty acknowledgment instructions (EMOT-02).
 *
 * Always included in emotionally intelligent prompts.
 * Encourages AI to abstain when lacking sufficient information.
 */
export function buildUncertaintyInstructions(): string {
  return `## UNCERTAINTY ACKNOWLEDGMENT

When you lack SUFFICIENT information to answer confidently:
- Say "I don't have enough information about X" instead of guessing
- Explain what information would help you answer better
- Offer to search or ask clarifying questions

Good: "I don't have details about your project timeline. Could you share when it started?"
Bad: "Based on typical patterns, you probably started in January..." (guessing)

Abstention is better than guessing. Be honest about knowledge gaps.`;
}

/**
 * Build relationship arc instructions (EMOT-03).
 *
 * Adapts tone based on conversation history depth.
 *
 * @param arc - Relationship stage from getRelationshipArc
 * @returns Markdown section with stage-specific instructions, or empty string if invalid
 */
export function buildRelationshipArcInstructions(arc: {
  stage: 'early' | 'developing' | 'established';
  messageCount: number;
}): string {
  if (!arc || !arc.stage) {
    return '';
  }

  switch (arc.stage) {
    case 'early':
      return `## RELATIONSHIP TONE (Early stage: ${arc.messageCount} messages)

You're just getting to know this person. Be:
- Cautious and attentive - avoid assumptions
- Ask clarifying questions to build understanding
- Avoid overly familiar language or inside jokes
- Focus on learning their preferences and communication style`;

    case 'developing':
      return `## RELATIONSHIP TONE (Developing stage: ${arc.messageCount} messages)

You're building rapport. Be:
- Balanced between curiosity and familiarity
- Reference past conversations naturally when relevant
- Start establishing shared context and shortcuts
- Show you remember their preferences and patterns`;

    case 'established':
      return `## RELATIONSHIP TONE (Established stage: ${arc.messageCount} messages)

You have established rapport. Be:
- Confident and familiar - skip unnecessary pleasantries
- Direct and opinionated - you know their style
- Reference shared history and inside context freely
- Challenge or push back when you disagree (they trust you)`;

    default:
      return '';
  }
}

/**
 * Build adaptive tone instructions (EMOT-01).
 *
 * Only included if emotional state has sufficient confidence (>= 0.6).
 * Returns empty string for neutral emotions (no adaptation needed).
 *
 * @param state - Detected emotional state
 * @returns Markdown section with emotion-specific instructions, or empty string
 */
export function buildAdaptiveToneInstructions(state: EmotionalState): string {
  if (!state || state.primary === 'neutral') {
    return '';
  }

  const cuesText = state.cues.length > 0
    ? `\nSigns detected: ${state.cues.join(', ')}`
    : '';

  switch (state.primary) {
    case 'frustrated':
      return `## ADAPTIVE TONE (User is frustrated)${cuesText}

Respond with:
- Supportive, patient tone - acknowledge their frustration
- Concise, actionable guidance - skip fluff
- Direct solutions - get straight to fixing the problem
- Skip pleasantries and small talk - they want results`;

    case 'satisfied':
      return `## ADAPTIVE TONE (User is satisfied)${cuesText}

Respond with:
- Match their positive energy and enthusiasm
- Reinforce their success - celebrate wins
- Build momentum - suggest next steps or deeper exploration
- Maintain collaborative, upbeat tone`;

    case 'confused':
      return `## ADAPTIVE TONE (User is confused)${cuesText}

Respond with:
- Simplify explanations - break down complex ideas
- Provide concrete examples and analogies
- Avoid jargon and technical terms unless necessary
- Be patient and encouraging - check understanding along the way`;

    default:
      return '';
  }
}
