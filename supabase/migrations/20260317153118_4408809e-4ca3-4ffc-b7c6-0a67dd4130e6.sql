
-- PT Packages
CREATE TABLE public.pt_packages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  client_id uuid REFERENCES public.profiles(id) NOT NULL,
  coach_id uuid REFERENCES public.profiles(id),
  name text NOT NULL,
  sessions_total integer NOT NULL,
  sessions_used integer DEFAULT 0,
  price_per_session numeric,
  currency text DEFAULT 'LKR',
  start_date date,
  expiry_date date,
  status text DEFAULT 'active',
  notes text,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.pt_packages ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manage_pt_packages" ON public.pt_packages FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "clients_read_own_pt_packages" ON public.pt_packages FOR SELECT TO authenticated
  USING (auth.uid() = client_id);

-- PT Sessions
CREATE TABLE public.pt_sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid REFERENCES public.pt_packages(id),
  client_id uuid REFERENCES public.profiles(id) NOT NULL,
  coach_id uuid REFERENCES public.profiles(id),
  date date NOT NULL,
  duration_mins integer,
  focus_areas text,
  notes text,
  completed boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
ALTER TABLE public.pt_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manage_pt_sessions" ON public.pt_sessions FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "clients_read_own_pt_sessions" ON public.pt_sessions FOR SELECT TO authenticated
  USING (auth.uid() = client_id);

-- Invoices
CREATE TABLE public.invoices (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  package_id uuid REFERENCES public.pt_packages(id),
  client_id uuid REFERENCES public.profiles(id) NOT NULL,
  coach_id uuid REFERENCES public.profiles(id),
  amount numeric NOT NULL,
  currency text DEFAULT 'LKR',
  status text DEFAULT 'draft',
  invoice_url text,
  notes text,
  sessions_count integer,
  created_at timestamptz DEFAULT now(),
  paid_at timestamptz
);
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
CREATE POLICY "admin_manage_invoices" ON public.invoices FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
CREATE POLICY "clients_read_own_invoices" ON public.invoices FOR SELECT TO authenticated
  USING (auth.uid() = client_id);
