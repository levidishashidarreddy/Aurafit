'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { MacroCards } from '@/components/dashboard/MacroCards';
import { TodayWorkoutCard } from '@/components/dashboard/TodayWorkoutCard';
import { WeightChartCard } from '@/components/dashboard/WeightChartCard';
import { createClient, getFastAuthUser } from '@/lib/supabase/client';
import { getUserProfile } from '@/lib/services/profileService';
import { fetchDailySummaryByDate } from '@/lib/services/nutritionSummaryService';
import {
  fetchDayActivity,
  fetchAllActivitySummaries,
  calculateActivityStreaks,
  DayResolvedActivity,
} from '@/lib/services/dailyActivityService';
import {
  fetchAllWeightRecords,
  fetchWeightRecordByDate,
  calculateWeightAnalytics,
  WeightAnalyticsResult,
  WeightRecord,
} from '@/lib/services/bodyWeightService';
import {
  fetchUserTargets,
  UserTargets,
  DEFAULT_CENTRALIZED_TARGETS,
  getLocalCachedTargets,
} from '@/lib/services/targetService';
import {
  fetchWeeklyPlan,
  getMissedWorkouts,
  rescheduleWorkoutDay,
  saveWeeklyPlan,
  getMondayOfWeek,
} from '@/lib/services/workoutPlannerService';
import {
  fetchUserWorkoutSessions,
  EnrichedWorkoutSession,
} from '@/lib/services/workoutAnalyticsService';
import { PlannedWorkoutDay } from '@/lib/types/database';
import {
  Utensils,
  Dumbbell,
  Scale,
  Footprints,
  Flame,
  CheckCircle2,
  Plus,
  Loader2,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Calendar,
  X,
  Clock,
  Sparkles,
} from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [userId, setUserId] = useState<string>('guest');

  // Centralized Targets (Single Source of Truth) - instant local read
  const [targets, setTargets] = useState<UserTargets>(() => getLocalCachedTargets());

  // Today's Nutrition Summary
  const [dailyNutrients, setDailyNutrients] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fibre: 0,
    hasRecord: false,
  });

  // Today's Activity Summary & Streaks
  const [todayActivity, setTodayActivity] = useState<DayResolvedActivity>({
    date: new Date().toISOString().split('T')[0],
    mode: 'daily_summary',
    totalSteps: 0,
    activeCaloriesBurned: 0,
    specialEntries: [],
    hasRecord: false,
  });
  const [stepStreak, setStepStreak] = useState({ currentStreak: 0, longestStreak: 0 });

  // Weight Data
  const [todayWeight, setTodayWeight] = useState<number | null>(null);
  const [weightAnalytics, setWeightAnalytics] = useState<WeightAnalyticsResult | null>(null);
  const [weightChartData, setWeightChartData] = useState<{ date: string; weight: number }[]>([]);

  // Workout Planner & Today's Workout
  const [todayWorkoutDay, setTodayWorkoutDay] = useState<PlannedWorkoutDay | null>(null);
  const [missedWorkouts, setMissedWorkouts] = useState<PlannedWorkoutDay[]>([]);
  const [dismissedMissedIds, setDismissedMissedIds] = useState<string[]>([]);
  const [recentSessions, setRecentSessions] = useState<EnrichedWorkoutSession[]>([]);

  // Reschedule Modal State
  const [reschedulingDay, setReschedulingDay] = useState<PlannedWorkoutDay | null>(null);
  const [newRescheduleDate, setNewRescheduleDate] = useState<string>('');
  const [rescheduleConflict, setRescheduleConflict] = useState<string | null>(null);

  const supabase = createClient();

  const getLocalDateString = (d: Date = new Date()) => {
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const loadAllDashboardData = async () => {
    const todayStr = getLocalDateString(new Date());

    try {
      const fastUser = await getFastAuthUser();
      const currentUid = fastUser ? fastUser.id : 'guest';
      setUserId(currentUid);

      const monday = getMondayOfWeek(new Date());

      // Fetch all dashboard metrics concurrently in parallel (0ms blocking)
      const [
        targetsRes,
        nutritionRes,
        dayActRes,
        allActRes,
        allWeightsRes,
        weeklyPlanRes,
        missedRes,
        sessionsRes,
      ] = await Promise.allSettled([
        fetchUserTargets(currentUid),
        fetchDailySummaryByDate(currentUid, todayStr),
        fetchDayActivity(currentUid, todayStr),
        fetchAllActivitySummaries(currentUid),
        fetchAllWeightRecords(currentUid),
        fetchWeeklyPlan(currentUid, monday),
        getMissedWorkouts(currentUid),
        fetchUserWorkoutSessions(currentUid),
      ]);

      // 1. Centralized Targets
      let activeTargets = targets;
      if (targetsRes.status === 'fulfilled') {
        activeTargets = targetsRes.value;
        setTargets(activeTargets);
      }

      // 2. Nutrition Summary
      if (nutritionRes.status === 'fulfilled') {
        const summary = nutritionRes.value;
        if (summary) {
          setDailyNutrients({
            calories: summary.calories_kcal || 0,
            protein: Math.round(summary.protein_g || 0),
            carbs: Math.round(summary.carbohydrates_g || 0),
            fat: Math.round(summary.total_fat_g || 0),
            fibre: Math.round(summary.fibre_g || 0),
            hasRecord: true,
          });
        }
      }

      // 3. Activity & Streaks
      if (dayActRes.status === 'fulfilled') {
        setTodayActivity(dayActRes.value);
      }
      if (allActRes.status === 'fulfilled') {
        const streaks = calculateActivityStreaks(allActRes.value, activeTargets.steps);
        setStepStreak(streaks);
      }

      // 4. Weight Records & Analytics
      if (allWeightsRes.status === 'fulfilled') {
        const allWeights = allWeightsRes.value;
        const matchToday = allWeights.find((w) => w.logged_at === todayStr);
        setTodayWeight(matchToday ? matchToday.weight_kg : null);

        const thirtyDaysAgo = new Date(Date.now() - 30 * 86400000).toISOString().split('T')[0];
        const todayDateStr = new Date().toISOString().split('T')[0];
        const wAnalytics = calculateWeightAnalytics(allWeights, thirtyDaysAgo, todayDateStr, activeTargets.goalWeightKg);
        setWeightAnalytics(wAnalytics);

        if (wAnalytics && wAnalytics.timeline.length > 0) {
          const formatted = wAnalytics.timeline.map((item) => ({
            date: item.displayDate,
            weight: item.weightKg,
          }));
          setWeightChartData(formatted);
        } else {
          setWeightChartData([]);
        }
      }

      // 5. Weekly Plan & Today's Workout
      if (weeklyPlanRes.status === 'fulfilled') {
        const weeklyPlan = weeklyPlanRes.value;
        const todayPlanned = weeklyPlan.days?.find(
          (d) =>
            d.rescheduled_to_date === todayStr ||
            (d.scheduled_date === todayStr && d.status !== 'rescheduled')
        );
        setTodayWorkoutDay(todayPlanned || null);
      }

      // Missed Workouts
      if (missedRes.status === 'fulfilled') {
        setMissedWorkouts(missedRes.value);
      }

      // 6. Recent Workout Sessions
      if (sessionsRes.status === 'fulfilled') {
        setRecentSessions(sessionsRes.value.slice(0, 3));
      }
    } catch (err) {
      console.error('Dashboard data load error:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadAllDashboardData();

    // Listen for cross-module target updates
    const handleTargetsUpdated = (e: any) => {
      if (e.detail) {
        setTargets(e.detail);
      }
    };
    window.addEventListener('gymhub_targets_updated', handleTargetsUpdated);

    // Listen for workout plan or activity updates
    const handlePlansUpdated = () => {
      loadAllDashboardData();
    };
    window.addEventListener('gymhub_plans_updated', handlePlansUpdated);
    window.addEventListener('gymhub_activity_updated', handlePlansUpdated);

    return () => {
      window.removeEventListener('gymhub_targets_updated', handleTargetsUpdated);
      window.removeEventListener('gymhub_plans_updated', handlePlansUpdated);
      window.removeEventListener('gymhub_activity_updated', handlePlansUpdated);
    };
  }, []);

  // Handle Missed Workout Reschedule
  const handleOpenReschedule = (day: PlannedWorkoutDay) => {
    const tmrw = new Date();
    tmrw.setDate(tmrw.getDate() + 1);
    setNewRescheduleDate(tmrw.toISOString().split('T')[0]);
    setRescheduleConflict(null);
    setReschedulingDay(day);
  };

  const handleConfirmReschedule = async () => {
    if (!reschedulingDay || !newRescheduleDate) return;
    const res = await rescheduleWorkoutDay(reschedulingDay.id, newRescheduleDate, userId);
    if (res.conflictDay) {
      setRescheduleConflict(
        `Note: "${res.conflictDay.title}" is already scheduled on ${newRescheduleDate}. Both will be available.`
      );
    }
    // Remove from active missed list
    setMissedWorkouts((prev) => prev.filter((d) => d.id !== reschedulingDay.id));
    setReschedulingDay(null);
    loadAllDashboardData();
  };

  const handleKeepMissed = (dayId: string) => {
    setDismissedMissedIds((prev) => [...prev, dayId]);
  };

  const stepTarget = targets.steps || 10000;
  const stepPercent = Math.min(
    100,
    Math.round((todayActivity.totalSteps / (stepTarget || 1)) * 100)
  );

  const activeMissed = missedWorkouts.filter(
    (d) => !dismissedMissedIds.includes(d.id)
  );

  return (
    <AppShell headerTitle="TODAY'S PERFORMANCE CONSOLE">
      {/* 1. Missed Workout Reminder Banner */}
      {activeMissed.length > 0 && (
        <div className="space-y-2">
          {activeMissed.map((missed) => (
            <div
              key={missed.id}
              className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/30 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-lg"
            >
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-amber-500/20 text-amber-400 border border-amber-500/30">
                  <AlertTriangle className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-display text-[10px] font-bold text-amber-400 uppercase tracking-widest">
                      MISSED WORKOUT REMINDER
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      (Scheduled: {missed.original_date || missed.scheduled_date})
                    </span>
                  </div>
                  <h4 className="font-display font-extrabold text-slate-100 text-sm md:text-base tracking-wide uppercase">
                    You missed: {missed.title}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                <button
                  onClick={() => handleOpenReschedule(missed)}
                  className="py-2 px-3.5 rounded-xl bg-amber-500 hover:bg-amber-600 text-slate-950 font-display font-bold text-xs tracking-wider uppercase transition-all shadow-md active:scale-95 cursor-pointer"
                >
                  Reschedule
                </button>
                <button
                  onClick={() => handleKeepMissed(missed.id)}
                  className="py-2 px-3 rounded-xl bg-slate-900/80 hover:bg-slate-800 text-slate-400 hover:text-slate-200 border border-slate-800 text-xs font-semibold transition-all cursor-pointer"
                >
                  Keep as Missed
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Quick Action Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Link
          href="/workout"
          className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-orange-500/50 flex items-center gap-3 transition-all cursor-pointer group"
        >
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 group-hover:scale-110 transition-transform">
            <Dumbbell className="w-4 h-4" />
          </div>
          <div>
            <div className="font-display font-bold text-slate-100 text-sm tracking-wider uppercase">
              WORKOUT
            </div>
            <div className="font-mono text-[10px] text-slate-400">PLAN & LOG</div>
          </div>
        </Link>

        <Link
          href="/nutrition"
          className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-orange-500/50 flex items-center gap-3 transition-all cursor-pointer group"
        >
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 group-hover:scale-110 transition-transform">
            <Utensils className="w-4 h-4" />
          </div>
          <div>
            <div className="font-display font-bold text-slate-100 text-sm tracking-wider uppercase">
              NUTRITION
            </div>
            <div className="font-mono text-[10px] text-slate-400">DAILY SUMMARY</div>
          </div>
        </Link>

        <Link
          href="/activity"
          className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-orange-500/50 flex items-center gap-3 transition-all cursor-pointer group"
        >
          <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 group-hover:scale-110 transition-transform">
            <Footprints className="w-4 h-4" />
          </div>
          <div>
            <div className="font-display font-bold text-slate-100 text-sm tracking-wider uppercase">
              ACTIVITY
            </div>
            <div className="font-mono text-[10px] text-slate-400">STEPS & BODY WEIGHT</div>
          </div>
        </Link>

        <Link
          href="/progress"
          className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-orange-500/50 flex items-center gap-3 transition-all cursor-pointer group"
        >
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 group-hover:scale-110 transition-transform">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div>
            <div className="font-display font-bold text-slate-100 text-sm tracking-wider uppercase">
              PROGRESS HUB
            </div>
            <div className="font-mono text-[10px] text-slate-400">ANALYTICS & TARGETS</div>
          </div>
        </Link>
      </div>

      {/* Centralized Daily Macro Cards */}
      <MacroCards
        caloriesConsumed={dailyNutrients.calories}
        caloriesTarget={targets.calories || 1900}
        proteinConsumed={dailyNutrients.protein}
        proteinTarget={targets.proteinMax || 85}
        carbsConsumed={dailyNutrients.carbs}
        carbsTarget={targets.carbs || 210}
        fatConsumed={dailyNutrients.fat}
        fatTarget={targets.fat || 60}
      />

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left 2 Cols: Workout & Activity Focus */}
        <div className="lg:col-span-2 space-y-6">
          {/* Today's Planned Workout Card */}
          <TodayWorkoutCard
            routineTitle={todayWorkoutDay?.title}
            exercises={
              todayWorkoutDay?.exercises?.map((ex) => ({
                name: ex.exercise_name,
                sets: ex.planned_sets,
                reps: ex.target_reps,
                weightKg: ex.target_weight_kg,
                completedSets: todayWorkoutDay.status === 'completed' ? ex.planned_sets : 0,
              })) || []
            }
            isRestDay={todayWorkoutDay?.is_rest_day ?? false}
            status={todayWorkoutDay?.status}
            hasPlannedWorkout={!!todayWorkoutDay && !todayWorkoutDay.is_rest_day}
          />

          {/* Today's Manual Activity & Steps Card */}
          <div className="p-5 md:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <Footprints className="w-5 h-5" />
                </div>
                <div>
                  <span className="font-display text-[10px] text-orange-400 font-bold tracking-widest uppercase">
                    DAILY ACTIVITY & STEPS
                  </span>
                  <h4 className="font-display font-extrabold text-slate-100 text-lg md:text-xl tracking-wider uppercase">
                    {todayActivity.hasRecord ? (
                      <>
                        {todayActivity.totalSteps.toLocaleString()} / {stepTarget.toLocaleString()}{' '}
                        STEPS
                      </>
                    ) : (
                      'NOT LOGGED YET'
                    )}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <Link
                  href="/activity"
                  className="py-2 px-3.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-display font-bold text-xs tracking-wider uppercase flex items-center gap-1.5 transition-all shadow-md shadow-orange-500/20 cursor-pointer"
                >
                  <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                  <span>RECORD ACTIVITY</span>
                </Link>
              </div>
            </div>

            {/* Step Progress Bar */}
            <div className="space-y-1.5">
              <div className="flex justify-between font-mono text-xs text-slate-400">
                <span>Completion: {stepPercent}%</span>
                <span>
                  {todayActivity.totalSteps >= stepTarget
                    ? 'Target achieved!'
                    : `${(stepTarget - todayActivity.totalSteps).toLocaleString()} steps remaining`}
                </span>
              </div>
              <div className="w-full bg-slate-950 rounded-full h-2.5 overflow-hidden border border-slate-800 p-0.5">
                <div
                  className="bg-gradient-to-r from-orange-500 to-amber-400 h-full rounded-full transition-all duration-500"
                  style={{ width: `${stepPercent}%` }}
                />
              </div>
            </div>

            {/* Metrics Triad */}
            <div className="grid grid-cols-3 gap-3">
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <span className="text-[10px] font-display text-slate-400 font-bold uppercase tracking-wider block">
                  RECORDED STEPS
                </span>
                <div className="font-display font-extrabold text-lg text-slate-100 mt-0.5">
                  {todayActivity.hasRecord ? todayActivity.totalSteps.toLocaleString() : '0'}
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-1 text-[10px] font-display text-orange-400 font-bold uppercase tracking-wider">
                  <Flame className="w-3 h-3" />
                  <span>ACTIVE CALORIES</span>
                </div>
                <div className="font-display font-extrabold text-lg text-orange-400 mt-0.5">
                  {todayActivity.hasRecord ? todayActivity.activeCaloriesBurned : 0}{' '}
                  <span className="text-xs font-sans text-slate-400 font-normal">KCAL</span>
                </div>
              </div>

              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
                <div className="flex items-center gap-1 text-[10px] font-display text-emerald-400 font-bold uppercase tracking-wider">
                  <Flame className="w-3 h-3 fill-emerald-400/20" />
                  <span>STEP STREAK</span>
                </div>
                <div className="font-display font-extrabold text-lg text-emerald-400 mt-0.5">
                  {stepStreak.currentStreak}{' '}
                  <span className="text-xs font-sans text-slate-400 font-normal">DAYS</span>
                </div>
              </div>
            </div>
          </div>

          {/* Recent Workout Sessions Card */}
          <div className="p-5 md:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <Dumbbell className="w-4 h-4" />
                </div>
                <div>
                  <span className="font-display text-[10px] text-orange-400 font-bold tracking-widest uppercase">
                    TRAINING HISTORY
                  </span>
                  <h4 className="font-display font-extrabold text-slate-100 text-base tracking-wider uppercase">
                    RECENT WORKOUT SESSIONS
                  </h4>
                </div>
              </div>

              <Link
                href="/progress"
                className="text-xs font-bold font-display text-orange-400 hover:text-orange-300 flex items-center gap-1 uppercase"
              >
                <span>VIEW ALL</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentSessions.length === 0 ? (
              <div className="py-6 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
                <p className="text-xs text-slate-400">No workout sessions recorded yet.</p>
                <Link
                  href="/workout"
                  className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-orange-400 font-bold text-xs inline-flex items-center gap-1 border border-slate-700"
                >
                  <Plus className="w-3 h-3" />
                  <span>Start a Workout</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-2.5">
                {recentSessions.map((s) => {
                  const completedSets = s.sets ? s.sets.filter((st) => st.completed).length : 0;
                  const totalVolume = s.sets
                    ? s.sets.reduce(
                        (acc, st) => acc + (st.completed ? Number(st.weight_kg) * Number(st.reps) : 0),
                        0
                      )
                    : 0;
                  const sDate = s.logged_at || s.start_time;

                  return (
                    <div
                      key={s.id}
                      className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-display font-bold text-slate-100 text-sm tracking-wider uppercase">
                          {s.title || 'Workout Session'}
                        </div>
                        <div className="flex items-center gap-2 mt-0.5 text-xs text-slate-400 font-mono">
                          <span>
                            {new Date(sDate).toLocaleDateString([], {
                              month: 'short',
                              day: 'numeric',
                            })}
                          </span>
                          {s.duration_seconds && (
                            <>
                              <span>•</span>
                              <span>{Math.round(s.duration_seconds / 60)} min</span>
                            </>
                          )}
                          <span>•</span>
                          <span>{completedSets} sets</span>
                        </div>
                      </div>

                      <div className="text-right font-mono">
                        <div className="text-xs font-bold text-orange-400">
                          {Math.round(totalVolume).toLocaleString()} KG
                        </div>
                        <div className="text-[10px] text-slate-500 uppercase">Volume</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right 1 Col: Body Weight Trend & Daily Fuel Summary */}
        <div className="space-y-6">
          {/* Real Body Weight Trend Card (No demo fake numbers) */}
          <WeightChartCard
            currentWeightKg={todayWeight || weightAnalytics?.currentWeight || null}
            startWeightKg={weightAnalytics?.startWeight || null}
            goalWeightKg={targets.goalWeightKg || null}
            data={weightChartData}
          />

          {/* Today's Daily Fuel Summary Card */}
          <div className="p-5 rounded-2xl bg-slate-900 border border-slate-800 space-y-4 shadow-xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <Utensils className="w-4 h-4" />
                </div>
                <span className="font-display font-extrabold text-slate-100 text-sm tracking-wider uppercase">
                  TODAY'S FUEL SUMMARY
                </span>
              </div>
              <Link
                href="/nutrition"
                className="text-xs font-bold font-display text-orange-400 hover:text-orange-300 flex items-center gap-1 uppercase"
              >
                <span>OPEN TRACKER</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>

            {!dailyNutrients.hasRecord ? (
              <div className="py-6 text-center space-y-2 border border-dashed border-slate-800 rounded-xl">
                <p className="text-xs text-slate-400 italic">No nutrition summary logged today.</p>
                <p className="text-[11px] text-slate-500">
                  Paste your ChatGPT whole-day nutrient summary in Nutrition Tracker.
                </p>
                <Link
                  href="/nutrition"
                  className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-orange-400 font-bold text-xs inline-flex items-center gap-1 border border-slate-700 cursor-pointer"
                >
                  <Plus className="w-3 h-3 stroke-[2.5]" />
                  <span>Paste Day's Fuel</span>
                </Link>
              </div>
            ) : (
              <div className="space-y-3">
                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800/80 flex items-center justify-between">
                  <span className="text-xs text-slate-400 font-display uppercase tracking-wider">
                    Total Intake
                  </span>
                  <div className="text-right font-mono">
                    <span className="text-orange-400 font-bold text-base">
                      {dailyNutrients.calories}{' '}
                      <span className="text-xs text-slate-400 font-normal">
                        / {targets.calories} kcal
                      </span>
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs font-mono">
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/60 flex justify-between">
                    <span className="text-slate-400">Protein:</span>
                    <span className="text-emerald-400 font-bold">
                      {dailyNutrients.protein}g / {targets.proteinMax}g
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/60 flex justify-between">
                    <span className="text-slate-400">Carbs:</span>
                    <span className="text-cyan-400 font-bold">
                      {dailyNutrients.carbs}g / {targets.carbs}g
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/60 flex justify-between">
                    <span className="text-slate-400">Total Fat:</span>
                    <span className="text-purple-400 font-bold">
                      {dailyNutrients.fat}g / {targets.fat}g
                    </span>
                  </div>
                  <div className="p-2.5 rounded-lg bg-slate-950 border border-slate-800/60 flex justify-between">
                    <span className="text-slate-400">Fibre:</span>
                    <span className="text-amber-400 font-bold">
                      {dailyNutrients.fibre}g / {targets.fibreMax}g
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Reschedule Modal */}
      {reschedulingDay && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 animate-in fade-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                  <Calendar className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-display font-extrabold text-slate-100 text-base uppercase">
                    RESCHEDULE WORKOUT
                  </h3>
                  <span className="text-xs text-slate-400 font-mono">
                    {reschedulingDay.title}
                  </span>
                </div>
              </div>
              <button
                onClick={() => setReschedulingDay(null)}
                className="text-slate-400 hover:text-slate-200 p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-300 uppercase tracking-wider mb-1.5">
                  Select New Workout Date
                </label>
                <input
                  type="date"
                  value={newRescheduleDate}
                  min={new Date().toISOString().split('T')[0]}
                  onChange={(e) => setNewRescheduleDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm font-mono focus:border-orange-500 outline-none"
                />
                <p className="text-[11px] text-slate-500 mt-1">
                  The original scheduled date ({reschedulingDay.original_date}) will remain preserved for adherence analytics.
                </p>
              </div>

              {rescheduleConflict && (
                <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs">
                  {rescheduleConflict}
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-800">
              <button
                onClick={() => setReschedulingDay(null)}
                className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-display font-bold text-xs uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmReschedule}
                className="py-2.5 px-5 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-display font-bold text-xs uppercase tracking-wider shadow-lg shadow-orange-500/20"
              >
                Confirm Reschedule
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
