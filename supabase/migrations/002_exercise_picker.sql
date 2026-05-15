-- Migration 002: exercise picker, custom exercises, session_exercises
-- Run in Supabase SQL Editor

-- 1. New columns on exercises
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS weight_increment DECIMAL(4,2) DEFAULT 2.5;
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);
ALTER TABLE exercises ADD COLUMN IF NOT EXISTS category TEXT;

-- 2. Seed weight_increment for existing exercises
UPDATE exercises SET weight_increment = 5   WHERE name IN ('Bench Press','Deadlift','Barbell Row','Lat Pulldown','Seated Cable Row','Squat','Leg Press','Romanian Deadlift','Hip Thrust','Calf Raise');
UPDATE exercises SET weight_increment = 2.5 WHERE name IN ('Overhead Press','Incline Dumbbell Press','Cable Fly','Tricep Pushdown','Overhead Tricep Extension','Pull-ups','Face Pull','Barbell Curl','Leg Curl','Leg Extension','Bulgarian Split Squat');
UPDATE exercises SET weight_increment = 1   WHERE name IN ('Lateral Raise','Front Raise','Hammer Curl');

-- 3. Seed category from template membership
UPDATE exercises e SET category = wt.name
FROM template_exercises te
JOIN workout_templates wt ON wt.id = te.template_id
WHERE te.exercise_id = e.id;

-- 4. session_exercises: which exercises a user picked for a given session
CREATE TABLE IF NOT EXISTS session_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID REFERENCES workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES exercises(id) ON DELETE CASCADE,
  order_index INTEGER DEFAULT 0,
  user_id UUID REFERENCES auth.users(id) DEFAULT auth.uid(),
  UNIQUE(session_id, exercise_id)
);
ALTER TABLE session_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users own session exercises" ON session_exercises
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Update exercises RLS: all can read; users manage only their own
DROP POLICY IF EXISTS "Allow all" ON exercises;
CREATE POLICY "Read all exercises"   ON exercises FOR SELECT USING (true);
CREATE POLICY "Insert own exercises" ON exercises FOR INSERT WITH CHECK (auth.uid() = created_by);
CREATE POLICY "Update own exercises" ON exercises FOR UPDATE USING (auth.uid() = created_by);
CREATE POLICY "Delete own exercises" ON exercises FOR DELETE USING (auth.uid() = created_by);
