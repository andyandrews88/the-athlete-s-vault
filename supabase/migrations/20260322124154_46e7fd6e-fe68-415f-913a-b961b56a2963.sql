
CREATE TABLE IF NOT EXISTS programme_templates (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text unique not null,
  tagline text,
  description text,
  who_its_for text,
  what_to_expect text,
  sample_week jsonb,
  days_per_week integer default 5,
  duration_weeks integer default 12,
  difficulty text default 'Intermediate',
  tags text[],
  is_active boolean default true,
  required_tier text default 'free',
  display_order integer default 0,
  created_at timestamptz default now()
);

ALTER TABLE programme_templates ENABLE ROW LEVEL SECURITY;

CREATE POLICY "all_read_templates"
  ON programme_templates FOR SELECT
  TO authenticated USING (true);

CREATE POLICY "admin_write_templates"
  ON programme_templates FOR ALL
  TO authenticated
  USING (has_role(auth.uid(), 'admin'::app_role))
  WITH CHECK (has_role(auth.uid(), 'admin'::app_role));

ALTER TABLE training_programmes
  ADD COLUMN IF NOT EXISTS template_id uuid references programme_templates(id);

INSERT INTO programme_templates
  (name, slug, tagline, description, who_its_for, what_to_expect, sample_week, days_per_week, duration_weeks, difficulty, tags, display_order, required_tier)
VALUES
(
  'Weekly Grind', 'weekly-grind', 'Get Bigger. Stronger. Faster.',
  'Myself and a couple of friends train together. This is the exact program that we follow. Our objectives are quite simple — Get Bigger, Stronger and Faster. It is our Weekly Grind. I am Andy Andrews, and I am the driving force behind The Weekly Grind, a training program crafted straight from my personal regimen. With years of hands-on experience and a relentless commitment to bringing physicality to everything I do, I have built a unique approach to training that combines raw strength, functional fitness, and real-world performance. I keep it simple and direct — because if it does not work, it is not worth your time. Running CrossFit Ceylon and coaching clients across all levels has shown me what matters most to busy professionals: effective, no-nonsense training that delivers results without the frills. My mission is to make powerful, transformative fitness accessible and achievable for everyone. Follow my journey, train alongside me, and experience fitness the way I live it — intense, straightforward, and unapologetically focused.',
  'Built for athletes who want to train the way Andy trains. No fluff, no gimmicks. This is real training for people who want real results.',
  '5 training days per week. A mix of Olympic lifting, strength work, sprinting, and conditioning. Every session has a purpose. You will be challenged every single week.',
  '[{"day": "Monday", "focus": "Clean / Squat / Incline Press / Nordic Curls"},{"day": "Tuesday", "focus": "Sprint + Threshold"},{"day": "Wednesday", "focus": "Turkish Getups / Front Rack Box Squat / Paused Bench Press / Chin Ups"},{"day": "Thursday", "focus": "Sprints + Zone 2"},{"day": "Friday", "focus": "Snatch / Deadlift / Overhead Press / Pendlay Row"},{"day": "Saturday", "focus": "Zone 2 + Arms"},{"day": "Sunday", "focus": "Rest"}]',
  6, 12, 'Advanced', ARRAY['Strength', 'Olympic', 'Conditioning', 'Hybrid'], 1, 'free'
),
(
  'Functional Bodybuilding', 'functional-bodybuilding', 'Train for how you look AND how you move.',
  'Functional Bodybuilding is the programme for athletes who refuse to choose between aesthetics and performance. Built on principles of controlled movement, intentional loading, and sustainable training, this programme will build the body you want while keeping you healthy, mobile, and athletic for the long haul. Every session is designed with purpose — tempo work, mind-muscle connection, and movement quality come first. The weight on the bar is a tool, not the goal.',
  'Athletes who want to build size and strength without sacrificing movement quality. Ideal for those coming from a CrossFit or performance background who want more hypertrophy focus without losing their athleticism.',
  'Four to five training days per week. Upper and lower splits with dedicated posterior chain and accessory work. Expect controlled tempos, supersets, and a training style that is as much about how you move as how much you lift.',
  '[{"day": "Monday", "focus": "Upper Push — Tempo Bench / Shoulder / Triceps"},{"day": "Tuesday", "focus": "Lower — Front Squat / Romanian Deadlift / Accessories"},{"day": "Wednesday", "focus": "Rest or Active Recovery"},{"day": "Thursday", "focus": "Upper Pull — Weighted Pull Ups / Row / Biceps"},{"day": "Friday", "focus": "Lower — Hip Thrust / Bulgarian Split Squat / Hamstrings"},{"day": "Saturday", "focus": "Full Body Conditioning + Core"},{"day": "Sunday", "focus": "Rest"}]',
  5, 12, 'Intermediate', ARRAY['Hypertrophy', 'Strength', 'Aesthetics', 'Functional'], 2, 'free'
),
(
  'CrossFit', 'crossfit', 'Constantly varied. Brutally effective.',
  'This programme is built around the principles that have produced some of the fittest athletes on earth. Varied functional movements performed at high intensity. Every day is different. Every day is hard. Every day makes you better. You will squat, pull, push, run, row, jump, and lift. You will do it fast. You will do it heavy. And you will do it consistently. This is General Physical Preparedness at its highest level.',
  'Athletes who want to be good at everything. If you want to be strong, fast, powerful, and have the engine to back it up — this is your programme. Competitive CrossFit athletes, or anyone who wants to train like one.',
  'Five to six days per week. Expect a strength or skill component followed by a metcon (metabolic conditioning workout). WODs will vary from short and brutal to long and grinding. Gymnastics, Olympic lifting, and monostructural cardio all feature heavily.',
  '[{"day": "Monday", "focus": "Strength: Back Squat + WOD: AMRAP or EMOM"},{"day": "Tuesday", "focus": "Olympic: Clean & Jerk + Conditioning"},{"day": "Wednesday", "focus": "Gymnastics Skill + Hero WOD or Chipper"},{"day": "Thursday", "focus": "Rest or Active Recovery"},{"day": "Friday", "focus": "Strength: Deadlift + Short Heavy WOD"},{"day": "Saturday", "focus": "Long Aerobic WOD + Accessory"},{"day": "Sunday", "focus": "Rest"}]',
  5, 12, 'Advanced', ARRAY['CrossFit', 'Conditioning', 'Olympic', 'Metcon'], 3, 'free'
),
(
  'Olympic Weightlifting', 'olympic-weightlifting', 'The barbell sports. Precision, power, patience.',
  'The Snatch and the Clean and Jerk are the most technical movements in strength sport. This programme is built around mastering them. You will develop explosive power, overhead stability, and the kind of athleticism that carries over to every other sport and discipline. This is not a programme for people who want a quick fix. It is a programme for people who want to master something worth mastering.',
  'Athletes who want to develop serious Olympic lifting technique and strength. Suitable for beginners who want to learn the lifts properly, and intermediate lifters looking to add kilos to their total.',
  'Four to five training days per week. Heavy focus on the competition lifts — Snatch and Clean and Jerk — plus supporting squats, pulls, and accessory work. Expect to spend time drilling positions before adding weight.',
  '[{"day": "Monday", "focus": "Snatch + Back Squat + Snatch Pull"},{"day": "Tuesday", "focus": "Clean and Jerk + Front Squat + Clean Pull"},{"day": "Wednesday", "focus": "Rest"},{"day": "Thursday", "focus": "Power Snatch + Overhead Squat + Accessories"},{"day": "Friday", "focus": "Clean and Jerk + Back Squat + Posterior Chain"},{"day": "Saturday", "focus": "Full Session — Competition Simulation"},{"day": "Sunday", "focus": "Rest"}]',
  5, 12, 'Intermediate', ARRAY['Olympic', 'Strength', 'Technical', 'Power'], 4, 'free'
)
ON CONFLICT (slug) DO NOTHING;
