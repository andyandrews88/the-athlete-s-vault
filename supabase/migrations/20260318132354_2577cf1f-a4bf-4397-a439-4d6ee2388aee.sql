CREATE TABLE IF NOT EXISTS notification_preferences (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) on delete cascade UNIQUE NOT NULL,
  checkin_reminder boolean default true,
  coaching_notes boolean default true,
  weekly_review boolean default true,
  streak_reminder boolean default true,
  updated_at timestamptz default now()
);

ALTER TABLE notification_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_prefs" ON notification_preferences FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);