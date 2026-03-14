-- Phase 0.4: Add admin read policies to key tables using has_role()

-- Profiles: admin can read all
CREATE POLICY "Admins can read all profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Training sessions: admin can read all
CREATE POLICY "Admins can read all sessions"
  ON public.training_sessions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Daily checkins: admin can read all
CREATE POLICY "Admins can read all checkins"
  ON public.daily_checkins FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Goals: admin can read all
CREATE POLICY "Admins can read all goals"
  ON public.goals FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Audit results: admin can read all
CREATE POLICY "Admins can read all audit results"
  ON public.audit_results FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Audit responses: admin can read all
CREATE POLICY "Admins can read all audit responses"
  ON public.audit_responses FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Session exercises: admin can read all
CREATE POLICY "Admins can read all session_exercises"
  ON public.session_exercises FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Exercise sets: admin can read all
CREATE POLICY "Admins can read all exercise_sets"
  ON public.exercise_sets FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Personal records: admin can read all
CREATE POLICY "Admins can read all PRs"
  ON public.personal_records FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Coaching notes: admin can manage all
CREATE POLICY "Admins can manage coaching notes"
  ON public.coaching_notes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Weekly reviews: admin can manage all
CREATE POLICY "Admins can manage weekly reviews"
  ON public.weekly_reviews FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));

-- Habits: admin can read all
CREATE POLICY "Admins can read all habits"
  ON public.habits FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Habit completions: admin can read all
CREATE POLICY "Admins can read all habit completions"
  ON public.habit_completions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Breathwork: admin can read all
CREATE POLICY "Admins can read all breathwork"
  ON public.breathwork_sessions FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Nutrition: admin can read all
CREATE POLICY "Admins can read all macro logs"
  ON public.macro_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read all hand portions"
  ON public.hand_portion_logs FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can read all nutrition targets"
  ON public.nutrition_targets FOR SELECT
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'));

-- Training programmes: admin can manage all
CREATE POLICY "Admins can manage all programmes"
  ON public.training_programmes FOR ALL
  TO authenticated
  USING (public.has_role(auth.uid(), 'admin'))
  WITH CHECK (public.has_role(auth.uid(), 'admin'));