-- ============================================================
-- PPL Workout Templates
-- ============================================================
INSERT INTO workout_templates (id, name, description, color) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'Push Day',  'Chest, Shoulders, Triceps', '#f97316'),
  ('b2c3d4e5-f6a7-8901-bcde-f01234567891', 'Pull Day',  'Back, Biceps, Rear Delts',  '#3b82f6'),
  ('c3d4e5f6-a7b8-9012-cdef-012345678912', 'Legs Day',  'Quads, Hamstrings, Glutes, Calves', '#10b981');

-- ============================================================
-- Push Day exercises
-- ============================================================
INSERT INTO exercises (id, name, muscle_group) VALUES
  ('d4e5f6a7-b8c9-0123-def0-123456789123', 'Bench Press',               'Chest'),
  ('e5f6a7b8-c9d0-1234-ef01-234567891234', 'Overhead Press',            'Shoulders'),
  ('f6a7b8c9-d0e1-2345-f012-345678912345', 'Incline Dumbbell Press',    'Chest'),
  ('a7b8c9d0-e1f2-3456-0123-456789123456', 'Cable Fly',                 'Chest'),
  ('b8c9d0e1-f2a3-4567-1234-567891234567', 'Tricep Pushdown',           'Triceps'),
  ('c9d0e1f2-a3b4-5678-2345-678912345678', 'Overhead Tricep Extension', 'Triceps'),
  ('d0e1f2a3-b4c5-6789-3456-789123456789', 'Lateral Raise',             'Shoulders'),
  ('e1f2a3b4-c5d6-7890-4567-891234567890', 'Front Raise',               'Shoulders');

-- ============================================================
-- Pull Day exercises
-- ============================================================
INSERT INTO exercises (id, name, muscle_group) VALUES
  ('f2a3b4c5-d6e7-8901-5678-912345678901', 'Deadlift',         'Back'),
  ('a3b4c5d6-e7f8-9012-6789-123456789012', 'Barbell Row',      'Back'),
  ('b4c5d6e7-f8a9-0123-7890-234567890123', 'Pull-ups',         'Back'),
  ('c5d6e7f8-a9b0-1234-8901-345678901234', 'Lat Pulldown',     'Back'),
  ('d6e7f8a9-b0c1-2345-9012-456789012345', 'Seated Cable Row', 'Back'),
  ('e7f8a9b0-c1d2-3456-0123-567890123456', 'Face Pull',        'Rear Delts'),
  ('f8a9b0c1-d2e3-4567-1234-678901234567', 'Barbell Curl',     'Biceps'),
  ('a9b0c1d2-e3f4-5678-2345-789012345678', 'Hammer Curl',      'Biceps');

-- ============================================================
-- Legs Day exercises
-- ============================================================
INSERT INTO exercises (id, name, muscle_group) VALUES
  ('b0c1d2e3-f4a5-6789-3456-890123456789', 'Squat',                 'Quads'),
  ('c1d2e3f4-a5b6-7890-4567-901234567890', 'Leg Press',             'Quads'),
  ('d2e3f4a5-b6c7-8901-5678-012345678901', 'Romanian Deadlift',     'Hamstrings'),
  ('e3f4a5b6-c7d8-9012-6789-123456789012', 'Leg Curl',              'Hamstrings'),
  ('f4a5b6c7-d8e9-0123-7890-234567890123', 'Leg Extension',         'Quads'),
  ('a5b6c7d8-e9f0-1234-8901-345678901234', 'Hip Thrust',            'Glutes'),
  ('b6c7d8e9-f0a1-2345-9012-456789012345', 'Calf Raise',            'Calves'),
  ('c7d8e9f0-a1b2-3456-0123-567890123456', 'Bulgarian Split Squat', 'Quads');

-- ============================================================
-- Template <-> Exercise mappings
-- ============================================================

-- Push Day
INSERT INTO template_exercises (template_id, exercise_id, order_index) VALUES
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'd4e5f6a7-b8c9-0123-def0-123456789123', 1), -- Bench Press
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'e5f6a7b8-c9d0-1234-ef01-234567891234', 2), -- Overhead Press
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'f6a7b8c9-d0e1-2345-f012-345678912345', 3), -- Incline DB Press
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'a7b8c9d0-e1f2-3456-0123-456789123456', 4), -- Cable Fly
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'b8c9d0e1-f2a3-4567-1234-567891234567', 5), -- Tricep Pushdown
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'c9d0e1f2-a3b4-5678-2345-678912345678', 6), -- OH Tricep Ext
  ('a1b2c3d4-e5f6-7890-abcd-ef1234567890', 'd0e1f2a3-b4c5-6789-3456-789123456789', 7); -- Lateral Raise

-- Pull Day
INSERT INTO template_exercises (template_id, exercise_id, order_index) VALUES
  ('b2c3d4e5-f6a7-8901-bcde-f01234567891', 'f2a3b4c5-d6e7-8901-5678-912345678901', 1), -- Deadlift
  ('b2c3d4e5-f6a7-8901-bcde-f01234567891', 'a3b4c5d6-e7f8-9012-6789-123456789012', 2), -- Barbell Row
  ('b2c3d4e5-f6a7-8901-bcde-f01234567891', 'b4c5d6e7-f8a9-0123-7890-234567890123', 3), -- Pull-ups
  ('b2c3d4e5-f6a7-8901-bcde-f01234567891', 'c5d6e7f8-a9b0-1234-8901-345678901234', 4), -- Lat Pulldown
  ('b2c3d4e5-f6a7-8901-bcde-f01234567891', 'd6e7f8a9-b0c1-2345-9012-456789012345', 5), -- Seated Cable Row
  ('b2c3d4e5-f6a7-8901-bcde-f01234567891', 'e7f8a9b0-c1d2-3456-0123-567890123456', 6), -- Face Pull
  ('b2c3d4e5-f6a7-8901-bcde-f01234567891', 'f8a9b0c1-d2e3-4567-1234-678901234567', 7), -- Barbell Curl
  ('b2c3d4e5-f6a7-8901-bcde-f01234567891', 'a9b0c1d2-e3f4-5678-2345-789012345678', 8); -- Hammer Curl

-- Legs Day
INSERT INTO template_exercises (template_id, exercise_id, order_index) VALUES
  ('c3d4e5f6-a7b8-9012-cdef-012345678912', 'b0c1d2e3-f4a5-6789-3456-890123456789', 1), -- Squat
  ('c3d4e5f6-a7b8-9012-cdef-012345678912', 'c1d2e3f4-a5b6-7890-4567-901234567890', 2), -- Leg Press
  ('c3d4e5f6-a7b8-9012-cdef-012345678912', 'd2e3f4a5-b6c7-8901-5678-012345678901', 3), -- Romanian Deadlift
  ('c3d4e5f6-a7b8-9012-cdef-012345678912', 'e3f4a5b6-c7d8-9012-6789-123456789012', 4), -- Leg Curl
  ('c3d4e5f6-a7b8-9012-cdef-012345678912', 'f4a5b6c7-d8e9-0123-7890-234567890123', 5), -- Leg Extension
  ('c3d4e5f6-a7b8-9012-cdef-012345678912', 'a5b6c7d8-e9f0-1234-8901-345678901234', 6), -- Hip Thrust
  ('c3d4e5f6-a7b8-9012-cdef-012345678912', 'b6c7d8e9-f0a1-2345-9012-456789012345', 7), -- Calf Raise
  ('c3d4e5f6-a7b8-9012-cdef-012345678912', 'c7d8e9f0-a1b2-3456-0123-567890123456', 8); -- Bulgarian Split Squat
