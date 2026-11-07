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
  Layers,
  Utensils,
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
    <AppShell headerTitle="NUTRITION & MACROS" headerSubtitle="DAILY MACRO BUDGET & AI PARSER">
      {/* 1. TOP HEADER & DATE CONTROLS */}
      <div className="p-3.5 sm:p-5 rounded-3xl bg-[#100D20]/85 border border-[#9B5CFF]/25 shadow-[0_10px_30px_rgba(0,0,0,0.5)] space-y-3.5">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-[#00D5FF] uppercase tracking-wider mb-0.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>NUTRITION SYSTEM</span>
            </div>
            <h1 className="text-base sm:text-xl font-display font-extrabold text-white uppercase tracking-wide">
              Daily Nutrition Summary
            </h1>
            <p className="text-xs text-[#A9A1BD] mt-0.5">
              Paste your complete daily nutrition table calculated in ChatGPT. Instant parsing, zero manual item logging.
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
            <button
              onClick={() => {
                setTempTargets(targets);
                setIsTargetsModalOpen(true);
              }}
              className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-display font-bold tracking-wider uppercase border border-white/8 flex items-center gap-1.5 cursor-pointer transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-[#00D5FF]" />
              <span>Targets</span>
            </button>
          </div>
        </div>

        {/* Date Selector Navigation Bar */}
        <div className="pt-2.5 border-t border-white/8 flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-1.5">
            <button
              onClick={handlePrevDay}
              className="w-8 h-8 rounded-xl bg-white/5 border border-white/8 text-slate-300 hover:text-white flex items-center justify-center active:scale-95 transition-all"
              title="Previous Day"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>

            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/8">
              <Calendar className="w-3.5 h-3.5 text-[#00D5FF]" />
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none cursor-pointer"
              />
            </div>

            <button
              onClick={handleNextDay}
              className="w-8 h-8 rounded-xl bg-white/5 border border-white/8 text-slate-300 hover:text-white flex items-center justify-center active:scale-95 transition-all"
              title="Next Day"
            >
              <ChevronRight className="w-4 h-4" />
            </button>

            {!isToday && (
              <button
                onClick={handleJumpToToday}
                className="py-1 px-2.5 rounded-lg bg-[#00D5FF]/15 text-[#00D5FF] text-[11px] font-bold border border-[#00D5FF]/25"
              >
                Today
              </button>
            )}
          </div>

          <div className="text-[11px] font-medium text-slate-400 flex items-center gap-2">
            <Clock className="w-3 h-3 text-slate-400" />
            <span>Active: <strong className="text-white">{formatDisplayDate(selectedDate)}</strong></span>
            {isToday ? (
              <span className="px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 text-[9.5px] font-bold border border-emerald-500/25">
                Today
              </span>
            ) : (
              <span className="px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400 text-[9.5px] font-bold border border-amber-500/25">
                Backdated
              </span>
            )}
          </div>
        </div>
      </div>

      {/* 2. PASTE & ANALYZE SUMMARY CARD */}
      <div className="p-3.5 sm:p-5 rounded-3xl bg-[#0B132B]/85 border border-white/8 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] space-y-3.5">
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <h2 className="text-sm sm:text-base font-display font-extrabold text-white flex items-center gap-2 uppercase tracking-wide">
              <FileText className="w-4 h-4 text-[#00D5FF]" />
              <span>Paste Daily Nutrition Summary</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Copy your entire day's nutrition table from ChatGPT and paste it below.
            </p>
          </div>

          {pastedText && (
            <button
              onClick={handleClearEditor}
              className="text-xs font-semibold text-slate-400 hover:text-white transition-colors cursor-pointer"
            >
              Clear
            </button>
          )}
        </div>

        {/* Large Text Area */}
        <textarea
          rows={6}
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
          className="w-full p-3.5 rounded-2xl bg-black/40 border border-white/10 text-xs text-slate-200 font-mono focus:outline-none focus:border-[#00D5FF] transition-all leading-relaxed"
        />

        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1">
          <span className="text-[10px] text-slate-400 italic">
            Supports Markdown tables, bullet lists, and plain text. Target columns are strictly ignored.
          </span>

          <button
            onClick={handleAnalyzePastedSummary}
            disabled={!pastedText.trim()}
            className="w-full sm:w-auto py-2.5 px-5 rounded-2xl bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF] hover:brightness-110 disabled:opacity-50 disabled:pointer-events-none text-white font-display font-bold text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(155,92,255,0.35)] transition-all flex items-center justify-center gap-2 cursor-pointer active:scale-95 min-h-[44px]"
          >
            <Zap className="w-4 h-4" />
            <span>Analyze Pasted Summary</span>
          </button>
        </div>

        {/* 3. PARSED PREVIEW & EDITABLE FIELDS (BEFORE SAVING) */}
        {parseResult && (
          <div className="mt-4 p-3.5 sm:p-4 rounded-2xl bg-black/40 border border-orange-500/35 space-y-3.5 animate-in fade-in duration-200">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-white/8 pb-2.5">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                <div>
                  <h3 className="font-display font-extrabold text-white text-xs sm:text-sm uppercase tracking-wide">Parsed Nutrition Preview</h3>
                  <p className="text-[10px] text-slate-400">
                    Detected {parseResult.detectedCount} nutrient fields for <strong className="text-slate-200">{formatDisplayDate(selectedDate)}</strong>. Review and adjust any values before saving.
                  </p>
                </div>
              </div>
            </div>

            {/* Ambiguous alerts if any */}
            {parseResult.ambiguousAlerts.length > 0 && (
              <div className="space-y-2">
                {parseResult.ambiguousAlerts.map((alert, idx) => (
                  <div key={idx} className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 flex items-start gap-2.5 text-xs">
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
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Calories */}
              <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/6 space-y-1">
                <label className="text-[9.5px] font-display font-bold text-slate-400 uppercase tracking-wider block">Calories (kcal)</label>
                <input
                  type="number"
                  step="1"
                  placeholder="NULL"
                  value={editableValues.calories_kcal !== null ? editableValues.calories_kcal : ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    setEditableValues((prev) => ({ ...prev, calories_kcal: val }));
                  }}
                  className="w-full py-1.5 px-2 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-[#00D5FF]"
                />
              </div>

              {/* Protein */}
              <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/6 space-y-1">
                <label className="text-[9.5px] font-display font-bold text-slate-400 uppercase tracking-wider block">Protein (g)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="NULL"
                  value={editableValues.protein_g !== null ? editableValues.protein_g : ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    setEditableValues((prev) => ({ ...prev, protein_g: val }));
                  }}
                  className="w-full py-1.5 px-2 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-[#00D5FF]"
                />
              </div>

              {/* Carbohydrates */}
              <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/6 space-y-1">
                <label className="text-[9.5px] font-display font-bold text-slate-400 uppercase tracking-wider block">Carbohydrates (g)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="NULL"
                  value={editableValues.carbohydrates_g !== null ? editableValues.carbohydrates_g : ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    setEditableValues((prev) => ({ ...prev, carbohydrates_g: val }));
                  }}
                  className="w-full py-1.5 px-2 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-[#00D5FF]"
                />
              </div>

              {/* Total Fat */}
              <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/6 space-y-1">
                <label className="text-[9.5px] font-display font-bold text-slate-400 uppercase tracking-wider block">Total Fat (g)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="NULL"
                  value={editableValues.total_fat_g !== null ? editableValues.total_fat_g : ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    setEditableValues((prev) => ({ ...prev, total_fat_g: val }));
                  }}
                  className="w-full py-1.5 px-2 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-[#00D5FF]"
                />
              </div>

              {/* Dietary Fibre */}
              <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/6 space-y-1">
                <label className="text-[9.5px] font-display font-bold text-slate-400 uppercase tracking-wider block">Dietary Fibre (g)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="NULL"
                  value={editableValues.fibre_g !== null ? editableValues.fibre_g : ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    setEditableValues((prev) => ({ ...prev, fibre_g: val }));
                  }}
                  className="w-full py-1.5 px-2 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-[#00D5FF]"
                />
              </div>

              {/* Total Sugars */}
              <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/6 space-y-1">
                <label className="text-[9.5px] font-display font-bold text-slate-400 uppercase tracking-wider block">Total Sugars (g)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="NULL"
                  value={editableValues.total_sugars_g !== null ? editableValues.total_sugars_g : ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    setEditableValues((prev) => ({ ...prev, total_sugars_g: val }));
                  }}
                  className="w-full py-1.5 px-2 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-[#00D5FF]"
                />
              </div>

              {/* Added Sugar */}
              <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/6 space-y-1">
                <label className="text-[9.5px] font-display font-bold text-slate-400 uppercase tracking-wider block">Added Sugar (g)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="NULL"
                  value={editableValues.added_sugar_g !== null ? editableValues.added_sugar_g : ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    setEditableValues((prev) => ({ ...prev, added_sugar_g: val }));
                  }}
                  className="w-full py-1.5 px-2 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-[#00D5FF]"
                />
              </div>

              {/* Saturated Fat */}
              <div className="p-2.5 rounded-2xl bg-white/[0.03] border border-white/6 space-y-1">
                <label className="text-[9.5px] font-display font-bold text-slate-400 uppercase tracking-wider block">Saturated Fat (g)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="NULL"
                  value={editableValues.saturated_fat_g !== null ? editableValues.saturated_fat_g : ''}
                  onChange={(e) => {
                    const val = e.target.value === '' ? null : Number(e.target.value);
                    setEditableValues((prev) => ({ ...prev, saturated_fat_g: val }));
                  }}
                  className="w-full py-1.5 px-2 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm font-bold text-white focus:outline-none focus:border-[#00D5FF]"
                />
              </div>
            </div>

            {/* Optional Notes */}
            <div className="pt-1">
              <label className="text-[9.5px] font-display font-bold text-slate-400 uppercase tracking-wider mb-1 block">Notes / Context (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Higher carb day, post-workout refeed, dining out"
                value={userNotes}
                onChange={(e) => setUserNotes(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-[#00D5FF]"
              />
            </div>

            {/* Action Bar */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-white/8">
              <span className="text-[10px] text-slate-400">
                Empty fields will be saved as <strong>NULL</strong> (unavailable), not zero.
              </span>

              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  onClick={handleClearEditor}
                  className="flex-1 sm:flex-none py-2 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-display font-bold text-xs uppercase cursor-pointer transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveSummary(false)}
                  disabled={isSaving}
                  className="flex-1 sm:flex-none py-2 px-5 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-display font-extrabold text-xs tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all flex items-center justify-center gap-2 cursor-pointer uppercase active:scale-95"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isSaving ? 'Saving...' : `Save for ${formatDisplayDate(selectedDate)}`}</span>
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 4. DAILY NUTRITION SUMMARY DASHBOARD (SELECTED DATE) */}
      <div className="space-y-3.5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm sm:text-base font-display font-extrabold text-white flex items-center gap-2 uppercase tracking-wide">
            <Activity className="w-4 h-4 text-[#00D5FF]" />
            <span>Daily Intake vs Target: {formatDisplayDate(selectedDate)}</span>
          </h2>

          {currentSummary && (
            <div className="flex items-center gap-2">
              <button
                onClick={() => handleEditExistingRecord(currentSummary)}
                className="py-1 px-2.5 rounded-lg bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-display font-bold flex items-center gap-1 cursor-pointer transition-colors uppercase"
              >
                <Pencil className="w-3 h-3 text-[#00D5FF]" />
                <span>Edit</span>
              </button>
              <button
                onClick={() => {
                  setRecordToDelete(currentSummary);
                  setDeleteModalOpen(true);
                }}
                className="py-1 px-2.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-display font-bold flex items-center gap-1 cursor-pointer transition-colors uppercase border border-rose-500/20"
              >
                <Trash2 className="w-3 h-3" />
                <span>Delete</span>
              </button>
            </div>
          )}
        </div>

        {currentSummary ? (
          <div className="space-y-3.5">
            {/* Quick Progress Cards */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Calories Card */}
              <div className="p-3.5 sm:p-4 rounded-3xl bg-[#0B132B]/85 border border-white/8 backdrop-blur-xl space-y-1 shadow-[0_8px_25px_rgba(0,0,0,0.4)]">
                <span className="text-[9.5px] font-display font-bold text-slate-400 uppercase tracking-wider block">Daily Calories</span>
                <div className="text-lg sm:text-xl font-display font-extrabold text-white">
                  {currentSummary.calories_kcal !== null ? `${currentSummary.calories_kcal.toLocaleString()} kcal` : <span className="text-slate-500 text-xs font-normal">Not recorded</span>}
                </div>
                {currentSummary.calories_kcal !== null && (
                  <div className="text-[10px] font-mono text-slate-300 flex items-center justify-between">
                    <span>Target: {targets.calories.toLocaleString()}</span>
                    <span className={currentSummary.calories_kcal <= targets.calories ? 'text-emerald-400 font-bold' : 'text-amber-400 font-bold'}>
                      {targets.calories - currentSummary.calories_kcal >= 0 ? `${targets.calories - currentSummary.calories_kcal} left` : `+${currentSummary.calories_kcal - targets.calories} over`}
                    </span>
                  </div>
                )}
              </div>

              {/* Protein Card */}
              <div className="p-3.5 sm:p-4 rounded-3xl bg-[#0B132B]/85 border border-white/8 backdrop-blur-xl space-y-1 shadow-[0_8px_25px_rgba(0,0,0,0.4)]">
                <span className="text-[9.5px] font-display font-bold text-[#00D5FF] uppercase tracking-wider block">Protein Intake</span>
                <div className="text-lg sm:text-xl font-display font-extrabold text-[#00D5FF]">
                  {currentSummary.protein_g !== null ? `${currentSummary.protein_g} g` : <span className="text-slate-500 text-xs font-normal">Not recorded</span>}
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  Target: {targets.proteinMin}–{targets.proteinMax} g
                </div>
              </div>

              {/* Fibre Card */}
              <div className="p-3.5 sm:p-4 rounded-3xl bg-[#0B132B]/85 border border-white/8 backdrop-blur-xl space-y-1 shadow-[0_8px_25px_rgba(0,0,0,0.4)]">
                <span className="text-[9.5px] font-display font-bold text-cyan-400 uppercase tracking-wider block">Dietary Fibre</span>
                <div className="text-lg sm:text-xl font-display font-extrabold text-cyan-400">
                  {currentSummary.fibre_g !== null ? `${currentSummary.fibre_g} g` : <span className="text-slate-500 text-xs font-normal">Not recorded</span>}
                </div>
                <div className="text-[10px] font-mono text-slate-400">
                  Target: {targets.fibreMin}–{targets.fibreMax} g
                </div>
              </div>

              {/* Summary Completeness */}
              <div className="p-3.5 sm:p-4 rounded-3xl bg-[#0B132B]/85 border border-white/8 backdrop-blur-xl space-y-1 shadow-[0_8px_25px_rgba(0,0,0,0.4)]">
                <span className="text-[9.5px] font-display font-bold text-emerald-400 uppercase tracking-wider block">Status</span>
                <div className="flex items-center gap-1.5 pt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="font-display font-bold text-white text-xs sm:text-sm uppercase tracking-wide">Summary Saved</span>
                </div>
                <p className="text-[9.5px] text-slate-400 font-mono">
                  Nutrition tracked independently.
                </p>
              </div>
            </div>

            {/* Dashboard Comparison Table */}
            <div className="p-3.5 sm:p-4 rounded-3xl bg-[#0B132B]/85 border border-white/8 backdrop-blur-xl overflow-x-auto shadow-[0_8px_25px_rgba(0,0,0,0.4)]">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-white/8 text-slate-400 font-display font-bold uppercase text-[9.5px] tracking-wider">
                    <th className="py-2 px-3">Nutrient</th>
                    <th className="py-2 px-3">Actual Intake</th>
                    <th className="py-2 px-3">Target / Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5 font-medium">
                  {/* Calories */}
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-display font-bold text-white uppercase tracking-wider">Calories</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-white">
                      {currentSummary.calories_kcal !== null ? `${currentSummary.calories_kcal.toLocaleString()} kcal` : <span className="text-slate-500 italic">Not recorded</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-mono">
                      {targets.calories.toLocaleString()} kcal {currentSummary.calories_kcal !== null && (
                        <span className={`ml-2 font-bold ${currentSummary.calories_kcal <= targets.calories ? 'text-emerald-400' : 'text-amber-400'}`}>
                          ({currentSummary.calories_kcal <= targets.calories ? 'On Target' : 'Exceeded'})
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Protein */}
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-display font-bold text-white uppercase tracking-wider">Protein</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-[#00D5FF]">
                      {currentSummary.protein_g !== null ? `${currentSummary.protein_g} g` : <span className="text-slate-500 italic">Not recorded</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-mono">
                      {targets.proteinMin}–{targets.proteinMax} g {currentSummary.protein_g !== null && (
                        <span className={`ml-2 font-bold ${currentSummary.protein_g >= targets.proteinMin ? 'text-emerald-400' : 'text-amber-400'}`}>
                          ({currentSummary.protein_g >= targets.proteinMin ? 'Met' : 'Under'})
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Carbohydrates */}
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-display font-bold text-white uppercase tracking-wider">Carbohydrates</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-white">
                      {currentSummary.carbohydrates_g !== null ? `${currentSummary.carbohydrates_g} g` : <span className="text-slate-500 italic">Not recorded</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono">Target: {targets.carbs} g</td>
                  </tr>

                  {/* Total Fat */}
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-display font-bold text-white uppercase tracking-wider">Total Fat</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-white">
                      {currentSummary.total_fat_g !== null ? `${currentSummary.total_fat_g} g` : <span className="text-slate-500 italic">Not recorded</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono">Target: {targets.fat} g</td>
                  </tr>

                  {/* Dietary Fibre */}
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-display font-bold text-white uppercase tracking-wider">Dietary Fibre</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-cyan-400">
                      {currentSummary.fibre_g !== null ? `${currentSummary.fibre_g} g` : <span className="text-slate-500 italic">Not recorded</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-300 font-mono">
                      {targets.fibreMin}–{targets.fibreMax} g {currentSummary.fibre_g !== null && (
                        <span className={`ml-2 font-bold ${currentSummary.fibre_g >= targets.fibreMin ? 'text-emerald-400' : 'text-slate-400'}`}>
                          ({currentSummary.fibre_g >= targets.fibreMin ? 'Optimal' : 'Moderate'})
                        </span>
                      )}
                    </td>
                  </tr>

                  {/* Total Sugars */}
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-display font-bold text-white uppercase tracking-wider">Total Sugars</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-white">
                      {currentSummary.total_sugars_g !== null ? `${currentSummary.total_sugars_g} g` : <span className="text-slate-500 italic">Not recorded</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono">Naturally occurring + added</td>
                  </tr>

                  {/* Added Sugar */}
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-display font-bold text-white uppercase tracking-wider">Added Sugar</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-white">
                      {currentSummary.added_sugar_g !== null ? `${currentSummary.added_sugar_g} g` : <span className="text-slate-500 italic">Not recorded</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono">Keep moderate (&lt; 25–30 g)</td>
                  </tr>

                  {/* Saturated Fat */}
                  <tr className="hover:bg-white/[0.02]">
                    <td className="py-2.5 px-3 font-display font-bold text-white uppercase tracking-wider">Saturated Fat</td>
                    <td className="py-2.5 px-3 font-mono font-bold text-white">
                      {currentSummary.saturated_fat_g !== null ? `${currentSummary.saturated_fat_g} g` : <span className="text-slate-500 italic">Not recorded</span>}
                    </td>
                    <td className="py-2.5 px-3 text-slate-400 font-mono">Monitor (&lt; 20 g)</td>
                  </tr>
                </tbody>
              </table>

              {currentSummary.notes && (
                <div className="mt-3 p-2.5 rounded-2xl bg-black/40 border border-white/8 text-xs text-slate-300">
                  <strong className="text-[#00D5FF]">Notes:</strong> {currentSummary.notes}
                </div>
              )}
            </div>
          </div>
        ) : (
          <div className="p-8 rounded-3xl bg-black/40 border border-dashed border-[#00D5FF]/30 text-center space-y-3">
            <div className="w-12 h-12 rounded-2xl bg-[#00D5FF]/15 text-[#00D5FF] border border-[#00D5FF]/30 flex items-center justify-center mx-auto">
              <Utensils className="w-6 h-6" />
            </div>
            <div className="space-y-1">
              <h4 className="font-display font-extrabold text-white text-sm uppercase tracking-wide">
                Log your first meal.
              </h4>
              <p className="text-xs text-[#A9A1BD] max-w-sm mx-auto">
                No nutrition summary recorded for this date yet. Paste your ChatGPT table or daily totals above to record this date.
              </p>
            </div>
          </div>
        )}
      </div>

      {/* 5. DAILY HISTORY LIST */}
      <div className="p-3.5 sm:p-5 rounded-3xl bg-[#0B132B]/85 border border-white/8 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] space-y-3.5">
        <div className="flex items-center justify-between">
          <div>
            <h2 className="text-sm sm:text-base font-display font-extrabold text-white flex items-center gap-2 uppercase tracking-wide">
              <Calendar className="w-4 h-4 text-[#00D5FF]" />
              <span>Daily Nutrition History</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Click any date to inspect or edit that day's summary.
            </p>
          </div>
        </div>

        {allSummaries.length === 0 ? (
          <div className="p-8 rounded-2xl bg-black/40 border border-dashed border-white/10 text-center space-y-2">
            <Utensils className="w-8 h-8 text-slate-500 mx-auto" />
            <h4 className="font-display font-bold text-white text-sm uppercase">Log your first meal.</h4>
            <p className="text-xs text-[#A9A1BD] max-w-sm mx-auto">
              No historical records yet. Paste and save your first daily summary above to track your calories and protein trends!
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-white/8 text-slate-400 font-display font-bold uppercase text-[9.5px] tracking-wider">
                  <th className="py-2 px-3">Date</th>
                  <th className="py-2 px-3">Calories</th>
                  <th className="py-2 px-3">Protein</th>
                  <th className="py-2 px-3">Carbs</th>
                  <th className="py-2 px-3">Fat</th>
                  <th className="py-2 px-3">Fibre</th>
                  <th className="py-2 px-3">Status</th>
                  <th className="py-2 px-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-white/5 font-medium">
                {allSummaries.slice(0, 15).map((row) => {
                  const isRowActive = row.entry_date === selectedDate;
                  const isComplete = row.calories_kcal !== null && row.protein_g !== null && row.carbohydrates_g !== null && row.total_fat_g !== null;

                  return (
                    <tr
                      key={row.id}
                      onClick={() => setSelectedDate(row.entry_date)}
                      className={`cursor-pointer transition-colors ${
                        isRowActive ? 'bg-[#00D5FF]/15' : 'hover:bg-white/[0.02]'
                      }`}
                    >
                      <td className="py-2.5 px-3 font-display font-bold text-white flex items-center gap-1.5 uppercase tracking-wide">
                        {isRowActive && <span className="w-1.5 h-1.5 rounded-full bg-[#00D5FF] animate-ping" />}
                        <span>{formatDisplayDate(row.entry_date)}</span>
                      </td>
                      <td className="py-2.5 px-3 font-mono font-bold text-white">
                        {row.calories_kcal !== null ? `${row.calories_kcal.toLocaleString()} kcal` : <span className="text-slate-500 italic">NULL</span>}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[#00D5FF] font-bold">
                        {row.protein_g !== null ? `${row.protein_g} g` : <span className="text-slate-500 italic">NULL</span>}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {row.carbohydrates_g !== null ? `${row.carbohydrates_g} g` : <span className="text-slate-500 italic">NULL</span>}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-slate-300">
                        {row.total_fat_g !== null ? `${row.total_fat_g} g` : <span className="text-slate-500 italic">NULL</span>}
                      </td>
                      <td className="py-2.5 px-3 font-mono text-cyan-400">
                        {row.fibre_g !== null ? `${row.fibre_g} g` : <span className="text-slate-500 italic">NULL</span>}
                      </td>
                      <td className="py-2.5 px-3">
                        {isComplete ? (
                          <span className="text-[9.5px] font-bold text-emerald-400 bg-emerald-500/15 px-2 py-0.5 rounded-full border border-emerald-500/25 uppercase">
                            Full
                          </span>
                        ) : (
                          <span className="text-[9.5px] font-bold text-amber-400 bg-amber-500/15 px-2 py-0.5 rounded-full border border-amber-500/25 uppercase">
                            Partial
                          </span>
                        )}
                      </td>
                      <td className="py-2.5 px-3 text-right">
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
      <div className="p-3.5 sm:p-5 rounded-3xl bg-[#0B132B]/85 border border-white/8 backdrop-blur-xl shadow-[0_10px_30px_rgba(0,0,0,0.5)] space-y-4">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <h2 className="text-sm sm:text-base font-display font-extrabold text-white flex items-center gap-2 uppercase tracking-wide">
              <TrendingUp className="w-4 h-4 text-[#00D5FF]" />
              <span>Nutrition Analytics</span>
            </h2>
            <p className="text-[11px] text-slate-400">
              Averages computed from valid recorded days only. Unlogged days are omitted.
            </p>
          </div>

          {/* Period Filter Tabs */}
          <div className="flex items-center gap-1 bg-black/40 p-1 rounded-2xl border border-white/8 overflow-x-auto max-w-full">
            {(['7D', '30D', 'THIS_MONTH', 'PREV_MONTH', 'CUSTOM'] as AnalyticsTimeframe[]).map((p) => (
              <button
                key={p}
                onClick={() => setAnalyticsPeriod(p)}
                className={`py-1.5 px-3 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all cursor-pointer whitespace-nowrap ${
                  analyticsPeriod === p
                    ? 'bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF] text-white shadow-[0_0_12px_rgba(255,121,0,0.25)]'
                    : 'text-slate-400 hover:text-white'
                }`}
              >
                {p === 'THIS_MONTH' ? 'This Month' : p === 'PREV_MONTH' ? 'Prev Month' : p}
              </button>
            ))}
          </div>
        </div>

        {/* Custom Range Selector when active */}
        {analyticsPeriod === 'CUSTOM' && (
          <div className="p-3 rounded-2xl bg-black/40 border border-white/8 flex flex-wrap items-center gap-2.5 text-xs">
            <span className="font-display font-bold text-slate-300 uppercase">Custom Range:</span>
            <input
              type="date"
              value={customAnalyticsStart}
              onChange={(e) => setCustomAnalyticsStart(e.target.value)}
              className="py-1 px-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-xs"
            />
            <span className="text-slate-400">to</span>
            <input
              type="date"
              value={customAnalyticsEnd}
              onChange={(e) => setCustomAnalyticsEnd(e.target.value)}
              className="py-1 px-2.5 rounded-xl bg-white/5 border border-white/10 text-white font-mono text-xs"
            />
          </div>
        )}

        {/* Analytics Summary Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          {/* Average Calories */}
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/6 space-y-0.5">
            <span className="text-[9.5px] font-display font-bold text-slate-400 uppercase tracking-wider">Avg Daily Calories</span>
            <div className="text-base sm:text-lg font-display font-extrabold text-white">
              {periodAnalytics.avgCalories !== null ? `${periodAnalytics.avgCalories.toLocaleString()} kcal` : <span className="text-slate-500 text-xs">No data</span>}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Over {periodAnalytics.caloriesDaysCount} recorded days
            </div>
          </div>

          {/* Average Protein */}
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/6 space-y-0.5">
            <span className="text-[9.5px] font-display font-bold text-[#00D5FF] uppercase tracking-wider">Avg Daily Protein</span>
            <div className="text-base sm:text-lg font-display font-extrabold text-[#00D5FF]">
              {periodAnalytics.avgProtein !== null ? `${periodAnalytics.avgProtein} g` : <span className="text-slate-500 text-xs">No data</span>}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Over {periodAnalytics.proteinDaysCount} recorded days
            </div>
          </div>

          {/* Adherence */}
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/6 space-y-0.5">
            <span className="text-[9.5px] font-display font-bold text-emerald-400 uppercase tracking-wider">Target Adherence</span>
            <div className="text-base sm:text-lg font-display font-extrabold text-emerald-400">
              {periodAnalytics.daysMeetingProteinTarget} days
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              Met target (≥ {targets.proteinMin}g)
            </div>
          </div>

          {/* Logged Days Count */}
          <div className="p-3 rounded-2xl bg-white/[0.03] border border-white/6 space-y-0.5">
            <span className="text-[9.5px] font-display font-bold text-cyan-400 uppercase tracking-wider">Days Tracked</span>
            <div className="text-base sm:text-lg font-display font-extrabold text-cyan-400">
              {periodAnalytics.recordedDaysCount} / {periodAnalytics.totalDaysInPeriod}
            </div>
            <div className="text-[10px] text-slate-400 font-mono">
              {periodAnalytics.missingDaysCount} omitted
            </div>
          </div>
        </div>

        {/* Detailed Macronutrient Averages */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs font-mono">
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-slate-400 block text-[9.5px] uppercase font-display font-bold">Avg Carbohydrates</span>
            <span className="font-bold text-white">{periodAnalytics.avgCarbs !== null ? `${periodAnalytics.avgCarbs} g` : '—'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-slate-400 block text-[9.5px] uppercase font-display font-bold">Avg Total Fat</span>
            <span className="font-bold text-white">{periodAnalytics.avgFat !== null ? `${periodAnalytics.avgFat} g` : '—'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-slate-400 block text-[9.5px] uppercase font-display font-bold">Avg Dietary Fibre</span>
            <span className="font-bold text-cyan-400">{periodAnalytics.avgFibre !== null ? `${periodAnalytics.avgFibre} g` : '—'}</span>
          </div>
          <div className="p-2.5 rounded-xl bg-white/[0.02] border border-white/5">
            <span className="text-slate-400 block text-[9.5px] uppercase font-display font-bold">Peak Calorie Day</span>
            <span className="font-bold text-amber-400">{periodAnalytics.highestCalorieDay ? `${periodAnalytics.highestCalorieDay.calories} kcal` : '—'}</span>
          </div>
        </div>

        {/* Trend Charts */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 pt-1">
          {/* Calorie Trend Chart */}
          <div className="p-3.5 sm:p-4 rounded-3xl bg-black/40 border border-white/8 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-white text-xs uppercase tracking-wider">Calorie Trend</h4>
              <span className="text-[10px] text-[#00D5FF] font-mono">Target: {targets.calories} kcal</span>
            </div>
            <div className="h-52 w-full pt-1">
              {periodAnalytics.trendPoints.some((p) => p.calories_kcal !== null) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={periodAnalytics.trendPoints.filter((p) => p.calories_kcal !== null)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="displayDate" stroke="#64748B" fontSize={9} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={9} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0B132B', borderColor: 'rgba(255,255,255,0.12)', borderRadius: '1rem', fontSize: '11px', color: '#F8FAFC' }}
                      formatter={(v: any) => [`${v} kcal`, 'Calories']}
                    />
                    <ReferenceLine y={targets.calories} stroke="#00D5FF" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="calories_kcal" stroke="#10B981" strokeWidth={2.5} dot={{ r: 2.5 }} />
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
          <div className="p-3.5 sm:p-4 rounded-3xl bg-black/40 border border-white/8 space-y-2">
            <div className="flex items-center justify-between">
              <h4 className="font-display font-bold text-white text-xs uppercase tracking-wider">Protein Trend</h4>
              <span className="text-[10px] text-[#00D5FF] font-mono">Target: {targets.proteinMin}–{targets.proteinMax} g</span>
            </div>
            <div className="h-52 w-full pt-1">
              {periodAnalytics.trendPoints.some((p) => p.protein_g !== null) ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={periodAnalytics.trendPoints.filter((p) => p.protein_g !== null)}>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                    <XAxis dataKey="displayDate" stroke="#64748B" fontSize={9} tickLine={false} />
                    <YAxis stroke="#64748B" fontSize={9} tickLine={false} domain={['auto', 'auto']} />
                    <Tooltip
                      contentStyle={{ backgroundColor: '#0B132B', borderColor: 'rgba(255,255,255,0.12)', borderRadius: '1rem', fontSize: '11px', color: '#F8FAFC' }}
                      formatter={(v: any) => [`${v} g`, 'Protein']}
                    />
                    <ReferenceLine y={targets.proteinMin} stroke="#00D5FF" strokeDasharray="4 4" />
                    <Line type="monotone" dataKey="protein_g" stroke="#00D5FF" strokeWidth={2.5} dot={{ r: 2.5 }} />
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

      {/* MODAL 1: CONFLICT OVERWRITE CONFIRMATION */}
      {conflictModalOpen && existingConflictRecord && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[#0B132B]/95 backdrop-blur-2xl border border-white/12 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.9)]">
            <div className="flex items-center gap-3 border-b border-white/8 pb-3">
              <div className="w-9 h-9 rounded-2xl bg-amber-500/15 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0">
                <AlertTriangle className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-white text-sm sm:text-base uppercase tracking-wide">Update Existing Daily Summary?</h3>
                <p className="text-[10px] text-slate-400 font-mono">Date: {formatDisplayDate(selectedDate)}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300 leading-relaxed">
              A nutrition summary already exists for this date. Do you want to update the existing record with your newly pasted summary?
            </p>

            <div className="p-3 rounded-2xl bg-black/40 border border-white/8 space-y-1.5 text-xs font-mono">
              <div className="flex justify-between text-slate-400">
                <span>Existing Saved Calories:</span>
                <strong className="text-white">{existingConflictRecord.calories_kcal ?? 'NULL'} kcal</strong>
              </div>
              <div className="flex justify-between text-slate-400">
                <span>Existing Saved Protein:</span>
                <strong className="text-white">{existingConflictRecord.protein_g ?? 'NULL'} g</strong>
              </div>
              <div className="flex justify-between text-[#00D5FF] font-bold border-t border-white/8 pt-1">
                <span>New Value to Overwrite:</span>
                <span>{editableValues.calories_kcal ?? 'NULL'} kcal • {editableValues.protein_g ?? 'NULL'}g</span>
              </div>
            </div>

            <div className="flex gap-2 pt-1 border-t border-white/8">
              <button
                onClick={() => setConflictModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-display font-bold text-xs uppercase cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={() => handleSaveSummary(true)}
                disabled={isSaving}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF] hover:brightness-110 text-white font-display font-extrabold text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(155,92,255,0.35)] active:scale-95 cursor-pointer transition-all"
              >
                {isSaving ? 'Updating...' : 'Update Record'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: DELETE CONFIRMATION */}
      {deleteModalOpen && recordToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[#0B132B]/95 backdrop-blur-2xl border border-white/12 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.9)]">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-2xl bg-rose-500/15 border border-rose-500/30 text-rose-400 flex items-center justify-center shrink-0">
                <Trash2 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-white text-sm sm:text-base uppercase tracking-wide">Delete Record?</h3>
                <p className="text-[10px] text-slate-400 font-mono">{formatDisplayDate(recordToDelete.entry_date)}</p>
              </div>
            </div>

            <p className="text-xs text-slate-300">
              Are you sure you want to delete the daily summary for <strong>{formatDisplayDate(recordToDelete.entry_date)}</strong>? This action cannot be undone.
            </p>

            <div className="flex gap-2 pt-1 border-t border-white/8">
              <button
                onClick={() => {
                  setDeleteModalOpen(false);
                  setRecordToDelete(null);
                }}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-display font-bold text-xs uppercase cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-white font-display font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(244,63,94,0.3)] cursor-pointer transition-all active:scale-95"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: TARGETS SETTINGS */}
      {isTargetsModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/75 backdrop-blur-md">
          <div className="bg-[#0B132B]/95 backdrop-blur-2xl border border-white/12 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.9)]">
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-[#00D5FF]/15 text-[#00D5FF] border border-[#00D5FF]/25 flex items-center justify-center">
                  <Settings className="w-4 h-4" />
                </div>
                <h3 className="font-display font-extrabold text-white text-sm sm:text-base uppercase tracking-wide">Nutrition Targets</h3>
              </div>
              <button
                onClick={() => setIsTargetsModalOpen(false)}
                className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/8 flex items-center justify-center transition-all cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="space-y-3 text-xs">
              <div>
                <label className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider block mb-1">Target Calories (kcal)</label>
                <input
                  type="number"
                  value={tempTargets.calories}
                  onChange={(e) => setTempTargets({ ...tempTargets, calories: Number(e.target.value) })}
                  className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono font-bold focus:outline-none focus:border-[#00D5FF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider block mb-1">Protein Min (g)</label>
                  <input
                    type="number"
                    value={tempTargets.proteinMin}
                    onChange={(e) => setTempTargets({ ...tempTargets, proteinMin: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono font-bold focus:outline-none focus:border-[#00D5FF]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider block mb-1">Protein Max (g)</label>
                  <input
                    type="number"
                    value={tempTargets.proteinMax}
                    onChange={(e) => setTempTargets({ ...tempTargets, proteinMax: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono font-bold focus:outline-none focus:border-[#00D5FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider block mb-1">Fibre Min (g)</label>
                  <input
                    type="number"
                    value={tempTargets.fibreMin}
                    onChange={(e) => setTempTargets({ ...tempTargets, fibreMin: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono font-bold focus:outline-none focus:border-[#00D5FF]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider block mb-1">Fibre Max (g)</label>
                  <input
                    type="number"
                    value={tempTargets.fibreMax}
                    onChange={(e) => setTempTargets({ ...tempTargets, fibreMax: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono font-bold focus:outline-none focus:border-[#00D5FF]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider block mb-1">Carbs Target (g)</label>
                  <input
                    type="number"
                    value={tempTargets.carbs}
                    onChange={(e) => setTempTargets({ ...tempTargets, carbs: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono font-bold focus:outline-none focus:border-[#00D5FF]"
                  />
                </div>
                <div>
                  <label className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider block mb-1">Fat Target (g)</label>
                  <input
                    type="number"
                    value={tempTargets.fat}
                    onChange={(e) => setTempTargets({ ...tempTargets, fat: Number(e.target.value) })}
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono font-bold focus:outline-none focus:border-[#00D5FF]"
                  />
                </div>
              </div>
            </div>

            <div className="flex gap-2 pt-2 border-t border-white/8">
              <button
                onClick={() => setIsTargetsModalOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-display font-bold text-xs uppercase cursor-pointer transition-colors"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveTargets}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF] hover:brightness-110 text-white font-display font-black text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(155,92,255,0.35)] cursor-pointer transition-all active:scale-95"
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
