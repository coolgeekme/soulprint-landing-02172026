-- Phase 4: Quality Scoring - Add quality breakdown storage
-- Stores per-section quality scores (completeness, coherence, specificity) as JSONB
--
-- Example structure:
-- {
--   "soul": { "completeness": 85, "coherence": 92, "specificity": 78 },
--   "identity": { "completeness": 90, "coherence": 88, "specificity": 82 },
--   "user": { "completeness": 75, "coherence": 80, "specificity": 70 },
--   "agents": { "completeness": 88, "coherence": 85, "specificity": 80 },
--   "tools": { "completeness": 82, "coherence": 90, "specificity": 75 }
-- }

ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS quality_breakdown JSONB;

COMMENT ON COLUMN public.user_profiles.quality_breakdown IS
  'Quality scores (0-100) per soulprint section: { soul: { completeness, coherence, specificity }, identity: {...}, ... }';

-- GIN index for efficient JSONB querying (threshold checks, section lookups)
CREATE INDEX IF NOT EXISTS idx_user_profiles_quality_breakdown
  ON public.user_profiles USING GIN (quality_breakdown);

-- Timestamp for when scores were last calculated
ALTER TABLE public.user_profiles ADD COLUMN IF NOT EXISTS quality_scored_at TIMESTAMPTZ;

-- Function to find profiles with any quality metric below threshold
-- Usage: SELECT * FROM find_low_quality_profiles(60);
CREATE OR REPLACE FUNCTION find_low_quality_profiles(threshold_score INT DEFAULT 60)
RETURNS TABLE(user_id UUID) AS $$
BEGIN
  RETURN QUERY
  SELECT up.user_id
  FROM user_profiles up
  WHERE up.quality_breakdown IS NOT NULL
    AND EXISTS (
      SELECT 1
      FROM jsonb_each(up.quality_breakdown) AS section(key, value)
      CROSS JOIN jsonb_each(section.value) AS metric(metric_key, metric_value)
      WHERE (metric_value::text)::int < threshold_score
    );
END;
$$ LANGUAGE plpgsql;

COMMENT ON FUNCTION find_low_quality_profiles IS
  'Returns user_ids with any quality metric (completeness, coherence, specificity) below the threshold score';
