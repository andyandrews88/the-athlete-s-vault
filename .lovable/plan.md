

## Problem

The pre-session view in LogTab (lines 506-547) was reduced to a minimal single card with small text links during the drill-down restructuring. The original visual flow — prominent workout cards with exercise previews, movement pattern pips, and a clear programme header — was replaced with flat buttons inside one card.

## Plan

**File: `src/components/train/LogTab.tsx`** — Replace lines 506-547 (the `!isSessionActive && !finished && !isEditing` block)

### 1. Programme Header Section
- If active programme: large programme name (Bebas Neue 22px), "Week 1 · Day X" badge (JetBrains Mono 9px, cyan bg), "View Programme →" and "Switch →" links
- If no programme: prominent CTA card with dumbbell icon, "Choose a Programme" heading, cyan border, navigates to `/programmes`

### 2. Workout Card Browser
- Each `programme_workout` rendered as a full visual card (not a flat button):
  - Card: `bg hsl(var(--bg2))`, `border hsl(var(--border))`, `border-radius 12px`, `padding 16px`
  - Header: "DAY {n}" badge (JetBrains Mono 8px dim) + workout name (Inter 14px semibold)
  - Exercise preview list: up to 5 exercises from `prescribed_exercises`, each showing:
    - Movement pattern color pip (4px circle using existing `pipColor()`)
    - Exercise name (Inter 11px)
    - Sets × reps target (JetBrains Mono 9px dim)
  - If more than 5: "+X more" label
  - Selected state: cyan border + subtle cyan bg glow
  - On tap: selects that workout (toggles `selectedWorkout`)

### 3. Action Buttons (below cards)
- "Begin Session →" primary cyan button (only enabled when a workout is selected OR as free session)
- "🏋️ Build Workout" outline button for free sessions (starts session without programme workout)

### 4. Keep Week Strip
- WeekStrip stays at top, unchanged

No other files touched. No changes to active session, drill-down, edit mode, or any other component.

