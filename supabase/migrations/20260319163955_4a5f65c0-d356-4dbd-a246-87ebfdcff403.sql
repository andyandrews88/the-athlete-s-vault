CREATE TABLE IF NOT EXISTS public.hand_portion_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  date date NOT NULL DEFAULT CURRENT_DATE,
  meal_type text NOT NULL,
  category text NOT NULL,
  portions decimal NOT NULL,
  food_name text,
  notes text,
  estimated_protein decimal,
  estimated_carbs decimal,
  estimated_fat decimal,
  estimated_calories decimal,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE public.hand_portion_entries ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_read_own_hand_portions" ON public.hand_portion_entries FOR SELECT TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "users_insert_own_hand_portions" ON public.hand_portion_entries FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);
CREATE POLICY "users_delete_own_hand_portions" ON public.hand_portion_entries FOR DELETE TO authenticated USING (auth.uid() = user_id);
CREATE POLICY "admins_read_all_hand_portions" ON public.hand_portion_entries FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'::app_role));