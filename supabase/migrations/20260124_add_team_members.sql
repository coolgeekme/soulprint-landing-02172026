-- Add additional team members for referral system
-- Short unique codes (not guessable by name)
INSERT INTO public.team_members (name, referral_code) VALUES
    ('Adrian', 'AX7K'),
    ('Ben', 'BZ4M'),
    ('Drew', 'DQ9P'),
    ('David', 'DV3R'),
    ('Ronnie', 'RN8T'),
    ('Lisa', 'LS2W'),
    ('Layla', 'LY6J'),
    ('Reggie', 'RG5H'),
    ('Glen', 'GL4N'),
    ('Nick', 'NK7C')
ON CONFLICT (referral_code) DO NOTHING;
