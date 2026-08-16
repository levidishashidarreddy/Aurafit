'use client';

import { Dumbbell, Play, CheckCircle2 } from 'lucide-react';
import Link from 'next/link';

interface ExerciseSummary {
  name: string;
  sets: number;
  reps: string;
  weightKg: number;
  completedSets: number;
}

interface TodayWorkoutCardProps {
  routineTitle?: string;
  exercises?: ExerciseSummary[];
}

export function TodayWorkoutCard({
  routineTitle = 'PUSH DAY A (CHEST / SHOULDERS / TRICEPS)',
  exercises = [
    { name: 'BARBELL BENCH PRESS', sets: 4, reps: '8-10', weightKg: 60, completedSets: 4 },
    { name: 'INCLINE DUMBBELL PRESS', sets: 3, reps: '10-12', weightKg: 22, completedSets: 2 },
    { name: 'DUMBBELL LATERAL RAISES', sets: 4, reps: '12-15', weightKg: 10, completedSets: 0 },
    { name: 'TRICEPS ROPE PUSHDOWN', sets: 3, reps: '12-15', weightKg: 25, completedSets: 0 },
  ],
}: TodayWorkoutCardProps) {
  const totalSets = exercises.reduce((acc, e) => acc + e.sets, 0);
  const completedSets = exercises.reduce((acc, e) => acc + e.completedSets, 0);

  return (
    <div className="p-5 md:p-6 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/20 border border-slate-800 space-y-5">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Dumbbell className="w-6 h-6 stroke-[2.2]" />
          </div>
          <div>
            <span className="font-display text-[10px] text-orange-400 font-bold tracking-widest uppercase">TODAY'S SESSION</span>
            <h4 className="font-display font-extrabold text-slate-100 text-lg md:text-xl tracking-wider uppercase">{routineTitle}</h4>
            <p className="font-display text-xs text-slate-400 tracking-wider uppercase">{completedSets} OF {totalSets} SETS COMPLETED</p>
          </div>
        </div>

        <Link
          href="/workout?action=start"
          className="py-3 px-5 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-slate-950 font-display font-bold text-xs tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 active:scale-95 transition-all uppercase cursor-pointer"
        >
          <Play className="w-4 h-4 fill-slate-950" />
          <span>{completedSets > 0 ? 'CONTINUE SESSION →' : 'START SESSION →'}</span>
        </Link>
      </div>

      {/* Exercise list items */}
      <div className="space-y-2.5">
        {exercises.map((ex, idx) => {
          const isDone = ex.completedSets === ex.sets;
          return (
            <div
              key={idx}
              className="p-3.5 rounded-xl bg-slate-950/70 border border-slate-800/80 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center font-display text-xs font-bold ${
                    isDone
                      ? 'bg-orange-500/20 text-orange-400 border border-orange-500/30'
                      : 'bg-slate-800 text-slate-400'
                  }`}
                >
                  {isDone ? <CheckCircle2 className="w-4 h-4 text-orange-400" /> : idx + 1}
                </div>
                <div>
                  <div className="font-display font-bold text-slate-100 text-sm tracking-wider uppercase">{ex.name}</div>
                  <div className="font-mono text-xs text-slate-400">
                    {ex.sets} SETS × {ex.reps} REPS • {ex.weightKg} KG
                  </div>
                </div>
              </div>

              <div className="font-display text-xs font-bold text-slate-400 tracking-wider">
                {ex.completedSets} / {ex.sets} SETS
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
