
-- Enums
CREATE TYPE public.story_genre AS ENUM ('fantasy', 'scifi', 'mystery', 'slice_of_life');
CREATE TYPE public.activity_source AS ENUM ('manual', 'withings', 'apple_health');
CREATE TYPE public.chapter_type AS ENUM ('daily_teaser', 'weekly_chapter', 'prologue');

-- Profiles
CREATE TABLE public.profiles (
  id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  display_name TEXT,
  chosen_genre public.story_genre,
  onboarding_complete BOOLEAN NOT NULL DEFAULT false,
  weekly_goal_minutes INTEGER NOT NULL DEFAULT 150,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.profiles TO authenticated;
GRANT ALL ON public.profiles TO service_role;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage their own profile" ON public.profiles FOR ALL USING (auth.uid() = id) WITH CHECK (auth.uid() = id);

-- Activity entries (steps, workouts)
CREATE TABLE public.activity_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source public.activity_source NOT NULL DEFAULT 'manual',
  steps INTEGER NOT NULL DEFAULT 0,
  active_minutes INTEGER NOT NULL DEFAULT 0,
  workout_type TEXT,
  intensity TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX activity_entries_user_date_idx ON public.activity_entries(user_id, entry_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.activity_entries TO authenticated;
GRANT ALL ON public.activity_entries TO service_role;
ALTER TABLE public.activity_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own activity" ON public.activity_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Weight entries
CREATE TABLE public.weight_entries (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  source public.activity_source NOT NULL DEFAULT 'manual',
  weight_kg NUMERIC(6,2) NOT NULL,
  body_fat_pct NUMERIC(5,2),
  muscle_kg NUMERIC(6,2),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX weight_entries_user_date_idx ON public.weight_entries(user_id, entry_date DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.weight_entries TO authenticated;
GRANT ALL ON public.weight_entries TO service_role;
ALTER TABLE public.weight_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own weight" ON public.weight_entries FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Story state (one row per user)
CREATE TABLE public.story_state (
  user_id UUID NOT NULL PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  story_bible JSONB NOT NULL DEFAULT '{}'::jsonb,
  rolling_summary TEXT NOT NULL DEFAULT '',
  current_arc TEXT,
  protagonist_name TEXT,
  last_generated_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_state TO authenticated;
GRANT ALL ON public.story_state TO service_role;
ALTER TABLE public.story_state ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own story state" ON public.story_state FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- Story chapters
CREATE TABLE public.story_chapters (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  chapter_type public.chapter_type NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  activity_snapshot JSONB NOT NULL DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX story_chapters_user_idx ON public.story_chapters(user_id, created_at DESC);
GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_chapters TO authenticated;
GRANT ALL ON public.story_chapters TO service_role;
ALTER TABLE public.story_chapters ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own chapters" ON public.story_chapters FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- updated_at trigger
CREATE OR REPLACE FUNCTION public.set_updated_at() RETURNS TRIGGER
LANGUAGE plpgsql SET search_path = public AS $$
BEGIN NEW.updated_at = now(); RETURN NEW; END; $$;

CREATE TRIGGER profiles_set_updated_at BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER story_state_set_updated_at BEFORE UPDATE ON public.story_state
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

-- Auto-create profile + story_state on signup
CREATE OR REPLACE FUNCTION public.handle_new_user() RETURNS TRIGGER
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO public.profiles (id, display_name)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'display_name', split_part(NEW.email, '@', 1)));
  INSERT INTO public.story_state (user_id) VALUES (NEW.id);
  RETURN NEW;
END; $$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
