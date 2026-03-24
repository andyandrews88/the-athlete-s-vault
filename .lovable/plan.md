

# Phase 1: Training Architecture — Zustand Store + React Query Hooks

## Summary
Extract LogTab's local state into a Zustand store and create React Query hooks for data fetching. Add missing columns to `exercises` and `exercise_sets` tables. Zero UI changes.

## Database Migration

Add missing columns to two tables:

```sql
-- exercises table
ALTER TABLE exercises
  ADD COLUMN IF NOT EXISTS muscle_group text,
  ADD COLUMN IF NOT EXISTS equipment_type text,
  ADD COLUMN IF NOT EXISTS is_timed boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_unilateral boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_plyometric boolean DEFAULT false,
  ADD COLUMN IF NOT EXISTS plyo_metric text,
  ADD COLUMN IF NOT EXISTS status text DEFAULT 'approved',
  ADD COLUMN IF NOT EXISTS submitted_by uuid;

-- exercise_sets table
ALTER TABLE exercise_sets
  ADD COLUMN IF NOT EXISTS side text,
  ADD COLUMN IF NOT EXISTS height_cm numeric,
  ADD COLUMN IF NOT EXISTS speed_mps numeric;
```

These are additive-only (no breaking changes). Existing queries continue to work.

## New Files

### 1. `src/stores/workoutStore.ts`
Zustand store with `persist` middleware. Persists `preferredUnit` and active session state (crash recovery). Contains all session actions: `startSession`, `endSession`, `addExercise`, `removeExercise`, `reorderExercise`, `updateSet`, `addSet`, `removeSet`, `markSetComplete`, `linkSuperset`, `unlinkSuperset`, `setViewingWorkout`, `setPreferredUnit`, `resetSession`. Exactly as specified in the user's prompt.

### 2. `src/hooks/useExerciseSearch.ts`
React Query hook wrapping the exercise search query. 5-minute stale time. Queries only `approved` exercises (but since some existing exercises may not have `status` set yet, will query `approved = true` OR `status = 'approved'` to handle both old and new rows). Adjusts the select to only include columns that exist in the current schema plus the new ones after migration.

### 3. `src/hooks/useWorkoutHistory.ts`
Two exports: `useWorkoutHistory(limit)` for fetching past completed sessions with nested exercises/sets, and `usePreviousSets(exerciseId)` for fetching the last session's sets for a given exercise (used for "Prev" column later).

### 4. `src/hooks/useProgrammes.ts`
Two exports: `useActiveProgramme()` and `useTodayWorkout(programmeId, dayNumber)`. Note: the existing `programme_workouts` table does NOT have a `week_number` column, so `useTodayWorkout` will query by `programme_id` + `day_number` only.

### 5. `src/hooks/usePersonalRecords.ts`
Single `usePersonalRecords()` hook returning all PRs for the current user with joined exercise data.

## LogTab Refactor

Replace these local `useState` calls with store selectors:
- `sessionId` → `store.activeSessionId`
- `sessionStartTime` → `store.sessionStartTime`
- `exercises` → `store.exercises` (mapped to/from the existing `SessionExercise` shape)
- Session actions (`addExercise`, `removeExercise`, `addSet`, `updateSet`, etc.) → store actions

**Keep as local state** (UI-only, no need for persistence):
- `searchQuery`, `searchResults`, `showSearch` — search UI state
- `finished`, `summaryData` — post-session display
- `workoutNotes` — textarea value
- `timer` — display timer string
- `showRestTimer` — rest timer overlay toggle
- `sectionsOpen` — collapsible sections
- `showProgrammeSelector`, `showWorkoutPicker` — dropdown toggles
- `linkingSuperset` — superset linking UI flow

**Key mapping challenge**: LogTab uses `SessionExercise` (with `exercise: ExerciseRow`, `expanded`, `isPr`, `showNotes`) while the store uses a flatter `ExerciseEntry`. The LogTab will maintain a thin adapter layer that maps between the store's exercise array and the UI-specific properties (`expanded`, `showNotes`, `isPr`) which remain as local state in a parallel array or derived map.

All Supabase write logic (session creation, set insertion, PR detection, finish) stays in LogTab — the store is purely for in-memory state management and crash recovery.

## Files touched
- `src/stores/workoutStore.ts` (create)
- `src/hooks/useExerciseSearch.ts` (create)
- `src/hooks/useWorkoutHistory.ts` (create)
- `src/hooks/useProgrammes.ts` (create)
- `src/hooks/usePersonalRecords.ts` (create)
- `src/components/train/LogTab.tsx` (refactor state layer only)
- 1 migration file for schema additions

No other files are modified. No visual changes.

