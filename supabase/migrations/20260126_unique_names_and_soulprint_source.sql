-- =====================================================
-- Migration: Unique Companion Names + SoulPrint Source Tracking
-- Date: 2026-01-26
-- Purpose:
--   1. Track SoulPrint generation source (questionnaire vs import)
--   2. Enforce globally unique companion names
-- =====================================================

-- 1. Add source tracking columns to soulprints table
ALTER TABLE public.soulprints
ADD COLUMN IF NOT EXISTS generation_source TEXT DEFAULT 'questionnaire'
  CHECK (generation_source IN ('questionnaire', 'chatgpt_import', 'claude_import', 'mixed'));

ALTER TABLE public.soulprints
ADD COLUMN IF NOT EXISTS confidence_score DECIMAL(3,2);

ALTER TABLE public.soulprints
ADD COLUMN IF NOT EXISTS source_message_count INT;

-- 2. Create globally unique companion names table
-- Every SoulPrint companion has a unique one-word name
CREATE TABLE IF NOT EXISTS public.used_companion_names (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  name TEXT NOT NULL,                                    -- Lowercase for uniqueness
  display_name TEXT NOT NULL,                            -- Original casing for display
  user_id UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  soulprint_id UUID REFERENCES public.soulprints(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT now(),

  -- Ensure lowercase uniqueness
  CONSTRAINT unique_name_lower UNIQUE (name)
);

-- Index for fast availability checks
CREATE INDEX IF NOT EXISTS idx_used_names_lookup
ON public.used_companion_names(name);

-- Index for user lookups
CREATE INDEX IF NOT EXISTS idx_used_names_user
ON public.used_companion_names(user_id);

-- 3. RLS Policies for used_companion_names
ALTER TABLE public.used_companion_names ENABLE ROW LEVEL SECURITY;

-- Anyone can check if a name is taken (for suggestions)
CREATE POLICY "Names are publicly readable"
ON public.used_companion_names FOR SELECT
TO authenticated
USING (true);

-- Only the system can insert names (via service role)
-- Users don't insert directly - the API reserves names
CREATE POLICY "Service role can insert names"
ON public.used_companion_names FOR INSERT
TO service_role
WITH CHECK (true);

-- Users can only delete their own names (if they delete their SoulPrint)
CREATE POLICY "Users can delete their own names"
ON public.used_companion_names FOR DELETE
TO authenticated
USING (auth.uid() = user_id);

-- 4. Function to check name availability
CREATE OR REPLACE FUNCTION public.is_name_available(check_name TEXT)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  RETURN NOT EXISTS (
    SELECT 1 FROM public.used_companion_names
    WHERE name = LOWER(check_name)
  );
END;
$$;

-- 5. Function to reserve a name (atomic operation)
CREATE OR REPLACE FUNCTION public.reserve_companion_name(
  p_name TEXT,
  p_display_name TEXT,
  p_user_id UUID,
  p_soulprint_id UUID
)
RETURNS BOOLEAN
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Try to insert, will fail if name exists
  INSERT INTO public.used_companion_names (name, display_name, user_id, soulprint_id)
  VALUES (LOWER(p_name), p_display_name, p_user_id, p_soulprint_id);

  RETURN TRUE;
EXCEPTION
  WHEN unique_violation THEN
    RETURN FALSE;
END;
$$;

-- 6. Function to release a name (when SoulPrint is deleted)
CREATE OR REPLACE FUNCTION public.release_companion_name(p_soulprint_id UUID)
RETURNS VOID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM public.used_companion_names
  WHERE soulprint_id = p_soulprint_id;
END;
$$;

-- 7. Trigger to auto-release name when SoulPrint is deleted
CREATE OR REPLACE FUNCTION public.handle_soulprint_deletion()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  -- Release the companion name when SoulPrint is deleted
  DELETE FROM public.used_companion_names
  WHERE soulprint_id = OLD.id;

  RETURN OLD;
END;
$$;

-- Drop existing trigger if exists, then create
DROP TRIGGER IF EXISTS on_soulprint_delete ON public.soulprints;

CREATE TRIGGER on_soulprint_delete
BEFORE DELETE ON public.soulprints
FOR EACH ROW
EXECUTE FUNCTION public.handle_soulprint_deletion();

-- 8. Grant execute permissions
GRANT EXECUTE ON FUNCTION public.is_name_available(TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.reserve_companion_name(TEXT, TEXT, UUID, UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.release_companion_name(UUID) TO authenticated;
