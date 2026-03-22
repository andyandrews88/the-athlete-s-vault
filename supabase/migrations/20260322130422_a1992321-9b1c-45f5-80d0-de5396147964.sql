
ALTER TABLE programme_templates ADD COLUMN IF NOT EXISTS video_url text;

ALTER TABLE programme_workouts ADD COLUMN IF NOT EXISTS template_id uuid REFERENCES programme_templates(id);
ALTER TABLE programme_workouts ADD COLUMN IF NOT EXISTS week_number integer DEFAULT 1;

CREATE POLICY "admin_write_programme_workouts" ON programme_workouts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "authenticated_read_programme_workouts" ON programme_workouts FOR SELECT TO authenticated
  USING (true);
