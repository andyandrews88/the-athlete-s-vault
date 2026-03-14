
-- Seed 3 template programmes
INSERT INTO training_programmes (user_id, name, description, is_active, is_template)
VALUES 
  ('00000000-0000-0000-0000-000000000000', 'Foundation', '3 days/week · Full-body hybrid CrossFit + functional bodybuilding. Build your base with compound lifts, conditioning, and movement quality.', false, true),
  ('00000000-0000-0000-0000-000000000000', 'Performance', '4 days/week · Hybrid CF + functional bodybuilding with increased volume. Upper/lower structure with metcons and accessories.', false, true),
  ('00000000-0000-0000-0000-000000000000', 'Elite', '5 days/week · Advanced hybrid programming. Competition-style CrossFit WODs, heavy strength cycles, and targeted accessory work.', false, true);

-- Seed workouts for Foundation (3 days)
INSERT INTO programme_workouts (programme_id, day_number, name, prescribed_exercises)
SELECT tp.id, w.day_number, w.name, w.prescribed_exercises::jsonb
FROM training_programmes tp
CROSS JOIN (VALUES
  (1, 'Full Body A — Strength + Metcon', '[
    {"name": "Back Squat", "sets": 5, "reps": "5", "notes": "Build to heavy 5"},
    {"name": "Strict Press", "sets": 4, "reps": "6-8", "notes": "Controlled tempo"},
    {"name": "Barbell Row", "sets": 4, "reps": "8-10", "notes": "Squeeze at top"},
    {"name": "Assault Bike", "sets": 1, "reps": "10 min AMRAP", "notes": "15 cal bike + 10 wall balls + 5 burpees"}
  ]'),
  (2, 'Full Body B — Pull Focus + Engine', '[
    {"name": "Deadlift", "sets": 5, "reps": "3", "notes": "Heavy triples"},
    {"name": "Pull Up", "sets": 4, "reps": "6-10", "notes": "Strict or banded"},
    {"name": "Dumbbell Bench Press", "sets": 4, "reps": "8-10", "notes": "Full ROM"},
    {"name": "Rowing Machine", "sets": 1, "reps": "3x500m", "notes": "Rest 90s between intervals"}
  ]'),
  (3, 'Full Body C — Olympic + Conditioning', '[
    {"name": "Clean and Jerk", "sets": 5, "reps": "2", "notes": "Technique focus"},
    {"name": "Front Squat", "sets": 4, "reps": "5", "notes": "From rack"},
    {"name": "Toes to Bar", "sets": 3, "reps": "10-15", "notes": "Kipping or strict"},
    {"name": "Thrusters", "sets": 1, "reps": "21-15-9", "notes": "For time with burpees"}
  ]')
) AS w(day_number, name, prescribed_exercises)
WHERE tp.name = 'Foundation' AND tp.is_template = true;

-- Seed workouts for Performance (4 days)
INSERT INTO programme_workouts (programme_id, day_number, name, prescribed_exercises)
SELECT tp.id, w.day_number, w.name, w.prescribed_exercises::jsonb
FROM training_programmes tp
CROSS JOIN (VALUES
  (1, 'Upper Strength + Metcon', '[
    {"name": "Strict Press", "sets": 5, "reps": "5", "notes": "Progressive overload"},
    {"name": "Weighted Pull Up", "sets": 4, "reps": "5", "notes": "Add load weekly"},
    {"name": "Dumbbell Bench Press", "sets": 4, "reps": "8-10", "notes": "Superset with rows"},
    {"name": "Barbell Row", "sets": 4, "reps": "8-10", "notes": ""},
    {"name": "Wall Ball", "sets": 1, "reps": "12 min AMRAP", "notes": "30 wall balls + 20 cal row + 10 strict press"}
  ]'),
  (2, 'Lower Strength + Engine', '[
    {"name": "Back Squat", "sets": 5, "reps": "5", "notes": "Linear progression"},
    {"name": "Romanian Deadlift", "sets": 4, "reps": "8", "notes": "Slow eccentric"},
    {"name": "Bulgarian Split Squat", "sets": 3, "reps": "10/leg", "notes": "DB or KB load"},
    {"name": "Assault Bike", "sets": 1, "reps": "5x1 min on/1 min off", "notes": "Max effort intervals"}
  ]'),
  (3, 'Hybrid Push/Pull + WOD', '[
    {"name": "Bench Press", "sets": 5, "reps": "5", "notes": "Barbell"},
    {"name": "Pendlay Row", "sets": 4, "reps": "6", "notes": "Explosive pull"},
    {"name": "Clean and Jerk", "sets": 5, "reps": "2", "notes": "Build to heavy double"},
    {"name": "Burpee", "sets": 1, "reps": "For time: 50 burpees", "notes": "Sub 5 min target"}
  ]'),
  (4, 'Olympic + Accessories + Conditioning', '[
    {"name": "Snatch", "sets": 5, "reps": "2", "notes": "From hang or floor"},
    {"name": "Front Squat", "sets": 4, "reps": "3", "notes": "Heavy triples"},
    {"name": "Toes to Bar", "sets": 3, "reps": "12-15", "notes": ""},
    {"name": "Ski Erg", "sets": 1, "reps": "4x500m", "notes": "Rest 90s"}
  ]')
) AS w(day_number, name, prescribed_exercises)
WHERE tp.name = 'Performance' AND tp.is_template = true;

-- Seed workouts for Elite (5 days)
INSERT INTO programme_workouts (programme_id, day_number, name, prescribed_exercises)
SELECT tp.id, w.day_number, w.name, w.prescribed_exercises::jsonb
FROM training_programmes tp
CROSS JOIN (VALUES
  (1, 'Heavy Strength — Squat Focus', '[
    {"name": "Back Squat", "sets": 6, "reps": "3", "notes": "85%+ 1RM"},
    {"name": "Front Squat", "sets": 3, "reps": "5", "notes": "Back-off sets"},
    {"name": "Bulgarian Split Squat", "sets": 3, "reps": "8/leg", "notes": "Heavy DBs"},
    {"name": "Hanging Knee Raise", "sets": 3, "reps": "15", "notes": "Weighted if possible"}
  ]'),
  (2, 'Hybrid WOD + Gymnastics', '[
    {"name": "Clean and Jerk", "sets": 6, "reps": "1", "notes": "Build to heavy single"},
    {"name": "Pull Up", "sets": 5, "reps": "max strict", "notes": "Rest 2 min"},
    {"name": "Wall Ball", "sets": 1, "reps": "Karen: 150 wall balls for time", "notes": "9kg/6kg ball"},
    {"name": "Double Under", "sets": 3, "reps": "50 unbroken", "notes": "Skill practice"}
  ]'),
  (3, 'Upper Strength + Accessories', '[
    {"name": "Strict Press", "sets": 5, "reps": "3", "notes": "Heavy"},
    {"name": "Weighted Pull Up", "sets": 5, "reps": "3", "notes": "Max load"},
    {"name": "Dumbbell Bench Press", "sets": 4, "reps": "10", "notes": "Hypertrophy"},
    {"name": "Barbell Row", "sets": 4, "reps": "8", "notes": "Strict form"},
    {"name": "Ab Wheel Rollout", "sets": 3, "reps": "12", "notes": "Standing if able"}
  ]'),
  (4, 'Engine Day — Intervals + Metcon', '[
    {"name": "Rowing Machine", "sets": 1, "reps": "5x500m", "notes": "Target sub 1:45"},
    {"name": "Assault Bike", "sets": 1, "reps": "10x30s on/30s off", "notes": "Max cal each"},
    {"name": "Thrusters", "sets": 1, "reps": "Fran: 21-15-9 thrusters + pull-ups", "notes": "For time"},
    {"name": "Burpee", "sets": 1, "reps": "100 for time", "notes": "Pacing strategy"}
  ]'),
  (5, 'Olympic + Hybrid Conditioning', '[
    {"name": "Snatch", "sets": 6, "reps": "1", "notes": "Heavy singles"},
    {"name": "Deadlift", "sets": 5, "reps": "3", "notes": "85%+"},
    {"name": "Sled Push", "sets": 5, "reps": "40m", "notes": "Heavy load"},
    {"name": "Box Jump", "sets": 3, "reps": "10", "notes": "30/24 inch"},
    {"name": "Toes to Bar", "sets": 3, "reps": "15", "notes": "Kipping"}
  ]')
) AS w(day_number, name, prescribed_exercises)
WHERE tp.name = 'Elite' AND tp.is_template = true;
