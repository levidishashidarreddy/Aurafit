'use client';

import { Dumbbell, Play, CheckCircle2, Moon, CalendarPlus } from 'lucide-react';
import Link from 'next/link';

export interface ExerciseSummary {
  name: string;
  sets: number;
  reps: string;
  weightKg?: number | null;
  completedSets?: number;
}

export interface TodayWorkoutCardProps {
  routineTitle?: string | null;
  exercises?: ExerciseSummary[];
  isRestDay?: boolean;
  status?: 'planned' | 'in_progress' | 'completed' | 'missed' | 'rescheduled' | 'rest';
  hasPlannedWorkout?: boolean;
}

export function TodayWorkoutCard({
  routineTitle,
  exercises = [],
  isRestDay = false,
  status = 'planned',
  hasPlannedWorkout = false,
}: TodayWorkoutCardProps) {
  // 1. Rest Day State
  if (isRestDay) {
    return (
      <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-slate-950 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Moon className="w-6 h-6 stroke-[2]" />
            </div>
            <div>
              <span className="font-display text-[10px] text-cyan-400 font-bold tracking-widest uppercase">
                SCHEDULED RECOVERY
              </span>
              <h4 className="font-display font-extrabold text-slate-100 text-lg md:text-xl tracking-wider uppercase">
                {routineTitle || 'REST & RECOVERY DAY'}
              </h4>
              <p className="font-display text-xs text-slate-400 tracking-wider">
                Active recovery, protein synthesis, and muscle tissue repair.
              </p>
            </div>
          </div>

          <Link
            href="/workout"
            className="py-2.5 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-display font-bold text-xs tracking-wider flex items-center justify-center gap-2 border border-slate-700 transition-all uppercase cursor-pointer"
          >
            <span>VIEW WEEKLY PLAN</span>
          </Link>
        </div>
      </div>
    );
  }

  // 2. No workout planned state
  if (!hasPlannedWorkout && exercises.length === 0) {
    return (
      <div className="p-5 md:p-6 rounded-2xl bg-slate-900 border border-slate-800 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-slate-800 text-slate-400 border border-slate-700/60">
              <Dumbbell className="w-6 h-6" />
            </div>
            <div>
              <span className="font-display text-[10px] text-slate-400 font-bold tracking-widest uppercase">
                TODAY'S WORKOUT
              </span>
              <h4 className="font-display font-extrabold text-slate-200 text-lg tracking-wider uppercase">
                NO WORKOUT PLANNED FOR TODAY
              </h4>
              <p className="font-display text-xs text-slate-400 tracking-wider">
                Set up your weekly split in Workout Planner & Logger.
              </p>
            </div>
          </div>

          <Link
            href="/workout"
            className="py-2.5 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-display font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition-all uppercase cursor-pointer"
          >
            <CalendarPlus className="w-4 h-4" />
            <span>PLAN WORKOUT</span>
          </Link>
        </div>
      </div>
    );
  }

  // 3. Planned Workout with real exercises
  const totalSets = exercises.reduce((acc, e) => acc + (e.sets || 0), 0);
  const completedSets = exercises.reduce((acc, e) => acc + (e.completedSets || 0), 0);
  const isDone = status === 'completed' || (totalSets > 0 && completedSets >= totalSets);

  return (
    <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/20 border border-slate-800 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Dumbbell className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-[10px] text-orange-400 font-bold tracking-widest uppercase">
                TODAY'S SESSION
              </span>
              {status === 'rescheduled' && (
                <span className="text-[9px] font-bold px-1.5 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/30 uppercase">
                  Rescheduled
                </span>
              )}
            </div>
            <h4 className="font-display font-extrabold text-slate-100 text-lg md:text-xl tracking-wider uppercase">
              {routineTitle || "TODAY'S WORKOUT"}
            </h4>
            <p className="font-display text-xs text-slate-400 tracking-wider uppercase">
              {isDone
                ? 'ALL SETS COMPLETED'
                : `${completedSets} OF ${totalSets} SETS COMPLETED`}
            </p>
          </div>
        </div>

        <Link
          href="/workout"
          className={`py-3 px-5 rounded-xl font-display font-bold text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg active:scale-95 transition-all uppercase cursor-pointer ${
            isDone
              ? 'bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700'
              : 'bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-slate-950 shadow-orange-600/20'
          }`}
        >
          {isDone ? (
            <>
              <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              <span>REVIEW COMPLETED SESSION</span>
            </>
          ) : (
            <>
              <Play className="w-4 h-4 fill-slate-950" />
              <span>{completedSets > 0 ? 'RESUME WORKOUT →' : 'START WORKOUT IN GYM MODE →'}</span>
            </>
          )}
        </Link>
      </div>

      {/* Exercise list items */}
      <div className="space-y-2.5">
        {exercises.map((ex, idx) => {
          const exDone = (ex.completedSets || 0) >= ex.sets;
          return (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-display text-xs font-bold ${
                    exDone
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {exDone ? <CheckCircle2 className="w-4 h-4 text-emerald-400" /> : idx + 1}
                </div>
                <div>
                  <div className="font-display font-bold text-slate-100 text-sm tracking-wider uppercase">
                    {ex.name}
                  </div>
                  <div className="font-mono text-xs text-slate-400">
                    {ex.sets} SETS × {ex.reps} REPS {ex.weightKg ? `• ${ex.weightKg} KG` : ''}
                  </div>
                </div>
              </div>

              <div className="font-display text-xs font-bold text-slate-400 tracking-wider">
                {ex.completedSets || 0} / {ex.sets} SETS
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
