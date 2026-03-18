
CREATE TABLE IF NOT EXISTS ai_usage (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references profiles(id) not null,
  date date default current_date not null,
  prompt_count integer default 0 not null,
  created_at timestamptz default now(),
  UNIQUE(user_id, date)
);

CREATE TABLE IF NOT EXISTS ai_knowledge_base (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  content text not null,
  category text,
  source text,
  created_by uuid references profiles(id),
  created_at timestamptz default now()
);

ALTER TABLE ai_usage ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_knowledge_base ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_usage" ON ai_usage
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "admin_all_usage" ON ai_usage
  FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "all_read_knowledge" ON ai_knowledge_base
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_write_knowledge" ON ai_knowledge_base
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));
