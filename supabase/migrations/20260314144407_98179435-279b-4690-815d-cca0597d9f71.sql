-- Body weight logs
CREATE TABLE IF NOT EXISTS public.body_weight_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg numeric NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, date)
);
ALTER TABLE public.body_weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own weight" ON public.body_weight_logs FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own weight" ON public.body_weight_logs FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own weight" ON public.body_weight_logs FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own weight" ON public.body_weight_logs FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all weight" ON public.body_weight_logs FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Body measurements
CREATE TABLE IF NOT EXISTS public.body_measurements (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  waist_cm numeric,
  hips_cm numeric,
  chest_cm numeric,
  left_arm_cm numeric,
  right_arm_cm numeric,
  left_thigh_cm numeric,
  right_thigh_cm numeric,
  neck_cm numeric,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, date)
);
ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own measurements" ON public.body_measurements FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own measurements" ON public.body_measurements FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own measurements" ON public.body_measurements FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own measurements" ON public.body_measurements FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all measurements" ON public.body_measurements FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- InBody scans
CREATE TABLE IF NOT EXISTS public.inbody_scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  weight_kg numeric,
  skeletal_muscle_kg numeric,
  body_fat_pct numeric,
  body_fat_kg numeric,
  bmi numeric,
  basal_metabolic_rate integer,
  total_body_water numeric,
  notes text,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, date)
);
ALTER TABLE public.inbody_scans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own scans" ON public.inbody_scans FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own scans" ON public.inbody_scans FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can update own scans" ON public.inbody_scans FOR UPDATE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own scans" ON public.inbody_scans FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all scans" ON public.inbody_scans FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Progress photos
CREATE TABLE IF NOT EXISTS public.progress_photos (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  angle text NOT NULL, -- 'front', 'side', 'back'
  storage_path text NOT NULL,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.progress_photos ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can insert own photos" ON public.progress_photos FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can read own photos" ON public.progress_photos FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Users can delete own photos" ON public.progress_photos FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "Admins can read all photos" ON public.progress_photos FOR SELECT TO authenticated USING (has_role(auth.uid(), 'admin'::app_role));

-- Private storage bucket for progress photos
INSERT INTO storage.buckets (id, name, public) VALUES ('progress-photos', 'progress-photos', false) ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can upload to their own folder
CREATE POLICY "Users can upload own photos" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can view own photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own photos" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'progress-photos' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Admins can view all photos" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'progress-photos' AND has_role(auth.uid(), 'admin'::app_role));