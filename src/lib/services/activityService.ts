import { createClient } from '../supabase/client';
import { ActivityEntry, ActivityType } from '../types/database';

const GUEST_ACTIVITY_KEY = 'gymhub_activity_entries_guest';

function getGuestActivities(): ActivityEntry[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(GUEST_ACTIVITY_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse guest activities:', e);
    return [];
  }
}

function saveGuestActivities(entries: ActivityEntry[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(GUEST_ACTIVITY_KEY, JSON.stringify(entries));
  } catch (e) {
    console.error('Failed to persist guest activities:', e);
  }
}

export async function fetchActivityEntries(userId: string, dateStr: string): Promise<ActivityEntry[]> {
  const supabase = createClient();

  if (userId && userId !== 'demo' && userId !== 'guest') {
    try {
      const { data, error } = await supabase
        .from('activity_entries')
        .select('*')
        .eq('user_id', userId)
        .eq('activity_date', dateStr)
        .order('created_at', { ascending: true });

      if (!error && data) {
        return data as ActivityEntry[];
      }
    } catch (err) {
      console.warn('Supabase activity fetch error:', err);
    }
  }

  const all = getGuestActivities();
  return all.filter((item) => item.activity_date === dateStr);
}

export async function fetchActivityDateRange(
  userId: string,
  startDate: string,
  endDate: string
): Promise<ActivityEntry[]> {
  const supabase = createClient();

  if (userId && userId !== 'demo' && userId !== 'guest') {
    try {
      const { data, error } = await supabase
        .from('activity_entries')
        .select('*')
        .eq('user_id', userId)
        .gte('activity_date', startDate)
        .lte('activity_date', endDate)
        .order('activity_date', { ascending: true })
        .order('created_at', { ascending: true });

      if (!error && data) {
        return data as ActivityEntry[];
      }
    } catch (err) {
      console.warn('Supabase range activity query error:', err);
    }
  }

  const all = getGuestActivities();
  return all.filter((item) => item.activity_date >= startDate && item.activity_date <= endDate);
}

export async function addActivityEntry(
  entry: Omit<ActivityEntry, 'id' | 'created_at' | 'updated_at'>
): Promise<ActivityEntry> {
  // Validate non-negative numbers
  if (entry.steps < 0 || entry.calories_burned < 0 || (entry.duration_minutes !== null && entry.duration_minutes !== undefined && entry.duration_minutes < 0)) {
    throw new Error('Steps, calories burned, and duration cannot be negative.');
  }

  const supabase = createClient();
  const now = new Date().toISOString();

  if (entry.user_id && entry.user_id !== 'demo' && entry.user_id !== 'guest') {
    try {
      const { data, error } = await supabase
        .from('activity_entries')
        .insert([entry])
        .select()
        .single();

      if (!error && data) {
        return data as ActivityEntry;
      }
      console.warn('Supabase activity insert failed, saving to local backup:', error?.message);
    } catch (err) {
      console.warn('Supabase activity insert exception:', err);
    }
  }

  const newEntry: ActivityEntry = {
    ...entry,
    id: typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : `act_${Date.now()}_${Math.random()}`,
    created_at: now,
    updated_at: now,
  };

  const all = getGuestActivities();
  all.push(newEntry);
  saveGuestActivities(all);
  return newEntry;
}

export async function updateActivityEntry(
  id: string,
  updates: Partial<Omit<ActivityEntry, 'id' | 'user_id' | 'created_at'>>
): Promise<boolean> {
  if (
    (updates.steps !== undefined && updates.steps < 0) ||
    (updates.calories_burned !== undefined && updates.calories_burned < 0) ||
    (updates.duration_minutes !== undefined && updates.duration_minutes !== null && updates.duration_minutes < 0)
  ) {
    throw new Error('Values cannot be negative.');
  }

  const supabase = createClient();

  try {
    const { error } = await supabase
      .from('activity_entries')
      .update({ ...updates, updated_at: new Date().toISOString() })
      .eq('id', id);

    if (!error) return true;
  } catch (err) {
    console.warn('Supabase update activity error:', err);
  }

  const all = getGuestActivities();
  const idx = all.findIndex((e) => e.id === id);
  if (idx !== -1) {
    all[idx] = { ...all[idx], ...updates, updated_at: new Date().toISOString() };
    saveGuestActivities(all);
    return true;
  }
  return false;
}

export async function deleteActivityEntry(id: string): Promise<boolean> {
  const supabase = createClient();

  try {
    const { error } = await supabase.from('activity_entries').delete().eq('id', id);
    if (!error) {
      const all = getGuestActivities().filter((e) => e.id !== id);
      saveGuestActivities(all);
      return true;
    }
  } catch (err) {
    console.warn('Supabase activity delete error:', err);
  }

  const all = getGuestActivities().filter((e) => e.id !== id);
  saveGuestActivities(all);
  return true;
}

export interface DayActivitySummary {
  hasEntries: boolean;
  totalSteps: number;
  totalCaloriesBurned: number; // NEVER estimated, strictly sum of manually entered calories
  totalDurationMinutes: number;
  entryCount: number;
  breakdown: {
    walking: { steps: number; calories: number; minutes: number; count: number };
    treadmill: { steps: number; calories: number; minutes: number; count: number };
    running: { steps: number; calories: number; minutes: number; count: number };
  };
}

export function calculateDayActivityTotals(entries: ActivityEntry[]): DayActivitySummary {
  const breakdown = {
    walking: { steps: 0, calories: 0, minutes: 0, count: 0 },
    treadmill: { steps: 0, calories: 0, minutes: 0, count: 0 },
    running: { steps: 0, calories: 0, minutes: 0, count: 0 },
  };

  if (!entries || entries.length === 0) {
    return {
      hasEntries: false,
      totalSteps: 0,
      totalCaloriesBurned: 0,
      totalDurationMinutes: 0,
      entryCount: 0,
      breakdown,
    };
  }

  let totalSteps = 0;
  let totalCalories = 0;
  let totalMinutes = 0;

  for (const entry of entries) {
    const s = Number(entry.steps) || 0;
    const c = Number(entry.calories_burned) || 0;
    const m = Number(entry.duration_minutes) || 0;

    totalSteps += s;
    totalCalories += c;
    totalMinutes += m;

    if (entry.activity_type === 'Walking') {
      breakdown.walking.steps += s;
      breakdown.walking.calories += c;
      breakdown.walking.minutes += m;
      breakdown.walking.count++;
    } else if (entry.activity_type === 'Treadmill') {
      breakdown.treadmill.steps += s;
      breakdown.treadmill.calories += c;
      breakdown.treadmill.minutes += m;
      breakdown.treadmill.count++;
    } else if (entry.activity_type === 'Running') {
      breakdown.running.steps += s;
      breakdown.running.calories += c;
      breakdown.running.minutes += m;
      breakdown.running.count++;
    }
  }

  return {
    hasEntries: true,
    totalSteps,
    totalCaloriesBurned: Math.round(totalCalories),
    totalDurationMinutes: totalMinutes,
    entryCount: entries.length,
    breakdown,
  };
}

/**
 * Calculates accurate calendar streaks handling month/year boundaries and missing days.
 * An entry must achieve >= stepTarget to count towards a streak.
 */
export function calculateStepStreaks(
  allEntries: ActivityEntry[],
  stepTarget: number = 10000
): { currentStreak: number; longestStreak: number } {
  if (!allEntries || allEntries.length === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Group steps by date YYYY-MM-DD
  const stepsByDate: Record<string, number> = {};
  for (const entry of allEntries) {
    const d = entry.activity_date;
    stepsByDate[d] = (stepsByDate[d] || 0) + Number(entry.steps || 0);
  }

  // Filter dates meeting step target
  const achievedDates = new Set<string>();
  for (const [dateStr, totalSteps] of Object.entries(stepsByDate)) {
    if (totalSteps >= stepTarget) {
      achievedDates.add(dateStr);
    }
  }

  if (achievedDates.size === 0) {
    return { currentStreak: 0, longestStreak: 0 };
  }

  // Current Streak Calculation
  // Determine local date string format YYYY-MM-DD
  const now = new Date();
  const formatYMD = (d: Date) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const todayStr = formatYMD(now);
  const yesterday = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 1);
  const yesterdayStr = formatYMD(yesterday);

  let currentStreak = 0;
  let checkDate: Date;

  if (achievedDates.has(todayStr)) {
    // Today achieved, count backwards from today
    checkDate = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (achievedDates.has(yesterdayStr)) {
    // Today not yet achieved, but yesterday was; current streak is still alive starting yesterday
    checkDate = new Date(yesterday.getFullYear(), yesterday.getMonth(), yesterday.getDate());
  } else {
    // Neither today nor yesterday met the target: streak broken
    currentStreak = 0;
    checkDate = new Date(0); // Will terminate loop immediately
  }

  if (checkDate.getTime() > 0) {
    while (true) {
      const dStr = formatYMD(checkDate);
      if (achievedDates.has(dStr)) {
        currentStreak++;
        // Step back one calendar day (handles month & leap year boundaries accurately)
        checkDate.setDate(checkDate.getDate() - 1);
      } else {
        break;
      }
    }
  }

  // Longest Streak Calculation across all history
  const sortedDates = Array.from(achievedDates).sort();
  let longestStreak = 0;
  let tempStreak = 0;
  let prevDate: Date | null = null;

  for (const dateStr of sortedDates) {
    const [y, m, d] = dateStr.split('-').map(Number);
    const currentDate = new Date(y, m - 1, d);

    if (prevDate === null) {
      tempStreak = 1;
    } else {
      // Check if currentDate is exactly 1 calendar day after prevDate
      const expectedNext = new Date(prevDate.getFullYear(), prevDate.getMonth(), prevDate.getDate() + 1);
      if (formatYMD(expectedNext) === formatYMD(currentDate)) {
        tempStreak++;
      } else {
        tempStreak = 1;
      }
    }

    if (tempStreak > longestStreak) {
      longestStreak = tempStreak;
    }
    prevDate = currentDate;
  }

  return {
    currentStreak,
    longestStreak: Math.max(longestStreak, currentStreak),
  };
}

export interface DayHeatmapItem {
  date: string; // YYYY-MM-DD
  dayNumber: number;
  steps: number;
  caloriesBurned: number;
  status: 'completed' | 'incomplete' | 'unlogged';
}

/**
 * Returns full month days marking completed, incomplete, and unlogged days distinctly
 */
export function getMonthHeatmap(
  year: number,
  monthIndex: number, // 0-based: 0 for Jan, 9 for Oct
  entries: ActivityEntry[],
  stepTarget: number = 10000
): DayHeatmapItem[] {
  // Aggregate steps and calories by date
  const dateMap: Record<string, { steps: number; calories: number; count: number }> = {};
  for (const e of entries) {
    if (!dateMap[e.activity_date]) {
      dateMap[e.activity_date] = { steps: 0, calories: 0, count: 0 };
    }
    dateMap[e.activity_date].steps += Number(e.steps) || 0;
    dateMap[e.activity_date].calories += Number(e.calories_burned) || 0;
    dateMap[e.activity_date].count++;
  }

  // Total days in specified month
  const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
  const result: DayHeatmapItem[] = [];

  for (let day = 1; day <= daysInMonth; day++) {
    const mStr = String(monthIndex + 1).padStart(2, '0');
    const dStr = String(day).padStart(2, '0');
    const dateKey = `${year}-${mStr}-${dStr}`;

    const data = dateMap[dateKey];
    if (!data || data.count === 0) {
      result.push({
        date: dateKey,
        dayNumber: day,
        steps: 0,
        caloriesBurned: 0,
        status: 'unlogged',
      });
    } else if (data.steps >= stepTarget) {
      result.push({
        date: dateKey,
        dayNumber: day,
        steps: data.steps,
        caloriesBurned: data.calories,
        status: 'completed',
      });
    } else {
      result.push({
        date: dateKey,
        dayNumber: day,
        steps: data.steps,
        caloriesBurned: data.calories,
        status: 'incomplete',
      });
    }
  }

  return result;
}
