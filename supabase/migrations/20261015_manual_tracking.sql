-- GYM HUB: Manual Nutrition & Activity Tracking Migration

-- 1. Ensure target_fibre_g exists on profiles
ALTER TABLE public.profiles
  ADD COLUMN IF NOT EXISTS target_fibre_g INT DEFAULT 28;

ALTER TABLE public.profiles
  ALTER COLUMN target_calories SET DEFAULT 1900,
  ALTER COLUMN target_protein_g SET DEFAULT 85,
  ALTER COLUMN target_steps SET DEFAULT 10000;

-- 2. Create Nutrition Entries Table
CREATE TABLE IF NOT EXISTS public.nutrition_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL DEFAULT CURRENT_DATE,
  meal_type meal_type NOT NULL,
  food_name TEXT NOT NULL,
  quantity TEXT,
  calories INT NOT NULL CHECK (calories >= 0),
  protein_g NUMERIC(6,2) NOT NULL CHECK (protein_g >= 0),
  carbohydrates_g NUMERIC(6,2) NOT NULL CHECK (carbohydrates_g >= 0),
  total_fat_g NUMERIC(6,2) NOT NULL CHECK (total_fat_g >= 0),
  fibre_g NUMERIC(6,2) CHECK (fibre_g >= 0),
  total_sugars_g NUMERIC(6,2) CHECK (total_sugars_g >= 0),
  added_sugar_g NUMERIC(6,2) CHECK (added_sugar_g >= 0),
  saturated_fat_g NUMERIC(6,2) CHECK (saturated_fat_g >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for speedy user + date queries
CREATE INDEX IF NOT EXISTS idx_nutrition_user_date ON public.nutrition_entries(user_id, entry_date);

-- Row Level Security for Nutrition Entries
ALTER TABLE public.nutrition_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own nutrition entries" ON public.nutrition_entries;
CREATE POLICY "Users manage own nutrition entries" ON public.nutrition_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 3. Create Activity Entries Table (Walking, Treadmill, Running)
CREATE TABLE IF NOT EXISTS public.activity_entries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  activity_date DATE NOT NULL DEFAULT CURRENT_DATE,
  activity_type TEXT NOT NULL CHECK (activity_type IN ('Walking', 'Treadmill', 'Running')),
  steps INT NOT NULL CHECK (steps >= 0),
  calories_burned INT NOT NULL CHECK (calories_burned >= 0),
  duration_minutes INT CHECK (duration_minutes >= 0),
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for speedy user + date queries
CREATE INDEX IF NOT EXISTS idx_activity_user_date ON public.activity_entries(user_id, activity_date);

-- Row Level Security for Activity Entries
ALTER TABLE public.activity_entries ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users manage own activity entries" ON public.activity_entries;
CREATE POLICY "Users manage own activity entries" ON public.activity_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
