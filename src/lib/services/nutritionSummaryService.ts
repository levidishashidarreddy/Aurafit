// GYM HUB: Daily Nutrition Summary Service & Paste Parser
// Handles client-side parsing of whole-day nutrition summaries (e.g. from ChatGPT),
// persistence to Supabase/localStorage, conflict checks, and period analytics.

import { createClient } from '../supabase/client';
import { DailyNutritionSummary } from '../types/database';

export interface NutritionTargets {
  calories: number;
  proteinMin: number;
  proteinMax: number;
  carbs: number;
  fat: number;
  fibreMin: number;
  fibreMax: number;
}

export const DEFAULT_NUTRITION_TARGETS: NutritionTargets = {
  calories: 1900,
  proteinMin: 80,
  proteinMax: 90,
  carbs: 210,
  fat: 60,
  fibreMin: 25,
  fibreMax: 30,
};

export interface ParsedNutrientValues {
  calories_kcal: number | null;
  protein_g: number | null;
  carbohydrates_g: number | null;
  total_fat_g: number | null;
  fibre_g: number | null;
  total_sugars_g: number | null;
  added_sugar_g: number | null;
  saturated_fat_g: number | null;
}

export interface AmbiguousFieldAlert {
  field: keyof ParsedNutrientValues;
  label: string;
  extractedValue: number | null;
  rawSnippet: string;
  reason: string;
}

export interface ParsedNutritionSummaryResult {
  success: boolean;
  rawPastedText: string;
  values: ParsedNutrientValues;
  detectedCount: number;
  ambiguousAlerts: AmbiguousFieldAlert[];
  unparsedLines: string[];
  errorMessage?: string;
}

const STORAGE_KEY = 'gymhub_daily_nutrition_summaries_v1';
const TARGETS_STORAGE_KEY = 'gymhub_nutrition_targets_v1';

// Local timezone date string (YYYY-MM-DD)
export function getLocalTodayDateString(date: Date = new Date()): string {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function formatDisplayDate(dateStr: string): string {
  if (!dateStr) return '';
  const [year, month, day] = dateStr.split('-').map(Number);
  const d = new Date(year, month - 1, day);
  return d.toLocaleDateString([], {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

// -----------------------------------------------------------------------
// 1. ROBUST LOCAL CLIENT-SIDE PARSER FOR PASTED CHATGPT NUTRITION SUMMARIES
// -----------------------------------------------------------------------
export function parseDailyNutritionSummary(rawText: string): ParsedNutritionSummaryResult {
  const result: ParsedNutrientValues = {
    calories_kcal: null,
    protein_g: null,
    carbohydrates_g: null,
    total_fat_g: null,
    fibre_g: null,
    total_sugars_g: null,
    added_sugar_g: null,
    saturated_fat_g: null,
  };

  const ambiguousAlerts: AmbiguousFieldAlert[] = [];
  const unparsedLines: string[] = [];

  if (!rawText || !rawText.trim()) {
    return {
      success: false,
      rawPastedText: rawText,
      values: result,
      detectedCount: 0,
      ambiguousAlerts: [],
      unparsedLines: [],
      errorMessage: 'Please paste your daily nutrition summary text.',
    };
  }

  const lines = rawText.split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

  // Helper to extract clean numeric value from a candidate string
  // Excludes words like Estimated, Monitor, Calculated, Keep moderate, Not available
  const extractNumericIntake = (text: string): { value: number | null; isAmbiguous: boolean; reason?: string } => {
    if (!text) return { value: null, isAmbiguous: false };

    // Clean out parenthetical targets if present in cell (e.g. "(Target: 1,900 kcal)")
    const cleanCell = text.replace(/\((?:target|goal|status)[^)]*\)/gi, '').trim();

    // Check for purely non-numeric descriptive words
    const lower = cleanCell.toLowerCase();
    const nonNumericPatterns = [
      'estimated',
      'calculated',
      'not available',
      'n/a',
      'na',
      'none',
      'monitor',
      'keep moderate',
      'pending',
      'unknown',
      'around',
      'includes',
      'target',
    ];

    // If string has a range e.g. "80–90" or "80-90", flag as ambiguous
    const rangeMatch = cleanCell.match(/(\d+(?:\.\d+)?)\s*(?:–|-|to)\s*(\d+(?:\.\d+)?)/);
    if (rangeMatch) {
      // Return first number but flag as ambiguous
      const val = parseFloat(rangeMatch[1]);
      return {
        value: isNaN(val) ? null : val,
        isAmbiguous: true,
        reason: `Detected a range "${rangeMatch[0]}". Please confirm single intake amount.`,
      };
    }

    // Match first isolated valid number with optional comma (e.g. 2,050 or 88 or 12.5)
    const numMatch = cleanCell.match(/(?:^|[^\d.])([0-9]{1,3}(?:,[0-9]{3})*(?:\.[0-9]+)?|[0-9]+(?:\.[0-9]+)?)/);
    if (!numMatch) {
      return { value: null, isAmbiguous: false };
    }

    const rawNumStr = numMatch[1].replace(/,/g, '');
    const num = parseFloat(rawNumStr);

    if (isNaN(num)) {
      return { value: null, isAmbiguous: false };
    }

    return { value: num, isAmbiguous: false };
  };

  for (const line of lines) {
    // Skip markdown table horizontal dividers: |---|---| or |:---:|
    if (/^\|?[\s-:]+\|[\s-:]+(\|[\s-:]+)*\|?$/.test(line)) {
      continue;
    }

    // Skip table header rows
    if (/nutrient/i.test(line) && (/daily\s*intake/i.test(line) || /target/i.test(line) || /status/i.test(line))) {
      continue;
    }

    let nutrientCandidate = '';
    let intakeCandidate = '';

    // CASE A: Markdown or pipe-delimited table: e.g. "| Calories | 2,050 kcal | 1,900 kcal |"
    if (line.includes('|')) {
      const parts = line.split('|').map((p) => p.trim());
      // Filter out leading/trailing empty strings resulting from leading/trailing pipes
      const cleanedCols = parts.filter((p, idx) => {
        if ((idx === 0 || idx === parts.length - 1) && p === '') return false;
        return true;
      });

      if (cleanedCols.length >= 2) {
        nutrientCandidate = cleanedCols[0];
        // CRITICAL: Column 1 is ALWAYS the Daily intake column.
        // We deliberately ignore Column 2 (Target / status column) to never mistake target values for intake!
        intakeCandidate = cleanedCols[1];
      } else {
        nutrientCandidate = cleanedCols[0] || '';
      }
    } 
    // CASE B: Colon or equals separated: e.g. "Calories: 2,050 kcal" or "- Protein: 88 g"
    else if (/[:=]/.test(line)) {
      const splitIdx = line.search(/[:=]/);
      nutrientCandidate = line.slice(0, splitIdx).replace(/^[-*•\d.]+\s*/, '').trim();
      intakeCandidate = line.slice(splitIdx + 1).trim();
    }
    // CASE C: Tab or multiple spaces separated: e.g. "Calories    2,050 kcal    1,900 kcal"
    else if (/\t|\s{2,}/.test(line)) {
      const parts = line.split(/\t|\s{2,}/).map((p) => p.trim()).filter(Boolean);
      if (parts.length >= 2) {
        nutrientCandidate = parts[0];
        intakeCandidate = parts[1]; // First value column only
      }
    }

    if (!nutrientCandidate) {
      unparsedLines.push(line);
      continue;
    }

    const nNorm = nutrientCandidate.toLowerCase().replace(/[^a-z\s]/g, '').trim();

    // MATCH NUTRIENTS TO TARGET DATABASE FIELDS
    // Note: check specific compound names (e.g. 'added sugar', 'saturated fat') first!
    if (nNorm.includes('added sugar') || nNorm === 'added') {
      const { value, isAmbiguous, reason } = extractNumericIntake(intakeCandidate);
      result.added_sugar_g = value !== null ? Math.round(value * 10) / 10 : null;
      if (isAmbiguous) ambiguousAlerts.push({ field: 'added_sugar_g', label: 'Added Sugar', extractedValue: result.added_sugar_g, rawSnippet: intakeCandidate, reason: reason || 'Ambiguous format' });
    } else if (nNorm.includes('saturated') || nNorm.includes('sat fat')) {
      const { value, isAmbiguous, reason } = extractNumericIntake(intakeCandidate);
      result.saturated_fat_g = value !== null ? Math.round(value * 10) / 10 : null;
      if (isAmbiguous) ambiguousAlerts.push({ field: 'saturated_fat_g', label: 'Saturated Fat', extractedValue: result.saturated_fat_g, rawSnippet: intakeCandidate, reason: reason || 'Ambiguous format' });
    } else if (nNorm.includes('sugar')) {
      const { value, isAmbiguous, reason } = extractNumericIntake(intakeCandidate);
      result.total_sugars_g = value !== null ? Math.round(value * 10) / 10 : null;
      if (isAmbiguous) ambiguousAlerts.push({ field: 'total_sugars_g', label: 'Total Sugars', extractedValue: result.total_sugars_g, rawSnippet: intakeCandidate, reason: reason || 'Ambiguous format' });
    } else if (nNorm.includes('fibre') || nNorm.includes('fiber') || nNorm.includes('roughage')) {
      const { value, isAmbiguous, reason } = extractNumericIntake(intakeCandidate);
      result.fibre_g = value !== null ? Math.round(value * 10) / 10 : null;
      if (isAmbiguous) ambiguousAlerts.push({ field: 'fibre_g', label: 'Dietary Fibre', extractedValue: result.fibre_g, rawSnippet: intakeCandidate, reason: reason || 'Ambiguous format' });
    } else if (nNorm.includes('fat') || nNorm.includes('lipid')) {
      const { value, isAmbiguous, reason } = extractNumericIntake(intakeCandidate);
      result.total_fat_g = value !== null ? Math.round(value * 10) / 10 : null;
      if (isAmbiguous) ambiguousAlerts.push({ field: 'total_fat_g', label: 'Total Fat', extractedValue: result.total_fat_g, rawSnippet: intakeCandidate, reason: reason || 'Ambiguous format' });
    } else if (nNorm.includes('carb')) {
      const { value, isAmbiguous, reason } = extractNumericIntake(intakeCandidate);
      result.carbohydrates_g = value !== null ? Math.round(value * 10) / 10 : null;
      if (isAmbiguous) ambiguousAlerts.push({ field: 'carbohydrates_g', label: 'Carbohydrates', extractedValue: result.carbohydrates_g, rawSnippet: intakeCandidate, reason: reason || 'Ambiguous format' });
    } else if (nNorm.includes('protein') || nNorm === 'prot') {
      const { value, isAmbiguous, reason } = extractNumericIntake(intakeCandidate);
      result.protein_g = value !== null ? Math.round(value * 10) / 10 : null;
      if (isAmbiguous) ambiguousAlerts.push({ field: 'protein_g', label: 'Protein', extractedValue: result.protein_g, rawSnippet: intakeCandidate, reason: reason || 'Ambiguous format' });
    } else if (nNorm.includes('calor') || nNorm.includes('kcal') || nNorm === 'energy' || nNorm === 'cal') {
      const { value, isAmbiguous, reason } = extractNumericIntake(intakeCandidate);
      result.calories_kcal = value !== null ? Math.round(value) : null;
      if (isAmbiguous) ambiguousAlerts.push({ field: 'calories_kcal', label: 'Calories', extractedValue: result.calories_kcal, rawSnippet: intakeCandidate, reason: reason || 'Ambiguous format' });
    } else {
      unparsedLines.push(line);
    }
  }

  // Count detected non-null nutrient values
  const detectedCount = Object.values(result).filter((v) => v !== null).length;

  // Additional sanity alerts
  if (result.calories_kcal !== null && (result.calories_kcal < 500 || result.calories_kcal > 7500)) {
    ambiguousAlerts.push({
      field: 'calories_kcal',
      label: 'Calories',
      extractedValue: result.calories_kcal,
      rawSnippet: `${result.calories_kcal} kcal`,
      reason: 'Calorie count is outside typical daily bounds (500–7500 kcal). Please verify.',
    });
  }

  const isSuccess = detectedCount > 0;

  return {
    success: isSuccess,
    rawPastedText: rawText,
    values: result,
    detectedCount,
    ambiguousAlerts,
    unparsedLines,
    errorMessage: isSuccess ? undefined : 'No valid nutrient intake values could be recognized from the pasted text. Please verify format.',
  };
}

// -----------------------------------------------------------------------
// 2. SUPABASE & LOCAL STORAGE PERSISTENCE
// -----------------------------------------------------------------------
export function getLocalSummaries(): DailyNutritionSummary[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    console.error('Failed to parse local nutrition summaries:', e);
    return [];
  }
}

function saveLocalSummaries(summaries: DailyNutritionSummary[]) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(summaries));
  } catch (e) {
    console.error('Failed to persist local nutrition summaries:', e);
  }
}

export async function fetchDailySummaryByDate(
  userId: string | undefined,
  entryDate: string
): Promise<DailyNutritionSummary | null> {
  if (userId && userId !== 'guest' && userId !== 'demo') {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('daily_nutrition_summaries')
        .select('*')
        .eq('user_id', userId)
        .eq('entry_date', entryDate)
        .maybeSingle();

      if (!error && data) {
        return data as DailyNutritionSummary;
      }
    } catch (err) {
      console.warn('Supabase fetch daily summary error, checking local:', err);
    }
  }

  const local = getLocalSummaries();
  return local.find((s) => s.entry_date === entryDate) || null;
}

export async function fetchDailySummariesDateRange(
  userId: string | undefined,
  startDateStr: string,
  endDateStr: string
): Promise<DailyNutritionSummary[]> {
  let list: DailyNutritionSummary[] = [];

  if (userId && userId !== 'guest' && userId !== 'demo') {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('daily_nutrition_summaries')
        .select('*')
        .eq('user_id', userId)
        .gte('entry_date', startDateStr)
        .lte('entry_date', endDateStr)
        .order('entry_date', { ascending: true });

      if (!error && data) {
        list = data as DailyNutritionSummary[];
      }
    } catch (err) {
      console.warn('Supabase range query error, falling back to local:', err);
    }
  }

  if (list.length === 0) {
    const local = getLocalSummaries();
    list = local.filter((s) => s.entry_date >= startDateStr && s.entry_date <= endDateStr);
  }

  return list.sort((a, b) => a.entry_date.localeCompare(b.entry_date));
}

export async function fetchAllDailySummaries(
  userId: string | undefined
): Promise<DailyNutritionSummary[]> {
  let list: DailyNutritionSummary[] = [];

  if (userId && userId !== 'guest' && userId !== 'demo') {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('daily_nutrition_summaries')
        .select('*')
        .eq('user_id', userId)
        .order('entry_date', { ascending: false });

      if (!error && data) {
        list = data as DailyNutritionSummary[];
      }
    } catch (err) {
      console.warn('Supabase fetch all summaries error:', err);
    }
  }

  if (list.length === 0) {
    list = getLocalSummaries();
  }

  return list.sort((a, b) => b.entry_date.localeCompare(a.entry_date));
}

export interface SaveDailySummaryParams {
  userId: string;
  entryDate: string;
  values: ParsedNutrientValues;
  rawPastedText?: string;
  notes?: string;
  allowOverwrite?: boolean;
}

export interface SaveDailySummaryResult {
  success: boolean;
  conflict?: boolean;
  existingRecord?: DailyNutritionSummary;
  record?: DailyNutritionSummary;
  error?: string;
}

export async function saveDailyNutritionSummary({
  userId,
  entryDate,
  values,
  rawPastedText,
  notes,
  allowOverwrite = false,
}: SaveDailySummaryParams): Promise<SaveDailySummaryResult> {
  const existing = await fetchDailySummaryByDate(userId, entryDate);

  // If a summary already exists and allowOverwrite is false, prompt warning
  if (existing && !allowOverwrite) {
    return {
      success: false,
      conflict: true,
      existingRecord: existing,
    };
  }

  const nowIso = new Date().toISOString();
  let savedRecord: DailyNutritionSummary | null = null;

  // Supabase save
  if (userId && userId !== 'guest' && userId !== 'demo') {
    try {
      const supabase = createClient();
      const payload = {
        user_id: userId,
        entry_date: entryDate,
        calories_kcal: values.calories_kcal,
        protein_g: values.protein_g,
        carbohydrates_g: values.carbohydrates_g,
        total_fat_g: values.total_fat_g,
        fibre_g: values.fibre_g,
        total_sugars_g: values.total_sugars_g,
        added_sugar_g: values.added_sugar_g,
        saturated_fat_g: values.saturated_fat_g,
        raw_pasted_text: rawPastedText || null,
        notes: notes || null,
        updated_at: nowIso,
      };

      if (existing) {
        const { data, error } = await supabase
          .from('daily_nutrition_summaries')
          .update(payload)
          .eq('id', existing.id)
          .select()
          .single();

        if (!error && data) {
          savedRecord = data as DailyNutritionSummary;
        }
      } else {
        const { data, error } = await supabase
          .from('daily_nutrition_summaries')
          .insert([{ ...payload, created_at: nowIso }])
          .select()
          .single();

        if (!error && data) {
          savedRecord = data as DailyNutritionSummary;
        }
      }
    } catch (err) {
      console.warn('Supabase save error, persisting to local cache:', err);
    }
  }

  // Fallback to local storage if offline or guest
  if (!savedRecord) {
    savedRecord = {
      id: existing?.id || `local_dns_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`,
      user_id: userId || 'guest',
      entry_date: entryDate,
      calories_kcal: values.calories_kcal,
      protein_g: values.protein_g,
      carbohydrates_g: values.carbohydrates_g,
      total_fat_g: values.total_fat_g,
      fibre_g: values.fibre_g,
      total_sugars_g: values.total_sugars_g,
      added_sugar_g: values.added_sugar_g,
      saturated_fat_g: values.saturated_fat_g,
      raw_pasted_text: rawPastedText || null,
      notes: notes || null,
      created_at: existing?.created_at || nowIso,
      updated_at: nowIso,
    };
  }

  // Update local storage cache
  const local = getLocalSummaries();
  const filtered = local.filter((s) => s.entry_date !== entryDate);
  filtered.push(savedRecord);
  saveLocalSummaries(filtered);

  return {
    success: true,
    record: savedRecord,
  };
}

export async function deleteDailyNutritionSummary(
  id: string,
  entryDate: string,
  userId?: string
): Promise<boolean> {
  if (userId && userId !== 'guest' && userId !== 'demo') {
    try {
      const supabase = createClient();
      await supabase.from('daily_nutrition_summaries').delete().eq('id', id);
    } catch (err) {
      console.warn('Supabase delete error:', err);
    }
  }

  const local = getLocalSummaries();
  const updated = local.filter((s) => s.id !== id && s.entry_date !== entryDate);
  saveLocalSummaries(updated);
  return true;
}

// -----------------------------------------------------------------------
// 3. TARGETS CONFIGURATION (SETTINGS PERSISTENCE)
// -----------------------------------------------------------------------
export function getSavedNutritionTargets(): NutritionTargets {
  if (typeof window === 'undefined') return DEFAULT_NUTRITION_TARGETS;
  try {
    const raw = localStorage.getItem(TARGETS_STORAGE_KEY);
    return raw ? { ...DEFAULT_NUTRITION_TARGETS, ...JSON.parse(raw) } : DEFAULT_NUTRITION_TARGETS;
  } catch (e) {
    return DEFAULT_NUTRITION_TARGETS;
  }
}

export function saveNutritionTargets(targets: NutritionTargets): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(TARGETS_STORAGE_KEY, JSON.stringify(targets));
  } catch (e) {
    console.error('Failed to save nutrition targets:', e);
  }
}

// -----------------------------------------------------------------------
// 4. PERIOD ANALYTICS (CALCULATED ONLY OVER VALID DAYS WITH NO FAKE ZEROES)
// -----------------------------------------------------------------------
export interface DailyTrendPoint {
  date: string;
  displayDate: string;
  calories_kcal: number | null;
  protein_g: number | null;
  carbohydrates_g: number | null;
  total_fat_g: number | null;
  fibre_g: number | null;
  targetCalories: number;
  targetProteinMin: number;
  targetProteinMax: number;
}

export interface PeriodAnalyticsResult {
  totalDaysInPeriod: number;
  recordedDaysCount: number;
  missingDaysCount: number;

  avgCalories: number | null;
  caloriesDaysCount: number;

  avgProtein: number | null;
  proteinDaysCount: number;

  avgCarbs: number | null;
  carbsDaysCount: number;

  avgFat: number | null;
  fatDaysCount: number;

  avgFibre: number | null;
  fibreDaysCount: number;

  avgTotalSugars: number | null;
  totalSugarsDaysCount: number;

  avgAddedSugar: number | null;
  addedSugarDaysCount: number;

  avgSaturatedFat: number | null;
  saturatedFatDaysCount: number;

  highestCalorieDay: { date: string; calories: number } | null;
  lowestCalorieDay: { date: string; calories: number } | null;

  daysMeetingCalorieTarget: number;
  daysMeetingProteinTarget: number;

  trendPoints: DailyTrendPoint[];
}

export function calculatePeriodAnalytics(
  summaries: DailyNutritionSummary[],
  startDateStr: string,
  endDateStr: string,
  targets: NutritionTargets
): PeriodAnalyticsResult {
  const dStart = new Date(startDateStr);
  const dEnd = new Date(endDateStr);
  const diffTime = Math.abs(dEnd.getTime() - dStart.getTime());
  const totalDaysInPeriod = Math.max(1, Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1);

  // Filter summaries strictly within date range
  const inRange = summaries.filter((s) => s.entry_date >= startDateStr && s.entry_date <= endDateStr);
  const recordedDaysCount = inRange.length;
  const missingDaysCount = Math.max(0, totalDaysInPeriod - recordedDaysCount);

  // Nutrient sums and counts (calculated ONLY over valid non-null entries)
  let calSum = 0, calCount = 0;
  let protSum = 0, protCount = 0;
  let carbSum = 0, carbCount = 0;
  let fatSum = 0, fatCount = 0;
  let fibSum = 0, fibCount = 0;
  let sugSum = 0, sugCount = 0;
  let addSugSum = 0, addSugCount = 0;
  let satFatSum = 0, satFatCount = 0;

  let highestCalDay: { date: string; calories: number } | null = null;
  let lowestCalDay: { date: string; calories: number } | null = null;

  let daysMeetingCalories = 0;
  let daysMeetingProtein = 0;

  const sorted = [...inRange].sort((a, b) => a.entry_date.localeCompare(b.entry_date));

  const trendPoints: DailyTrendPoint[] = sorted.map((s) => {
    // Calories
    if (s.calories_kcal !== null && !isNaN(s.calories_kcal)) {
      calSum += s.calories_kcal;
      calCount++;

      if (!highestCalDay || s.calories_kcal > highestCalDay.calories) {
        highestCalDay = { date: s.entry_date, calories: s.calories_kcal };
      }
      if (!lowestCalDay || s.calories_kcal < lowestCalDay.calories) {
        lowestCalDay = { date: s.entry_date, calories: s.calories_kcal };
      }

      // Check calorie adherence (within ±100 kcal of target or below target)
      if (Math.abs(s.calories_kcal - targets.calories) <= 100 || s.calories_kcal <= targets.calories) {
        daysMeetingCalories++;
      }
    }

    // Protein
    if (s.protein_g !== null && !isNaN(s.protein_g)) {
      protSum += s.protein_g;
      protCount++;
      if (s.protein_g >= targets.proteinMin) {
        daysMeetingProtein++;
      }
    }

    if (s.carbohydrates_g !== null && !isNaN(s.carbohydrates_g)) {
      carbSum += s.carbohydrates_g;
      carbCount++;
    }

    if (s.total_fat_g !== null && !isNaN(s.total_fat_g)) {
      fatSum += s.total_fat_g;
      fatCount++;
    }

    if (s.fibre_g !== null && !isNaN(s.fibre_g)) {
      fibSum += s.fibre_g;
      fibCount++;
    }

    if (s.total_sugars_g !== null && !isNaN(s.total_sugars_g)) {
      sugSum += s.total_sugars_g;
      sugCount++;
    }

    if (s.added_sugar_g !== null && !isNaN(s.added_sugar_g)) {
      addSugSum += s.added_sugar_g;
      addSugCount++;
    }

    if (s.saturated_fat_g !== null && !isNaN(s.saturated_fat_g)) {
      satFatSum += s.saturated_fat_g;
      satFatCount++;
    }

    const [year, month, day] = s.entry_date.split('-').map(Number);
    const d = new Date(year, month - 1, day);
    const displayDate = d.toLocaleDateString([], { month: 'short', day: 'numeric' });

    return {
      date: s.entry_date,
      displayDate,
      calories_kcal: s.calories_kcal,
      protein_g: s.protein_g,
      carbohydrates_g: s.carbohydrates_g,
      total_fat_g: s.total_fat_g,
      fibre_g: s.fibre_g,
      targetCalories: targets.calories,
      targetProteinMin: targets.proteinMin,
      targetProteinMax: targets.proteinMax,
    };
  });

  return {
    totalDaysInPeriod,
    recordedDaysCount,
    missingDaysCount,

    avgCalories: calCount > 0 ? Math.round(calSum / calCount) : null,
    caloriesDaysCount: calCount,

    avgProtein: protCount > 0 ? Math.round((protSum / protCount) * 10) / 10 : null,
    proteinDaysCount: protCount,

    avgCarbs: carbCount > 0 ? Math.round((carbSum / carbCount) * 10) / 10 : null,
    carbsDaysCount: carbCount,

    avgFat: fatCount > 0 ? Math.round((fatSum / fatCount) * 10) / 10 : null,
    fatDaysCount: fatCount,

    avgFibre: fibCount > 0 ? Math.round((fibSum / fibCount) * 10) / 10 : null,
    fibreDaysCount: fibCount,

    avgTotalSugars: sugCount > 0 ? Math.round((sugSum / sugCount) * 10) / 10 : null,
    totalSugarsDaysCount: sugCount,

    avgAddedSugar: addSugCount > 0 ? Math.round((addSugSum / addSugCount) * 10) / 10 : null,
    addedSugarDaysCount: addSugCount,

    avgSaturatedFat: satFatCount > 0 ? Math.round((satFatSum / satFatCount) * 10) / 10 : null,
    saturatedFatDaysCount: satFatCount,

    highestCalorieDay: highestCalDay,
    lowestCalorieDay: lowestCalDay,

    daysMeetingCalorieTarget: daysMeetingCalories,
    daysMeetingProteinTarget: daysMeetingProtein,

    trendPoints,
  };
}
