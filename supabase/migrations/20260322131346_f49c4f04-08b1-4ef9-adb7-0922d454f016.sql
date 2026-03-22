
CREATE TABLE IF NOT EXISTS programme_weeks (
  id uuid primary key default gen_random_uuid(),
  template_id uuid references programme_templates(id) ON DELETE CASCADE,
  week_number integer NOT NULL,
  notes text,
  UNIQUE(template_id, week_number)
);

ALTER TABLE programme_weeks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_write_programme_weeks" ON programme_weeks FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "authenticated_read_programme_weeks" ON programme_weeks FOR SELECT TO authenticated
  USING (true);
