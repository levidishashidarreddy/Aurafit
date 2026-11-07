'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { createClient, getFastAuthUser } from '@/lib/supabase/client';
import {
  Footprints,
  Flame,
  Scale,
  Calendar,
  Plus,
  Pencil,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  TrendingUp,
  X,
  Clock,
  Layers,
  ChevronLeft,
  ChevronRight,
  Info,
  Timer
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
import {
  fetchUserTargets,
  UserTargets,
  DEFAULT_CENTRALIZED_TARGETS
} from '@/lib/services/targetService';
import {
  WeightRecord,
  fetchAllWeightRecords,
  saveCanonicalWeightRecord,
  deleteWeightRecord,
  calculateWeightAnalytics,
  WeightAnalyticsResult
} from '@/lib/services/bodyWeightService';
import {
  DayResolvedActivity,
  fetchDayActivity,
  fetchAllActivitySummaries,
  saveDailyActivitySummary,
  addSpecialActivityEntry,
  calculateStepStreak
} from '@/lib/services/dailyActivityService';
import { ActivityType, ActivityEntryMode, ActivityEntry } from '@/lib/types/database';

type TimeFilter = '7D' | '30D' | '3M' | '6M' | '1Y' | 'ALL' | 'CUSTOM';
type ActiveTab = 'activity' | 'weight';

export default function ActivityAndWeightPage() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('activity');
  const [userId, setUserId] = useState<string | null>(null);

  // Date helpers
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const [selectedDate, setSelectedDate] = useState<string>(todayStr);

  // Targets
  const [targets, setTargets] = useState<UserTargets>(DEFAULT_CENTRALIZED_TARGETS);

  // -------------------------------------------------------------
  // ACTIVITY STATE
  // -------------------------------------------------------------
  const [activityMode, setActivityMode] = useState<ActivityEntryMode>('daily_summary');
  const [dayActivity, setDayActivity] = useState<DayResolvedActivity>({
    date: todayStr,
    mode: 'daily_summary',
    totalSteps: 0,
    activeCaloriesBurned: 0,
    specialEntries: [],
    hasRecord: false,
    notes: null,
  });

  const [allActivityHistory, setAllActivityHistory] = useState<DayResolvedActivity[]>([]);

  // Full-Day Summary Form
  const [formSteps, setFormSteps] = useState<string>('');
  const [formCaloriesBurned, setFormCaloriesBurned] = useState<string>('');
  const [formNotes, setFormNotes] = useState<string>('');

  // Special Activity Form (Mode B)
  const [isSpecialModalOpen, setIsSpecialModalOpen] = useState<boolean>(false);
  const [specialType, setSpecialType] = useState<ActivityType>('Walking');
  const [specialSteps, setSpecialSteps] = useState<string>('');
  const [specialCalories, setSpecialCalories] = useState<string>('');
  const [specialDuration, setSpecialDuration] = useState<string>('');
  const [specialNotes, setSpecialNotes] = useState<string>('');

  // -------------------------------------------------------------
  // BODY WEIGHT STATE
  // -------------------------------------------------------------
  const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([]);
  const [weightInput, setWeightInput] = useState<string>('');
  const [weightNotes, setWeightNotes] = useState<string>('');
  const [weightTimeframe, setWeightTimeframe] = useState<TimeFilter>('30D');
  const [customWeightStart, setCustomWeightStart] = useState<string>(() => {
    const d = new Date();
    d.setDate(d.getDate() - 30);
    return d.toISOString().split('T')[0];
  });
  const [customWeightEnd, setCustomWeightEnd] = useState<string>(todayStr);

  // Weight Conflict Overwrite Modal
  const [weightConflictModal, setWeightConflictModal] = useState<boolean>(false);
  const [existingWeightConflict, setExistingWeightConflict] = useState<WeightRecord | null>(null);

  // Delete Modals
  const [deleteWeightModal, setDeleteWeightModal] = useState<boolean>(false);
  const [recordToDelete, setRecordToDelete] = useState<WeightRecord | null>(null);

  const supabase = createClient();

  // Load User, Targets, and Data
  useEffect(() => {
    async function init() {
      const user = await getFastAuthUser();
      const uid = user ? user.id : 'guest';
      if (user) setUserId(user.id);

      const [t] = await Promise.all([
        fetchUserTargets(uid),
        refreshAllData(uid),
      ]);
      setTargets(t);
    }
    init();

    // Listen to centralized target updates from Profile
    const onTargetsUpdated = (e: any) => {
      if (e.detail) setTargets(e.detail);
    };
    window.addEventListener('gymhub_targets_updated', onTargetsUpdated);
    return () => window.removeEventListener('gymhub_targets_updated', onTargetsUpdated);
  }, []);

  const refreshAllData = async (uid?: string) => {
    const resolvedUid = uid || userId || 'guest';

    // Fetch activity for date, activity history, and weight records concurrently
    const [dayActRes, allActRes, wRecordsRes] = await Promise.allSettled([
      fetchDayActivity(resolvedUid, selectedDate),
      fetchAllActivitySummaries(resolvedUid),
      fetchAllWeightRecords(resolvedUid),
    ]);

    // 1. Activity for active date
    if (dayActRes.status === 'fulfilled') {
      const dayAct = dayActRes.value;
      setDayActivity(dayAct);
      if (dayAct.hasRecord) {
        setActivityMode(dayAct.mode);
        setFormSteps(String(dayAct.totalSteps));
        setFormCaloriesBurned(String(dayAct.activeCaloriesBurned));
        setFormNotes(dayAct.notes || '');
      } else {
        setFormSteps('');
        setFormCaloriesBurned('');
        setFormNotes('');
      }
    }

    // 2. All activity history for streaks
    if (allActRes.status === 'fulfilled') {
      setAllActivityHistory(allActRes.value);
    }

    // 3. Weight records
    if (wRecordsRes.status === 'fulfilled') {
      const wRecords = wRecordsRes.value;
      setWeightRecords(wRecords);

      const matchWeight = wRecords.find((w) => w.logged_at === selectedDate);
      if (matchWeight) {
        setWeightInput(String(matchWeight.weight_kg));
        setWeightNotes(matchWeight.notes || '');
      } else {
        setWeightInput('');
        setWeightNotes('');
      }
    }
  };

  useEffect(() => {
    refreshAllData();
  }, [selectedDate]);

  // Stepper Streak calculation
  const streak = useMemo(() => {
    return calculateStepStreak(allActivityHistory, targets.steps);
  }, [allActivityHistory, targets.steps]);

  // Date range for weight analytics
  const { weightStartDate, weightEndDate, weightRangeLabel } = useMemo(() => {
    const end = new Date();
    const start = new Date();

    if (weightTimeframe === '7D') start.setDate(end.getDate() - 7);
    else if (weightTimeframe === '30D') start.setDate(end.getDate() - 30);
    else if (weightTimeframe === '3M') start.setMonth(end.getMonth() - 3);
    else if (weightTimeframe === '6M') start.setMonth(end.getMonth() - 6);
    else if (weightTimeframe === '1Y') start.setFullYear(end.getFullYear() - 1);
    else if (weightTimeframe === 'ALL') start.setFullYear(end.getFullYear() - 5);
    else {
      return {
        weightStartDate: customWeightStart,
        weightEndDate: customWeightEnd,
        weightRangeLabel: `Custom (${customWeightStart} to ${customWeightEnd})`,
      };
    }

    const fmt = (d: Date) => d.toISOString().split('T')[0];
    return {
      weightStartDate: fmt(start),
      weightEndDate: fmt(end),
      weightRangeLabel: `${weightTimeframe} Window`,
    };
  }, [weightTimeframe, customWeightStart, customWeightEnd]);

  const weightAnalytics: WeightAnalyticsResult = useMemo(() => {
    return calculateWeightAnalytics(weightRecords, weightStartDate, weightEndDate, targets.goalWeightKg);
  }, [weightRecords, weightStartDate, weightEndDate, targets.goalWeightKg]);

  // -------------------------------------------------------------
  // ACTIVITY HANDLERS
  // -------------------------------------------------------------
  const handleSaveDailySummary = async (e: React.FormEvent) => {
    e.preventDefault();
    const steps = Number(formSteps) || 0;
    const calories = Number(formCaloriesBurned) || 0;

    await saveDailyActivitySummary({
      userId: userId || 'guest',
      entryDate: selectedDate,
      totalSteps: steps,
      activeCaloriesBurned: calories,
      notes: formNotes,
    });

    await refreshAllData();
  };

  const handleSaveSpecialActivity = async (e: React.FormEvent) => {
    e.preventDefault();
    const steps = Number(specialSteps) || 0;
    const calories = Number(specialCalories) || 0;
    const duration = Number(specialDuration) || undefined;

    await addSpecialActivityEntry({
      userId: userId || 'guest',
      activityDate: selectedDate,
      activityType: specialType,
      steps,
      caloriesBurned: calories,
      durationMinutes: duration,
      notes: specialNotes,
    });

    setIsSpecialModalOpen(false);
    setSpecialSteps('');
    setSpecialCalories('');
    setSpecialDuration('');
    setSpecialNotes('');
    await refreshAllData();
  };

  // -------------------------------------------------------------
  // WEIGHT HANDLERS
  // -------------------------------------------------------------
  const handleSaveWeight = async (allowOverwrite: boolean = false) => {
    const val = Number(weightInput);
    if (!val || isNaN(val)) return;

    const res = await saveCanonicalWeightRecord({
      userId: userId || 'guest',
      weightKg: val,
      loggedAt: selectedDate,
      notes: weightNotes,
      allowOverwrite,
    });

    if (res.conflict && !allowOverwrite) {
      setExistingWeightConflict(res.existingRecord || null);
      setWeightConflictModal(true);
      return;
    }

    setWeightConflictModal(false);
    await refreshAllData();
  };

  const handleConfirmDeleteWeight = async () => {
    if (!recordToDelete) return;
    await deleteWeightRecord(recordToDelete.id, recordToDelete.logged_at, userId || undefined);
    setDeleteWeightModal(false);
    setRecordToDelete(null);
    await refreshAllData();
  };

  return (
    <AppShell headerTitle="ACTIVITY & BODY WEIGHT" headerSubtitle="DAILY STEPS & WEIGHT ANALYTICS">
      <div className="space-y-4 sm:space-y-5">
        {/* Top Header Banner */}
        <div className="p-3.5 sm:p-5 rounded-3xl bg-[#100D20]/85 border border-[#9B5CFF]/25 shadow-[0_10px_30px_rgba(0,0,0,0.5)] space-y-3.5">
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
            <div>
              <div className="flex items-center gap-2 text-[10px] font-bold text-[#00D5FF] uppercase tracking-wider mb-0.5">
                <Footprints className="w-3.5 h-3.5" />
                <span>DAILY PERFORMANCE & METRICS</span>
              </div>
              <h1 className="text-base sm:text-xl font-display font-extrabold text-white uppercase tracking-wide">
                Activity & Body Weight
              </h1>
              <p className="text-xs text-[#A9A1BD] mt-0.5">
                Record whole-day step totals and manual calories burned, or switch to track body weight and 7-day moving averages.
              </p>
            </div>

            {/* Tab Switcher */}
            <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/40 border border-white/8 self-stretch sm:self-auto justify-end">
              <button
                onClick={() => setActiveTab('activity')}
                className={`flex-1 sm:flex-initial py-2 px-3.5 rounded-xl text-xs font-display font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase ${
                  activeTab === 'activity'
                    ? 'bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF] text-white shadow-[0_0_15px_rgba(155,92,255,0.35)]'
                    : 'text-[#A9A1BD] hover:text-white'
                }`}
              >
                <Footprints className="w-3.5 h-3.5" />
                <span>Activity & Steps</span>
              </button>
              <button
                onClick={() => setActiveTab('weight')}
                className={`flex-1 sm:flex-initial py-2 px-3.5 rounded-xl text-xs font-display font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase ${
                  activeTab === 'weight'
                    ? 'bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF] text-white shadow-[0_0_15px_rgba(155,92,255,0.35)]'
                    : 'text-[#A9A1BD] hover:text-white'
                }`}
              >
                <Scale className="w-3.5 h-3.5" />
                <span>Body Weight</span>
              </button>
            </div>
          </div>

          {/* Date Selector Navigation Bar */}
          <div className="pt-2.5 border-t border-white/8 flex flex-wrap items-center justify-between gap-2.5">
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() - 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}
                className="w-8 h-8 rounded-xl bg-white/5 border border-white/8 text-slate-300 hover:text-white flex items-center justify-center active:scale-95 transition-all"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-white/5 border border-white/8">
                <Calendar className="w-3.5 h-3.5 text-[#38E6A5]" />
                <input
                  type="date"
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="bg-transparent text-xs font-mono font-bold text-white focus:outline-none cursor-pointer"
                />
              </div>

              <button
                onClick={() => {
                  const d = new Date(selectedDate);
                  d.setDate(d.getDate() + 1);
                  setSelectedDate(d.toISOString().split('T')[0]);
                }}
                className="w-8 h-8 rounded-xl bg-white/5 border border-white/8 text-slate-300 hover:text-white flex items-center justify-center active:scale-95 transition-all"
              >
                <ChevronRight className="w-4 h-4" />
              </button>

              {selectedDate !== todayStr && (
                <button
                  onClick={() => setSelectedDate(todayStr)}
                  className="py-1 px-2.5 rounded-lg bg-[#38E6A5]/15 text-[#38E6A5] text-[11px] font-bold border border-[#38E6A5]/25"
                >
                  Today
                </button>
              )}
            </div>

            <div className="text-[11px] font-medium text-slate-400 flex items-center gap-2">
              <Clock className="w-3 h-3 text-slate-400" />
              <span>Viewing: <strong className="text-white">{selectedDate}</strong></span>
              {selectedDate === todayStr ? (
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

        {/* ============================================================== */}
        {/* TAB 1: DAILY ACTIVITY & STEPS TRACKING */}
        {/* ============================================================== */}
        {activeTab === 'activity' && (
          <div className="space-y-4 sm:space-y-5">
            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Daily Steps */}
              <div className="p-3.5 sm:p-4 rounded-3xl bg-[#0B132B]/85 border border-white/8 backdrop-blur-xl space-y-1 shadow-[0_8px_25px_rgba(0,0,0,0.4)]">
                <span className="text-[9.5px] font-display font-bold text-slate-400 uppercase tracking-wider block">Daily Steps</span>
                <div className="text-lg sm:text-xl font-display font-extrabold text-white">
                  {dayActivity.hasRecord ? dayActivity.totalSteps.toLocaleString() : '0'}
                </div>
                <div className="text-[10px] font-mono text-slate-300 flex items-center justify-between">
                  <span>Target: {targets.steps.toLocaleString()}</span>
                  <span className={dayActivity.totalSteps >= targets.steps ? 'text-emerald-400 font-bold' : 'text-slate-400'}>
                    {dayActivity.totalSteps >= targets.steps ? 'Met!' : `${Math.max(0, targets.steps - dayActivity.totalSteps).toLocaleString()} left`}
                  </span>
                </div>
              </div>

              {/* Manual Active Calories */}
              <div className="p-3.5 sm:p-4 rounded-3xl bg-[#0B132B]/85 border border-white/8 backdrop-blur-xl space-y-1 shadow-[0_8px_25px_rgba(0,0,0,0.4)]">
                <span className="text-[9.5px] font-display font-bold text-[#38E6A5] uppercase tracking-wider block">Active Calories</span>
                <div className="text-lg sm:text-xl font-display font-extrabold text-[#38E6A5]">
                  {dayActivity.hasRecord ? `${dayActivity.activeCaloriesBurned} kcal` : '0 kcal'}
                </div>
                <div className="text-[9.5px] text-slate-400 font-mono">
                  Direct entry (unestimated)
                </div>
              </div>

              {/* Step Streak */}
              <div className="p-3.5 sm:p-4 rounded-3xl bg-[#0B132B]/85 border border-white/8 backdrop-blur-xl space-y-1 shadow-[0_8px_25px_rgba(0,0,0,0.4)]">
                <span className="text-[9.5px] font-display font-bold text-emerald-400 uppercase tracking-wider block">Step Streak</span>
                <div className="text-lg sm:text-xl font-display font-extrabold text-emerald-400 flex items-center gap-1.5">
                  <Flame className="w-4 h-4 fill-emerald-400/20 text-emerald-400" />
                  <span>{streak.currentStreak} Days</span>
                </div>
                <div className="text-[9.5px] text-slate-400 font-mono">
                  Best: {streak.longestStreak} days
                </div>
              </div>

              {/* Entry Mode */}
              <div className="p-3.5 sm:p-4 rounded-3xl bg-[#0B132B]/85 border border-white/8 backdrop-blur-xl space-y-1 shadow-[0_8px_25px_rgba(0,0,0,0.4)]">
                <span className="text-[9.5px] font-display font-bold text-slate-400 uppercase tracking-wider block">Mode</span>
                <div className="text-xs sm:text-sm font-display font-extrabold text-white truncate uppercase">
                  {activityMode === 'daily_summary' ? 'Full-Day Total' : 'Activity Sessions'}
                </div>
                <div className="text-[9.5px] text-cyan-400 font-mono">
                  Zero double-count
                </div>
              </div>
            </div>

            {/* Entry Mode Selector & Form */}
            <div className="p-4 sm:p-5 rounded-3xl bg-[#0B132B]/85 border border-white/8 backdrop-blur-xl space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/8 pb-3">
                <div>
                  <h3 className="font-display font-extrabold text-white text-sm sm:text-base flex items-center gap-2 uppercase tracking-wide">
                    <Footprints className="w-4 h-4 text-[#38E6A5]" />
                    <span>Record Activity for {selectedDate}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Enter your whole day's total steps and manual calories burned in one operation.
                  </p>
                </div>

                {/* Mode Selector Toggle */}
                <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/40 border border-white/8 self-stretch sm:self-auto">
                  <button
                    onClick={() => setActivityMode('daily_summary')}
                    className={`flex-1 sm:flex-initial py-1.5 px-3 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      activityMode === 'daily_summary' ? 'bg-gradient-to-r from-[#38E6A5] to-[#00D5FF] text-slate-950 shadow-[0_0_10px_rgba(56,230,165,0.25)]' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Full-Day Total
                  </button>
                  <button
                    onClick={() => setActivityMode('individual_activities')}
                    className={`flex-1 sm:flex-initial py-1.5 px-3 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all cursor-pointer ${
                      activityMode === 'individual_activities' ? 'bg-gradient-to-r from-[#38E6A5] to-[#00D5FF] text-slate-950 shadow-[0_0_10px_rgba(56,230,165,0.25)]' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    Sessions
                  </button>
                </div>
              </div>

              {/* MODE A: FULL-DAY SUMMARY (DEFAULT) */}
              {activityMode === 'daily_summary' ? (
                <form onSubmit={handleSaveDailySummary} className="space-y-3.5">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <label className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider">Total Steps for the Whole Day</label>
                      <input
                        type="number"
                        placeholder="e.g. 10450"
                        value={formSteps}
                        onChange={(e) => setFormSteps(e.target.value)}
                        className="w-full py-2.5 px-3.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono font-bold text-sm sm:text-base focus:outline-none focus:border-[#38E6A5]"
                        required
                      />
                    </div>

                    <div className="space-y-1">
                      <label className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider">Total Active Calories Burned (kcal)</label>
                      <input
                        type="number"
                        placeholder="e.g. 450"
                        value={formCaloriesBurned}
                        onChange={(e) => setFormCaloriesBurned(e.target.value)}
                        className="w-full py-2.5 px-3.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono font-bold text-sm sm:text-base focus:outline-none focus:border-[#38E6A5]"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-1">
                    <label className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider">Daily Activity Notes (Optional)</label>
                    <input
                      type="text"
                      placeholder="e.g. Evening walk, high step count, brisk pace"
                      value={formNotes}
                      onChange={(e) => setFormNotes(e.target.value)}
                      className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-[#38E6A5]"
                    />
                  </div>

                  <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-1 border-t border-white/8">
                    <span className="text-[10px] text-slate-400 italic">
                      Zero estimation rule: Calories are saved as entered, never auto-derived from steps.
                    </span>
                    <button
                      type="submit"
                      className="w-full sm:w-auto py-2.5 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-display font-extrabold text-xs tracking-wider uppercase shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer active:scale-95"
                    >
                      Save Daily Activity Summary
                    </button>
                  </div>
                </form>
              ) : (
                /* MODE B: INDIVIDUAL ACTIVITIES LOG */
                <div className="space-y-3.5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-slate-300">
                      Total for {selectedDate} is automatically computed from individual walking, treadmill, or running sessions.
                    </p>
                    <button
                      onClick={() => setIsSpecialModalOpen(true)}
                      className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-[#38E6A5] to-[#00D5FF] text-slate-950 font-display font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer shadow-[0_0_12px_rgba(56,230,165,0.25)] active:scale-95 transition-all"
                    >
                      <Plus className="w-4 h-4 stroke-[3]" />
                      <span>Add Entry</span>
                    </button>
                  </div>

                  {dayActivity.specialEntries.length === 0 ? (
                    <div className="p-7 rounded-2xl bg-white/[0.02] border border-dashed border-white/10 text-center text-xs text-slate-400">
                      No individual activity entries recorded for this date. Click "Add Entry" above.
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {dayActivity.specialEntries.map((entry) => (
                        <div key={entry.id} className="p-3 rounded-2xl bg-white/[0.03] border border-white/6 flex items-center justify-between text-xs">
                          <div>
                            <span className="font-display font-bold text-white text-sm block uppercase tracking-wide">{entry.activity_type}</span>
                            <span className="text-slate-400 font-mono text-[11px]">
                              {entry.steps > 0 && `${entry.steps.toLocaleString()} steps • `}
                              {entry.calories_burned} kcal burned
                              {entry.duration_minutes ? ` • ${entry.duration_minutes} min` : ''}
                            </span>
                            {entry.notes && <p className="text-[11px] text-slate-400 mt-0.5">{entry.notes}</p>}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* TAB 2: DAILY BODY WEIGHT TRACKING & 7-DAY MOVING AVERAGE */}
        {/* ============================================================== */}
        {activeTab === 'weight' && (
          <div className="space-y-4 sm:space-y-5">
            {/* Quick Metrics Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
              {/* Latest Measured Weight */}
              <div className="p-3.5 sm:p-4 rounded-3xl bg-[#0B132B]/85 border border-white/8 backdrop-blur-xl space-y-1 shadow-[0_8px_25px_rgba(0,0,0,0.4)]">
                <span className="text-[9.5px] font-display font-bold text-slate-400 uppercase tracking-wider block">Latest Weight</span>
                <div className="text-lg sm:text-xl font-display font-extrabold text-white">
                  {weightAnalytics.currentWeight !== null ? `${weightAnalytics.currentWeight} kg` : 'Not recorded'}
                </div>
                <div className="text-[9.5px] text-slate-400 font-mono">
                  {weightAnalytics.latestDate ? `${weightAnalytics.latestDate}` : 'No records'}
                </div>
              </div>

              {/* Goal Weight */}
              <div className="p-3.5 sm:p-4 rounded-3xl bg-[#0B132B]/85 border border-white/8 backdrop-blur-xl space-y-1 shadow-[0_8px_25px_rgba(0,0,0,0.4)]">
                <span className="text-[9.5px] font-display font-bold text-[#38E6A5] uppercase tracking-wider block">Target Goal</span>
                <div className="text-lg sm:text-xl font-display font-extrabold text-[#38E6A5]">
                  {targets.goalWeightKg ? `${targets.goalWeightKg} kg` : 'Not set'}
                </div>
                <div className="text-[9.5px] text-slate-400 font-mono">
                  In Profile & Goals
                </div>
              </div>

              {/* Period Change */}
              <div className="p-3.5 sm:p-4 rounded-3xl bg-[#0B132B]/85 border border-white/8 backdrop-blur-xl space-y-1 shadow-[0_8px_25px_rgba(0,0,0,0.4)]">
                <span className="text-[9.5px] font-display font-bold text-cyan-400 uppercase tracking-wider block">Change ({weightTimeframe})</span>
                <div className="text-lg sm:text-xl font-display font-extrabold text-cyan-400 font-mono">
                  {weightAnalytics.changeKg !== null ? `${weightAnalytics.changeKg > 0 ? '+' : ''}${weightAnalytics.changeKg} kg` : '—'}
                </div>
                <div className="text-[9.5px] text-slate-400 font-mono">
                  {weightAnalytics.recordsCount} weigh-ins
                </div>
              </div>

              {/* Progress Toward Goal */}
              <div className="p-3.5 sm:p-4 rounded-3xl bg-[#0B132B]/85 border border-white/8 backdrop-blur-xl space-y-1 shadow-[0_8px_25px_rgba(0,0,0,0.4)]">
                <span className="text-[9.5px] font-display font-bold text-emerald-400 uppercase tracking-wider block">Goal Progress</span>
                <div className="text-lg sm:text-xl font-display font-extrabold text-emerald-400 font-mono">
                  {weightAnalytics.progressToGoalPct !== null ? `${weightAnalytics.progressToGoalPct}%` : '—'}
                </div>
                <div className="text-[9.5px] text-slate-400 font-mono">
                  Toward goal
                </div>
              </div>
            </div>

            {/* Daily Weight Logger Form */}
            <div className="p-4 sm:p-5 rounded-3xl bg-[#0B132B]/85 border border-white/8 backdrop-blur-xl space-y-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between border-b border-white/8 pb-3">
                <div>
                  <h3 className="font-display font-extrabold text-white text-sm sm:text-base flex items-center gap-2 uppercase tracking-wide">
                    <Scale className="w-4 h-4 text-[#38E6A5]" />
                    <span>Log Daily Body Weight: {selectedDate}</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Supports backdated weigh-ins. At most one canonical measurement per calendar date.
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-end">
                <div className="space-y-1">
                  <label className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider">Body Weight (kg)</label>
                  <input
                    type="number"
                    step="0.1"
                    placeholder="e.g. 74.2"
                    value={weightInput}
                    onChange={(e) => setWeightInput(e.target.value)}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono font-bold text-sm sm:text-base focus:outline-none focus:border-[#38E6A5]"
                  />
                </div>

                <div className="space-y-1 sm:col-span-1">
                  <label className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider">Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Morning fasted"
                    value={weightNotes}
                    onChange={(e) => setWeightNotes(e.target.value)}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-[#38E6A5]"
                  />
                </div>

                <div>
                  <button
                    onClick={() => handleSaveWeight(false)}
                    className="w-full py-3 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-display font-extrabold text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(16,185,129,0.3)] transition-all cursor-pointer active:scale-95"
                  >
                    Save Weigh-In for {selectedDate}
                  </button>
                </div>
              </div>
            </div>

            {/* WEIGHT ANALYTICS: 7-DAY MOVING AVERAGE CHART */}
            <div className="p-4 sm:p-5 rounded-3xl bg-[#0B132B]/85 border border-white/8 backdrop-blur-xl space-y-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
                <div>
                  <h3 className="font-display font-extrabold text-white text-sm sm:text-base flex items-center gap-2 uppercase tracking-wide">
                    <TrendingUp className="w-4 h-4 text-[#38E6A5]" />
                    <span>Weight Progression & 7-Day Moving Average</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">
                    Calculated only over real weigh-ins. Missing days are never treated as zero.
                  </p>
                </div>

                {/* Period Filter */}
                <div className="flex items-center gap-1 bg-black/40 p-1 rounded-2xl border border-white/8 overflow-x-auto max-w-full">
                  {(['7D', '30D', '3M', '6M', '1Y', 'ALL', 'CUSTOM'] as TimeFilter[]).map((tf) => (
                    <button
                      key={tf}
                      onClick={() => setWeightTimeframe(tf)}
                      className={`py-1 px-2.5 rounded-xl text-xs font-display font-bold uppercase tracking-wider transition-all cursor-pointer ${
                        weightTimeframe === tf ? 'bg-gradient-to-r from-[#38E6A5] to-[#00D5FF] text-slate-950 shadow-[0_0_10px_rgba(56,230,165,0.25)]' : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      {tf}
                    </button>
                  ))}
                </div>
              </div>

              {weightAnalytics.timeline.length > 0 ? (
                <div className="h-60 w-full pt-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={weightAnalytics.timeline}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                      <XAxis dataKey="displayDate" stroke="#64748B" fontSize={9} tickLine={false} />
                      <YAxis stroke="#64748B" fontSize={9} tickLine={false} domain={['auto', 'auto']} unit="kg" />
                      <Tooltip
                        contentStyle={{ backgroundColor: '#0B132B', borderColor: 'rgba(255,255,255,0.12)', borderRadius: '1rem', fontSize: '11px', color: '#F8FAFC' }}
                      />
                      <Legend />
                      {targets.goalWeightKg && (
                        <ReferenceLine y={targets.goalWeightKg} stroke="#FF42A6" strokeDasharray="4 4" label="Goal" />
                      )}
                      <Line
                        type="monotone"
                        dataKey="weightKg"
                        name="Actual Weight (kg)"
                        stroke="#10B981"
                        strokeWidth={2}
                        dot={{ r: 2.5 }}
                      />
                      <Line
                        type="monotone"
                        dataKey="movingAvg7D"
                        name="7-Day Moving Avg (kg)"
                        stroke="#06B6D4"
                        strokeWidth={2.5}
                        dot={false}
                        connectNulls
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              ) : (
                <div className="h-44 flex items-center justify-center text-xs text-slate-500">
                  No weigh-ins recorded for this period. Log today's weight above to start tracking.
                </div>
              )}
            </div>

            {/* WEIGHT HISTORY TABLE */}
            <div className="p-4 sm:p-5 rounded-3xl bg-[#0B132B]/85 border border-white/8 backdrop-blur-xl space-y-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              <h4 className="font-display font-extrabold text-white text-xs sm:text-sm uppercase tracking-wide">Weight Measurement History</h4>
              {weightRecords.length === 0 ? (
                <div className="text-xs text-slate-500 py-3">No weigh-ins logged yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-white/8 text-slate-400 uppercase text-[9.5px] font-display font-bold tracking-wider">
                        <th className="py-2 px-3">Date</th>
                        <th className="py-2 px-3">Weight</th>
                        <th className="py-2 px-3">Notes</th>
                        <th className="py-2 px-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-white/5 font-medium">
                      {weightRecords.slice().reverse().map((r) => (
                        <tr key={r.id} className="hover:bg-white/[0.02]">
                          <td className="py-2.5 px-3 font-mono font-bold text-white">{r.logged_at}</td>
                          <td className="py-2.5 px-3 font-mono font-bold text-emerald-400">{r.weight_kg} kg</td>
                          <td className="py-2.5 px-3 text-slate-400">{r.notes || '—'}</td>
                          <td className="py-2.5 px-3 text-right">
                            <button
                              onClick={() => {
                                setRecordToDelete(r);
                                setDeleteWeightModal(true);
                              }}
                              className="p-1 text-slate-400 hover:text-rose-400 transition-colors"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* MODAL: WEIGHT CONFLICT CONFIRMATION */}
        {weightConflictModal && existingWeightConflict && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/75 backdrop-blur-md">
            <div className="bg-[#0B132B]/95 backdrop-blur-2xl border border-white/12 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.9)]">
              <div className="flex items-center gap-2.5 border-b border-white/8 pb-3">
                <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
                <h3 className="font-display font-extrabold text-white text-sm sm:text-base uppercase tracking-wide">Update Existing Weigh-In?</h3>
              </div>
              <p className="text-xs text-slate-300">
                A weight record of <strong>{existingWeightConflict.weight_kg} kg</strong> already exists for {selectedDate}. Do you want to update it to <strong>{weightInput} kg</strong>?
              </p>
              <div className="flex gap-2 pt-1 border-t border-white/8">
                <button
                  onClick={() => setWeightConflictModal(false)}
                  className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-display font-bold uppercase transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={() => handleSaveWeight(true)}
                  className="flex-1 py-2 rounded-xl bg-gradient-to-r from-[#38E6A5] to-[#00D5FF] text-slate-950 text-xs font-display font-black uppercase tracking-wider shadow-[0_0_12px_rgba(56,230,165,0.25)] active:scale-95"
                >
                  Update Record
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: DELETE WEIGHT RECORD */}
        {deleteWeightModal && recordToDelete && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/75 backdrop-blur-md">
            <div className="bg-[#0B132B]/95 backdrop-blur-2xl border border-white/12 rounded-3xl w-full max-w-sm p-5 space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.9)]">
              <div className="flex items-center gap-2.5">
                <Trash2 className="w-5 h-5 text-rose-400 shrink-0" />
                <h3 className="font-display font-extrabold text-white text-sm sm:text-base uppercase tracking-wide">Delete Weight Record?</h3>
              </div>
              <p className="text-xs text-slate-300">
                Are you sure you want to delete the weigh-in of {recordToDelete.weight_kg} kg for {recordToDelete.logged_at}?
              </p>
              <div className="flex gap-2 pt-1 border-t border-white/8">
                <button
                  onClick={() => {
                    setDeleteWeightModal(false);
                    setRecordToDelete(null);
                  }}
                  className="flex-1 py-2 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-display font-bold uppercase transition-all"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmDeleteWeight}
                  className="flex-1 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-white text-xs font-display font-black uppercase tracking-wider shadow-[0_0_12px_rgba(244,63,94,0.3)] active:scale-95"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        )}

        {/* MODAL: ADD SPECIAL ACTIVITY ENTRY */}
        {isSpecialModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/75 backdrop-blur-md">
            <div className="bg-[#0B132B]/95 backdrop-blur-2xl border border-white/12 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.9)]">
              <div className="flex items-center justify-between border-b border-white/8 pb-3">
                <h3 className="font-display font-extrabold text-white text-sm sm:text-base uppercase tracking-wide">Log Special Activity Entry</h3>
                <button
                  onClick={() => setIsSpecialModalOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/8 flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleSaveSpecialActivity} className="space-y-3 text-xs">
                <div>
                  <label className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider block mb-1">Activity Type</label>
                  <select
                    value={specialType}
                    onChange={(e) => setSpecialType(e.target.value as ActivityType)}
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono font-bold"
                  >
                    <option value="Walking">Walking</option>
                    <option value="Treadmill">Treadmill</option>
                    <option value="Running">Running</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider block mb-1">Steps (if applicable)</label>
                    <input
                      type="number"
                      placeholder="e.g. 4000"
                      value={specialSteps}
                      onChange={(e) => setSpecialSteps(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono font-bold"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider block mb-1">Manual Calories (kcal)</label>
                    <input
                      type="number"
                      placeholder="e.g. 220"
                      value={specialCalories}
                      onChange={(e) => setSpecialCalories(e.target.value)}
                      className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono font-bold"
                      required
                    />
                  </div>
                </div>

                <div>
                  <label className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider block mb-1">Duration in Minutes (Optional)</label>
                  <input
                    type="number"
                    placeholder="e.g. 35"
                    value={specialDuration}
                    onChange={(e) => setSpecialDuration(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white font-mono font-bold"
                  />
                </div>

                <div>
                  <label className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider block mb-1">Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="e.g. Incline walk 4.5 km/h"
                    value={specialNotes}
                    onChange={(e) => setSpecialNotes(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs"
                  />
                </div>

                <div className="flex gap-2 pt-2 border-t border-white/8">
                  <button
                    type="button"
                    onClick={() => setIsSpecialModalOpen(false)}
                    className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-display font-bold text-xs uppercase"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#38E6A5] to-[#00D5FF] text-slate-950 font-display font-black text-xs uppercase tracking-wider shadow-[0_0_12px_rgba(56,230,165,0.25)] active:scale-95"
                  >
                    Save Entry
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </AppShell>
  );
}
