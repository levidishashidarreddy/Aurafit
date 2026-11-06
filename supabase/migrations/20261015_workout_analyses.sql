-- GYM HUB: Workout Analyses Migration for AI Workout Assessment

CREATE TABLE IF NOT EXISTS public.workout_analyses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  rating NUMERIC(3,1) NOT NULL CHECK (rating >= 0 AND rating <= 10),
  rating_explanation TEXT NOT NULL,
  progress_summary TEXT NOT NULL,
  improvements JSONB DEFAULT '[]'::jsonb,
  stagnations JSONB DEFAULT '[]'::jsonb,
  fatigue_cautions TEXT,
  next_session_tips TEXT,
  data_limitations TEXT,
  model_metadata TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_workout_analyses_user ON public.workout_analyses(user_id);
CREATE INDEX IF NOT EXISTS idx_workout_analyses_session ON public.workout_analyses(session_id);

ALTER TABLE public.workout_analyses ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own workout analyses" ON public.workout_analyses;
CREATE POLICY "Users manage own workout analyses" ON public.workout_analyses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
