'use client';

import { Dumbbell, Play, CheckCircle2, Moon, CalendarPlus, ChevronRight } from 'lucide-react';
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
      <div className="p-4 sm:p-5 rounded-3xl bg-[#100D20]/85 border border-white/8 backdrop-blur-xl space-y-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#00D5FF]/15 text-[#00D5FF] border border-[#00D5FF]/25 flex items-center justify-center shrink-0">
              <Moon className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <span className="font-display text-[10px] text-[#00D5FF] font-bold tracking-widest uppercase">
                SCHEDULED RECOVERY
              </span>
              <h4 className="font-display font-extrabold text-white text-base sm:text-lg tracking-wider uppercase">
                {routineTitle || 'REST & RECOVERY DAY'}
              </h4>
              <p className="text-[11px] text-[#A9A1BD] tracking-wide">
                Optimal muscle repair, hydration, and central nervous system recovery.
              </p>
            </div>
          </div>

          <Link
            href="/workout"
            className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-200 border border-white/10 font-display font-bold text-xs tracking-wider flex items-center justify-center gap-2 transition-all uppercase cursor-pointer"
          >
            <span>VIEW WEEKLY SPLIT</span>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
          </Link>
        </div>
      </div>
    );
  }

  // 2. No Planned Workout (Empty State - Zero Mock Data)
  if (!hasPlannedWorkout) {
    return (
      <div className="p-4 sm:p-5 rounded-3xl bg-[#100D20]/85 border border-white/8 backdrop-blur-xl space-y-3.5 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#9B5CFF]/15 text-[#9B5CFF] border border-[#9B5CFF]/25 flex items-center justify-center shrink-0">
              <Dumbbell className="w-5 h-5 stroke-[2]" />
            </div>
            <div>
              <span className="font-display text-[10px] text-[#A9A1BD] font-bold tracking-widest uppercase">
                TODAY'S SCHEDULE
              </span>
              <h4 className="font-display font-extrabold text-white text-base sm:text-lg tracking-wider uppercase">
                No Workout Planned Today
              </h4>
              <p className="text-[11px] text-[#A9A1BD] tracking-wide">
                Assign a routine from your split or log a spontaneous session.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            <Link
              href="/workout"
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF] text-white font-display font-bold text-xs tracking-wider uppercase flex items-center gap-1.5 shadow-[0_0_15px_rgba(155,92,255,0.3)] active:scale-95 transition-all cursor-pointer"
            >
              <CalendarPlus className="w-4 h-4" />
              <span>PLAN A ROUTINE</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // Calculate Progress if in_progress or completed
  const totalSets = exercises.reduce((acc, ex) => acc + (ex.sets || 0), 0);
  const completedSets = exercises.reduce((acc, ex) => acc + (ex.completedSets || 0), 0);
  const isCompleted = status === 'completed';
  const progressPercent = totalSets > 0 ? Math.round((completedSets / totalSets) * 100) : isCompleted ? 100 : 0;

  // 3. Active / Planned Workout Card
  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-[#100D20]/85 border border-[#9B5CFF]/30 backdrop-blur-xl space-y-4 shadow-[0_12px_35px_rgba(0,0,0,0.6)] relative overflow-hidden">
      {/* Ambient background glow */}
      <div className="absolute -top-10 -right-10 w-36 h-36 bg-[#9B5CFF]/15 rounded-full blur-2xl pointer-events-none" />

      {/* Card Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-white/8 pb-3.5 relative z-10">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#9B5CFF]/15 text-[#9B5CFF] border border-[#9B5CFF]/25 flex items-center justify-center shrink-0 shadow-[0_0_15px_rgba(155,92,255,0.2)]">
            <Dumbbell className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-[10px] text-[#00D5FF] font-bold tracking-widest uppercase">
                TODAY'S PLANNED ROUTINE
              </span>
              {isCompleted ? (
                <span className="px-2 py-0.5 rounded-full bg-[#38E6A5]/15 text-[#38E6A5] text-[9px] font-bold tracking-wider uppercase border border-[#38E6A5]/30">
                  COMPLETED
                </span>
              ) : (
                <span className="px-2 py-0.5 rounded-full bg-[#9B5CFF]/15 text-[#9B5CFF] text-[9px] font-bold tracking-wider uppercase border border-[#9B5CFF]/30">
                  SCHEDULED
                </span>
              )}
            </div>
            <h3 className="font-display font-extrabold text-white text-base sm:text-lg tracking-wider uppercase">
              {routineTitle || 'UNNAMED ROUTINE'}
            </h3>
          </div>
        </div>

        {/* CTA Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          {isCompleted ? (
            <Link
              href="/workout"
              className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-[#38E6A5] border border-[#38E6A5]/30 font-display font-bold text-xs tracking-wider flex items-center gap-2 transition-all uppercase cursor-pointer"
            >
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>SESSION LOGGED</span>
            </Link>
          ) : (
            <Link
              href="/workout?action=start"
              className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#9B5CFF] via-[#7928CA] to-[#00D5FF] hover:brightness-110 text-white font-display font-extrabold text-xs tracking-wider uppercase flex items-center gap-2 shadow-[0_0_20px_rgba(155,92,255,0.35)] active:scale-95 transition-all cursor-pointer"
            >
              <Play className="w-3.5 h-3.5 fill-white" />
              <span>START GYM MODE</span>
            </Link>
          )}
        </div>
      </div>

      {/* Progress Bar (if active) */}
      <div className="space-y-1.5 relative z-10">
        <div className="flex justify-between font-mono text-[11px] text-slate-400">
          <span>{exercises.length} Exercises Planned</span>
          <span className="font-bold text-white">
            {isCompleted ? '100% Completed' : `${totalSets} Total Sets`}
          </span>
        </div>
        <div className="w-full bg-black/40 rounded-full h-1.5 overflow-hidden border border-white/5">
          <div
            className={`h-1.5 rounded-full transition-all duration-500 ${
              isCompleted
                ? 'bg-[#38E6A5] shadow-[0_0_8px_rgba(56,230,165,0.6)]'
                : 'bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF] shadow-[0_0_8px_rgba(0,213,255,0.5)]'
            }`}
            style={{ width: `${isCompleted ? 100 : Math.max(10, progressPercent)}%` }}
          />
        </div>
      </div>

      {/* Compact Exercise Chips */}
      {exercises.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 relative z-10">
          {exercises.slice(0, 4).map((ex, idx) => (
            <div
              key={idx}
              className="p-2.5 rounded-xl bg-black/40 border border-white/6 flex items-center justify-between"
            >
              <div className="min-w-0 pr-2">
                <span className="text-xs font-display font-bold text-slate-200 block truncate uppercase">
                  {ex.name}
                </span>
                <span className="text-[10px] text-[#A9A1BD] font-mono">
                  {ex.sets} sets • {ex.reps} reps {ex.weightKg ? `• ${ex.weightKg}kg` : ''}
                </span>
              </div>
              {isCompleted ? (
                <CheckCircle2 className="w-4 h-4 text-[#38E6A5] shrink-0" />
              ) : (
                <div className="w-2 h-2 rounded-full bg-[#9B5CFF] shrink-0" />
              )}
            </div>
          ))}
          {exercises.length > 4 && (
            <div className="col-span-1 sm:col-span-2 text-center text-[10px] text-[#A9A1BD] font-mono pt-0.5">
              + {exercises.length - 4} more exercises in split
            </div>
          )}
        </div>
      )}
    </div>
  );
}
