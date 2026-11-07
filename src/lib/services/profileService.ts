import { createClient } from '../supabase/client';
import { Profile } from '../types/database';

const LOCAL_PROFILE_KEY = 'gymhub_user_profile_cache_v1';

// Columns that physically exist in the Supabase public.profiles table
const PROFILES_DB_COLUMNS = new Set([
  'id',
  'reg_no',
  'full_name',
  'branch',
  'academic_year',
  'section',
  'phone_visible',
  'is_admin',
  'is_verified',
  'created_at',
  'updated_at',
  'onboarding_completed',
  'onboarding_step',
  'fitness_goals',
  'preferred_workout_time',
  'workout_location',
  'dietary_preference',
  'units_preference',
  'reminders_enabled',
  'longest_streak',
  'last_streak_date',
  'target_protein_min',
  'target_protein_max',
  'target_fibre_min',
  'target_fibre_max',
  'weekly_training_days',
  'target_water_ml',
]);

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
      const cached = getLocalCachedProfile();
      const merged: Profile = {
        ...(cached && cached.id === userId ? cached : {}),
        ...(data as Profile),
        onboarding_completed: (data as any).onboarding_completed ?? false,
      };
      saveLocalCachedProfile(merged);
      return merged;
    }

    return null;
  } catch (err) {
    console.warn('Network or client error in getUserProfile, returning local cache:', err);
    const cached = getLocalCachedProfile();
    if (cached && cached.id === userId) return cached;
    return null;
  }
}

export async function getOrCreateUserProfile(userId: string, fullName?: string): Promise<Profile | null> {
  if (!userId || userId === 'guest' || userId === 'demo') return null;
  const existing = await getUserProfile(userId);
  if (existing) return existing;

  const supabase = createClient();
  try {
    const regNo = 'GH_' + userId.replace(/[^a-zA-Z0-9]/g, '').substring(0, 10).toUpperCase();
    const newProfile = {
      id: userId,
      reg_no: regNo,
      full_name: (fullName && fullName.trim()) || 'Athlete',
      branch: 'GENERAL',
      academic_year: '1st Year',
      section: 'A',
      onboarding_completed: false,
      onboarding_step: 1,
      fitness_goals: ['muscle_gain'],
      longest_streak: 0,
      target_water_ml: 3000,
      weekly_training_days: 4,
    };

    const { data, error } = await supabase
      .from('profiles')
      .upsert(newProfile, { onConflict: 'id' })
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error creating profile row in Supabase:', error);
      const fallback: Profile = {
        ...newProfile,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        email: '',
        streak_count: 0,
        target_steps: 10000,
        fitness_goal: 'muscle_gain',
        activity_level: 'moderately_active',
      } as Profile;
      saveLocalCachedProfile(fallback);
      return fallback;
    }

    if (data) {
      const merged: Profile = {
        ...(data as Profile),
        email: '',
        streak_count: 0,
        target_steps: 10000,
        fitness_goal: 'muscle_gain',
        activity_level: 'moderately_active',
      } as Profile;
      saveLocalCachedProfile(merged);
      return merged;
    }
    return null;
  } catch (err) {
    console.error('Exception in getOrCreateUserProfile:', err);
    return null;
  }
}

export async function updateProfile(userId: string, updates: Partial<Profile>): Promise<Profile | null> {
  // Never overwrite existing profile information with undefined or empty string values
  const cleanUpdates: Partial<Profile> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && value !== '') {
      (cleanUpdates as any)[key] = value;
    }
  }

  // Preserve all extended fields in local cache (including body measurements & targets)
  const local = getLocalCachedProfile() || ({} as Profile);
  const mergedLocal: Profile = {
    ...local,
    ...cleanUpdates,
    id: userId,
    updated_at: new Date().toISOString(),
  } as Profile;
  saveLocalCachedProfile(mergedLocal);

  if (!userId || userId === 'guest' || userId === 'demo') {
    return mergedLocal;
  }

  const supabase = createClient();
  try {
    // Only send columns that actually exist in public.profiles to prevent PostgREST PGRST204 errors
    const dbUpdates: Record<string, any> = {
      updated_at: new Date().toISOString(),
    };
    for (const [key, value] of Object.entries(cleanUpdates)) {
      if (PROFILES_DB_COLUMNS.has(key)) {
        dbUpdates[key] = value;
      }
    }

    // Ensure row exists in Supabase
    await getOrCreateUserProfile(userId, cleanUpdates.full_name);

    const { data, error } = await supabase
      .from('profiles')
      .update(dbUpdates)
      .eq('id', userId)
      .select()
      .maybeSingle();

    if (error) {
      console.error('Error updating profile in Supabase:', error);
      return mergedLocal;
    }

    if (data) {
      const finalProfile: Profile = {
        ...mergedLocal,
        ...(data as Profile),
        onboarding_completed: (data as any).onboarding_completed ?? mergedLocal.onboarding_completed,
      };
      saveLocalCachedProfile(finalProfile);
      return finalProfile;
    }

    return mergedLocal;
  } catch (err) {
    console.error('Exception updating profile:', err);
    return mergedLocal;
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
