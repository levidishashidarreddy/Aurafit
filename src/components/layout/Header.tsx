'use client';

import { Flame, Dumbbell } from 'lucide-react';

interface HeaderProps {
  title?: string;
  userGoal?: string;
  streakCount?: number;
}

export function Header({ title, userGoal = 'MUSCLE GAIN MODE', streakCount = 12 }: HeaderProps) {
  return (
    <header className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-xl border-b border-slate-800/80 px-4 py-3 flex items-center justify-between">
      <div className="flex items-center gap-3">
        {/* Mobile brand icon */}
        <div className="md:hidden w-9 h-9 rounded-xl bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center shadow-md shadow-orange-600/20">
          <Dumbbell className="w-5 h-5 text-slate-950 stroke-[2.5]" />
        </div>
        <div>
          <h2 className="font-display font-extrabold text-slate-100 text-base md:text-xl tracking-wider uppercase">
            {title || "TODAY'S PERFORMANCE"}
          </h2>
          <p className="font-display text-[10px] text-orange-400 font-semibold tracking-widest uppercase">{userGoal}</p>
        </div>
      </div>

      <div className="flex items-center gap-2">
        <div className="px-3 py-1.5 rounded-full bg-orange-500/10 border border-orange-500/20 flex items-center gap-1.5 text-orange-400 font-display text-xs font-bold tracking-wider">
          <Flame className="w-4 h-4 fill-orange-400/20" />
          <span>🔥 {streakCount} DAYS ACTIVE</span>
        </div>
      </div>
    </header>
  );
}
