'use client';

import { useState } from 'react';
import { X, Dumbbell } from 'lucide-react';
import { calculatePlates } from '@/lib/utils/fitness';

interface PlateCalculatorModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialWeightKg?: number;
}

export function PlateCalculatorModal({
  isOpen,
  onClose,
  initialWeightKg = 100,
}: PlateCalculatorModalProps) {
  const [targetWeight, setTargetWeight] = useState<number>(initialWeightKg);
  const [barWeight, setBarWeight] = useState<number>(20);

  if (!isOpen) return null;

  const result = calculatePlates(targetWeight, barWeight);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Dumbbell className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-100 text-base">Barbell Plate Calculator</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-xs text-slate-400 font-semibold mb-1 block">Target Weight (kg)</label>
            <input
              type="number"
              step="2.5"
              value={targetWeight}
              onChange={(e) => setTargetWeight(Number(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm font-bold focus:outline-none focus:border-cyan-500"
            />
          </div>
          <div>
            <label className="text-xs text-slate-400 font-semibold mb-1 block">Barbell Weight (kg)</label>
            <select
              value={barWeight}
              onChange={(e) => setBarWeight(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm font-bold focus:outline-none focus:border-cyan-500 cursor-pointer"
            >
              <option value={20}>Standard Bar (20 kg)</option>
              <option value={15}>Women's Bar (15 kg)</option>
              <option value={10}>EZ Curl Bar (10 kg)</option>
            </select>
          </div>
        </div>

        {/* Calculation Result */}
        <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="text-center">
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-wider block">Load Per Side</span>
            <span className="text-3xl font-extrabold text-cyan-400">{result.perSideWeight} kg</span>
          </div>

          <div className="space-y-2 pt-2 border-t border-slate-800/80">
            <span className="text-xs text-slate-300 font-semibold block">Plates Needed (Each Side):</span>
            {result.plates.length === 0 ? (
              <div className="text-xs text-slate-400 italic">No plates needed for target weight.</div>
            ) : (
              <div className="flex flex-wrap gap-2">
                {result.plates.map((p, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-2 rounded-xl bg-slate-900 border border-cyan-500/30 flex items-center gap-2 text-xs font-bold text-slate-100"
                  >
                    <span className="w-5 h-5 rounded-full bg-cyan-500 text-slate-950 flex items-center justify-center text-[10px]">
                      {p.countPerSide}×
                    </span>
                    <span>{p.plateWeightKg} kg plate</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
