CREATE TYPE public.challenge_metric AS ENUM ('active_minutes', 'steps', 'workouts');
CREATE TYPE public.challenge_status AS ENUM ('active', 'completed', 'failed');

CREATE TABLE public.story_challenges (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title text NOT NULL,
  narrative_hook text NOT NULL,
  metric public.challenge_metric NOT NULL,
  target_value integer NOT NULL CHECK (target_value > 0),
  starts_on date NOT NULL DEFAULT CURRENT_DATE,
  deadline date NOT NULL,
  status public.challenge_status NOT NULL DEFAULT 'active',
  progress_value integer NOT NULL DEFAULT 0,
  resolution_chapter_id uuid REFERENCES public.story_chapters(id) ON DELETE SET NULL,
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.story_challenges TO authenticated;
GRANT ALL ON public.story_challenges TO service_role;

ALTER TABLE public.story_challenges ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users manage own challenges" ON public.story_challenges
  FOR ALL TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

CREATE TRIGGER set_story_challenges_updated_at
  BEFORE UPDATE ON public.story_challenges
  FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE INDEX story_challenges_user_status_idx
  ON public.story_challenges(user_id, status, deadline);