-- DELETE policies for exercise_sets
CREATE POLICY "Users can delete own exercise_sets"
ON public.exercise_sets
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM session_exercises se
    JOIN training_sessions ts ON ts.id = se.session_id
    WHERE se.id = exercise_sets.session_exercise_id
      AND ts.user_id = auth.uid()
  )
);

-- DELETE policies for session_exercises
CREATE POLICY "Users can delete own session_exercises"
ON public.session_exercises
FOR DELETE
TO authenticated
USING (
  EXISTS (
    SELECT 1
    FROM training_sessions ts
    WHERE ts.id = session_exercises.session_id
      AND ts.user_id = auth.uid()
  )
);

-- DELETE policy for training_sessions (needed for cancel)
CREATE POLICY "Users can delete own sessions"
ON public.training_sessions
FOR DELETE
TO authenticated
USING (auth.uid() = user_id);