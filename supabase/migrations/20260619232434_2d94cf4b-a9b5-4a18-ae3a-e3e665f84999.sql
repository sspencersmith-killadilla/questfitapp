ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS weekly_goal_steps integer NOT NULL DEFAULT 35000,
  ADD COLUMN IF NOT EXISTS weekly_goal_workouts integer NOT NULL DEFAULT 3,
  ADD COLUMN IF NOT EXISTS starting_weight_kg numeric;