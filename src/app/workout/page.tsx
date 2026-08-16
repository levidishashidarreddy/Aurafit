'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { RestTimer } from '@/components/workout/RestTimer';
import { PlateCalculatorModal } from '@/components/workout/PlateCalculatorModal';
import { 
  Dumbbell, 
  Play, 
  Plus, 
  Check, 
  Calculator, 
  Timer as TimerIcon, 
  CheckCircle2,
  TrendingUp,
  Loader2
} from 'lucide-react';
import { SetType } from '@/lib/types/database';
import { createClient } from '@/lib/supabase/client';
import { createWorkoutSession, logWorkoutSet, finishWorkoutSession } from '@/lib/services/workoutService';

interface SetRow {
  id: string;
  setNumber: number;
  type: SetType;
  weightKg: number;
  reps: number;
  rpe: number;
  completed: boolean;
}

interface ActiveExercise {
  id: string;
  exerciseId?: string;
  name: string;
  muscle: string;
  previousBest: string;
  sets: SetRow[];
}

export default function WorkoutPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [isSessionActive, setIsSessionActive] = useState<boolean>(true);
  const [activeRoutineTitle, setActiveRoutineTitle] = useState<string>('Push Day A (Chest & Shoulders)');
  const [showPlateCalc, setShowPlateCalc] = useState<boolean>(false);
  const [showRestTimer, setShowRestTimer] = useState<boolean>(false);
  const [startTime] = useState<number>(Date.now());

  const supabase = createClient();

  useEffect(() => {
    async function initSession() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const session = await createWorkoutSession(user.id, activeRoutineTitle);
        if (session) {
          setSessionId(session.id);
        }
      }
    }
    initSession();
  }, []);

  const [exercises, setExercises] = useState<ActiveExercise[]>([
    {
      id: 'ex1',
      exerciseId: 'b0000000-0000-0000-0000-000000000001',
      name: 'Barbell Bench Press',
      muscle: 'Chest',
      previousBest: '55 kg × 8 reps',
      sets: [
        { id: 's1', setNumber: 1, type: 'warmup', weightKg: 40, reps: 10, rpe: 6, completed: true },
        { id: 's2', setNumber: 2, type: 'working', weightKg: 60, reps: 8, rpe: 8, completed: true },
        { id: 's3', setNumber: 3, type: 'working', weightKg: 60, reps: 8, rpe: 8.5, completed: true },
        { id: 's4', setNumber: 4, type: 'working', weightKg: 65, reps: 6, rpe: 9, completed: false },
      ],
    },
    {
      id: 'ex2',
      exerciseId: 'b0000000-0000-0000-0000-000000000002',
      name: 'Incline Dumbbell Press',
      muscle: 'Upper Chest',
      previousBest: '22 kg × 10 reps',
      sets: [
        { id: 's5', setNumber: 1, type: 'working', weightKg: 22, reps: 10, rpe: 8, completed: false },
        { id: 's6', setNumber: 2, type: 'working', weightKg: 24, reps: 8, rpe: 9, completed: false },
      ],
    },
  ]);

  const toggleSetComplete = async (exId: string, setId: string) => {
    const targetExercise = exercises.find((e) => e.id === exId);
    const targetSet = targetExercise?.sets.find((s) => s.id === setId);

    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) => (s.id === setId ? { ...s, completed: !s.completed } : s)),
        };
      })
    );

    // Auto launch rest timer on set completion
    setShowRestTimer(true);

    // Save set to Supabase if session exists
    if (sessionId && targetSet && !targetSet.completed && targetExercise?.exerciseId) {
      await logWorkoutSet({
        session_id: sessionId,
        exercise_id: targetExercise.exerciseId,
        set_number: targetSet.setNumber,
        set_type: targetSet.type,
        weight_kg: targetSet.weightKg,
        reps: targetSet.reps,
        rpe: targetSet.rpe,
      });
    }
  };

  const updateSet = (exId: string, setId: string, field: keyof SetRow, value: any) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId) return ex;
        return {
          ...ex,
          sets: ex.sets.map((s) => (s.id === setId ? { ...s, [field]: value } : s)),
        };
      })
    );
  };

  const addSet = (exId: string) => {
    setExercises((prev) =>
      prev.map((ex) => {
        if (ex.id !== exId) return ex;
        const lastSet = ex.sets[ex.sets.length - 1];
        const newSet: SetRow = {
          id: Math.random().toString(),
          setNumber: ex.sets.length + 1,
          type: 'working',
          weightKg: lastSet ? lastSet.weightKg : 50,
          reps: lastSet ? lastSet.reps : 10,
          rpe: 8,
          completed: false,
        };
        return { ...ex, sets: [...ex.sets, newSet] };
      })
    );
  };

  const handleFinishWorkout = async () => {
    const durationSecs = Math.round((Date.now() - startTime) / 1000);
    if (sessionId) {
      await finishWorkoutSession(sessionId, durationSecs);
    }
    alert('Workout session saved to Supabase!');
  };

  return (
    <AppShell headerTitle="Gym Workout Logger">
      {/* Top Banner & Quick Controls */}
      <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-cyan-950/40 border border-slate-800 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-cyan-400 font-bold mb-1">
            <span className="w-2 h-2 rounded-full bg-cyan-400 animate-ping" />
            <span>Active Workout Session</span>
          </div>
          <h2 className="font-extrabold text-slate-100 text-lg md:text-xl">{activeRoutineTitle}</h2>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowPlateCalc(true)}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-cyan-300 font-semibold text-xs border border-slate-700/60 flex items-center gap-1.5 cursor-pointer"
          >
            <Calculator className="w-4 h-4" />
            <span>Plate Calc</span>
          </button>

          <button
            onClick={() => setShowRestTimer(!showRestTimer)}
            className="py-2 px-3 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-300 font-semibold text-xs border border-slate-700/60 flex items-center gap-1.5 cursor-pointer"
          >
            <TimerIcon className="w-4 h-4" />
            <span>Rest Timer</span>
          </button>
        </div>
      </div>

      {/* Embedded Rest Timer when toggled */}
      {showRestTimer && (
        <div className="max-w-md mx-auto">
          <RestTimer onClose={() => setShowRestTimer(false)} />
        </div>
      )}

      {/* Active Exercises List */}
      <div className="space-y-5">
        {exercises.map((ex) => (
          <div key={ex.id} className="p-4 md:p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800/80 pb-3">
              <div>
                <h3 className="font-bold text-slate-100 text-base">{ex.name}</h3>
                <div className="flex items-center gap-2 text-xs text-slate-400 mt-0.5">
                  <span className="px-2 py-0.5 rounded-md bg-slate-800 font-medium text-cyan-400">{ex.muscle}</span>
                  <span>• Prev: <strong className="text-slate-300">{ex.previousBest}</strong></span>
                </div>
              </div>

              <div className="flex items-center gap-1 text-xs text-emerald-400 font-semibold bg-emerald-500/10 px-2.5 py-1 rounded-lg border border-emerald-500/20">
                <TrendingUp className="w-3.5 h-3.5" />
                <span>+2.5 kg Overload</span>
              </div>
            </div>

            {/* Set Logger Table Header */}
            <div className="grid grid-cols-12 gap-2 text-center text-xs font-semibold text-slate-400 px-1">
              <span className="col-span-2 text-left">SET</span>
              <span className="col-span-3">WEIGHT (KG)</span>
              <span className="col-span-3">REPS</span>
              <span className="col-span-2">RPE</span>
              <span className="col-span-2 text-right">DONE</span>
            </div>

            {/* Sets Rows */}
            <div className="space-y-2">
              {ex.sets.map((set) => (
                <div
                  key={set.id}
                  className={`grid grid-cols-12 gap-2 items-center p-2 rounded-xl border transition-all ${
                    set.completed
                      ? 'bg-emerald-950/30 border-emerald-500/40'
                      : 'bg-slate-950/60 border-slate-800/60'
                  }`}
                >
                  {/* Set Number & Type Toggle */}
                  <div className="col-span-2 flex items-center gap-1">
                    <span className="w-6 h-6 rounded-lg bg-slate-800 text-slate-200 font-bold text-xs flex items-center justify-center">
                      {set.setNumber}
                    </span>
                    <button
                      onClick={() =>
                        updateSet(ex.id, set.id, 'type', set.type === 'warmup' ? 'working' : 'warmup')
                      }
                      className={`text-[10px] font-bold px-1.5 py-0.5 rounded cursor-pointer ${
                        set.type === 'warmup' ? 'bg-amber-500/20 text-amber-400' : 'bg-cyan-500/20 text-cyan-400'
                      }`}
                    >
                      {set.type === 'warmup' ? 'W' : 'WORK'}
                    </button>
                  </div>

                  {/* Weight kg input */}
                  <div className="col-span-3">
                    <input
                      type="number"
                      value={set.weightKg}
                      onChange={(e) => updateSet(ex.id, set.id, 'weightKg', Number(e.target.value))}
                      className="w-full py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm font-bold text-center focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* Reps input */}
                  <div className="col-span-3">
                    <input
                      type="number"
                      value={set.reps}
                      onChange={(e) => updateSet(ex.id, set.id, 'reps', Number(e.target.value))}
                      className="w-full py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-sm font-bold text-center focus:outline-none focus:border-cyan-500"
                    />
                  </div>

                  {/* RPE select */}
                  <div className="col-span-2">
                    <select
                      value={set.rpe}
                      onChange={(e) => updateSet(ex.id, set.id, 'rpe', Number(e.target.value))}
                      className="w-full py-1.5 px-1 rounded-lg bg-slate-900 border border-slate-800 text-slate-300 text-xs font-semibold text-center focus:outline-none cursor-pointer"
                    >
                      {[6, 7, 7.5, 8, 8.5, 9, 9.5, 10].map((r) => (
                        <option key={r} value={r}>@ {r}</option>
                      ))}
                    </select>
                  </div>

                  {/* Completion Toggle button */}
                  <div className="col-span-2 flex justify-end">
                    <button
                      onClick={() => toggleSetComplete(ex.id, set.id)}
                      className={`w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer transition-all active:scale-95 ${
                        set.completed
                          ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                          : 'bg-slate-800 text-slate-400 hover:bg-slate-700'
                      }`}
                    >
                      <Check className="w-5 h-5 stroke-[2.5]" />
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add Set Button */}
            <button
              onClick={() => addSet(ex.id)}
              className="w-full py-2.5 rounded-xl bg-slate-950 border border-slate-800 hover:border-slate-700 text-slate-300 font-semibold text-xs flex items-center justify-center gap-1.5 cursor-pointer transition-colors"
            >
              <Plus className="w-4 h-4" />
              <span>Add Set</span>
            </button>
          </div>
        ))}
      </div>

      {/* Complete Workout Bar */}
      <div className="sticky bottom-16 md:bottom-4 z-30 pt-2">
        <button
          onClick={handleFinishWorkout}
          className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-base shadow-2xl shadow-emerald-500/25 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
        >
          <CheckCircle2 className="w-6 h-6 stroke-[2.5]" />
          <span>Finish & Save Workout Session</span>
        </button>
      </div>

      <PlateCalculatorModal isOpen={showPlateCalc} onClose={() => setShowPlateCalc(false)} />
    </AppShell>
  );
}
