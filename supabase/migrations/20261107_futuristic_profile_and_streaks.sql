-- GYM HUB: Futuristic Profile Preferences & Persistent Streak Engine Migration
-- Idempotent, safe, and backwards-compatible.
-- Safe to execute repeatedly in the Supabase SQL Editor.

-- 1. Ensure all futuristic profile, target & preference columns exist on public.profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN DEFAULT FALSE,
  ADD COLUMN IF NOT EXISTS onboarding_step INT DEFAULT 1,
  ADD COLUMN IF NOT EXISTS fitness_goals TEXT[] DEFAULT ARRAY['muscle_gain']::TEXT[],
  ADD COLUMN IF NOT EXISTS preferred_workout_time TEXT DEFAULT 'evening',
  ADD COLUMN IF NOT EXISTS workout_location TEXT DEFAULT 'gym',
  ADD COLUMN IF NOT EXISTS dietary_preference TEXT DEFAULT 'flexible',
  ADD COLUMN IF NOT EXISTS units_preference TEXT DEFAULT 'metric',
  ADD COLUMN IF NOT EXISTS reminders_enabled BOOLEAN DEFAULT TRUE,
  ADD COLUMN IF NOT EXISTS longest_streak INT DEFAULT 0,
  ADD COLUMN IF NOT EXISTS last_streak_date DATE,
  ADD COLUMN IF NOT EXISTS target_protein_min NUMERIC(6,2) DEFAULT 80,
  ADD COLUMN IF NOT EXISTS target_protein_max NUMERIC(6,2) DEFAULT 90,
  ADD COLUMN IF NOT EXISTS target_fibre_min NUMERIC(6,2) DEFAULT 25,
  ADD COLUMN IF NOT EXISTS target_fibre_max NUMERIC(6,2) DEFAULT 30,
  ADD COLUMN IF NOT EXISTS weekly_training_days INT DEFAULT 4,
  ADD COLUMN IF NOT EXISTS target_water_ml INT DEFAULT 3000;

-- 2. Ensure Row Level Security (RLS) is enabled on public.profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Idempotently create profile RLS policies if not already present
DO $$
BEGIN
  -- SELECT Policy: Users can only view their own profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can view own profile'
  ) THEN
    CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
  END IF;

  -- UPDATE Policy: Users can only update their own profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can update own profile'
  ) THEN
    CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);
  END IF;

  -- INSERT Policy: Users can only insert their own profile
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'profiles' AND policyname = 'Users can insert own profile'
  ) THEN
    CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
  END IF;
END $$;
