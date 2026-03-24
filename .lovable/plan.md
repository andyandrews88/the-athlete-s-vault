

# Fix Programme Display + Exercise Drill-Down Page

## Problem 1: "CrossFit" Showing Incorrectly
The pre-session view always shows the active programme name from `training_programmes` where `is_active = true`. The user never intentionally selected CrossFit — it was likely auto-assigned by the audit flow (now removed). The fix: if the user has an active programme, show its actual name. The display is correct code-wise — the data in the database is wrong. We should also add a "no programme" fallback so if the programme name seems stale, the user can easily change it. However, the "Week 1" badge is hardcoded — it should show the actual current week.

**Fix**: The "Week 1" badge on line 503 is hardcoded text. Calculate the actual week number based on programme start date. Also, the user may need to deactivate CrossFit from their `training_programmes` — but that's a data issue, not a code issue. The code correctly shows whatever is active.

## Problem 2: Exercise Drill-Down (Full-Screen Page)
Currently, clicking an exercise expands it inline (accordion style). The user wants clicking an exercise to open a **full-screen drill-down page** — dedicated to that exercise (and its superset partner if linked).

### New Component: `ExerciseDrillDown.tsx`
A full-screen overlay/page that shows when an exercise is tapped in the workout overview.

**Layout (inspired by TrainHeroic screenshot):**
- **Header**: Back arrow + exercise name (large, Inter 18px bold) + ⋮ menu (action sheet)
- **Previous session info**: "LAST: 3×8 @ 80kg" and "WORKING MAX: 90kg" — card style
- **Set table**: Much larger inputs than current — SET | REPS | WEIGHT | completion circle
  - Each row ~56px tall (vs current ~28px)
  - Inputs: JetBrains Mono 16px (vs current 9px)
  - Completion circle: 36px diameter, cyan border, checkmark when done
- **Add/Remove set**: +/- buttons centered below sets
- **Notes**: "Add exercise note" input at bottom
- **Footer**: Back | Timer | Next navigation

**Superset handling**: If the exercise has a `supersetGroup`, find all exercises in that group. Show them stacked on the same drill-down page with a divider and "SUPERSET" label.

### Files to Create/Edit

1. **Create `src/components/train/ExerciseDrillDown.tsx`**
   - Full-screen overlay (z-index 50, bg hsl(var(--bg)))
   - Props: exerciseIndices (number[]), exercises from store, all callbacks
   - Large touch-friendly inputs
   - Previous session data display
   - Action sheet trigger (⋮ → existing ExerciseActionSheet)
   - WeightNumpad integration (same as ExerciseCard)
   - Back/Next navigation between exercises

2. **Edit `src/components/train/LogTab.tsx`**
   - Change exercise cards to be collapsed summary-only (non-expandable)
   - Each card shows: name, set count, completion status
   - On tap → open ExerciseDrillDown with that exercise's index
   - If exercise is in a superset group, pass all indices in that group
   - New state: `drillDownIndices: number[] | null`
   - Remove inline expansion logic (exercises always show collapsed in overview)

3. **Edit `src/components/train/ExerciseCard.tsx`**
   - Add an `onClick` prop for the card tap action
   - Remove the inline expanded content (moved to drill-down)
   - Card becomes a compact summary row only

### Drill-Down UI Detail

```text
┌─────────────────────────────┐
│ ← Back    Overhead Press  ⋮ │
│                              │
│ ┌──────────────────────────┐ │
│ │ LAST         WORKING MAX │ │
│ │ 3×8 @ 60kg      70kg    │ │
│ └──────────────────────────┘ │
│                              │
│  Sets   Reps    Kg      ✓   │
│ ┌──┐  ┌─────┐ ┌─────┐ (○)  │
│ │ 1│  │  8  │ │ 60  │      │
│ └──┘  └─────┘ └─────┘      │
│ ┌──┐  ┌─────┐ ┌─────┐ (○)  │
│ │ 2│  │  8  │ │ 60  │      │
│ └──┘  └─────┘ └─────┘      │
│                              │
│     (−)    Set    (+)        │
│                              │
│ ┌──────────────────────────┐ │
│ │ Add exercise note...     │ │
│ └──────────────────────────┘ │
│                              │
│ ← Back   ⏱ Timer    Next → │
└─────────────────────────────┘
```

- Inputs are large (height 48px, font 16px)
- Completion circles are 36px cyan rings
- RIR shown as optional row or inline
- "+ Set" / "- Set" as prominent round buttons

### Week Number Fix
Calculate actual week from programme start date or default to week 1. Replace hardcoded "Week 1" on line 503.

