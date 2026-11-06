'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  Dumbbell,
  TrendingUp,
  Calendar,
  Search,
  Filter,
  Layers,
  Zap,
  CheckCircle2,
  ChevronRight,
  BarChart3,
  Scale,
  GitCompare,
  Utensils,
  Footprints,
  Flame,
  ArrowUpRight,
  ArrowDownRight,
  Minus,
  Plus,
  Loader2,
  CalendarCheck,
  Target,
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
  AreaChart,
  Area,
  ReferenceLine,
} from 'recharts';
import { createClient, getFastAuthUser } from '@/lib/supabase/client';
import {
  MuscleGroupName,
  MUSCLE_GROUPS,
  EXERCISE_CATALOG,
  EnrichedWorkoutSession,
  MuscleGroupStats,
  ExerciseAnalyticsReport,
  ComparisonStudioResult,
  calculateMuscleGroupStats,
  calculateExerciseAnalytics,
  buildComparisonStudioData,
  fetchUserWorkoutSessions,
} from '@/lib/services/workoutAnalyticsService';
import {
  fetchAllWeightRecords,
  calculateWeightAnalytics,
  WeightRecord,
  WeightAnalyticsResult,
  addWeightLogRecord,
} from '@/lib/services/bodyWeightService';
import {
  fetchAllActivitySummaries,
  DayResolvedActivity,
} from '@/lib/services/dailyActivityService';
import {
  fetchDailySummariesDateRange,
} from '@/lib/services/nutritionSummaryService';
import {
  fetchUserTargets,
  UserTargets,
  DEFAULT_CENTRALIZED_TARGETS,
  getLocalCachedTargets,
} from '@/lib/services/targetService';
import {
  calculatePlanAdherenceStats,
  PlanAdherenceStats,
} from '@/lib/services/workoutPlannerService';
import { DailyNutritionSummary } from '@/lib/types/database';

type TimeFilterType = '7D' | '30D' | '3M' | '6M' | '1Y' | 'ALL' | 'CUSTOM';
type ActiveTabType =
  | 'body_activity'
  | 'nutrition_analytics'
  | 'workout_adherence'
  | 'muscle_groups'
  | 'exercise_progression'
  | 'comparison_studio';

export default function ProgressPage() {
  const [activeTab, setActiveTab] = useState<ActiveTabType>('body_activity');
  const [timeFilter, setTimeFilter] = useState<TimeFilterType>('30D');
  const [customStartDate, setCustomStartDate] = useState<string>(
    new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0]
  );
  const [customEndDate, setCustomEndDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const [userId, setUserId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // Centralized targets - instant local read
  const [targets, setTargets] = useState<UserTargets>(() => getLocalCachedTargets());

  // Loaded Data Sources
  const [sessions, setSessions] = useState<EnrichedWorkoutSession[]>([]);
  const [weightRecords, setWeightRecords] = useState<WeightRecord[]>([]);
  const [activityRecords, setActivityRecords] = useState<DayResolvedActivity[]>([]);
  const [nutritionSummaries, setNutritionSummaries] = useState<DailyNutritionSummary[]>([]);
  const [adherenceStats, setAdherenceStats] = useState<PlanAdherenceStats | null>(null);

  // Muscle & Exercise Selections
  const [selectedMuscle, setSelectedMuscle] = useState<MuscleGroupName | null>(null);
  const [selectedExerciseName, setSelectedExerciseName] = useState<string>('Barbell Bench Press');
  const [exerciseSearchQuery, setExerciseSearchQuery] = useState<string>('');
  const [exerciseCategoryFilter, setExerciseCategoryFilter] = useState<string>('All');
  const [drilldownSessionId, setDrilldownSessionId] = useState<string | null>(null);

  // Comparison Studio Selections
  const [comparisonSelectedExercises, setComparisonSelectedExercises] = useState<string[]>([
    'Barbell Bench Press',
    'Incline Dumbbell Press',
  ]);
  const [comparisonMetric, setComparisonMetric] = useState<'weight' | 'reps' | 'volume'>('weight');

  // Weight Log Modal State
  const [showWeightModal, setShowWeightModal] = useState<boolean>(false);
  const [modalWeightKg, setModalWeightKg] = useState<string>('');
  const [modalWeightDate, setModalWeightDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );

  const supabase = createClient();

  // Load All Progress Data in parallel
  const loadProgressData = async () => {
    try {
      const fastUser = await getFastAuthUser();
      const uid = fastUser ? fastUser.id : 'guest';
      setUserId(uid);

      const pastYear = new Date(Date.now() - 365 * 86400000).toISOString().split('T')[0];
      const todayStr = new Date().toISOString().split('T')[0];

      const [
        tRes,
        sRes,
        wRes,
        aRes,
        nRes,
        adhRes,
      ] = await Promise.allSettled([
        fetchUserTargets(uid),
        fetchUserWorkoutSessions(uid),
        fetchAllWeightRecords(uid),
        fetchAllActivitySummaries(uid),
        fetchDailySummariesDateRange(uid, pastYear, todayStr),
        calculatePlanAdherenceStats(uid),
      ]);

      if (tRes.status === 'fulfilled') setTargets(tRes.value);
      if (sRes.status === 'fulfilled') setSessions(sRes.value);
      if (wRes.status === 'fulfilled') setWeightRecords(wRes.value);
      if (aRes.status === 'fulfilled') setActivityRecords(aRes.value);
      if (nRes.status === 'fulfilled') setNutritionSummaries(nRes.value);
      if (adhRes.status === 'fulfilled') setAdherenceStats(adhRes.value);
    } catch (err) {
      console.error('Failed to load progress data:', err);
    }
  };

  useEffect(() => {
    loadProgressData();

    // Listen for centralized target updates from Profile & Goals
    const handleTargetsUpdated = (e: any) => {
      if (e.detail) {
        setTargets(e.detail);
      }
    };
    window.addEventListener('gymhub_targets_updated', handleTargetsUpdated);

    return () => {
      window.removeEventListener('gymhub_targets_updated', handleTargetsUpdated);
    };
  }, []);

  // Compute Active Date Range
  const { startDate, endDate, periodLabel, prevPeriodLabel } = useMemo(() => {
    const end = new Date();
    const start = new Date();

    if (timeFilter === '7D') {
      start.setDate(end.getDate() - 7);
    } else if (timeFilter === '30D') {
      start.setDate(end.getDate() - 30);
    } else if (timeFilter === '3M') {
      start.setMonth(end.getMonth() - 3);
    } else if (timeFilter === '6M') {
      start.setMonth(end.getMonth() - 6);
    } else if (timeFilter === '1Y') {
      start.setFullYear(end.getFullYear() - 1);
    } else if (timeFilter === 'ALL') {
      start.setFullYear(end.getFullYear() - 5);
    } else if (timeFilter === 'CUSTOM') {
      const cStart = new Date(customStartDate);
      const cEnd = new Date(customEndDate);
      cEnd.setHours(23, 59, 59, 999);
      return {
        startDate: cStart,
        endDate: cEnd,
        periodLabel: `${customStartDate} to ${customEndDate}`,
        prevPeriodLabel: 'Prior period',
      };
    }

    const fmt = (d: Date) =>
      d.toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' });
    const diffMs = end.getTime() - start.getTime();
    const prevStart = new Date(start.getTime() - diffMs);
    const prevEnd = new Date(start.getTime() - 1);

    return {
      startDate: start,
      endDate: end,
      periodLabel: `${fmt(start)} – ${fmt(end)}`,
      prevPeriodLabel: `${fmt(prevStart)} – ${fmt(prevEnd)}`,
    };
  }, [timeFilter, customStartDate, customEndDate]);

  const startDateStr = startDate.toISOString().split('T')[0];
  const endDateStr = endDate.toISOString().split('T')[0];

  // 1. Filtered Weight Analytics
  const filteredWeights = useMemo(() => {
    return weightRecords.filter(
      (r) => r.logged_at >= startDateStr && r.logged_at <= endDateStr
    );
  }, [weightRecords, startDateStr, endDateStr]);

  const weightAnalytics = useMemo(() => {
    return calculateWeightAnalytics(filteredWeights, startDateStr, endDateStr, targets.goalWeightKg);
  }, [filteredWeights, startDateStr, endDateStr, targets.goalWeightKg]);

  // 2. Filtered Activity Analytics
  const filteredActivity = useMemo(() => {
    return activityRecords
      .filter((a) => a.date >= startDateStr && a.date <= endDateStr)
      .sort((a, b) => a.date.localeCompare(b.date));
  }, [activityRecords, startDateStr, endDateStr]);

  // 3. Filtered Nutrition Summaries
  const filteredNutrition = useMemo(() => {
    return nutritionSummaries
      .filter((n) => n.entry_date >= startDateStr && n.entry_date <= endDateStr)
      .sort((a, b) => a.entry_date.localeCompare(b.entry_date));
  }, [nutritionSummaries, startDateStr, endDateStr]);

  // 4. Muscle Group Analytics
  const muscleStats: MuscleGroupStats[] = useMemo(() => {
    return calculateMuscleGroupStats(sessions, startDate, endDate);
  }, [sessions, startDate, endDate]);

  // 5. Individual Exercise Report
  const exerciseReport: ExerciseAnalyticsReport = useMemo(() => {
    return calculateExerciseAnalytics(sessions, selectedExerciseName);
  }, [sessions, selectedExerciseName]);

  // 6. Comparison Studio
  const comparisonStudioData: ComparisonStudioResult = useMemo(() => {
    return buildComparisonStudioData(sessions, comparisonSelectedExercises);
  }, [sessions, comparisonSelectedExercises]);

  // Catalog filtered for exercise search
  const filteredCatalog = useMemo(() => {
    return EXERCISE_CATALOG.filter((ex) => {
      const matchSearch =
        ex.name.toLowerCase().includes(exerciseSearchQuery.toLowerCase()) ||
        ex.primaryMuscle.toLowerCase().includes(exerciseSearchQuery.toLowerCase());
      const matchCat =
        exerciseCategoryFilter === 'All' || ex.primaryMuscle === exerciseCategoryFilter;
      return matchSearch && matchCat;
    });
  }, [exerciseSearchQuery, exerciseCategoryFilter]);

  const handleToggleComparisonExercise = (name: string) => {
    if (comparisonSelectedExercises.includes(name)) {
      if (comparisonSelectedExercises.length <= 1) return;
      setComparisonSelectedExercises(comparisonSelectedExercises.filter((n) => n !== name));
    } else {
      if (comparisonSelectedExercises.length >= 4) return;
      setComparisonSelectedExercises([...comparisonSelectedExercises, name]);
    }
  };

  const handleSaveModalWeight = async () => {
    const val = parseFloat(modalWeightKg);
    if (isNaN(val) || val <= 0 || val > 400) return;
    await addWeightLogRecord({
      userId: userId || undefined,
      weightKg: val,
      loggedAt: modalWeightDate,
    });
    setShowWeightModal(false);
    setModalWeightKg('');
    loadProgressData();
  };

  const statusBadge = (status: MuscleGroupStats['status']) => {
    switch (status) {
      case 'Improving':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20">
            <ArrowUpRight className="w-3.5 h-3.5" />
            <span>Improving</span>
          </span>
        );
      case 'Declining':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-md border border-rose-500/20">
            <ArrowDownRight className="w-3.5 h-3.5" />
            <span>Declining</span>
          </span>
        );
      case 'Stable':
        return (
          <span className="flex items-center gap-1 text-[11px] font-bold text-cyan-400 bg-cyan-500/10 px-2 py-0.5 rounded-md border border-cyan-500/20">
            <Minus className="w-3.5 h-3.5" />
            <span>Stable</span>
          </span>
        );
      default:
        return (
          <span className="flex items-center gap-1 text-[11px] font-semibold text-slate-400 bg-slate-800 px-2 py-0.5 rounded-md">
            <span>Insufficient Data</span>
          </span>
        );
    }
  };

  return (
    <AppShell headerTitle="PROGRESS HUB — UNIFIED PERFORMANCE ANALYTICS">
      {/* Top Banner: Dark Performance-Console Aesthetic */}
      <div className="p-4 md:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-orange-950/20 border border-slate-800/90 shadow-2xl space-y-4">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">
              <Zap className="w-3.5 h-3.5" />
              <span>Unified Progress Engine (Single Source of Truth)</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-100 tracking-tight">
              PROGRESS HUB & BIOMETRIC ANALYTICS
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              All metrics strictly synchronized with your centralized targets and verified tracking records.
            </p>
          </div>

          <div className="flex items-center gap-2 self-stretch md:self-auto justify-end">
            <button
              onClick={() => setShowWeightModal(true)}
              className="py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 text-xs font-bold font-display tracking-wider flex items-center gap-1.5 transition-colors cursor-pointer shadow-lg shadow-orange-500/20 uppercase"
            >
              <Scale className="w-4 h-4 stroke-[2.2]" />
              <span>Log Weigh-In</span>
            </button>
          </div>
        </div>

        {/* Global Time Filter Controls */}
        <div className="pt-2 border-t border-slate-800/80 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            {(['7D', '30D', '3M', '6M', '1Y', 'ALL', 'CUSTOM'] as TimeFilterType[]).map((tf) => (
              <button
                key={tf}
                onClick={() => setTimeFilter(tf)}
                className={`py-1.5 px-3 rounded-xl text-xs font-bold transition-all cursor-pointer whitespace-nowrap ${
                  timeFilter === tf
                    ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                    : 'bg-slate-950/70 text-slate-400 hover:text-slate-200 border border-slate-800/60'
                }`}
              >
                {tf}
              </button>
            ))}
          </div>

          <div className="text-[11px] text-slate-400 font-medium flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-orange-400" />
            <span>
              Period: <strong className="text-slate-200">{periodLabel}</strong>
            </span>
          </div>
        </div>

        {/* Custom Date Range Picker */}
        {timeFilter === 'CUSTOM' && (
          <div className="p-3 rounded-2xl bg-slate-950/70 border border-slate-800 flex flex-wrap items-center gap-3">
            <span className="text-xs text-slate-300 font-bold">Custom Range:</span>
            <input
              type="date"
              value={customStartDate}
              onChange={(e) => setCustomStartDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 font-medium"
            />
            <span className="text-xs text-slate-400">to</span>
            <input
              type="date"
              value={customEndDate}
              onChange={(e) => setCustomEndDate(e.target.value)}
              className="px-2.5 py-1.5 rounded-lg bg-slate-900 border border-slate-800 text-xs text-slate-100 font-medium"
            />
          </div>
        )}
      </div>

      {/* Navigation Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1 border-b border-slate-800">
        {[
          { id: 'body_activity', label: 'Body Weight & Daily Activity', icon: Scale },
          { id: 'nutrition_analytics', label: 'Nutrition Macros & Fibre', icon: Utensils },
          { id: 'workout_adherence', label: 'Workout Adherence & Frequency', icon: CalendarCheck },
          { id: 'muscle_groups', label: 'Muscle Group Volume', icon: Layers },
          { id: 'exercise_progression', label: 'Exercise Progression', icon: Dumbbell },
          { id: 'comparison_studio', label: 'Comparison Studio', icon: GitCompare },
        ].map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as ActiveTabType)}
              className={`flex items-center gap-2 py-2.5 px-4 rounded-xl text-xs font-bold transition-all whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-slate-900 text-orange-400 border border-orange-500/30 shadow-lg'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/50'
              }`}
            >
              <Icon className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-slate-500'}`} />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* ============================================================== */}
      {/* TAB 1: BODY WEIGHT & DAILY ACTIVITY */}
      {/* ============================================================== */}
      {activeTab === 'body_activity' && (
        <div className="space-y-6">
          {/* Section A: Body Weight Tracking & 7-Day Moving Average */}
          <div className="p-5 md:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <Scale className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-display text-[10px] text-orange-400 font-bold tracking-widest uppercase">
                    BIOMETRIC WEIGH-IN HISTORY
                  </span>
                  <h3 className="font-display font-extrabold text-slate-100 text-lg md:text-xl tracking-wider uppercase">
                    DAILY BODY WEIGHT & 7-DAY MOVING AVERAGE
                  </h3>
                </div>
              </div>

              {/* Summary Badges */}
              <div className="flex flex-wrap items-center gap-3 text-xs font-mono">
                <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Current: </span>
                  <strong className="text-slate-100">
                    {weightAnalytics.currentWeight !== null
                      ? `${weightAnalytics.currentWeight} kg`
                      : 'Not logged'}
                  </strong>
                </div>
                <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
                  <span className="text-slate-400">Goal: </span>
                  <strong className="text-amber-400">
                    {targets.goalWeightKg ? `${targets.goalWeightKg} kg` : 'Not set'}
                  </strong>
                </div>
                {weightAnalytics.changeKg !== null && (
                  <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
                    <span className="text-slate-400">Change: </span>
                    <strong
                      className={
                        weightAnalytics.changeKg > 0 ? 'text-emerald-400' : 'text-rose-400'
                      }
                    >
                      {weightAnalytics.changeKg > 0
                        ? `+${weightAnalytics.changeKg}`
                        : weightAnalytics.changeKg}{' '}
                      kg
                    </strong>
                  </div>
                )}
              </div>
            </div>

            {weightAnalytics.timeline.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
                <p className="text-sm text-slate-400 font-medium">
                  No body weight entries logged for this period ({periodLabel}).
                </p>
                <button
                  onClick={() => setShowWeightModal(true)}
                  className="py-2 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 text-xs font-bold cursor-pointer"
                >
                  Log Weigh-In Now
                </button>
              </div>
            ) : (
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={weightAnalytics.timeline}
                    margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                    <XAxis dataKey="displayDate" stroke="#64748B" fontSize={11} tickLine={false} />
                    <YAxis
                      domain={['dataMin - 1', 'dataMax + 1']}
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                    />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: '#F8FAFC',
                      }}
                      formatter={(val: any, name: any) => [
                        `${val} kg`,
                        name === 'weightKg'
                          ? 'Daily Weigh-in'
                          : name === 'movingAvg7D'
                          ? '7-Day Moving Avg'
                          : 'Goal Target',
                      ]}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(value) => (
                        <span className="text-xs text-slate-300 capitalize">
                          {value === 'weightKg'
                            ? 'Daily Body Weight (kg)'
                            : value === 'movingAvg7D'
                            ? '7-Day Moving Avg (kg)'
                            : 'Goal Target (kg)'}
                        </span>
                      )}
                    />
                    {targets.goalWeightKg && (
                      <ReferenceLine
                        y={targets.goalWeightKg}
                        stroke="#F59E0B"
                        strokeDasharray="4 4"
                        label={{
                          value: `Goal: ${targets.goalWeightKg} kg`,
                          fill: '#F59E0B',
                          fontSize: 10,
                          position: 'insideTopRight',
                        }}
                      />
                    )}
                    <Line
                      type="monotone"
                      dataKey="weightKg"
                      stroke="#F97316"
                      strokeWidth={2.5}
                      dot={{ r: 3, fill: '#F97316' }}
                      connectNulls
                      name="weightKg"
                    />
                    <Line
                      type="monotone"
                      dataKey="movingAvg7D"
                      stroke="#38BDF8"
                      strokeWidth={2}
                      strokeDasharray="3 3"
                      dot={false}
                      connectNulls
                      name="movingAvg7D"
                    />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Section B: Daily Steps & Activity Calories (Separate Unlabelled Axes) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Daily Steps Chart */}
            <div className="p-5 md:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Footprints className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-display text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                      DAILY STEP COUNT
                    </span>
                    <h4 className="font-display font-extrabold text-slate-100 text-base uppercase">
                      STEPS VS TARGET ({targets.steps.toLocaleString()})
                    </h4>
                  </div>
                </div>
              </div>

              {filteredActivity.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-400">
                  No activity entries recorded for this period.
                </div>
              ) : (
                <div className="h-56 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={filteredActivity}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        stroke="#64748B"
                        fontSize={10}
                        tickLine={false}
                        tickFormatter={(v) => v.split('-').slice(1).join('/')}
                      />
                      <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#334155',
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                          color: '#F8FAFC',
                        }}
                        formatter={(val: any) => [`${Number(val).toLocaleString()} steps`, 'Steps']}
                      />
                      <ReferenceLine
                        y={targets.steps}
                        stroke="#10B981"
                        strokeDasharray="4 4"
                        label={{
                          value: `Target: ${targets.steps.toLocaleString()}`,
                          fill: '#10B981',
                          fontSize: 10,
                          position: 'insideTopLeft',
                        }}
                      />
                      <Bar dataKey="totalSteps" fill="#10B981" radius={[4, 4, 0, 0]} name="Steps" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Manually Entered Activity Calories */}
            <div className="p-5 md:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                    <Flame className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-display text-[10px] text-orange-400 font-bold uppercase tracking-wider">
                      MANUAL ACTIVE BURN
                    </span>
                    <h4 className="font-display font-extrabold text-slate-100 text-base uppercase">
                      ACTIVITY CALORIES BURNED (KCAL)
                    </h4>
                  </div>
                </div>
              </div>

              {filteredActivity.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-400">
                  No activity entries recorded for this period.
                </div>
              ) : (
                <div className="h-56 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <AreaChart
                      data={filteredActivity}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <defs>
                        <linearGradient id="actGrad" x1="0" y1="0" x2="0" y2="1">
                          <stop offset="5%" stopColor="#EA580C" stopOpacity={0.4} />
                          <stop offset="95%" stopColor="#EA580C" stopOpacity={0.0} />
                        </linearGradient>
                      </defs>
                      <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="date"
                        stroke="#64748B"
                        fontSize={10}
                        tickLine={false}
                        tickFormatter={(v) => v.split('-').slice(1).join('/')}
                      />
                      <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#334155',
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                          color: '#F8FAFC',
                        }}
                        formatter={(val: any) => [`${val} kcal`, 'Active Burn']}
                      />
                      <Area
                        type="monotone"
                        dataKey="activeCaloriesBurned"
                        stroke="#F97316"
                        strokeWidth={2}
                        fill="url(#actGrad)"
                        name="Active Calories"
                      />
                    </AreaChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 2: NUTRITION MACROS & FIBRE (FROM SAVED CHATGPT SUMMARIES) */}
      {/* ============================================================== */}
      {activeTab === 'nutrition_analytics' && (
        <div className="space-y-6">
          {/* Calories Chart */}
          <div className="p-5 md:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <Flame className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-display text-[10px] text-orange-400 font-bold tracking-widest uppercase">
                    DAILY ENERGY INTAKE
                  </span>
                  <h3 className="font-display font-extrabold text-slate-100 text-lg md:text-xl tracking-wider uppercase">
                    CALORIES VS TARGET ({targets.calories.toLocaleString()} KCAL)
                  </h3>
                </div>
              </div>
            </div>

            {filteredNutrition.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
                <p className="text-sm text-slate-400 font-medium">
                  No daily nutrition summaries found for this period ({periodLabel}).
                </p>
                <p className="text-xs text-slate-500">
                  Paste your ChatGPT whole-day summary in Nutrition Tracker to generate analytics.
                </p>
              </div>
            ) : (
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={filteredNutrition}
                    margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="entry_date"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => v.split('-').slice(1).join('/')}
                    />
                    <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: '#F8FAFC',
                      }}
                      formatter={(val: any) => [`${val} kcal`, 'Intake']}
                    />
                    <ReferenceLine
                      y={targets.calories}
                      stroke="#F97316"
                      strokeDasharray="4 4"
                      label={{
                        value: `Target: ${targets.calories} kcal`,
                        fill: '#F97316',
                        fontSize: 10,
                        position: 'insideTopLeft',
                      }}
                    />
                    <Bar
                      dataKey="calories_kcal"
                      fill="#EA580C"
                      radius={[4, 4, 0, 0]}
                      name="Calories"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>

          {/* Protein & Carbohydrates Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Protein Chart */}
            <div className="p-5 md:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    <Dumbbell className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-display text-[10px] text-emerald-400 font-bold uppercase tracking-wider">
                      PROTEIN INTAKE
                    </span>
                    <h4 className="font-display font-extrabold text-slate-100 text-base uppercase">
                      PROTEIN ({targets.proteinMin}–{targets.proteinMax}G TARGET)
                    </h4>
                  </div>
                </div>
              </div>

              {filteredNutrition.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-400">
                  No nutrition entries recorded.
                </div>
              ) : (
                <div className="h-56 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={filteredNutrition}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="entry_date"
                        stroke="#64748B"
                        fontSize={10}
                        tickLine={false}
                        tickFormatter={(v) => v.split('-').slice(1).join('/')}
                      />
                      <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#334155',
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                          color: '#F8FAFC',
                        }}
                        formatter={(val: any) => [`${val} g`, 'Protein']}
                      />
                      <ReferenceLine
                        y={targets.proteinMin}
                        stroke="#10B981"
                        strokeDasharray="3 3"
                        label={{
                          value: `Min: ${targets.proteinMin}g`,
                          fill: '#10B981',
                          fontSize: 9,
                          position: 'insideBottomLeft',
                        }}
                      />
                      <ReferenceLine
                        y={targets.proteinMax}
                        stroke="#10B981"
                        strokeDasharray="3 3"
                        label={{
                          value: `Max: ${targets.proteinMax}g`,
                          fill: '#10B981',
                          fontSize: 9,
                          position: 'insideTopLeft',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="protein_g"
                        stroke="#10B981"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: '#10B981' }}
                        connectNulls
                        name="Protein"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Carbohydrates Chart */}
            <div className="p-5 md:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
                    <Zap className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-display text-[10px] text-cyan-400 font-bold uppercase tracking-wider">
                      CARBOHYDRATES
                    </span>
                    <h4 className="font-display font-extrabold text-slate-100 text-base uppercase">
                      CARBS ({targets.carbs}G TARGET)
                    </h4>
                  </div>
                </div>
              </div>

              {filteredNutrition.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-400">
                  No nutrition entries recorded.
                </div>
              ) : (
                <div className="h-56 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={filteredNutrition}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="entry_date"
                        stroke="#64748B"
                        fontSize={10}
                        tickLine={false}
                        tickFormatter={(v) => v.split('-').slice(1).join('/')}
                      />
                      <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#334155',
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                          color: '#F8FAFC',
                        }}
                        formatter={(val: any) => [`${val} g`, 'Carbs']}
                      />
                      <ReferenceLine
                        y={targets.carbs}
                        stroke="#06B6D4"
                        strokeDasharray="4 4"
                        label={{
                          value: `Target: ${targets.carbs}g`,
                          fill: '#06B6D4',
                          fontSize: 10,
                          position: 'insideTopLeft',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="carbohydrates_g"
                        stroke="#06B6D4"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: '#06B6D4' }}
                        connectNulls
                        name="Carbs"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>

          {/* Fats & Dietary Fibre Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Total Fat Chart */}
            <div className="p-5 md:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
                    <Target className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-display text-[10px] text-purple-400 font-bold uppercase tracking-wider">
                      TOTAL FATS
                    </span>
                    <h4 className="font-display font-extrabold text-slate-100 text-base uppercase">
                      FAT ({targets.fat}G TARGET)
                    </h4>
                  </div>
                </div>
              </div>

              {filteredNutrition.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-400">
                  No nutrition entries recorded.
                </div>
              ) : (
                <div className="h-56 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={filteredNutrition}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="entry_date"
                        stroke="#64748B"
                        fontSize={10}
                        tickLine={false}
                        tickFormatter={(v) => v.split('-').slice(1).join('/')}
                      />
                      <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#334155',
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                          color: '#F8FAFC',
                        }}
                        formatter={(val: any) => [`${val} g`, 'Total Fat']}
                      />
                      <ReferenceLine
                        y={targets.fat}
                        stroke="#A855F7"
                        strokeDasharray="4 4"
                        label={{
                          value: `Target: ${targets.fat}g`,
                          fill: '#A855F7',
                          fontSize: 10,
                          position: 'insideTopLeft',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="total_fat_g"
                        stroke="#A855F7"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: '#A855F7' }}
                        connectNulls
                        name="Fat"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>

            {/* Dietary Fibre Chart */}
            <div className="p-5 md:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div className="flex items-center gap-2.5">
                  <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
                    <Utensils className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-display text-[10px] text-amber-400 font-bold uppercase tracking-wider">
                      DIETARY FIBRE
                    </span>
                    <h4 className="font-display font-extrabold text-slate-100 text-base uppercase">
                      FIBRE ({targets.fibreMin}–{targets.fibreMax}G TARGET)
                    </h4>
                  </div>
                </div>
              </div>

              {filteredNutrition.length === 0 ? (
                <div className="py-10 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-400">
                  No nutrition entries recorded.
                </div>
              ) : (
                <div className="h-56 w-full pt-2">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart
                      data={filteredNutrition}
                      margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                    >
                      <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                      <XAxis
                        dataKey="entry_date"
                        stroke="#64748B"
                        fontSize={10}
                        tickLine={false}
                        tickFormatter={(v) => v.split('-').slice(1).join('/')}
                      />
                      <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                      <Tooltip
                        contentStyle={{
                          backgroundColor: '#0F172A',
                          borderColor: '#334155',
                          borderRadius: '0.75rem',
                          fontSize: '12px',
                          color: '#F8FAFC',
                        }}
                        formatter={(val: any) => [`${val} g`, 'Fibre']}
                      />
                      <ReferenceLine
                        y={targets.fibreMin}
                        stroke="#F59E0B"
                        strokeDasharray="3 3"
                        label={{
                          value: `Min: ${targets.fibreMin}g`,
                          fill: '#F59E0B',
                          fontSize: 9,
                          position: 'insideBottomLeft',
                        }}
                      />
                      <ReferenceLine
                        y={targets.fibreMax}
                        stroke="#F59E0B"
                        strokeDasharray="3 3"
                        label={{
                          value: `Max: ${targets.fibreMax}g`,
                          fill: '#F59E0B',
                          fontSize: 9,
                          position: 'insideTopLeft',
                        }}
                      />
                      <Line
                        type="monotone"
                        dataKey="fibre_g"
                        stroke="#F59E0B"
                        strokeWidth={2.5}
                        dot={{ r: 3, fill: '#F59E0B' }}
                        connectNulls
                        name="Fibre"
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 3: WORKOUT ADHERENCE & FREQUENCY */}
      {/* ============================================================== */}
      {activeTab === 'workout_adherence' && (
        <div className="space-y-6">
          {/* Adherence Overview Metric Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-display text-slate-400 font-bold uppercase tracking-wider block">
                PLANNED SESSIONS
              </span>
              <div className="font-display font-extrabold text-2xl text-slate-100 mt-1">
                {adherenceStats?.totalPlannedWorkouts || 0}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-display text-emerald-400 font-bold uppercase tracking-wider block">
                COMPLETED SESSIONS
              </span>
              <div className="font-display font-extrabold text-2xl text-emerald-400 mt-1">
                {adherenceStats?.totalCompletedWorkouts || 0}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-display text-amber-400 font-bold uppercase tracking-wider block">
                MISSED WORKOUTS
              </span>
              <div className="font-display font-extrabold text-2xl text-amber-400 mt-1">
                {adherenceStats?.totalMissedWorkouts || 0}
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800">
              <span className="text-[10px] font-display text-cyan-400 font-bold uppercase tracking-wider block">
                PLAN ADHERENCE RATE
              </span>
              <div className="font-display font-extrabold text-2xl text-cyan-400 mt-1">
                {adherenceStats?.adherencePercentage || 0}%
              </div>
            </div>
          </div>

          {/* Planned vs Completed Workouts by Week */}
          <div className="p-5 md:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <CalendarCheck className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-display text-[10px] text-orange-400 font-bold tracking-widest uppercase">
                    TRAINING ADHERENCE
                  </span>
                  <h3 className="font-display font-extrabold text-slate-100 text-lg md:text-xl tracking-wider uppercase">
                    PLANNED VS COMPLETED WORKOUTS BY WEEK
                  </h3>
                </div>
              </div>

              <div className="text-xs font-mono text-slate-400">
                Weekly Target Frequency:{' '}
                <strong className="text-orange-400">
                  {targets.weeklyTrainingDays} days / week
                </strong>
              </div>
            </div>

            {!adherenceStats || adherenceStats.weeklyAdherence.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-400">
                No weekly plan adherence history recorded yet.
              </div>
            ) : (
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={adherenceStats.weeklyAdherence}
                    margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="weekStart"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => `Wk ${v.split('-').slice(1).join('/')}`}
                    />
                    <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: '#F8FAFC',
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(value) => (
                        <span className="text-xs text-slate-300 capitalize">{value}</span>
                      )}
                    />
                    <ReferenceLine
                      y={targets.weeklyTrainingDays}
                      stroke="#F97316"
                      strokeDasharray="4 4"
                      label={{
                        value: `Target: ${targets.weeklyTrainingDays}/wk`,
                        fill: '#F97316',
                        fontSize: 10,
                        position: 'insideTopLeft',
                      }}
                    />
                    <Bar
                      dataKey="plannedCount"
                      fill="#64748B"
                      radius={[4, 4, 0, 0]}
                      name="Planned Workouts"
                    />
                    <Bar
                      dataKey="completedCount"
                      fill="#10B981"
                      radius={[4, 4, 0, 0]}
                      name="Completed Workouts"
                    />
                    <Bar
                      dataKey="missedCount"
                      fill="#F43F5E"
                      radius={[4, 4, 0, 0]}
                      name="Missed Workouts"
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 4: MUSCLE GROUP VOLUME (6 MAJOR GROUPS) */}
      {/* ============================================================== */}
      {activeTab === 'muscle_groups' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {muscleStats.map((ms) => {
              const isSelected = selectedMuscle === ms.name;
              return (
                <div
                  key={ms.name}
                  onClick={() => setSelectedMuscle(isSelected ? null : ms.name)}
                  className={`p-5 rounded-2xl bg-slate-900 border transition-all cursor-pointer space-y-4 ${
                    isSelected
                      ? 'border-orange-500 shadow-xl shadow-orange-500/10'
                      : 'border-slate-800 hover:border-slate-700'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-display font-extrabold text-slate-100 text-lg uppercase tracking-wide">
                        {ms.name}
                      </h4>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {ms.sessionsCount} sessions in period
                      </span>
                    </div>
                    {statusBadge(ms.status)}
                  </div>

                  <div className="grid grid-cols-3 gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800/80 text-center">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-mono block">
                        Volume
                      </span>
                      <strong className="text-orange-400 font-mono text-xs">
                        {Math.round(ms.totalVolumeKg).toLocaleString()} kg
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-mono block">
                        Sets
                      </span>
                      <strong className="text-slate-200 font-mono text-xs">
                        {ms.totalSets}
                      </strong>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-mono block">
                        Reps
                      </span>
                      <strong className="text-slate-200 font-mono text-xs">
                        {ms.totalReps}
                      </strong>
                    </div>
                  </div>

                  <div className="flex justify-between items-center text-xs text-slate-400 font-mono pt-1">
                    <span>Prior period volume:</span>
                    <span>{Math.round(ms.previousVolumeKg).toLocaleString()} kg</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Muscle Group Volume Comparison Bar Chart */}
          <div className="p-5 md:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <h4 className="font-display font-extrabold text-slate-100 text-base uppercase tracking-wider">
              MUSCLE GROUP VOLUME COMPARISON (CURRENT VS PRIOR PERIOD)
            </h4>
            <div className="h-64 w-full pt-2">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={muscleStats}
                  margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                >
                  <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                  <XAxis dataKey="name" stroke="#64748B" fontSize={11} tickLine={false} />
                  <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                  <Tooltip
                    contentStyle={{
                      backgroundColor: '#0F172A',
                      borderColor: '#334155',
                      borderRadius: '0.75rem',
                      fontSize: '12px',
                      color: '#F8FAFC',
                    }}
                    formatter={(val: any) => [`${Math.round(val).toLocaleString()} kg`, 'Volume']}
                  />
                  <Legend
                    verticalAlign="top"
                    height={36}
                    formatter={(value) => (
                      <span className="text-xs text-slate-300 capitalize">{value}</span>
                    )}
                  />
                  <Bar
                    dataKey="totalVolumeKg"
                    fill="#F97316"
                    radius={[4, 4, 0, 0]}
                    name="Current Period Volume (kg)"
                  />
                  <Bar
                    dataKey="previousVolumeKg"
                    fill="#475569"
                    radius={[4, 4, 0, 0]}
                    name="Prior Period Volume (kg)"
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </div>
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 5: INDIVIDUAL EXERCISE PROGRESSION */}
      {/* ============================================================== */}
      {activeTab === 'exercise_progression' && (
        <div className="space-y-6">
          {/* Exercise Selector */}
          <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 flex flex-col md:flex-row items-center gap-3">
            <div className="w-full md:w-64">
              <select
                value={selectedExerciseName}
                onChange={(e) => setSelectedExerciseName(e.target.value)}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm font-semibold outline-none focus:border-orange-500"
              >
                {EXERCISE_CATALOG.map((ex) => (
                  <option key={ex.id} value={ex.name}>
                    {ex.name} ({ex.primaryMuscle})
                  </option>
                ))}
              </select>
            </div>

            <div className="flex-1 text-xs text-slate-400">
              Showing detailed weight, repetition, and volume trajectory for{' '}
              <strong className="text-orange-400">{selectedExerciseName}</strong>.
            </div>
          </div>

          {exerciseReport.timeSeries.length === 0 ? (
            <div className="py-16 text-center border border-dashed border-slate-800 rounded-2xl space-y-2">
              <Dumbbell className="w-8 h-8 text-slate-600 mx-auto" />
              <h4 className="text-sm font-bold text-slate-300 uppercase">
                No session history for {selectedExerciseName}
              </h4>
              <p className="text-xs text-slate-500">
                Complete a session including this exercise in Gym Mode to record performance data.
              </p>
            </div>
          ) : (
            <>
              {/* Exercise Weight & Volume Progression Charts */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Weight Progression */}
                <div className="p-5 md:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
                  <h4 className="font-display font-extrabold text-slate-100 text-base uppercase">
                    WORKING WEIGHT PROGRESSION (KG)
                  </h4>
                  <div className="h-56 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart
                        data={exerciseReport.timeSeries}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          stroke="#64748B"
                          fontSize={10}
                          tickLine={false}
                          tickFormatter={(v) => v.split('-').slice(1).join('/')}
                        />
                        <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0F172A',
                            borderColor: '#334155',
                            borderRadius: '0.75rem',
                            fontSize: '12px',
                            color: '#F8FAFC',
                          }}
                          formatter={(val: any) => [`${val} kg`, 'Working Weight']}
                        />
                        <Line
                          type="monotone"
                          dataKey="weightKg"
                          stroke="#F97316"
                          strokeWidth={2.5}
                          dot={{ r: 4, fill: '#F97316' }}
                          name="Weight"
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Repetition Progression */}
                <div className="p-5 md:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
                  <h4 className="font-display font-extrabold text-slate-100 text-base uppercase">
                    REPETITION TRAJECTORY (TOTAL REPS PER SESSION)
                  </h4>
                  <div className="h-56 w-full pt-2">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={exerciseReport.timeSeries}
                        margin={{ top: 10, right: 10, left: -10, bottom: 0 }}
                      >
                        <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                        <XAxis
                          dataKey="date"
                          stroke="#64748B"
                          fontSize={10}
                          tickLine={false}
                          tickFormatter={(v) => v.split('-').slice(1).join('/')}
                        />
                        <YAxis stroke="#64748B" fontSize={10} tickLine={false} />
                        <Tooltip
                          contentStyle={{
                            backgroundColor: '#0F172A',
                            borderColor: '#334155',
                            borderRadius: '0.75rem',
                            fontSize: '12px',
                            color: '#F8FAFC',
                          }}
                          formatter={(val: any) => [`${val} reps`, 'Total Reps']}
                        />
                        <Bar
                          dataKey="reps"
                          fill="#38BDF8"
                          radius={[4, 4, 0, 0]}
                          name="Total Reps"
                        />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ============================================================== */}
      {/* TAB 6: COMPARISON STUDIO */}
      {/* ============================================================== */}
      {activeTab === 'comparison_studio' && (
        <div className="space-y-6">
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-3">
            <h4 className="font-display font-extrabold text-slate-100 text-base uppercase">
              SELECT EXERCISES TO COMPARE (MAX 4)
            </h4>
            <div className="flex flex-wrap gap-2">
              {EXERCISE_CATALOG.slice(0, 12).map((ex) => {
                const isSelected = comparisonSelectedExercises.includes(ex.name);
                return (
                  <button
                    key={ex.id}
                    onClick={() => handleToggleComparisonExercise(ex.name)}
                    className={`py-1.5 px-3 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-orange-500 text-slate-950 font-bold'
                        : 'bg-slate-950 text-slate-400 hover:text-slate-200 border border-slate-800'
                    }`}
                  >
                    {ex.name}
                  </button>
                );
              })}
            </div>
          </div>

          <div className="p-5 md:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h4 className="font-display font-extrabold text-slate-100 text-base uppercase">
                EXERCISE COMPARISON STUDIO ({comparisonMetric.toUpperCase()})
              </h4>
              <div className="flex items-center gap-1.5">
                {(['weight', 'reps', 'volume'] as ('weight' | 'reps' | 'volume')[]).map((m) => (
                  <button
                    key={m}
                    onClick={() => setComparisonMetric(m)}
                    className={`py-1 px-3 rounded-lg text-xs font-bold uppercase transition-all cursor-pointer ${
                      comparisonMetric === m
                        ? 'bg-orange-500 text-slate-950'
                        : 'bg-slate-950 text-slate-400 border border-slate-800'
                    }`}
                  >
                    {m}
                  </button>
                ))}
              </div>
            </div>

            {comparisonStudioData.timeline.length === 0 ? (
              <div className="py-12 text-center border border-dashed border-slate-800 rounded-xl text-xs text-slate-400">
                No recorded sessions for the selected comparison exercises.
              </div>
            ) : (
              <div className="h-64 w-full pt-2">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={comparisonStudioData.timeline}
                    margin={{ top: 10, right: 20, left: -10, bottom: 0 }}
                  >
                    <CartesianGrid stroke="#1E293B" strokeDasharray="3 3" />
                    <XAxis
                      dataKey="date"
                      stroke="#64748B"
                      fontSize={11}
                      tickLine={false}
                      tickFormatter={(v) => v.split('-').slice(1).join('/')}
                    />
                    <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#0F172A',
                        borderColor: '#334155',
                        borderRadius: '0.75rem',
                        fontSize: '12px',
                        color: '#F8FAFC',
                      }}
                    />
                    <Legend
                      verticalAlign="top"
                      height={36}
                      formatter={(val) => <span className="text-xs text-slate-300">{val}</span>}
                    />
                    {comparisonStudioData.exercises.map((exReport, idx) => {
                      const exName = exReport.exerciseName;
                      const colors = ['#F97316', '#38BDF8', '#10B981', '#A855F7'];
                      const color = colors[idx % colors.length];
                      const dataKey =
                        comparisonMetric === 'weight'
                          ? `${exName}_weight`
                          : comparisonMetric === 'reps'
                          ? `${exName}_reps`
                          : `${exName}_volume`;
                      return (
                        <Line
                          key={exName}
                          type="monotone"
                          dataKey={dataKey}
                          stroke={color}
                          strokeWidth={2}
                          dot={{ r: 3, fill: color }}
                          connectNulls
                          name={exName}
                        />
                      );
                    })}
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Log Body Weight Modal */}
      {showWeightModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <Scale className="w-5 h-5" />
                </div>
                <h3 className="font-display font-extrabold text-slate-100 text-base uppercase">
                  RECORD WEIGH-IN
                </h3>
              </div>
              <button
                onClick={() => setShowWeightModal(false)}
                className="text-slate-400 hover:text-slate-200"
              >
                ✕
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Date
                </label>
                <input
                  type="date"
                  value={modalWeightDate}
                  onChange={(e) => setModalWeightDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm font-mono focus:border-orange-500 outline-none"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Body Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="20"
                  max="400"
                  placeholder="e.g. 74.5"
                  value={modalWeightKg}
                  onChange={(e) => setModalWeightKg(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm font-mono focus:border-orange-500 outline-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                onClick={() => setShowWeightModal(false)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-display font-bold text-xs uppercase cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveModalWeight}
                className="py-2.5 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-display font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20 cursor-pointer"
              >
                Save Weigh-In
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
