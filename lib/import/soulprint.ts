/**
 * Quick SoulPrint Generator
 * Fast personality extraction from all conversations - no embeddings needed
 * Runs in ~30 seconds regardless of export size
 */

import type { ParsedConversation } from './parser';
import {
  BedrockRuntimeClient,
  ConverseCommand,
} from '@aws-sdk/client-bedrock-runtime';

// LLM Extraction Result (comprehensive)
export interface LLMExtraction {
  identity: {
    name?: string;
    nicknames?: string[];
    location?: string;
    timezone?: string;
    ageRange?: string;
  };
  professional: {
    currentJob?: string;
    company?: string;
    pastJobs?: string[];
    skills?: string[];
    industry?: string;
    workStyle?: string;
    goals?: string[];
  };
  relationships: Array<{
    name: string;
    role: string; // spouse, friend, coworker, etc.
    details?: string;
  }>;
  interests: {
    hobbies?: string[];
    entertainment?: string[];
    travel?: string[];
    reading?: string[];
  };
  beliefs: {
    coreValues?: string[];
    causes?: string[];
  };
  communication: {
    formality: 'casual' | 'balanced' | 'formal';
    emojiUsage: 'none' | 'light' | 'heavy';
    verbosity: 'concise' | 'balanced' | 'verbose';
    humorStyle?: string;
    languages?: string[];
  };
  health: {
    fitness?: string;
    diet?: string;
    sleepPattern?: string;
  };
  financial: {
    careerStage?: string;
    investments?: string[];
  };
  technology: {
    devices?: string[];
    favoriteApps?: string[];
    programmingLanguages?: string[];
  };
  lifeEvents: {
    recentMilestones?: string[];
    upcomingPlans?: string[];
  };
  preferences: {
    general?: string[];
    morning_night?: string;
    introvert_extrovert?: string;
  };
  painPoints: {
    frustrations?: string[];
    challenges?: string[];
  };
  goals: {
    shortTerm?: string[];
    longTerm?: string[];
    currentProjects?: string[];
  };
}

function getBedrockClient() {
  return new BedrockRuntimeClient({
    region: process.env.AWS_REGION || 'us-east-1',
    credentials: {
      accessKeyId: process.env.AWS_ACCESS_KEY_ID!,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY!,
    },
  });
}

export interface QuickSoulprint {
  // Core identity
  writingStyle: WritingStyle;
  personality: PersonalityTraits;
  interests: string[];
  expertise: string[];

  // Key facts
  facts: ExtractedFact[];

  // Relationships mentioned
  relationships: Relationship[];

  // AI Persona (auto-generated SOUL.md)
  aiPersona: AIPersona;

  // Metadata
  totalConversations: number;
  totalMessages: number;
  dateRange: { earliest: string; latest: string };
  generatedAt: string;
}

export interface AIPersona {
  tone: string;           // e.g., "direct and casual"
  style: string;          // e.g., "concise, no fluff"
  humor: 'none' | 'light' | 'frequent';
  formality: 'casual' | 'balanced' | 'formal';
  detailLevel: 'brief' | 'balanced' | 'thorough';
  traits: string[];       // e.g., ["straightforward", "practical", "supportive"]
  avoid: string[];        // e.g., ["small talk", "excessive praise", "long intros"]
  soulMd: string;         // Full generated SOUL.md content
}

export interface WritingStyle {
  formality: 'casual' | 'balanced' | 'formal';
  verbosity: 'concise' | 'balanced' | 'verbose';
  emojiUsage: 'none' | 'light' | 'heavy';
  avgMessageLength: number;
  commonPhrases: string[];
}

export interface PersonalityTraits {
  traits: string[]; // e.g., ["curious", "analytical", "direct"]
  communicationStyle: string;
  decisionMaking: string;
}

export interface ExtractedFact {
  fact: string;
  category: 'personal' | 'professional' | 'preference' | 'goal' | 'opinion';
  confidence: number;
  source: string; // conversation title or id
}

export interface Relationship {
  name: string;
  context: string; // e.g., "coworker", "partner", "friend"
  mentions: number;
}

// Sample size for quick analysis (recent + random sample)
const RECENT_SAMPLE_SIZE = 100; // Most recent conversations
const RANDOM_SAMPLE_SIZE = 200; // Random from rest
const MESSAGES_PER_CONVO = 20; // Max messages to analyze per conversation
const LLM_BATCH_SIZE = 20; // Conversations per LLM call
const LLM_SAMPLE_SIZE = 300; // Total conversations for LLM analysis

/**
 * LLM-Powered SoulPrint Generation
 * Uses Claude 3.5 Haiku to extract comprehensive profile (~3-5 minutes)
 */
export async function generateLLMSoulprint(
  conversations: ParsedConversation[],
  onProgress?: (stage: string, percent: number) => void
): Promise<{ extraction: LLMExtraction; soulprint: QuickSoulprint }> {
  const client = getBedrockClient();

  // Sort and sample strategically
  const sorted = [...conversations].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );

  // Strategic sampling: recent (150) + oldest (75) + longest (75)
  const recent = sorted.slice(0, 150);
  const oldest = sorted.slice(-75);
  const byLength = [...sorted]
    .sort((a, b) => b.messages.length - a.messages.length)
    .slice(0, 75);

  // Deduplicate
  const sampleMap = new Map<string, ParsedConversation>();
  [...recent, ...oldest, ...byLength].forEach(c => sampleMap.set(c.id, c));
  const sample = Array.from(sampleMap.values()).slice(0, LLM_SAMPLE_SIZE);

  console.log(`[SoulPrint LLM] Analyzing ${sample.length} conversations in ${Math.ceil(sample.length / LLM_BATCH_SIZE)} batches`);
  onProgress?.('Analyzing your conversations with AI...', 5);

  // Create batches
  const batches: ParsedConversation[][] = [];
  for (let i = 0; i < sample.length; i += LLM_BATCH_SIZE) {
    batches.push(sample.slice(i, i + LLM_BATCH_SIZE));
  }

  // Process batches with LLM
  const batchResults: Partial<LLMExtraction>[] = [];

  for (let i = 0; i < batches.length; i++) {
    const batch = batches[i];
    const progress = 5 + Math.round((i / batches.length) * 85);
    onProgress?.(`Batch ${i + 1}/${batches.length}: Deep analysis...`, progress);

    try {
      const result = await extractWithLLM(client, batch);
      batchResults.push(result);
      console.log(`[SoulPrint LLM] Batch ${i + 1}/${batches.length} complete`);
    } catch (err) {
      console.error(`[SoulPrint LLM] Batch ${i + 1} failed:`, err);
      // Continue with other batches
    }

    // Small delay between batches to avoid rate limiting
    if (i < batches.length - 1) {
      await new Promise(r => setTimeout(r, 500));
    }
  }

  onProgress?.('Merging insights...', 92);

  // Merge all batch results
  const mergedExtraction = mergeLLMResults(batchResults);

  // Generate QuickSoulprint for backward compatibility
  const soulprint = await generateQuickSoulprint(conversations);

  // Enhance soulprint with LLM data
  enhanceSoulprintWithLLM(soulprint, mergedExtraction);

  onProgress?.('Complete!', 100);

  return { extraction: mergedExtraction, soulprint };
}

/**
 * Extract information from a batch of conversations using Claude
 */
async function extractWithLLM(
  client: BedrockRuntimeClient,
  batch: ParsedConversation[]
): Promise<Partial<LLMExtraction>> {
  // Prepare conversation summaries for the prompt
  const conversationTexts = batch.map(convo => {
    const userMsgs = convo.messages
      .filter(m => m.role === 'user')
      .slice(0, 15)
      .map(m => m.content.slice(0, 300))
      .join('\n');
    return `### ${convo.title}\n${userMsgs}`;
  }).join('\n\n---\n\n');

  const prompt = `Analyze these user messages from their conversation history. Extract information about this person.

${conversationTexts}

Return a JSON object with ONLY the fields you find evidence for. Be specific and quote when possible.

{
  "identity": { "name": "...", "location": "...", "timezone": "...", "ageRange": "..." },
  "professional": { "currentJob": "...", "company": "...", "pastJobs": [...], "skills": [...], "industry": "...", "workStyle": "remote/hybrid/office", "goals": [...] },
  "relationships": [{ "name": "...", "role": "spouse/friend/coworker/parent/child/pet", "details": "..." }],
  "interests": { "hobbies": [...], "entertainment": [...], "travel": [...], "reading": [...] },
  "beliefs": { "coreValues": [...], "causes": [...] },
  "communication": { "formality": "casual/balanced/formal", "emojiUsage": "none/light/heavy", "verbosity": "concise/balanced/verbose", "humorStyle": "...", "languages": [...] },
  "health": { "fitness": "...", "diet": "...", "sleepPattern": "..." },
  "financial": { "careerStage": "student/early/mid/senior", "investments": [...] },
  "technology": { "devices": [...], "favoriteApps": [...], "programmingLanguages": [...] },
  "lifeEvents": { "recentMilestones": [...], "upcomingPlans": [...] },
  "preferences": { "general": [...], "morning_night": "morning/night", "introvert_extrovert": "introvert/extrovert/ambivert" },
  "painPoints": { "frustrations": [...], "challenges": [...] },
  "goals": { "shortTerm": [...], "longTerm": [...], "currentProjects": [...] }
}

Return ONLY valid JSON, no markdown.`;

  const command = new ConverseCommand({
    modelId: process.env.BEDROCK_MODEL_ID || 'us.anthropic.claude-3-5-haiku-20241022-v1:0',
    messages: [{ role: 'user', content: [{ text: prompt }] }],
    inferenceConfig: { maxTokens: 4096 },
  });

  const response = await client.send(command);
  const outputText = response.output?.message?.content?.[0];

  if (!outputText || !('text' in outputText) || !outputText.text) {
    throw new Error('No text in LLM response');
  }

  // Parse JSON from response
  const jsonMatch = outputText.text.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in LLM response');
  }

  return JSON.parse(jsonMatch[0]) as Partial<LLMExtraction>;
}

/**
 * Merge multiple LLM batch results into one comprehensive extraction
 */
function mergeLLMResults(results: Partial<LLMExtraction>[]): LLMExtraction {
  const merged: LLMExtraction = {
    identity: {},
    professional: {},
    relationships: [],
    interests: {},
    beliefs: {},
    communication: { formality: 'balanced', emojiUsage: 'none', verbosity: 'balanced' },
    health: {},
    financial: {},
    technology: {},
    lifeEvents: {},
    preferences: {},
    painPoints: {},
    goals: {},
  };

  for (const result of results) {
    // Identity - take first non-null values
    if (result.identity) {
      merged.identity = { ...merged.identity, ...result.identity };
    }

    // Professional - merge arrays
    if (result.professional) {
      merged.professional = {
        ...merged.professional,
        ...result.professional,
        pastJobs: [...(merged.professional.pastJobs || []), ...(result.professional.pastJobs || [])],
        skills: [...(merged.professional.skills || []), ...(result.professional.skills || [])],
        goals: [...(merged.professional.goals || []), ...(result.professional.goals || [])],
      };
    }

    // Relationships - merge and deduplicate by name
    if (result.relationships) {
      const existingNames = new Set(merged.relationships.map(r => r.name.toLowerCase()));
      for (const rel of result.relationships) {
        if (!existingNames.has(rel.name.toLowerCase())) {
          merged.relationships.push(rel);
          existingNames.add(rel.name.toLowerCase());
        }
      }
    }

    // Interests - merge arrays
    if (result.interests) {
      merged.interests = {
        hobbies: [...(merged.interests.hobbies || []), ...(result.interests.hobbies || [])],
        entertainment: [...(merged.interests.entertainment || []), ...(result.interests.entertainment || [])],
        travel: [...(merged.interests.travel || []), ...(result.interests.travel || [])],
        reading: [...(merged.interests.reading || []), ...(result.interests.reading || [])],
      };
    }

    // Beliefs
    if (result.beliefs) {
      merged.beliefs = {
        coreValues: [...(merged.beliefs.coreValues || []), ...(result.beliefs.coreValues || [])],
        causes: [...(merged.beliefs.causes || []), ...(result.beliefs.causes || [])],
      };
    }

    // Communication - use most recent
    if (result.communication) {
      merged.communication = { ...merged.communication, ...result.communication };
    }

    // Health
    if (result.health) {
      merged.health = { ...merged.health, ...result.health };
    }

    // Financial
    if (result.financial) {
      merged.financial = {
        ...merged.financial,
        ...result.financial,
        investments: [...(merged.financial.investments || []), ...(result.financial.investments || [])],
      };
    }

    // Technology
    if (result.technology) {
      merged.technology = {
        devices: [...(merged.technology.devices || []), ...(result.technology.devices || [])],
        favoriteApps: [...(merged.technology.favoriteApps || []), ...(result.technology.favoriteApps || [])],
        programmingLanguages: [...(merged.technology.programmingLanguages || []), ...(result.technology.programmingLanguages || [])],
      };
    }

    // Life Events
    if (result.lifeEvents) {
      merged.lifeEvents = {
        recentMilestones: [...(merged.lifeEvents.recentMilestones || []), ...(result.lifeEvents.recentMilestones || [])],
        upcomingPlans: [...(merged.lifeEvents.upcomingPlans || []), ...(result.lifeEvents.upcomingPlans || [])],
      };
    }

    // Preferences
    if (result.preferences) {
      merged.preferences = {
        ...merged.preferences,
        ...result.preferences,
        general: [...(merged.preferences.general || []), ...(result.preferences.general || [])],
      };
    }

    // Pain Points
    if (result.painPoints) {
      merged.painPoints = {
        frustrations: [...(merged.painPoints.frustrations || []), ...(result.painPoints.frustrations || [])],
        challenges: [...(merged.painPoints.challenges || []), ...(result.painPoints.challenges || [])],
      };
    }

    // Goals
    if (result.goals) {
      merged.goals = {
        shortTerm: [...(merged.goals.shortTerm || []), ...(result.goals.shortTerm || [])],
        longTerm: [...(merged.goals.longTerm || []), ...(result.goals.longTerm || [])],
        currentProjects: [...(merged.goals.currentProjects || []), ...(result.goals.currentProjects || [])],
      };
    }
  }

  // Deduplicate arrays
  const dedup = <T>(arr: T[] | undefined): T[] => arr ? [...new Set(arr)] : [];
  merged.professional.pastJobs = dedup(merged.professional.pastJobs);
  merged.professional.skills = dedup(merged.professional.skills);
  merged.interests.hobbies = dedup(merged.interests.hobbies);
  merged.technology.programmingLanguages = dedup(merged.technology.programmingLanguages);
  merged.goals.shortTerm = dedup(merged.goals.shortTerm);
  merged.goals.longTerm = dedup(merged.goals.longTerm);

  return merged;
}

/**
 * Enhance QuickSoulprint with LLM extraction data
 */
function enhanceSoulprintWithLLM(soulprint: QuickSoulprint, extraction: LLMExtraction): void {
  // Add LLM-extracted facts
  if (extraction.identity.name) {
    soulprint.facts.unshift({
      fact: `Name: ${extraction.identity.name}`,
      category: 'personal',
      confidence: 0.9,
      source: 'LLM extraction',
    });
  }
  if (extraction.identity.location) {
    soulprint.facts.unshift({
      fact: `Lives in ${extraction.identity.location}`,
      category: 'personal',
      confidence: 0.9,
      source: 'LLM extraction',
    });
  }
  if (extraction.professional.currentJob) {
    soulprint.facts.unshift({
      fact: `Works as ${extraction.professional.currentJob}${extraction.professional.company ? ` at ${extraction.professional.company}` : ''}`,
      category: 'professional',
      confidence: 0.9,
      source: 'LLM extraction',
    });
  }

  // Add LLM-extracted relationships
  for (const rel of extraction.relationships.slice(0, 10)) {
    const existing = soulprint.relationships.find(r => r.name.toLowerCase() === rel.name.toLowerCase());
    if (!existing) {
      soulprint.relationships.unshift({
        name: rel.name,
        context: rel.role,
        mentions: 1,
      });
    }
  }

  // Add LLM-extracted interests
  const llmInterests = [
    ...(extraction.interests.hobbies || []),
    ...(extraction.interests.entertainment || []),
  ];
  for (const interest of llmInterests.slice(0, 5)) {
    if (!soulprint.interests.includes(interest.toLowerCase())) {
      soulprint.interests.push(interest.toLowerCase());
    }
  }

  // Update communication style from LLM
  if (extraction.communication) {
    soulprint.writingStyle.formality = extraction.communication.formality || soulprint.writingStyle.formality;
    soulprint.writingStyle.emojiUsage = extraction.communication.emojiUsage || soulprint.writingStyle.emojiUsage;
    soulprint.writingStyle.verbosity = extraction.communication.verbosity || soulprint.writingStyle.verbosity;
  }
}

/**
 * Generate a quick soulprint from conversations
 * Designed to run in ~30 seconds max
 */
export async function generateQuickSoulprint(
  conversations: ParsedConversation[]
): Promise<QuickSoulprint> {
  // Sort by date descending
  const sorted = [...conversations].sort(
    (a, b) => b.updatedAt.getTime() - a.updatedAt.getTime()
  );

  // Full Scan Mode: Use ALL conversations
  // The user requested a full scan, so we skip sampling.
  const sampleConvos = sorted;
  console.log(`[SoulPrint] Analyzing full history: ${sampleConvos.length} conversations`);

  // Collect user messages (limit per convo to avoid memory exhaustion, but scan all convos)
  const MESSAGES_TO_SCAN = 50; // Increased from 20 for deeper analysis per convo
  const userMessages: string[] = [];

  for (const convo of sampleConvos) {
    const msgs = convo.messages
      .filter(m => m.role === 'user')
      .slice(0, MESSAGES_TO_SCAN)
      .map(m => m.content);
    userMessages.push(...msgs);
  }

  // Extract all analyses in parallel
  const [
    writingStyle,
    interests,
    facts,
    relationships
  ] = await Promise.all([
    analyzeWritingStyle(userMessages),
    extractInterests(userMessages),
    extractFacts(sampleConvos),
    extractRelationships(userMessages),
  ]);

  // Derive personality from writing patterns
  const personality = derivePersonality(writingStyle, userMessages);

  // Generate AI persona (SOUL.md) based on user's communication style
  const aiPersona = generateAIPersona(writingStyle, personality, userMessages);

  // Calculate date range
  const dates = conversations
    .map(c => c.createdAt.getTime())
    .filter(d => d > 0);
  const earliest = dates.length > 0 ? new Date(Math.min(...dates)) : new Date();
  const latest = dates.length > 0 ? new Date(Math.max(...dates)) : new Date();

  return {
    writingStyle,
    personality,
    interests,
    expertise: extractExpertise(interests, facts),
    facts,
    relationships,
    aiPersona,
    totalConversations: conversations.length,
    totalMessages: conversations.reduce((sum, c) => sum + c.messages.length, 0),
    dateRange: {
      earliest: earliest.toISOString(),
      latest: latest.toISOString(),
    },
    generatedAt: new Date().toISOString(),
  };
}

/**
 * Analyze writing style from messages
 */
function analyzeWritingStyle(messages: string[]): WritingStyle {
  if (messages.length === 0) {
    return {
      formality: 'balanced',
      verbosity: 'balanced',
      emojiUsage: 'none',
      avgMessageLength: 0,
      commonPhrases: [],
    };
  }

  // Calculate averages
  const lengths = messages.map(m => m.length);
  const avgLength = lengths.reduce((a, b) => a + b, 0) / lengths.length;

  // Emoji detection
  const emojiRegex = /[\u{1F600}-\u{1F64F}\u{1F300}-\u{1F5FF}\u{1F680}-\u{1F6FF}\u{1F1E0}-\u{1F1FF}]/gu;
  const emojiCount = messages.reduce((sum, m) => sum + (m.match(emojiRegex)?.length || 0), 0);
  const emojiRatio = emojiCount / messages.length;

  // Formality indicators
  const formalIndicators = ['please', 'thank you', 'would you', 'could you', 'kindly'];
  const casualIndicators = ['hey', 'yo', 'gonna', 'wanna', 'lol', 'lmao', 'haha'];

  let formalScore = 0;
  let casualScore = 0;
  const combinedText = messages.join(' ').toLowerCase();

  for (const indicator of formalIndicators) {
    if (combinedText.includes(indicator)) formalScore++;
  }
  for (const indicator of casualIndicators) {
    if (combinedText.includes(indicator)) casualScore++;
  }

  // Extract common phrases (2-3 word sequences that appear multiple times)
  const commonPhrases = extractCommonPhrases(messages);

  return {
    formality: formalScore > casualScore + 2 ? 'formal' :
      casualScore > formalScore + 2 ? 'casual' : 'balanced',
    verbosity: avgLength > 200 ? 'verbose' : avgLength < 50 ? 'concise' : 'balanced',
    emojiUsage: emojiRatio > 0.5 ? 'heavy' : emojiRatio > 0.1 ? 'light' : 'none',
    avgMessageLength: Math.round(avgLength),
    commonPhrases: commonPhrases.slice(0, 10),
  };
}

/**
 * Extract common phrases from messages
 */
function extractCommonPhrases(messages: string[]): string[] {
  const phrases: Record<string, number> = {};

  for (const message of messages) {
    const words = message.toLowerCase().split(/\s+/).filter(w => w.length > 2);

    // 2-word phrases
    for (let i = 0; i < words.length - 1; i++) {
      const phrase = `${words[i]} ${words[i + 1]}`;
      phrases[phrase] = (phrases[phrase] || 0) + 1;
    }
  }

  // Filter to phrases that appear multiple times and aren't boring
  const boringPhrases = ['i am', 'it is', 'to be', 'the the', 'i have', 'i want'];

  return Object.entries(phrases)
    .filter(([phrase, count]) => count >= 3 && !boringPhrases.includes(phrase))
    .sort((a, b) => b[1] - a[1])
    .map(([phrase]) => phrase);
}

/**
 * Extract interests/topics from messages
 */
function extractInterests(messages: string[]): string[] {
  const topicIndicators: Record<string, string[]> = {
    'technology': ['code', 'programming', 'software', 'app', 'api', 'database', 'tech'],
    'business': ['startup', 'company', 'revenue', 'growth', 'market', 'product', 'customers'],
    'design': ['design', 'ui', 'ux', 'visual', 'layout', 'figma', 'aesthetic'],
    'writing': ['write', 'writing', 'blog', 'article', 'content', 'story'],
    'fitness': ['workout', 'gym', 'exercise', 'running', 'fitness', 'health'],
    'music': ['music', 'song', 'album', 'artist', 'spotify', 'playlist'],
    'travel': ['travel', 'trip', 'flight', 'hotel', 'destination', 'vacation'],
    'food': ['recipe', 'cooking', 'restaurant', 'food', 'eat', 'dinner'],
    'ai': ['ai', 'gpt', 'machine learning', 'neural', 'llm', 'model'],
    'finance': ['invest', 'stock', 'crypto', 'money', 'budget', 'savings'],
    'gaming': ['game', 'gaming', 'play', 'steam', 'console', 'xbox', 'playstation'],
    'reading': ['book', 'reading', 'novel', 'author', 'kindle'],
    'productivity': ['productivity', 'notion', 'todo', 'task', 'organize', 'workflow'],
  };

  const combinedText = messages.join(' ').toLowerCase();
  const interests: Array<{ topic: string; score: number }> = [];

  for (const [topic, keywords] of Object.entries(topicIndicators)) {
    let score = 0;
    for (const keyword of keywords) {
      const regex = new RegExp(`\\b${keyword}\\b`, 'gi');
      const matches = combinedText.match(regex);
      score += matches?.length || 0;
    }
    if (score > 2) {
      interests.push({ topic, score });
    }
  }

  return interests
    .sort((a, b) => b.score - a.score)
    .slice(0, 8)
    .map(i => i.topic);
}

/**
 * Extract key facts from conversations
 */
function extractFacts(conversations: ParsedConversation[]): ExtractedFact[] {
  const facts: ExtractedFact[] = [];

  // Patterns to detect factual statements
  const patterns = [
    { regex: /i (?:work|am working) (?:at|for) ([^,.]+)/gi, category: 'professional' as const },
    { regex: /i(?:'m| am) (?:a|an) ([^,.]+(?:developer|designer|engineer|manager|founder|ceo|cto))/gi, category: 'professional' as const },
    { regex: /i live in ([^,.]+)/gi, category: 'personal' as const },
    { regex: /i(?:'m| am) from ([^,.]+)/gi, category: 'personal' as const },
    { regex: /my (?:wife|husband|partner|girlfriend|boyfriend) ([^,.]+)/gi, category: 'personal' as const },
    { regex: /i prefer ([^,.]+)/gi, category: 'preference' as const },
    { regex: /i(?:'m| am) building ([^,.]+)/gi, category: 'goal' as const },
    { regex: /i(?:'m| am) working on ([^,.]+)/gi, category: 'goal' as const },
    { regex: /i think ([^,.]+) is (?:better|worse|important)/gi, category: 'opinion' as const },
  ];

  const seenFacts = new Set<string>();

  for (const convo of conversations.slice(0, 200)) { // Limit scan
    for (const msg of convo.messages.filter(m => m.role === 'user')) {
      for (const pattern of patterns) {
        const matches = msg.content.matchAll(pattern.regex);
        for (const match of matches) {
          const factText = match[0].trim();
          const normalized = factText.toLowerCase();

          if (seenFacts.has(normalized)) continue;
          if (factText.length < 10 || factText.length > 200) continue;

          seenFacts.add(normalized);
          facts.push({
            fact: factText,
            category: pattern.category,
            confidence: 0.7,
            source: convo.title,
          });
        }
      }
    }
  }

  return facts.slice(0, 50); // Cap at 50 facts
}

/**
 * Extract relationships mentioned
 */
function extractRelationships(messages: string[]): Relationship[] {
  const relationshipPatterns = [
    { regex: /my (?:wife|husband) ([A-Z][a-z]+)/g, context: 'spouse' },
    { regex: /my (?:girlfriend|boyfriend|partner) ([A-Z][a-z]+)/g, context: 'partner' },
    { regex: /my (?:friend|buddy) ([A-Z][a-z]+)/g, context: 'friend' },
    { regex: /my (?:boss|manager) ([A-Z][a-z]+)/g, context: 'manager' },
    { regex: /my (?:coworker|colleague) ([A-Z][a-z]+)/g, context: 'coworker' },
    { regex: /my (?:mom|mother|dad|father) ([A-Z][a-z]+)?/g, context: 'parent' },
    { regex: /my (?:brother|sister) ([A-Z][a-z]+)?/g, context: 'sibling' },
  ];

  const relationships: Record<string, Relationship> = {};
  const combinedText = messages.join(' ');

  for (const pattern of relationshipPatterns) {
    const matches = combinedText.matchAll(pattern.regex);
    for (const match of matches) {
      const name = match[1] || pattern.context;
      const key = name.toLowerCase();

      if (relationships[key]) {
        relationships[key].mentions++;
      } else {
        relationships[key] = {
          name,
          context: pattern.context,
          mentions: 1,
        };
      }
    }
  }

  return Object.values(relationships)
    .sort((a, b) => b.mentions - a.mentions)
    .slice(0, 20);
}

/**
 * Derive personality traits from writing style and messages
 */
function derivePersonality(style: WritingStyle, messages: string[]): PersonalityTraits {
  const traits: string[] = [];

  // Derive from writing style
  if (style.formality === 'casual') traits.push('approachable');
  if (style.formality === 'formal') traits.push('professional');
  if (style.verbosity === 'concise') traits.push('direct');
  if (style.verbosity === 'verbose') traits.push('thorough');

  // Look for question patterns (curiosity)
  const questionCount = messages.filter(m => m.includes('?')).length;
  if (questionCount > messages.length * 0.4) traits.push('curious');

  // Look for analytical language
  const analyticalWords = ['analyze', 'consider', 'evaluate', 'compare', 'reason'];
  const combinedText = messages.join(' ').toLowerCase();
  if (analyticalWords.some(w => combinedText.includes(w))) traits.push('analytical');

  // Look for creative language
  const creativeWords = ['imagine', 'create', 'idea', 'brainstorm', 'design'];
  if (creativeWords.some(w => combinedText.includes(w))) traits.push('creative');

  return {
    traits: traits.slice(0, 5),
    communicationStyle: style.formality === 'formal'
      ? 'Structured and professional'
      : style.formality === 'casual'
        ? 'Relaxed and conversational'
        : 'Balanced and adaptable',
    decisionMaking: traits.includes('analytical')
      ? 'Data-driven and logical'
      : 'Intuitive and practical',
  };
}

/**
 * Extract expertise areas from interests and facts
 */
function extractExpertise(interests: string[], facts: ExtractedFact[]): string[] {
  const expertise = new Set<string>();

  // Top interests likely indicate expertise
  for (const interest of interests.slice(0, 3)) {
    expertise.add(interest);
  }

  // Professional facts indicate expertise
  for (const fact of facts.filter(f => f.category === 'professional')) {
    const keywords = ['developer', 'designer', 'engineer', 'manager', 'founder'];
    for (const kw of keywords) {
      if (fact.fact.toLowerCase().includes(kw)) {
        expertise.add(kw);
      }
    }
  }

  return Array.from(expertise).slice(0, 5);
}

/**
 * Random sample from array
 */
function sampleArray<T>(arr: T[], size: number): T[] {
  if (arr.length <= size) return arr;

  const shuffled = [...arr];
  for (let i = shuffled.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
  }

  return shuffled.slice(0, size);
}

/**
 * Generate AI persona (SOUL.md) based on user's communication patterns
 * This shapes HOW the AI talks to this specific user
 */
function generateAIPersona(
  style: WritingStyle,
  personality: PersonalityTraits,
  messages: string[]
): AIPersona {
  // Determine humor level from messages
  const humorIndicators = ['lol', 'haha', 'lmao', '😂', '🤣', 'joke', 'funny'];
  const combinedText = messages.join(' ').toLowerCase();
  const humorCount = humorIndicators.reduce(
    (sum, ind) => sum + (combinedText.match(new RegExp(ind, 'g'))?.length || 0),
    0
  );
  const humorRatio = humorCount / messages.length;
  const humor: 'none' | 'light' | 'frequent' =
    humorRatio > 0.15 ? 'frequent' : humorRatio > 0.05 ? 'light' : 'none';

  // Determine detail level from message length and question patterns
  const avgLength = style.avgMessageLength;
  const detailLevel: 'brief' | 'balanced' | 'thorough' =
    avgLength > 200 ? 'thorough' : avgLength < 80 ? 'brief' : 'balanced';

  // Build traits for the AI to embody
  const traits: string[] = [];
  if (style.formality === 'casual') traits.push('relaxed', 'approachable');
  if (style.formality === 'formal') traits.push('professional', 'polished');
  if (style.verbosity === 'concise') traits.push('direct', 'efficient');
  if (style.verbosity === 'verbose') traits.push('thorough', 'detailed');
  if (humor !== 'none') traits.push('witty');
  if (personality.traits.includes('curious')) traits.push('intellectually engaging');
  if (personality.traits.includes('analytical')) traits.push('logical', 'structured');
  if (personality.traits.includes('creative')) traits.push('imaginative');

  // Build avoid list based on user preferences
  const avoid: string[] = [];
  if (style.verbosity === 'concise') {
    avoid.push('long introductions', 'unnecessary filler', 'excessive qualifiers');
  }
  if (style.formality === 'casual') {
    avoid.push('overly formal language', 'corporate speak');
  }
  if (humor === 'none') {
    avoid.push('forced humor', 'jokes');
  }
  // Common AI behaviors users often dislike
  avoid.push('sycophantic praise', '"Great question!"', 'asking permission for everything');

  // Determine tone and style descriptions
  const toneWords: string[] = [];
  if (style.formality === 'casual') toneWords.push('casual');
  if (style.formality === 'formal') toneWords.push('professional');
  if (style.verbosity === 'concise') toneWords.push('direct');
  if (humor !== 'none') toneWords.push('friendly');
  const tone = toneWords.length > 0 ? toneWords.join(' and ') : 'balanced';

  const styleDesc = detailLevel === 'brief'
    ? 'concise and to-the-point, no fluff'
    : detailLevel === 'thorough'
      ? 'detailed and comprehensive when needed'
      : 'balanced - thorough when it matters, brief when it doesn\'t';

  // Generate full SOUL.md content
  const soulMd = generateSoulMd(tone, styleDesc, humor, traits, avoid, detailLevel);

  return {
    tone,
    style: styleDesc,
    humor,
    formality: style.formality,
    detailLevel,
    traits: traits.slice(0, 6),
    avoid: avoid.slice(0, 6),
    soulMd,
  };
}

/**
 * Generate the full SOUL.md content for the AI persona
 */
function generateSoulMd(
  tone: string,
  style: string,
  humor: 'none' | 'light' | 'frequent',
  traits: string[],
  avoid: string[],
  detailLevel: string
): string {
  const humorLine = humor === 'frequent'
    ? 'Use humor naturally — the user appreciates wit and levity.'
    : humor === 'light'
      ? 'Light humor is okay when it fits naturally.'
      : 'Keep things straightforward — skip the jokes unless the user initiates.';

  const detailLine = detailLevel === 'brief'
    ? 'Keep responses concise. Get to the point quickly. The user values efficiency.'
    : detailLevel === 'thorough'
      ? 'The user appreciates detailed, thorough responses. Don\'t hold back on useful information.'
      : 'Match your detail level to the question — brief for simple asks, thorough for complex ones.';

  return `# SOUL.md — AI Persona

*Auto-generated based on conversation analysis*

## Core Identity

You are SoulPrint — a personalized AI assistant shaped by this user's communication style.

**Tone:** ${tone}
**Style:** ${style}

## How to Communicate

${humorLine}

${detailLine}

### Traits to Embody
${traits.map(t => `- ${t}`).join('\n')}

### Things to Avoid
${avoid.map(a => `- ${a}`).join('\n')}

## Guidelines

1. **Match their energy** — If they're brief, be brief. If they elaborate, you can too.
2. **Be genuinely helpful** — Skip performative helpfulness, just help.
3. **Remember context** — Use what you know about them naturally.
4. **Have opinions** — Don't be wishy-washy. Take positions when asked.
5. **Respect their time** — Don't pad responses unnecessarily.

## Adaptation

This persona was generated from conversation patterns. As you learn more through interactions, the persona should evolve. The user can always override: "be more direct" / "explain in more detail" / "lighten up" — and you should adapt immediately.
`;
}

/**
 * Convert soulprint to a text format for immediate use
 * Includes both the AI persona (SOUL.md) and user context
 */
export function soulprintToContext(soulprint: QuickSoulprint): string {
  // Start with the AI persona (how to behave)
  const lines: string[] = [
    soulprint.aiPersona.soulMd,
    '',
    '---',
    '',
    '## User Context',
    '',
    `**Conversations analyzed:** ${soulprint.totalConversations.toLocaleString()} (${soulprint.totalMessages.toLocaleString()} messages)`,
    `**Date range:** ${soulprint.dateRange.earliest.split('T')[0]} to ${soulprint.dateRange.latest.split('T')[0]}`,
    '',
    '### User\'s Interests',
    soulprint.interests.map(i => `- ${i}`).join('\n') || '- Unknown',
    '',
    '### Key Facts About User',
    soulprint.facts.slice(0, 10).map(f => `- ${f.fact}`).join('\n') || '- None extracted',
  ];

  if (soulprint.relationships.length > 0) {
    lines.push('', '### People They\'ve Mentioned');
    for (const rel of soulprint.relationships.slice(0, 5)) {
      lines.push(`- ${rel.name} (${rel.context})`);
    }
  }

  return lines.join('\n');
}

/**
 * Get just the SOUL.md content for the AI persona
 */
export function getSoulMd(soulprint: QuickSoulprint): string {
  return soulprint.aiPersona.soulMd;
}
