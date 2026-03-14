
-- Add new columns to exercise_sets
ALTER TABLE public.exercise_sets ADD COLUMN IF NOT EXISTS rpe integer;
ALTER TABLE public.exercise_sets ADD COLUMN IF NOT EXISTS set_type text NOT NULL DEFAULT 'working';
ALTER TABLE public.exercise_sets ADD COLUMN IF NOT EXISTS duration_secs integer;
ALTER TABLE public.exercise_sets ADD COLUMN IF NOT EXISTS distance_m numeric;
ALTER TABLE public.exercise_sets ADD COLUMN IF NOT EXISTS calories integer;

-- Add notes to session_exercises
ALTER TABLE public.session_exercises ADD COLUMN IF NOT EXISTS notes text;

-- Add workout_notes to training_sessions
ALTER TABLE public.training_sessions ADD COLUMN IF NOT EXISTS workout_notes text;

-- Add exercise_type and video_url to exercises
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS exercise_type text NOT NULL DEFAULT 'strength';
ALTER TABLE public.exercises ADD COLUMN IF NOT EXISTS video_url text;

-- Add weight_unit and rest_timer_secs to profiles
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS weight_unit text NOT NULL DEFAULT 'kg';
ALTER TABLE public.profiles ADD COLUMN IF NOT EXISTS rest_timer_secs integer NOT NULL DEFAULT 90;
