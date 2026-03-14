

## Fix: Rebuild Training Logger UI to Match Master Design

### Problem
The current LogTab UI is cluttered with too many visible controls (TYPE toggle, RPE column, move buttons, section counters) and doesn't match the clean, minimal master design mockup. The session header is oversized, section headers are plain text instead of colored banners, and set rows have too many columns for mobile.

### What the Master Design Shows (image-7)
- **Programme title**: Large display font "FUNCTIONAL BB A" at top
- **Subtitle**: "Week 3 · Day 1 · Main Block"
- **Section headers**: Colored pill banners — amber "🔥 WARM UP", cyan "⚡ MAIN EXERCISES"
- **Exercise cards**: Name left, RIR badge right, summary line "4 × 8 · Hinge" below name
- **Set rows**: Clean 4 columns only — `S1` label, `Weight` (green bg when complete + ✓), `Reps` (green + ✓), `RIR`
- **Session timer**: Compact badge in top-right corner "45:32", not a big banner bar
- **"+ Add Exercise"**: Simple dashed border button at bottom
- **No visible**: RPE column, TYPE toggle per set, move section buttons, superset buttons (these should be behind overflow/long-press)

### What the Current UI Shows (image-6) — Problems
- Oversized session header bar taking up too much space
- "TYPE" column and set_type toggle button on every row
- RPE column always visible (too cramped on mobile)
- Section headers are plain mono text with count numbers
- Move buttons (→ Warm Up, → Cool Down, ∞ Superset) always visible under each exercise
- No programme name displayed prominently
- No exercise summary line (sets × reps · pattern)

### Changes

**File: `src/components/train/LogTab.tsx`** — Major UI restructure

1. **Session header**: Replace the big bar with a compact layout — programme name as large `font-display` title at top, timer as a small badge in the top-right corner. Cancel (X) and FINISH as small buttons beside the timer.

2. **Section headers**: Replace plain `Collapsible` text with colored pill/banner bars:
   - Warm Up: amber/orange background pill `bg-amber-500/10 text-amber-500 border-amber-500/20`
   - Main Exercises: cyan/primary background pill `bg-primary/10 text-primary border-primary/20`
   - Cool Down: blue/ice background pill `bg-sky-500/10 text-sky-500 border-sky-500/20`

3. **Exercise card header**: Show name on left, RIR badge on right. Add summary line below name: `{sets.length} × {reps} · {movement_pattern}`. Remove trash icon from header (move to overflow or swipe). Remove chevron toggle — tap anywhere on header to expand.

4. **Set rows**: Simplify to 4 columns only:
   - `S1`/`S2` label (small mono text, not a toggle button)
   - Weight input (shows green background + ✓ icon when completed)
   - Reps input (shows green background + ✓ icon when completed)
   - RIR input
   - Remove RPE from visible row (keep in data model, access via notes/overflow)
   - Remove set_type toggle button from row (default to working, set type accessible via long-press or menu)

5. **Move/superset buttons**: Hide behind a "···" overflow menu or collapse into the Notes section. Not visible by default.

6. **Completed set styling**: Green background `bg-emerald-500/10` with `text-emerald-500` and a small ✓ checkmark inside the input, matching the master design.

7. **"+ Add Exercise" button**: Keep the dashed border style but move below the last section.

**No other files need changes** — this is purely a UI/layout restructure of the LogTab render methods. All data logic, state management, and Supabase interactions remain identical.

