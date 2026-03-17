
-- Content items table
CREATE TABLE IF NOT EXISTS public.content_items (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  description text,
  content_type text NOT NULL DEFAULT 'video',
  source text DEFAULT 'andy',
  url text,
  thumbnail_url text,
  tags text[] DEFAULT '{}',
  duration text,
  is_new_drop boolean DEFAULT false,
  created_by uuid REFERENCES public.profiles(id),
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.content_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "anyone_read_content" ON public.content_items
  FOR SELECT TO authenticated USING (true);

CREATE POLICY "admin_manage_content" ON public.content_items
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- Bookmarks table
CREATE TABLE IF NOT EXISTS public.bookmarks (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content_id uuid REFERENCES public.content_items(id) ON DELETE CASCADE NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(user_id, content_id)
);

ALTER TABLE public.bookmarks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_own_bookmarks" ON public.bookmarks
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Content sends table
CREATE TABLE IF NOT EXISTS public.content_sends (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  content_id uuid REFERENCES public.content_items(id) ON DELETE CASCADE NOT NULL,
  sent_by uuid REFERENCES public.profiles(id),
  sent_to uuid REFERENCES public.profiles(id),
  sent_to_all boolean DEFAULT false,
  sent_at timestamptz DEFAULT now()
);

ALTER TABLE public.content_sends ENABLE ROW LEVEL SECURITY;

CREATE POLICY "admin_manage_sends" ON public.content_sends
  FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

CREATE POLICY "users_read_own_sends" ON public.content_sends
  FOR SELECT TO authenticated
  USING (auth.uid() = sent_to);
