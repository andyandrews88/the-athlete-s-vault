
-- Create announcements table
CREATE TABLE IF NOT EXISTS announcements (
  id uuid primary key default gen_random_uuid(),
  content text not null,
  is_active boolean default true,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

ALTER TABLE announcements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all_users_read_announcements"
  ON announcements FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "admin_manage_announcements"
  ON announcements FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Add approved column to exercises
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS approved boolean default true;

-- Set existing exercises to approved
UPDATE exercises SET approved = true WHERE approved IS NULL;
