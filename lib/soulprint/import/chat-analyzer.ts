/**
 * Chat Analyzer - Extract SoulPrint from Chat History
 *
 * Instead of 37 questions, we analyze real conversation patterns to build
 * a psychological profile. This is the PRIMARY path for SoulPrint creation.
 *
 * Philosophy: Chat data shows who they ARE, not who they THINK they are.
 */

import type { SoulPrintData, VoiceVectors } from '../types';
import type { ParsedMessage } from './gpt-parser';
import { chatCompletion, ChatMessage } from '@/lib/llm/local-client';

// Minimum messages needed for reliable analysis
export const MIN_MESSAGES_LOW_CONFIDENCE = 20;
export const MIN_MESSAGES_MEDIUM_CONFIDENCE = 50;
export const MIN_MESSAGES_HIGH_CONFIDENCE = 200;

export interface ChatAnalysisInput {
  messages: ParsedMessage[];
  userId: string;
}

export interface ChatAnalysisResult {
  soulprint: SoulPrintData;
  confidence: number; // 0-1
  messageCount: number;
  userMessageCount: number;
  warnings: string[];
}

/**
 * Main function: Analyze chat history to create SoulPrint
 */
export async function analyzeChatsForSoulPrint(
  input: ChatAnalysisInput
): Promise<ChatAnalysisResult> {
  const { messages, userId } = input;
  const warnings: string[] = [];

  // Filter to user messages only for analysis
  const userMessages = messages.filter(m => m.role === 'user');
  const userMessageTexts = userMessages.map(m => m.content);

  // Calculate confidence based on message count
  const confidence = calculateConfidence(userMessages.length);

  if (userMessages.length < MIN_MESSAGES_LOW_CONFIDENCE) {
    warnings.push(
      `Only ${userMessages.length} user messages found. Results may be limited. Consider supplementing with questionnaire.`
    );
  }

  // 1. Extract voice vectors from message patterns
  console.log('[ChatAnalyzer] Extracting voice vectors...');
  const voiceVectors = extractVoiceVectors(userMessageTexts);

  // 2. Extract topics and themes
  console.log('[ChatAnalyzer] Analyzing conversation topics...');
  const topics = extractTopics(messages);

  // 3. Use LLM to generate full SoulPrint analysis
  console.log('[ChatAnalyzer] Running LLM analysis...');
  const llmAnalysis = await runLLMAnalysis(userMessageTexts, topics, voiceVectors);

  // 4. Construct SoulPrint data
  const soulprint: SoulPrintData = {
    soulprint_version: '3.0',
    generated_at: new Date().toISOString(),
    archetype: llmAnalysis.archetype,
    identity_signature: llmAnalysis.identity_signature,

    voice_vectors: voiceVectors,
    sign_off: llmAnalysis.sign_off || '',

    pillars: {
      communication_style: {
        summary: llmAnalysis.pillars.communication_style.summary,
        ai_instruction: llmAnalysis.pillars.communication_style.ai_instruction,
        markers: []
      },
      emotional_alignment: {
        summary: llmAnalysis.pillars.emotional_alignment.summary,
        ai_instruction: llmAnalysis.pillars.emotional_alignment.ai_instruction,
        markers: []
      },
      decision_making: {
        summary: llmAnalysis.pillars.decision_making.summary,
        ai_instruction: llmAnalysis.pillars.decision_making.ai_instruction,
        markers: []
      },
      social_cultural: {
        summary: llmAnalysis.pillars.social_cultural.summary,
        ai_instruction: llmAnalysis.pillars.social_cultural.ai_instruction,
        markers: []
      },
      cognitive_processing: {
        summary: llmAnalysis.pillars.cognitive_processing.summary,
        ai_instruction: llmAnalysis.pillars.cognitive_processing.ai_instruction,
        markers: []
      },
      assertiveness_conflict: {
        summary: llmAnalysis.pillars.assertiveness_conflict.summary,
        ai_instruction: llmAnalysis.pillars.assertiveness_conflict.ai_instruction,
        markers: []
      }
    },

    flinch_warnings: llmAnalysis.flinch_warnings || [],
    prompt_core: '',
    prompt_pillars: '',
    prompt_full: ''
  };

  return {
    soulprint,
    confidence,
    messageCount: messages.length,
    userMessageCount: userMessages.length,
    warnings
  };
}

/**
 * Calculate confidence score based on message count
 */
function calculateConfidence(userMessageCount: number): number {
  if (userMessageCount < MIN_MESSAGES_LOW_CONFIDENCE) {
    return 0.3;
  } else if (userMessageCount < MIN_MESSAGES_MEDIUM_CONFIDENCE) {
    return 0.5 + (userMessageCount - MIN_MESSAGES_LOW_CONFIDENCE) / 100;
  } else if (userMessageCount < MIN_MESSAGES_HIGH_CONFIDENCE) {
    return 0.7 + (userMessageCount - MIN_MESSAGES_MEDIUM_CONFIDENCE) / 500;
  } else {
    return Math.min(0.95, 0.85 + userMessageCount / 5000);
  }
}

/**
 * Extract voice vectors from raw message patterns
 */
export function extractVoiceVectors(userMessages: string[]): VoiceVectors {
  if (userMessages.length === 0) {
    return {
      cadence_speed: 'moderate',
      tone_warmth: 'neutral',
      sentence_structure: 'balanced',
      emoji_usage: 'minimal',
      sign_off_style: 'none'
    };
  }

  // Calculate average words per message
  const wordCounts = userMessages.map(m => m.split(/\s+/).length);
  const avgWords = wordCounts.reduce((a, b) => a + b, 0) / wordCounts.length;

  // Cadence speed based on message length
  let cadence_speed: VoiceVectors['cadence_speed'];
  if (avgWords < 15) {
    cadence_speed = 'rapid';
  } else if (avgWords > 40) {
    cadence_speed = 'deliberate';
  } else {
    cadence_speed = 'moderate';
  }

  // Tone warmth analysis
  const warmPhrases = /\b(thank|appreciate|love|feel|understand|sorry|hope|wish|care|kind|gentle|sweet|wonderful|amazing|beautiful)\b/gi;
  const coldPhrases = /\b(technically|logically|actually|objectively|data|analysis|specifically|precisely|correct|incorrect|wrong|right)\b/gi;

  let warmCount = 0;
  let coldCount = 0;
  for (const msg of userMessages) {
    warmCount += (msg.match(warmPhrases) || []).length;
    coldCount += (msg.match(coldPhrases) || []).length;
  }

  let tone_warmth: VoiceVectors['tone_warmth'];
  const warmRatio = warmCount / (warmCount + coldCount + 1);
  if (warmRatio > 0.6) {
    tone_warmth = 'warm/empathetic';
  } else if (warmRatio < 0.3) {
    tone_warmth = 'cold/analytical';
  } else {
    tone_warmth = 'neutral';
  }

  // Sentence structure analysis
  const avgSentenceLength = userMessages
    .map(m => m.split(/[.!?]+/).filter(s => s.trim()).length)
    .reduce((a, b) => a + b, 0) / userMessages.length;

  const hasFragments = userMessages.some(m =>
    m.split(/[.!?]+/).some(s => s.trim().split(/\s+/).length < 4)
  );

  let sentence_structure: VoiceVectors['sentence_structure'];
  if (hasFragments && avgSentenceLength < 3) {
    sentence_structure = 'fragmented';
  } else if (avgSentenceLength > 5) {
    sentence_structure = 'complex';
  } else {
    sentence_structure = 'balanced';
  }

  // Emoji usage
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}\u{2600}-\u{26FF}\u{2700}-\u{27BF}]/gu;
  const totalEmojis = userMessages
    .map(m => (m.match(emojiRegex) || []).length)
    .reduce((a, b) => a + b, 0);
  const emojiPer100 = (totalEmojis / userMessages.length) * 100;

  let emoji_usage: VoiceVectors['emoji_usage'];
  if (emojiPer100 < 5) {
    emoji_usage = 'none';
  } else if (emojiPer100 < 20) {
    emoji_usage = 'minimal';
  } else {
    emoji_usage = 'liberal';
  }

  // Sign-off style detection
  const signOffPatterns = [
    /(?:thanks|cheers|best|regards|later|peace|love|bye|ciao|adios)/i,
    /(?:-\s*\w+|\n\w+$)/
  ];

  let sign_off_style: VoiceVectors['sign_off_style'] = 'none';
  const lastMessages = userMessages.slice(-20);
  const signOffCount = lastMessages.filter(m =>
    signOffPatterns.some(p => p.test(m))
  ).length;

  if (signOffCount > lastMessages.length * 0.3) {
    sign_off_style = 'signature';
  } else if (signOffCount > lastMessages.length * 0.1) {
    sign_off_style = 'casual';
  }

  return {
    cadence_speed,
    tone_warmth,
    sentence_structure,
    emoji_usage,
    sign_off_style
  };
}

/**
 * Extract topics and themes from conversations
 */
function extractTopics(messages: ParsedMessage[]): string[] {
  // Use conversation titles as primary topic source
  const titles = [...new Set(messages.map(m => m.conversationTitle))];

  // Extract topics from message content (simplified keyword extraction)
  const allContent = messages.map(m => m.content).join(' ').toLowerCase();

  const topicKeywords = [
    'work', 'job', 'career', 'business', 'startup',
    'coding', 'programming', 'tech', 'software', 'code',
    'relationship', 'family', 'friend', 'partner', 'love',
    'health', 'fitness', 'exercise', 'diet', 'mental',
    'money', 'finance', 'invest', 'budget', 'salary',
    'creative', 'art', 'music', 'writing', 'design',
    'learning', 'study', 'course', 'skill', 'education',
    'travel', 'adventure', 'explore', 'trip', 'vacation',
    'philosophy', 'meaning', 'purpose', 'life', 'death',
    'stress', 'anxiety', 'overwhelm', 'burnout', 'pressure'
  ];

  const foundTopics: string[] = [];
  for (const keyword of topicKeywords) {
    const regex = new RegExp(`\\b${keyword}\\w*\\b`, 'gi');
    if ((allContent.match(regex) || []).length > 3) {
      foundTopics.push(keyword);
    }
  }

  return [...titles, ...foundTopics].slice(0, 20);
}

/**
 * LLM-based deep analysis of chat patterns
 */
interface LLMAnalysisResult {
  archetype: string;
  identity_signature: string;
  sign_off: string;
  pillars: {
    communication_style: { summary: string; ai_instruction: string };
    emotional_alignment: { summary: string; ai_instruction: string };
    decision_making: { summary: string; ai_instruction: string };
    social_cultural: { summary: string; ai_instruction: string };
    cognitive_processing: { summary: string; ai_instruction: string };
    assertiveness_conflict: { summary: string; ai_instruction: string };
  };
  flinch_warnings: string[];
}

async function runLLMAnalysis(
  userMessages: string[],
  topics: string[],
  voiceVectors: VoiceVectors
): Promise<LLMAnalysisResult> {
  // Sample messages for analysis (avoid overwhelming the context)
  const sampleSize = Math.min(100, userMessages.length);
  const sampleStep = Math.floor(userMessages.length / sampleSize);
  const sampledMessages = userMessages
    .filter((_, i) => i % sampleStep === 0)
    .slice(0, 100)
    .map(m => m.slice(0, 500)); // Truncate long messages

  const prompt = buildAnalysisPrompt(sampledMessages, topics, voiceVectors);

  const messages: ChatMessage[] = [
    { role: 'system', content: CHAT_ANALYSIS_SYSTEM_PROMPT },
    { role: 'user', content: prompt }
  ];

  try {
    const response = await chatCompletion(messages);

    // Extract JSON from response
    const jsonMatch = response.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error('[ChatAnalyzer] No JSON found in LLM response');
      return getDefaultAnalysis(voiceVectors);
    }

    const parsed = JSON.parse(jsonMatch[0]);
    return validateAndNormalizeAnalysis(parsed, voiceVectors);
  } catch (error) {
    console.error('[ChatAnalyzer] LLM analysis failed:', error);
    return getDefaultAnalysis(voiceVectors);
  }
}

const CHAT_ANALYSIS_SYSTEM_PROMPT = `You are the SoulPrint Chat Analyzer.
Your job is to analyze a user's REAL conversation history to build their psychological profile.

IMPORTANT: This is BEHAVIORAL data, not self-reported. Look for:
- How they ACTUALLY communicate (not how they describe themselves)
- Patterns across many messages
- Their natural voice, rhythm, vocabulary
- Emotional patterns revealed through conversation
- Decision-making shown in real scenarios

OUTPUT FORMAT: Valid JSON only, no explanation. Follow this structure exactly:
{
  "archetype": "2-4 word identity archetype (e.g., 'Strategic Builder', 'Warm Connector')",
  "identity_signature": "2-3 sentences capturing their ESSENCE in high contrast",
  "sign_off": "If they have a natural sign-off phrase, put it here. Otherwise empty string.",
  "pillars": {
    "communication_style": {
      "summary": "How they communicate",
      "ai_instruction": "How to speak TO them (imperative instruction)"
    },
    "emotional_alignment": {
      "summary": "How they process emotions",
      "ai_instruction": "How to handle emotional topics with them"
    },
    "decision_making": {
      "summary": "How they make decisions",
      "ai_instruction": "How to help them with choices"
    },
    "social_cultural": {
      "summary": "Their social identity patterns",
      "ai_instruction": "How to relate to their identity"
    },
    "cognitive_processing": {
      "summary": "How they think and learn",
      "ai_instruction": "How to explain things to them"
    },
    "assertiveness_conflict": {
      "summary": "How they handle conflict",
      "ai_instruction": "How to handle disagreements with them"
    }
  },
  "flinch_warnings": ["Topics or behaviors to avoid - max 3"]
}`;

function buildAnalysisPrompt(
  messages: string[],
  topics: string[],
  voiceVectors: VoiceVectors
): string {
  const messageBlock = messages
    .map((m, i) => `[${i + 1}] ${m}`)
    .join('\n\n');

  return `Analyze this user's chat history to build their SoulPrint profile.

## PRE-EXTRACTED VOICE VECTORS
These were algorithmically extracted from their full message history:
- Cadence: ${voiceVectors.cadence_speed} (message length patterns)
- Tone: ${voiceVectors.tone_warmth} (warm/cold word analysis)
- Structure: ${voiceVectors.sentence_structure} (sentence patterns)
- Emoji usage: ${voiceVectors.emoji_usage}
- Sign-off style: ${voiceVectors.sign_off_style}

## DETECTED TOPICS
${topics.join(', ')}

## SAMPLED USER MESSAGES (${messages.length} of their messages)
${messageBlock}

Based on this data, generate the SoulPrint JSON profile.
Remember: This is behavioral evidence. Look for patterns, not claims.`;
}

function getDefaultAnalysis(voiceVectors: VoiceVectors): LLMAnalysisResult {
  // Infer archetype from voice vectors
  let archetype = 'Balanced Communicator';
  if (voiceVectors.tone_warmth === 'cold/analytical') {
    archetype = 'Strategic Thinker';
  } else if (voiceVectors.tone_warmth === 'warm/empathetic') {
    archetype = 'Warm Connector';
  }
  if (voiceVectors.cadence_speed === 'rapid') {
    archetype = 'Quick Mover';
  }

  return {
    archetype,
    identity_signature: 'A unique individual with their own communication style and perspective.',
    sign_off: '',
    pillars: {
      communication_style: {
        summary: `Communicates with ${voiceVectors.cadence_speed} cadence and ${voiceVectors.tone_warmth} tone.`,
        ai_instruction: 'Match their pace and tone. Be direct and helpful.'
      },
      emotional_alignment: {
        summary: 'Processes emotions in their own way.',
        ai_instruction: 'Be present and supportive without being presumptuous.'
      },
      decision_making: {
        summary: 'Makes decisions based on their own criteria.',
        ai_instruction: 'Present options clearly and respect their choice.'
      },
      social_cultural: {
        summary: 'Has their own social context and identity.',
        ai_instruction: 'Be respectful of their background and perspective.'
      },
      cognitive_processing: {
        summary: `Processes information in a ${voiceVectors.sentence_structure} manner.`,
        ai_instruction: 'Adapt explanations to their style.'
      },
      assertiveness_conflict: {
        summary: 'Handles conflict in their own way.',
        ai_instruction: 'Be honest but respectful in disagreements.'
      }
    },
    flinch_warnings: []
  };
}

function validateAndNormalizeAnalysis(
  parsed: Partial<LLMAnalysisResult>,
  voiceVectors: VoiceVectors
): LLMAnalysisResult {
  const defaults = getDefaultAnalysis(voiceVectors);

  return {
    archetype: parsed.archetype || defaults.archetype,
    identity_signature: parsed.identity_signature || defaults.identity_signature,
    sign_off: parsed.sign_off || '',
    pillars: {
      communication_style: {
        summary: parsed.pillars?.communication_style?.summary || defaults.pillars.communication_style.summary,
        ai_instruction: parsed.pillars?.communication_style?.ai_instruction || defaults.pillars.communication_style.ai_instruction
      },
      emotional_alignment: {
        summary: parsed.pillars?.emotional_alignment?.summary || defaults.pillars.emotional_alignment.summary,
        ai_instruction: parsed.pillars?.emotional_alignment?.ai_instruction || defaults.pillars.emotional_alignment.ai_instruction
      },
      decision_making: {
        summary: parsed.pillars?.decision_making?.summary || defaults.pillars.decision_making.summary,
        ai_instruction: parsed.pillars?.decision_making?.ai_instruction || defaults.pillars.decision_making.ai_instruction
      },
      social_cultural: {
        summary: parsed.pillars?.social_cultural?.summary || defaults.pillars.social_cultural.summary,
        ai_instruction: parsed.pillars?.social_cultural?.ai_instruction || defaults.pillars.social_cultural.ai_instruction
      },
      cognitive_processing: {
        summary: parsed.pillars?.cognitive_processing?.summary || defaults.pillars.cognitive_processing.summary,
        ai_instruction: parsed.pillars?.cognitive_processing?.ai_instruction || defaults.pillars.cognitive_processing.ai_instruction
      },
      assertiveness_conflict: {
        summary: parsed.pillars?.assertiveness_conflict?.summary || defaults.pillars.assertiveness_conflict.summary,
        ai_instruction: parsed.pillars?.assertiveness_conflict?.ai_instruction || defaults.pillars.assertiveness_conflict.ai_instruction
      }
    },
    flinch_warnings: Array.isArray(parsed.flinch_warnings)
      ? parsed.flinch_warnings.slice(0, 3)
      : []
  };
}
