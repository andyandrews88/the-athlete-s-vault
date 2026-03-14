
-- 1. Add Core + Conditioning exercises
INSERT INTO exercises (name, movement_pattern, difficulty_coefficient, category) VALUES
  ('Plank Hold', 'Core', 1.0, 'Core'),
  ('Dead Bug', 'Core', 1.0, 'Core'),
  ('Ab Wheel Rollout', 'Core', 1.0, 'Core'),
  ('Pallof Press', 'Core', 1.0, 'Core'),
  ('Hanging Knee Raise', 'Core', 1.0, 'Core'),
  ('Toes to Bar', 'Core', 1.0, 'Core'),
  ('Assault Bike', 'Conditioning', 1.2, 'Conditioning'),
  ('Rowing Machine', 'Conditioning', 1.2, 'Conditioning'),
  ('Ski Erg', 'Conditioning', 1.2, 'Conditioning'),
  ('Sled Push', 'Conditioning', 1.3, 'Conditioning'),
  ('Box Jump', 'Conditioning', 1.4, 'Conditioning'),
  ('Burpee', 'Conditioning', 1.3, 'Conditioning'),
  ('Wall Ball', 'Conditioning', 1.2, 'Conditioning'),
  ('Double Under', 'Conditioning', 1.1, 'Conditioning'),
  ('Thrusters', 'Conditioning', 1.5, 'Conditioning')
ON CONFLICT DO NOTHING;

-- 2. Add is_template and created_by to training_programmes
ALTER TABLE training_programmes ADD COLUMN IF NOT EXISTS is_template boolean DEFAULT false;
ALTER TABLE training_programmes ADD COLUMN IF NOT EXISTS created_by uuid REFERENCES auth.users(id);

-- 3. Create programme_workouts table
CREATE TABLE IF NOT EXISTS programme_workouts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  programme_id uuid NOT NULL REFERENCES training_programmes(id) ON DELETE CASCADE,
  day_number integer NOT NULL,
  name text NOT NULL,
  prescribed_exercises jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at timestamptz DEFAULT now()
);

ALTER TABLE programme_workouts ENABLE ROW LEVEL SECURITY;

-- Users can read workouts of their own programmes or template programmes
CREATE POLICY "Users can read own programme workouts"
  ON programme_workouts FOR SELECT TO authenticated
  USING (
    EXISTS (
      SELECT 1 FROM training_programmes tp
      WHERE tp.id = programme_workouts.programme_id
        AND (tp.user_id = auth.uid() OR tp.is_template = true)
    )
  );

-- Admins can manage all
CREATE POLICY "Admins can manage programme workouts"
  ON programme_workouts FOR ALL TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

-- 4. Allow users to read template programmes
CREATE POLICY "Users can read template programmes"
  ON training_programmes FOR SELECT TO authenticated
  USING (is_template = true);
