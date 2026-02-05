-- SoulPrint Database Schema
-- Run this in Supabase SQL Editor

-- ============================================
-- 1. EXTEND USER_PROFILES
-- ============================================

ALTER TABLE user_profiles 
ADD COLUMN IF NOT EXISTS soulprint_id TEXT UNIQUE,
ADD COLUMN IF NOT EXISTS soulprint_status TEXT DEFAULT 'incomplete',
ADD COLUMN IF NOT EXISTS pillars_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS pillars_completed_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS voice_completed BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS voice_recordings_count INT DEFAULT 0,
ADD COLUMN IF NOT EXISTS voice_completed_at TIMESTAMPTZ;

-- ============================================
-- 2. PILLAR ANSWERS (Raw responses)
-- ============================================

CREATE TABLE IF NOT EXISTS pillar_answers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  question_index INT NOT NULL CHECK (question_index >= 0 AND question_index < 36),
  pillar INT NOT NULL CHECK (pillar >= 1 AND pillar <= 6),
  question_type TEXT NOT NULL CHECK (question_type IN ('slider', 'text')),
  slider_value INT CHECK (slider_value IS NULL OR (slider_value >= 0 AND slider_value <= 100)),
  text_value TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- Ensure either slider or text is filled based on type
  CONSTRAINT valid_answer CHECK (
    (question_type = 'slider' AND slider_value IS NOT NULL) OR
    (question_type = 'text' AND text_value IS NOT NULL AND text_value != '')
  ),
  
  -- One answer per question per user
  UNIQUE(user_id, question_index)
);

-- Index for fast user lookups
CREATE INDEX IF NOT EXISTS idx_pillar_answers_user ON pillar_answers(user_id);
CREATE INDEX IF NOT EXISTS idx_pillar_answers_pillar ON pillar_answers(user_id, pillar);

-- ============================================
-- 3. PILLAR SUMMARIES (LLM-generated)
-- ============================================

CREATE TABLE IF NOT EXISTS pillar_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Individual pillar summaries
  communication_summary TEXT,
  emotional_summary TEXT,
  decision_summary TEXT,
  social_summary TEXT,
  cognitive_summary TEXT,
  conflict_summary TEXT,
  
  -- Core alignment scores
  expression_vs_restraint FLOAT CHECK (expression_vs_restraint IS NULL OR (expression_vs_restraint >= 0 AND expression_vs_restraint <= 1)),
  instinct_vs_analysis FLOAT CHECK (instinct_vs_analysis IS NULL OR (instinct_vs_analysis >= 0 AND instinct_vs_analysis <= 1)),
  autonomy_vs_collaboration FLOAT CHECK (autonomy_vs_collaboration IS NULL OR (autonomy_vs_collaboration >= 0 AND autonomy_vs_collaboration <= 1)),
  
  -- Full JSON for extensibility
  raw_analysis JSONB,
  
  -- Metadata
  model_used TEXT,
  generation_version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 4. MICRO STORIES (Generated from pillars)
-- ============================================

CREATE TABLE IF NOT EXISTS micro_stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pillar INT NOT NULL CHECK (pillar >= 1 AND pillar <= 6),
  pillar_name TEXT NOT NULL,
  story_text TEXT NOT NULL,
  word_count INT,
  
  -- Generation metadata
  model_used TEXT,
  generation_version INT DEFAULT 1,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One story per pillar per user
  UNIQUE(user_id, pillar)
);

CREATE INDEX IF NOT EXISTS idx_micro_stories_user ON micro_stories(user_id);

-- ============================================
-- 5. VOICE RECORDINGS
-- ============================================

CREATE TABLE IF NOT EXISTS voice_recordings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  pillar INT NOT NULL CHECK (pillar >= 1 AND pillar <= 6),
  
  -- Storage
  cloudinary_url TEXT NOT NULL,
  cloudinary_public_id TEXT,
  
  -- Audio metadata
  duration_seconds FLOAT NOT NULL,
  file_size_bytes INT,
  mime_type TEXT DEFAULT 'audio/webm',
  
  -- Transcription
  transcription TEXT,
  transcription_confidence FLOAT,
  
  -- Cadence analysis
  cadence_markers JSONB,
  /*
  cadence_markers structure:
  {
    "pausePoints": [3.2, 7.8, 15.1],
    "emphasisWords": ["lights", "feel", "connection"],
    "tempoVariance": 0.23,
    "averageWordsPerMinute": 142,
    "emotionalPeaks": [5.1, 12.3],
    "toneShifts": [{"time": 8.2, "from": "neutral", "to": "warm"}]
  }
  */
  
  -- Processing status
  status TEXT DEFAULT 'uploaded' CHECK (status IN ('uploaded', 'transcribing', 'analyzing', 'complete', 'error')),
  error_message TEXT,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  
  -- One recording per pillar per user
  UNIQUE(user_id, pillar)
);

CREATE INDEX IF NOT EXISTS idx_voice_recordings_user ON voice_recordings(user_id);
CREATE INDEX IF NOT EXISTS idx_voice_recordings_status ON voice_recordings(status);

-- ============================================
-- 6. EMOTIONAL SIGNATURES (Derived from voice)
-- ============================================

CREATE TABLE IF NOT EXISTS emotional_signatures (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Core curve metrics (0-1 scale)
  reactivity_vs_reflection FLOAT CHECK (reactivity_vs_reflection >= 0 AND reactivity_vs_reflection <= 1),
  tension_vs_release FLOAT CHECK (tension_vs_release >= 0 AND tension_vs_release <= 1),
  lateral_jumps FLOAT CHECK (lateral_jumps >= 0 AND lateral_jumps <= 1),
  gut_punches_vs_rational FLOAT CHECK (gut_punches_vs_rational >= 0 AND gut_punches_vs_rational <= 1),
  
  -- Extended metrics
  average_pause_duration FLOAT,
  emphasis_frequency FLOAT,
  tempo_consistency FLOAT,
  emotional_range FLOAT,
  
  -- Full analysis data
  raw_analysis JSONB,
  
  -- Processing metadata
  recordings_analyzed INT DEFAULT 0,
  model_used TEXT,
  analysis_version INT DEFAULT 1,
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================
-- 7. SOULPRINTS (Final composite)
-- ============================================

CREATE TABLE IF NOT EXISTS soulprints (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  
  -- Identity
  soulprint_id TEXT UNIQUE NOT NULL,  -- SP_USER_001 format
  display_name TEXT,
  
  -- Status
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'regenerating')),
  
  -- Core data
  system_prompt TEXT NOT NULL,
  memory_key TEXT,  -- Mem0 reference key
  
  -- Cached summaries (denormalized for fast access)
  pillar_summaries JSONB NOT NULL,
  emotional_curve JSONB NOT NULL,
  
  -- Stats
  total_memories INT DEFAULT 0,
  total_conversations INT DEFAULT 0,
  last_chat_at TIMESTAMPTZ,
  
  -- Versioning
  version INT DEFAULT 1,
  previous_version_id UUID REFERENCES soulprints(id),
  
  -- Timestamps
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_soulprints_soulprint_id ON soulprints(soulprint_id);
CREATE INDEX IF NOT EXISTS idx_soulprints_status ON soulprints(status);

-- ============================================
-- 8. CHAT SESSIONS (For analytics)
-- ============================================

CREATE TABLE IF NOT EXISTS chat_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  soulprint_id TEXT REFERENCES soulprints(soulprint_id),
  
  -- Session data
  started_at TIMESTAMPTZ DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  message_count INT DEFAULT 0,
  
  -- Model info
  model_used TEXT,
  
  -- Metadata
  device_type TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_chat_sessions_user ON chat_sessions(user_id);
CREATE INDEX IF NOT EXISTS idx_chat_sessions_soulprint ON chat_sessions(soulprint_id);

-- ============================================
-- 9. ROW LEVEL SECURITY
-- ============================================

-- Enable RLS on all tables
ALTER TABLE pillar_answers ENABLE ROW LEVEL SECURITY;
ALTER TABLE pillar_summaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE micro_stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE voice_recordings ENABLE ROW LEVEL SECURITY;
ALTER TABLE emotional_signatures ENABLE ROW LEVEL SECURITY;
ALTER TABLE soulprints ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_sessions ENABLE ROW LEVEL SECURITY;

-- Users can only access their own data
CREATE POLICY "Users can view own pillar_answers" ON pillar_answers FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pillar_answers" ON pillar_answers FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pillar_answers" ON pillar_answers FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own pillar_summaries" ON pillar_summaries FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own pillar_summaries" ON pillar_summaries FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own pillar_summaries" ON pillar_summaries FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own micro_stories" ON micro_stories FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own micro_stories" ON micro_stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own micro_stories" ON micro_stories FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own voice_recordings" ON voice_recordings FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own voice_recordings" ON voice_recordings FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own voice_recordings" ON voice_recordings FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own emotional_signatures" ON emotional_signatures FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own emotional_signatures" ON emotional_signatures FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own emotional_signatures" ON emotional_signatures FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own soulprints" ON soulprints FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own soulprints" ON soulprints FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own soulprints" ON soulprints FOR UPDATE USING (auth.uid() = user_id);

CREATE POLICY "Users can view own chat_sessions" ON chat_sessions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own chat_sessions" ON chat_sessions FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update own chat_sessions" ON chat_sessions FOR UPDATE USING (auth.uid() = user_id);

-- ============================================
-- 10. FUNCTIONS & TRIGGERS
-- ============================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply to all tables
CREATE TRIGGER pillar_answers_updated_at BEFORE UPDATE ON pillar_answers FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER pillar_summaries_updated_at BEFORE UPDATE ON pillar_summaries FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER micro_stories_updated_at BEFORE UPDATE ON micro_stories FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER voice_recordings_updated_at BEFORE UPDATE ON voice_recordings FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER emotional_signatures_updated_at BEFORE UPDATE ON emotional_signatures FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER soulprints_updated_at BEFORE UPDATE ON soulprints FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Generate SoulPrint ID
CREATE OR REPLACE FUNCTION generate_soulprint_id()
RETURNS TRIGGER AS $$
BEGIN
  IF NEW.soulprint_id IS NULL THEN
    NEW.soulprint_id = 'SP_' || UPPER(SUBSTRING(MD5(NEW.user_id::TEXT || NOW()::TEXT) FROM 1 FOR 8));
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER soulprints_generate_id BEFORE INSERT ON soulprints FOR EACH ROW EXECUTE FUNCTION generate_soulprint_id();
