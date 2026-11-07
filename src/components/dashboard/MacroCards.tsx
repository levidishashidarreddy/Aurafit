'use client';

import { Flame, Dumbbell, Wheat, Droplet } from 'lucide-react';

interface MacroCardsProps {
  caloriesConsumed?: number;
  caloriesTarget?: number;
  proteinConsumed?: number;
  proteinTarget?: number;
  carbsConsumed?: number;
  carbsTarget?: number;
  fatConsumed?: number;
  fatTarget?: number;
}

export function MacroCards({
  caloriesConsumed = 0,
  caloriesTarget = 1900,
  proteinConsumed = 0,
  proteinTarget = 85,
  carbsConsumed = 0,
  carbsTarget = 210,
  fatConsumed = 0,
  fatTarget = 60,
}: MacroCardsProps) {
  const calPercent = Math.min(100, Math.round((caloriesConsumed / (caloriesTarget || 1)) * 100));
  const protPercent = Math.min(100, Math.round((proteinConsumed / (proteinTarget || 1)) * 100));
  const carbsPercent = Math.min(100, Math.round((carbsConsumed / (carbsTarget || 1)) * 100));
  const fatPercent = Math.min(100, Math.round((fatConsumed / (fatTarget || 1)) * 100));

  const remainingKcal = Math.max(0, caloriesTarget - caloriesConsumed);

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-3">
      {/* Primary Calories Card (Dominant Hero Card) */}
      <div className="col-span-2 md:col-span-1 p-4 rounded-3xl bg-gradient-to-br from-[#23193C] via-[#16112C] to-[#100D20] border border-[#9B5CFF]/35 relative overflow-hidden flex flex-col justify-between shadow-[0_12px_35px_rgba(0,0,0,0.6),0_0_20px_rgba(155,92,255,0.18)]">
        {/* Subtle violet accent glow behind */}
        <div className="absolute -top-10 -right-10 w-28 h-28 bg-[#9B5CFF]/20 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-center justify-between mb-3 relative z-10">
          <div className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[#00D5FF] animate-ping" />
            <span className="font-display text-[11px] text-[#00D5FF] font-bold tracking-widest uppercase">
              CALORIE BUDGET
            </span>
          </div>
          <div className="w-7 h-7 rounded-full bg-[#9B5CFF]/15 text-[#9B5CFF] border border-[#9B5CFF]/25 flex items-center justify-center">
            <Flame className="w-3.5 h-3.5 fill-[#9B5CFF]/30" />
          </div>
        </div>

        <div className="relative z-10">
          <div className="flex items-baseline justify-between">
            <div className="font-display text-2xl sm:text-3xl font-extrabold text-white tracking-wider">
              {caloriesConsumed.toLocaleString()}{' '}
              <span className="text-[11px] font-sans font-normal text-slate-400">
                / {caloriesTarget.toLocaleString()} KCAL
              </span>
            </div>
            <span className="text-xs font-mono font-bold text-[#00D5FF]">
              {calPercent}%
            </span>
          </div>

          {/* Sleek Gradient Bar */}
          <div className="w-full bg-black/40 rounded-full h-2 mt-2.5 overflow-hidden border border-white/5">
            <div
              className="bg-gradient-to-r from-[#9B5CFF] via-[#7928CA] to-[#00D5FF] h-2 rounded-full transition-all duration-500 shadow-[0_0_10px_rgba(0,213,255,0.5)]"
              style={{ width: `${calPercent}%` }}
            />
          </div>

          <div className="flex items-center justify-between font-display text-[10px] text-slate-400 mt-2 font-semibold tracking-wider uppercase">
            <span>{remainingKcal} KCAL REMAINING</span>
            <span className="text-slate-500">TODAY</span>
          </div>
        </div>
      </div>

      {/* Protein Card */}
      <div className="p-3.5 sm:p-4 rounded-3xl bg-[#100D20]/85 border border-[#00D5FF]/25 backdrop-blur-xl flex flex-col justify-between shadow-[0_8px_25px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between mb-2">
          <span className="font-display text-[10px] sm:text-[11px] font-bold text-[#00D5FF] tracking-wider uppercase">
            PROTEIN
          </span>
          <div className="w-6 h-6 rounded-lg bg-[#00D5FF]/10 text-[#00D5FF] flex items-center justify-center">
            <Dumbbell className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <span className="font-display text-xl sm:text-2xl font-extrabold text-white">
              {proteinConsumed} <span className="text-xs font-sans text-slate-400">/ {proteinTarget}g</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-[#00D5FF]">{protPercent}%</span>
          </div>
          <div className="w-full bg-black/40 rounded-full h-1.5 mt-2 overflow-hidden border border-white/5">
            <div
              className="bg-gradient-to-r from-[#00D5FF] to-cyan-300 h-1.5 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(0,213,255,0.4)]"
              style={{ width: `${protPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Carbs Card */}
      <div className="p-3.5 sm:p-4 rounded-3xl bg-[#100D20]/85 border border-[#FF42A6]/25 backdrop-blur-xl flex flex-col justify-between shadow-[0_8px_25px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between mb-2">
          <span className="font-display text-[10px] sm:text-[11px] font-bold text-[#FF42A6] tracking-wider uppercase">
            CARBOHYDRATES
          </span>
          <div className="w-6 h-6 rounded-lg bg-[#FF42A6]/10 text-[#FF42A6] flex items-center justify-center">
            <Wheat className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <span className="font-display text-xl sm:text-2xl font-extrabold text-white">
              {carbsConsumed} <span className="text-xs font-sans text-slate-400">/ {carbsTarget}g</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-[#FF42A6]">{carbsPercent}%</span>
          </div>
          <div className="w-full bg-black/40 rounded-full h-1.5 mt-2 overflow-hidden border border-white/5">
            <div
              className="bg-gradient-to-r from-[#FF42A6] to-pink-400 h-1.5 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(255,66,166,0.4)]"
              style={{ width: `${carbsPercent}%` }}
            />
          </div>
        </div>
      </div>

      {/* Fat Card */}
      <div className="p-3.5 sm:p-4 rounded-3xl bg-[#100D20]/85 border border-[#9B5CFF]/25 backdrop-blur-xl flex flex-col justify-between shadow-[0_8px_25px_rgba(0,0,0,0.5)]">
        <div className="flex items-center justify-between mb-2">
          <span className="font-display text-[10px] sm:text-[11px] font-bold text-[#9B5CFF] tracking-wider uppercase">
            HEALTHY FATS
          </span>
          <div className="w-6 h-6 rounded-lg bg-[#9B5CFF]/10 text-[#9B5CFF] flex items-center justify-center">
            <Droplet className="w-3.5 h-3.5" />
          </div>
        </div>
        <div>
          <div className="flex items-baseline justify-between">
            <span className="font-display text-xl sm:text-2xl font-extrabold text-white">
              {fatConsumed} <span className="text-xs font-sans text-slate-400">/ {fatTarget}g</span>
            </span>
            <span className="text-[10px] font-mono font-bold text-[#9B5CFF]">{fatPercent}%</span>
          </div>
          <div className="w-full bg-black/40 rounded-full h-1.5 mt-2 overflow-hidden border border-white/5">
            <div
              className="bg-gradient-to-r from-[#9B5CFF] to-violet-400 h-1.5 rounded-full transition-all duration-500 shadow-[0_0_8px_rgba(155,92,255,0.4)]"
              style={{ width: `${fatPercent}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
