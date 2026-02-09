/**
 * Evaluation Dataset Creation
 *
 * Extracts anonymized chat message pairs from the chat_messages table,
 * enriches them with soulprint context from user_profiles, and creates
 * an Opik dataset for offline evaluation experiments.
 *
 * Privacy: All user IDs are SHA256-hashed. No raw PII in dataset items.
 *
 * Satisfies: EVAL-01 (evaluation datasets exist)
 */

import { createHash } from 'crypto';
import { createClient as createAdminClient } from '@supabase/supabase-js';
import { getOpikClient } from '@/lib/opik';
import type { ChatEvalItem, DatasetCreationResult } from '@/lib/evaluation/types';

/**
 * Create an admin Supabase client for server-side data access.
 * Uses service role key to bypass RLS for cross-user dataset extraction.
 */
function getSupabaseAdmin() {
  return createAdminClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/**
 * SHA256 hash a user ID for anonymization.
 * Deterministic: same user ID always produces same hash.
 */
function hashUserId(userId: string): string {
  return createHash('sha256').update(userId).digest('hex');
}

/**
 * Safely parse a JSON string, returning null on failure.
 */
function parseSafe(raw: string | null): Record<string, unknown> | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Extract personality traits from a parsed soul section.
 * Returns empty array if section is missing or malformed.
 */
function extractTraits(soulSection: Record<string, unknown> | null): string[] {
  if (!soulSection) return [];
  const traits = soulSection.personality_traits;
  if (Array.isArray(traits) && traits.every((t) => typeof t === 'string')) {
    return traits as string[];
  }
  return [];
}

/**
 * Extract tone preferences from a parsed soul section.
 * Returns empty string if section is missing or malformed.
 */
function extractTone(soulSection: Record<string, unknown> | null): string {
  if (!soulSection) return '';
  const tone = soulSection.tone_preferences;
  return typeof tone === 'string' ? tone : '';
}

/**
 * Extract response style from a parsed agents section.
 * Returns empty string if section is missing or malformed.
 */
function extractStyle(agentsSection: Record<string, unknown> | null): string {
  if (!agentsSection) return '';
  const style = agentsSection.response_style;
  return typeof style === 'string' ? style : '';
}

interface ChatMessageRow {
  id: string;
  user_id: string;
  role: string;
  content: string;
  created_at: string;
  conversation_id: string;
}

interface UserProfileRow {
  user_id: string;
  soul_md: string | null;
  identity_md: string | null;
  user_md: string | null;
  agents_md: string | null;
  tools_md: string | null;
}

const MIN_VALID_PAIRS = 10;

/**
 * Create an Opik evaluation dataset from production chat_messages.
 *
 * Extracts user/assistant message pairs, anonymizes user IDs with SHA256,
 * enriches with soulprint context, and uploads to Opik.
 *
 * @param limit - Maximum number of message pairs to include (default: 100)
 * @returns Dataset name and item count
 * @throws If OPIK_API_KEY is not set, insufficient valid pairs, or DB errors
 */
export async function createEvaluationDataset(
  limit: number = 100
): Promise<DatasetCreationResult> {
  // Validate Opik client availability
  const opik = getOpikClient();
  if (!opik) {
    throw new Error(
      'OPIK_API_KEY is not set. Configure it in your environment to create evaluation datasets. ' +
      'Sign up at https://www.comet.com/opik and get your API key from Settings.'
    );
  }

  const supabase = getSupabaseAdmin();

  // Fetch recent chat messages (limit * 2 to ensure enough pairs)
  const { data: messages, error: messagesError } = await supabase
    .from('chat_messages')
    .select('id, user_id, role, content, created_at, conversation_id')
    .order('created_at', { ascending: false })
    .limit(limit * 2);

  if (messagesError) {
    throw new Error(`Failed to fetch chat_messages: ${messagesError.message}`);
  }

  if (!messages || messages.length < 2) {
    throw new Error(
      `Not enough chat messages for dataset creation. Found ${messages?.length ?? 0} messages, need at least ${MIN_VALID_PAIRS * 2}.`
    );
  }

  const typedMessages = messages as ChatMessageRow[];

  // Collect unique user IDs for profile lookup
  const userIds = Array.from(new Set(typedMessages.map((m) => m.user_id)));

  // Fetch soulprint sections for all users in the dataset
  const { data: profiles, error: profilesError } = await supabase
    .from('user_profiles')
    .select('user_id, soul_md, identity_md, user_md, agents_md, tools_md')
    .in('user_id', userIds);

  if (profilesError) {
    throw new Error(`Failed to fetch user_profiles: ${profilesError.message}`);
  }

  // Build a lookup map: user_id -> profile
  const profileMap = new Map<string, UserProfileRow>(
    (profiles as UserProfileRow[] | null)?.map((p) => [p.user_id, p]) ?? []
  );

  // Pair consecutive user/assistant messages within the same conversation
  const items: ChatEvalItem[] = [];
  const now = new Date().toISOString();

  for (let i = 0; i < typedMessages.length - 1; i++) {
    const userMsg = typedMessages[i]!;
    const assistantMsg = typedMessages[i + 1]!;

    // Only pair user -> assistant in the same conversation
    if (
      userMsg.role !== 'user' ||
      assistantMsg.role !== 'assistant' ||
      userMsg.conversation_id !== assistantMsg.conversation_id
    ) {
      continue;
    }

    // Skip empty messages
    if (!userMsg.content?.trim() || !assistantMsg.content?.trim()) {
      continue;
    }

    const profile = profileMap.get(userMsg.user_id);

    // Parse soulprint sections safely
    const soulParsed = parseSafe(profile?.soul_md ?? null);
    const identityParsed = parseSafe(profile?.identity_md ?? null);
    const userParsed = parseSafe(profile?.user_md ?? null);
    const agentsParsed = parseSafe(profile?.agents_md ?? null);
    const toolsParsed = parseSafe(profile?.tools_md ?? null);

    items.push({
      user_message: userMsg.content,
      assistant_response: assistantMsg.content,
      soulprint_context: {
        soul: soulParsed,
        identity: identityParsed,
        user: userParsed,
        agents: agentsParsed,
        tools: toolsParsed,
      },
      expected_traits: extractTraits(soulParsed),
      expected_tone: extractTone(soulParsed),
      expected_style: extractStyle(agentsParsed),
      metadata: {
        conversation_id: userMsg.conversation_id,
        message_pair_id: `${userMsg.id}_${assistantMsg.id}`,
        user_id_hash: hashUserId(userMsg.user_id),
        extracted_at: now,
      },
    });

    // Stop once we have enough pairs
    if (items.length >= limit) break;
  }

  // Enforce minimum dataset size for statistical significance
  if (items.length < MIN_VALID_PAIRS) {
    throw new Error(
      `Insufficient valid message pairs for evaluation dataset. ` +
      `Found ${items.length} valid pairs, minimum required is ${MIN_VALID_PAIRS}. ` +
      `Ensure there are enough user/assistant message pairs in chat_messages.`
    );
  }

  // Create Opik dataset with date-stamped name
  const today = new Date().toISOString().split('T')[0];
  const datasetName = `chat-eval-${today}`;

  const dataset = await opik.getOrCreateDataset<ChatEvalItem>(
    datasetName,
    'Anonymized chat message pairs with soulprint context for prompt evaluation'
  );

  await dataset.insert(items);

  return {
    datasetName,
    itemCount: items.length,
  };
}
