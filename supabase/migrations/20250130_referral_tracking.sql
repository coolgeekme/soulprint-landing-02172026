-- Referral tracking migration
-- Adds referral tracking to user_profiles and creates admin views

-- Add referred_by column to user_profiles
ALTER TABLE public.user_profiles 
ADD COLUMN IF NOT EXISTS referred_by TEXT,
ADD COLUMN IF NOT EXISTS referred_by_name TEXT;

-- Create index for referral lookups
CREATE INDEX IF NOT EXISTS idx_user_profiles_referred_by 
ON public.user_profiles(referred_by) WHERE referred_by IS NOT NULL;

-- Team referral codes lookup table
CREATE TABLE IF NOT EXISTS public.team_referral_codes (
  code TEXT PRIMARY KEY,
  team_member_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Insert team codes
INSERT INTO public.team_referral_codes (code, team_member_name) VALUES
  ('NINETEEN19', 'Layla Ghafarri'),
  ('ACE1', 'Ben Woodard'),
  ('ACE!1', 'Ben Woodard'),
  ('FLOYD', 'Adrian Floyd'),
  ('WHITEBOYNICK', 'Nicholas Hill'),
  ('BLANCHE', 'Lisa Quible'),
  ('DREW2026', 'Drew'),
  ('GLENN2026', 'Glenn'),
  ('RONNIE2026', 'Ronnie')
ON CONFLICT (code) DO UPDATE SET team_member_name = EXCLUDED.team_member_name;

-- RPC function to record a referral (called during signup)
CREATE OR REPLACE FUNCTION public.record_referral(
  p_referral_code TEXT,
  p_user_id UUID,
  p_user_email TEXT
)
RETURNS JSON
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team_member TEXT;
BEGIN
  -- Look up the team member for this code
  SELECT team_member_name INTO v_team_member
  FROM team_referral_codes
  WHERE code = UPPER(p_referral_code);

  IF v_team_member IS NULL THEN
    RETURN json_build_object('success', false, 'error', 'Invalid referral code');
  END IF;

  -- Update the user's profile with referral info
  UPDATE user_profiles
  SET 
    referred_by = UPPER(p_referral_code),
    referred_by_name = v_team_member,
    updated_at = NOW()
  WHERE user_id = p_user_id;

  RETURN json_build_object(
    'success', true, 
    'code', UPPER(p_referral_code),
    'team_member', v_team_member
  );
END;
$$;

-- Grant execute to authenticated users and service role
GRANT EXECUTE ON FUNCTION public.record_referral TO authenticated;
GRANT EXECUTE ON FUNCTION public.record_referral TO service_role;

-- Admin function to get referral stats (requires service role)
CREATE OR REPLACE FUNCTION public.get_referral_stats()
RETURNS TABLE (
  referral_code TEXT,
  team_member_name TEXT,
  total_signups BIGINT,
  total_messages BIGINT,
  unique_active_days BIGINT,
  last_active TIMESTAMPTZ,
  signups JSON
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  WITH user_activity AS (
    SELECT 
      up.user_id,
      up.referred_by,
      up.referred_by_name,
      up.created_at as signup_date,
      COUNT(DISTINCT cm.id) as message_count,
      COUNT(DISTINCT DATE(cm.created_at)) as active_days,
      MAX(cm.created_at) as last_message
    FROM user_profiles up
    LEFT JOIN chat_messages cm ON cm.user_id = up.user_id AND cm.role = 'user'
    WHERE up.referred_by IS NOT NULL
    GROUP BY up.user_id, up.referred_by, up.referred_by_name, up.created_at
  ),
  code_stats AS (
    SELECT 
      trc.code,
      trc.team_member_name,
      COALESCE(COUNT(ua.user_id), 0) as signups,
      COALESCE(SUM(ua.message_count), 0) as messages,
      COALESCE(SUM(ua.active_days), 0) as days_active,
      MAX(ua.last_message) as last_active,
      COALESCE(
        json_agg(
          json_build_object(
            'user_id', ua.user_id,
            'signup_date', ua.signup_date,
            'messages', ua.message_count,
            'active_days', ua.active_days,
            'last_active', ua.last_message
          )
        ) FILTER (WHERE ua.user_id IS NOT NULL),
        '[]'::json
      ) as user_signups
    FROM team_referral_codes trc
    LEFT JOIN user_activity ua ON ua.referred_by = trc.code
    GROUP BY trc.code, trc.team_member_name
  )
  SELECT 
    cs.code as referral_code,
    cs.team_member_name,
    cs.signups as total_signups,
    cs.messages as total_messages,
    cs.days_active as unique_active_days,
    cs.last_active,
    cs.user_signups as signups
  FROM code_stats cs
  ORDER BY cs.signups DESC, cs.messages DESC;
END;
$$;

-- Only service role can call admin stats
GRANT EXECUTE ON FUNCTION public.get_referral_stats TO service_role;
