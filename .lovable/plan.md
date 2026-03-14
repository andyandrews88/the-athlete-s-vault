

# The Vault -- Master Build Document vs Current Build: Deep Analysis

---

## 1. DOES THE MASTER BUILD DOCUMENT CONTAIN EVERYTHING NEEDED?

**Yes.** The 33-page document is a complete product specification covering brand philosophy, access model (Free/Paid), onboarding, audit, training (logger + analytics + programmes), nutrition (hand portions + detailed tracking + Nutritionix API), lifestyle (check-in + non-negotiables + weekly reflection), progress (photos + measurements + InBody), AI assistant (RAG + Claude), knowledge library, community (channels + threads + DMs), payments (Stripe + LKR/USD), admin panel (Monday morning dashboard + programme builder + workout builder + client management), notifications, profile/settings, and technical requirements. It is the single source of truth for the entire product.

---

## 2. COMPLETE FEATURE INVENTORY

### SECTION 1: Brand and Design Language
| Requirement | Status | Notes |
|---|---|---|
| Dark theme, cyan accent, mobile-first | DONE | Implemented correctly |
| Bebas Neue / DM Sans / JetBrains Mono | DONE | CSS loads all three |
| Fast, no lag, no UI blocking inputs | PARTIAL | AnalyticsTab makes 36+ sequential queries per page load |

### SECTION 2: Access Model (Free vs Paid)
| Requirement | Status | Notes |
|---|---|---|
| Two tiers: Free and Paid | PARTIAL | `profiles.tier` exists (`free` default) but no gating logic anywhere |
| 3 free programmes available to all | NOT BUILT | No programme assignment or enrolment flow |
| AI Assistant 2 prompts/day (free) | NOT BUILT | No AI system at all |
| Non-Negotiables paid-only | NOT BUILT | No non-negotiables feature |
| Feature gating enforcement | NOT BUILT | Every feature is accessible regardless of tier |

### SECTION 3: Onboarding Flow
| Requirement | Status | Notes |
|---|---|---|
| Screen 1: Opening (Andy's face, headline) | PARTIAL | Text matches but no photo of Andy |
| Screen 2: Belief system (3 pillars) | DONE | Working |
| Screen 3: What's Inside (4 feelings) | DONE | Working |
| Screen 4: Audit Gateway (primary + skip) | DONE | Working |
| Post-audit programme recommendation | NOT BUILT | Results page has no programme recommendation |
| CrossFit Ceylon credit in onboarding | NOT DONE | Doc says "credited as such" -- not present |

### SECTION 4: Fitness Audit
| Requirement | Status | Notes |
|---|---|---|
| 6 steps (Bio, Big 4, Engine, Movement, Lifestyle, Review) | DONE | Working |
| Epley formula for 1RM estimation | DONE | `estimate1RM` function exists |
| Scoring (0-100, 4 tiers) | DONE | Working |
| Results page (score, tier, leaks, domains) | DONE | Working |
| AI-generated personalised recap | NOT BUILT | No AI integration |
| Results toggle (radar/scorecard/progress bars) | NOT BUILT | Only progress bars view |
| Retake every 8-12 weeks with before/after | NOT BUILT | No retake flow or comparison |
| Admin-editable movement screen tests | NOT BUILT | Tests are hardcoded |
| Recommended programme on results | NOT BUILT | No programme recommendation |
| Sleep hours, water intake, alcohol in Lifestyle step | PARTIAL | Missing hydration, alcohol, PN habit adherence |

### SECTION 5: Training

#### 5.1 Workout Logger
| Requirement | Status | Notes |
|---|---|---|
| Basic set logging (weight, reps) | DONE | Working |
| RIR tracking per set | **BROKEN** | UI collects RIR but `exercise_sets` table has NO `rir` column -- data is silently lost |
| RPE tracking (optional) | NOT BUILT | No RPE field |
| Three sections: Warm Up / Exercises / Cool Down | NOT BUILT | No section grouping |
| Conditioning exercises (duration, distance, calories, HR) | NOT BUILT | Only strength-type logging |
| Timed exercises (duration replaces reps) | NOT BUILT | No duration field |
| Unilateral exercises (L/R tracking) | NOT BUILT | No laterality support |
| Plyometric exercises (height, distance, speed) | NOT BUILT | No plyo-specific inputs |
| Set type: Warmup vs Working | NOT BUILT | No set type distinction |
| Weight stored in lbs, displayed in preference | NOT BUILT | Stored as kg, no unit toggle |
| Supersets | NOT BUILT | `superset_group` column exists on `session_exercises` but no UI |
| Rest timer (configurable default) | NOT BUILT | No rest timer |
| Exercise video attachment | NOT BUILT | No video URLs on exercises |
| Notes per exercise and per workout | NOT BUILT | No notes fields |
| PR detection | DONE | Working |
| Exercise search with autocomplete | DONE | Working |

#### 5.2 Movement Pattern Framework
| Requirement | Status | Notes |
|---|---|---|
| 11 movement patterns tracked | PARTIAL | `movementPatterns.ts` has 11 patterns but they don't match the spec exactly. Spec: Hinge/Squat/Push/Pull/Single Leg/Core/Carry/Olympic/Isolation/Plyometric/Rotational. Code: Hinge/Squat/Push/Pull/Carry/Lunge/Rotation/Jump/Sprint/Swim/Row |
| Equipment modifiers | NOT BUILT | Doc says barbell=1.0 baseline with modifiers for other equipment. Not implemented |
| Bodyweight multipliers | NOT BUILT | |
| Plyometric GCV formula | NOT BUILT | |

#### 5.3 NTU System
| Requirement | Status | Notes |
|---|---|---|
| Raw volume = weight x reps | DONE | |
| Difficulty coefficients per pattern | DONE | Working |
| Equipment modifiers | NOT BUILT | |
| Bodyweight exercises use BW multipliers | NOT BUILT | |

#### 5.4 Training Analytics
| Requirement | Status | Notes |
|---|---|---|
| Weekly volume (NTU) chart | DONE | Custom bar chart working |
| Volume per movement pattern | NOT BUILT | |
| Week-on-week volume trend per pattern | NOT BUILT | |
| Intensity trend (avg weight vs PRs) | NOT BUILT | |
| Proximity to failure (RIR) trend | BROKEN | Chart exists but RIR column missing from DB so always shows 0 |
| Activity heatmap (consistency calendar) | NOT BUILT | Basic consistency bars only |
| PR board | DONE | In CalendarTab |

#### 5.5 Programmes
| Requirement | Status | Notes |
|---|---|---|
| 3 free fixed programmes | NOT BUILT | `training_programmes` table exists but empty, no pre-seeded programmes |
| Paid adaptive programmes | NOT BUILT | |
| Programme enrolment flow | NOT BUILT | |
| Active programme name in LogTab | NOT BUILT | Table + FK exist, no UI wiring |
| Week-by-week delivery | NOT BUILT | |
| Admin controls how far ahead client sees | NOT BUILT | |

### SECTION 6: Nutrition
| Requirement | Status | Notes |
|---|---|---|
| Hand portion tracker | DONE | Working |
| Detailed macro tracker | DONE | Working |
| Nutritionix API integration | NOT BUILT | No API integration, food is manually entered |
| Barcode scanner | NOT BUILT | |
| Custom food creation | NOT BUILT | |
| Saved meals | NOT BUILT | |
| Nutrition habits checklist (7 items from PN) | NOT BUILT | Not in check-in or nutrition page |
| Hydration tracking | NOT BUILT | |

### SECTION 7: Daily Check-In and Lifestyle
| Requirement | Status | Notes |
|---|---|---|
| Free check-in (sleep, energy, stress, mood, soreness) | DONE | Working |
| Sleep hours (slider 0-14h, 0.5h increments) | NOT BUILT | Current check-in has sleep quality 1-10, not hours |
| Drive/motivation metric | NOT BUILT | Current sliders: sleep/energy/stress/mood/soreness. Doc wants: sleep hours + sleep quality + stress + energy + drive |
| Readiness score (Matthew Walker formula) | NOT BUILT | Doc specifies: `(sleep_hours * 2 + sleep_quality + energy + drive + stress) / 7 * 100` -- not implemented |
| Hydration in check-in | NOT BUILT | |
| Nutrition habits checklist in check-in | NOT BUILT | |
| Non-Negotiables (paid, set by Andy per client) | NOT BUILT | No DB table, no admin UI |
| Weekly Reflection (3 questions) | NOT BUILT | `weekly_reviews` table exists but no user-facing input UI |
| Breathwork (6 methods, guided session) | DONE | Working |

### SECTION 8: Progress Tracking
| Requirement | Status | Notes |
|---|---|---|
| Body weight tracking (daily/weekly, weekly avg) | NOT BUILT | Stub page |
| Body measurements (waist, hips, chest, etc.) | NOT BUILT | No DB table |
| InBody scan manual entry | NOT BUILT | No DB table |
| Progress photos (private bucket, 3 angles, comparison) | NOT BUILT | No storage bucket, no DB table |
| Charts and visualisation | NOT BUILT | |

### SECTION 9: AI Assistant
| Requirement | Status | Notes |
|---|---|---|
| RAG system with knowledge base | NOT BUILT | No edge functions, no AI integration |
| Claude API via Supabase Edge Functions | NOT BUILT | |
| 2 prompts/day free, unlimited paid | NOT BUILT | |
| Andy's voice and methodology | NOT BUILT | |

### SECTION 10: Knowledge Library
| Requirement | Status | Notes |
|---|---|---|
| Content feed (Netflix/YouTube style) | NOT BUILT | Stub page |
| Content types (podcast, video, article, PDF, newsletter) | NOT BUILT | No DB table |
| Filter/search/bookmark | NOT BUILT | |
| Admin: add content via URL, auto-pull metadata | NOT BUILT | |
| New drops highlighted | NOT BUILT | |

### SECTION 11: Community
| Requirement | Status | Notes |
|---|---|---|
| Channels with real-time messaging | NOT BUILT | Stub page |
| Threads (replies to messages) | NOT BUILT | |
| DM to Andy only | NOT BUILT | |
| Link previews | NOT BUILT | |
| Reactions | NOT BUILT | |
| Admin: polls, pins, announcements | NOT BUILT | |

### SECTION 12: Payments
| Requirement | Status | Notes |
|---|---|---|
| Stripe integration | NOT BUILT | |
| LKR primary, USD secondary | NOT BUILT | Pricing page shows LKR but no checkout |
| Manual approval workflow | NOT BUILT | |
| Referral system (rewards on coaching purchase) | NOT BUILT | Referral code generated in profile but no reward logic |

### SECTION 13: Admin Panel
| Requirement | Status | Notes |
|---|---|---|
| Monday morning dashboard (flags, alerts) | NOT BUILT | Admin page is a placeholder |
| Weekly client review (training/nutrition/sleep blocks) | NOT BUILT | |
| Client management (active, inactive, pending) | PARTIAL | AdminClientProfile exists but basic |
| Programme library (build, assign, copy) | NOT BUILT | |
| Workout builder (from library or scratch) | NOT BUILT | |
| Admin can read profiles of all users | PARTIAL | RLS only allows `auth.uid() = id` on profiles -- admin cannot see other users' profiles |
| Community management | NOT BUILT | |
| Library management | NOT BUILT | |
| Audit management (edit movement tests) | NOT BUILT | |
| Business (approvals, capacity, revenue, referrals) | NOT BUILT | |

### SECTION 14: Notifications
| Requirement | Status | Notes |
|---|---|---|
| Push notifications (Web Push VAPID) | NOT BUILT | Doc warns: rotate keys, remove hardcoded fallbacks from previous build |
| Max 3/day free, 5/day paid | NOT BUILT | |
| Quiet hours (10pm-7am) | NOT BUILT | |
| Per-category toggle in settings | NOT BUILT | |

### SECTION 15: Profile and Settings
| Requirement | Status | Notes |
|---|---|---|
| Profile page (name, photo, bio, stats, tier) | NOT BUILT | Stub page |
| Settings (notifications, units, rest timer) | NOT BUILT | Stub page |
| Body and measurements preferences | NOT BUILT | |
| Delete account | NOT BUILT | |

---

## 3. WHAT HAS GONE WRONG

### A. Critical Database Issues

1. **`exercise_sets` is missing `rir` column.** The UI collects RIR per set. The `finishSession` function inserts rows without RIR. Data is silently lost on every workout. The Analytics RIR chart will never show real data. This is the single most critical bug.

2. **Admin RLS is broken.** The `profiles` table RLS policy is `auth.uid() = id` for SELECT. This means admin (Andy) cannot view any client's profile. The admin dashboard and client profile pages literally cannot load other users' data. Same problem exists on `training_sessions`, `daily_checkins`, `goals`, etc. -- all locked to own user.

3. **Roles stored on `profiles.role`.** The Master Build Document doesn't mandate a `user_roles` table, but the system instructions for this platform explicitly require it to prevent privilege escalation. Currently `AdminRoute` checks `profile?.role !== 'admin'` which is a client-side check on a client-fetchable column.

4. **Movement patterns don't match spec.** The spec defines 11 patterns: Hinge, Squat, Push, Pull, Single Leg, Core, Carry, Olympic, Isolation, Plyometric, Rotational. The code has: Hinge, Squat, Push, Pull, Carry, Lunge, Rotation, Jump, Sprint, Swim, Row. The seeded exercises use the code patterns (e.g. "Jump" not "Plyometric", "Lunge" not "Single Leg"). These need to be aligned.

5. **Missing ~20 tables.** The doc references a previous build with 39 tables. The current build has 19. Missing tables needed for: progress photos, body measurements, InBody scans, library content, community channels/messages/threads, weekly reflections (user input -- the existing `weekly_reviews` is coach-generated), non-negotiables, notifications, AI prompt logs, and more.

### B. Code-Level Issues

1. **`finishSession` doesn't persist RIR** because the column doesn't exist in `exercise_sets`.

2. **No readiness score calculation.** The doc specifies Matthew Walker's formula: `(sleep_hours * 2 + sleep_quality + energy + drive + stress) / 7 * 100`. The current check-in doesn't collect sleep hours or drive, and no readiness score is computed.

3. **Check-in sliders don't match spec.** Current: sleep quality, energy, stress, mood, soreness (all 1-10). Spec wants: sleep hours (0-14, 0.5 steps), sleep quality (1-5), stress (1-5), energy (1-5), drive/motivation (1-5), plus hydration and nutrition habits checklist.

4. **AnalyticsTab performance.** The 12-week loop makes up to 36 sequential Supabase queries. This should be a single SQL query or DB function.

5. **`training_programmes` is orphaned.** Table and FK exist. LogTab creates sessions without `programme_id`. No UI to create, select, or display programmes.

### C. Architecture Gaps

1. **No edge functions exist.** The doc requires Claude AI via edge functions for: audit recap generation, AI assistant, and potentially weekly review generation.

2. **No storage buckets.** Progress photos require a private Supabase storage bucket with signed URLs. None exist.

3. **No Stripe integration.** Required for all payment processing.

4. **No Nutritionix integration.** Required for all food search in both nutrition modes.

5. **No state management library.** Doc specifies Zustand per-domain stores. Current code uses local useState everywhere with prop drilling via `useAuth`.

---

## 4. DATABASE TABLES NEEDED (NOT YET CREATED)

Based on the Master Build Document, the following tables are missing:

| Table | Purpose |
|---|---|
| `weekly_reflections` | User submits 3 weekly questions (distinct from coach-generated `weekly_reviews`) |
| `non_negotiables` | Andy-defined per-client daily KPIs |
| `non_negotiable_completions` | Daily completion tracking |
| `progress_photos` | Photo metadata (date, angle, user_id) |
| `body_measurements` | Waist, hips, chest, thighs, arms, neck |
| `body_weight_logs` | Daily/weekly weigh-ins |
| `inbody_scans` | Manual InBody scan entries |
| `library_content` | Content items (type, title, URL, thumbnail, category) |
| `library_bookmarks` | User bookmarks |
| `community_channels` | Named channels |
| `community_messages` | Messages in channels |
| `community_threads` | Thread replies |
| `community_reactions` | Message reactions |
| `direct_messages` | DMs to Andy only |
| `announcements` | Admin announcements/banners |
| `notifications` | Push notification log |
| `notification_preferences` | Per-user per-category toggles |
| `ai_conversations` | AI chat history |
| `ai_prompt_counter` | Daily prompt usage tracking |
| `ai_knowledge_docs` | RAG knowledge base documents |
| `programme_weeks` | Week structure within programmes |
| `programme_workouts` | Individual workouts within weeks |
| `programme_workout_exercises` | Exercises within programme workouts |
| `coaching_applications` | Application for paid coaching |
| `payments` | Stripe payment records |
| `subscriptions` | Active subscription tracking |
| `referral_rewards` | Referral reward tracking |
| `user_roles` | Secure role storage (per system instructions) |
| `user_settings` | Preferences (units, rest timer, quiet hours) |
| `polls` | Community polls |
| `poll_votes` | Poll responses |

---

## 5. RECOMMENDED BUILD ORDER

### PHASE 0: Fix Critical Bugs (do before anything else)
1. Add `rir` column to `exercise_sets`
2. Update `finishSession` to persist RIR
3. Create `user_roles` table + `has_role()` function
4. Fix admin RLS policies (admin can read all user data)
5. Align movement patterns with spec (rename to match 11 official patterns)

### PHASE 1: Complete Training Module
1. Wire `training_programmes` to LogTab
2. Add Warm Up / Main / Cool Down section grouping
3. Add rest timer, notes, set types (warmup/working)
4. Add conditioning/timed/unilateral exercise support
5. Build remaining Analytics charts (movement balance, intensity trend, heatmap)
6. Optimize Analytics queries

### PHASE 2: Fix Lifestyle Check-In
1. Align check-in fields to spec (sleep hours, quality, energy, stress, drive)
2. Implement readiness score formula
3. Add hydration tracking
4. Add nutrition habits checklist
5. Build weekly reflection input UI

### PHASE 3: Progress Module
1. Create tables (body_weight_logs, body_measurements, inbody_scans, progress_photos)
2. Create private storage bucket
3. Build Progress page (3 tracking methods, charts, photo upload/comparison)

### PHASE 4: Programmes System
1. Create programme structure tables
2. Seed 3 free programmes
3. Build programme enrolment flow (from audit results + from LogTab)
4. Build admin programme builder

### PHASE 5: Admin Panel
1. Build Monday morning dashboard
2. Build weekly client review (training/nutrition/lifestyle blocks)
3. Build client management (list, flags, non-negotiables)
4. Build admin workout builder
5. Fix all admin RLS policies

### PHASE 6: Knowledge Library
1. Create `library_content` table
2. Build Library page (feed, search, filter, bookmarks)
3. Build admin content manager (URL paste, auto-pull metadata)

### PHASE 7: Community
1. Create community tables
2. Build channel-based messaging with threads
3. Build DM to Andy
4. Build admin tools (polls, pins, moderation)

### PHASE 8: AI Assistant
1. Set up Claude API key as edge function secret
2. Build RAG edge function
3. Build chat UI with prompt counter
4. Implement knowledge base management in admin

### PHASE 9: Payments
1. Stripe integration via edge function
2. Checkout flow with LKR/USD toggle
3. Manual approval workflow
4. Referral reward system
5. Tier gating enforcement across all features

### PHASE 10: Notifications and Settings
1. Web Push VAPID setup
2. Notification types and rules (max 3/5 per day, quiet hours)
3. Profile page build
4. Settings page (units, notifications, account)

---

## 6. SUMMARY SCORECARD

| Category | Spec Features | Built | Partial | Not Built |
|---|---|---|---|---|
| Onboarding + Auth | 8 | 6 | 1 | 1 |
| Audit | 12 | 5 | 2 | 5 |
| Training (Logger) | 18 | 4 | 1 | 13 |
| Training (Analytics) | 7 | 1 | 1 | 5 |
| Programmes | 8 | 0 | 0 | 8 |
| Nutrition | 10 | 2 | 0 | 8 |
| Lifestyle + Check-In | 12 | 3 | 2 | 7 |
| Progress | 8 | 0 | 0 | 8 |
| AI Assistant | 5 | 0 | 0 | 5 |
| Library | 6 | 0 | 0 | 6 |
| Community | 8 | 0 | 0 | 8 |
| Payments | 6 | 0 | 1 | 5 |
| Admin | 12 | 0 | 2 | 10 |
| Notifications | 5 | 0 | 0 | 5 |
| Profile + Settings | 6 | 0 | 0 | 6 |
| **TOTAL** | **~131** | **~21 (16%)** | **~10 (8%)** | **~100 (76%)** |

The foundation (auth, onboarding, audit, basic logging, basic check-in, basic nutrition) is solid. But approximately 76% of the Master Build Document's features remain unbuilt. The most critical immediate action is fixing the database integrity issues (RIR column, admin RLS, movement pattern alignment) before building new features on a broken foundation.

