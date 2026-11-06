import { createClient } from '../supabase/client';
import { Profile } from '../types/database';

export async function getUserProfile(userId: string): Promise<Profile | null> {
  if (!userId || userId === 'guest' || userId === 'demo') return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', userId)
    .single();

  if (error) {
    console.error('Error fetching profile:', error);
    return null;
  }
  return data as Profile;
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
  if (!userId || userId === 'guest' || userId === 'demo') return null;
  const supabase = createClient();
  const { data, error } = await supabase
    .from('profiles')
    .update({ ...updates, updated_at: new Date().toISOString() })
    .eq('id', userId)
    .select()
    .single();

  if (error) {
    console.error('Error updating profile:', error);
    return null;
  }
  return data as Profile;
}
