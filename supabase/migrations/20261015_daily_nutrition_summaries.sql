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
DROP POLICY IF EXISTS "Users manage own daily nutrition summaries" ON public.daily_nutrition_summaries;
CREATE POLICY "Users manage own daily nutrition summaries" ON public.daily_nutrition_summaries
  FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
