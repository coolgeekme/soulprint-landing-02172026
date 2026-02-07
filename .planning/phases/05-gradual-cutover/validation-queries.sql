-- validation-queries.sql
-- Production validation queries for soulprint-landing v2 cutover
-- Run these in Supabase SQL Editor to monitor import success rates

-- =============================================================================
-- QUERY 1: Overall success rate (last 24 hours)
-- =============================================================================
-- When to run: After every stage change (10%, 50%, 100%) and hourly during first 24h
-- What to look for: success_rate_pct >= 95%, zero stuck imports
--
-- Interpretation:
-- - success_rate_pct < 95%: ROLLBACK immediately
-- - stuck_imports > 0: Investigate (could be normal for very long conversations)
-- - failed_imports > total * 0.05: Check error patterns (Query 4)

SELECT
  COUNT(*) as total_imports,
  COUNT(*) FILTER (WHERE full_pass_status = 'complete') as successful_imports,
  COUNT(*) FILTER (WHERE full_pass_status = 'failed') as failed_imports,
  COUNT(*) FILTER (
    WHERE full_pass_status = 'processing'
    AND full_pass_started_at < NOW() - INTERVAL '2 hours'
  ) as stuck_imports,
  ROUND(
    100.0 * COUNT(*) FILTER (WHERE full_pass_status = 'complete') / NULLIF(COUNT(*), 0),
    2
  ) as success_rate_pct
FROM user_profiles
WHERE full_pass_started_at >= NOW() - INTERVAL '24 hours'
  AND full_pass_started_at IS NOT NULL;


-- =============================================================================
-- QUERY 2: Detect stuck imports
-- =============================================================================
-- When to run: If Query 1 shows stuck_imports > 0
-- What to look for: Same user_id stuck repeatedly = RLM bug, single user = large export
--
-- Interpretation:
-- - Same user_id appearing multiple times: Likely a bug, investigate RLM logs
-- - Single stuck import > 30 minutes: Probably just a large export, monitor
-- - Multiple different users stuck: ROLLBACK immediately, critical issue

SELECT
  user_id,
  full_pass_status,
  full_pass_started_at,
  ROUND(EXTRACT(EPOCH FROM (NOW() - full_pass_started_at)) / 60, 1) as minutes_stuck,
  full_pass_error
FROM user_profiles
WHERE full_pass_status = 'processing'
  AND full_pass_started_at < NOW() - INTERVAL '2 hours'
ORDER BY full_pass_started_at ASC;


-- =============================================================================
-- QUERY 3: Performance duration histogram (last 24 hours)
-- =============================================================================
-- When to run: Daily during cutover stages
-- What to look for: Most imports < 10 minutes, very few > 30 minutes
--
-- Interpretation:
-- - >50% of imports in >30min bucket: RLM performance issue, investigate
-- - Increasing duration over time: Memory leak or resource exhaustion
-- - Sudden spike in slow imports: Render cold start or resource contention

SELECT
  CASE
    WHEN duration_minutes < 5 THEN '<5min'
    WHEN duration_minutes < 10 THEN '5-10min'
    WHEN duration_minutes < 20 THEN '10-20min'
    WHEN duration_minutes < 30 THEN '20-30min'
    ELSE '>30min'
  END as duration_bucket,
  COUNT(*) as import_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage
FROM (
  SELECT
    user_id,
    EXTRACT(EPOCH FROM (full_pass_completed_at - full_pass_started_at)) / 60 as duration_minutes
  FROM user_profiles
  WHERE full_pass_status = 'complete'
    AND full_pass_started_at >= NOW() - INTERVAL '24 hours'
    AND full_pass_completed_at IS NOT NULL
) durations
GROUP BY duration_bucket
ORDER BY
  CASE duration_bucket
    WHEN '<5min' THEN 1
    WHEN '5-10min' THEN 2
    WHEN '10-20min' THEN 3
    WHEN '20-30min' THEN 4
    WHEN '>30min' THEN 5
  END;


-- =============================================================================
-- QUERY 4: Error patterns (last 24 hours, top 10)
-- =============================================================================
-- When to run: When success_rate_pct < 95% or failed_imports > 5% of total
-- What to look for: Common error messages indicating systemic issues
--
-- Interpretation:
-- - "No API key configured": RLM environment issue, ROLLBACK
-- - "Rate limit": Anthropic quota issue, wait or ROLLBACK
-- - "Timeout": RLM performance issue, investigate before continuing
-- - User-specific errors (bad file format): Normal, don't count toward success rate

SELECT
  full_pass_error,
  COUNT(*) as error_count,
  ROUND(100.0 * COUNT(*) / SUM(COUNT(*)) OVER (), 1) as percentage_of_errors,
  ARRAY_AGG(DISTINCT user_id ORDER BY user_id) FILTER (WHERE full_pass_error IS NOT NULL) as affected_users
FROM user_profiles
WHERE full_pass_status = 'failed'
  AND full_pass_started_at >= NOW() - INTERVAL '24 hours'
GROUP BY full_pass_error
ORDER BY error_count DESC
LIMIT 10;


-- =============================================================================
-- QUERY 5: V1 vs V2 comparison (if routing is enabled)
-- =============================================================================
-- When to run: During 10% and 50% stages to compare v1 vs v2 performance
-- What to look for: v2 success rate >= v1 success rate
--
-- Note: Requires logging which endpoint version processed each user
-- This query assumes you add a "pipeline_version" column to user_profiles
-- If not implemented, use Render logs to manually track v1 vs v2 calls

-- SELECT
--   pipeline_version,
--   COUNT(*) as total,
--   COUNT(*) FILTER (WHERE full_pass_status = 'complete') as successful,
--   COUNT(*) FILTER (WHERE full_pass_status = 'failed') as failed,
--   ROUND(
--     100.0 * COUNT(*) FILTER (WHERE full_pass_status = 'complete') / NULLIF(COUNT(*), 0),
--     2
--   ) as success_rate_pct
-- FROM user_profiles
-- WHERE full_pass_started_at >= NOW() - INTERVAL '24 hours'
-- GROUP BY pipeline_version;


-- =============================================================================
-- QUERY 6: Recent imports timeline (last 6 hours)
-- =============================================================================
-- When to run: Immediately after stage change to verify traffic is routing
-- What to look for: Steady flow of imports, no sudden drops
--
-- Interpretation:
-- - Zero imports after stage change: Routing broken, investigate
-- - Sudden drop in import rate: User-facing issue, check frontend

SELECT
  DATE_TRUNC('hour', full_pass_started_at) as hour,
  COUNT(*) as imports_started,
  COUNT(*) FILTER (WHERE full_pass_status = 'complete') as completed,
  COUNT(*) FILTER (WHERE full_pass_status = 'failed') as failed,
  COUNT(*) FILTER (WHERE full_pass_status = 'processing') as in_progress
FROM user_profiles
WHERE full_pass_started_at >= NOW() - INTERVAL '6 hours'
GROUP BY DATE_TRUNC('hour', full_pass_started_at)
ORDER BY hour DESC;
