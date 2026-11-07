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
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-[#100D20]/95 border border-[#9B5CFF]/30 rounded-3xl w-full max-w-md p-5 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.9)] space-y-4">
        <div className="flex items-center justify-between border-b border-white/8 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-[#9B5CFF]/15 text-[#00D5FF] border border-[#9B5CFF]/25">
              <Dumbbell className="w-4 h-4" />
            </div>
            <h3 className="font-display font-extrabold text-white text-base uppercase tracking-wide">
              Barbell Plate Calculator
            </h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-white cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Controls */}
        <div className="grid grid-cols-2 gap-3">
          <div>
            <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider mb-1 block">
              Target Weight (kg)
            </label>
            <input
              type="number"
              step="2.5"
              value={targetWeight}
              onChange={(e) => setTargetWeight(Number(e.target.value) || 0)}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-sm font-bold focus:outline-none focus:border-[#9B5CFF]"
            />
          </div>
          <div>
            <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider mb-1 block">
              Barbell Weight (kg)
            </label>
            <select
              value={barWeight}
              onChange={(e) => setBarWeight(Number(e.target.value))}
              className="w-full px-3.5 py-2.5 rounded-xl bg-black/40 border border-white/10 text-white text-xs sm:text-sm font-bold focus:outline-none focus:border-[#9B5CFF] cursor-pointer"
            >
              <option value={20}>Standard Olympic Bar (20 kg)</option>
              <option value={15}>Women's Bar (15 kg)</option>
              <option value={10}>EZ Curl Bar (10 kg)</option>
            </select>
          </div>
        </div>

        {/* Calculation Result */}
        <div className="p-4 rounded-2xl bg-black/40 border border-white/8 space-y-3">
          <div className="text-center">
            <span className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block">
              Load Per Side
            </span>
            <span className="text-3xl font-display font-black text-[#00D5FF]">{result.perSideWeight} kg</span>
          </div>

          {result.plates.length > 0 ? (
            <div className="space-y-2">
              <span className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider block">
                Plates on Each Side:
              </span>
              <div className="flex flex-wrap gap-2 justify-center">
                {result.plates.map((p, idx) => (
                  <div
                    key={idx}
                    className="px-3 py-1.5 rounded-xl bg-[#9B5CFF]/15 border border-[#9B5CFF]/30 text-white font-mono font-bold text-xs flex items-center gap-1.5 shadow-sm"
                  >
                    <span className="text-[#00D5FF] font-black">{p.countPerSide}x</span>
                    <span>{p.plateWeightKg} kg</span>
                  </div>
                ))}
              </div>
            </div>
          ) : (
            <p className="text-xs text-slate-400 text-center font-mono">
              {targetWeight <= barWeight ? 'Bar weight meets or exceeds target weight.' : 'No standard plates required.'}
            </p>
          )}

          {result.remainderKg > 0 && (
            <div className="text-[11px] text-amber-400 text-center font-mono">
              Remaining unallocated: {result.remainderKg} kg
            </div>
          )}
        </div>

        <button
          onClick={onClose}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF] text-white font-display font-bold text-xs uppercase tracking-wider shadow-[0_0_15px_rgba(155,92,255,0.35)] cursor-pointer"
        >
          Done
        </button>
      </div>
    </div>
  );
}
