import { createClient } from '../supabase/client';
import { WorkoutSession, WorkoutSet } from '../types/database';

export async function createWorkoutSession(userId: string, title: string): Promise<WorkoutSession | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('workout_sessions')
    .insert([{ user_id: userId, title, completed: false }])
    .select()
    .single();

  if (error) {
    console.error('Error creating workout session:', error);
    return null;
  }
  return data as WorkoutSession;
}

export async function logWorkoutSet(setInfo: {
  session_id: string;
  exercise_id: string;
  set_number: number;
  set_type: 'warmup' | 'working' | 'drop' | 'failure';
  weight_kg: number;
  reps: number;
  rpe?: number;
}): Promise<WorkoutSet | null> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from('workout_sets')
    .insert([setInfo])
    .select()
    .single();

  if (error) {
    console.error('Error logging workout set:', error);
    return null;
  }
  return data as WorkoutSet;
}

export async function finishWorkoutSession(sessionId: string, durationSeconds: number): Promise<boolean> {
  const supabase = createClient();
  const { error } = await supabase
    .from('workout_sessions')
    .update({ completed: true, end_time: new Date().toISOString(), duration_seconds: durationSeconds })
    .eq('id', sessionId);

  if (error) {
    console.error('Error completing workout session:', error);
    return false;
  }
  return true;
}
