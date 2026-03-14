
CREATE TABLE public.audit_results (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  score integer NOT NULL DEFAULT 0,
  tier text NOT NULL DEFAULT 'foundation',
  mobility_score numeric NOT NULL DEFAULT 0,
  strength_score numeric NOT NULL DEFAULT 0,
  conditioning_score numeric NOT NULL DEFAULT 0,
  lifestyle_score numeric NOT NULL DEFAULT 0,
  raw_data jsonb DEFAULT '{}'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.audit_results ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert own results" ON public.audit_results
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can read own results" ON public.audit_results
  FOR SELECT TO authenticated USING (auth.uid() = user_id);
