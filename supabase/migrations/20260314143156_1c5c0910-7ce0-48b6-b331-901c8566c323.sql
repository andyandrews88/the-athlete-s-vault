-- Create a trigger to auto-create profile on new user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, role, tier, onboarding_complete)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', split_part(NEW.email, '@', 1)),
    'client',
    'free',
    false
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Also insert the missing profile for the existing user
INSERT INTO public.profiles (id, email, full_name, role, tier, onboarding_complete)
VALUES (
  '104941e2-a39e-4277-bee7-51fb077c1920',
  'andrewsandycf@gmail.com',
  'Andy',
  'client',
  'free',
  true
)
ON CONFLICT (id) DO NOTHING;