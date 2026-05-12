-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Workout templates (Push Day, Pull Day, Legs Day)
CREATE TABLE workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  color TEXT DEFAULT '#f97316',
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercise library
CREATE TABLE exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  muscle_group TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Exercises assigned to a template
CREATE TABLE template_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES workout_templates(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  UNIQUE(template_id, exercise_id)
);

-- Actual workout sessions (each time you hit the gym)
CREATE TABLE workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID REFERENCES workout_templates(id),
  name TEXT NOT NULL,
  started_at TIMESTAMPTZ DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  notes TEXT
);

-- Individual sets logged within a session
CREATE TABLE workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id),
  set_number INTEGER NOT NULL,
  reps INTEGER,
  weight DECIMAL(6, 2),
  completed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Personal bests: one row per exercise, upserted when a new PR is hit
CREATE TABLE personal_bests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE UNIQUE,
  weight DECIMAL(6, 2),
  reps INTEGER,
  achieved_at TIMESTAMPTZ DEFAULT NOW(),
  session_id UUID REFERENCES workout_sessions(id)
);

-- Indexes
CREATE INDEX idx_workout_sets_session ON workout_sets(session_id);
CREATE INDEX idx_workout_sets_exercise ON workout_sets(exercise_id);
CREATE INDEX idx_workout_sessions_template ON workout_sessions(template_id);
CREATE INDEX idx_workout_sessions_started ON workout_sessions(started_at DESC);
CREATE INDEX idx_personal_bests_exercise ON personal_bests(exercise_id);

-- Row Level Security (open policies for single-user app — add auth later if needed)
ALTER TABLE workout_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE template_exercises ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE workout_sets ENABLE ROW LEVEL SECURITY;
ALTER TABLE personal_bests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON workout_templates FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON exercises FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON template_exercises FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON workout_sessions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON workout_sets FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON personal_bests FOR ALL USING (true) WITH CHECK (true);
