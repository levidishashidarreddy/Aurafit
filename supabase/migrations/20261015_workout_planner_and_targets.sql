-- GYM HUB: Workout Planner, Centralized Targets, Body Weight & Activity Summaries Migration

-- 1. Profiles target columns enhancement
ALTER TABLE public.profiles 
  ADD COLUMN IF NOT EXISTS target_protein_min NUMERIC(6,2) DEFAULT 80,
  ADD COLUMN IF NOT EXISTS target_protein_max NUMERIC(6,2) DEFAULT 90,
  ADD COLUMN IF NOT EXISTS target_fibre_min NUMERIC(6,2) DEFAULT 25,
  ADD COLUMN IF NOT EXISTS target_fibre_max NUMERIC(6,2) DEFAULT 30,
  ADD COLUMN IF NOT EXISTS weekly_training_days INT DEFAULT 4;

-- 2. Weight logs unique constraint for canonical daily weight
DO $$ 
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'unique_user_weight_date'
  ) THEN
    ALTER TABLE public.weight_logs 
      ADD CONSTRAINT unique_user_weight_date UNIQUE (user_id, logged_at);
  END IF;
END $$;

-- 3. Daily Activity Summaries (One entry per day by default)
CREATE TABLE IF NOT EXISTS public.daily_activity_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  total_steps INT NOT NULL DEFAULT 0 CHECK (total_steps >= 0),
  active_calories_burned INT NOT NULL DEFAULT 0 CHECK (active_calories_burned >= 0),
  entry_mode TEXT NOT NULL DEFAULT 'daily_summary' CHECK (entry_mode IN ('daily_summary', 'individual_activities')),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_activity_date UNIQUE (user_id, entry_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_activity_user_date ON public.daily_activity_summaries(user_id, entry_date);
ALTER TABLE public.daily_activity_summaries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own daily activity summaries" ON public.daily_activity_summaries;
CREATE POLICY "Users manage own daily activity summaries" ON public.daily_activity_summaries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. Weekly Workout Plans
CREATE TABLE IF NOT EXISTS public.weekly_workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL, -- Monday of the week
  title TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_week UNIQUE (user_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_weekly_plans_user_week ON public.weekly_workout_plans(user_id, week_start_date);
ALTER TABLE public.weekly_workout_plans ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own weekly plans" ON public.weekly_workout_plans;
CREATE POLICY "Users manage own weekly plans" ON public.weekly_workout_plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. Planned Workout Days
CREATE TABLE IF NOT EXISTS public.planned_workout_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.weekly_workout_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  original_date DATE NOT NULL,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Mon, 6=Sun
  title TEXT NOT NULL,
  is_rest_day BOOLEAN DEFAULT FALSE,
  status TEXT NOT NULL DEFAULT 'planned' CHECK (status IN ('planned', 'completed', 'missed', 'rescheduled', 'rest')),
  rescheduled_to_date DATE,
  completed_session_id UUID REFERENCES public.workout_sessions(id) ON DELETE SET NULL,
  order_index INT DEFAULT 0,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_scheduled_date UNIQUE (user_id, scheduled_date)
);

CREATE INDEX IF NOT EXISTS idx_planned_days_user_date ON public.planned_workout_days(user_id, scheduled_date);
ALTER TABLE public.planned_workout_days ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own planned workout days" ON public.planned_workout_days;
CREATE POLICY "Users manage own planned workout days" ON public.planned_workout_days
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 6. Planned Workout Exercises
CREATE TABLE IF NOT EXISTS public.planned_workout_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  planned_day_id UUID NOT NULL REFERENCES public.planned_workout_days(id) ON DELETE CASCADE,
  exercise_id UUID REFERENCES public.exercises(id) ON DELETE CASCADE,
  exercise_name TEXT NOT NULL,
  muscle_group TEXT NOT NULL,
  order_index INT NOT NULL DEFAULT 0,
  planned_sets INT NOT NULL DEFAULT 3,
  target_reps TEXT NOT NULL DEFAULT '8-12',
  target_weight_kg NUMERIC(6,2),
  target_rest_seconds INT DEFAULT 90,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_planned_exercises_day ON public.planned_workout_exercises(planned_day_id);
ALTER TABLE public.planned_workout_exercises ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own planned exercises" ON public.planned_workout_exercises;
CREATE POLICY "Users manage own planned exercises" ON public.planned_workout_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.planned_workout_days 
      WHERE id = planned_day_id AND user_id = auth.uid()
    )
  );
