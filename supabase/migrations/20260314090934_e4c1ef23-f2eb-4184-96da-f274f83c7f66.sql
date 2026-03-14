
-- Add onboarding fields to profiles
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS goal text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS experience_level text;
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS equipment text[];

-- Create audit_responses table
CREATE TABLE public.audit_responses (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  -- Mobility (0-10)
  hip_flexion integer DEFAULT 5,
  shoulder_flexion integer DEFAULT 5,
  thoracic_rotation integer DEFAULT 5,
  -- Strength
  back_squat_1rm integer,
  deadlift_1rm integer,
  overhead_press_1rm integer,
  max_pullups integer,
  -- Conditioning
  run_400m_seconds integer,
  max_burpees_60s integer,
  max_double_unders integer,
  -- Lifestyle (1-10)
  sleep_quality integer DEFAULT 5,
  stress_level integer DEFAULT 5,
  nutrition_consistency integer DEFAULT 5,
  recovery_quality integer DEFAULT 5,
  -- Training history
  days_per_week integer,
  years_training integer,
  primary_sport text,
  injuries text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.audit_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own audit" ON public.audit_responses
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own audit" ON public.audit_responses
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can update own audit" ON public.audit_responses
  FOR UPDATE TO authenticated USING (auth.uid() = user_id);
