
CREATE TABLE IF NOT EXISTS public.channels (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  color text DEFAULT 'primary',
  is_private boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.channel_messages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_id uuid REFERENCES public.channels(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS public.message_reactions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  message_id uuid REFERENCES public.channel_messages(id) ON DELETE CASCADE NOT NULL,
  user_id uuid REFERENCES public.profiles(id) ON DELETE CASCADE NOT NULL,
  emoji text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(message_id, user_id, emoji)
);

ALTER TABLE public.channels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.channel_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.message_reactions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "authenticated_read_channels"
  ON public.channels FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated_read_messages"
  ON public.channel_messages FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated_insert_messages"
  ON public.channel_messages FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_read_reactions"
  ON public.message_reactions FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "authenticated_insert_reactions"
  ON public.message_reactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "authenticated_delete_reactions"
  ON public.message_reactions FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

INSERT INTO public.channels (name, description, color)
VALUES
  ('general', 'Welcome to The Vault community', 'primary'),
  ('nutrition', 'Food, macros, hand portions', 'ok'),
  ('prs', 'Share your personal records', 'gold'),
  ('training-q', 'Training questions', 'warn'),
  ('mindset', 'Mental performance', 'purple')
ON CONFLICT DO NOTHING;
