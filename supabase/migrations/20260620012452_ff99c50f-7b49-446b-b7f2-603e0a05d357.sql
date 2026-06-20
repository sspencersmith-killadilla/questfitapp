
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS narrator_voice_id text NOT NULL DEFAULT 'JBFqnCBsd6RMkjVDRZzb',
  ADD COLUMN IF NOT EXISTS playback_speed numeric NOT NULL DEFAULT 1.0,
  ADD COLUMN IF NOT EXISTS autoplay_next boolean NOT NULL DEFAULT true;

DO $$ BEGIN
  CREATE TYPE public.audio_status AS ENUM ('idle', 'pending', 'ready', 'failed');
EXCEPTION WHEN duplicate_object THEN NULL; END $$;

ALTER TABLE public.story_chapters
  ADD COLUMN IF NOT EXISTS audio_path text,
  ADD COLUMN IF NOT EXISTS audio_duration_seconds integer,
  ADD COLUMN IF NOT EXISTS audio_status public.audio_status NOT NULL DEFAULT 'idle',
  ADD COLUMN IF NOT EXISTS audio_error text,
  ADD COLUMN IF NOT EXISTS audio_voice_id text;
