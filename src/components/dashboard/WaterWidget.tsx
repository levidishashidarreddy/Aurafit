'use client';

import { useState } from 'react';
import { GlassWater, Plus } from 'lucide-react';

interface WaterWidgetProps {
  initialWaterMl?: number;
  targetWaterMl?: number;
  onWaterAdd?: (amountMl: number) => void;
}

export function WaterWidget({
  initialWaterMl = 2500,
  targetWaterMl = 3500,
  onWaterAdd,
}: WaterWidgetProps) {
  const [waterMl, setWaterMl] = useState(initialWaterMl);

  const handleAdd = (amount: number) => {
    const updated = waterMl + amount;
    setWaterMl(updated);
    if (onWaterAdd) onWaterAdd(amount);
  };

  const percentage = Math.min(100, Math.round((waterMl / (targetWaterMl || 1)) * 100));
  const liters = (waterMl / 1000).toFixed(1);
  const targetLiters = (targetWaterMl / 1000).toFixed(1);

  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-md space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700/60">
            <GlassWater className="w-5 h-5" />
          </div>
          <div>
            <span className="font-display text-[10px] text-slate-400 font-bold tracking-widest uppercase">HYDRATION TRACKER</span>
            <h4 className="font-display font-extrabold text-slate-100 text-base tracking-wider uppercase">WATER INTAKE</h4>
          </div>
        </div>
        <div className="text-right">
          <div className="font-display text-xl font-extrabold text-slate-100 tracking-wider">
            {liters} <span className="text-xs font-sans text-slate-400 font-normal">/ {targetLiters} L</span>
          </div>
          <div className="font-display text-[10px] text-slate-400 font-semibold tracking-wider uppercase">{percentage}% COMPLETED</div>
        </div>
      </div>

      {/* Progress bar */}
      <div className="w-full bg-slate-800 rounded-full h-2 overflow-hidden">
        <div
          className="bg-slate-300 h-2 rounded-full transition-all duration-500"
          style={{ width: `${percentage}%` }}
        />
      </div>

      {/* Quick Add Buttons */}
      <div className="grid grid-cols-4 gap-2 pt-1">
        {[
          { label: '+250 ML', amount: 250 },
          { label: '+500 ML', amount: 500 },
          { label: '+750 ML', amount: 750 },
          { label: '+1.0 L', amount: 1000 },
        ].map((btn) => (
          <button
            key={btn.label}
            onClick={() => handleAdd(btn.amount)}
            className="py-2 px-1 rounded-xl bg-slate-800/90 hover:bg-slate-700/80 text-slate-200 font-display font-bold text-xs border border-slate-700/60 flex items-center justify-center gap-0.5 active:scale-95 transition-all cursor-pointer tracking-wider"
          >
            <Plus className="w-3 h-3 stroke-[2.5]" />
            <span>{btn.label}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
