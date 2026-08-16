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
  target_carbs_g?: number;
  target_fat_g?: number;
  target_water_ml: number;
  target_steps: number;
  streak_count: number;
  onboarding_completed: boolean;
  created_at: string;
  updated_at: string;
}

export interface Food {
  id: string;
  name: string;
  brand?: string;
  barcode?: string;
  serving_size: number;
  serving_unit: string;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  fiber_g?: number;
  sugar_g?: number;
  sodium_mg?: number;
  is_custom: boolean;
  created_by?: string;
  created_at: string;
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
