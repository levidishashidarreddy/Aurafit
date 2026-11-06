// GYM HUB: Daily Activity & Steps Service
// Supports full-day summary entry (default) or individual special activity entries (walking, treadmill, running),
// strictly preventing double-counting between modes, with streak and trend calculations.

import { createClient } from '../supabase/client';
import { DailyActivitySummary, ActivityEntryMode, ActivityEntry, ActivityType } from '../types/database';

const SUMMARY_STORAGE_KEY = 'gymhub_daily_activity_summaries_v1';
const ENTRIES_STORAGE_KEY = 'gymhub_individual_activity_entries_v1';

function getLocalSummaries(): DailyActivitySummary[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(SUMMARY_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalSummaries(summaries: DailyActivitySummary[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(SUMMARY_STORAGE_KEY, JSON.stringify(summaries));
    window.dispatchEvent(new CustomEvent('gymhub_activity_updated'));
  } catch (e) {
    console.error('Failed to save activity summaries locally:', e);
  }
}

function getLocalIndividualEntries(): ActivityEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(ENTRIES_STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalIndividualEntries(entries: ActivityEntry[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(ENTRIES_STORAGE_KEY, JSON.stringify(entries));
    window.dispatchEvent(new CustomEvent('gymhub_activity_updated'));
  } catch (e) {
    console.error('Failed to save individual activity entries locally:', e);
  }
}

export interface DayResolvedActivity {
  date: string;
  mode: ActivityEntryMode;
  totalSteps: number;
  activeCaloriesBurned: number; // Manually entered, not estimated
  specialEntries: ActivityEntry[];
  hasRecord: boolean;
  notes?: string | null;
}

// Fetch resolved activity for a specific date (Mode A vs Mode B)
export async function fetchDayActivity(
  userId: string | undefined,
  dateStr: string
): Promise<DayResolvedActivity> {
  let summary: DailyActivitySummary | null = null;
  let specialEntries: ActivityEntry[] = [];

  if (userId && userId !== 'guest' && userId !== 'demo') {
    try {
      const supabase = createClient();
      const { data: sData } = await supabase
        .from('daily_activity_summaries')
        .select('*')
        .eq('user_id', userId)
        .eq('entry_date', dateStr)
        .maybeSingle();

      if (sData) summary = sData as DailyActivitySummary;

      const { data: eData } = await supabase
        .from('activity_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('activity_date', dateStr);

      if (eData) specialEntries = eData as ActivityEntry[];
    } catch (err) {
      console.warn('Supabase fetch day activity error, falling back to local:', err);
    }
  }

  if (!summary) {
    const localSummaries = getLocalSummaries();
    summary = localSummaries.find((s) => s.entry_date === dateStr) || null;
  }

  if (specialEntries.length === 0) {
    const localEntries = getLocalIndividualEntries();
    specialEntries = localEntries.filter((e) => e.activity_date === dateStr);
  }

  // If summary exists, check mode:
  // If mode === 'daily_summary', summary is authoritative.
  // If mode === 'individual_activities', sum of special entries is authoritative.
  if (summary && summary.entry_mode === 'daily_summary') {
    return {
      date: dateStr,
      mode: 'daily_summary',
      totalSteps: summary.total_steps,
      activeCaloriesBurned: summary.active_calories_burned,
      specialEntries,
      hasRecord: true,
      notes: summary.notes,
    };
  } else if (specialEntries.length > 0) {
    const sumSteps = specialEntries.reduce((acc, curr) => acc + (curr.steps || 0), 0);
    const sumCalories = specialEntries.reduce((acc, curr) => acc + (curr.calories_burned || 0), 0);
    return {
      date: dateStr,
      mode: 'individual_activities',
      totalSteps: sumSteps,
      activeCaloriesBurned: sumCalories,
      specialEntries,
      hasRecord: true,
      notes: summary?.notes,
    };
  } else if (summary) {
    return {
      date: dateStr,
      mode: 'daily_summary',
      totalSteps: summary.total_steps,
      activeCaloriesBurned: summary.active_calories_burned,
      specialEntries: [],
      hasRecord: true,
      notes: summary.notes,
    };
  }

  return {
    date: dateStr,
    mode: 'daily_summary',
    totalSteps: 0,
    activeCaloriesBurned: 0,
    specialEntries: [],
    hasRecord: false,
    notes: null,
  };
}

// Save Full-Day Summary (Mode A)
export async function saveDailyActivitySummary({
  userId,
  entryDate,
  totalSteps,
  activeCaloriesBurned,
  notes,
}: {
  userId: string | undefined;
  entryDate: string;
  totalSteps: number;
  activeCaloriesBurned: number;
  notes?: string;
}): Promise<DailyActivitySummary> {
  const uid = userId || 'guest';
  const nowIso = new Date().toISOString();

  let saved: DailyActivitySummary | null = null;

  if (userId && userId !== 'guest' && userId !== 'demo') {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('daily_activity_summaries')
        .upsert({
          user_id: uid,
          entry_date: entryDate,
          total_steps: Math.max(0, totalSteps),
          active_calories_burned: Math.max(0, activeCaloriesBurned),
          entry_mode: 'daily_summary',
          notes: notes || null,
          updated_at: nowIso,
        })
        .select()
        .single();

      if (!error && data) {
        saved = data as DailyActivitySummary;
      }
    } catch (err) {
      console.warn('Supabase save activity summary error:', err);
    }
  }

  if (!saved) {
    saved = {
      id: `local_das_${entryDate}_${Date.now()}`,
      user_id: uid,
      entry_date: entryDate,
      total_steps: Math.max(0, totalSteps),
      active_calories_burned: Math.max(0, activeCaloriesBurned),
      entry_mode: 'daily_summary',
      notes: notes || null,
      created_at: nowIso,
      updated_at: nowIso,
    };
  }

  const local = getLocalSummaries();
  const filtered = local.filter((s) => s.entry_date !== entryDate);
  filtered.push(saved);
  saveLocalSummaries(filtered);

  return saved;
}

// Save Individual Special Activity Entry (Mode B)
export async function addSpecialActivityEntry({
  userId,
  activityDate,
  activityType,
  steps,
  caloriesBurned,
  durationMinutes,
  notes,
}: {
  userId: string | undefined;
  activityDate: string;
  activityType: ActivityType;
  steps: number;
  caloriesBurned: number;
  durationMinutes?: number;
  notes?: string;
}): Promise<ActivityEntry> {
  const uid = userId || 'guest';
  const nowIso = new Date().toISOString();

  let saved: ActivityEntry | null = null;

  if (userId && userId !== 'guest' && userId !== 'demo') {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('activity_entries')
        .insert([{
          user_id: uid,
          activity_date: activityDate,
          activity_type: activityType,
          steps: Math.max(0, steps),
          calories_burned: Math.max(0, caloriesBurned),
          duration_minutes: durationMinutes || null,
          notes: notes || null,
        }])
        .select()
        .single();

      if (!error && data) {
        saved = data as ActivityEntry;
      }
    } catch (err) {
      console.warn('Supabase insert special activity error:', err);
    }
  }

  if (!saved) {
    saved = {
      id: `local_sae_${Date.now()}`,
      user_id: uid,
      activity_date: activityDate,
      activity_type: activityType,
      steps: Math.max(0, steps),
      calories_burned: Math.max(0, caloriesBurned),
      duration_minutes: durationMinutes || null,
      notes: notes || null,
      created_at: nowIso,
      updated_at: nowIso,
    };
  }

  const local = getLocalIndividualEntries();
  local.push(saved);
  saveLocalIndividualEntries(local);

  return saved;
}

// Fetch all activity history across dates to calculate streaks
export async function fetchAllActivitySummaries(
  userId: string | undefined
): Promise<DayResolvedActivity[]> {
  const localSummaries = getLocalSummaries();
  const localEntries = getLocalIndividualEntries();

  const summariesByDate = new Map<string, DailyActivitySummary>();
  const entriesByDate = new Map<string, ActivityEntry[]>();
  const allDates = new Set<string>();

  for (const s of localSummaries) {
    summariesByDate.set(s.entry_date, s);
    allDates.add(s.entry_date);
  }
  for (const e of localEntries) {
    if (!entriesByDate.has(e.activity_date)) {
      entriesByDate.set(e.activity_date, []);
    }
    entriesByDate.get(e.activity_date)!.push(e);
    allDates.add(e.activity_date);
  }

  if (userId && userId !== 'guest' && userId !== 'demo') {
    try {
      const supabase = createClient();
      const [sRes, eRes] = await Promise.allSettled([
        supabase.from('daily_activity_summaries').select('*').eq('user_id', userId),
        supabase.from('activity_entries').select('*').eq('user_id', userId),
      ]);

      if (sRes.status === 'fulfilled' && sRes.value.data) {
        for (const s of sRes.value.data as DailyActivitySummary[]) {
          summariesByDate.set(s.entry_date, s);
          allDates.add(s.entry_date);
        }
      }
      if (eRes.status === 'fulfilled' && eRes.value.data) {
        for (const e of eRes.value.data as ActivityEntry[]) {
          if (!entriesByDate.has(e.activity_date)) {
            entriesByDate.set(e.activity_date, []);
          }
          entriesByDate.get(e.activity_date)!.push(e);
          allDates.add(e.activity_date);
        }
      }
    } catch (err) {
      console.warn('Supabase fetch all activity error:', err);
    }
  }

  // Resolve all dates in-memory synchronously (0ms)
  const results: DayResolvedActivity[] = [];
  for (const d of Array.from(allDates)) {
    const summary = summariesByDate.get(d) || null;
    const specialEntries = entriesByDate.get(d) || [];

    if (summary && summary.entry_mode === 'daily_summary') {
      results.push({
        date: d,
        mode: 'daily_summary',
        totalSteps: summary.total_steps,
        activeCaloriesBurned: summary.active_calories_burned,
        specialEntries,
        hasRecord: true,
        notes: summary.notes,
      });
    } else if (specialEntries.length > 0) {
      const sumSteps = specialEntries.reduce((acc, curr) => acc + (curr.steps || 0), 0);
      const sumCalories = specialEntries.reduce((acc, curr) => acc + (curr.calories_burned || 0), 0);
      results.push({
        date: d,
        mode: 'individual_activities',
        totalSteps: sumSteps,
        activeCaloriesBurned: sumCalories,
        specialEntries,
        hasRecord: true,
        notes: summary?.notes,
      });
    } else if (summary) {
      results.push({
        date: d,
        mode: 'daily_summary',
        totalSteps: summary.total_steps,
        activeCaloriesBurned: summary.active_calories_burned,
        specialEntries: [],
        hasRecord: true,
        notes: summary.notes,
      });
    }
  }

  return results.sort((a, b) => a.date.localeCompare(b.date));
}

// Calculate Step Streaks strictly from consecutive dates where totalSteps >= targetSteps
export function calculateStepStreak(
  history: DayResolvedActivity[],
  stepTarget: number
): { currentStreak: number; longestStreak: number } {
  if (history.length === 0 || stepTarget <= 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const successfulDates = new Set(
    history.filter((h) => h.totalSteps >= stepTarget).map((h) => h.date)
  );

  if (successfulDates.size === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  const sortedDates = Array.from(successfulDates).sort();

  // Longest streak
  let longest = 0;
  let currentRun = 0;
  let prevDate: Date | null = null;

  for (const dateStr of sortedDates) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const currentDate = new Date(y, m - 1, d);

    if (prevDate) {
      const diffMs = currentDate.getTime() - prevDate.getTime();
      const diffDays = Math.round(diffMs / (1000 * 60 * 60 * 24));
      if (diffDays === 1) {
        currentRun++;
      } else {
        currentRun = 1;
      }
    } else {
      currentRun = 1;
    }

    if (currentRun > longest) {
      longest = currentRun;
    }
    prevDate = currentDate;
  }

  // Current streak (counting backwards from today or yesterday)
  const today = new Date();
  const todayStr = today.toISOString().split('T')[0];
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];

  let activeStreak = 0;
  let checkDate = successfulDates.has(todayStr) ? today : (successfulDates.has(yesterdayStr) ? yesterday : null);

  if (checkDate) {
    let d = new Date(checkDate);
    while (true) {
      const dStr = d.toISOString().split('T')[0];
      if (successfulDates.has(dStr)) {
        activeStreak++;
        d.setDate(d.getDate() - 1);
      } else {
        break;
      }
    }
  }

  return {
    currentStreak: activeStreak,
    longestStreak: Math.max(longest, activeStreak),
  };
}

export const calculateActivityStreaks = calculateStepStreak;
