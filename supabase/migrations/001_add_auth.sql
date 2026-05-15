-- Migration: add user_id to user-owned tables and tighten RLS
-- Run this in the Supabase SQL Editor

-- 1. Add user_id to workout_sessions
ALTER TABLE workout_sessions
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- 2. Add user_id to workout_sets
ALTER TABLE workout_sets
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

-- 3. personal_bests: drop old single-column unique, add user_id, add composite unique
ALTER TABLE personal_bests
  DROP CONSTRAINT IF EXISTS personal_bests_exercise_id_key;

ALTER TABLE personal_bests
  ADD COLUMN IF NOT EXISTS user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid();

ALTER TABLE personal_bests
  ADD CONSTRAINT IF NOT EXISTS personal_bests_exercise_user_key UNIQUE (exercise_id, user_id);

-- 4. Replace open RLS policies with per-user policies

-- workout_sessions
DROP POLICY IF EXISTS "Allow all" ON workout_sessions;
CREATE POLICY "Users own sessions" ON workout_sessions
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- workout_sets
DROP POLICY IF EXISTS "Allow all" ON workout_sets;
CREATE POLICY "Users own sets" ON workout_sets
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- personal_bests
DROP POLICY IF EXISTS "Allow all" ON personal_bests;
CREATE POLICY "Users own bests" ON personal_bests
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- workout_templates and exercises remain open (shared for all users)
-- template_exercises remains open (shared)
