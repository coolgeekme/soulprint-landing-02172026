-- Progress tracking for RLM import pipeline
-- Migration: 20260209_progress_tracking
-- Purpose: Add real-time progress tracking columns for ChatGPT import processing

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS progress_percent INTEGER DEFAULT 0;

ALTER TABLE user_profiles
ADD COLUMN IF NOT EXISTS import_stage TEXT;

COMMENT ON COLUMN user_profiles.progress_percent IS 'Import progress 0-100 for UI display';
COMMENT ON COLUMN user_profiles.import_stage IS 'Current stage: "Downloading export", "Parsing conversations", "Generating soulprint", etc.';
