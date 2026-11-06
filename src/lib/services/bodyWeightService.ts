// GYM HUB: Canonical Daily Body Weight Service & Analytics
// Handles daily body weight records, 7-day moving averages, conflict checks, and goal progress.

import { createClient } from '../supabase/client';
import { WeightLog } from '../types/database';

export interface WeightRecord {
  id: string;
  user_id: string;
  weight_kg: number;
  logged_at: string; // YYYY-MM-DD
  notes?: string;
  created_at: string;
}

export interface WeightAnalyticsResult {
  currentWeight: number | null;
  latestDate: string | null;
  startWeight: number | null;
  changeKg: number | null;
  goalWeight: number | null;
  progressToGoalPct: number | null;
  recordsCount: number;
  timeline: {
    date: string;
    displayDate: string;
    weightKg: number;
    movingAvg7D: number | null;
    goalWeight: number | null;
  }[];
}

const STORAGE_KEY = 'gymhub_canonical_weight_records_v1';
let inMemoryRecords: WeightRecord[] = [];

function getLocalRecords(): WeightRecord[] {
  if (typeof window === 'undefined') return inMemoryRecords;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : inMemoryRecords;
  } catch (e) {
    return inMemoryRecords;
  }
}

function saveLocalRecords(records: WeightRecord[]): void {
  inMemoryRecords = records;
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.error('Failed to save weight records locally:', e);
  }
}

export async function fetchAllWeightRecords(userId?: string): Promise<WeightRecord[]> {
  let records: WeightRecord[] = [];

  if (userId && userId !== 'guest' && userId !== 'demo') {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('weight_logs')
        .select('*')
        .eq('user_id', userId)
        .order('logged_at', { ascending: true });

      if (!error && data) {
        records = data.map((d: any) => ({
          id: d.id,
          user_id: d.user_id,
          weight_kg: Number(d.weight_kg),
          logged_at: d.logged_at ? d.logged_at.split('T')[0] : new Date().toISOString().split('T')[0],
          notes: d.notes,
          created_at: d.created_at || new Date().toISOString(),
        }));
      }
    } catch (err) {
      console.warn('Supabase fetch weight error, using local fallback:', err);
    }
  }

  if (records.length === 0) {
    records = getLocalRecords();
  }

  // Deduplicate by logged_at (canonical one per date, latest wins)
  const map = new Map<string, WeightRecord>();
  for (const r of records) {
    map.set(r.logged_at, r);
  }

  return Array.from(map.values()).sort((a, b) => a.logged_at.localeCompare(b.logged_at));
}

export async function fetchWeightRecordByDate(
  userId: string | undefined,
  dateStr: string
): Promise<WeightRecord | null> {
  const all = await fetchAllWeightRecords(userId);
  return all.find((r) => r.logged_at === dateStr) || null;
}

export interface SaveWeightParams {
  userId?: string;
  weightKg: number;
  loggedAt: string; // YYYY-MM-DD
  notes?: string;
  allowOverwrite?: boolean;
}

export interface SaveWeightResult {
  success: boolean;
  conflict?: boolean;
  existingRecord?: WeightRecord;
  record?: WeightRecord;
  error?: string;
}

export async function saveCanonicalWeightRecord({
  userId,
  weightKg,
  loggedAt,
  notes,
  allowOverwrite = false,
}: SaveWeightParams): Promise<SaveWeightResult> {
  if (weightKg <= 20 || weightKg >= 350) {
    return { success: false, error: 'Please enter a plausible body weight between 20 kg and 350 kg.' };
  }

  const existing = await fetchWeightRecordByDate(userId, loggedAt);

  if (existing && !allowOverwrite) {
    return {
      success: false,
      conflict: true,
      existingRecord: existing,
    };
  }

  const nowIso = new Date().toISOString();
  let saved: WeightRecord | null = null;

  if (userId && userId !== 'guest' && userId !== 'demo') {
    try {
      const supabase = createClient();
      if (existing) {
        const { data, error } = await supabase
          .from('weight_logs')
          .update({
            weight_kg: weightKg,
            notes: notes || null,
          })
          .eq('id', existing.id)
          .select()
          .single();

        if (!error && data) {
          saved = {
            id: data.id,
            user_id: data.user_id,
            weight_kg: Number(data.weight_kg),
            logged_at: data.logged_at,
            notes: data.notes,
            created_at: data.created_at,
          };
        }
      } else {
        const { data, error } = await supabase
          .from('weight_logs')
          .insert([{
            user_id: userId,
            weight_kg: weightKg,
            logged_at: loggedAt,
            notes: notes || null,
          }])
          .select()
          .single();

        if (!error && data) {
          saved = {
            id: data.id,
            user_id: data.user_id,
            weight_kg: Number(data.weight_kg),
            logged_at: data.logged_at,
            notes: data.notes,
            created_at: data.created_at,
          };
        }
      }
    } catch (err) {
      console.warn('Supabase save weight error:', err);
    }
  }

  if (!saved) {
    saved = {
      id: existing?.id || `local_w_${Date.now()}`,
      user_id: userId || 'guest',
      weight_kg: weightKg,
      logged_at: loggedAt,
      notes,
      created_at: existing?.created_at || nowIso,
    };
  }

  // Update local cache
  const local = getLocalRecords();
  const filtered = local.filter((r) => r.logged_at !== loggedAt);
  filtered.push(saved);
  filtered.sort((a, b) => a.logged_at.localeCompare(b.logged_at));
  saveLocalRecords(filtered);

  return { success: true, record: saved };
}

export async function deleteWeightRecord(id: string, loggedAt: string, userId?: string): Promise<boolean> {
  if (userId && userId !== 'guest' && userId !== 'demo') {
    try {
      const supabase = createClient();
      await supabase.from('weight_logs').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase delete weight error:', err);
    }
  }

  const local = getLocalRecords();
  saveLocalRecords(local.filter((r) => r.id !== id && r.logged_at !== loggedAt));
  return true;
}

// -------------------------------------------------------------
// WEIGHT ANALYTICS: 7-DAY MOVING AVERAGE, GOAL PROGRESSION
// -------------------------------------------------------------
export function calculateWeightAnalytics(
  records: WeightRecord[],
  startDateStr: string,
  endDateStr: string,
  goalWeightKg?: number | null
): WeightAnalyticsResult {
  // Filter within date window
  const inRange = records
    .filter((r) => r.logged_at >= startDateStr && r.logged_at <= endDateStr)
    .sort((a, b) => a.logged_at.localeCompare(b.logged_at));

  if (inRange.length === 0) {
    const allSorted = [...records].sort((a, b) => a.logged_at.localeCompare(b.logged_at));
    const latest = allSorted[allSorted.length - 1] || null;
    return {
      currentWeight: latest ? latest.weight_kg : null,
      latestDate: latest ? latest.logged_at : null,
      startWeight: null,
      changeKg: null,
      goalWeight: goalWeightKg || null,
      progressToGoalPct: null,
      recordsCount: 0,
      timeline: [],
    };
  }

  const firstRec = inRange[0];
  const latestRec = inRange[inRange.length - 1];
  const changeKg = Math.round((latestRec.weight_kg - firstRec.weight_kg) * 10) / 10;

  let progressPct: number | null = null;
  if (goalWeightKg && firstRec.weight_kg !== goalWeightKg) {
    const totalDiff = Math.abs(goalWeightKg - firstRec.weight_kg);
    const achieved = Math.abs(latestRec.weight_kg - firstRec.weight_kg);
    progressPct = Math.min(100, Math.round((achieved / totalDiff) * 100));
  }

  // 7-Day Moving Average calculation across real records
  const timeline = inRange.map((rec, idx) => {
    // Window: records up to 6 days prior to rec.logged_at
    const [y, m, d] = rec.logged_at.split('-').map(Number);
    const recDate = new Date(y, m - 1, d);
    const windowStart = new Date(recDate);
    windowStart.setDate(windowStart.getDate() - 6);
    const winStartStr = windowStart.toISOString().split('T')[0];

    const windowPoints = inRange.filter((p) => p.logged_at >= winStartStr && p.logged_at <= rec.logged_at);
    let movingAvg: number | null = null;
    if (windowPoints.length >= 2) {
      const sum = windowPoints.reduce((acc, curr) => acc + curr.weight_kg, 0);
      movingAvg = Math.round((sum / windowPoints.length) * 10) / 10;
    }

    const displayDate = recDate.toLocaleDateString([], { month: 'short', day: 'numeric' });

    return {
      date: rec.logged_at,
      displayDate,
      weightKg: rec.weight_kg,
      movingAvg7D: movingAvg,
      goalWeight: goalWeightKg || null,
    };
  });

  return {
    currentWeight: latestRec.weight_kg,
    latestDate: latestRec.logged_at,
    startWeight: firstRec.weight_kg,
    changeKg,
    goalWeight: goalWeightKg || null,
    progressToGoalPct: progressPct,
    recordsCount: inRange.length,
    timeline,
  };
}

export const addWeightLogRecord = saveCanonicalWeightRecord;
