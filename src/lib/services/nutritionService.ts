import { createClient } from '../supabase/client';
import { NutritionEntry, MealType } from '../types/database';

const GUEST_STORAGE_KEY = 'gymhub_nutrition_entries_guest';

function getGuestEntries(): NutritionEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GUEST_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse guest nutrition entries:', e);
    return [];
  }
}

function saveGuestEntries(entries: NutritionEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GUEST_STORAGE_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('Failed to persist guest nutrition entries:', e);
  }
}

export async function fetchNutritionEntries(userId: string, dateStr: string): Promise<NutritionEntry[]> {
  const supabase = createClient();

  if (userId && userId !== 'demo' && userId !== 'guest') {
    try {
      const { data, error } = await supabase
        .from('nutrition_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('entry_date', dateStr)
        .order('created_at', { ascending: true });

      if (!error && data) {
        return data as NutritionEntry[];
      }
      if (error) {
        console.warn('Supabase fetch nutrition entries error, using local fallback:', error.message);
      }
    } catch (err) {
      console.warn('Supabase connection error:', err);
    }
  }

  // Fallback to guest storage
  const all = getGuestEntries();
  return all.filter((item) => item.entry_date === dateStr);
}

export async function fetchNutritionDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<NutritionEntry[]> {
  const supabase = createClient();

  if (userId && userId !== 'demo' && userId !== 'guest') {
    try {
      const { data, error } = await supabase
        .from('nutrition_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('entry_date', startDate)
        .lte('entry_date', endDate)
        .order('entry_date', { ascending: true })
        .order('created_at', { ascending: true });

      if (!error && data) {
        return data as NutritionEntry[];
      }
    } catch (err) {
      console.warn('Supabase range query error:', err);
    }
  }

  const all = getGuestEntries();
  return all.filter((item) => item.entry_date >= startDate && item.entry_date <= endDate);
}

export async function addNutritionEntry(
  entry: Omit<NutritionEntry, 'id' | 'created_at' | 'updated_at'>
): Promise<NutritionEntry> {
  const supabase = createClient();
  const now = new Date().toISOString();

  if (entry.user_id && entry.user_id !== 'demo' && entry.user_id !== 'guest') {
    try {
      const { data, error } = await supabase
        .from('nutrition_entries')
        .insert([entry])
        .select()
        .single();

      if (!error && data) {
        return data as NutritionEntry;
      }
      console.warn('Supabase insert failed, saving to local backup:', error?.message);
    } catch (err) {
      console.warn('Supabase insert exception:', err);
    }
  }

  const newEntry: NutritionEntry = {
    ...entry,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `local_${Date.now()}_${Math.random()}`,
    created_at: now,
    updated_at: now,
  };

  const all = getGuestEntries();
  all.push(newEntry);
  saveGuestEntries(all);
  return newEntry;
}

export async function updateNutritionEntry(
  id: string,
  updates: Partial<Omit<NutritionEntry, 'id' | 'user_id' | 'created_at'>>
): Promise<boolean> {
  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('nutrition_entries')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) return true;
  } catch (err) {
    console.warn('Supabase update error:', err);
  }

  // Update in local guest storage
  const all = getGuestEntries();
  const idx = all.findIndex((e) => e.id === id);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...updates, updated_at: new Date().toISOString() };
    saveGuestEntries(all);
    return true;
  }
  return false;
}

export async function deleteNutritionEntry(id: string): Promise<boolean> {
  const supabase = createClient();

  try {
    const { error } = await supabase.from('nutrition_entries').delete().eq('id', id);
    if (!error) {
      // Also clean up local if exists
      const all = getGuestEntries().filter((e) => e.id !== id);
      saveGuestEntries(all);
      return true;
    }
  } catch (err) {
    console.warn('Supabase delete error:', err);
  }

  const all = getGuestEntries().filter((e) => e.id !== id);
  saveGuestEntries(all);
  return true;
}

export interface DailyNutrientSummary {
  hasEntries: boolean;
  totalEntriesCount: number;
  calories: number;
  protein_g: number;
  carbs_g: number;
  total_fat_g: number;

  fibre_g: number | null;
  fibreMissingCount: number;

  total_sugars_g: number | null;
  totalSugarsMissingCount: number;

  added_sugar_g: number | null;
  addedSugarMissingCount: number;

  naturallyOccurringSugar_g: number | null;

  saturated_fat_g: number | null;
  saturatedFatMissingCount: number;
}

export function calculateDailyNutrients(entries: NutritionEntry[]): DailyNutrientSummary {
  if (!entries || entries.length === 0) {
    return {
      hasEntries: false,
      totalEntriesCount: 0,
      calories: 0,
      protein_g: 0,
      carbs_g: 0,
      total_fat_g: 0,
      fibre_g: null,
      fibreMissingCount: 0,
      total_sugars_g: null,
      totalSugarsMissingCount: 0,
      added_sugar_g: null,
      addedSugarMissingCount: 0,
      naturallyOccurringSugar_g: null,
      saturated_fat_g: null,
      saturatedFatMissingCount: 0,
    };
  }

  let calories = 0;
  let protein_g = 0;
  let carbs_g = 0;
  let total_fat_g = 0;

  let fibreSum = 0;
  let fibreEntered = false;
  let fibreMissingCount = 0;

  let sugarsSum = 0;
  let sugarsEntered = false;
  let sugarsMissingCount = 0;

  let addedSugarSum = 0;
  let addedSugarEntered = false;
  let addedSugarMissingCount = 0;

  let satFatSum = 0;
  let satFatEntered = false;
  let satFatMissingCount = 0;

  for (const entry of entries) {
    calories += Number(entry.calories) || 0;
    protein_g += Number(entry.protein_g) || 0;
    carbs_g += Number(entry.carbohydrates_g) || 0;
    total_fat_g += Number(entry.total_fat_g) || 0;

    if (entry.fibre_g !== null && entry.fibre_g !== undefined && !isNaN(Number(entry.fibre_g))) {
      fibreSum += Number(entry.fibre_g);
      fibreEntered = true;
    } else {
      fibreMissingCount++;
    }

    if (entry.total_sugars_g !== null && entry.total_sugars_g !== undefined && !isNaN(Number(entry.total_sugars_g))) {
      sugarsSum += Number(entry.total_sugars_g);
      sugarsEntered = true;
    } else {
      sugarsMissingCount++;
    }

    if (entry.added_sugar_g !== null && entry.added_sugar_g !== undefined && !isNaN(Number(entry.added_sugar_g))) {
      addedSugarSum += Number(entry.added_sugar_g);
      addedSugarEntered = true;
    } else {
      addedSugarMissingCount++;
    }

    if (entry.saturated_fat_g !== null && entry.saturated_fat_g !== undefined && !isNaN(Number(entry.saturated_fat_g))) {
      satFatSum += Number(entry.saturated_fat_g);
      satFatEntered = true;
    } else {
      satFatMissingCount++;
    }
  }

  // Calculate naturally occurring sugars when total sugars entered
  let naturalSugar: number | null = null;
  if (sugarsEntered) {
    const added = addedSugarEntered ? addedSugarSum : 0;
    naturalSugar = Math.max(0, parseFloat((sugarsSum - added).toFixed(1)));
  }

  return {
    hasEntries: true,
    totalEntriesCount: entries.length,
    calories: Math.round(calories),
    protein_g: parseFloat(protein_g.toFixed(1)),
    carbs_g: parseFloat(carbs_g.toFixed(1)),
    total_fat_g: parseFloat(total_fat_g.toFixed(1)),
    fibre_g: fibreEntered ? parseFloat(fibreSum.toFixed(1)) : null,
    fibreMissingCount,
    total_sugars_g: sugarsEntered ? parseFloat(sugarsSum.toFixed(1)) : null,
    totalSugarsMissingCount: sugarsMissingCount,
    added_sugar_g: addedSugarEntered ? parseFloat(addedSugarSum.toFixed(1)) : null,
    addedSugarMissingCount,
    naturallyOccurringSugar_g: naturalSugar,
    saturated_fat_g: satFatEntered ? parseFloat(satFatSum.toFixed(1)) : null,
    saturatedFatMissingCount: satFatMissingCount,
  };
}
