

# Fix Food Search Dropdown - 5 Issues

## Issues Found

After reviewing the current code, here are the specific problems and fixes:

### 1. Dropdown z-index too low
`zIndex: 40` on line 362 -- needs to be at least `100` to render above other elements.

### 2. CORS headers incomplete
`supabase/functions/_shared/cors.ts` is missing Supabase client platform headers. The Supabase JS client sends `x-supabase-client-platform`, `x-supabase-client-platform-version`, etc. If these aren't in `Access-Control-Allow-Headers`, the preflight fails silently and the invoke returns an error.

### 3. Error toast not shown
In `searchFood` (line 91), the error is caught and logged to console but never shown to the user. Need to add a toast on error.

### 4. Data mapping -- already correct
`data?.foods` is already used on line 92. No change needed here, but will add a `console.log` during debug and ensure robustness.

### 5. Click-on-result race condition
The `mousedown` outside-click handler (line 109-115) fires before the button's `onClick`, so clicking a result closes the dropdown before the selection registers. Fix: use `onMouseDown` with `e.preventDefault()` on result buttons to prevent blur/outside-click from firing, OR switch to a delayed close.

## Plan

### Step 1: Update CORS headers
**File: `supabase/functions/_shared/cors.ts`**
Add the missing Supabase client headers to `Access-Control-Allow-Headers`.

### Step 2: Fix MacrosTab.tsx (3 changes)
**File: `src/components/nutrition/MacrosTab.tsx`**
- Change dropdown `zIndex` from `40` to `100`
- Add error toast in `searchFood` catch block
- Add `onMouseDown={(e) => e.preventDefault()}` to each result button so the outside-click handler doesn't steal the click

### Step 3: Redeploy edge function
Deploy `food-search` after CORS fix.

## Technical Details

The `mousedown` prevention is the key fix. The outside-click handler listens on `document mousedown`. When you click a dropdown result, `mousedown` fires on the document first, the handler sees the click is outside `searchContainerRef` (the result buttons ARE inside it, so this should work -- but the dropdown may be portaled or the ref boundary is wrong). Actually, looking again, the dropdown IS inside `searchContainerRef`, so the outside-click handler should not be the issue. The more likely culprit is that the CORS failure means no results ever appear. Let me re-check...

The dropdown renders inside `searchContainerRef` (line 277), so clicks on results are inside the ref. The outside-click handler should not interfere. The real blocker is likely the CORS preflight failure -- the invoke silently fails, `searchResults` stays empty, and the dropdown shows "No foods found."

So the primary fix is the CORS headers. The z-index and error toast are secondary but still important.

