'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { MacroCards } from '@/components/dashboard/MacroCards';
import { TodayWorkoutCard } from '@/components/dashboard/TodayWorkoutCard';
import { WeightChartCard } from '@/components/dashboard/WeightChartCard';
import { DragonStreakEmblem } from '@/components/dashboard/DragonStreakEmblem';
import { MotivationalWelcomeModal } from '@/components/dashboard/MotivationalWelcomeModal';
import { SignatureWelcomeExperience } from '@/components/brand/SignatureWelcomeExperience';
import { createClient, getFastAuthUser } from '@/lib/supabase/client';
import { getUserProfile } from '@/lib/services/profileService';
import { Profile } from '@/lib/types/database';
import { fetchDailySummaryByDate } from '@/lib/services/nutritionSummaryService';
import {
  fetchDayActivity,
  fetchAllActivitySummaries,
  DayResolvedActivity,
} from '@/lib/services/dailyActivityService';
import {
  fetchAllWeightRecords,
  calculateWeightAnalytics,
  WeightAnalyticsResult,
} from '@/lib/services/bodyWeightService';
import {
  fetchUserTargets,
  UserTargets,
  getLocalCachedTargets,
} from '@/lib/services/targetService';
import {
  fetchWeeklyPlan,
  getMissedWorkouts,
  rescheduleWorkoutDay,
  getMondayOfWeek,
} from '@/lib/services/workoutPlannerService';
import {
  fetchUserWorkoutSessions,
  EnrichedWorkoutSession,
} from '@/lib/services/workoutAnalyticsService';
import {
  evaluateAndSyncStreak,
  getLocalStreakState,
  StreakState,
} from '@/lib/services/streakService';
import { PlannedWorkoutDay } from '@/lib/types/database';
import {
  DashboardCustomizeModal,
  DashboardCardConfig,
  DEFAULT_CARD_CONFIG,
} from '@/components/dashboard/DashboardCustomizeModal';
import { MilestoneCelebrationModal } from '@/components/dashboard/MilestoneCelebrationModal';
import {
  checkNewMilestones,
  markMilestoneCelebrated,
  Milestone,
} from '@/lib/services/milestoneService';
import {
  Utensils,
  Dumbbell,
  Footprints,
  Plus,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Calendar,
  X,
  Clock,
  Sparkles,
  Zap,
  CheckCircle2,
  SlidersHorizontal,
  Flame,
  Target,
  Heart,
} from 'lucide-react';
import Link from 'next/link';

export default function DashboardPage() {
  const [userId, setUserId] = useState<string>('guest');
  const [profile, setProfile] = useState<Profile | null>(null);

  // Centralized Targets (Single Source of Truth) - instant local read
  const [targets, setTargets] = useState<UserTargets>(() => getLocalCachedTargets());

  // Streak Engine State
  const [streakState, setStreakState] = useState<StreakState>(() => getLocalStreakState());
  const [showStreakRulesModal, setShowStreakRulesModal] = useState<boolean>(false);

  // Today's Nutrition Summary
  const [dailyNutrients, setDailyNutrients] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
    fibre: 0,
    hasRecord: false,
  });

  // Today's Activity Summary
  const [todayActivity, setTodayActivity] = useState<DayResolvedActivity>({
    date: new Date().toISOString().split('T')[0],
    mode: 'daily_summary',
    totalSteps: 0,
    activeCaloriesBurned: 0,
    specialEntries: [],
    hasRecord: false,
  });

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

  // Loading, Customization & Gamification States
  const [isInitialLoading, setIsInitialLoading] = useState<boolean>(true);
  const [cardConfig, setCardConfig] = useState<DashboardCardConfig>(() => {
    if (typeof window === 'undefined') return DEFAULT_CARD_CONFIG;
    try {
      const raw = localStorage.getItem('gymhub_dashboard_cards_v2');
      return raw ? { ...DEFAULT_CARD_CONFIG, ...JSON.parse(raw) } : DEFAULT_CARD_CONFIG;
    } catch {
      return DEFAULT_CARD_CONFIG;
    }
  });
  const [showCustomizeModal, setShowCustomizeModal] = useState<boolean>(false);
  const [activeMilestone, setActiveMilestone] = useState<Milestone | null>(null);
  const [showFirstWelcome, setShowFirstWelcome] = useState<boolean>(false);

  const handleCardConfigChange = (newConfig: DashboardCardConfig) => {
    setCardConfig(newConfig);
    try {
      localStorage.setItem('gymhub_dashboard_cards_v2', JSON.stringify(newConfig));
    } catch {}
  };

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

      // Fetch all real Supabase dashboard data in parallel
      const [
        profileRes,
        targetsRes,
        nutritionRes,
        dayActRes,
        allActRes,
        allWeightsRes,
        weeklyPlanRes,
        missedRes,
        sessionsRes,
      ] = await Promise.allSettled([
        getUserProfile(currentUid),
        fetchUserTargets(currentUid),
        fetchDailySummaryByDate(currentUid, todayStr),
        fetchDayActivity(currentUid, todayStr),
        fetchAllActivitySummaries(currentUid),
        fetchAllWeightRecords(currentUid),
        fetchWeeklyPlan(currentUid, monday),
        getMissedWorkouts(currentUid),
        fetchUserWorkoutSessions(currentUid),
      ]);

      // 1. Profile
      if (profileRes.status === 'fulfilled' && profileRes.value) {
        setProfile(profileRes.value);
      }

      // 2. Centralized Targets
      let activeTargets = targets;
      if (targetsRes.status === 'fulfilled') {
        activeTargets = targetsRes.value;
        setTargets(activeTargets);
      }

      // 3. Nutrition Summary
      let nutRecord = false;
      let nutCals = 0;
      if (nutritionRes.status === 'fulfilled') {
        const summary = nutritionRes.value;
        if (summary && summary.calories_kcal !== null) {
          nutRecord = true;
          nutCals = summary.calories_kcal;
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

      // 4. Activity
      let todaySteps = 0;
      if (dayActRes.status === 'fulfilled') {
        setTodayActivity(dayActRes.value);
        todaySteps = dayActRes.value.totalSteps;
      }

      // 5. Weight Records & Analytics
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

      // 6. Weekly Plan & Today's Workout
      let isWorkoutDone = false;
      if (weeklyPlanRes.status === 'fulfilled') {
        const weeklyPlan = weeklyPlanRes.value;
        const todayPlanned = weeklyPlan.days?.find(
          (d) =>
            d.rescheduled_to_date === todayStr ||
            (d.scheduled_date === todayStr && d.status !== 'rescheduled')
        );
        setTodayWorkoutDay(todayPlanned || null);
        if (todayPlanned?.status === 'completed') {
          isWorkoutDone = true;
        }
      }

      // Missed Workouts
      if (missedRes.status === 'fulfilled') {
        setMissedWorkouts(missedRes.value);
      }

      // 7. Recent Workout Sessions
      if (sessionsRes.status === 'fulfilled') {
        setRecentSessions(sessionsRes.value.slice(0, 3));
      }

      // 8. Persistent Streak Sync
      let finalStreakState = streakState;
      if (currentUid && currentUid !== 'guest') {
        const updatedStreak = await evaluateAndSyncStreak(currentUid, {
          totalSteps: todaySteps,
          stepTarget: activeTargets.steps || 10000,
          workoutCompleted: isWorkoutDone,
          nutritionLogged: nutRecord && nutCals > 0,
        });
        setStreakState(updatedStreak);
        finalStreakState = updatedStreak;
      }

      // 9. Milestone Evaluation (Verified User Activity Only)
      const allSessionsCount = sessionsRes.status === 'fulfilled' ? sessionsRes.value.length : 0;
      const todayWeightVal = allWeightsRes.status === 'fulfilled' ? allWeightsRes.value.find((w) => w.logged_at === todayStr)?.weight_kg : null;
      const goalHit = !!(activeTargets.goalWeightKg && todayWeightVal && Math.abs(todayWeightVal - activeTargets.goalWeightKg) < 0.5);

      const newM = checkNewMilestones({
        workoutCount: allSessionsCount,
        streakCount: finalStreakState.currentStreak,
        hasPrLogged: allSessionsCount >= 3,
        goalWeightHit: goalHit,
      });
      if (newM) {
        setActiveMilestone(newM);
      }
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setIsInitialLoading(false);
    }
  };

  useEffect(() => {
    loadAllDashboardData();

    // Check if new user just completed onboarding and needs first-time signature welcome
    try {
      if (typeof window !== 'undefined') {
        const isFirstWelcomeActive = sessionStorage.getItem('gymhub_first_welcome_active') === 'true';
        if (isFirstWelcomeActive) {
          setShowFirstWelcome(true);
        }
      }
    } catch {}

    // Cross-module update listeners
    const handleTargetsUpdated = (e: any) => {
      if (e.detail) setTargets(e.detail);
    };
    const handlePlansUpdated = () => {
      loadAllDashboardData();
    };
    const handleStreakUpdated = (e: any) => {
      if (e.detail) setStreakState(e.detail);
    };

    window.addEventListener('gymhub_targets_updated', handleTargetsUpdated);
    window.addEventListener('gymhub_plans_updated', handlePlansUpdated);
    window.addEventListener('gymhub_activity_updated', handlePlansUpdated);
    window.addEventListener('gymhub_streak_updated', handleStreakUpdated);

    return () => {
      window.removeEventListener('gymhub_targets_updated', handleTargetsUpdated);
      window.removeEventListener('gymhub_plans_updated', handlePlansUpdated);
      window.removeEventListener('gymhub_activity_updated', handlePlansUpdated);
      window.removeEventListener('gymhub_streak_updated', handleStreakUpdated);
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

  // Today's composite readiness / fitness score (0 - 100%)
  const stepsScore = Math.min(34, Math.round((stepPercent / 100) * 34));
  const nutScore = dailyNutrients.hasRecord ? 33 : 0;
  const workoutScore = todayWorkoutDay?.status === 'completed' ? 33 : 0;
  const compositeScore = stepsScore + nutScore + workoutScore;

  const athleteName = profile?.full_name || 'ATHLETE';

  return (
    <AppShell headerTitle="COMMAND CENTER" headerSubtitle={`WELCOME, ${athleteName}`}>
      {/* 0. First-Time Signature Welcome Experience (After Onboarding) */}
      {showFirstWelcome && (
        <SignatureWelcomeExperience
          userName={athleteName}
          goalSummary={
            (profile?.fitness_goals && profile.fitness_goals[0]?.replace(/_/g, ' ').toUpperCase()) ||
            profile?.fitness_goal?.replace(/_/g, ' ').toUpperCase() ||
            'MUSCLE GAIN'
          }
          onEnter={() => {
            setShowFirstWelcome(false);
            try {
              sessionStorage.removeItem('gymhub_first_welcome_active');
              sessionStorage.setItem('gymhub_first_welcome_dismissed', 'true');
              sessionStorage.setItem('gymhub_launch_welcome_shown', 'true');
            } catch {}
          }}
        />
      )}

      {/* 1. App Launch Motivation Popup (Shows once per app launch session) */}
      <MotivationalWelcomeModal
        currentStreak={streakState.currentStreak}
        userName={athleteName}
        todaySteps={todayActivity.totalSteps}
        stepTarget={stepTarget}
        todayWorkoutCompleted={todayWorkoutDay?.status === 'completed'}
        todayPlannedWorkoutTitle={todayWorkoutDay?.title}
        caloriesLogged={dailyNutrients.hasRecord ? dailyNutrients.calories : 0}
        calorieTarget={targets.calories || 2200}
      />

      {/* 2. Athlete Welcome Header Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-white/8 pb-4">
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#9B5CFF] to-[#00D5FF] p-0.5 shadow-[0_0_20px_rgba(155,92,255,0.4)] shrink-0">
            <div className="w-full h-full rounded-[14px] bg-[#100D20] flex items-center justify-center font-display font-extrabold text-[#F6F2FF] text-lg">
              {athleteName.charAt(0).toUpperCase()}
            </div>
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-[10px] font-bold text-[#00D5FF] tracking-widest uppercase flex items-center gap-1">
                <Sparkles className="w-3 h-3 text-[#9B5CFF]" />
                FUTURISTIC FITNESS COMMAND
              </span>
            </div>
            <h1 className="font-display font-extrabold text-xl sm:text-2xl text-white tracking-wide uppercase leading-tight">
              WELCOME BACK, {athleteName}
            </h1>
            <div className="flex items-center gap-2 mt-1">
              <span className="font-display text-[9px] font-bold text-[#A9A1BD] tracking-wider uppercase">
                GOAL FOCUS:
              </span>
              <span
                className={`font-display text-[9px] font-extrabold tracking-widest uppercase px-2 py-0.5 rounded-md border ${
                  (profile?.fitness_goals && profile.fitness_goals[0] === 'fat_loss') || profile?.fitness_goal === 'fat_loss'
                    ? 'bg-[#FF42A6]/10 text-[#FF42A6] border-[#FF42A6]/30'
                    : (profile?.fitness_goals && (profile.fitness_goals[0] === 'muscle_gain' || profile.fitness_goals[0] === 'strength')) || profile?.fitness_goal === 'muscle_gain'
                    ? 'bg-[#9B5CFF]/10 text-[#9B5CFF] border-[#9B5CFF]/30'
                    : 'bg-[#38E6A5]/10 text-[#38E6A5] border-[#38E6A5]/30'
                }`}
              >
                {(profile?.fitness_goals && profile.fitness_goals[0]?.replace('_', ' ')) || profile?.fitness_goal?.replace('_', ' ') || 'MUSCLE GAIN'}
              </span>
            </div>
          </div>
        </div>

        {/* Action Controls & Daily Performance Score Badge */}
        <div className="flex items-center gap-2.5">
          <button
            type="button"
            onClick={() => setShowCustomizeModal(true)}
            className="py-2 px-3 rounded-2xl bg-white/5 hover:bg-white/10 text-[11px] font-display font-bold text-slate-300 hover:text-white border border-white/8 flex items-center gap-1.5 transition-colors cursor-pointer min-h-[44px]"
            title="Customize dashboard cards"
          >
            <SlidersHorizontal className="w-3.5 h-3.5 text-[#9B5CFF]" />
            <span>Customize</span>
          </button>

          <div className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-[#100D20]/90 border border-[#9B5CFF]/30 shadow-sm min-h-[44px]">
            <div className="w-8 h-8 rounded-xl bg-[#9B5CFF]/15 text-[#00D5FF] flex items-center justify-center font-display font-black text-sm">
              {compositeScore}%
            </div>
            <div className="text-left">
              <span className="text-[9.5px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block">
                DAILY SCORE
              </span>
              <span className="text-[11px] font-mono text-white font-semibold">
                {compositeScore >= 66 ? 'Optimal' : compositeScore > 0 ? 'Active' : 'Pending'}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Loading Skeleton during initial fetch */}
      {isInitialLoading ? (
        <div className="space-y-5 animate-pulse">
          <div className="h-28 rounded-3xl bg-[#100D20]/70 border border-white/5" />
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {[1, 2, 3, 4].map((i) => (
              <div key={i} className="h-16 rounded-3xl bg-[#100D20]/70 border border-white/5" />
            ))}
          </div>
          <div className="h-44 rounded-3xl bg-[#100D20]/70 border border-white/5" />
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
            <div className="lg:col-span-2 h-72 rounded-3xl bg-[#100D20]/70 border border-white/5" />
            <div className="h-72 rounded-3xl bg-[#100D20]/70 border border-white/5" />
          </div>
        </div>
      ) : (
        <>
          {/* 3. Dragon Streak Engine Banner (Primary Streak Experience) */}
          {cardConfig.streak && (
            <DragonStreakEmblem
              currentStreak={streakState.currentStreak}
              longestStreak={streakState.longestStreak}
              isTodayQualified={streakState.isTodayQualified}
              qualifyingReason={streakState.qualifyingReason}
              onOpenRules={() => setShowStreakRulesModal(true)}
            />
          )}

      {/* 4. Missed Workout Reminder Banner */}
      {activeMissed.length > 0 && (
        <div className="space-y-2.5">
          {activeMissed.map((missed) => (
            <div
              key={missed.id}
              className="p-3.5 sm:p-4 rounded-3xl bg-amber-500/10 border border-amber-500/30 backdrop-blur-xl flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-[0_8px_25px_rgba(0,0,0,0.4)]"
            >
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0">
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
                  <h4 className="font-display font-extrabold text-white text-sm sm:text-base tracking-wide uppercase">
                    You missed: {missed.title}
                  </h4>
                </div>
              </div>

              <div className="flex items-center gap-2 self-stretch sm:self-auto justify-end">
                <button
                  onClick={() => handleOpenReschedule(missed)}
                  className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-slate-950 font-display font-bold text-xs tracking-wider uppercase transition-all shadow-[0_0_12px_rgba(245,158,11,0.3)] active:scale-95 cursor-pointer"
                >
                  Reschedule
                </button>
                <button
                  onClick={() => handleKeepMissed(missed.id)}
                  className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/8 text-xs font-semibold transition-all cursor-pointer"
                >
                  Keep as Missed
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* 5. Quick Action Navigation Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Link
          href="/workout"
          className="p-3.5 rounded-3xl bg-[#100D20]/85 border border-[#9B5CFF]/25 hover:border-[#9B5CFF]/60 backdrop-blur-xl flex items-center gap-3 transition-all cursor-pointer group shadow-[0_6px_20px_rgba(0,0,0,0.35)]"
        >
          <div className="w-9 h-9 rounded-2xl bg-[#9B5CFF]/15 text-[#9B5CFF] border border-[#9B5CFF]/25 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 shadow-[0_0_10px_rgba(155,92,255,0.2)]">
            <Dumbbell className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-[#F6F2FF] text-xs sm:text-sm tracking-wider uppercase truncate group-hover:text-white">
              WORKOUT
            </div>
            <div className="font-mono text-[9.5px] text-[#A9A1BD] truncate">SPLIT & GYM</div>
          </div>
        </Link>

        <Link
          href="/nutrition"
          className="p-3.5 rounded-3xl bg-[#100D20]/85 border border-[#00D5FF]/25 hover:border-[#00D5FF]/60 backdrop-blur-xl flex items-center gap-3 transition-all cursor-pointer group shadow-[0_6px_20px_rgba(0,0,0,0.35)]"
        >
          <div className="w-9 h-9 rounded-2xl bg-[#00D5FF]/15 text-[#00D5FF] border border-[#00D5FF]/25 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 shadow-[0_0_10px_rgba(0,213,255,0.2)]">
            <Utensils className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-[#F6F2FF] text-xs sm:text-sm tracking-wider uppercase truncate group-hover:text-white">
              NUTRITION
            </div>
            <div className="font-mono text-[9.5px] text-[#A9A1BD] truncate">DAILY MACROS</div>
          </div>
        </Link>

        <Link
          href="/activity"
          className="p-3.5 rounded-3xl bg-[#100D20]/85 border border-[#38E6A5]/25 hover:border-[#38E6A5]/60 backdrop-blur-xl flex items-center gap-3 transition-all cursor-pointer group shadow-[0_6px_20px_rgba(0,0,0,0.35)]"
        >
          <div className="w-9 h-9 rounded-2xl bg-[#38E6A5]/15 text-[#38E6A5] border border-[#38E6A5]/25 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 shadow-[0_0_10px_rgba(56,230,165,0.2)]">
            <Footprints className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-[#F6F2FF] text-xs sm:text-sm tracking-wider uppercase truncate group-hover:text-white">
              ACTIVITY
            </div>
            <div className="font-mono text-[9.5px] text-[#A9A1BD] truncate">STEPS & WEIGHT</div>
          </div>
        </Link>

        <Link
          href="/progress"
          className="p-3.5 rounded-3xl bg-[#100D20]/85 border border-[#FF42A6]/25 hover:border-[#FF42A6]/60 backdrop-blur-xl flex items-center gap-3 transition-all cursor-pointer group shadow-[0_6px_20px_rgba(0,0,0,0.35)]"
        >
          <div className="w-9 h-9 rounded-2xl bg-[#FF42A6]/15 text-[#FF42A6] border border-[#FF42A6]/25 flex items-center justify-center group-hover:scale-105 transition-transform shrink-0 shadow-[0_0_10px_rgba(255,66,166,0.2)]">
            <TrendingUp className="w-4 h-4" />
          </div>
          <div className="min-w-0">
            <div className="font-display font-bold text-[#F6F2FF] text-xs sm:text-sm tracking-wider uppercase truncate group-hover:text-white">
              PROGRESS
            </div>
            <div className="font-mono text-[9.5px] text-[#A9A1BD] truncate">ANALYTICS HUB</div>
          </div>
        </Link>
      </div>

      {/* 6. Centralized Daily Macro Budget Cards */}
      {cardConfig.macros && (
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
      )}

      {/* 7. Main Grid Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left 2 Cols: Workout & Activity */}
        <div className="lg:col-span-2 space-y-5">
          {/* Today's Planned Workout Card */}
          {cardConfig.workout && (
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
          )}

          {/* Daily Activity & Steps Card */}
          {cardConfig.activity && (
            <div className="p-4 sm:p-5 rounded-3xl bg-[#100D20]/85 border border-[#38E6A5]/25 backdrop-blur-xl space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/8 pb-3.5">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-2xl bg-[#38E6A5]/15 text-[#38E6A5] border border-[#38E6A5]/25 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(56,230,165,0.2)]">
                    <Footprints className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="font-display text-[10px] text-[#38E6A5] font-bold tracking-widest uppercase">
                      DAILY ACTIVITY & STEPS
                    </span>
                    <h4 className="font-display font-extrabold text-white text-base sm:text-lg tracking-wider uppercase">
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

                <div className="flex items-center gap-2 self-start sm:self-auto">
                  <Link
                    href="/activity"
                    className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF] hover:brightness-110 text-white font-display font-bold text-xs tracking-wider uppercase flex items-center gap-1.5 transition-all shadow-[0_0_15px_rgba(155,92,255,0.3)] active:scale-95 cursor-pointer min-h-[36px]"
                  >
                    <Plus className="w-3.5 h-3.5 stroke-[2.5]" />
                    <span>RECORD ACTIVITY</span>
                  </Link>
                </div>
              </div>

              {/* Step Progress Bar */}
              <div className="space-y-1.5">
                <div className="flex justify-between font-mono text-[11px] text-slate-400">
                  <span>Progress: {stepPercent}%</span>
                  <span>
                    {todayActivity.totalSteps >= stepTarget
                      ? 'Target achieved!'
                      : `${(stepTarget - todayActivity.totalSteps).toLocaleString()} steps remaining`}
                  </span>
                </div>
                <div className="w-full bg-black/40 rounded-full h-2 overflow-hidden border border-white/5">
                  <div
                    className="bg-gradient-to-r from-[#9B5CFF] via-[#00D5FF] to-[#38E6A5] h-2 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(56,230,165,0.5)]"
                    style={{ width: `${stepPercent}%` }}
                  />
                </div>
              </div>

              {/* Triad Metric Pills */}
              <div className="grid grid-cols-3 gap-2.5 pt-1">
                <div className="p-2.5 rounded-2xl bg-black/40 border border-white/6 text-center">
                  <span className="text-[10px] font-display text-slate-400 uppercase tracking-wider block">Total Steps</span>
                  <span className="text-sm sm:text-base font-display font-bold text-white">
                    {todayActivity.totalSteps.toLocaleString()}
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-black/40 border border-white/6 text-center">
                  <span className="text-[10px] font-display text-slate-400 uppercase tracking-wider block">Active Burn</span>
                  <span className="text-sm sm:text-base font-display font-bold text-[#00D5FF]">
                    {todayActivity.activeCaloriesBurned} kcal
                  </span>
                </div>
                <div className="p-2.5 rounded-2xl bg-black/40 border border-white/6 text-center">
                  <span className="text-[10px] font-display text-slate-400 uppercase tracking-wider block">Step Goal</span>
                  <span className="text-sm sm:text-base font-display font-bold text-[#38E6A5]">
                    {stepTarget.toLocaleString()}
                  </span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right 1 Col: Weight & Recent Activity */}
        <div className="space-y-5">
          {/* Weight Card with Real Data */}
          {cardConfig.weight && (
            <WeightChartCard
              currentWeight={todayWeight}
              targetWeight={targets.goalWeightKg || 75}
              data={weightChartData}
              deltaKg={weightAnalytics?.changeKg ?? null}
              daysSpan={30}
            />
          )}

          {/* Recent Workout Activity (Zero Mock Data) */}
          {cardConfig.recent && (
            <div className="p-4 sm:p-5 rounded-3xl bg-[#100D20]/85 border border-[#9B5CFF]/25 backdrop-blur-xl space-y-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              <div className="flex items-center justify-between border-b border-white/8 pb-3">
                <span className="font-display text-[10px] text-[#9B5CFF] font-bold tracking-widest uppercase flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5" />
                  RECENT GYM SESSIONS
                </span>
                <Link
                  href="/workout"
                  className="text-[10.5px] font-display font-bold text-[#00D5FF] hover:underline uppercase"
                >
                  View all
                </Link>
              </div>

              {recentSessions.length > 0 ? (
                <div className="space-y-2">
                  {recentSessions.map((session) => {
                    const vol = session.sets?.reduce((acc, s) => acc + (s.weight_kg || 0) * (s.reps || 0), 0) || 0;
                    return (
                      <div
                        key={session.id}
                        className="p-3 rounded-2xl bg-black/40 border border-white/6 flex items-center justify-between"
                      >
                        <div>
                          <div className="font-display font-bold text-white text-xs uppercase">
                            {session.title || 'Gym Session'}
                          </div>
                          <div className="text-[10px] text-[#A9A1BD] font-mono">
                            {session.start_time ? session.start_time.split('T')[0] : session.logged_at || 'Completed'} • {Math.round((session.duration_seconds || 0) / 60)} min
                          </div>
                        </div>
                        <div className="text-right">
                          <span className="text-xs font-mono font-bold text-[#38E6A5]">
                            {vol > 0 ? `${vol.toLocaleString()} kg` : 'Done'}
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-4 space-y-2">
                  <Dumbbell className="w-6 h-6 text-slate-500 mx-auto" />
                  <p className="text-xs text-[#A9A1BD]">No recent workouts logged yet.</p>
                  <Link
                    href="/workout?action=start"
                    className="inline-flex items-center gap-1.5 py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-display font-bold text-[#00D5FF] uppercase border border-white/10 min-h-[36px]"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Start Gym Session</span>
                  </Link>
                </div>
              )}
            </div>
          )}
        </div>
      </div>
        </>
      )}

      {/* 10. Gamification Milestone Celebration Overlay */}
      <MilestoneCelebrationModal
        milestone={activeMilestone}
        onClose={() => {
          if (activeMilestone) {
            markMilestoneCelebrated(activeMilestone.id);
            setActiveMilestone(null);
          }
        }}
      />

      {/* 11. Dashboard Card Customization Modal */}
      <DashboardCustomizeModal
        isOpen={showCustomizeModal}
        onClose={() => setShowCustomizeModal(false)}
        config={cardConfig}
        onChange={handleCardConfigChange}
      />

      {/* 8. Streak Rules Modal */}
      {showStreakRulesModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in">
          <div className="glass-future rounded-3xl p-6 max-w-md w-full border border-[#9B5CFF]/30 space-y-4">
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#00D5FF]" />
                <h3 className="font-display font-bold text-white text-base uppercase">
                  Dragon Streak Rules
                </h3>
              </div>
              <button
                onClick={() => setShowStreakRulesModal(false)}
                className="w-7 h-7 rounded-full bg-white/5 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3 text-xs text-[#A9A1BD]">
              <p>
                To maintain your Dragon Streak, achieve at least <strong>one</strong> of these qualifying activities each local calendar day:
              </p>
              <ul className="space-y-2 font-mono text-[11px] text-white">
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#38E6A5] shrink-0 mt-0.5" />
                  <span>Hit your daily step target ({stepTarget.toLocaleString()} steps)</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#38E6A5] shrink-0 mt-0.5" />
                  <span>Complete and log a scheduled Gym Workout session</span>
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle2 className="w-4 h-4 text-[#38E6A5] shrink-0 mt-0.5" />
                  <span>Record your daily nutrition summary</span>
                </li>
              </ul>
              <p className="text-[10px] text-slate-500 pt-1 border-t border-white/8">
                Streaks calculate strictly once per local day. Reopening the app on the same day never increments it twice.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* 9. Reschedule Modal */}
      {reschedulingDay && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-future rounded-3xl p-6 max-w-md w-full border border-amber-500/30 space-y-4">
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <h3 className="font-display font-bold text-white text-base uppercase">Reschedule Workout</h3>
              <button
                onClick={() => setReschedulingDay(null)}
                className="w-7 h-7 rounded-full bg-white/5 text-slate-400 hover:text-white flex items-center justify-center"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="space-y-3">
              <p className="text-xs text-[#A9A1BD]">
                Select a new date to move <strong>"{reschedulingDay.title}"</strong>:
              </p>
              <input
                type="date"
                value={newRescheduleDate}
                onChange={(e) => setNewRescheduleDate(e.target.value)}
                className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 text-white text-xs font-mono"
              />
              {rescheduleConflict && (
                <p className="text-xs text-amber-400 font-mono">{rescheduleConflict}</p>
              )}
              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setReschedulingDay(null)}
                  className="py-2 px-3 rounded-xl bg-white/5 text-slate-300 text-xs font-semibold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReschedule}
                  className="py-2 px-4 rounded-xl bg-gradient-to-r from-amber-500 to-amber-600 text-slate-950 text-xs font-display font-bold uppercase"
                >
                  Confirm Move
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
