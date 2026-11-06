// GYM HUB: Workout Planner & Gym Mode Service
// Supports weekly workout planning, day-by-day routines, exercise ordering,
// missed workout detection, rescheduling with conflict prevention, and plan-vs-actual comparison.

import { createClient } from '../supabase/client';
import {
  WeeklyWorkoutPlan,
  PlannedWorkoutDay,
  PlannedWorkoutExercise,
  WorkoutDayStatus
} from '../types/database';
import { EXERCISE_CATALOG, resolveExerciseDefinition } from './workoutAnalyticsService';

const STORAGE_KEY = 'gymhub_weekly_workout_plans_v1';

export function getMondayOfWeek(d: Date = new Date()): string {
  const date = new Date(d);
  const day = date.getDay();
  // In JS, 0 is Sunday, 1 is Monday.
  const diff = date.getDate() - day + (day === 0 ? -6 : 1);
  date.setDate(diff);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const dayStr = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${dayStr}`;
}

export function getDayDateString(mondayStr: string, dayOffset: number): string {
  const [y, m, d] = mondayStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  date.setDate(date.getDate() + dayOffset);
  const yStr = date.getFullYear();
  const mStr = String(date.getMonth() + 1).padStart(2, '0');
  const dStr = String(date.getDate()).padStart(2, '0');
  return `${yStr}-${mStr}-${dStr}`;
}

export const DAY_NAMES = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

export function createDefaultWeeklyDays(planId: string, userId: string, mondayStr: string): PlannedWorkoutDay[] {
  const defaultSplit = [
    { title: 'Push (Chest, Shoulders & Triceps)', isRest: false, exercises: ['Barbell Bench Press', 'Incline Dumbbell Press', 'Dumbbell Lateral Raise', 'Triceps Rope Pushdown'] },
    { title: 'Pull (Back & Biceps)', isRest: false, exercises: ['Lat Pulldown', 'Seated Cable Row', 'Barbell Bicep Curl', 'Dumbbell Hammer Curl'] },
    { title: 'Active Rest / Mobility', isRest: true, exercises: [] },
    { title: 'Legs & Core Power', isRest: false, exercises: ['Barbell Squat', 'Leg Press', 'Lying Leg Curl', 'Standing Calf Raise'] },
    { title: 'Upper Body Hypertrophy', isRest: false, exercises: ['Dumbbell Shoulder Press', 'Barbell Bent Over Row', 'Cable Chest Fly', 'Overhead Dumbbell Extension'] },
    { title: 'Rest & Recovery', isRest: true, exercises: [] },
    { title: 'Rest & Recovery', isRest: true, exercises: [] },
  ];

  return defaultSplit.map((item, idx) => {
    const dayDate = getDayDateString(mondayStr, idx);
    const dayId = `pday_${mondayStr}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
    const exercises: PlannedWorkoutExercise[] = item.exercises.map((exName, exIdx) => {
      const def = resolveExerciseDefinition(undefined, exName);
      return {
        id: `pex_${dayId}_${exIdx}`,
        planned_day_id: dayId,
        exercise_id: def.id,
        exercise_name: def.name,
        muscle_group: def.primaryMuscle,
        order_index: exIdx,
        planned_sets: 3,
        target_reps: '8-12',
        target_weight_kg: null,
        target_rest_seconds: 90,
        notes: null,
        created_at: new Date().toISOString(),
      };
    });

    return {
      id: dayId,
      plan_id: planId,
      user_id: userId,
      scheduled_date: dayDate,
      original_date: dayDate,
      day_of_week: idx,
      title: item.title,
      is_rest_day: item.isRest,
      status: item.isRest ? 'rest' : 'planned',
      rescheduled_to_date: null,
      completed_session_id: null,
      order_index: idx,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      exercises,
    };
  });
}

function getLocalPlans(): WeeklyWorkoutPlan[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch (e) {
    return [];
  }
}

function saveLocalPlans(plans: WeeklyWorkoutPlan[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(plans));
    window.dispatchEvent(new CustomEvent('gymhub_plans_updated'));
  } catch (e) {
    console.error('Failed to save plans locally:', e);
  }
}

export async function fetchWeeklyPlan(
  userId: string | undefined,
  weekStartDateStr: string
): Promise<WeeklyWorkoutPlan> {
  const localPlans = getLocalPlans();
  let plan = localPlans.find((p) => p.week_start_date === weekStartDateStr);

  if (userId && userId !== 'guest' && userId !== 'demo') {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('weekly_workout_plans')
        .select(`
          id,
          user_id,
          week_start_date,
          title,
          notes,
          created_at,
          updated_at,
          days:planned_workout_days(
            id,
            plan_id,
            user_id,
            scheduled_date,
            original_date,
            day_of_week,
            title,
            is_rest_day,
            status,
            rescheduled_to_date,
            completed_session_id,
            order_index,
            notes,
            created_at,
            updated_at,
            exercises:planned_workout_exercises(
              id,
              planned_day_id,
              exercise_id,
              exercise_name,
              muscle_group,
              order_index,
              planned_sets,
              target_reps,
              target_weight_kg,
              target_rest_seconds,
              notes,
              created_at
            )
          )
        `)
        .eq('user_id', userId)
        .eq('week_start_date', weekStartDateStr)
        .maybeSingle();

      if (!error && data) {
        plan = {
          id: data.id,
          user_id: data.user_id,
          week_start_date: data.week_start_date,
          title: data.title,
          notes: data.notes,
          created_at: data.created_at,
          updated_at: data.updated_at,
          days: (data.days || []).map((d: any) => ({
            ...d,
            exercises: (d.exercises || []).sort((a: any, b: any) => a.order_index - b.order_index),
          })).sort((a: any, b: any) => a.day_of_week - b.day_of_week),
        };
      }
    } catch (err) {
      console.warn('Supabase fetch weekly plan error:', err);
    }
  }

  // If no plan exists, initialize default customizable template for this week
  if (!plan) {
    const planId = `plan_${weekStartDateStr}_${Math.random().toString(36).substring(2, 7)}`;
    const uid = userId || 'guest';
    const days = createDefaultWeeklyDays(planId, uid, weekStartDateStr);

    plan = {
      id: planId,
      user_id: uid,
      week_start_date: weekStartDateStr,
      title: `Workout Routine (Week of ${weekStartDateStr})`,
      notes: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      days,
    };

    // Cache locally
    const filtered = localPlans.filter((p) => p.week_start_date !== weekStartDateStr);
    filtered.push(plan);
    saveLocalPlans(filtered);
  }

  // Automatically check missed workouts against today's date
  const todayStr = new Date().toISOString().split('T')[0];
  if (plan.days) {
    let changed = false;
    for (const d of plan.days) {
      if (!d.is_rest_day && d.status === 'planned' && d.scheduled_date < todayStr) {
        d.status = 'missed';
        changed = true;
      }
    }
    if (changed) {
      saveWeeklyPlan(plan);
    }
  }

  return plan;
}

export async function saveWeeklyPlan(plan: WeeklyWorkoutPlan): Promise<boolean> {
  // Update local storage
  const local = getLocalPlans();
  const filtered = local.filter((p) => p.week_start_date !== plan.week_start_date);
  filtered.push(plan);
  saveLocalPlans(filtered);

  // Sync to Supabase if authenticated
  if (plan.user_id && plan.user_id !== 'guest' && plan.user_id !== 'demo') {
    try {
      const supabase = createClient();
      await supabase
        .from('weekly_workout_plans')
        .upsert({
          id: plan.id,
          user_id: plan.user_id,
          week_start_date: plan.week_start_date,
          title: plan.title,
          notes: plan.notes,
          updated_at: new Date().toISOString(),
        });

      if (plan.days) {
        for (const day of plan.days) {
          await supabase
            .from('planned_workout_days')
            .upsert({
              id: day.id,
              plan_id: plan.id,
              user_id: plan.user_id,
              scheduled_date: day.scheduled_date,
              original_date: day.original_date,
              day_of_week: day.day_of_week,
              title: day.title,
              is_rest_day: day.is_rest_day,
              status: day.status,
              rescheduled_to_date: day.rescheduled_to_date,
              completed_session_id: day.completed_session_id,
              order_index: day.order_index,
              notes: day.notes,
              updated_at: new Date().toISOString(),
            });

          if (day.exercises) {
            for (const ex of day.exercises) {
              await supabase
                .from('planned_workout_exercises')
                .upsert({
                  id: ex.id,
                  planned_day_id: day.id,
                  exercise_id: ex.exercise_id,
                  exercise_name: ex.exercise_name,
                  muscle_group: ex.muscle_group,
                  order_index: ex.order_index,
                  planned_sets: ex.planned_sets,
                  target_reps: ex.target_reps,
                  target_weight_kg: ex.target_weight_kg,
                  target_rest_seconds: ex.target_rest_seconds,
                  notes: ex.notes,
                });
            }
          }
        }
      }
    } catch (err) {
      console.warn('Supabase save plan error:', err);
    }
  }

  return true;
}

// Duplicate a previous week's plan into target week
export async function duplicatePlanToWeek(
  sourceWeekStart: string,
  targetWeekStart: string,
  userId?: string
): Promise<WeeklyWorkoutPlan> {
  const sourcePlan = await fetchWeeklyPlan(userId, sourceWeekStart);
  const newPlanId = `plan_${targetWeekStart}_${Math.random().toString(36).substring(2, 7)}`;
  const uid = userId || 'guest';

  const newDays: PlannedWorkoutDay[] = (sourcePlan.days || []).map((d, idx) => {
    const targetDate = getDayDateString(targetWeekStart, d.day_of_week);
    const dayId = `pday_${targetWeekStart}_${idx}_${Math.random().toString(36).substring(2, 6)}`;
    const exercises: PlannedWorkoutExercise[] = (d.exercises || []).map((ex, exIdx) => ({
      ...ex,
      id: `pex_${dayId}_${exIdx}`,
      planned_day_id: dayId,
    }));

    return {
      ...d,
      id: dayId,
      plan_id: newPlanId,
      user_id: uid,
      scheduled_date: targetDate,
      original_date: targetDate,
      status: d.is_rest_day ? 'rest' : 'planned',
      rescheduled_to_date: null,
      completed_session_id: null,
      exercises,
    };
  });

  const duplicatedPlan: WeeklyWorkoutPlan = {
    id: newPlanId,
    user_id: uid,
    week_start_date: targetWeekStart,
    title: `Copy of ${sourcePlan.title || 'Workout Plan'}`,
    notes: sourcePlan.notes,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    days: newDays,
  };

  await saveWeeklyPlan(duplicatedPlan);
  return duplicatedPlan;
}

// Reschedule a workout day to a future date
export async function rescheduleWorkoutDay(
  dayId: string,
  newDateStr: string,
  userId?: string
): Promise<{ success: boolean; conflictDay?: PlannedWorkoutDay }> {
  const weekStart = getMondayOfWeek(new Date(newDateStr));
  const plan = await fetchWeeklyPlan(userId, weekStart);

  // Check if target day already has a non-rest planned workout
  const conflict = plan.days?.find((d) => d.scheduled_date === newDateStr && !d.is_rest_day && d.id !== dayId);

  // Find source day across all cached plans
  const allPlans = getLocalPlans();
  let foundDay: PlannedWorkoutDay | null = null;
  let sourcePlan: WeeklyWorkoutPlan | null = null;

  for (const p of allPlans) {
    const match = p.days?.find((d) => d.id === dayId);
    if (match) {
      foundDay = match;
      sourcePlan = p;
      break;
    }
  }

  if (foundDay && sourcePlan) {
    foundDay.rescheduled_to_date = newDateStr;
    foundDay.status = 'rescheduled';
    await saveWeeklyPlan(sourcePlan);
  }

  return { success: true, conflictDay: conflict };
}

// Get missed workouts that require attention
export async function getMissedWorkouts(userId?: string): Promise<PlannedWorkoutDay[]> {
  const currentWeek = getMondayOfWeek(new Date());
  const plan = await fetchWeeklyPlan(userId, currentWeek);
  const todayStr = new Date().toISOString().split('T')[0];

  const missed: PlannedWorkoutDay[] = [];
  for (const d of plan.days || []) {
    if (!d.is_rest_day && (d.status === 'missed' || (d.status === 'planned' && d.scheduled_date < todayStr))) {
      missed.push(d);
    }
  }
  return missed;
}

export interface PlanAdherenceStats {
  totalPlannedWorkouts: number;
  totalCompletedWorkouts: number;
  totalMissedWorkouts: number;
  totalRescheduledWorkouts: number;
  adherencePercentage: number;
  weeklyAdherence: {
    weekStart: string;
    plannedCount: number;
    completedCount: number;
    missedCount: number;
  }[];
}

export async function calculatePlanAdherenceStats(userId?: string): Promise<PlanAdherenceStats> {
  const allPlans = getLocalPlans();
  const currentWeek = getMondayOfWeek(new Date());
  
  // Ensure current week is in list
  if (!allPlans.some((p) => p.week_start_date === currentWeek)) {
    const curPlan = await fetchWeeklyPlan(userId, currentWeek);
    allPlans.push(curPlan);
  }

  let totalPlanned = 0;
  let totalCompleted = 0;
  let totalMissed = 0;
  let totalRescheduled = 0;

  const weeklyAdherence = allPlans
    .sort((a, b) => a.week_start_date.localeCompare(b.week_start_date))
    .slice(-8) // last 8 weeks
    .map((plan) => {
      let pCount = 0;
      let cCount = 0;
      let mCount = 0;

      for (const d of plan.days || []) {
        if (!d.is_rest_day) {
          pCount++;
          if (d.status === 'completed') {
            cCount++;
          } else if (d.status === 'missed' || (d.status === 'planned' && d.scheduled_date < new Date().toISOString().split('T')[0])) {
            mCount++;
          } else if (d.status === 'rescheduled') {
            totalRescheduled++;
          }
        }
      }

      totalPlanned += pCount;
      totalCompleted += cCount;
      totalMissed += mCount;

      return {
        weekStart: plan.week_start_date,
        plannedCount: pCount,
        completedCount: cCount,
        missedCount: mCount,
      };
    });

  const adherencePercentage =
    totalPlanned > 0 ? Math.round((totalCompleted / totalPlanned) * 100) : 0;

  return {
    totalPlannedWorkouts: totalPlanned,
    totalCompletedWorkouts: totalCompleted,
    totalMissedWorkouts: totalMissed,
    totalRescheduledWorkouts: totalRescheduled,
    adherencePercentage,
    weeklyAdherence,
  };
}
