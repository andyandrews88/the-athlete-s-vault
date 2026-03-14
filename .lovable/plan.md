

## Training Module Code Audit Results

### Issues Found

**Bug 1 — WeekStrip ref warning (console error)**
React warns "Function components cannot be given refs" because `TabsContent` tries to pass a ref to `WeekStrip`. Fix: wrap `WeekStrip` with `React.forwardRef`.

**Bug 2 — No per-set completion control**
Individual set rows have no way to mark them complete. The only completion path is the "Complete Set" button, which auto-finds the first uncompleted set with data. This means you can't complete sets out of order and there's no visual tap target on each row. Fix: add a checkmark/button on each set row to complete it individually.

**Bug 3 — Weight display value flicker risk**
Line 371: `set.completed ? (toDisplay(set.weight_kg) ?? '') : (set.weight_kg !== null ? toDisplay(set.weight_kg) ?? '' : '')` — this double-converts on every render even when not completed. Simplify to always show `toDisplay(set.weight_kg) ?? ''`.

**Bug 4 — Notes toggle doesn't work as expected**
Line 509: `updateNotes(exIdx, ex.notes || ' ')` — clicking "Notes" when notes is empty sets it to a single space, which makes the textarea appear. But clicking again won't hide it because `' '` is truthy. The toggle logic is one-way. Fix: add a proper toggle — if notes are showing, allow collapsing.

**Bug 5 — Missing delete exercise capability**
Once an exercise is added to a session, there's no way to remove it. Users need a remove/delete button per exercise card.

**Bug 6 — Session can't be cancelled**
After starting a session, there's no cancel/discard button. Only "FINISH" exists. Users need a way to abandon a workout.

**Bug 7 — Complete Set button doesn't show for conditioning exercises**
Line 490: condition is `s.reps && s.weight_kg` for strength — but conditioning exercises use duration/distance/calories, not reps+weight. The condition `isTimed && s.duration_secs` handles timed, but conditioning exercises that only have distance or calories filled (without duration) won't trigger the button.

**Minor — exercise_sets and session_exercises missing DELETE RLS policies**
Users can't delete individual sets or exercises from sessions. Not critical now since the UI doesn't support deletion yet, but needs adding when delete UI is built.

### Implementation Plan

**Step 1 — Fix WeekStrip ref warning**
Wrap the component with `React.forwardRef` so `TabsContent` can pass its ref without warning.

**Step 2 — Add per-set completion checkbox + fix Complete Set conditions**
Add a small checkmark button at the end of each set row. Fix the conditioning exercise completion condition to also check for distance_m or calories.

**Step 3 — Fix notes toggle, weight display, and add exercise delete + session cancel**
- Notes: toggle visibility properly (show/hide)
- Weight display: simplify the value expression
- Add a trash icon on each exercise card header
- Add a "Cancel Workout" button next to FINISH

**Step 4 — Add DELETE RLS policies**
Migration to add DELETE policies for `exercise_sets` and `session_exercises` so future delete operations work.

### Files to edit
- `src/components/train/WeekStrip.tsx` — add forwardRef
- `src/components/train/LogTab.tsx` — per-set completion, notes toggle fix, weight display fix, delete exercise, cancel session, conditioning completion fix
- New migration — DELETE RLS policies

