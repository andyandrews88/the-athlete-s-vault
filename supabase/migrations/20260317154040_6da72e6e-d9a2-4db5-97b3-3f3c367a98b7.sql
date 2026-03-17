
ALTER TABLE public.training_programmes
  ADD COLUMN IF NOT EXISTS is_free boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS weeks integer,
  ADD COLUMN IF NOT EXISTS days_per_week integer;

ALTER TABLE public.programme_workouts
  ADD COLUMN IF NOT EXISTS section text DEFAULT 'main';
