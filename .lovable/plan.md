## Where things stand

The skeleton from the first build already includes:
- Manual activity logging (steps, minutes, workout type, intensity) — card on `/app`
- Manual weight logging (weight, body fat) — card on `/app`
- A summary dashboard (weekly minutes, steps, latest weight, progress bar)
- The AI narrative engine (`generateChapter`) producing prologue, daily teaser, and weekly chapter, with a rolling story summary fed back into future prompts

So this round is about **upgrading** each of those from "exists" to "feels like a product." No new external integrations.

## What I'll build

### 1. Manual workout log — dedicated page `/log/workout`
- Full form (date picker, workout type dropdown with common presets + custom, intensity, steps, active minutes, notes)
- Recent workouts list (last 30 days), grouped by week, with edit & delete
- Quick "log yesterday" shortcut
- Keep the small quick-log card on `/app` as a shortcut

### 2. Manual weigh-in log — dedicated page `/log/weight`
- Full form (date, weight kg, body fat %, muscle kg, optional note)
- Trend chart (last 90 days, line chart via Recharts — already in shadcn stack)
- Table of recent entries with edit & delete
- 7-day and 30-day averages, delta vs. starting weight

### 3. Activity dashboard — upgrade `/app`
- Hero strip: streak (consecutive days with activity), weekly minutes ring, weekly steps, latest weight delta
- 14-day activity bar chart (minutes per day, colored by goal hit/miss)
- "This week vs last week" comparison tiles
- Story status panel: last chapter, days until next weekly chapter, button to generate
- Keep the inline quick-log cards but make the bigger forms live on the dedicated pages

### 4. Story progression engine — upgrades to what exists
- **Auto-cadence rules** enforced server-side in `generateChapter`:
  - Prologue: only once
  - Daily teaser: max one per calendar day
  - Weekly chapter: at most once per 7 days, requires at least 3 activity-days in window
- **Arc tracking**: persist `current_arc` in `story_state` and pass it into the prompt so the AI advances a named arc instead of drifting
- **Branching tone**: snapshot already classifies hit/miss/idle; expand to four bands (crushed it / hit / near-miss / dormant) so prose tone is clearer
- **Chapter unlock UI**: on `/app`, show "Next weekly chapter unlocks after N more active days" when criteria aren't met, with a disabled button + tooltip
- **Library polish** (`/library`): group by week, show locked/unread badges, show the activity snapshot that produced each chapter ("Born from: 4 workouts, 142 min")

### 5. Narrative challenges (new)
A "challenge" = a short, AI-written, genre-flavored micro-goal tied to a real fitness target with a deadline. Examples: "Cross the Marrow Pass — 3 workouts in the next 5 days." If completed, the next chapter incorporates the victory; if missed, it incorporates the setback.

- New table `story_challenges` (title, narrative_hook, metric, target, deadline, status: active/completed/failed, linked chapter on resolution)
- Server fn `generateChallenge` — AI proposes a challenge using current arc + recent activity
- Server fn `evaluateChallenges` — called on dashboard load; auto-marks completed/failed based on activity in the window
- `/app` shows active challenge card with progress bar; library lists past challenges
- One active challenge at a time to keep it focused

## Technical notes

- New route files: `src/routes/_authenticated/log.workout.tsx`, `src/routes/_authenticated/log.weight.tsx`
- Extend `dashboard.functions.ts` with `updateActivity`, `deleteActivity`, `updateWeight`, `deleteWeight`
- New `src/lib/challenges.functions.ts` with `generateChallenge`, `getActiveChallenge`, `evaluateChallenges`
- Migration: create `story_challenges` table with RLS + grants scoped to `auth.uid()`
- Charts via Recharts (already in the shadcn dependency set)
- All AI calls keep using `google/gemini-3-flash-preview` through the existing `chatCompletion` helper

## Out of scope for this pass
- Push/email notifications when a chapter unlocks
- Real device sync (Apple Watch / Withings)
- Audio narration of chapters
- Social / sharing
