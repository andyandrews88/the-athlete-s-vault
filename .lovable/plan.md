

## Fix: Remove `next-themes` from package.json

### Root Cause
The `next-themes` package (v0.3.0) is still present in `package.json` line 54. This package depends on React and creates a separate React context. Even though no code imports it anymore, bundlers can still resolve it in ways that cause duplicate React instances — which is why the Vite aliases alone didn't fix it.

The error `Cannot read properties of null (reading 'useRef')` at `TooltipProvider` is the classic symptom of two React copies: hooks resolve against a different React instance than the one rendering the component tree.

### Plan
1. **Remove `next-themes` from `package.json`** — delete the `"next-themes": "^0.3.0"` line from the dependencies section. This is the only change needed.

No other files need to be touched. The `sonner.tsx` already hardcodes `theme="dark"` and doesn't import `next-themes`. The Vite aliases are already in place as a safety net.

### Technical Detail
- File: `package.json`
- Change: Remove line `"next-themes": "^0.3.0",` from `dependencies`
- This triggers a fresh `npm install` / `bun install` which removes the duplicate React from `node_modules`

