-- Migration 003: body weight log
-- Run in Supabase SQL Editor

CREATE TABLE IF NOT EXISTS body_weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE DEFAULT auth.uid(),
  weight DECIMAL(5,2) NOT NULL,
  logged_at DATE NOT NULL DEFAULT CURRENT_DATE,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, logged_at)
);

ALTER TABLE body_weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own body weight" ON body_weight_logs
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE INDEX IF NOT EXISTS idx_body_weight_user_date ON body_weight_logs(user_id, logged_at DESC);
