-- Migration: Add Gemini File Search stores table
-- Run with: supabase migration up (or manually in Supabase SQL editor)

-- Store the Gemini File Search Store ID per user
CREATE TABLE IF NOT EXISTS public.gemini_file_stores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL UNIQUE,
  store_name TEXT NOT NULL,           -- e.g., "fileSearchStores/abc123..."
  display_name TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

-- RLS Policies
ALTER TABLE public.gemini_file_stores ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own store"
  ON public.gemini_file_stores FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own store"
  ON public.gemini_file_stores FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own store"
  ON public.gemini_file_stores FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own store"
  ON public.gemini_file_stores FOR DELETE
  USING (auth.uid() = user_id);

-- Add updated_at trigger
CREATE TRIGGER set_updated_at_gemini_file_stores
  BEFORE UPDATE ON public.gemini_file_stores
  FOR EACH ROW EXECUTE FUNCTION public.handle_updated_at();
