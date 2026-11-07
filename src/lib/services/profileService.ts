import { createClient } from '../supabase/client';
import { Profile } from '../types/database';

const LOCAL_PROFILE_KEY = 'gymhub_user_profile_cache_v1';

export function getLocalCachedProfile(): Profile | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(LOCAL_PROFILE_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

export function clearUserLocalSessionCache(): void {
  if (typeof window === 'undefined') return;
  try {
    const userScopedKeys = [
      LOCAL_PROFILE_KEY,
      'gymhub_centralized_targets_v1',
      'gymhub_nutrition_targets_v1',
      'gymhub_user_streak_state_v1',
      'gymhub_onboarding_draft_v2',
      'gymhub_milestones_unlocked_v1',
      'gymhub_milestones_celebrated_v1',
      'gymhub_saved_workout_sessions_v2',
      'gymhub_saved_workout_analyses_v2',
      'gymhub_day_activity_summaries_v2',
      'gymhub_raw_activity_entries_v2',
      'gymhub_first_welcome_completed',
      'aura_guest_session',
    ];
    userScopedKeys.forEach((key) => localStorage.removeItem(key));

    const userSessionKeys = [
      'gymhub_launch_welcome_shown',
      'gymhub_first_welcome_dismissed',
      'gymhub_first_welcome_active',
    ];
    userSessionKeys.forEach((key) => sessionStorage.removeItem(key));
  } catch (err) {
    console.error('Error clearing user local session cache:', err);
  }
}

export function saveLocalCachedProfile(profile: Profile | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (profile) {
      localStorage.setItem(LOCAL_PROFILE_KEY, JSON.stringify(profile));
    } else {
      localStorage.removeItem(LOCAL_PROFILE_KEY);
    }
  } catch {
    // Ignore storage quota or disabled localStorage
  }
}

export async function getUserProfile(userId: string): Promise<Profile | null> {
  if (!userId || userId === 'guest' || userId === 'demo') {
    return getLocalCachedProfile();
  }
  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', userId)
      .maybeSingle();

    if (error) {
      console.error('Error fetching profile from Supabase:', error);
      const cached = getLocalCachedProfile();
      if (cached && cached.id === userId) return cached;
      return null;
    }

    if (data) {
      saveLocalCachedProfile(data as Profile);
      return data as Profile;
    }

    return null;
  } catch (err) {
    console.warn('Network or client error in getUserProfile, returning local cache:', err);
    const cached = getLocalCachedProfile();
    if (cached && cached.id === userId) return cached;
    return null;
  }
}

export async function getOrCreateUserProfile(userId: string, email?: string): Promise<Profile | null> {
  if (!userId || userId === 'guest' || userId === 'demo') return null;
  const existing = await getUserProfile(userId);
  if (existing) return existing;

  const supabase = createClient();
  try {
    const newProfile: Partial<Profile> = {
      id: userId,
      email: email || '',
      full_name: 'Athlete',
      fitness_goal: 'muscle_gain',
      activity_level: 'moderately_active',
      target_steps: 10000,
      streak_count: 0,
      longest_streak: 0,
      onboarding_completed: false,
    };

    const { data, error } = await supabase
      .from('profiles')
      .insert(newProfile)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error creating profile row:', error);
      return null;
    }

    if (data) {
      saveLocalCachedProfile(data as Profile);
      return data as Profile;
    }
    return null;
  } catch (err) {
    console.error('Exception in getOrCreateUserProfile:', err);
    return null;
  }
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
  // Never overwrite existing profile information with empty values
  const cleanUpdates: Partial<Profile> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && value !== '') {
      (cleanUpdates as any)[key] = value;
    }
  }

  if (!userId || userId === 'guest' || userId === 'demo') {
    const local = getLocalCachedProfile() || ({} as Profile);
    const merged = { ...local, ...cleanUpdates, updated_at: new Date().toISOString() };
    saveLocalCachedProfile(merged as Profile);
    return merged as Profile;
  }

  const supabase = createClient();
  try {
    const { data, error } = await supabase
      .from('profiles')
      .update({ ...cleanUpdates, updated_at: new Date().toISOString() })
      .eq('id', userId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error updating profile in Supabase:', error);
      // Fallback update local cache so user experience is not blocked
      const local = getLocalCachedProfile() || ({} as Profile);
      const merged = { ...local, ...cleanUpdates, updated_at: new Date().toISOString() };
      saveLocalCachedProfile(merged as Profile);
      return merged as Profile;
    }

    if (data) {
      saveLocalCachedProfile(data as Profile);
      return data as Profile;
    }
    return null;
  } catch (err) {
    console.error('Exception updating profile:', err);
    const local = getLocalCachedProfile() || ({} as Profile);
    const merged = { ...local, ...cleanUpdates, updated_at: new Date().toISOString() };
    saveLocalCachedProfile(merged as Profile);
    return merged as Profile;
  }
}

export async function deleteUserAccountData(userId: string): Promise<boolean> {
  if (!userId || userId === 'guest' || userId === 'demo') {
    saveLocalCachedProfile(null);
    return true;
  }

  const supabase = createClient();
  try {
    // Delete profile (due to ON DELETE CASCADE on child tables, user data cascades)
    await supabase.from('profiles').delete().eq('id', userId);
    saveLocalCachedProfile(null);
    return true;
  } catch (err) {
    console.error('Failed to delete user account data:', err);
    return false;
  }
}
