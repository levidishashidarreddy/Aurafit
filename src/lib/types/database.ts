export type FitnessGoal = 'fat_loss' | 'muscle_gain' | 'recomposition' | 'maintenance';
export type ActivityLevel = 'sedentary' | 'lightly_active' | 'moderately_active' | 'very_active' | 'extra_active';
export type MealType = 'breakfast' | 'lunch' | 'dinner' | 'snack';
export type SetType = 'warmup' | 'working' | 'drop' | 'failure';

export interface Profile {
  id: string;
  email: string;
  full_name?: string;
  avatar_url?: string;
  age?: number;
  gender?: string;
  height_cm?: number;
  current_weight_kg?: number;
  goal_weight_kg?: number;
  fitness_goal: FitnessGoal;
  activity_level: ActivityLevel;
  bmr?: number;
  tdee?: number;
  target_calories?: number;
  target_protein_g?: number;
  target_protein_min?: number;
  target_protein_max?: number;
  target_carbs_g?: number;
  target_fat_g?: number;
  target_fibre_g?: number;
  target_fibre_min?: number;
  target_fibre_max?: number;
  target_steps: number;
  weekly_training_days?: number;
  streak_count: number;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface NutritionEntry {
  id: string;
  user_id: string;
  entry_date: string; // YYYY-MM-DD
  meal_type: MealType;
  food_name: string;
  quantity?: string;
  calories: number;
  protein_g: number;
  carbohydrates_g: number;
  total_fat_g: number;
  fibre_g?: number | null;
  total_sugars_g?: number | null;
  added_sugar_g?: number | null;
  saturated_fat_g?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface DailyNutritionSummary {
  id: string;
  user_id: string;
  entry_date: string; // YYYY-MM-DD
  calories_kcal: number | null;
  protein_g: number | null;
  carbohydrates_g: number | null;
  total_fat_g: number | null;
  fibre_g: number | null;
  total_sugars_g: number | null;
  added_sugar_g: number | null;
  saturated_fat_g: number | null;
  raw_pasted_text?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}


export type ActivityType = 'Walking' | 'Treadmill' | 'Running';

export interface ActivityEntry {
  id: string;
  user_id: string;
  activity_date: string; // YYYY-MM-DD
  activity_type: ActivityType;
  steps: number;
  calories_burned: number;
  duration_minutes?: number | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export interface FoodLog {
  id: string;
  user_id: string;
  food_id?: string;
  food_name: string;
  meal_type: MealType;
  servings: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  logged_at: string;
  created_at: string;
}

export interface WaterLog {
  id: string;
  user_id: string;
  amount_ml: number;
  logged_at: string;
  created_at: string;
}

export interface Exercise {
  id: string;
  name: string;
  category: string;
  primary_muscle: string;
  secondary_muscles: string[];
  equipment?: string;
  instructions?: string;
  is_custom: boolean;
  created_by?: string;
}

export interface WorkoutTemplate {
  id: string;
  user_id: string;
  title: string;
  description?: string;
  notes?: string;
  created_at: string;
  exercises?: TemplateExercise[];
}

export interface TemplateExercise {
  id: string;
  template_id: string;
  exercise_id: string;
  order_index: number;
  target_sets: number;
  target_reps: number;
  exercise?: Exercise;
}

export interface WorkoutSession {
  id: string;
  user_id: string;
  title: string;
  start_time: string;
  end_time?: string;
  duration_seconds?: number;
  notes?: string;
  logged_at: string;
  completed: boolean;
  sets?: WorkoutSet[];
}

export interface WorkoutSet {
  id: string;
  session_id: string;
  exercise_id: string;
  set_number: number;
  set_type: SetType;
  weight_kg: number;
  reps: number;
  rpe?: number;
  completed: boolean;
  created_at: string;
  exercise?: Exercise;
}

export interface WeightLog {
  id: string;
  user_id: string;
  weight_kg: number;
  notes?: string;
  logged_at: string;
  created_at: string;
}

export interface BodyMeasurement {
  id: string;
  user_id: string;
  chest_cm?: number;
  waist_cm?: number;
  hips_cm?: number;
  arms_cm?: number;
  thighs_cm?: number;
  neck_cm?: number;
  logged_at: string;
  created_at: string;
}

export interface HealthData {
  id: string;
  user_id: string;
  steps: number;
  active_calories_burned: number;
  distance_meters: number;
  avg_heart_rate?: number;
  logged_at: string;
  source: string;
  updated_at: string;
}

export interface AIInteraction {
  id: string;
  user_id: string;
  interaction_type: 'coach_chat' | 'meal_plan' | 'workout_gen' | 'insight';
  prompt_summary?: string;
  response_content: any;
  created_at: string;
}

export interface WorkoutAnalysis {
  id: string;
  user_id: string;
  session_id: string;
  rating: number; // e.g. 8.5 out of 10
  rating_explanation: string;
  progress_summary: string;
  improvements: string[];
  stagnations: string[];
  fatigue_cautions?: string | null;
  next_session_tips?: string | null;
  data_limitations?: string | null;
  model_metadata?: string | null;
  created_at: string;
}

export type ActivityEntryMode = 'daily_summary' | 'individual_activities';

export interface DailyActivitySummary {
  id: string;
  user_id: string;
  entry_date: string; // YYYY-MM-DD
  total_steps: number;
  active_calories_burned: number; // manually entered, not estimated
  entry_mode: ActivityEntryMode;
  notes?: string | null;
  created_at: string;
  updated_at: string;
}

export type WorkoutDayStatus = 'planned' | 'completed' | 'missed' | 'rescheduled' | 'rest';

export interface PlannedWorkoutExercise {
  id: string;
  planned_day_id: string;
  exercise_id?: string;
  exercise_name: string;
  muscle_group: string;
  order_index: number;
  planned_sets: number;
  target_reps: string; // e.g. "8-12" or "10"
  target_weight_kg?: number | null;
  target_rest_seconds?: number | null;
  notes?: string | null;
  created_at: string;
}

export interface PlannedWorkoutDay {
  id: string;
  plan_id: string;
  user_id: string;
  scheduled_date: string; // YYYY-MM-DD
  original_date: string; // YYYY-MM-DD
  day_of_week: number; // 0=Mon, 6=Sun
  title: string;
  is_rest_day: boolean;
  status: WorkoutDayStatus;
  rescheduled_to_date?: string | null;
  completed_session_id?: string | null;
  order_index: number;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  exercises?: PlannedWorkoutExercise[];
}

export interface WeeklyWorkoutPlan {
  id: string;
  user_id: string;
  week_start_date: string; // YYYY-MM-DD (Monday)
  title?: string | null;
  notes?: string | null;
  created_at: string;
  updated_at: string;
  days?: PlannedWorkoutDay[];
}


