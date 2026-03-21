-- Add metadata columns to exercises table
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS muscle_group text,
  ADD COLUMN IF NOT EXISTS equipment_type text,
  ADD COLUMN IF NOT EXISTS is_timed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_unilateral boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_plyometric boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS plyo_metric text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS submitted_by uuid;

-- Add tracking columns to exercise_sets table
ALTER TABLE exercise_sets
  ADD COLUMN IF NOT EXISTS side text,
  ADD COLUMN IF NOT EXISTS height_cm numeric,
  ADD COLUMN IF NOT EXISTS speed_mps numeric;