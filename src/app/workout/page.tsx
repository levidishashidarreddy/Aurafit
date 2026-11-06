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
    <AppShell headerTitle="Workout Planner & Logger">
      <div className="space-y-6">
        {/* Stage Toggle Bar */}
        <div className="p-4 md:p-5 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-orange-950/20 border border-slate-800 shadow-xl flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-wider mb-1">
              <Dumbbell className="w-4 h-4" />
              <span>Two-Stage Workout System</span>
            </div>
            <h1 className="text-xl md:text-2xl font-black text-slate-100">
              {stage === 'planner' ? 'Stage A: Weekly Workout Planner' : 'Stage B: Gym Mode Logger'}
            </h1>
          </div>

          <div className="flex items-center gap-1.5 p-1 rounded-2xl bg-slate-950 border border-slate-800 self-stretch sm:self-auto justify-end">
            <button
              onClick={() => setStage('planner')}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                stage === 'planner'
                  ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Calendar className="w-4 h-4" />
              <span>Weekly Planner</span>
            </button>
            <button
              onClick={() => setStage('gym_mode')}
              className={`py-2 px-4 rounded-xl text-xs font-bold transition-all cursor-pointer flex items-center gap-2 ${
                stage === 'gym_mode'
                  ? 'bg-orange-500 text-slate-950 shadow-md shadow-orange-500/20'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Gym Mode</span>
            </button>
          </div>
        </div>

        {/* ============================================================== */}
        {/* STAGE A: WEEKLY WORKOUT PLANNER */}
        {/* ============================================================== */}
        {stage === 'planner' && (
          <div className="space-y-6">
            {/* Week Selector Bar */}
            <div className="p-4 rounded-2xl bg-slate-900/90 border border-slate-800 flex flex-wrap items-center justify-between gap-3">
              <div className="flex items-center gap-2">
                <button
                  onClick={handlePrevWeek}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <div className="px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs font-bold text-slate-100 flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-orange-400" />
                  <span>Week of {selectedWeekMonday}</span>
                </div>
                <button
                  onClick={handleNextWeek}
                  className="p-2 rounded-xl bg-slate-950 border border-slate-800 text-slate-300 hover:text-white"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
                {selectedWeekMonday !== currentWeekMonday && (
                  <button
                    onClick={handleCurrentWeek}
                    className="py-1 px-2.5 rounded-lg bg-orange-500/10 text-orange-400 text-xs font-bold"
                  >
                    Current Week
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={handleDuplicatePreviousWeek}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1.5 border border-slate-700"
                >
                  <Copy className="w-3.5 h-3.5 text-orange-400" />
                  <span>Duplicate Previous Week</span>
                </button>
                <button
                  onClick={handleSaveWeeklyPlan}
                  disabled={isSavingPlan}
                  className="py-2 px-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 text-xs font-black flex items-center gap-1.5 shadow-md shadow-emerald-500/20"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>{isSavingPlan ? 'Saving...' : 'Save Plan'}</span>
                </button>
              </div>
            </div>

            {planSaveSuccess && (
              <div className="p-3 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2">
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
                    className={`p-3 rounded-2xl border transition-all cursor-pointer space-y-1.5 ${
                      isSelected
                        ? 'bg-slate-900 border-orange-500 shadow-lg shadow-orange-500/10 ring-1 ring-orange-500'
                        : 'bg-slate-950/70 border-slate-800 hover:border-slate-700'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] font-bold text-slate-400 uppercase">{dName.slice(0, 3)}</span>
                      {isDayToday && <span className="w-1.5 h-1.5 rounded-full bg-orange-400" />}
                    </div>
                    <div className="text-xs font-bold text-slate-100 truncate">{day?.title || 'Rest Day'}</div>
                    <div className="text-[10px]">
                      {day?.is_rest_day ? (
                        <span className="text-slate-500 font-semibold">Rest</span>
                      ) : (
                        <span className="text-orange-400 font-bold">{day?.exercises?.length || 0} exercises</span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Day Editor (Stage A Detail) */}
            {activePlanDay && (
              <div className="p-5 md:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-5">
                <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-3 border-b border-slate-800 pb-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-orange-400 uppercase">{DAY_NAMES[activePlanDay.day_of_week]}</span>
                      <span className="text-xs text-slate-400 font-medium">• {activePlanDay.scheduled_date}</span>
                    </div>
                    <input
                      type="text"
                      value={activePlanDay.title}
                      onChange={(e) => updateActiveDayField('title', e.target.value)}
                      className="text-lg font-black text-slate-100 bg-transparent border-b border-slate-700 focus:outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="flex items-center gap-3">
                    <label className="flex items-center gap-2 text-xs font-bold text-slate-300 cursor-pointer">
                      <input
                        type="checkbox"
                        checked={activePlanDay.is_rest_day}
                        onChange={(e) => updateActiveDayField('is_rest_day', e.target.checked)}
                        className="rounded bg-slate-950 border-slate-700 text-orange-500 focus:ring-0"
                      />
                      <span>Mark as Rest Day</span>
                    </label>

                    {!activePlanDay.is_rest_day && (
                      <button
                        onClick={() => {
                          loadDayIntoGymMode(activePlanDay);
                          setStage('gym_mode');
                        }}
                        className="py-2 px-3.5 rounded-xl bg-orange-500 text-slate-950 font-black text-xs flex items-center gap-1.5 shadow-md shadow-orange-500/20"
                      >
                        <Play className="w-3.5 h-3.5 fill-current" />
                        <span>Launch in Gym Mode</span>
                      </button>
                    )}
                  </div>
                </div>

                {/* Exercises in Day */}
                {!activePlanDay.is_rest_day && (
                  <div className="space-y-3">
                    <div className="flex items-center justify-between">
                      <h4 className="font-extrabold text-slate-100 text-sm">Planned Exercises</h4>
                      <button
                        onClick={() => setIsExercisePickerOpen(true)}
                        className="py-1.5 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-bold flex items-center gap-1 border border-slate-700"
                      >
                        <Plus className="w-4 h-4 text-orange-400" />
                        <span>Add Exercise</span>
                      </button>
                    </div>

                    {(activePlanDay.exercises || []).length === 0 ? (
                      <div className="p-8 rounded-2xl bg-slate-950/60 border border-slate-800 text-center text-xs text-slate-400">
                        No exercises planned for this day yet. Click "Add Exercise" to select from the library.
                      </div>
                    ) : (
                      <div className="space-y-2.5">
                        {activePlanDay.exercises?.map((ex, idx) => (
                          <div
                            key={ex.id}
                            className="p-4 rounded-2xl bg-slate-950 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-3"
                          >
                            <div className="flex items-center gap-3">
                              <span className="w-6 h-6 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 font-bold text-xs flex items-center justify-center">
                                {idx + 1}
                              </span>
                              <div>
                                <h5 className="font-bold text-slate-100 text-sm">{ex.exercise_name}</h5>
                                <span className="text-[11px] text-orange-400 font-medium">{ex.muscle_group}</span>
                              </div>
                            </div>

                            {/* Plan Parameters */}
                            <div className="flex flex-wrap items-center gap-3 text-xs">
                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-400">Sets:</span>
                                <input
                                  type="number"
                                  value={ex.planned_sets}
                                  onChange={(e) => {
                                    const updated = [...(activePlanDay.exercises || [])];
                                    updated[idx].planned_sets = Number(e.target.value);
                                    updateActiveDayField('exercises', updated);
                                  }}
                                  className="w-14 py-1 px-2 rounded-lg bg-slate-900 border border-slate-800 text-center font-bold text-slate-100"
                                />
                              </div>

                              <div className="flex items-center gap-1.5">
                                <span className="text-slate-400">Target Reps:</span>
                                <input
                                  type="text"
                                  value={ex.target_reps}
                                  onChange={(e) => {
                                    const updated = [...(activePlanDay.exercises || [])];
                                    updated[idx].target_reps = e.target.value;
                                    updateActiveDayField('exercises', updated);
                                  }}
                                  className="w-16 py-1 px-2 rounded-lg bg-slate-900 border border-slate-800 text-center font-bold text-slate-100"
                                />
                              </div>

                              {/* Ordering Controls */}
                              <div className="flex items-center gap-1 border-l border-slate-800 pl-2">
                                <button
                                  onClick={() => moveExerciseOrder(idx, 'up')}
                                  disabled={idx === 0}
                                  className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
                                >
                                  <ArrowUp className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => moveExerciseOrder(idx, 'down')}
                                  disabled={idx === (activePlanDay.exercises?.length || 0) - 1}
                                  className="p-1 rounded text-slate-400 hover:text-white disabled:opacity-30"
                                >
                                  <ArrowDown className="w-4 h-4" />
                                </button>
                                <button
                                  onClick={() => removeExerciseFromActiveDay(ex.id)}
                                  className="p-1 text-slate-500 hover:text-rose-400"
                                >
                                  <Trash2 className="w-4 h-4" />
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
          <div className="space-y-6">
            {/* Top Workout Session Banner */}
            <div className="p-4 md:p-5 rounded-3xl bg-slate-900/90 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
              <div>
                <div className="flex items-center gap-2 text-xs text-orange-400 font-bold mb-1">
                  <span className="w-2 h-2 rounded-full bg-orange-400 animate-ping" />
                  <span>Active Session • Scheduled: {activeScheduledDate}</span>
                </div>
                <h2 className="text-xl font-black text-slate-100">{activeWorkoutTitle}</h2>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowPlateCalc(true)}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-slate-700"
                >
                  Plate Calc
                </button>
                <button
                  onClick={() => setShowRestTimer(!showRestTimer)}
                  className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 text-xs font-semibold border border-slate-700"
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
            <div className="space-y-4">
              {gymExercises.map((ex) => (
                <div
                  key={ex.id}
                  className={`p-4 md:p-5 rounded-2xl border transition-all space-y-4 ${
                    ex.skipped
                      ? 'bg-slate-950/40 border-slate-900 opacity-60'
                      : 'bg-slate-900/90 border-slate-800'
                  }`}
                >
                  <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                    <div>
                      <h3 className="font-extrabold text-slate-100 text-base">{ex.name}</h3>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                        <span className="px-2 py-0.5 rounded-md bg-slate-800 text-orange-400 font-bold text-[10px]">
                          {ex.muscle}
                        </span>
                        <span>• Prev: <strong className="text-slate-300">{ex.previousPerformance}</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => toggleSkipGymExercise(ex.id)}
                        className={`text-xs font-bold px-2.5 py-1 rounded-lg border transition-colors ${
                          ex.skipped
                            ? 'bg-amber-500/10 text-amber-400 border-amber-500/20'
                            : 'bg-slate-800 text-slate-400 hover:text-slate-200 border-slate-700'
                        }`}
                      >
                        {ex.skipped ? 'Skipped' : 'Skip'}
                      </button>
                    </div>
                  </div>

                  {!ex.skipped && (
                    <div className="space-y-2">
                      {/* Table Header */}
                      <div className="grid grid-cols-12 gap-2 text-center text-xs font-bold text-slate-400 px-1">
                        <span className="col-span-2 text-left">SET</span>
                        <span className="col-span-4">WEIGHT (KG)</span>
                        <span className="col-span-4">REPS</span>
                        <span className="col-span-2 text-right">DONE</span>
                      </div>

                      {/* Set Rows */}
                      {ex.sets.map((set) => (
                        <div
                          key={set.id}
                          className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl border transition-all ${
                            set.completed
                              ? 'bg-emerald-950/25 border-emerald-500/40'
                              : 'bg-slate-950/70 border-slate-800'
                          }`}
                        >
                          <div className="col-span-2 flex items-center gap-1.5">
                            <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center">
                              {set.setNumber}
                            </span>
                            <span className="text-[10px] text-slate-500 font-semibold hidden sm:inline">
                              (Target: {set.plannedReps})
                            </span>
                          </div>

                          {/* Weight Input */}
                          <div className="col-span-4">
                            <input
                              type="number"
                              step="0.5"
                              value={set.weightKg}
                              onChange={(e) => updateGymSetValue(ex.id, set.id, 'weightKg', Number(e.target.value))}
                              className="w-full py-2 px-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm font-black text-center focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          {/* Reps Input */}
                          <div className="col-span-4">
                            <input
                              type="number"
                              value={set.reps}
                              onChange={(e) => updateGymSetValue(ex.id, set.id, 'reps', Number(e.target.value))}
                              className="w-full py-2 px-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm font-black text-center focus:outline-none focus:border-orange-500"
                            />
                          </div>

                          {/* Done Button */}
                          <div className="col-span-2 flex justify-end">
                            <button
                              onClick={() => toggleGymSetComplete(ex.id, set.id)}
                              className={`w-9 h-9 rounded-xl flex items-center justify-center transition-all cursor-pointer ${
                                set.completed
                                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                                  : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                              }`}
                            >
                              <Check className="w-5 h-5 stroke-[3]" />
                            </button>
                          </div>
                        </div>
                      ))}

                      {/* Add Set Button */}
                      <button
                        onClick={() => addSetToGymExercise(ex.id)}
                        className="w-full py-2 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-400 hover:text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Add Set</span>
                      </button>
                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Complete Workout Bottom Bar */}
            <div className="sticky bottom-16 md:bottom-4 z-30 pt-2">
              <button
                onClick={handleFinishGymWorkout}
                disabled={isFinishing}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black text-base shadow-2xl shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
                <span>{isFinishing ? 'Saving Workout...' : 'Finish Workout & Save Session'}</span>
              </button>
            </div>
          </div>
        )}

        {/* MODAL: EXERCISE LIBRARY PICKER */}
        {isExercisePickerOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-lg p-5 space-y-4 shadow-2xl max-h-[85vh] flex flex-col">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <h3 className="font-extrabold text-slate-100 text-sm">Add Exercise from Library</h3>
                <button onClick={() => setIsExercisePickerOpen(false)} className="text-slate-400 hover:text-white">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <input
                type="text"
                placeholder="Search exercise..."
                value={exerciseSearch}
                onChange={(e) => setExerciseSearch(e.target.value)}
                className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 focus:outline-none focus:border-orange-500"
              />

              <div className="overflow-y-auto space-y-1.5 flex-1 pr-1">
                {EXERCISE_CATALOG.filter((ex) =>
                  ex.name.toLowerCase().includes(exerciseSearch.toLowerCase()) ||
                  ex.primaryMuscle.toLowerCase().includes(exerciseSearch.toLowerCase())
                ).map((ex) => (
                  <div
                    key={ex.id}
                    onClick={() => addExerciseToActiveDay(ex)}
                    className="p-3 rounded-xl bg-slate-950 border border-slate-800 hover:border-orange-500/50 flex items-center justify-between cursor-pointer transition-colors"
                  >
                    <div>
                      <span className="font-bold text-slate-100 text-xs block">{ex.name}</span>
                      <span className="text-[10px] text-orange-400">{ex.primaryMuscle} • {ex.category}</span>
                    </div>
                    <Plus className="w-4 h-4 text-slate-400" />
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* MODAL: RESCHEDULE WORKOUT */}
        {rescheduleModalOpen && dayToReschedule && (
          <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
            <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-md p-5 space-y-4 shadow-2xl">
              <div className="flex items-center gap-2.5 border-b border-slate-800 pb-3">
                <RotateCcw className="w-5 h-5 text-orange-400" />
                <h3 className="font-bold text-slate-100 text-sm">Reschedule Missed Workout</h3>
              </div>

              <p className="text-xs text-slate-300">
                Reschedule <strong>"{dayToReschedule.title}"</strong> to a future date. The original date will be preserved for adherence history.
              </p>

              <div>
                <label className="text-xs font-bold text-slate-400 block mb-1">New Scheduled Date</label>
                <input
                  type="date"
                  value={rescheduleTargetDate}
                  onChange={(e) => setRescheduleTargetDate(e.target.value)}
                  className="w-full py-2 px-3 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-100 font-bold"
                />
              </div>

              {rescheduleConflictWarning && (
                <div className="p-2.5 rounded-xl bg-amber-950/20 border border-amber-500/30 text-amber-300 text-xs">
                  {rescheduleConflictWarning}
                </div>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  onClick={() => setRescheduleModalOpen(false)}
                  className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 text-xs font-bold"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmReschedule}
                  className="flex-1 py-2.5 rounded-xl bg-orange-500 text-slate-950 text-xs font-black"
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
