// GYM HUB: Workout Performance Analytics Service
// Comprehensive analytics engine for muscle performance, exercise progression, and multi-exercise comparisons.

import { createClient } from '../supabase/client';
import { WorkoutSession, WorkoutSet, WorkoutAnalysis } from '../types/database';

export type MuscleGroupName = 'Chest' | 'Back' | 'Biceps' | 'Triceps' | 'Shoulders' | 'Legs';

export interface ExerciseDefinition {
  id: string;
  name: string;
  category: 'Barbell' | 'Dumbbell' | 'Cable' | 'Machine' | 'Bodyweight';
  primaryMuscle: MuscleGroupName;
  secondaryMuscles: MuscleGroupName[];
  isAssistedOrBodyweight?: boolean;
}

export const EXERCISE_CATALOG: ExerciseDefinition[] = [
  // Chest
  { id: 'b0000000-0000-0000-0000-000000000001', name: 'Barbell Bench Press', category: 'Barbell', primaryMuscle: 'Chest', secondaryMuscles: ['Triceps', 'Shoulders'] },
  { id: 'b0000000-0000-0000-0000-000000000002', name: 'Incline Dumbbell Press', category: 'Dumbbell', primaryMuscle: 'Chest', secondaryMuscles: ['Triceps', 'Shoulders'] },
  { id: 'b0000000-0000-0000-0000-000000000003', name: 'Dumbbell Bench Press', category: 'Dumbbell', primaryMuscle: 'Chest', secondaryMuscles: ['Triceps', 'Shoulders'] },
  { id: 'b0000000-0000-0000-0000-000000000004', name: 'Cable Chest Fly', category: 'Cable', primaryMuscle: 'Chest', secondaryMuscles: ['Shoulders'] },
  { id: 'b0000000-0000-0000-0000-000000000005', name: 'Incline Barbell Bench Press', category: 'Barbell', primaryMuscle: 'Chest', secondaryMuscles: ['Triceps', 'Shoulders'] },
  { id: 'b0000000-0000-0000-0000-000000000006', name: 'Dips (Chest Focus)', category: 'Bodyweight', primaryMuscle: 'Chest', secondaryMuscles: ['Triceps', 'Shoulders'] },

  // Back
  { id: 'b0000000-0000-0000-0000-000000000010', name: 'Lat Pulldown', category: 'Cable', primaryMuscle: 'Back', secondaryMuscles: ['Biceps'] },
  { id: 'b0000000-0000-0000-0000-000000000011', name: 'Seated Cable Row', category: 'Cable', primaryMuscle: 'Back', secondaryMuscles: ['Biceps'] },
  { id: 'b0000000-0000-0000-0000-000000000012', name: 'Barbell Bent Over Row', category: 'Barbell', primaryMuscle: 'Back', secondaryMuscles: ['Biceps'] },
  { id: 'b0000000-0000-0000-0000-000000000013', name: 'Deadlift', category: 'Barbell', primaryMuscle: 'Back', secondaryMuscles: ['Legs'] },
  { id: 'b0000000-0000-0000-0000-000000000014', name: 'Single-Arm Dumbbell Row', category: 'Dumbbell', primaryMuscle: 'Back', secondaryMuscles: ['Biceps'] },
  { id: 'b0000000-0000-0000-0000-000000000015', name: 'T-Bar Row', category: 'Machine', primaryMuscle: 'Back', secondaryMuscles: ['Biceps'] },

  // Biceps
  { id: 'b0000000-0000-0000-0000-000000000020', name: 'Barbell Bicep Curl', category: 'Barbell', primaryMuscle: 'Biceps', secondaryMuscles: [] },
  { id: 'b0000000-0000-0000-0000-000000000021', name: 'Dumbbell Bicep Curl', category: 'Dumbbell', primaryMuscle: 'Biceps', secondaryMuscles: [] },
  { id: 'b0000000-0000-0000-0000-000000000022', name: 'Dumbbell Hammer Curl', category: 'Dumbbell', primaryMuscle: 'Biceps', secondaryMuscles: [] },
  { id: 'b0000000-0000-0000-0000-000000000023', name: 'Preacher Curl', category: 'Machine', primaryMuscle: 'Biceps', secondaryMuscles: [] },
  { id: 'b0000000-0000-0000-0000-000000000024', name: 'Incline Dumbbell Curl', category: 'Dumbbell', primaryMuscle: 'Biceps', secondaryMuscles: [] },

  // Triceps
  { id: 'b0000000-0000-0000-0000-000000000030', name: 'Triceps Rope Pushdown', category: 'Cable', primaryMuscle: 'Triceps', secondaryMuscles: [] },
  { id: 'b0000000-0000-0000-0000-000000000031', name: 'Overhead Dumbbell Extension', category: 'Dumbbell', primaryMuscle: 'Triceps', secondaryMuscles: [] },
  { id: 'b0000000-0000-0000-0000-000000000032', name: 'Skull Crusher (Barbell / EZ)', category: 'Barbell', primaryMuscle: 'Triceps', secondaryMuscles: [] },
  { id: 'b0000000-0000-0000-0000-000000000033', name: 'Close-Grip Bench Press', category: 'Barbell', primaryMuscle: 'Triceps', secondaryMuscles: ['Chest', 'Shoulders'] },
  { id: 'b0000000-0000-0000-0000-000000000034', name: 'Cable Straight-Bar Pushdown', category: 'Cable', primaryMuscle: 'Triceps', secondaryMuscles: [] },

  // Shoulders
  { id: 'b0000000-0000-0000-0000-000000000040', name: 'Dumbbell Shoulder Press', category: 'Dumbbell', primaryMuscle: 'Shoulders', secondaryMuscles: ['Triceps'] },
  { id: 'b0000000-0000-0000-0000-000000000041', name: 'Overhead Barbell Press (OHP)', category: 'Barbell', primaryMuscle: 'Shoulders', secondaryMuscles: ['Triceps'] },
  { id: 'b0000000-0000-0000-0000-000000000042', name: 'Dumbbell Lateral Raise', category: 'Dumbbell', primaryMuscle: 'Shoulders', secondaryMuscles: [] },
  { id: 'b0000000-0000-0000-0000-000000000043', name: 'Cable Lateral Raise', category: 'Cable', primaryMuscle: 'Shoulders', secondaryMuscles: [] },
  { id: 'b0000000-0000-0000-0000-000000000044', name: 'Rear Delt Reverse Fly', category: 'Machine', primaryMuscle: 'Shoulders', secondaryMuscles: ['Back'] },
  { id: 'b0000000-0000-0000-0000-000000000045', name: 'Face Pull', category: 'Cable', primaryMuscle: 'Shoulders', secondaryMuscles: ['Back'] },

  // Legs
  { id: 'b0000000-0000-0000-0000-000000000050', name: 'Barbell Squat', category: 'Barbell', primaryMuscle: 'Legs', secondaryMuscles: ['Back'] },
  { id: 'b0000000-0000-0000-0000-000000000051', name: 'Leg Press', category: 'Machine', primaryMuscle: 'Legs', secondaryMuscles: [] },
  { id: 'b0000000-0000-0000-0000-000000000052', name: 'Leg Extension', category: 'Machine', primaryMuscle: 'Legs', secondaryMuscles: [] },
  { id: 'b0000000-0000-0000-0000-000000000053', name: 'Lying Leg Curl', category: 'Machine', primaryMuscle: 'Legs', secondaryMuscles: [] },
  { id: 'b0000000-0000-0000-0000-000000000054', name: 'Standing Calf Raise', category: 'Machine', primaryMuscle: 'Legs', secondaryMuscles: [] },
  { id: 'b0000000-0000-0000-0000-000000000055', name: 'Romanian Deadlift (RDL)', category: 'Barbell', primaryMuscle: 'Legs', secondaryMuscles: ['Back'] },
  { id: 'b0000000-0000-0000-0000-000000000056', name: 'Bulgarian Split Squat', category: 'Dumbbell', primaryMuscle: 'Legs', secondaryMuscles: [] },
];

export const MUSCLE_GROUPS: MuscleGroupName[] = [
  'Chest',
  'Back',
  'Biceps',
  'Triceps',
  'Shoulders',
  'Legs',
];

export type PerformanceStatus = 'Improving' | 'Stable' | 'Declining' | 'Insufficient Data';

export interface MuscleGroupStats {
  name: MuscleGroupName;
  sessionsCount: number;
  totalSets: number;
  totalReps: number;
  totalVolumeKg: number;
  primaryVolumeKg: number;
  secondaryVolumeKg: number;
  mostRecentDate: string | null;
  bestPerformance: string;
  previousVolumeKg: number;
  absoluteChangeKg: number;
  percentChange: number | null;
  status: PerformanceStatus;
  statusReason: string;
  topExercises: { name: string; volumeKg: number; sets: number }[];
}

export interface EnrichedWorkoutSet extends WorkoutSet {
  exercise_name?: string;
  primary_muscle?: MuscleGroupName;
  secondary_muscles?: MuscleGroupName[];
}

export interface EnrichedWorkoutSession extends WorkoutSession {
  sets: EnrichedWorkoutSet[];
}

export interface ExerciseDataPoint {
  date: string;
  displayDate: string;
  sessionId: string;
  weightKg: number;
  reps: number;
  volumeKg: number;
  setsCount: number;
  estimated1RM: number | null;
  avgRpe: number | null;
  isPR?: boolean;
}

export interface PersonalRecordItem {
  date: string;
  displayDate: string;
  weightKg: number;
  reps: number;
  estimated1RM: number;
  notes: string;
}

// 1RM Calculation: Brzycki Formula weight / (1.0278 - 0.0278 * reps)
// Suitable for reps 1..12. If reps == 1, 1RM = weight.
export function calculateEstimated1RM(weightKg: number, reps: number): number | null {
  if (weightKg <= 0 || reps <= 0) return null;
  if (reps === 1) return Math.round(weightKg * 10) / 10;
  if (reps > 12) {
    // Diminishing reliability for high reps
    return Math.round((weightKg * (1 + reps / 30)) * 10) / 10;
  }
  const brzycki = weightKg / (1.0278 - 0.0278 * reps);
  return Math.round(brzycki * 10) / 10;
}

// Helper to match an exercise by ID or Name
export function resolveExerciseDefinition(exerciseId?: string, exerciseName?: string): ExerciseDefinition {
  if (exerciseId) {
    const found = EXERCISE_CATALOG.find((e) => e.id === exerciseId);
    if (found) return found;
  }
  if (exerciseName) {
    const cleanName = exerciseName.trim().toLowerCase();
    const found = EXERCISE_CATALOG.find(
      (e) => e.name.toLowerCase() === cleanName || cleanName.includes(e.name.toLowerCase()) || e.name.toLowerCase().includes(cleanName)
    );
    if (found) return found;

    // Muscle keywords inference
    if (cleanName.includes('bench') || cleanName.includes('chest') || cleanName.includes('fly')) {
      return { id: exerciseId || 'custom-chest', name: exerciseName, category: 'Barbell', primaryMuscle: 'Chest', secondaryMuscles: ['Triceps', 'Shoulders'] };
    }
    if (cleanName.includes('row') || cleanName.includes('pulldown') || cleanName.includes('lat') || cleanName.includes('deadlift')) {
      return { id: exerciseId || 'custom-back', name: exerciseName, category: 'Barbell', primaryMuscle: 'Back', secondaryMuscles: ['Biceps'] };
    }
    if (cleanName.includes('bicep') || cleanName.includes('curl')) {
      return { id: exerciseId || 'custom-biceps', name: exerciseName, category: 'Dumbbell', primaryMuscle: 'Biceps', secondaryMuscles: [] };
    }
    if (cleanName.includes('tricep') || cleanName.includes('pushdown') || cleanName.includes('skull')) {
      return { id: exerciseId || 'custom-triceps', name: exerciseName, category: 'Cable', primaryMuscle: 'Triceps', secondaryMuscles: [] };
    }
    if (cleanName.includes('shoulder') || cleanName.includes('press') || cleanName.includes('lateral') || cleanName.includes('delt')) {
      return { id: exerciseId || 'custom-shoulders', name: exerciseName, category: 'Dumbbell', primaryMuscle: 'Shoulders', secondaryMuscles: ['Triceps'] };
    }
    if (cleanName.includes('squat') || cleanName.includes('leg') || cleanName.includes('calf') || cleanName.includes('lunge')) {
      return { id: exerciseId || 'custom-legs', name: exerciseName, category: 'Barbell', primaryMuscle: 'Legs', secondaryMuscles: ['Back'] };
    }
  }

  return {
    id: exerciseId || 'unknown-ex',
    name: exerciseName || 'General Exercise',
    category: 'Barbell',
    primaryMuscle: 'Chest',
    secondaryMuscles: [],
  };
}

// Initial realistic seed workouts to ensure user immediately sees rich, functional data
const DEFAULT_SESSIONS_STORAGE_KEY = 'gymhub_saved_workout_sessions_v2';
const DEFAULT_ANALYSES_STORAGE_KEY = 'gymhub_saved_workout_analyses_v2';

export function getInitialSeedSessions(): EnrichedWorkoutSession[] {
  // Zero mock data: return empty array so only real user sessions appear
  return [];
}

// Fetch all sessions (Supabase + localStorage fallback)
export async function fetchUserWorkoutSessions(userId?: string): Promise<EnrichedWorkoutSession[]> {
  let sessions: EnrichedWorkoutSession[] = [];

  if (userId && userId !== 'guest' && userId !== 'demo') {
    try {
      const supabase = createClient();
      const { data: dbSessions, error } = await supabase
        .from('workout_sessions')
        .select(`
          id,
          user_id,
          title,
          start_time,
          end_time,
          duration_seconds,
          notes,
          logged_at,
          completed,
          sets:workout_sets(
            id,
            session_id,
            exercise_id,
            set_number,
            set_type,
            weight_kg,
            reps,
            rpe,
            completed,
            created_at,
            exercise:exercises(id, name, primary_muscle, secondary_muscles)
          )
        `)
        .eq('user_id', userId)
        .order('logged_at', { ascending: true });

      if (!error && dbSessions && dbSessions.length > 0) {
        sessions = dbSessions.map((s: any) => ({
          id: s.id,
          user_id: s.user_id,
          title: s.title,
          start_time: s.start_time,
          end_time: s.end_time,
          duration_seconds: s.duration_seconds,
          notes: s.notes,
          logged_at: s.logged_at || s.start_time?.split('T')[0] || new Date().toISOString().split('T')[0],
          completed: s.completed,
          sets: (s.sets || []).map((set: any) => {
            const def = resolveExerciseDefinition(set.exercise_id, set.exercise?.name);
            return {
              id: set.id,
              session_id: set.session_id,
              exercise_id: set.exercise_id,
              exercise_name: set.exercise?.name || def.name,
              set_number: set.set_number,
              set_type: set.set_type,
              weight_kg: Number(set.weight_kg),
              reps: Number(set.reps),
              rpe: set.rpe ? Number(set.rpe) : undefined,
              completed: set.completed ?? true,
              created_at: set.created_at,
              primary_muscle: def.primaryMuscle,
              secondary_muscles: def.secondaryMuscles,
            };
          }),
        }));
      }
    } catch (err) {
      console.warn('Could not load sessions from Supabase, checking local cache:', err);
    }
  }

  // Fallback to local storage or initial rich seed
  if (sessions.length === 0 && typeof window !== 'undefined') {
    const rawLocal = localStorage.getItem(DEFAULT_SESSIONS_STORAGE_KEY);
    if (rawLocal) {
      try {
        sessions = JSON.parse(rawLocal);
      } catch (e) {
        console.error('Failed to parse local sessions:', e);
      }
    }
    if (!sessions) {
      sessions = [];
    }
  }

  // Ensure exercise mappings are completely enriched
  return sessions.map((sess) => ({
    ...sess,
    sets: (sess.sets || []).map((st) => {
      const def = resolveExerciseDefinition(st.exercise_id, st.exercise_name);
      return {
        ...st,
        exercise_name: st.exercise_name || def.name,
        primary_muscle: def.primaryMuscle,
        secondary_muscles: def.secondaryMuscles,
      };
    }),
  }));
}

// Save a completed session locally so the user instantly sees analytics updates
export function saveSessionToLocalCache(session: EnrichedWorkoutSession) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(DEFAULT_SESSIONS_STORAGE_KEY);
    const existing: EnrichedWorkoutSession[] = raw ? JSON.parse(raw) : [];
    const updated = [
      ...existing.filter((s) => s.id !== session.id),
      session,
    ].sort((a, b) => new Date(a.logged_at).getTime() - new Date(b.logged_at).getTime());
    localStorage.setItem(DEFAULT_SESSIONS_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save session to local cache:', err);
  }
}

// Filter sessions within a given date interval
export function filterSessionsByDate(
  sessions: EnrichedWorkoutSession[],
  startDate: Date,
  endDate: Date
): EnrichedWorkoutSession[] {
  const startMs = startDate.getTime();
  const endMs = endDate.getTime();

  return sessions.filter((s) => {
    const sDate = new Date(s.logged_at || s.start_time);
    const ms = sDate.getTime();
    return ms >= startMs && ms <= endMs;
  });
}

// -------------------------------------------------------------
// MUSCLE GROUP STATS & PROGRESSION
// -------------------------------------------------------------
export function calculateMuscleGroupStats(
  sessions: EnrichedWorkoutSession[],
  currentStart: Date,
  currentEnd: Date
): MuscleGroupStats[] {
  // Period duration in days
  const periodDurationMs = currentEnd.getTime() - currentStart.getTime();
  const previousStart = new Date(currentStart.getTime() - periodDurationMs);
  const previousEnd = new Date(currentStart.getTime() - 1); // up to start of current

  const currentSessions = filterSessionsByDate(sessions, currentStart, currentEnd);
  const previousSessions = filterSessionsByDate(sessions, previousStart, previousEnd);

  // Helper to extract muscle performance metrics
  const getMetricsForMuscle = (muscle: MuscleGroupName, targetSessions: EnrichedWorkoutSession[]) => {
    let sessionsWithMuscle = 0;
    let totalSets = 0;
    let totalReps = 0;
    let primaryVolume = 0;
    let secondaryVolume = 0;
    let bestWeight = 0;
    let best1RM = 0;
    let mostRecentDate: string | null = null;
    const exerciseVolumeMap: Record<string, { volume: number; sets: number }> = {};

    for (const sess of targetSessions) {
      let sessionHit = false;
      const sDateStr = sess.logged_at || sess.start_time.split('T')[0];

      for (const st of sess.sets) {
        if (!st.completed) continue;

        const isPrimary = st.primary_muscle === muscle;
        const isSecondary = st.secondary_muscles?.includes(muscle);

        if (isPrimary || isSecondary) {
          sessionHit = true;
          totalSets += 1;
          totalReps += st.reps;

          const rawVol = st.weight_kg * st.reps;
          if (isPrimary) {
            primaryVolume += rawVol;
          } else {
            // Secondary muscle volume contribution (50% proportional credit)
            secondaryVolume += rawVol * 0.5;
          }

          if (st.weight_kg > bestWeight) {
            bestWeight = st.weight_kg;
          }

          const e1rm = calculateEstimated1RM(st.weight_kg, st.reps) || 0;
          if (e1rm > best1RM) {
            best1RM = e1rm;
          }

          const exName = st.exercise_name || 'Exercise';
          if (!exerciseVolumeMap[exName]) {
            exerciseVolumeMap[exName] = { volume: 0, sets: 0 };
          }
          exerciseVolumeMap[exName].volume += isPrimary ? rawVol : rawVol * 0.5;
          exerciseVolumeMap[exName].sets += 1;
        }
      }

      if (sessionHit) {
        sessionsWithMuscle += 1;
        if (!mostRecentDate || new Date(sDateStr) > new Date(mostRecentDate)) {
          mostRecentDate = sDateStr;
        }
      }
    }

    const totalVolume = primaryVolume + secondaryVolume;
    return {
      sessionsCount: sessionsWithMuscle,
      totalSets,
      totalReps,
      primaryVolumeKg: Math.round(primaryVolume),
      secondaryVolumeKg: Math.round(secondaryVolume),
      totalVolumeKg: Math.round(totalVolume),
      bestWeight,
      best1RM,
      mostRecentDate,
      exerciseVolumeMap,
    };
  };

  return MUSCLE_GROUPS.map((muscle) => {
    const cur = getMetricsForMuscle(muscle, currentSessions);
    const prev = getMetricsForMuscle(muscle, previousSessions);

    const absChange = cur.totalVolumeKg - prev.totalVolumeKg;
    let pctChange: number | null = null;
    if (prev.totalVolumeKg > 0) {
      pctChange = Math.round(((cur.totalVolumeKg - prev.totalVolumeKg) / prev.totalVolumeKg) * 1000) / 10;
    }

    // Determine performance status using strict deterministic rules
    let status: PerformanceStatus = 'Insufficient Data';
    let statusReason = 'No prior comparative workouts recorded for this muscle.';

    if (cur.sessionsCount === 0 && prev.sessionsCount === 0) {
      status = 'Insufficient Data';
      statusReason = 'No sessions logged in current or previous period.';
    } else if (cur.sessionsCount === 0 && prev.sessionsCount > 0) {
      // Do not mark declining merely because it was not performed in this specific window
      status = 'Stable';
      statusReason = 'No workouts logged in current window; maintenance baseline preserved.';
    } else if (prev.sessionsCount === 0 && cur.sessionsCount > 0) {
      status = 'Improving';
      statusReason = 'Active training initiated with healthy initial stimulus.';
    } else if (pctChange !== null) {
      if (pctChange >= 3.0) {
        status = 'Improving';
        statusReason = `Volume increased by +${pctChange}% over the previous period.`;
      } else if (pctChange <= -3.0) {
        status = 'Declining';
        statusReason = `Volume decreased by ${pctChange}% compared to previous period.`;
      } else {
        status = 'Stable';
        statusReason = 'Consistent volume maintained within ±3% tolerance.';
      }
    }

    // Best recorded string
    const bestPerformance = cur.bestWeight > 0
      ? `${cur.bestWeight} kg (${cur.best1RM} kg e1RM)`
      : prev.bestWeight > 0
      ? `${prev.bestWeight} kg (prior period)`
      : 'No data';

    // Top exercises
    const topExercises = Object.entries(cur.exerciseVolumeMap)
      .map(([name, data]) => ({ name, volumeKg: Math.round(data.volume), sets: data.sets }))
      .sort((a, b) => b.volumeKg - a.volumeKg)
      .slice(0, 3);

    return {
      name: muscle,
      sessionsCount: cur.sessionsCount,
      totalSets: cur.totalSets,
      totalReps: cur.totalReps,
      totalVolumeKg: cur.totalVolumeKg,
      primaryVolumeKg: cur.primaryVolumeKg,
      secondaryVolumeKg: cur.secondaryVolumeKg,
      mostRecentDate: cur.mostRecentDate,
      bestPerformance,
      previousVolumeKg: prev.totalVolumeKg,
      absoluteChangeKg: absChange,
      percentChange: pctChange,
      status,
      statusReason,
      topExercises,
    };
  });
}

// -------------------------------------------------------------
// INDIVIDUAL EXERCISE ANALYTICS
// -------------------------------------------------------------
export interface ExerciseAnalyticsReport {
  exerciseName: string;
  category: string;
  primaryMuscle: MuscleGroupName;
  secondaryMuscles: MuscleGroupName[];
  totalWorkouts: number;
  totalSets: number;
  totalReps: number;
  totalVolumeKg: number;
  allTimeBestWeightKg: number;
  allTimeBestReps: number;
  allTimeBest1RM: number;
  timeSeries: ExerciseDataPoint[];
  personalRecords: PersonalRecordItem[];
  availableWorkouts: { sessionId: string; date: string; displayDate: string; sets: EnrichedWorkoutSet[] }[];
}

export function calculateExerciseAnalytics(
  sessions: EnrichedWorkoutSession[],
  targetExerciseName: string
): ExerciseAnalyticsReport {
  const cleanTarget = targetExerciseName.trim().toLowerCase();
  const def = resolveExerciseDefinition(undefined, targetExerciseName);

  const timeSeriesMap = new Map<string, {
    date: string;
    displayDate: string;
    sessionId: string;
    topWeight: number;
    totalReps: number;
    volume: number;
    setsCount: number;
    best1RM: number | null;
    rpeList: number[];
  }>();

  const prList: PersonalRecordItem[] = [];
  let highestWeightSoFar = 0;
  let highest1RMSoFar = 0;

  const workoutDrilldowns: { sessionId: string; date: string; displayDate: string; sets: EnrichedWorkoutSet[] }[] = [];

  let totalSets = 0;
  let totalReps = 0;
  let totalVolumeKg = 0;
  let allTimeBestWeightKg = 0;
  let allTimeBestReps = 0;
  let allTimeBest1RM = 0;

  // Process sessions chronologically
  const sortedSessions = [...sessions].sort(
    (a, b) => new Date(a.logged_at || a.start_time).getTime() - new Date(b.logged_at || b.start_time).getTime()
  );

  for (const sess of sortedSessions) {
    const sDate = sess.logged_at || sess.start_time.split('T')[0];
    const displayDate = new Date(sDate).toLocaleDateString([], { month: 'short', day: 'numeric' });

    const matchingSets = sess.sets.filter((st) => {
      const stName = (st.exercise_name || '').trim().toLowerCase();
      return stName === cleanTarget || stName.includes(cleanTarget) || cleanTarget.includes(stName);
    });

    if (matchingSets.length === 0) continue;

    workoutDrilldowns.push({
      sessionId: sess.id,
      date: sDate,
      displayDate,
      sets: matchingSets,
    });

    let sessionTopWeight = 0;
    let sessionTotalReps = 0;
    let sessionVolume = 0;
    let sessionBest1RM: number | null = null;
    const rpes: number[] = [];

    for (const st of matchingSets) {
      if (!st.completed) continue;

      totalSets += 1;
      totalReps += st.reps;
      const vol = st.weight_kg * st.reps;
      totalVolumeKg += vol;

      sessionTotalReps += st.reps;
      sessionVolume += vol;

      if (st.weight_kg > sessionTopWeight) {
        sessionTopWeight = st.weight_kg;
      }
      if (st.weight_kg > allTimeBestWeightKg) {
        allTimeBestWeightKg = st.weight_kg;
        allTimeBestReps = st.reps;
      }

      const e1rm = calculateEstimated1RM(st.weight_kg, st.reps);
      if (e1rm !== null) {
        if (sessionBest1RM === null || e1rm > sessionBest1RM) {
          sessionBest1RM = e1rm;
        }
        if (e1rm > allTimeBest1RM) {
          allTimeBest1RM = e1rm;
        }
      }

      if (st.rpe !== undefined && st.rpe !== null) {
        rpes.push(st.rpe);
      }
    }

    // Check PR milestone
    let isPR = false;
    if (sessionTopWeight > highestWeightSoFar && sessionTopWeight > 0) {
      highestWeightSoFar = sessionTopWeight;
      isPR = true;
      prList.push({
        date: sDate,
        displayDate,
        weightKg: sessionTopWeight,
        reps: matchingSets.find((s) => s.weight_kg === sessionTopWeight)?.reps || 1,
        estimated1RM: sessionBest1RM || sessionTopWeight,
        notes: `New Weight PR: ${sessionTopWeight} kg`,
      });
    } else if (sessionBest1RM !== null && sessionBest1RM > highest1RMSoFar) {
      highest1RMSoFar = sessionBest1RM;
      isPR = true;
      prList.push({
        date: sDate,
        displayDate,
        weightKg: sessionTopWeight,
        reps: matchingSets.find((s) => s.weight_kg === sessionTopWeight)?.reps || 1,
        estimated1RM: sessionBest1RM,
        notes: `New Estimated 1RM PR: ${sessionBest1RM} kg`,
      });
    }

    timeSeriesMap.set(`${sDate}_${sess.id}`, {
      date: sDate,
      displayDate,
      sessionId: sess.id,
      topWeight: sessionTopWeight,
      totalReps: sessionTotalReps,
      volume: sessionVolume,
      setsCount: matchingSets.length,
      best1RM: sessionBest1RM,
      rpeList: rpes,
    });
  }

  const timeSeries: ExerciseDataPoint[] = Array.from(timeSeriesMap.values()).map((item) => {
    const avgRpe = item.rpeList.length > 0
      ? Math.round((item.rpeList.reduce((a, b) => a + b, 0) / item.rpeList.length) * 10) / 10
      : null;

    return {
      date: item.date,
      displayDate: item.displayDate,
      sessionId: item.sessionId,
      weightKg: item.topWeight,
      reps: item.totalReps,
      volumeKg: Math.round(item.volume),
      setsCount: item.setsCount,
      estimated1RM: item.best1RM,
      avgRpe,
    };
  });

  return {
    exerciseName: def.name,
    category: def.category,
    primaryMuscle: def.primaryMuscle,
    secondaryMuscles: def.secondaryMuscles,
    totalWorkouts: workoutDrilldowns.length,
    totalSets,
    totalReps,
    totalVolumeKg: Math.round(totalVolumeKg),
    allTimeBestWeightKg,
    allTimeBestReps,
    allTimeBest1RM,
    timeSeries,
    personalRecords: prList,
    availableWorkouts: workoutDrilldowns.reverse(),
  };
}

// -------------------------------------------------------------
// EXERCISE VARIATION COMPARISON STUDIO
// -------------------------------------------------------------
export interface ComparisonSeriesPoint {
  date: string;
  displayDate: string;
  [exerciseKey: string]: any; // e.g. "Flat Bench Press_weight"
}

export interface ComparisonStudioResult {
  exercises: ExerciseAnalyticsReport[];
  timeline: ComparisonSeriesPoint[];
  summaryTable: {
    exerciseName: string;
    category: string;
    muscle: string;
    totalSessions: number;
    totalVolumeKg: number;
    bestWeightKg: number;
    best1RMKg: number;
    avgRepsPerSet: number;
  }[];
}

export function buildComparisonStudioData(
  sessions: EnrichedWorkoutSession[],
  exerciseNames: string[]
): ComparisonStudioResult {
  const reports = exerciseNames.map((name) => calculateExerciseAnalytics(sessions, name));

  // Collect all unique session dates
  const dateMap = new Map<string, string>();
  for (const rep of reports) {
    for (const pt of rep.timeSeries) {
      dateMap.set(pt.date, pt.displayDate);
    }
  }

  const sortedDates = Array.from(dateMap.keys()).sort();

  const timeline: ComparisonSeriesPoint[] = sortedDates.map((date) => {
    const pt: ComparisonSeriesPoint = {
      date,
      displayDate: dateMap.get(date) || date,
    };

    for (const rep of reports) {
      const match = rep.timeSeries.find((ts) => ts.date === date);
      const safeKey = rep.exerciseName.replace(/\s+/g, '_');
      if (match) {
        pt[`${safeKey}_weight`] = match.weightKg;
        pt[`${safeKey}_reps`] = match.reps;
        pt[`${safeKey}_volume`] = match.volumeKg;
        pt[`${safeKey}_1rm`] = match.estimated1RM;
        pt[`${safeKey}_sets`] = match.setsCount;
      } else {
        // Do not fabricate missing dates
        pt[`${safeKey}_weight`] = null;
        pt[`${safeKey}_reps`] = null;
        pt[`${safeKey}_volume`] = null;
        pt[`${safeKey}_1rm`] = null;
        pt[`${safeKey}_sets`] = null;
      }
    }
    return pt;
  });

  const summaryTable = reports.map((r) => {
    const avgReps = r.totalSets > 0 ? Math.round((r.totalReps / r.totalSets) * 10) / 10 : 0;
    return {
      exerciseName: r.exerciseName,
      category: r.category,
      muscle: r.primaryMuscle,
      totalSessions: r.totalWorkouts,
      totalVolumeKg: r.totalVolumeKg,
      bestWeightKg: r.allTimeBestWeightKg,
      best1RMKg: r.allTimeBest1RM,
      avgRepsPerSet: avgReps,
    };
  });

  return {
    exercises: reports,
    timeline,
    summaryTable,
  };
}

// -------------------------------------------------------------
// OVERALL PERFORMANCE ANALYTICS
// -------------------------------------------------------------
export interface WeeklyMonthlyVolumePoint {
  label: string; // e.g. "Week 32" or "Aug 2026"
  volumeKg: number;
  sets: number;
  reps: number;
  sessionsCount: number;
}

export interface OverallAnalyticsOverview {
  totalVolumeKg: number;
  totalWorkingSets: number;
  totalReps: number;
  totalCompletedSessions: number;
  muscleDistribution: { name: MuscleGroupName; volumeKg: number; percentage: number; color: string }[];
  weeklyTrends: WeeklyMonthlyVolumePoint[];
  monthlyTrends: WeeklyMonthlyVolumePoint[];
  muscleFrequency: { muscle: MuscleGroupName; sessionCount: number }[];
  periodComparison: {
    currentVolume: number;
    previousVolume: number;
    volumePercentChange: number | null;
    volumeAbsoluteChange: number;
    currentSets: number;
    previousSets: number;
    setsPercentChange: number | null;
  };
}

export function calculateOverallAnalytics(
  sessions: EnrichedWorkoutSession[],
  currentStart: Date,
  currentEnd: Date
): OverallAnalyticsOverview {
  const periodDurationMs = currentEnd.getTime() - currentStart.getTime();
  const previousStart = new Date(currentStart.getTime() - periodDurationMs);
  const previousEnd = new Date(currentStart.getTime() - 1);

  const curSessions = filterSessionsByDate(sessions, currentStart, currentEnd);
  const prevSessions = filterSessionsByDate(sessions, previousStart, previousEnd);

  // Totals for current
  let totalVolumeKg = 0;
  let totalWorkingSets = 0;
  let totalReps = 0;
  const muscleVolMap: Record<MuscleGroupName, number> = {
    Chest: 0,
    Back: 0,
    Biceps: 0,
    Triceps: 0,
    Shoulders: 0,
    Legs: 0,
  };
  const muscleFreqMap: Record<MuscleGroupName, Set<string>> = {
    Chest: new Set(),
    Back: new Set(),
    Biceps: new Set(),
    Triceps: new Set(),
    Shoulders: new Set(),
    Legs: new Set(),
  };

  for (const s of curSessions) {
    for (const st of s.sets) {
      if (!st.completed) continue;
      const vol = st.weight_kg * st.reps;
      totalVolumeKg += vol;
      totalWorkingSets += 1;
      totalReps += st.reps;

      if (st.primary_muscle && muscleVolMap[st.primary_muscle] !== undefined) {
        muscleVolMap[st.primary_muscle] += vol;
        muscleFreqMap[st.primary_muscle].add(s.id);
      }
      if (st.secondary_muscles) {
        for (const sec of st.secondary_muscles) {
          if (muscleVolMap[sec] !== undefined) {
            muscleVolMap[sec] += vol * 0.5;
            muscleFreqMap[sec].add(s.id);
          }
        }
      }
    }
  }

  // Totals for previous
  let prevVolume = 0;
  let prevSets = 0;
  for (const s of prevSessions) {
    for (const st of s.sets) {
      if (!st.completed) continue;
      prevVolume += st.weight_kg * st.reps;
      prevSets += 1;
    }
  }

  const volDiff = totalVolumeKg - prevVolume;
  const volPct = prevVolume > 0 ? Math.round(((totalVolumeKg - prevVolume) / prevVolume) * 1000) / 10 : null;

  const setsDiff = totalWorkingSets - prevSets;
  const setsPct = prevSets > 0 ? Math.round(((totalWorkingSets - prevSets) / prevSets) * 1000) / 10 : null;

  // Muscle colors for console styling
  const muscleColors: Record<MuscleGroupName, string> = {
    Chest: '#F97316', // Orange
    Back: '#06B6D4',  // Cyan
    Biceps: '#10B981', // Emerald
    Triceps: '#8B5CF6', // Purple
    Shoulders: '#EC4899', // Pink
    Legs: '#EAB308', // Amber
  };

  const muscleDistribution = MUSCLE_GROUPS.map((m) => {
    const vol = Math.round(muscleVolMap[m]);
    const pct = totalVolumeKg > 0 ? Math.round((vol / totalVolumeKg) * 1000) / 10 : 0;
    return {
      name: m,
      volumeKg: vol,
      percentage: pct,
      color: muscleColors[m],
    };
  });

  const muscleFrequency = MUSCLE_GROUPS.map((m) => ({
    muscle: m,
    sessionCount: muscleFreqMap[m].size,
  }));

  // Weekly group breakdown
  const weeklyMap = new Map<string, { volume: number; sets: number; reps: number; sessions: Set<string> }>();
  for (const s of curSessions) {
    const d = new Date(s.logged_at || s.start_time);
    // Format week start date
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(d.setDate(diff));
    const label = `W/O ${monday.toLocaleDateString([], { month: 'short', day: 'numeric' })}`;

    if (!weeklyMap.has(label)) {
      weeklyMap.set(label, { volume: 0, sets: 0, reps: 0, sessions: new Set() });
    }
    const entry = weeklyMap.get(label)!;
    entry.sessions.add(s.id);
    for (const st of s.sets) {
      if (st.completed) {
        entry.volume += st.weight_kg * st.reps;
        entry.sets += 1;
        entry.reps += st.reps;
      }
    }
  }

  const weeklyTrends: WeeklyMonthlyVolumePoint[] = Array.from(weeklyMap.entries()).map(([label, val]) => ({
    label,
    volumeKg: Math.round(val.volume),
    sets: val.sets,
    reps: val.reps,
    sessionsCount: val.sessions.size,
  }));

  // Monthly group breakdown
  const monthlyMap = new Map<string, { volume: number; sets: number; reps: number; sessions: Set<string> }>();
  for (const s of curSessions) {
    const d = new Date(s.logged_at || s.start_time);
    const label = d.toLocaleDateString([], { month: 'short', year: 'numeric' });
    if (!monthlyMap.has(label)) {
      monthlyMap.set(label, { volume: 0, sets: 0, reps: 0, sessions: new Set() });
    }
    const entry = monthlyMap.get(label)!;
    entry.sessions.add(s.id);
    for (const st of s.sets) {
      if (st.completed) {
        entry.volume += st.weight_kg * st.reps;
        entry.sets += 1;
        entry.reps += st.reps;
      }
    }
  }

  const monthlyTrends: WeeklyMonthlyVolumePoint[] = Array.from(monthlyMap.entries()).map(([label, val]) => ({
    label,
    volumeKg: Math.round(val.volume),
    sets: val.sets,
    reps: val.reps,
    sessionsCount: val.sessions.size,
  }));

  return {
    totalVolumeKg: Math.round(totalVolumeKg),
    totalWorkingSets,
    totalReps,
    totalCompletedSessions: curSessions.length,
    muscleDistribution,
    weeklyTrends,
    monthlyTrends,
    muscleFrequency,
    periodComparison: {
      currentVolume: Math.round(totalVolumeKg),
      previousVolume: Math.round(prevVolume),
      volumePercentChange: volPct,
      volumeAbsoluteChange: Math.round(volDiff),
      currentSets: totalWorkingSets,
      previousSets: prevSets,
      setsPercentChange: setsPct,
    },
  };
}

// -------------------------------------------------------------
// WORKOUT ANALYSES (AI ASSESSMENTS)
// -------------------------------------------------------------
export async function fetchWorkoutAnalyses(userId?: string): Promise<WorkoutAnalysis[]> {
  let analyses: WorkoutAnalysis[] = [];

  if (userId && userId !== 'guest' && userId !== 'demo') {
    try {
      const supabase = createClient();
      const { data, error } = await supabase
        .from('workout_analyses')
        .select('*')
        .eq('user_id', userId)
        .order('created_at', { ascending: false });

      if (!error && data) {
        analyses = data as WorkoutAnalysis[];
      }
    } catch (err) {
      console.warn('Error fetching workout analyses from Supabase:', err);
    }
  }

  // Fallback to local storage
  if (analyses.length === 0 && typeof window !== 'undefined') {
    const raw = localStorage.getItem(DEFAULT_ANALYSES_STORAGE_KEY);
    if (raw) {
      try {
        analyses = JSON.parse(raw);
      } catch (e) {
        console.error('Failed to parse local analyses:', e);
      }
    }
    if (!analyses) {
      analyses = [];
    }
  }

  return analyses;
}

export function saveWorkoutAnalysisToLocal(analysis: WorkoutAnalysis) {
  if (typeof window === 'undefined') return;
  try {
    const raw = localStorage.getItem(DEFAULT_ANALYSES_STORAGE_KEY);
    const existing: WorkoutAnalysis[] = raw ? JSON.parse(raw) : [];
    const updated = [analysis, ...existing.filter((a) => a.id !== analysis.id && a.session_id !== analysis.session_id)];
    localStorage.setItem(DEFAULT_ANALYSES_STORAGE_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save analysis locally:', err);
  }
}

function getSeedAnalyses(): WorkoutAnalysis[] {
  return [];
}
