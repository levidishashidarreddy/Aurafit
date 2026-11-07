'use client';

import { useState, useEffect, useMemo } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { RestTimer } from '@/components/workout/RestTimer';
import { PlateCalculatorModal } from '@/components/workout/PlateCalculatorModal';
import { AIWorkoutModal } from '@/components/workout/AIWorkoutModal';
import {
  Dumbbell,
  Calendar,
  CheckCircle2,
  Clock,
  Plus,
  Play,
  ArrowUp,
  ArrowDown,
  Trash2,
  Copy,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  RotateCcw,
  Sparkles,
  Check,
  X,
  ListOrdered,
  Layers,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';
import {
  WeeklyWorkoutPlan,
  PlannedWorkoutDay,
  PlannedWorkoutExercise,
  WorkoutDayStatus,
  WorkoutAnalysis,
  SetType
} from '@/lib/types/database';
import { createClient, getFastAuthUser } from '@/lib/supabase/client';
import {
  getMondayOfWeek,
  getDayDateString,
  DAY_NAMES,
  fetchWeeklyPlan,
  saveWeeklyPlan,
  duplicatePlanToWeek,
  rescheduleWorkoutDay
} from '@/lib/services/workoutPlannerService';
import {
  createWorkoutSession,
  logWorkoutSet,
  finishWorkoutSession
} from '@/lib/services/workoutService';
import {
  saveSessionToLocalCache,
  saveWorkoutAnalysisToLocal,
  EnrichedWorkoutSession,
  EXERCISE_CATALOG,
  resolveExerciseDefinition,
  calculateExerciseAnalytics
} from '@/lib/services/workoutAnalyticsService';

type WorkoutViewStage = 'planner' | 'gym_mode';

interface GymSetRow {
  id: string;
  setNumber: number;
  type: SetType;
  plannedReps: string;
  weightKg: number;
  reps: number;
  rpe?: number;
  completed: boolean;
}

interface GymExerciseItem {
  id: string;
  exerciseId?: string;
  name: string;
  muscle: string;
  previousPerformance: string;
  sets: GymSetRow[];
  skipped: boolean;
  showAdvancedRpe: boolean;
}

export default function WorkoutPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [stage, setStage] = useState<WorkoutViewStage>('gym_mode');

  // Dates
  const todayStr = useMemo(() => new Date().toISOString().split('T')[0], []);
  const currentWeekMonday = useMemo(() => getMondayOfWeek(new Date()), []);
  const [selectedWeekMonday, setSelectedWeekMonday] = useState<string>(currentWeekMonday);

  // Weekly Plan State (Stage A)
  const [weeklyPlan, setWeeklyPlan] = useState<WeeklyWorkoutPlan | null>(null);
  const [selectedDayIndex, setSelectedDayIndex] = useState<number>(() => {
    const day = new Date().getDay();
    return day === 0 ? 6 : day - 1; // 0=Mon..6=Sun
  });
  const [isSavingPlan, setIsSavingPlan] = useState<boolean>(false);
  const [planSaveSuccess, setPlanSaveSuccess] = useState<boolean>(false);

  // Exercise Library Selector Modal (Stage A)
  const [isExercisePickerOpen, setIsExercisePickerOpen] = useState<boolean>(false);
  const [exerciseSearch, setExerciseSearch] = useState<string>('');

  // Reschedule Modal
  const [rescheduleModalOpen, setRescheduleModalOpen] = useState<boolean>(false);
  const [dayToReschedule, setDayToReschedule] = useState<PlannedWorkoutDay | null>(null);
  const [rescheduleTargetDate, setRescheduleTargetDate] = useState<string>(todayStr);
  const [rescheduleConflictWarning, setRescheduleConflictWarning] = useState<string | null>(null);

  // -------------------------------------------------------------
  // GYM MODE STATE (STAGE B)
  // -------------------------------------------------------------
  const [activeWorkoutTitle, setActiveWorkoutTitle] = useState<string>('Daily Training Routine');
  const [activeScheduledDate, setActiveScheduledDate] = useState<string>(todayStr);
  const [gymExercises, setGymExercises] = useState<GymExerciseItem[]>([]);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [startTime] = useState<number>(Date.now());
  const [isFinishing, setIsFinishing] = useState<boolean>(false);

  // Gym Tools Modals
  const [showPlateCalc, setShowPlateCalc] = useState<boolean>(false);
  const [showRestTimer, setShowRestTimer] = useState<boolean>(false);
  const [showAIModal, setShowAIModal] = useState<boolean>(false);
  const [analysisData, setAnalysisData] = useState<WorkoutAnalysis | null>(null);
  const [isAnalyzing, setIsAnalyzing] = useState<boolean>(false);

  const supabase = createClient();

  // Load User and Weekly Plan
  useEffect(() => {
    async function init() {
      const user = await getFastAuthUser();
      const uid = user ? user.id : 'guest';
      if (user) setUserId(user.id);

      await loadPlan(uid, selectedWeekMonday);
    }
    init();
  }, [selectedWeekMonday]);

  const loadPlan = async (uid: string, mondayStr: string) => {
    const plan = await fetchWeeklyPlan(uid, mondayStr);
    setWeeklyPlan(plan);

    // If gym exercises not yet loaded, prefill from today's plan
    if (gymExercises.length === 0) {
      const todayDay = plan.days?.find((d) => d.scheduled_date === todayStr);
      if (todayDay && !todayDay.is_rest_day && todayDay.exercises && todayDay.exercises.length > 0) {
        loadDayIntoGymMode(todayDay);
      } else {
        // Fallback default routine
        const defaultDay = plan.days?.[0];
        if (defaultDay && defaultDay.exercises) {
          loadDayIntoGymMode(defaultDay);
        }
      }
    }
  };

  // Convert PlannedWorkoutDay into Gym Mode state
  const loadDayIntoGymMode = (day: PlannedWorkoutDay) => {
    setActiveWorkoutTitle(day.title);
    setActiveScheduledDate(day.scheduled_date);

    const items: GymExerciseItem[] = (day.exercises || []).map((ex) => {
      const setsCount = ex.planned_sets || 3;
      const targetWeight = ex.target_weight_kg || 40;
      const targetRepsNum = parseInt(ex.target_reps, 10) || 10;

      const sets: GymSetRow[] = Array.from({ length: setsCount }, (_, i) => ({
        id: `s_${ex.id}_${i}`,
        setNumber: i + 1,
        type: 'working',
        plannedReps: ex.target_reps,
        weightKg: targetWeight,
        reps: targetRepsNum,
        rpe: 8,
        completed: false,
      }));

      return {
        id: ex.id,
        exerciseId: ex.exercise_id,
        name: ex.exercise_name,
        muscle: ex.muscle_group,
        previousPerformance: 'No previous session yet',
        sets,
        skipped: false,
        showAdvancedRpe: false,
      };
    });

    setGymExercises(items);
  };

  // Week Navigation
  const handlePrevWeek = () => {
    const [y, m, d] = selectedWeekMonday.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() - 7);
    setSelectedWeekMonday(getMondayOfWeek(date));
  };

  const handleNextWeek = () => {
    const [y, m, d] = selectedWeekMonday.split('-').map(Number);
    const date = new Date(y, m - 1, d);
    date.setDate(date.getDate() + 7);
    setSelectedWeekMonday(getMondayOfWeek(date));
  };

  const handleCurrentWeek = () => {
    setSelectedWeekMonday(currentWeekMonday);
  };

  // Duplicate Previous Week Plan
  const handleDuplicatePreviousWeek = async () => {
    const [y, m, d] = selectedWeekMonday.split('-').map(Number);
    const prevDate = new Date(y, m - 1, d);
    prevDate.setDate(prevDate.getDate() - 7);
    const prevMonday = getMondayOfWeek(prevDate);

    const duplicated = await duplicatePlanToWeek(prevMonday, selectedWeekMonday, userId || undefined);
    setWeeklyPlan(duplicated);
    setPlanSaveSuccess(true);
    setTimeout(() => setPlanSaveSuccess(false), 3000);
  };

  // Save Weekly Plan (Stage A)
  const handleSaveWeeklyPlan = async () => {
    if (!weeklyPlan) return;
    setIsSavingPlan(true);
    await saveWeeklyPlan(weeklyPlan);
    setIsSavingPlan(false);
    setPlanSaveSuccess(true);
    setTimeout(() => setPlanSaveSuccess(false), 3000);
  };

  // Modify Planned Day in Editor
  const activePlanDay = weeklyPlan?.days?.[selectedDayIndex] || null;

  const updateActiveDayField = (field: keyof PlannedWorkoutDay, value: any) => {
    if (!weeklyPlan || !activePlanDay) return;
    const updatedDays = [...(weeklyPlan.days || [])];
    updatedDays[selectedDayIndex] = {
      ...activePlanDay,
      [field]: value,
      updated_at: new Date().toISOString(),
    };
    setWeeklyPlan({ ...weeklyPlan, days: updatedDays });
  };

  // Exercise manipulation in Plan
  const addExerciseToActiveDay = (exerciseDef: any) => {
    if (!weeklyPlan || !activePlanDay) return;
    const exercises = activePlanDay.exercises || [];
    const newEx: PlannedWorkoutExercise = {
      id: `pex_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      planned_day_id: activePlanDay.id,
      exercise_id: exerciseDef.id,
      exercise_name: exerciseDef.name,
      muscle_group: exerciseDef.primaryMuscle,
      order_index: exercises.length,
      planned_sets: 3,
      target_reps: '8-12',
      target_weight_kg: null,
      target_rest_seconds: 90,
      notes: null,
      created_at: new Date().toISOString(),
    };

    updateActiveDayField('exercises', [...exercises, newEx]);
    setIsExercisePickerOpen(false);
  };

  const removeExerciseFromActiveDay = (exId: string) => {
    if (!activePlanDay) return;
    const filtered = (activePlanDay.exercises || []).filter((e) => e.id !== exId);
    updateActiveDayField('exercises', filtered);
  };

  const moveExerciseOrder = (index: number, direction: 'up' | 'down') => {
    if (!activePlanDay) return;
    const exercises = [...(activePlanDay.exercises || [])];
    const targetIdx = direction === 'up' ? index - 1 : index + 1;
    if (targetIdx < 0 || targetIdx >= exercises.length) return;

    const temp = exercises[index];
    exercises[index] = exercises[targetIdx];
    exercises[targetIdx] = temp;

    const reindexed = exercises.map((e, idx) => ({ ...e, order_index: idx }));
    updateActiveDayField('exercises', reindexed);
  };

  // -------------------------------------------------------------
  // GYM MODE HANDLERS (STAGE B)
  // -------------------------------------------------------------
  const toggleGymSetComplete = (exId: string, setId: string) => {
    setGymExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) => (s.id === setId ? { ...s, completed: !s.completed } : s)),
        };
      })
    );
    setShowRestTimer(true);
  };

  const updateGymSetValue = (exId: string, setId: string, field: keyof GymSetRow, val: any) => {
    setGymExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) => (s.id === setId ? { ...s, [field]: val } : s)),
        };
      })
    );
  };

  const addSetToGymExercise = (exId: string) => {
    setGymExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSet: GymSetRow = {
          id: `set_${Date.now()}`,
          setNumber: ex.sets.length + 1,
          type: 'working',
          plannedReps: lastSet?.plannedReps || '10',
          weightKg: lastSet?.weightKg || 40,
          reps: lastSet?.reps || 10,
          rpe: 8,
          completed: false,
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      })
    );
  };

  const toggleSkipGymExercise = (exId: string) => {
    setGymExercises((prev) =>
      prev.map((ex) => (ex.id === exId ? { ...ex, skipped: !ex.skipped } : ex))
    );
  };

  // Finish and Save Workout
  const handleFinishGymWorkout = async () => {
    // Validate completed sets
    const completedSets = gymExercises
      .filter((e) => !e.skipped)
      .flatMap((e) => e.sets)
      .filter((s) => s.completed);

    if (completedSets.length === 0) {
      alert('Please complete at least one set before saving the workout.');
      return;
    }

    if (isFinishing) return; // Prevent duplicate clicks
    setIsFinishing(true);

    try {
      const durationSecs = Math.round((Date.now() - startTime) / 1000);
      const sessionUid = userId || 'guest';
      const resolvedSessionId = sessionId || `sess_${Date.now()}`;

      // Save to Supabase if authenticated
      if (userId && userId !== 'guest') {
        const session = await createWorkoutSession(userId, activeWorkoutTitle);
        if (session) {
          for (const ex of gymExercises) {
            if (ex.skipped) continue;
            for (const st of ex.sets) {
              if (st.completed && ex.exerciseId) {
                await logWorkoutSet({
                  session_id: session.id,
                  exercise_id: ex.exerciseId,
                  set_number: st.setNumber,
                  set_type: st.type,
                  weight_kg: st.weightKg,
                  reps: st.reps,
                  rpe: st.rpe,
                });
              }
            }
          }
          await finishWorkoutSession(session.id, durationSecs);
        }
      }

      // Save to local cache for immediate analytics availability
      const enriched: EnrichedWorkoutSession = {
        id: resolvedSessionId,
        user_id: sessionUid,
        title: activeWorkoutTitle,
        start_time: new Date(startTime).toISOString(),
        end_time: new Date().toISOString(),
        duration_seconds: durationSecs,
        logged_at: activeScheduledDate,
        completed: true,
        sets: gymExercises.flatMap((ex) => {
          if (ex.skipped) return [];
          const def = resolveExerciseDefinition(ex.exerciseId, ex.name);
          return ex.sets
            .filter((s) => s.completed)
            .map((s) => ({
              id: s.id,
              session_id: resolvedSessionId,
              exercise_id: ex.exerciseId || def.id,
              exercise_name: ex.name,
              set_number: s.setNumber,
              set_type: s.type,
              weight_kg: s.weightKg,
              reps: s.reps,
              rpe: s.rpe,
              completed: true,
              created_at: new Date().toISOString(),
              primary_muscle: def.primaryMuscle,
              secondary_muscles: def.secondaryMuscles,
            }));
        }),
      };

      saveSessionToLocalCache(enriched);

      // Trigger AI Analysis Modal
      setShowAIModal(true);
      triggerAIAnalysis(resolvedSessionId, durationSecs);
    } catch (err) {
      console.error('Failed to finish workout:', err);
    } finally {
      setIsFinishing(false);
    }
  };

  const triggerAIAnalysis = async (sessId: string, durationSecs: number) => {
    setIsAnalyzing(true);
    try {
      const res = await fetch('/api/workout/ai-analysis', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sessionId: sessId,
          workoutTitle: activeWorkoutTitle,
          durationSeconds: durationSecs,
          exercises: gymExercises.map((e) => ({
            name: e.name,
            muscle: e.muscle,
            sets: e.sets.map((s) => ({
              setNumber: s.setNumber,
              type: s.type,
              weightKg: s.weightKg,
              reps: s.reps,
              rpe: s.rpe,
              completed: s.completed,
            })),
          })),
        }),
      });

      if (res.ok) {
        const data = await res.json();
        setAnalysisData(data);
        saveWorkoutAnalysisToLocal(data);
      }
    } catch (err) {
      console.error('Error in AI analysis:', err);
    } finally {
      setIsAnalyzing(false);
    }
  };

  // Reschedule Confirmation
  const handleConfirmReschedule = async () => {
    if (!dayToReschedule) return;
    const res = await rescheduleWorkoutDay(dayToReschedule.id, rescheduleTargetDate, userId || undefined);
    if (res.conflictDay) {
      setRescheduleConflictWarning(`Note: ${rescheduleTargetDate} already has "${res.conflictDay.title}". Both will be retained without overwriting.`);
    }
    setRescheduleModalOpen(false);
    await loadPlan(userId || 'guest', selectedWeekMonday);
  };

  return (
    <AppShell headerTitle="WORKOUT & GYM LOGGER">
      <div className="space-y-4 sm:space-y-5">
        {/* Stage Toggle Bar */}
        <div className="p-3 sm:p-4 rounded-3xl bg-gradient-to-br from-[#0E1A38] via-[#0B132B] to-[#070C1E] border border-white/10 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3">
          <div>
            <div className="flex items-center gap-2 text-[10px] font-bold text-[#00D5FF] uppercase tracking-wider mb-0.5">
              <Dumbbell className="w-3.5 h-3.5 text-[#9B5CFF]" />
              <span>TRAINING CONSOLE</span>
            </div>
            <h1 className="text-base sm:text-xl font-display font-extrabold text-white uppercase tracking-wide">
              {stage === 'planner' ? 'Stage A: Weekly Split Planner' : 'Stage B: Active Gym Mode'}
            </h1>
          </div>

          <div className="flex items-center gap-1 p-1 rounded-2xl bg-black/40 border border-white/8 self-stretch sm:self-auto justify-end">
            <button
              onClick={() => setStage('planner')}
              className={`flex-1 sm:flex-initial py-2 px-3.5 rounded-xl text-xs font-display font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase ${
                stage === 'planner'
                  ? 'bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF] text-white shadow-[0_0_15px_rgba(155,92,255,0.35)]'
                  : 'text-[#A9A1BD] hover:text-white'
              }`}
            >
              <Calendar className="w-3.5 h-3.5" />
              <span>Planner</span>
            </button>
            <button
              onClick={() => setStage('gym_mode')}
              className={`flex-1 sm:flex-initial py-2 px-3.5 rounded-xl text-xs font-display font-bold tracking-wider transition-all cursor-pointer flex items-center justify-center gap-1.5 uppercase ${
                stage === 'gym_mode'
                  ? 'bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF] text-white shadow-[0_0_15px_rgba(155,92,255,0.35)]'
                  : 'text-[#A9A1BD] hover:text-white'
              }`}
            >
              <Play className="w-3.5 h-3.5 fill-current" />
              <span>Gym Mode</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* STAGE A: WEEKLY WORKOUT PLANNER */}
        {/* ============================================================== */}
        {stage === 'planner' && (
          <div className="space-y-4 sm:space-y-5">
            {/* Week Selector Bar */}
            <div className="p-3 sm:p-4 rounded-3xl bg-[#100D20]/85 border border-[#9B5CFF]/20 backdrop-blur-xl flex flex-wrap items-center justify-between gap-2.5 shadow-[0_8px_25px_rgba(0,0,0,0.4)]">
              <div className="flex items-center gap-1.5">
                <button
                  onClick={handlePrevWeek}
                  className="w-8 h-8 rounded-xl bg-white/5 border border-white/8 text-slate-300 hover:text-white flex items-center justify-center active:scale-95 transition-all"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-3 py-1.5 rounded-xl bg-white/5 border border-white/8 text-xs font-mono font-bold text-white flex items-center gap-2">
                  <Calendar className="w-3.5 h-3.5 text-[#00D5FF]" />
                  <span>Week of {selectedWeekMonday}</span>
                </div>
                <button
                  onClick={handleNextWeek}
                  className="w-8 h-8 rounded-xl bg-white/5 border border-white/8 text-slate-300 hover:text-white flex items-center justify-center active:scale-95 transition-all"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {selectedWeekMonday !== currentWeekMonday && (
                  <button
                    onClick={handleCurrentWeek}
                    className="py-1 px-2.5 rounded-lg bg-[#9B5CFF]/15 text-[#00D5FF] text-[11px] font-bold border border-[#9B5CFF]/25"
                  >
                    Current Week
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDuplicatePreviousWeek}
                  className="py-2 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-display font-bold tracking-wider flex items-center gap-1.5 border border-white/8 transition-all"
                >
                  <Copy className="w-3.5 h-3.5 text-[#00D5FF]" />
                  <span className="hidden sm:inline">DUPLICATE PREV</span>
                  <span className="sm:hidden">COPY</span>
                </button>
                <button
                  onClick={handleSaveWeeklyPlan}
                  disabled={isSavingPlan}
                  className="py-2 px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 text-xs font-display font-black tracking-wider flex items-center gap-1.5 shadow-[0_0_15px_rgba(16,185,129,0.3)] active:scale-95 transition-all uppercase"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isSavingPlan ? 'SAVING...' : 'SAVE PLAN'}</span>
                </button>
              </div>
            </div>

            {planSaveSuccess && (
              <div className="p-3 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Weekly plan saved successfully!</span>
              </div>
            )}

            {/* 7 Days Overview Strip */}
            <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2">
              {DAY_NAMES.map((dName, idx) => {
                const day = weeklyPlan?.days?.[idx];
                const isSelected = selectedDayIndex === idx;
                const dateStr = getDayDateString(selectedWeekMonday, idx);
                const isDayToday = dateStr === todayStr;

                return (
                  <div
                    key={dName}
                    onClick={() => setSelectedDayIndex(idx)}
                    className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-1 ${
                      isSelected
                        ? 'bg-[#1E163C] border-[#9B5CFF] shadow-[0_0_15px_rgba(155,92,255,0.3)] ring-1 ring-[#9B5CFF]'
                        : 'bg-[#100D20]/85 border-white/8 hover:border-white/15'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider">{dName.slice(0, 3)}</span>
                      {isDayToday && <span className="w-1.5 h-1.5 rounded-full bg-[#00D5FF] animate-ping" />}
                    </div>
                    <div className="text-xs font-display font-bold text-white truncate tracking-wide">{day?.title || 'Rest Day'}</div>
                    <div className="text-[10px] font-mono">
                      {day?.is_rest_day ? (
                        <span className="text-slate-500">Rest</span>
                      ) : (
                        <span className="text-[#00D5FF] font-semibold">{day?.exercises?.length || 0} exercises</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Day Editor (Stage A Detail) */}
            {activePlanDay && (
              <div className="p-4 sm:p-5 rounded-3xl bg-[#100D20]/85 border border-[#9B5CFF]/20 backdrop-blur-xl space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-white/8 pb-3.5">
                  <div className="space-y-1 w-full sm:w-auto">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-display font-bold text-[#00D5FF] tracking-wider uppercase">{DAY_NAMES[activePlanDay.day_of_week]}</span>
                      <span className="text-xs text-slate-400 font-mono">• {activePlanDay.scheduled_date}</span>
                    </div>
                    <input
                      type="text"
                      value={activePlanDay.title}
                      onChange={(e) => updateActiveDayField('title', e.target.value)}
                      className="text-base sm:text-lg font-display font-extrabold text-white bg-transparent border-b border-white/10 focus:outline-none focus:border-[#9B5CFF] w-full uppercase tracking-wide"
                    />
                  </div>

                  <div className="flex items-center gap-2.5 self-end sm:self-auto">
                    <label className="flex items-center gap-2 text-xs font-display font-bold text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activePlanDay.is_rest_day}
                        onChange={(e) => updateActiveDayField('is_rest_day', e.target.checked)}
                        className="rounded bg-black/40 border-white/10 text-orange-500 focus:ring-0"
                      />
                      <span>REST DAY</span>
                    </label>

                    {!activePlanDay.is_rest_day && (
                      <button
                        onClick={() => {
                          loadDayIntoGymMode(activePlanDay);
                          setStage('gym_mode');
                        }}
                        className="py-2 px-3.5 rounded-xl bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF] text-white font-display font-bold text-xs tracking-wider uppercase flex items-center gap-1.5 shadow-[0_0_15px_rgba(155,92,255,0.35)] active:scale-95 cursor-pointer min-h-[44px]"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>START GYM MODE</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Exercises in Day */}
                {!activePlanDay.is_rest_day && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-display font-extrabold text-white text-xs sm:text-sm tracking-wider uppercase">Planned Exercises</h4>
                      <button
                        onClick={() => setIsExercisePickerOpen(true)}
                        className="py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-display font-bold tracking-wider flex items-center gap-1 border border-white/8 transition-all min-h-[36px]"
                      >
                        <Plus className="w-4 h-4 text-[#00D5FF]" />
                        <span>Add Exercise</span>
                      </button>
                    </div>

                    {(activePlanDay.exercises || []).length === 0 ? (
                      <div className="p-8 rounded-2xl bg-black/40 border border-dashed border-[#9B5CFF]/30 text-center space-y-3">
                        <div className="w-12 h-12 rounded-2xl bg-[#9B5CFF]/15 text-[#9B5CFF] border border-[#9B5CFF]/30 flex items-center justify-center mx-auto">
                          <Dumbbell className="w-6 h-6" />
                        </div>
                        <div className="space-y-1">
                          <h4 className="font-display font-bold text-white text-sm uppercase">Your first workout starts here.</h4>
                          <p className="text-xs text-[#A9A1BD] max-w-xs mx-auto">
                            Add exercises to build today&apos;s routine or start an immediate session.
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={() => setIsExercisePickerOpen(true)}
                          className="inline-flex items-center gap-1.5 py-2 px-4 rounded-xl bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF] text-white font-display font-extrabold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer min-h-[44px]"
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                          <span>Add First Exercise</span>
                        </button>
                      </div>
                    ) : (
                      <div className="space-y-2">
                        {activePlanDay.exercises?.map((ex, idx) => (
                          <div
                            key={ex.id}
                            className="p-3 sm:p-3.5 rounded-2xl bg-white/[0.03] border border-white/6 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-lg bg-white/5 border border-white/8 text-slate-300 font-bold text-xs flex items-center justify-center shrink-0">
                                {idx + 1}
                              </span>
                              <div>
                                <h5 className="font-display font-bold text-white text-xs sm:text-sm tracking-wider uppercase">{ex.exercise_name}</h5>
                                <span className="text-[10px] text-[#00D5FF] font-mono">{ex.muscle_group}</span>
                              </div>
                            </div>

                            {/* Plan Parameters */}
                            <div className="flex flex-wrap items-center gap-2.5 text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-400 font-mono text-[11px]">Sets:</span>
                                <input
                                  type="number"
                                  value={ex.planned_sets}
                                  onChange={(e) => {
                                    const updated = [...(activePlanDay.exercises || [])];
                                    updated[idx].planned_sets = Number(e.target.value);
                                    updateActiveDayField('exercises', updated);
                                  }}
                                  className="w-12 py-1 px-1.5 rounded-lg bg-black/40 border border-white/10 text-center font-bold text-white text-xs"
                                />
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-400 font-mono text-[11px]">Target Reps:</span>
                                <input
                                  type="text"
                                  value={ex.target_reps}
                                  onChange={(e) => {
                                    const updated = [...(activePlanDay.exercises || [])];
                                    updated[idx].target_reps = e.target.value;
                                    updateActiveDayField('exercises', updated);
                                  }}
                                  className="w-14 py-1 px-1.5 rounded-lg bg-black/40 border border-white/10 text-center font-bold text-white text-xs"
                                />
                              </div>

                              {/* Ordering Controls */}
                              <div className="flex items-center gap-1 border-l border-white/10 pl-2">
                                <button
                                  onClick={() => moveExerciseOrder(idx, 'up')}
                                  disabled={idx === 0}
                                  className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20"
                                >
                                  <ArrowUp className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => moveExerciseOrder(idx, 'down')}
                                  disabled={idx === (activePlanDay.exercises?.length || 0) - 1}
                                  className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-20"
                                >
                                  <ArrowDown className="w-3.5 h-3.5" />
                                </button>
                                <button
                                  onClick={() => removeExerciseFromActiveDay(ex.id)}
                                  className="p-1 text-slate-500 hover:text-rose-400"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ============================================================== */}
        {/* STAGE B: GYM MODE / IN-GYM WORKOUT LOGGER */}
        {/* ============================================================== */}
        {stage === 'gym_mode' && (
          <div className="space-y-4 sm:space-y-5">
            {/* Top Workout Session Banner */}
            <div className="p-3.5 sm:p-4 rounded-3xl bg-gradient-to-br from-[#0E1A38] via-[#0B132B] to-[#070C1E] border border-white/10 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
              <div>
                <div className="flex items-center gap-2 text-[10px] text-[#00D5FF] font-bold tracking-wider uppercase mb-0.5">
                  <span className="w-2 h-2 rounded-full bg-[#00D5FF] animate-ping" />
                  <span>ACTIVE GYM MODE • {activeScheduledDate}</span>
                </div>
                <h2 className="text-base sm:text-xl font-display font-extrabold text-white tracking-wide uppercase">{activeWorkoutTitle}</h2>
              </div>

              <div className="flex items-center gap-2 self-start sm:self-auto">
                <button
                  onClick={() => setShowPlateCalc(true)}
                  className="py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 text-xs font-display font-bold tracking-wider border border-white/8 transition-all uppercase"
                >
                  Plate Calc
                </button>
                <button
                  onClick={() => setShowRestTimer(!showRestTimer)}
                  className="py-1.5 px-3 rounded-xl bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 text-xs font-display font-bold tracking-wider border border-emerald-500/30 transition-all uppercase"
                >
                  Rest Timer
                </button>
              </div>
            </div>

            {/* Embedded Rest Timer when toggled */}
            {showRestTimer && (
              <div className="max-w-md mx-auto">
                <RestTimer onClose={() => setShowRestTimer(false)} />
              </div>
            )}

            {/* Exercise Cards */}
            <div className="space-y-3.5">
              {gymExercises.map((ex) => (
                <div
                  key={ex.id}
                  className={`p-3.5 sm:p-4 rounded-3xl border transition-all space-y-3 ${
                    ex.skipped
                      ? 'bg-black/30 border-white/5 opacity-50'
                      : 'bg-[#100D20]/85 border-[#9B5CFF]/20 backdrop-blur-xl shadow-[0_8px_25px_rgba(0,0,0,0.4)]'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-white/8 pb-2.5">
                    <div>
                      <h3 className="font-display font-bold text-white text-sm sm:text-base tracking-wide uppercase">{ex.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="px-2 py-0.5 rounded-full bg-[#9B5CFF]/15 text-[#00D5FF] font-bold text-[10px] border border-[#9B5CFF]/25">
                          {ex.muscle}
                        </span>
                        <span>• Prev: <strong className="text-slate-200">{ex.previousPerformance}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSkipGymExercise(ex.id)}
                        className={`text-xs font-display font-bold px-2.5 py-1 rounded-xl border transition-colors uppercase ${
                          ex.skipped
                            ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
                            : 'bg-white/5 text-slate-400 hover:text-white border-white/8'
                        }`}
                      >
                        {ex.skipped ? 'Skipped' : 'Skip'}
                      </button>
                    </div>
                  </div>

                  {!ex.skipped && (
                    <div className="space-y-2">
                      {/* Table Header */}
                      <div className="grid grid-cols-12 gap-2 text-center text-[10px] font-display font-bold text-slate-400 px-1 tracking-wider uppercase">
                        <span className="col-span-2 text-left">SET</span>
                        <span className="col-span-4">WEIGHT (KG)</span>
                        <span className="col-span-4">REPS</span>
                        <span className="col-span-2 text-right">DONE</span>
                      </div>

                      {/* Set Rows */}
                      {ex.sets.map((set) => (
                        <div
                          key={set.id}
                          className={`grid grid-cols-12 gap-2 items-center p-2 rounded-2xl border transition-all ${
                            set.completed
                              ? 'bg-emerald-500/15 border-emerald-500/35'
                              : 'bg-white/[0.03] border-white/6'
                          }`}
                        >
                          <div className="col-span-2 flex items-center gap-1.5">
                            <span className="w-6 h-6 rounded-lg bg-white/5 text-slate-200 font-bold text-xs flex items-center justify-center shrink-0">
                              {set.setNumber}
                            </span>
                            <span className="text-[9px] text-slate-500 font-mono hidden sm:inline">
                              ({set.plannedReps})
                            </span>
                          </div>

                          {/* Weight Input */}
                          <div className="col-span-4">
                            <input
                              type="number"
                              step="0.5"
                              value={set.weightKg}
                              onChange={(e) => updateGymSetValue(ex.id, set.id, 'weightKg', Number(e.target.value))}
                              className="w-full py-1.5 px-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs sm:text-sm font-bold text-center focus:outline-none focus:border-[#9B5CFF]"
                            />
                          </div>

                          {/* Reps Input */}
                          <div className="col-span-4">
                            <input
                              type="number"
                              value={set.reps}
                              onChange={(e) => updateGymSetValue(ex.id, set.id, 'reps', Number(e.target.value))}
                              className="w-full py-1.5 px-2 rounded-xl bg-black/40 border border-white/10 text-white text-xs sm:text-sm font-bold text-center focus:outline-none focus:border-[#9B5CFF]"
                            />
                          </div>

                          {/* Done Button */}
                          <div className="col-span-2 flex justify-end">
                            <button
                              onClick={() => toggleGymSetComplete(ex.id, set.id)}
                              className={`w-8 h-8 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                set.completed
                                  ? 'bg-emerald-500 text-slate-950 shadow-[0_0_12px_rgba(16,185,129,0.4)]'
                                  : 'bg-white/5 text-slate-400 hover:bg-white/10'
                              }`}
                            >
                              <Check className="w-4 h-4 stroke-[3]" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add Set Button */}
                      <button
                        onClick={() => addSetToGymExercise(ex.id)}
                        className="w-full py-2 rounded-xl bg-white/[0.02] border border-dashed border-white/10 hover:border-white/20 text-slate-400 hover:text-white text-xs font-display font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer uppercase tracking-wider"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Set</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Complete Workout Bottom Bar with Safe Clearance Above Dock */}
            <div className="pt-3 pb-8">
              <button
                onClick={handleFinishGymWorkout}
                disabled={isFinishing}
                className="w-full py-3.5 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-display font-extrabold text-sm sm:text-base tracking-wider shadow-[0_0_25px_rgba(16,185,129,0.35)] active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer uppercase"
              >
                <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                <span>{isFinishing ? 'Saving Workout...' : 'Finish Workout & Save Session'}</span>
              </button>
            </div>
          </div>
        )}

        {/* MODAL: EXERCISE LIBRARY PICKER */}
        {isExercisePickerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/75 backdrop-blur-md">
            <div className="bg-[#0B132B]/95 backdrop-blur-2xl border border-white/12 rounded-3xl w-full max-w-lg p-5 space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.9)] max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-white/8 pb-3">
                <h3 className="font-display font-extrabold text-white text-base uppercase tracking-wider">Add Exercise from Library</h3>
                <button
                  onClick={() => setIsExercisePickerOpen(false)}
                  className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/8 flex items-center justify-center transition-all cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input
                type="text"
                placeholder="Search exercise or muscle..."
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                className="w-full py-2.5 px-3.5 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-[#9B5CFF]"
              />

              <div className="overflow-y-auto space-y-1.5 flex-1 pr-1">
                {EXERCISE_CATALOG.filter((ex) =>
                  ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
                  ex.primaryMuscle.toLowerCase().includes(exerciseSearch.toLowerCase())
                ).map((ex) => (
                  <div
                    key={ex.id}
                    onClick={() => addExerciseToActiveDay(ex)}
                    className="p-3 rounded-2xl bg-white/[0.03] border border-white/6 hover:border-[#9B5CFF]/40 flex items-center justify-between cursor-pointer transition-colors group"
                  >
                    <div>
                      <span className="font-display font-bold text-white text-xs sm:text-sm block uppercase tracking-wide group-hover:text-[#00D5FF] transition-colors">{ex.name}</span>
                      <span className="text-[10px] text-slate-400 font-mono">{ex.primaryMuscle} • {ex.category}</span>
                    </div>
                    <div className="w-7 h-7 rounded-lg bg-white/5 group-hover:bg-[#9B5CFF] group-hover:text-white text-slate-400 flex items-center justify-center transition-colors">
                      <Plus className="w-4 h-4" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODAL: RESCHEDULE WORKOUT */}
        {rescheduleModalOpen && dayToReschedule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-3.5 sm:p-4 bg-black/75 backdrop-blur-md">
            <div className="bg-[#100D20]/95 backdrop-blur-2xl border border-white/12 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-[0_25px_60px_rgba(0,0,0,0.9)]">
              <div className="flex items-center gap-2.5 border-b border-white/8 pb-3">
                <div className="w-8 h-8 rounded-xl bg-[#9B5CFF]/15 text-[#9B5CFF] border border-[#9B5CFF]/25 flex items-center justify-center">
                  <RotateCcw className="w-4 h-4" />
                </div>
                <h3 className="font-display font-extrabold text-white text-sm sm:text-base uppercase tracking-wider">Reschedule Missed Workout</h3>
              </div>

              <p className="text-xs text-slate-300">
                Reschedule <strong>"{dayToReschedule.title}"</strong> to a future date. The original date will be preserved for adherence history.
              </p>

              <div>
                <label className="text-[11px] font-display font-bold text-slate-400 block mb-1 uppercase tracking-wider">New Scheduled Date</label>
                <input
                  type="date"
                  value={rescheduleTargetDate}
                  onChange={(e) => setRescheduleTargetDate(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white font-mono font-bold focus:border-[#9B5CFF] outline-none"
                />
              </div>

              {rescheduleConflictWarning && (
                <div className="p-2.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-300 text-xs">
                  {rescheduleConflictWarning}
                </div>
              )}

              <div className="flex gap-2 pt-2 border-t border-white/8">
                <button
                  onClick={() => setRescheduleModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-display font-bold uppercase transition-all min-h-[44px]"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReschedule}
                  className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF] text-white text-xs font-display font-black uppercase tracking-wider shadow-[0_0_15px_rgba(155,92,255,0.35)] active:scale-95 min-h-[44px]"
                >
                  Confirm Reschedule
                </button>
              </div>
            </div>
          </div>
        )}

        <PlateCalculatorModal isOpen={showPlateCalc} onClose={() => setShowPlateCalc(false)} />
        <AIWorkoutModal
          isOpen={showAIModal}
          onClose={() => setShowAIModal(false)}
          analysis={analysisData}
          isLoading={isAnalyzing}
          onRequestAnalysis={() => triggerAIAnalysis(sessionId || 'sess_local', 3600)}
        />
      </div>
    </AppShell>
  );
}
