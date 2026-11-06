// GYM HUB: Centralized Target Configuration Service (Single Source of Truth)
// Used across Dashboard, Nutrition Tracker, Activity Tracker, Progress Hub, and Profile.

import { createClient } from '../supabase/client';

export interface UserTargets {
  calories: number;
  proteinMin: number;
  proteinMax: number;
  carbs: number;
  fat: number;
  fibreMin: number;
  fibreMax: number;
  steps: number;
  goalWeightKg?: number | null;
  weeklyTrainingDays: number;
}

export const DEFAULT_CENTRALIZED_TARGETS: UserTargets = {
  calories: 1900,
  proteinMin: 80,
  proteinMax: 90,
  carbs: 210,
  fat: 60,
  fibreMin: 25,
  fibreMax: 30,
  steps: 10000,
  goalWeightKg: null,
  weeklyTrainingDays: 4,
};

const STORAGE_KEY = 'gymhub_centralized_targets_v1';

export function getLocalCachedTargets(): UserTargets {
  if (typeof window === 'undefined') return DEFAULT_CENTRALIZED_TARGETS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_CENTRALIZED_TARGETS;
    return { ...DEFAULT_CENTRALIZED_TARGETS, ...JSON.parse(raw) };
  } catch (e) {
    return DEFAULT_CENTRALIZED_TARGETS;
  }
}

export function setLocalCachedTargets(targets: UserTargets): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(targets));
    // Dispatch event so all listening pages update immediately
    window.dispatchEvent(new CustomEvent('gymhub_targets_updated', { detail: targets }));
  } catch (e) {
    console.error('Failed to set cached targets:', e);
  }
}

export async function fetchUserTargets(userId?: string): Promise<UserTargets> {
  let targets: UserTargets = getLocalCachedTargets();

  if (userId && userId !== 'guest' && userId !== 'demo') {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('profiles')
        .select(`
          target_calories,
          target_protein_g,
          target_protein_min,
          target_protein_max,
          target_carbs_g,
          target_fat_g,
          target_fibre_g,
          target_fibre_min,
          target_fibre_max,
          target_steps,
          weekly_training_days,
          goal_weight_kg
        `)
        .eq('id', userId)
        .maybeSingle();

      if (!error && data) {
        targets = {
          calories: data.target_calories ?? targets.calories ?? DEFAULT_CENTRALIZED_TARGETS.calories,
          proteinMin: data.target_protein_min ?? (data.target_protein_g ? Number(data.target_protein_g) - 5 : targets.proteinMin),
          proteinMax: data.target_protein_max ?? (data.target_protein_g ? Number(data.target_protein_g) + 5 : targets.proteinMax),
          carbs: data.target_carbs_g ? Number(data.target_carbs_g) : targets.carbs,
          fat: data.target_fat_g ? Number(data.target_fat_g) : targets.fat,
          fibreMin: data.target_fibre_min ?? (data.target_fibre_g ? Number(data.target_fibre_g) - 2 : targets.fibreMin),
          fibreMax: data.target_fibre_max ?? (data.target_fibre_g ? Number(data.target_fibre_g) + 2 : targets.fibreMax),
          steps: data.target_steps ?? targets.steps ?? DEFAULT_CENTRALIZED_TARGETS.steps,
          goalWeightKg: data.goal_weight_kg ? Number(data.goal_weight_kg) : targets.goalWeightKg,
          weeklyTrainingDays: data.weekly_training_days ?? targets.weeklyTrainingDays ?? DEFAULT_CENTRALIZED_TARGETS.weeklyTrainingDays,
        };
        setLocalCachedTargets(targets);
      }
    } catch (err) {
      console.warn('Could not fetch targets from Supabase, using local:', err);
    }
  }

  return targets;
}

export async function saveUserTargets(
  userId: string | undefined,
  newTargets: Partial<UserTargets>
): Promise<UserTargets> {
  const current = await fetchUserTargets(userId);
  const updated: UserTargets = { ...current, ...newTargets };

  setLocalCachedTargets(updated);

  if (userId && userId !== 'guest' && userId !== 'demo') {
    try {
      const supabase = createClient();
      await supabase
        .from('profiles')
        .update({
          target_calories: updated.calories,
          target_protein_min: updated.proteinMin,
          target_protein_max: updated.proteinMax,
          target_protein_g: Math.round((updated.proteinMin + updated.proteinMax) / 2),
          target_carbs_g: updated.carbs,
          target_fat_g: updated.fat,
          target_fibre_min: updated.fibreMin,
          target_fibre_max: updated.fibreMax,
          target_fibre_g: Math.round((updated.fibreMin + updated.fibreMax) / 2),
          target_steps: updated.steps,
          weekly_training_days: updated.weeklyTrainingDays,
          goal_weight_kg: updated.goalWeightKg,
          updated_at: new Date().toISOString(),
        })
        .eq('id', userId);
    } catch (err) {
      console.warn('Could not save targets to Supabase:', err);
    }
  }

  return updated;
}
