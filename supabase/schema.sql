-- GYM & FITNESS PLATFORM — SUPABASE POSTGRESQL SCHEMA

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ENUM DEFINITIONS
DO $$ BEGIN
  CREATE TYPE fitness_goal AS ENUM ('fat_loss', 'muscle_gain', 'recomposition', 'maintenance');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE activity_level AS ENUM ('sedentary', 'lightly_active', 'moderately_active', 'very_active', 'extra_active');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE meal_type AS ENUM ('breakfast', 'lunch', 'dinner', 'snack');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE set_type AS ENUM ('warmup', 'working', 'drop', 'failure');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 1. PROFILES TABLE
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  age INT,
  gender TEXT,
  height_cm NUMERIC(5,2),
  current_weight_kg NUMERIC(5,2),
  goal_weight_kg NUMERIC(5,2),
  fitness_goal fitness_goal DEFAULT 'muscle_gain',
  activity_level activity_level DEFAULT 'moderately_active',
  bmr INT,
  tdee INT,
  target_calories INT,
  target_protein_g INT,
  target_carbs_g INT,
  target_fat_g INT,
  target_water_ml INT DEFAULT 3000,
  target_steps INT DEFAULT 10000,
  streak_count INT DEFAULT 0,
  onboarding_completed BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS for Profiles
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (auth.uid() = id);
CREATE POLICY "Users can insert own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "Users can update own profile" ON public.profiles FOR UPDATE USING (auth.uid() = id);

-- AUTOMATIC PROFILE CREATION TRIGGER ON AUTH SIGNUP
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, email, full_name, avatar_url, onboarding_completed)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.raw_user_meta_data->>'name', 'Athlete'),
    NEW.raw_user_meta_data->>'avatar_url',
    FALSE
  )
  ON CONFLICT (id) DO NOTHING;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 2. FOOD DATABASE TABLE (Global + Custom)
CREATE TABLE IF NOT EXISTS public.foods (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  brand TEXT,
  barcode TEXT UNIQUE,
  serving_size NUMERIC(6,2) DEFAULT 100,
  serving_unit TEXT DEFAULT 'g',
  calories INT NOT NULL,
  protein_g NUMERIC(5,2) NOT NULL,
  carbs_g NUMERIC(5,2) NOT NULL,
  fat_g NUMERIC(5,2) NOT NULL,
  fiber_g NUMERIC(5,2) DEFAULT 0,
  sugar_g NUMERIC(5,2) DEFAULT 0,
  sodium_mg NUMERIC(6,2) DEFAULT 0,
  is_custom BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.foods ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view global/own custom foods" ON public.foods 
  FOR SELECT USING (is_custom = FALSE OR created_by = auth.uid());
CREATE POLICY "Users can insert custom foods" ON public.foods 
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- 3. FOOD LOGS TABLE
CREATE TABLE IF NOT EXISTS public.food_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  food_id UUID REFERENCES public.foods(id) ON DELETE SET NULL,
  food_name TEXT NOT NULL,
  meal_type meal_type NOT NULL,
  servings NUMERIC(4,2) DEFAULT 1.0,
  calories INT NOT NULL,
  protein_g NUMERIC(5,2) NOT NULL,
  carbs_g NUMERIC(5,2) NOT NULL,
  fat_g NUMERIC(5,2) NOT NULL,
  logged_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.food_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own food logs" ON public.food_logs 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 4. WATER LOGS TABLE
CREATE TABLE IF NOT EXISTS public.water_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  amount_ml INT NOT NULL,
  logged_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.water_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own water logs" ON public.water_logs 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 5. EXERCISES LIBRARY TABLE
CREATE TABLE IF NOT EXISTS public.exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL UNIQUE,
  category TEXT NOT NULL,
  primary_muscle TEXT NOT NULL,
  secondary_muscles TEXT[],
  equipment TEXT,
  instructions TEXT,
  is_custom BOOLEAN DEFAULT FALSE,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

ALTER TABLE public.exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone can view global/own custom exercises" ON public.exercises 
  FOR SELECT USING (is_custom = FALSE OR created_by = auth.uid());
CREATE POLICY "Users can insert custom exercises" ON public.exercises 
  FOR INSERT WITH CHECK (auth.uid() = created_by);

-- 6. WORKOUT TEMPLATES & TEMPLATE EXERCISES
CREATE TABLE IF NOT EXISTS public.workout_templates (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workout_templates ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own templates" ON public.workout_templates 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.template_exercises (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  template_id UUID NOT NULL REFERENCES public.workout_templates(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  order_index INT NOT NULL,
  target_sets INT DEFAULT 3,
  target_reps INT DEFAULT 10
);

ALTER TABLE public.template_exercises ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage template exercises" ON public.template_exercises 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.workout_templates WHERE id = template_id AND user_id = auth.uid())
  );

-- 7. WORKOUT SESSIONS & SETS
CREATE TABLE IF NOT EXISTS public.workout_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  start_time TIMESTAMPTZ DEFAULT NOW(),
  end_time TIMESTAMPTZ,
  duration_seconds INT,
  notes TEXT,
  logged_at DATE DEFAULT CURRENT_DATE,
  completed BOOLEAN DEFAULT FALSE
);

ALTER TABLE public.workout_sessions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own workout sessions" ON public.workout_sessions 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

CREATE TABLE IF NOT EXISTS public.workout_sets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id UUID NOT NULL REFERENCES public.workout_sessions(id) ON DELETE CASCADE,
  exercise_id UUID NOT NULL REFERENCES public.exercises(id) ON DELETE CASCADE,
  set_number INT NOT NULL,
  set_type set_type DEFAULT 'working',
  weight_kg NUMERIC(6,2) NOT NULL,
  reps INT NOT NULL,
  rpe NUMERIC(3,1),
  completed BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.workout_sets ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage workout sets" ON public.workout_sets 
  FOR ALL USING (
    EXISTS (SELECT 1 FROM public.workout_sessions WHERE id = session_id AND user_id = auth.uid())
  );

-- 8. WEIGHT LOGS
CREATE TABLE IF NOT EXISTS public.weight_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  weight_kg NUMERIC(5,2) NOT NULL,
  notes TEXT,
  logged_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.weight_logs ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own weight logs" ON public.weight_logs 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 9. BODY MEASUREMENTS LOGS
CREATE TABLE IF NOT EXISTS public.body_measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  chest_cm NUMERIC(5,2),
  waist_cm NUMERIC(5,2),
  hips_cm NUMERIC(5,2),
  arms_cm NUMERIC(5,2),
  thighs_cm NUMERIC(5,2),
  neck_cm NUMERIC(5,2),
  logged_at DATE DEFAULT CURRENT_DATE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.body_measurements ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own body measurements" ON public.body_measurements 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 10. HEALTH & SYNCHRONIZED ACTIVITY DATA
CREATE TABLE IF NOT EXISTS public.health_data (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  steps INT DEFAULT 0,
  active_calories_burned INT DEFAULT 0,
  distance_meters NUMERIC(8,2) DEFAULT 0,
  avg_heart_rate INT,
  logged_at DATE DEFAULT CURRENT_DATE,
  source TEXT DEFAULT 'manual',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.health_data ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own health data" ON public.health_data 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 11. AI INTERACTIONS & LOGS
CREATE TABLE IF NOT EXISTS public.ai_interactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  interaction_type TEXT NOT NULL,
  prompt_summary TEXT,
  response_content JSONB,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.ai_interactions ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own ai interactions" ON public.ai_interactions 
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- DEFAULT EXERCISES SEED DATA
INSERT INTO public.exercises (name, category, primary_muscle, secondary_muscles, equipment, instructions) VALUES
('Barbell Bench Press', 'Barbell', 'Chest', ARRAY['Triceps', 'Shoulders'], 'Barbell & Bench', 'Lie on bench, unrack barbell, lower to mid-chest, press upwards.'),
('Incline Dumbbell Press', 'Dumbbell', 'Upper Chest', ARRAY['Triceps', 'Shoulders'], 'Incline Bench & Dumbbells', 'Set bench to 30-45 degrees, press dumbbells overhead.'),
('Barbell Squat', 'Barbell', 'Quads', ARRAY['Glutes', 'Lower Back'], 'Squat Rack & Barbell', 'Rest bar on upper traps, squat down until thighs are parallel to ground.'),
('Deadlift', 'Barbell', 'Back & Hamstrings', ARRAY['Glutes', 'Forearms'], 'Barbell', 'Hinge at hips, grip bar, drive through heels while keeping back straight.'),
('Lat Pulldown', 'Cable', 'Latissimus Dorsi', ARRAY['Biceps'], 'Lat Pulldown Machine', 'Grip bar wide, pull down to upper chest while squeezing lat muscles.'),
('Dumbbell Shoulder Press', 'Dumbbell', 'Shoulders', ARRAY['Triceps'], 'Dumbbells & Bench', 'Sit upright, press dumbbells vertically above head until arms extend.'),
('Barbell Bicep Curl', 'Barbell', 'Biceps', ARRAY['Forearms'], 'Barbell', 'Keep elbows fixed at sides, curl barbell towards shoulders.'),
('Triceps Rope Pushdown', 'Cable', 'Triceps', ARRAY[]::TEXT[], 'Cable Machine & Rope', 'Push rope attachment downward until arms are fully extended.'),
('Overhead Dumbbell Triceps Extension', 'Dumbbell', 'Triceps', ARRAY[]::TEXT[], 'Dumbbell', 'Lower weight behind head with elbows pointing forward, extend arms upward.'),
('Leg Press', 'Machine', 'Quads', ARRAY['Glutes'], 'Leg Press Machine', 'Place feet shoulder-width on platform, press weight smoothly without locking knees.')
ON CONFLICT (name) DO NOTHING;

-- DEFAULT FOODS SEED DATA
INSERT INTO public.foods (name, brand, calories, protein_g, carbs_g, fat_g, serving_size, serving_unit) VALUES
('Chicken Breast (Cooked, Skinless)', 'Generic', 165, 31.0, 0.0, 3.6, 100, 'g'),
('Whole Eggs (Large)', 'Generic', 143, 12.6, 0.7, 9.5, 100, 'g'),
('White Rice (Cooked)', 'Generic', 130, 2.7, 28.0, 0.3, 100, 'g'),
('Oatmeal (Raw)', 'Generic', 389, 16.9, 66.3, 6.9, 100, 'g'),
('Whey Protein Isolate', 'Optimum Nutrition', 120, 24.0, 1.0, 1.0, 30, 'g'),
('Banana (Medium)', 'Generic', 89, 1.1, 22.8, 0.3, 100, 'g'),
('Greek Yogurt (Non-fat)', 'Generic', 59, 10.0, 3.6, 0.4, 100, 'g'),
('Almonds (Raw)', 'Generic', 579, 21.2, 21.7, 49.9, 100, 'g'),
('Salmon Fillet (Cooked)', 'Generic', 206, 22.0, 0.0, 12.0, 100, 'g'),
('Soya Chunks (Raw)', 'Generic', 345, 52.0, 33.0, 0.5, 100, 'g')
ON CONFLICT DO NOTHING;

-- 12. MANUAL NUTRITION TRACKING TABLE
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

CREATE INDEX IF NOT EXISTS idx_nutrition_user_date ON public.nutrition_entries(user_id, entry_date);
ALTER TABLE public.nutrition_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own nutrition entries" ON public.nutrition_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 13. MANUAL ACTIVITY & STEPS TRACKING TABLE
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

CREATE INDEX IF NOT EXISTS idx_activity_user_date ON public.activity_entries(user_id, activity_date);
ALTER TABLE public.activity_entries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own activity entries" ON public.activity_entries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 14. WORKOUT ANALYSES (AI ASSESSMENTS & RATINGS)
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
CREATE POLICY "Users manage own workout analyses" ON public.workout_analyses
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 15. DAILY NUTRITION SUMMARIES (PASTED WHOLE-DAY TOTALS)
CREATE TABLE IF NOT EXISTS public.daily_nutrition_summaries (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  entry_date DATE NOT NULL,
  calories_kcal INT CHECK (calories_kcal >= 0),
  protein_g NUMERIC(6,2) CHECK (protein_g >= 0),
  carbohydrates_g NUMERIC(6,2) CHECK (carbohydrates_g >= 0),
  total_fat_g NUMERIC(6,2) CHECK (total_fat_g >= 0),
  fibre_g NUMERIC(6,2) CHECK (fibre_g >= 0),
  total_sugars_g NUMERIC(6,2) CHECK (total_sugars_g >= 0),
  added_sugar_g NUMERIC(6,2) CHECK (added_sugar_g >= 0),
  saturated_fat_g NUMERIC(6,2) CHECK (saturated_fat_g >= 0),
  raw_pasted_text TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_entry_date UNIQUE (user_id, entry_date)
);

CREATE INDEX IF NOT EXISTS idx_daily_nutrition_user_date ON public.daily_nutrition_summaries(user_id, entry_date);

ALTER TABLE public.daily_nutrition_summaries ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own daily nutrition summaries" ON public.daily_nutrition_summaries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 16. DAILY ACTIVITY SUMMARIES (ONE ENTRY PER DAY BY DEFAULT)
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
CREATE POLICY "Users manage own daily activity summaries" ON public.daily_activity_summaries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 17. WEEKLY WORKOUT PLANS
CREATE TABLE IF NOT EXISTS public.weekly_workout_plans (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  week_start_date DATE NOT NULL,
  title TEXT,
  notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_week UNIQUE (user_id, week_start_date)
);

CREATE INDEX IF NOT EXISTS idx_weekly_plans_user_week ON public.weekly_workout_plans(user_id, week_start_date);
ALTER TABLE public.weekly_workout_plans ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Users manage own weekly plans" ON public.weekly_workout_plans
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 18. PLANNED WORKOUT DAYS
CREATE TABLE IF NOT EXISTS public.planned_workout_days (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id UUID NOT NULL REFERENCES public.weekly_workout_plans(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  scheduled_date DATE NOT NULL,
  original_date DATE NOT NULL,
  day_of_week INT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6),
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
CREATE POLICY "Users manage own planned workout days" ON public.planned_workout_days
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);

-- 19. PLANNED WORKOUT EXERCISES
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
CREATE POLICY "Users manage own planned exercises" ON public.planned_workout_exercises
  FOR ALL USING (
    EXISTS (
      SELECT 1 FROM public.planned_workout_days 
      WHERE id = planned_day_id AND user_id = auth.uid()
    )
  );



