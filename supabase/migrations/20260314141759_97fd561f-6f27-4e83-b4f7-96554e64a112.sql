-- Phase 0.1: Add rir column to exercise_sets
ALTER TABLE public.exercise_sets ADD COLUMN IF NOT EXISTS rir integer;