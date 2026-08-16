import { createClient } from '../supabase/client';
import { FoodLog, MealType } from '../types/database';

export async function fetchDailyFoodLogs(userId: string, dateStr?: string): Promise<FoodLog[]> {
  const supabase = createClient();
  const date = dateStr || new Date().toISOString().split('T')[0];

  const { data, error } = await supabase
    .from('food_logs')
    .select('*')
    .eq('user_id', userId)
    .eq('logged_at', date)
    .order('created_at', { ascending: true });

  if (error) {
    console.error('Error fetching food logs:', error);
    return [];
  }
  return data as FoodLog[];
}

export async function addFoodLog(entry: {
  user_id: string;
  food_id?: string;
  food_name: string;
  meal_type: MealType;
  servings: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  fat_g: number;
  logged_at?: string;
}): Promise<FoodLog | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('food_logs')
    .insert([entry])
    .select()
    .single();

  if (error) {
    console.error('Error adding food log:', error);
    return null;
  }
  return data as FoodLog;
}

export async function deleteFoodLog(id: string): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase.from('food_logs').delete().eq('id', id);
  if (error) {
    console.error('Error deleting food log:', error);
    return false;
  }
  return true;
}
