CREATE TABLE IF NOT EXISTS public.coaching_applications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) NOT NULL,
  type text NOT NULL DEFAULT 'consultation',
  status text NOT NULL DEFAULT 'pending',
  stripe_session_id text,
  notes text,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.coaching_applications ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_applications" ON public.coaching_applications
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "admin_manage_applications" ON public.coaching_applications
  FOR ALL TO authenticated
  USING (public.has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (public.has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "service_insert_applications" ON public.coaching_applications
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);