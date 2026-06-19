# QuestFit — AI Narrative Fitness Tracker

A multi-user fitness app where your real activity drives a serialized AI-generated story. Pick a genre at onboarding; your steps, workouts, and weight trend shape weekly chapters and daily teasers.

## What we're building (v1 scope)

- **Auth**: Email/password + Google sign-in. Each user has a profile (display name, chosen genre, current story state).
- **Data inputs**:
  - **Withings scale**: full OAuth connection — weight, body fat, muscle mass auto-sync via webhook.
  - **Apple Watch**: manual entry form (steps, workout type, duration, intensity). Designed so a Terra/Rook integration can drop in later without UI changes.
- **Dashboard**: today's activity ring, weight trend chart, weekly goal progress, streak counter, "next chapter unlocks in…" indicator.
- **Story engine**:
  - Onboarding picks genre: Epic Fantasy, Sci-fi Survival, Mystery, or Slice-of-life.
  - **Daily teaser** (~150 words) generated each morning from yesterday's activity — a hint, a cliffhanger, a small character beat.
  - **Weekly chapter** (~800–1200 words) generated on a fixed day, driven by the week's aggregated metrics: total active minutes, workout count, weight delta vs. goal, consistency score.
  - Story branches: hitting goals unlocks "heroic" arcs; missed goals push the protagonist into struggle/setback arcs (motivating, never shaming).
  - Persistent narrative memory — each generation receives a story-so-far summary so characters and plot stay consistent.
- **Library view**: read all past chapters, see which activity unlocked each one.
- **Notifications**: in-app banner when a new chapter unlocks; optional email digest (later).

## Technical approach

**Stack**: TanStack Start + Lovable Cloud (Postgres, Auth, server functions) + Lovable AI (Gemini for narrative generation).

**Database (all RLS-protected, scoped to `auth.uid()`)**:
- `profiles` — display_name, chosen_genre, story_bible (JSON: characters, world, ongoing arcs), onboarding_complete
- `activity_entries` — date, source (`withings` | `manual` | future `apple_health`), metric_type, value, raw_payload
- `weight_entries` — date, weight_kg, body_fat_pct, muscle_kg, source
- `withings_connections` — user_id, access_token, refresh_token, expires_at, withings_user_id (service-role only)
- `story_chapters` — week_number, chapter_type (`daily_teaser` | `weekly_chapter`), title, content, activity_snapshot (JSON), generated_at, read_at
- `story_state` — current arc summary, recent plot points (rolling summary so we don't blow the AI context)

**Server functions** (`createServerFn`, all auth-gated):
- `logManualActivity` — insert into activity_entries
- `getDashboardData` — today + week aggregates
- `getStoryLibrary` — paginated chapter list
- `generateDailyTeaser` / `generateWeeklyChapter` — calls Lovable AI Gateway (`google/gemini-3-flash-preview`) with story bible + activity snapshot, updates story_state summary

**Server routes** (raw HTTP):
- `/api/public/withings/callback` — OAuth code exchange
- `/api/public/withings/webhook` — receives Withings push notifications, fetches new measurements via their API, inserts rows
- `/api/public/cron/generate-stories` — called by pg_cron daily/weekly to fan out generation per user

**Withings integration**: standard OAuth 2.0 flow. We'll need you to register a Withings developer app and provide Client ID + Secret (stored as secrets). The webhook URL will be the stable preview URL we give you.

**Story prompt strategy**: each generation receives (1) genre + tone, (2) compact story bible (characters, setting, current arc — kept <500 tokens via rolling summary), (3) activity snapshot for the period, (4) instruction to advance plot and end on a hook. After generation, a second small AI call updates the rolling summary.

## Out of scope for v1 (can add later)

- Real Apple Watch sync (requires Terra/Rook subscription or native companion app)
- Social features (friends, shared stories)
- Push notifications (email digest only initially)
- Audio narration / TTS chapters
- Payments

## What I'll need from you after approval

1. A Withings developer account → Client ID and Secret (I'll walk you through it)
2. Confirmation that Lovable Cloud + Lovable AI can be enabled (no external accounts needed for those)

## Build order

1. Enable Lovable Cloud, set up auth (email + Google), profiles table, onboarding flow with genre picker
2. Dashboard shell + manual activity entry form + weight entry
3. Withings OAuth + webhook + auto-sync
4. Story engine: schema, AI generation server functions, manual "generate now" button for testing
5. Cron wiring for daily teaser / weekly chapter, library view, unlock animations
6. Polish: streaks, charts, empty states, onboarding tour
