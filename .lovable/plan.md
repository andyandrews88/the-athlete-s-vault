

## Training Module Audit: Spec vs Current Implementation

### Present (Working)
- Exercise search with autocomplete
- Set logging: weight (kg), reps, RIR, completed status
- PR detection with real-time toast celebration
- Session timer (elapsed)
- Programme selector + workout day pre-loading
- Calendar tab (week/month view with day detail)
- PR Board (recent personal records)
- Analytics (12-week volume, RIR trend, movement balance, compliance donut)
- NTU calculation (silent, background)

### Missing (from Section 5 spec)

| # | Feature | Priority |
|---|---------|----------|
| 1 | **Workout sections** (Warm Up / Exercises / Cool Down) — collapsible, exercises movable between them | High |
| 2 | **Rest timer** — auto-triggers after completing a set, configurable default duration, countdown overlay | High |
| 3 | **Notes** — per-exercise and per-workout text fields | High |
| 4 | **Set type** — Warmup vs Working toggle per set | Medium |
| 5 | **RPE field** — optional, alongside RIR | Medium |
| 6 | **Supersets** — link any two exercises, visual grouping, alternate logging | Medium |
| 7 | **Weight unit toggle** — kg/lbs user preference, store in kg, display in preference | Medium |
| 8 | **Conditioning exercises** — duration, distance, calories, heart rate inputs | Medium |
| 9 | **Timed exercises** — duration replaces reps automatically (planks, carries) | Medium |
| 10 | **Week strip** — horizontal day navigator at top of Log tab | Low |
| 11 | **Exercise video** — auto-attached when exercise selected (requires video URLs in exercises table) | Low |
| 12 | **Unilateral tracking** — left/right auto-detected | Low |
| 13 | **Plyometric inputs** — height, distance, speed | Low |

### Implementation Plan

**Step 1 — Database changes (migration)**
- Add `rpe` column to `exercise_sets` (integer, nullable)
- Add `set_type` column to `exercise_sets` (text, default `'working'`)
- Add `notes` column to `session_exercises` (text, nullable)
- Add `workout_notes` column to `training_sessions` (text, nullable)
- Add `duration_secs` column to `exercise_sets` (integer, nullable) for timed/conditioning
- Add `distance_m` column to `exercise_sets` (numeric, nullable) for conditioning
- Add `calories` column to `exercise_sets` (integer, nullable) for conditioning
- Add `exercise_type` column to `exercises` table (text, default `'strength'`) — values: strength, conditioning, timed, plyometric
- Add `video_url` column to `exercises` table (text, nullable)
- Add `weight_unit` column to `profiles` table (text, default `'kg'`)
- Add `rest_timer_secs` column to `profiles` table (integer, default 90)

**Step 2 — Rebuild LogTab.tsx with sections and new set fields**
- Add three collapsible sections: Warm Up, Exercises, Cool Down
- Each exercise can be dragged/moved between sections (simple move buttons, not full drag-and-drop)
- Set row gains: set_type toggle (W/warmup), RPE input, duration input (shown conditionally based on exercise type)
- Per-exercise notes field (collapsible)
- Per-workout notes field at bottom
- Weight unit display based on user profile preference (convert on display, store in kg)

**Step 3 — Rest timer**
- After marking a set complete, auto-start a countdown timer (default from profile `rest_timer_secs`)
- Floating overlay at bottom showing countdown with skip button
- Timer beeps/vibrates on completion (using Web Audio API or navigator.vibrate)

**Step 4 — Supersets**
- Add a "Link as Superset" button when 2+ exercises exist
- Visual grouping with a colored sidebar connector
- Uses existing `superset_group` column on `session_exercises`

**Step 5 — Conditioning & timed exercise support**
- When exercise_type is `conditioning` or `timed`, show appropriate input fields instead of standard weight/reps
- Auto-detect from exercise metadata

**Step 6 — Week strip**
- Horizontal scrollable strip showing Mon-Sun at top of active session, tappable to navigate to that day's workout

**Step 7 — Exercise video placeholder**
- Show video_url (if present) as an expandable thumbnail under exercise name
- Seed a few video URLs for common exercises

**Files to create/edit:**
- New migration SQL
- `src/components/train/LogTab.tsx` — major rebuild
- `src/components/train/RestTimer.tsx` — new component
- `src/integrations/supabase/types.ts` — auto-updated
- `src/pages/TrainPage.tsx` — minor (no structural changes needed)

This is a large rebuild of the LogTab. Steps 1-4 are the critical path. Steps 5-7 add polish. All will be done in one pass.

