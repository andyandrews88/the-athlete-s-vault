
-- Create pricing_settings table
CREATE TABLE IF NOT EXISTS pricing_settings (
  id uuid primary key default gen_random_uuid(),
  service_name text not null,
  price_lkr numeric,
  price_usd numeric,
  show_on_landing boolean default true,
  display_order integer default 0,
  created_at timestamptz default now()
);

ALTER TABLE pricing_settings ENABLE ROW LEVEL SECURITY;

-- All authenticated users can read (for landing page)
CREATE POLICY "anyone_read_pricing"
  ON pricing_settings FOR SELECT
  TO authenticated
  USING (true);

-- Admin can manage pricing
CREATE POLICY "admin_manage_pricing"
  ON pricing_settings FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Also allow anon to read for landing page
CREATE POLICY "public_read_pricing"
  ON pricing_settings FOR SELECT
  TO anon
  USING (show_on_landing = true);

-- Seed default pricing
INSERT INTO pricing_settings 
(service_name, price_lkr, price_usd, show_on_landing, display_order)
VALUES
('1-on-1 Online Coaching', 60000, 188, true, 1),
('PT Session (Single)', 15000, 46, true, 2),
('Pre-built Programme', 8200, 25, true, 3),
('Nutrition Programme', 35000, 107, false, 4),
('exchange_rate', 326, null, false, 99)
ON CONFLICT DO NOTHING;
