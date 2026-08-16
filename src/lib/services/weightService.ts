import { createClient } from '../supabase/client';
import { WeightLog } from '../types/database';

export async function fetchWeightLogs(userId: string): Promise<WeightLog[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('weight_logs')
    .select('*')
    .eq('user_id', userId)
    .order('logged_at', { ascending: true });

  if (error) {
    console.error('Error fetching weight logs:', error);
    return [];
  }
  return data as WeightLog[];
}

export async function addWeightLog(userId: string, weightKg: number, notes?: string): Promise<WeightLog | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('weight_logs')
    .insert([{ user_id: userId, weight_kg: weightKg, notes }])
    .select()
    .single();

  if (error) {
    console.error('Error adding weight log:', error);
    return null;
  }
  return data as WeightLog;
}
