
-- exercises table
CREATE TABLE public.exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  category text,
  movement_pattern text,
  difficulty_coefficient numeric DEFAULT 1.0,
  is_custom boolean DEFAULT false,
  created_by uuid REFERENCES public.profiles(id)
);
ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can read exercises" ON public.exercises FOR SELECT TO authenticated USING (true);
CREATE POLICY "Users can insert custom exercises" ON public.exercises FOR INSERT TO authenticated WITH CHECK (auth.uid() = created_by);

-- session_exercises table
CREATE TABLE public.session_exercises (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES public.training_sessions(id) ON DELETE CASCADE NOT NULL,
  exercise_id uuid REFERENCES public.exercises(id) NOT NULL,
  superset_group text,
  display_order integer DEFAULT 0
);
ALTER TABLE public.session_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own session_exercises" ON public.session_exercises FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.training_sessions ts WHERE ts.id = session_id AND ts.user_id = auth.uid()));
CREATE POLICY "Users can insert own session_exercises" ON public.session_exercises FOR INSERT TO authenticated
  WITH CHECK (EXISTS (SELECT 1 FROM public.training_sessions ts WHERE ts.id = session_id AND ts.user_id = auth.uid()));
CREATE POLICY "Users can update own session_exercises" ON public.session_exercises FOR UPDATE TO authenticated
  USING (EXISTS (SELECT 1 FROM public.training_sessions ts WHERE ts.id = session_id AND ts.user_id = auth.uid()));

-- exercise_sets table
CREATE TABLE public.exercise_sets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_exercise_id uuid REFERENCES public.session_exercises(id) ON DELETE CASCADE NOT NULL,
  set_num integer NOT NULL,
  reps integer,
  weight_kg numeric,
  completed boolean DEFAULT false,
  is_pr boolean DEFAULT false
);
ALTER TABLE public.exercise_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own exercise_sets" ON public.exercise_sets FOR SELECT TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.session_exercises se
    JOIN public.training_sessions ts ON ts.id = se.session_id
    WHERE se.id = session_exercise_id AND ts.user_id = auth.uid()
  ));
CREATE POLICY "Users can insert own exercise_sets" ON public.exercise_sets FOR INSERT TO authenticated
  WITH CHECK (EXISTS (
    SELECT 1 FROM public.session_exercises se
    JOIN public.training_sessions ts ON ts.id = se.session_id
    WHERE se.id = session_exercise_id AND ts.user_id = auth.uid()
  ));
CREATE POLICY "Users can update own exercise_sets" ON public.exercise_sets FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.session_exercises se
    JOIN public.training_sessions ts ON ts.id = se.session_id
    WHERE se.id = session_exercise_id AND ts.user_id = auth.uid()
  ));

-- personal_records table
CREATE TABLE public.personal_records (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  exercise_id uuid REFERENCES public.exercises(id) NOT NULL,
  weight_kg numeric NOT NULL,
  reps integer DEFAULT 1,
  session_id uuid REFERENCES public.training_sessions(id),
  achieved_at timestamptz DEFAULT now()
);
ALTER TABLE public.personal_records ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can read own PRs" ON public.personal_records FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can insert own PRs" ON public.personal_records FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

-- Seed 30 common exercises
INSERT INTO public.exercises (name, category, movement_pattern, difficulty_coefficient, is_custom) VALUES
  ('Back Squat', 'Legs', 'Squat', 1.4, false),
  ('Front Squat', 'Legs', 'Squat', 1.4, false),
  ('Goblet Squat', 'Legs', 'Squat', 1.4, false),
  ('Deadlift', 'Back', 'Hinge', 1.5, false),
  ('Romanian Deadlift', 'Back', 'Hinge', 1.5, false),
  ('Hip Thrust', 'Glutes', 'Hinge', 1.5, false),
  ('Bench Press', 'Chest', 'Push', 1.2, false),
  ('Overhead Press', 'Shoulders', 'Push', 1.2, false),
  ('Incline Dumbbell Press', 'Chest', 'Push', 1.2, false),
  ('Pull-Up', 'Back', 'Pull', 1.3, false),
  ('Barbell Row', 'Back', 'Pull', 1.3, false),
  ('Lat Pulldown', 'Back', 'Pull', 1.3, false),
  ('Farmer Carry', 'Core', 'Carry', 1.1, false),
  ('Suitcase Carry', 'Core', 'Carry', 1.1, false),
  ('Overhead Carry', 'Shoulders', 'Carry', 1.1, false),
  ('Walking Lunge', 'Legs', 'Lunge', 1.2, false),
  ('Bulgarian Split Squat', 'Legs', 'Lunge', 1.2, false),
  ('Reverse Lunge', 'Legs', 'Lunge', 1.2, false),
  ('Russian Twist', 'Core', 'Rotation', 1.0, false),
  ('Cable Woodchop', 'Core', 'Rotation', 1.0, false),
  ('Landmine Rotation', 'Core', 'Rotation', 1.0, false),
  ('Box Jump', 'Legs', 'Jump', 1.6, false),
  ('Broad Jump', 'Legs', 'Jump', 1.6, false),
  ('Depth Jump', 'Legs', 'Jump', 1.6, false),
  ('Sprint Intervals', 'Cardio', 'Sprint', 1.8, false),
  ('Hill Sprints', 'Cardio', 'Sprint', 1.8, false),
  ('Swimming', 'Cardio', 'Swim', 1.4, false),
  ('Rowing Machine', 'Cardio', 'Row', 1.3, false),
  ('Dumbbell Row', 'Back', 'Pull', 1.3, false),
  ('Push-Up', 'Chest', 'Push', 1.2, false);
