'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { createClient, getFastAuthUser } from '@/lib/supabase/client';
import {
  Calendar,
  Sparkles,
  CheckCircle2,
  AlertTriangle,
  ChevronLeft,
  ChevronRight,
  TrendingUp,
  Scale,
  Settings,
  Pencil,
  Trash2,
  Info,
  Clock,
  ArrowRight,
  Check,
  X,
  FileText,
  BarChart3,
  Flame,
  Zap,
  Activity,
  Layers
} from 'lucide-react';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  Legend,
  ReferenceLine
} from 'recharts';
import { DailyNutritionSummary } from '@/lib/types/database';
import {
  NutritionTargets,
  DEFAULT_NUTRITION_TARGETS,
  ParsedNutrientValues,
  AmbiguousFieldAlert,
  ParsedNutritionSummaryResult,
  getLocalTodayDateString,
  formatDisplayDate,
  parseDailyNutritionSummary,
  fetchDailySummaryByDate,
  fetchDailySummariesDateRange,
  fetchAllDailySummaries,
  saveDailyNutritionSummary,
  deleteDailyNutritionSummary,
  getSavedNutritionTargets,
  saveNutritionTargets,
  calculatePeriodAnalytics,
  PeriodAnalyticsResult,
  getLocalSummaries,
} from '@/lib/services/nutritionSummaryService';

type AnalyticsTimeframe = '7D' | '30D' | 'THIS_MONTH' | 'PREV_MONTH' | 'CUSTOM';

export default function DailyNutritionTrackerPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [selectedDate, setSelectedDate] = useState<string>(() => getLocalTodayDateString());
  const todayStr = useMemo(() => getLocalTodayDateString(), []);

  // Targets
  const [targets, setTargets] = useState<NutritionTargets>(DEFAULT_NUTRITION_TARGETS);
  const [isTargetsModalOpen, setIsTargetsModalOpen] = useState<boolean>(false);
  const [tempTargets, setTempTargets] = useState<NutritionTargets>(DEFAULT_NUTRITION_TARGETS);

  // Active Daily Summary Record - instant local prefill
  const [currentSummary, setCurrentSummary] = useState<DailyNutritionSummary | null>(() => {
    if (typeof window === 'undefined') return null;
    const list = getLocalSummaries();
    return list.find((s) => s.entry_date === getLocalTodayDateString()) || null;
  });
  const [allSummaries, setAllSummaries] = useState<DailyNutritionSummary[]>(() => {
    if (typeof window === 'undefined') return [];
    return getLocalSummaries();
  });
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Paste & Parse State
  const [pastedText, setPastedText] = useState<string>('');
  const [parseResult, setParseResult] = useState<ParsedNutritionSummaryResult | null>(null);
  const [editableValues, setEditableValues] = useState<ParsedNutrientValues>({
    calories_kcal: null,
    protein_g: null,
    carbohydrates_g: null,
    total_fat_g: null,
    fibre_g: null,
    total_sugars_g: null,
    added_sugar_g: null,
    saturated_fat_g: null,
  });
  const [userNotes, setUserNotes] = useState<string>('');
  const [isSaving, setIsSaving] = useState<boolean>(false);

  // Conflict Modal State
  const [conflictModalOpen, setConflictModalOpen] = useState<boolean>(false);
  const [existingConflictRecord, setExistingConflictRecord] = useState<DailyNutritionSummary | null>(null);

  // Delete Confirmation State
  const [deleteModalOpen, setDeleteModalOpen] = useState<boolean>(false);
  const [recordToDelete, setRecordToDelete] = useState<DailyNutritionSummary | null>(null);

  // Analytics Period Filter
  const [analyticsPeriod, setAnalyticsPeriod] = useState<AnalyticsTimeframe>('30D');
  const [customAnalyticsStart, setCustomAnalyticsStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return getLocalTodayDateString(d);
  });
  const [customAnalyticsEnd, setCustomAnalyticsEnd] = useState<string>(todayStr);

  const supabase = createClient();

  // Load User & Saved Targets
  useEffect(() => {
    async function initUser() {
      try {
        const user = await getFastAuthUser();
        if (user) {
          setUserId(user.id);
        }
      } catch (err) {
        console.warn('Auth check error:', err);
      }
      const savedT = getSavedNutritionTargets();
      setTargets(savedT);
      setTempTargets(savedT);
    }
    initUser();
  }, []);

  // Load Data for Selected Date and All Summaries in parallel
  const refreshData = async () => {
    try {
      const [summaryRes, allRes] = await Promise.allSettled([
        fetchDailySummaryByDate(userId || undefined, selectedDate),
        fetchAllDailySummaries(userId || undefined),
      ]);
      if (summaryRes.status === 'fulfilled') {
        setCurrentSummary(summaryRes.value);
      }
      if (allRes.status === 'fulfilled') {
        setAllSummaries(allRes.value);
      }
    } catch (err) {
      console.error('Error fetching summaries:', err);
    }
  };

  useEffect(() => {
    refreshData();
  }, [selectedDate, userId]);

  // Date Navigation Helpers
  const handlePrevDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() - 1);
    setSelectedDate(getLocalTodayDateString(dateObj));
  };

  const handleNextDay = () => {
    const [y, m, d] = selectedDate.split('-').map(Number);
    const dateObj = new Date(y, m - 1, d);
    dateObj.setDate(dateObj.getDate() + 1);
    setSelectedDate(getLocalTodayDateString(dateObj));
  };

  const handleJumpToToday = () => {
    setSelectedDate(todayStr);
  };

  // Analyze Pasted Text
  const handleAnalyzePastedSummary = () => {
    if (!pastedText.trim()) return;
    const parsed = parseDailyNutritionSummary(pastedText);
    setParseResult(parsed);
    setEditableValues(parsed.values);
  };

  // Clear Editor
  const handleClearEditor = () => {
    setPastedText('');
    setParseResult(null);
    setEditableValues({
      calories_kcal: null,
      protein_g: null,
      carbohydrates_g: null,
      total_fat_g: null,
      fibre_g: null,
      total_sugars_g: null,
      added_sugar_g: null,
      saturated_fat_g: null,
    });
    setUserNotes('');
  };

  // Prepopulate Editor from Existing Record
  const handleEditExistingRecord = (record: DailyNutritionSummary) => {
    setSelectedDate(record.entry_date);
    setPastedText(record.raw_pasted_text || '');
    setParseResult({
      success: true,
      rawPastedText: record.raw_pasted_text || '',
      values: {
        calories_kcal: record.calories_kcal,
        protein_g: record.protein_g,
        carbohydrates_g: record.carbohydrates_g,
        total_fat_g: record.total_fat_g,
        fibre_g: record.fibre_g,
        total_sugars_g: record.total_sugars_g,
        added_sugar_g: record.added_sugar_g,
        saturated_fat_g: record.saturated_fat_g,
      },
      detectedCount: [
        record.calories_kcal,
        record.protein_g,
        record.carbohydrates_g,
        record.total_fat_g,
        record.fibre_g,
        record.total_sugars_g,
        record.added_sugar_g,
        record.saturated_fat_g,
      ].filter((v) => v !== null).length,
      ambiguousAlerts: [],
      unparsedLines: [],
    });
    setEditableValues({
      calories_kcal: record.calories_kcal,
      protein_g: record.protein_g,
      carbohydrates_g: record.carbohydrates_g,
      total_fat_g: record.total_fat_g,
      fibre_g: record.fibre_g,
      total_sugars_g: record.total_sugars_g,
      added_sugar_g: record.added_sugar_g,
      saturated_fat_g: record.saturated_fat_g,
    });
    setUserNotes(record.notes || '');

    // Scroll smoothly to paste area
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Save Daily Summary
  const handleSaveSummary = async (allowOverwrite: boolean = false) => {
    setIsSaving(true);
    try {
      const res = await saveDailyNutritionSummary({
        userId: userId || 'guest',
        entryDate: selectedDate,
        values: editableValues,
        rawPastedText: pastedText,
        notes: userNotes,
        allowOverwrite,
      });

      if (res.conflict && !allowOverwrite) {
        setExistingConflictRecord(res.existingRecord || null);
        setConflictModalOpen(true);
        setIsSaving(false);
        return;
      }

      if (res.success && res.record) {
        setCurrentSummary(res.record);
        handleClearEditor();
        setConflictModalOpen(false);
        await refreshData();
      }
    } catch (err) {
      console.error('Error saving daily nutrition summary:', err);
    } finally {
      setIsSaving(false);
    }
  };

  // Delete Daily Summary
  const handleConfirmDelete = async () => {
    if (!recordToDelete) return;
    try {
      await deleteDailyNutritionSummary(recordToDelete.id, recordToDelete.entry_date, userId || undefined);
      setDeleteModalOpen(false);
      setRecordToDelete(null);
      if (selectedDate === recordToDelete.entry_date) {
        setCurrentSummary(null);
      }
      await refreshData();
    } catch (err) {
      console.error('Error deleting record:', err);
    }
  };

  // Save Targets
  const handleSaveTargets = () => {
    setTargets(tempTargets);
    saveNutritionTargets(tempTargets);
    setIsTargetsModalOpen(false);
  };

  // Compute Analytics Range Dates
  const { analyticsStart, analyticsEnd, analyticsLabel } = useMemo(() => {
    const end = new Date();
    const start = new Date();

    if (analyticsPeriod === '7D') {
      start.setDate(end.getDate() - 7);
      return {
        analyticsStart: getLocalTodayDateString(start),
        analyticsEnd: getLocalTodayDateString(end),
        analyticsLabel: 'Last 7 Days',
      };
    } else if (analyticsPeriod === '30D') {
      start.setDate(end.getDate() - 30);
      return {
        analyticsStart: getLocalTodayDateString(start),
        analyticsEnd: getLocalTodayDateString(end),
        analyticsLabel: 'Last 30 Days',
      };
    } else if (analyticsPeriod === 'THIS_MONTH') {
      const firstDay = new Date(end.getFullYear(), end.getMonth(), 1);
      return {
        analyticsStart: getLocalTodayDateString(firstDay),
        analyticsEnd: getLocalTodayDateString(end),
        analyticsLabel: 'Current Month',
      };
    } else if (analyticsPeriod === 'PREV_MONTH') {
      const firstDayPrev = new Date(end.getFullYear(), end.getMonth() - 1, 1);
      const lastDayPrev = new Date(end.getFullYear(), end.getMonth(), 0);
      return {
        analyticsStart: getLocalTodayDateString(firstDayPrev),
        analyticsEnd: getLocalTodayDateString(lastDayPrev),
        analyticsLabel: 'Previous Month',
      };
    } else {
      return {
        analyticsStart: customAnalyticsStart,
        analyticsEnd: customAnalyticsEnd,
        analyticsLabel: `Custom (${customAnalyticsStart} to ${customAnalyticsEnd})`,
      };
    }
  }, [analyticsPeriod, customAnalyticsStart, customAnalyticsEnd]);

  // Compute Period Analytics
  const periodAnalytics: PeriodAnalyticsResult = useMemo(() => {
    return calculatePeriodAnalytics(allSummaries, analyticsStart, analyticsEnd, targets);
  }, [allSummaries, analyticsStart, analyticsEnd, targets]);

  const isToday = selectedDate === todayStr;

  return (
    <AppShell headerTitle="Daily Nutrition Tracker">
      {/* 1. TOP HEADER & DATE CONTROLS */}
      <div className="p-4 md:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-orange-950/20 border border-slate-800/90 shadow-2xl space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">
              <Sparkles className="w-3.5 h-3.5" />
              <span>Whole-Day Summary Tracker</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight">
              Daily Nutrition Summary
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Paste your complete daily nutrition table calculated in ChatGPT. Fast, effortless, zero individual food logging.
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              onClick={() => {
                setTempTargets(targets);
                setIsTargetsModalOpen(true);
              }}
              className="py-2 px-3 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-200 text-xs font-bold border border-slate-700/60 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-orange-400" />
              <span>Target Settings</span>
            </button>
          </div>
        </div>

        {/* Date Selector Navigation Bar */}
        <div className="pt-3 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <button
              onClick={handlePrevDay}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
              <Calendar className="w-4 h-4 text-orange-400" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-bold text-slate-100 focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={handleNextDay}
              className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white hover:border-slate-700 transition-colors cursor-pointer"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {!isToday && (
              <button
                onClick={handleJumpToToday}
                className="py-1.5 px-3 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold cursor-pointer transition-all"
              >
                Jump to Today
              </button>
            )}
          </div>

          <div className="text-xs font-medium text-slate-400 flex items-center gap-2">
            <Clock className="w-3.5 h-3.5 text-slate-400" />
            <span>Active Record: <strong className="text-slate-200">{formatDisplayDate(selectedDate)}</strong></span>
            {isToday ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-400 text-[10px] font-bold border border-emerald-500/20">
                Today
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-400 text-[10px] font-bold border border-amber-500/20">
                Backdated
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. PASTE & ANALYZE SUMMARY CARD */}
      <div className="p-4 md:p-6 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
              <FileText className="w-4 h-4 text-orange-400" />
              <span>Paste Daily Nutrition Summary</span>
            </h2>
            <p className="text-xs text-slate-400">
              Copy your entire day's nutrition table from ChatGPT and paste it below.
            </p>
          </div>

          {pastedText && (
            <button
              onClick={handleClearEditor}
              className="text-xs font-semibold text-slate-400 hover:text-slate-200 transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Large Text Area */}
        <textarea
          rows={7}
          value={pastedText}
          onChange={(e) => setPastedText(e.target.value)}
          placeholder={`Paste your ChatGPT table here. For example:
Nutrient | Daily intake | Target / status
Calories | 2,050 kcal | 1,900 kcal
Protein | 88 g | 80–90 g
Carbohydrates | 220 g | Estimated
Total fat | 65 g | Estimated
Dietary fibre | 27 g | Around 25–30 g
Total sugars | 42 g | Includes naturally occurring sugars
Added sugar | 12 g | Keep moderate
Saturated fat | 18 g | Monitor`}
          className="w-full p-4 rounded-2xl bg-slate-950 border border-slate-800/90 text-xs text-slate-200 font-mono focus:outline-none focus:border-orange-500 focus:ring-1 focus:ring-orange-500 transition-all leading-relaxed"
        />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <span className="text-[11px] text-slate-400 italic">
            Supports Markdown tables, bullet lists, plain text, and aliases. The Target/status column is strictly ignored.
          </span>

          <button
            onClick={handleAnalyzePastedSummary}
            disabled={!pastedText.trim()}
            className="w-full sm:w-auto py-3 px-6 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 disabled:opacity-50 disabled:pointer-events-none text-slate-950 font-bold text-xs shadow-xl shadow-orange-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Zap className="w-4 h-4" />
            <span>Analyze Pasted Summary</span>
          </button>
        </div>

        {/* 3. PARSED PREVIEW & EDITABLE FIELDS (BEFORE SAVING) */}
        {parseResult && (
          <div className="mt-5 p-4 md:p-5 rounded-2xl bg-slate-950/80 border border-orange-500/30 space-y-4 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <h3 className="font-extrabold text-slate-100 text-sm">Parsed Nutrition Preview</h3>
                  <p className="text-[11px] text-slate-400">
                    Detected {parseResult.detectedCount} nutrient fields for <strong className="text-slate-200">{formatDisplayDate(selectedDate)}</strong>. Review and adjust any values before saving.
                  </p>
                </div>
              </div>
            </div>

            {/* Ambiguous alerts if any */}
            {parseResult.ambiguousAlerts.length > 0 && (
              <div className="space-y-2">
                {parseResult.ambiguousAlerts.map((alert, idx) => (
                  <div key={idx} className="p-3 rounded-xl bg-amber-950/20 border border-amber-500/30 flex items-start gap-2.5 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div className="space-y-0.5">
                      <span className="font-bold text-amber-300">{alert.label}: {alert.reason}</span>
                      <p className="text-slate-400">Original snippet: <code className="text-amber-200">{alert.rawSnippet}</code></p>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* 8 Nutrient Editable Grid */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Calories */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Calories (kcal)</label>
                <input
                  type="number"
                  step="1"
                  placeholder="NULL"
                  value={editableValues.calories_kcal !== null ? editableValues.calories_kcal : ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    setEditableValues((prev) => ({ ...prev, calories_kcal: val }));
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 text-sm font-extrabold text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Protein */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Protein (g)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="NULL"
                  value={editableValues.protein_g !== null ? editableValues.protein_g : ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    setEditableValues((prev) => ({ ...prev, protein_g: val }));
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 text-sm font-extrabold text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Carbohydrates */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Carbohydrates (g)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="NULL"
                  value={editableValues.carbohydrates_g !== null ? editableValues.carbohydrates_g : ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    setEditableValues((prev) => ({ ...prev, carbohydrates_g: val }));
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 text-sm font-extrabold text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Total Fat */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Total Fat (g)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="NULL"
                  value={editableValues.total_fat_g !== null ? editableValues.total_fat_g : ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    setEditableValues((prev) => ({ ...prev, total_fat_g: val }));
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 text-sm font-extrabold text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Dietary Fibre */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Dietary Fibre (g)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="NULL"
                  value={editableValues.fibre_g !== null ? editableValues.fibre_g : ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    setEditableValues((prev) => ({ ...prev, fibre_g: val }));
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 text-sm font-extrabold text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Total Sugars */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Total Sugars (g)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="NULL"
                  value={editableValues.total_sugars_g !== null ? editableValues.total_sugars_g : ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    setEditableValues((prev) => ({ ...prev, total_sugars_g: val }));
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 text-sm font-extrabold text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Added Sugar */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Added Sugar (g)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="NULL"
                  value={editableValues.added_sugar_g !== null ? editableValues.added_sugar_g : ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    setEditableValues((prev) => ({ ...prev, added_sugar_g: val }));
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 text-sm font-extrabold text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Saturated Fat */}
              <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Saturated Fat (g)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="NULL"
                  value={editableValues.saturated_fat_g !== null ? editableValues.saturated_fat_g : ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    setEditableValues((prev) => ({ ...prev, saturated_fat_g: val }));
                  }}
                  className="w-full py-1.5 px-2 rounded-lg bg-slate-950 border border-slate-800 text-sm font-extrabold text-slate-100 focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>

            {/* Optional Notes */}
            <div className="pt-2">
              <label className="text-[10px] font-bold text-slate-400 uppercase mb-1 block">Notes / Meal Context (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Higher carb day, post-workout refeed, dining out"
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-xs text-slate-200 focus:outline-none focus:border-orange-500"
              />
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
              <span className="text-[11px] text-slate-400">
                Fields left empty will be saved as <strong>NULL</strong> (unavailable), not zero.
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleClearEditor}
                  className="flex-1 sm:flex-none py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveSummary(false)}
                  disabled={isSaving}
                  className="flex-1 sm:flex-none py-2.5 px-6 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black text-xs shadow-lg shadow-emerald-500/20 transition-all flex items-center justify-center gap-2 cursor-pointer"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isSaving ? 'Saving...' : `Save Summary for ${formatDisplayDate(selectedDate)}`}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. DAILY NUTRITION SUMMARY DASHBOARD (SELECTED DATE) */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-orange-400" />
            <span>Daily Intake vs Target: {formatDisplayDate(selectedDate)}</span>
          </h2>

          {currentSummary && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEditExistingRecord(currentSummary)}
                className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Pencil className="w-3 h-3 text-orange-400" />
                <span>Edit / Re-paste</span>
              </button>
              <button
                onClick={() => {
                  setRecordToDelete(currentSummary);
                  setDeleteModalOpen(true);
                }}
                className="py-1 px-2.5 rounded-lg bg-slate-800 hover:bg-rose-950/40 text-rose-400 text-xs font-semibold flex items-center gap-1 cursor-pointer transition-colors"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>

        {currentSummary ? (
          <div className="space-y-4">
            {/* Quick Progress Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Calories Card */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Daily Calories</span>
                <div className="text-xl font-black text-slate-100">
                  {currentSummary.calories_kcal !== null ? `${currentSummary.calories_kcal.toLocaleString()} kcal` : <span className="text-slate-400 text-sm font-normal">Not recorded</span>}
                </div>
                {currentSummary.calories_kcal !== null && (
                  <div className="text-[11px] font-semibold text-slate-300 flex items-center justify-between">
                    <span>Target: {targets.calories.toLocaleString()} kcal</span>
                    <span className={currentSummary.calories_kcal <= targets.calories ? 'text-emerald-400' : 'text-amber-400'}>
                      {targets.calories - currentSummary.calories_kcal >= 0 ? `${targets.calories - currentSummary.calories_kcal} remaining` : `+${currentSummary.calories_kcal - targets.calories} over`}
                    </span>
                  </div>
                )}
              </div>

              {/* Protein Card */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Protein Intake</span>
                <div className="text-xl font-black text-orange-400">
                  {currentSummary.protein_g !== null ? `${currentSummary.protein_g} g` : <span className="text-slate-400 text-sm font-normal">Not recorded</span>}
                </div>
                <div className="text-[11px] font-semibold text-slate-300">
                  Target: {targets.proteinMin}–{targets.proteinMax} g
                </div>
              </div>

              {/* Fibre Card */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Dietary Fibre</span>
                <div className="text-xl font-black text-cyan-400">
                  {currentSummary.fibre_g !== null ? `${currentSummary.fibre_g} g` : <span className="text-slate-400 text-sm font-normal">Not recorded</span>}
                </div>
                <div className="text-[11px] font-semibold text-slate-300">
                  Target: {targets.fibreMin}–{targets.fibreMax} g
                </div>
              </div>

              {/* Summary Completeness */}
              <div className="p-4 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-1.5">
                <span className="text-[10px] font-bold text-slate-400 uppercase block">Status</span>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                  <span className="font-bold text-slate-100 text-sm">Summary Saved</span>
                </div>
                <p className="text-[10px] text-slate-400">
                  Steps are tracked separately and do not alter nutrition intake.
                </p>
              </div>
            </div>

            {/* Dashboard Comparison Table (As explicitly requested in Prompt Section 4) */}
            <div className="p-4 md:p-5 rounded-2xl bg-slate-900/80 border border-slate-800 overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                    <th className="py-2.5 px-3">Nutrient</th>
                    <th className="py-2.5 px-3">Actual Intake</th>
                    <th className="py-2.5 px-3">Target / Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-medium">
                  {/* Calories */}
                  <tr className="hover:bg-slate-800/20">
                    <td className="py-3 px-3 font-bold text-slate-100">Calories</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-100">
                      {currentSummary.calories_kcal !== null ? `${currentSummary.calories_kcal.toLocaleString()} kcal` : <span className="text-slate-500 italic">Not recorded</span>}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {targets.calories.toLocaleString()} kcal {currentSummary.calories_kcal !== null && (
                        <span className={`ml-2 font-bold ${currentSummary.calories_kcal <= targets.calories ? 'text-emerald-400' : 'text-amber-400'}`}>
                          ({currentSummary.calories_kcal <= targets.calories ? 'On Target' : 'Exceeded'})
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Protein */}
                  <tr className="hover:bg-slate-800/20">
                    <td className="py-3 px-3 font-bold text-slate-100">Protein</td>
                    <td className="py-3 px-3 font-mono font-bold text-orange-400">
                      {currentSummary.protein_g !== null ? `${currentSummary.protein_g} g` : <span className="text-slate-500 italic">Not recorded</span>}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      {targets.proteinMin}–{targets.proteinMax} g {currentSummary.protein_g !== null && (
                        <span className={`ml-2 font-bold ${currentSummary.protein_g >= targets.proteinMin ? 'text-emerald-400' : 'text-amber-400'}`}>
                          ({currentSummary.protein_g >= targets.proteinMin ? 'Target Met' : 'Under Range'})
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Carbohydrates */}
                  <tr className="hover:bg-slate-800/20">
                    <td className="py-3 px-3 font-bold text-slate-100">Carbohydrates</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-100">
                      {currentSummary.carbohydrates_g !== null ? `${currentSummary.carbohydrates_g} g` : <span className="text-slate-500 italic">Not recorded</span>}
                    </td>
                    <td className="py-3 px-3 text-slate-400">Target: {targets.carbs} g (or intake only)</td>
                  </tr>

                  {/* Total Fat */}
                  <tr className="hover:bg-slate-800/20">
                    <td className="py-3 px-3 font-bold text-slate-100">Total Fat</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-100">
                      {currentSummary.total_fat_g !== null ? `${currentSummary.total_fat_g} g` : <span className="text-slate-500 italic">Not recorded</span>}
                    </td>
                    <td className="py-3 px-3 text-slate-400">Target: {targets.fat} g (or intake only)</td>
                  </tr>

                  {/* Dietary Fibre */}
                  <tr className="hover:bg-slate-800/20">
                    <td className="py-3 px-3 font-bold text-slate-100">Dietary Fibre</td>
                    <td className="py-3 px-3 font-mono font-bold text-cyan-400">
                      {currentSummary.fibre_g !== null ? `${currentSummary.fibre_g} g` : <span className="text-slate-500 italic">Not recorded</span>}
                    </td>
                    <td className="py-3 px-3 text-slate-300">
                      Around {targets.fibreMin}–{targets.fibreMax} g {currentSummary.fibre_g !== null && (
                        <span className={`ml-2 font-bold ${currentSummary.fibre_g >= targets.fibreMin ? 'text-emerald-400' : 'text-slate-400'}`}>
                          ({currentSummary.fibre_g >= targets.fibreMin ? 'Optimal' : 'Moderate'})
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Total Sugars */}
                  <tr className="hover:bg-slate-800/20">
                    <td className="py-3 px-3 font-bold text-slate-100">Total Sugars</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-100">
                      {currentSummary.total_sugars_g !== null ? `${currentSummary.total_sugars_g} g` : <span className="text-slate-500 italic">Not recorded</span>}
                    </td>
                    <td className="py-3 px-3 text-slate-400">Includes naturally occurring sugars</td>
                  </tr>

                  {/* Added Sugar */}
                  <tr className="hover:bg-slate-800/20">
                    <td className="py-3 px-3 font-bold text-slate-100">Added Sugar</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-100">
                      {currentSummary.added_sugar_g !== null ? `${currentSummary.added_sugar_g} g` : <span className="text-slate-500 italic">Not recorded</span>}
                    </td>
                    <td className="py-3 px-3 text-slate-400">Keep moderate (&lt; 25–30 g)</td>
                  </tr>

                  {/* Saturated Fat */}
                  <tr className="hover:bg-slate-800/20">
                    <td className="py-3 px-3 font-bold text-slate-100">Saturated Fat</td>
                    <td className="py-3 px-3 font-mono font-bold text-slate-100">
                      {currentSummary.saturated_fat_g !== null ? `${currentSummary.saturated_fat_g} g` : <span className="text-slate-500 italic">Not recorded</span>}
                    </td>
                    <td className="py-3 px-3 text-slate-400">Monitor (&lt; 20 g)</td>
                  </tr>
                </tbody>
              </table>

              {currentSummary.notes && (
                <div className="mt-3 p-3 rounded-xl bg-slate-950/60 border border-slate-800 text-xs text-slate-300">
                  <strong className="text-orange-400">Notes:</strong> {currentSummary.notes}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-2xl bg-slate-900/50 border border-slate-800 text-center space-y-2">
            <Calendar className="w-8 h-8 text-slate-500 mx-auto" />
            <h4 className="font-bold text-slate-200 text-sm">No Nutrition Summary Recorded for {formatDisplayDate(selectedDate)}</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Paste your ChatGPT daily table above to record this date. Missing days are never treated as zero calories in analytics.
            </p>
          </div>
        )}
      </div>

      {/* 5. DAILY HISTORY LIST */}
      <div className="p-4 md:p-6 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
              <Calendar className="w-4 h-4 text-orange-400" />
              <span>Daily Nutrition History</span>
            </h2>
            <p className="text-xs text-slate-400">
              Click any date to inspect or edit that day's summary.
            </p>
          </div>
        </div>

        {allSummaries.length === 0 ? (
          <div className="py-8 text-center text-xs text-slate-400">
            No historical records yet. Paste and save your first daily summary above!
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                  <th className="py-2.5 px-3">Date</th>
                  <th className="py-2.5 px-3">Calories</th>
                  <th className="py-2.5 px-3">Protein</th>
                  <th className="py-2.5 px-3">Carbs</th>
                  <th className="py-2.5 px-3">Fat</th>
                  <th className="py-2.5 px-3">Fibre</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60 font-medium">
                {allSummaries.slice(0, 15).map((row) => {
                  const isRowActive = row.entry_date === selectedDate;
                  const isComplete = row.calories_kcal !== null && row.protein_g !== null && row.carbohydrates_g !== null && row.total_fat_g !== null;

                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedDate(row.entry_date)}
                      className={`cursor-pointer transition-colors ${
                        isRowActive ? 'bg-orange-500/10' : 'hover:bg-slate-800/30'
                      }`}
                    >
                      <td className="py-3 px-3 font-bold text-slate-100 flex items-center gap-1.5">
                        {isRowActive && <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
                        <span>{formatDisplayDate(row.entry_date)}</span>
                      </td>
                      <td className="py-3 px-3 font-mono font-bold text-slate-100">
                        {row.calories_kcal !== null ? `${row.calories_kcal.toLocaleString()} kcal` : <span className="text-slate-500 italic">NULL</span>}
                      </td>
                      <td className="py-3 px-3 font-mono text-orange-400 font-bold">
                        {row.protein_g !== null ? `${row.protein_g} g` : <span className="text-slate-500 italic">NULL</span>}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">
                        {row.carbohydrates_g !== null ? `${row.carbohydrates_g} g` : <span className="text-slate-500 italic">NULL</span>}
                      </td>
                      <td className="py-3 px-3 font-mono text-slate-300">
                        {row.total_fat_g !== null ? `${row.total_fat_g} g` : <span className="text-slate-500 italic">NULL</span>}
                      </td>
                      <td className="py-3 px-3 font-mono text-cyan-400">
                        {row.fibre_g !== null ? `${row.fibre_g} g` : <span className="text-slate-500 italic">NULL</span>}
                      </td>
                      <td className="py-3 px-3">
                        {isComplete ? (
                          <span className="text-[10px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                            Full Summary
                          </span>
                        ) : (
                          <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded border border-amber-500/20">
                            Partial Summary
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-3 text-right">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setRecordToDelete(row);
                            setDeleteModalOpen(true);
                          }}
                          className="p-1 rounded text-slate-400 hover:text-rose-400 transition-colors"
                          title="Delete summary"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* 6. WEEKLY AND MONTHLY NUTRITION ANALYTICS */}
      <div className="p-4 md:p-6 rounded-3xl bg-slate-900/90 border border-slate-800/80 shadow-xl space-y-5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <h2 className="text-base font-extrabold text-slate-100 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-orange-400" />
              <span>Weekly & Monthly Nutrition Analytics</span>
            </h2>
            <p className="text-xs text-slate-400">
              Averages are strictly computed from valid recorded days only. Unlogged days are never counted as zero.
            </p>
          </div>

          {/* Period Filter Tabs */}
          <div className="flex items-center gap-1 bg-slate-950 p-1 rounded-xl border border-slate-800 overflow-x-auto max-w-full">
            {(['7D', '30D', 'THIS_MONTH', 'PREV_MONTH', 'CUSTOM'] as AnalyticsTimeframe[]).map((p) => (
              <button
                key={p}
                onClick={() => setAnalyticsPeriod(p)}
                className={`py-1 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  analyticsPeriod === p
                    ? 'bg-orange-500 text-slate-950'
                    : 'text-slate-400 hover:text-slate-200'
                }`}
              >
                {p === 'THIS_MONTH' ? 'This Month' : p === 'PREV_MONTH' ? 'Prev Month' : p}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Range Selector when active */}
        {analyticsPeriod === 'CUSTOM' && (
          <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex flex-wrap items-center gap-3 text-xs">
            <span className="font-bold text-slate-300">Custom Analytics Range:</span>
            <input
              type="date"
              value={customAnalyticsStart}
              onChange={(e) => setCustomAnalyticsStart(e.target.value)}
              className="py-1 px-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={customAnalyticsEnd}
              onChange={(e) => setCustomAnalyticsEnd(e.target.value)}
              className="py-1 px-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100"
            />
          </div>
        )}

        {/* Analytics Summary Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Average Calories */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Avg Daily Calories</span>
            <div className="text-lg font-black text-slate-100">
              {periodAnalytics.avgCalories !== null ? `${periodAnalytics.avgCalories.toLocaleString()} kcal` : <span className="text-slate-500 text-sm">No data</span>}
            </div>
            <div className="text-[10px] text-slate-400">
              Over {periodAnalytics.caloriesDaysCount} recorded days
            </div>
          </div>

          {/* Average Protein */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Avg Daily Protein</span>
            <div className="text-lg font-black text-orange-400">
              {periodAnalytics.avgProtein !== null ? `${periodAnalytics.avgProtein} g` : <span className="text-slate-500 text-sm">No data</span>}
            </div>
            <div className="text-[10px] text-slate-400">
              Over {periodAnalytics.proteinDaysCount} recorded days
            </div>
          </div>

          {/* Adherence */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Target Adherence</span>
            <div className="text-lg font-black text-emerald-400">
              {periodAnalytics.daysMeetingProteinTarget} days
            </div>
            <div className="text-[10px] text-slate-400">
              Met protein target (≥ {targets.proteinMin}g)
            </div>
          </div>

          {/* Logged Days Count */}
          <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
            <span className="text-[10px] font-bold text-slate-400 uppercase">Days Tracked</span>
            <div className="text-lg font-black text-cyan-400">
              {periodAnalytics.recordedDaysCount} / {periodAnalytics.totalDaysInPeriod} days
            </div>
            <div className="text-[10px] text-slate-400">
              {periodAnalytics.missingDaysCount} unlogged days (omitted)
            </div>
          </div>
        </div>

        {/* Detailed Macronutrient Averages */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-1 text-xs">
          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Avg Carbohydrates</span>
            <span className="font-bold text-slate-200">{periodAnalytics.avgCarbs !== null ? `${periodAnalytics.avgCarbs} g` : '—'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Avg Total Fat</span>
            <span className="font-bold text-slate-200">{periodAnalytics.avgFat !== null ? `${periodAnalytics.avgFat} g` : '—'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Avg Dietary Fibre</span>
            <span className="font-bold text-cyan-400">{periodAnalytics.avgFibre !== null ? `${periodAnalytics.avgFibre} g` : '—'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-slate-950/50 border border-slate-800/80">
            <span className="text-slate-400 block text-[10px] uppercase font-bold">Peak Calorie Day</span>
            <span className="font-bold text-amber-400">{periodAnalytics.highestCalorieDay ? `${periodAnalytics.highestCalorieDay.calories} kcal (${periodAnalytics.highestCalorieDay.date})` : '—'}</span>
          </div>
        </div>

        {/* Trend Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5 pt-2">
          {/* Calorie Trend Chart */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-100 text-xs">Daily Calorie Intake Trend</h4>
              <span className="text-[10px] text-orange-400 font-semibold">Target: {targets.calories} kcal</span>
            </div>
            <div className="h-56 w-full pt-1">
              {periodAnalytics.trendPoints.some((p) => p.calories_kcal !== null) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={periodAnalytics.trendPoints.filter((p) => p.calories_kcal !== null)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis dataKey="displayDate" stroke="#64748B" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={10} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                      formatter={(v: any) => [`${v} kcal`, 'Calories']}
                    />
                    <ReferenceLine y={targets.calories} stroke="#F97316" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="calories_kcal" stroke="#10B981" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  No recorded calorie days in this period.
                </div>
              )}
            </div>
          </div>

          {/* Protein Trend Chart */}
          <div className="p-4 rounded-2xl bg-slate-950/80 border border-slate-800 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-bold text-slate-100 text-xs">Daily Protein Intake Trend</h4>
              <span className="text-[10px] text-orange-400 font-semibold">Target: {targets.proteinMin}–{targets.proteinMax} g</span>
            </div>
            <div className="h-56 w-full pt-1">
              {periodAnalytics.trendPoints.some((p) => p.protein_g !== null) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={periodAnalytics.trendPoints.filter((p) => p.protein_g !== null)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1E293B" vertical={false} />
                    <XAxis dataKey="displayDate" stroke="#64748B" fontSize={10} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={10} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0F172A', borderColor: '#334155', borderRadius: '0.75rem', fontSize: '11px' }}
                      formatter={(v: any) => [`${v} g`, 'Protein']}
                    />
                    <ReferenceLine y={targets.proteinMin} stroke="#F97316" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="protein_g" stroke="#F97316" strokeWidth={2.5} dot={{ r: 3 }} />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full flex items-center justify-center text-xs text-slate-500">
                  No recorded protein days in this period.
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* MODAL 1: CONFLICT OVERWRITE CONFIRMATION (PROMPT REQUIREMENT) */}
      {conflictModalOpen && existingConflictRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 md:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3 border-b border-slate-800 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-100 text-sm">Update Existing Daily Summary?</h3>
                <p className="text-[11px] text-slate-400">Date: {formatDisplayDate(selectedDate)}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              A nutrition summary already exists for this date. Do you want to update the existing record with your newly pasted summary?
            </p>

            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-1.5 text-xs">
              <div className="flex justify-between text-slate-400">
                <span>Existing Saved Calories:</span>
                <strong className="text-slate-200">{existingConflictRecord.calories_kcal ?? 'NULL'} kcal</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Existing Saved Protein:</span>
                <strong className="text-slate-200">{existingConflictRecord.protein_g ?? 'NULL'} g</strong>
              </div>
              <div className="flex justify-between text-orange-400 font-bold border-t border-slate-800 pt-1">
                <span>New Value to Overwrite:</span>
                <span>{editableValues.calories_kcal ?? 'NULL'} kcal • {editableValues.protein_g ?? 'NULL'}g prot</span>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setConflictModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveSummary(true)}
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-orange-500/20 cursor-pointer transition-all"
              >
                {isSaving ? 'Updating...' : 'Update Existing Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DELETE CONFIRMATION */}
      {deleteModalOpen && recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-500/10 border border-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-100 text-sm">Delete Nutrition Record?</h3>
                <p className="text-[11px] text-slate-400">{formatDisplayDate(recordToDelete.entry_date)}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to delete the daily summary for <strong>{formatDisplayDate(recordToDelete.entry_date)}</strong>? This action cannot be undone.
            </p>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setRecordToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-black text-xs shadow-lg shadow-rose-500/20 cursor-pointer transition-all"
              >
                Delete Record
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: TARGETS SETTINGS */}
      {isTargetsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 md:p-6 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <Settings className="w-4 h-4 text-orange-400" />
                <h3 className="font-extrabold text-slate-100 text-sm">Configure Daily Nutrition Targets</h3>
              </div>
              <button
                onClick={() => setIsTargetsModalOpen(false)}
                className="text-slate-400 hover:text-white"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-slate-400 font-bold block mb-1">Target Calories (kcal)</label>
                <input
                  type="number"
                  value={tempTargets.calories}
                  onChange={(e) => setTempTargets({ ...tempTargets, calories: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-bold focus:outline-none focus:border-orange-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Protein Min (g)</label>
                  <input
                    type="number"
                    value={tempTargets.proteinMin}
                    onChange={(e) => setTempTargets({ ...tempTargets, proteinMin: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Protein Max (g)</label>
                  <input
                    type="number"
                    value={tempTargets.proteinMax}
                    onChange={(e) => setTempTargets({ ...tempTargets, proteinMax: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Fibre Min (g)</label>
                  <input
                    type="number"
                    value={tempTargets.fibreMin}
                    onChange={(e) => setTempTargets({ ...tempTargets, fibreMin: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Fibre Max (g)</label>
                  <input
                    type="number"
                    value={tempTargets.fibreMax}
                    onChange={(e) => setTempTargets({ ...tempTargets, fibreMax: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Carbs Target (g)</label>
                  <input
                    type="number"
                    value={tempTargets.carbs}
                    onChange={(e) => setTempTargets({ ...tempTargets, carbs: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>
                <div>
                  <label className="text-slate-400 font-bold block mb-1">Fat Target (g)</label>
                  <input
                    type="number"
                    value={tempTargets.fat}
                    onChange={(e) => setTempTargets({ ...tempTargets, fat: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-bold focus:outline-none focus:border-orange-500"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2">
              <button
                onClick={() => setIsTargetsModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold text-xs cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTargets}
                className="flex-1 py-2.5 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-black text-xs shadow-lg shadow-orange-500/20 cursor-pointer transition-all"
              >
                Save Targets
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
