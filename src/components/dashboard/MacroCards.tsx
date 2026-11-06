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

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
      {/* Primary Calories Card (Dominant Visual Importance) */}
      <div className="p-4 md:p-5 rounded-2xl bg-gradient-to-br from-slate-900 via-slate-900 to-orange-950/30 border border-orange-500/30 backdrop-blur-md relative overflow-hidden flex flex-col justify-between shadow-lg">
        <div className="flex items-center justify-between mb-2">
          <span className="font-display text-xs text-orange-400 font-bold tracking-widest uppercase">CALORIES</span>
          <div className="p-2 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Flame className="w-4 h-4 fill-orange-400/20" />
          </div>
        </div>
        <div>
          <div className="font-display text-2xl md:text-3xl font-extrabold text-slate-100 tracking-wider">
            {caloriesConsumed} <span className="text-xs font-sans font-normal text-slate-400">/ {caloriesTarget} KCAL</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 mt-2.5 overflow-hidden">
            <div
              className="bg-gradient-to-r from-amber-600 to-orange-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${calPercent}%` }}
            />
          </div>
          <div className="font-display text-[11px] text-slate-400 mt-1.5 font-semibold tracking-wider uppercase">
            {caloriesTarget - caloriesConsumed} KCAL REMAINING
          </div>
        </div>
      </div>

      {/* Protein Card */}
      <div className="p-4 md:p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="font-display text-xs text-slate-400 font-bold tracking-widest uppercase">PROTEIN</span>
          <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
            <Dumbbell className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="font-display text-2xl md:text-3xl font-extrabold text-slate-100 tracking-wider">
            {proteinConsumed} <span className="text-xs font-sans font-normal text-slate-400">/ {proteinTarget} G</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 mt-2.5 overflow-hidden">
            <div
              className="bg-slate-300 h-2 rounded-full transition-all duration-500"
              style={{ width: `${protPercent}%` }}
            />
          </div>
          <div className="font-display text-[11px] text-slate-400 mt-1.5 font-semibold tracking-wider uppercase">
            {protPercent}% OF DAILY TARGET
          </div>
        </div>
      </div>

      {/* Carbs Card */}
      <div className="p-4 md:p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="font-display text-xs text-slate-400 font-bold tracking-widest uppercase">CARBS</span>
          <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
            <Wheat className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="font-display text-2xl md:text-3xl font-extrabold text-slate-100 tracking-wider">
            {carbsConsumed} <span className="text-xs font-sans font-normal text-slate-400">/ {carbsTarget} G</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 mt-2.5 overflow-hidden">
            <div
              className="bg-slate-400 h-2 rounded-full transition-all duration-500"
              style={{ width: `${carbsPercent}%` }}
            />
          </div>
          <div className="font-display text-[11px] text-slate-400 mt-1.5 font-semibold tracking-wider uppercase">
            {carbsTarget - carbsConsumed} G REMAINING
          </div>
        </div>
      </div>

      {/* Fats Card */}
      <div className="p-4 md:p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-md relative overflow-hidden flex flex-col justify-between">
        <div className="flex items-center justify-between mb-2">
          <span className="font-display text-xs text-slate-400 font-bold tracking-widest uppercase">FATS</span>
          <div className="p-2 rounded-xl bg-slate-800 text-slate-300">
            <Droplet className="w-4 h-4" />
          </div>
        </div>
        <div>
          <div className="font-display text-2xl md:text-3xl font-extrabold text-slate-100 tracking-wider">
            {fatConsumed} <span className="text-xs font-sans font-normal text-slate-400">/ {fatTarget} G</span>
          </div>
          <div className="w-full bg-slate-800 rounded-full h-2 mt-2.5 overflow-hidden">
            <div
              className="bg-slate-500 h-2 rounded-full transition-all duration-500"
              style={{ width: `${fatPercent}%` }}
            />
          </div>
          <div className="font-display text-[11px] text-slate-400 mt-1.5 font-semibold tracking-wider uppercase">
            {fatPercent}% OF DAILY TARGET
          </div>
        </div>
      </div>
    </div>
  );
}
