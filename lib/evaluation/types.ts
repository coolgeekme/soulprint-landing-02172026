/**
 * Evaluation Infrastructure Types
 *
 * Shared types for the evaluation system: datasets, judges, and experiments.
 * These types define the shape of evaluation data items extracted from
 * production chat_messages and enriched with soulprint context.
 */

/**
 * A single evaluation item representing a user/assistant message pair
 * with associated soulprint context and expected behavior metadata.
 *
 * Used as the dataset item type for Opik evaluation datasets.
 * All user IDs are SHA256-anonymized -- no raw PII in dataset items.
 */
export interface ChatEvalItem {
  /** Index signature for Opik DatasetItemData compatibility */
  [key: string]: unknown;

  /** The user's input message */
  user_message: string;

  /** The assistant's response to the user message */
  assistant_response: string;

  /** Soulprint context that was available when the response was generated */
  soulprint_context: {
    soul: Record<string, unknown> | null;
    identity: Record<string, unknown> | null;
    user: Record<string, unknown> | null;
    agents: Record<string, unknown> | null;
    tools: Record<string, unknown> | null;
  };

  /** Expected personality traits from soul.personality_traits */
  expected_traits: string[];

  /** Expected tone from soul.tone_preferences */
  expected_tone: string;

  /** Expected response style from agents.response_style */
  expected_style: string;

  /** Anonymized metadata for traceability without PII */
  metadata: {
    /** Conversation ID for grouping related message pairs */
    conversation_id: string;
    /** Unique identifier for this user/assistant message pair */
    message_pair_id: string;
    /** SHA256 hash of the user ID -- no raw user IDs in evaluation data */
    user_id_hash: string;
    /** ISO date when this item was extracted */
    extracted_at: string;
  };
}

/**
 * Result returned by createEvaluationDataset
 */
export interface DatasetCreationResult {
  /** Name of the created Opik dataset (includes date) */
  datasetName: string;
  /** Number of valid message pairs inserted */
  itemCount: number;
}
