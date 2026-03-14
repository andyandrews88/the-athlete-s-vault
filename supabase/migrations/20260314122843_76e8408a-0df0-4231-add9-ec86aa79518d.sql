
-- daily_checkins
CREATE TABLE public.daily_checkins (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  sleep integer NOT NULL DEFAULT 5,
  energy integer NOT NULL DEFAULT 5,
  stress integer NOT NULL DEFAULT 5,
  mood integer NOT NULL DEFAULT 5,
  soreness integer NOT NULL DEFAULT 5,
  note text,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, date)
);
ALTER TABLE public.daily_checkins ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own checkins" ON public.daily_checkins FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own checkins" ON public.daily_checkins FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own checkins" ON public.daily_checkins FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- habits
CREATE TABLE public.habits (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name text NOT NULL,
  emoji text DEFAULT '✅',
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.habits ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own habits" ON public.habits FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own habits" ON public.habits FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own habits" ON public.habits FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own habits" ON public.habits FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- habit_completions
CREATE TABLE public.habit_completions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  habit_id uuid NOT NULL REFERENCES public.habits(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  completed boolean DEFAULT true,
  UNIQUE(habit_id, date)
);
ALTER TABLE public.habit_completions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own completions" ON public.habit_completions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own completions" ON public.habit_completions FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own completions" ON public.habit_completions FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own completions" ON public.habit_completions FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- breathwork_sessions
CREATE TABLE public.breathwork_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  method text NOT NULL,
  duration_secs integer NOT NULL DEFAULT 0,
  completed_at timestamptz DEFAULT now()
);
ALTER TABLE public.breathwork_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own breathwork" ON public.breathwork_sessions FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own breathwork" ON public.breathwork_sessions FOR SELECT TO authenticated USING (auth.uid() = user_id);

-- hand_portion_logs
CREATE TABLE public.hand_portion_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  meal text NOT NULL,
  protein_portions integer DEFAULT 0,
  veggie_portions integer DEFAULT 0,
  carb_portions integer DEFAULT 0,
  fat_portions integer DEFAULT 0
);
ALTER TABLE public.hand_portion_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own portions" ON public.hand_portion_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own portions" ON public.hand_portion_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own portions" ON public.hand_portion_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own portions" ON public.hand_portion_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);

-- nutrition_targets
CREATE TABLE public.nutrition_targets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE UNIQUE,
  protein_g integer DEFAULT 150,
  carbs_g integer DEFAULT 200,
  fat_g integer DEFAULT 70,
  calories integer DEFAULT 2200
);
ALTER TABLE public.nutrition_targets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own targets" ON public.nutrition_targets FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own targets" ON public.nutrition_targets FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own targets" ON public.nutrition_targets FOR UPDATE TO authenticated USING (auth.uid() = user_id);

-- macro_logs
CREATE TABLE public.macro_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  meal text NOT NULL,
  food_name text NOT NULL,
  calories numeric DEFAULT 0,
  protein_g numeric DEFAULT 0,
  carbs_g numeric DEFAULT 0,
  fat_g numeric DEFAULT 0,
  serving_g numeric DEFAULT 0
);
ALTER TABLE public.macro_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own macros" ON public.macro_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own macros" ON public.macro_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own macros" ON public.macro_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);
