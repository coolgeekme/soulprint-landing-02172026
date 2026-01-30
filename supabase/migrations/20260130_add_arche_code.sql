-- Add !ARCHE! referral code
INSERT INTO public.team_referral_codes (code, team_member_name) VALUES
  ('!ARCHE!', 'ArcheForge')
ON CONFLICT (code) DO UPDATE SET team_member_name = EXCLUDED.team_member_name;
