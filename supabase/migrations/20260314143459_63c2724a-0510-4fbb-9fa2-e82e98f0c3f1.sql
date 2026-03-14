-- Add new columns to daily_checkins for spec alignment
ALTER TABLE public.daily_checkins
  ADD COLUMN IF NOT EXISTS sleep_hours numeric DEFAULT 7,
  ADD COLUMN IF NOT EXISTS drive integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS hydration_litres numeric DEFAULT 2.0,
  ADD COLUMN IF NOT EXISTS nutrition_habits jsonb DEFAULT '[]'::jsonb;

-- Create weekly_reflections table
CREATE TABLE IF NOT EXISTS public.weekly_reflections (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  week_start date NOT NULL,
  wins text,
  challenges text,
  focus_next_week text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, week_start)
);

ALTER TABLE public.weekly_reflections ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own reflections" ON public.weekly_reflections
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own reflections" ON public.weekly_reflections
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own reflections" ON public.weekly_reflections
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Admins can read all reflections" ON public.weekly_reflections
  FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));