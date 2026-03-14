
-- Add biometrics and movement screen fields to audit_responses
ALTER TABLE public.audit_responses ADD COLUMN IF NOT EXISTS body_weight numeric;
ALTER TABLE public.audit_responses ADD COLUMN IF NOT EXISTS weight_unit text DEFAULT 'kg';
ALTER TABLE public.audit_responses ADD COLUMN IF NOT EXISTS height_cm numeric;
ALTER TABLE public.audit_responses ADD COLUMN IF NOT EXISTS age integer;
ALTER TABLE public.audit_responses ADD COLUMN IF NOT EXISTS biological_sex text;

-- Big 4 additions (front squat, strict press)
ALTER TABLE public.audit_responses ADD COLUMN IF NOT EXISTS front_squat_1rm integer;
ALTER TABLE public.audit_responses ADD COLUMN IF NOT EXISTS strict_press_1rm integer;
-- Estimate from reps fields
ALTER TABLE public.audit_responses ADD COLUMN IF NOT EXISTS back_squat_est_wt integer;
ALTER TABLE public.audit_responses ADD COLUMN IF NOT EXISTS back_squat_est_reps integer;
ALTER TABLE public.audit_responses ADD COLUMN IF NOT EXISTS deadlift_est_wt integer;
ALTER TABLE public.audit_responses ADD COLUMN IF NOT EXISTS deadlift_est_reps integer;
ALTER TABLE public.audit_responses ADD COLUMN IF NOT EXISTS front_squat_est_wt integer;
ALTER TABLE public.audit_responses ADD COLUMN IF NOT EXISTS front_squat_est_reps integer;
ALTER TABLE public.audit_responses ADD COLUMN IF NOT EXISTS strict_press_est_wt integer;
ALTER TABLE public.audit_responses ADD COLUMN IF NOT EXISTS strict_press_est_reps integer;

-- Engine check
ALTER TABLE public.audit_responses ADD COLUMN IF NOT EXISTS cardio_benchmark text;
ALTER TABLE public.audit_responses ADD COLUMN IF NOT EXISTS cardio_time_min integer;
ALTER TABLE public.audit_responses ADD COLUMN IF NOT EXISTS cardio_time_sec integer;

-- Movement screen
ALTER TABLE public.audit_responses ADD COLUMN IF NOT EXISTS deep_squat_hold text; -- 'yes', 'no', 'skip'
ALTER TABLE public.audit_responses ADD COLUMN IF NOT EXISTS overhead_reach text;   -- 'yes', 'no', 'skip'
ALTER TABLE public.audit_responses ADD COLUMN IF NOT EXISTS dead_hang_seconds integer;
ALTER TABLE public.audit_responses ADD COLUMN IF NOT EXISTS pistol_squat text;     -- 'yes', 'no', 'skip'

-- Lifestyle updates (sleep as category, goal selection)
ALTER TABLE public.audit_responses ADD COLUMN IF NOT EXISTS sleep_category text; -- '<6h', '6-7h', '7-8h', '8+h'
ALTER TABLE public.audit_responses ADD COLUMN IF NOT EXISTS training_experience text; -- '<1yr', '1-3yr', '3-5yr', '5+yr'
ALTER TABLE public.audit_responses ADD COLUMN IF NOT EXISTS primary_goal text; -- 'body_comp', 'performance', 'general_health'
