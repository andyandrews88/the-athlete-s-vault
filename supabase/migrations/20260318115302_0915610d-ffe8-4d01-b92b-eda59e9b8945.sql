
-- Add thread support and pin support to channel_messages
ALTER TABLE channel_messages ADD COLUMN IF NOT EXISTS parent_message_id uuid references channel_messages(id);
ALTER TABLE channel_messages ADD COLUMN IF NOT EXISTS is_pinned boolean default false;

-- Allow admin to update messages (for pinning)
CREATE POLICY "admin_update_messages" ON channel_messages FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admin to delete messages
CREATE POLICY "admin_delete_messages" ON channel_messages FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Allow admin to manage channels (insert, update, delete)
CREATE POLICY "admin_manage_channels" ON channels FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin_update_channels" ON channels FOR UPDATE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "admin_delete_channels" ON channels FOR DELETE TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

-- Polls table
CREATE TABLE IF NOT EXISTS polls (
  id uuid primary key default gen_random_uuid(),
  channel_id uuid references channels(id) on delete cascade,
  created_by uuid references profiles(id),
  question text not null,
  options jsonb not null default '[]'::jsonb,
  message_id uuid references channel_messages(id) on delete cascade,
  created_at timestamptz default now()
);

ALTER TABLE polls ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_polls" ON polls FOR SELECT TO authenticated USING (true);
CREATE POLICY "admin_insert_polls" ON polls FOR INSERT TO authenticated
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Poll votes table
CREATE TABLE IF NOT EXISTS poll_votes (
  id uuid primary key default gen_random_uuid(),
  poll_id uuid references polls(id) on delete cascade,
  user_id uuid references profiles(id),
  option_index integer not null,
  created_at timestamptz default now(),
  UNIQUE(poll_id, user_id)
);

ALTER TABLE poll_votes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_votes" ON poll_votes FOR SELECT TO authenticated USING (true);
CREATE POLICY "users_insert_own_votes" ON poll_votes FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_update_own_votes" ON poll_votes FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);
