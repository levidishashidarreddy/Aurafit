'use client';

import { X, Eye, EyeOff, LayoutGrid, Check, RotateCcw } from 'lucide-react';

export interface DashboardCardConfig {
  streak: boolean;
  macros: boolean;
  workout: boolean;
  activity: boolean;
  weight: boolean;
  recent: boolean;
}

export const DEFAULT_CARD_CONFIG: DashboardCardConfig = {
  streak: true,
  macros: true,
  workout: true,
  activity: true,
  weight: true,
  recent: true,
};

interface DashboardCustomizeModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: DashboardCardConfig;
  onChange: (newConfig: DashboardCardConfig) => void;
}

export function DashboardCustomizeModal({
  isOpen,
  onClose,
  config,
  onChange,
}: DashboardCustomizeModalProps) {
  if (!isOpen) return null;

  const cardList: { key: keyof DashboardCardConfig; label: string; desc: string }[] = [
    { key: 'streak', label: 'Dragon Streak Engine', desc: 'Active streak emblem & daily qualification' },
    { key: 'macros', label: 'Calorie & Macro Budget', desc: 'Caloric balance, protein, carbs & fats' },
    { key: 'workout', label: "Today's Gym Workout", desc: 'Planned daily routine, exercises & volume' },
    { key: 'activity', label: 'Daily Activity & Steps', desc: 'Whole-day steps & active calories burned' },
    { key: 'weight', label: 'Body Weight Analytics', desc: 'Current weight, 7D moving avg & chart' },
    { key: 'recent', label: 'Recent Gym Sessions', desc: 'Latest completed workout history log' },
  ];

  const toggleCard = (key: keyof DashboardCardConfig) => {
    const updated = { ...config, [key]: !config[key] };
    onChange(updated);
  };

  const resetDefaults = () => {
    onChange(DEFAULT_CARD_CONFIG);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#100D20]/95 backdrop-blur-2xl border border-[#9B5CFF]/30 rounded-3xl p-5 sm:p-6 shadow-[0_25px_60px_rgba(0,0,0,0.95)] space-y-5 animate-in zoom-in-95 duration-200"
        role="dialog"
      >
        <div className="flex items-center justify-between border-b border-white/8 pb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#9B5CFF]/15 text-[#9B5CFF] border border-[#9B5CFF]/30 flex items-center justify-center">
              <LayoutGrid className="w-4 h-4" />
            </div>
            <div>
              <span className="font-display text-[10px] text-[#00D5FF] font-bold tracking-widest uppercase">
                PERSONALIZATION
              </span>
              <h3 className="font-display font-extrabold text-[#F6F2FF] text-base uppercase">
                Customize Dashboard
              </h3>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <p className="text-xs text-[#A9A1BD] leading-relaxed">
          Toggle which cards appear on your command center. Changes apply immediately and are saved to your device.
        </p>

        <div className="space-y-2">
          {cardList.map((item) => {
            const isVisible = config[item.key];
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => toggleCard(item.key)}
                className={`w-full p-3 rounded-2xl border flex items-center justify-between transition-all text-left cursor-pointer min-h-[48px] ${
                  isVisible
                    ? 'bg-black/40 border-[#9B5CFF]/30 hover:border-[#9B5CFF]/60'
                    : 'bg-black/20 border-white/5 opacity-60 hover:opacity-80'
                }`}
              >
                <div>
                  <div className="text-xs font-display font-bold text-white uppercase flex items-center gap-2">
                    <span>{item.label}</span>
                  </div>
                  <div className="text-[10px] text-[#A9A1BD]">{item.desc}</div>
                </div>

                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center border transition-all ${
                    isVisible
                      ? 'bg-[#9B5CFF]/20 text-[#00D5FF] border-[#9B5CFF]/40'
                      : 'bg-white/5 text-slate-500 border-white/10'
                  }`}
                >
                  {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </div>
              </button>
            );
          })}
        </div>

        <div className="flex items-center justify-between pt-2 border-t border-white/8">
          <button
            type="button"
            onClick={resetDefaults}
            className="text-[11px] font-display font-bold text-slate-400 hover:text-white flex items-center gap-1.5 uppercase cursor-pointer transition-colors"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Reset All</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            className="py-2.5 px-5 rounded-xl bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF] text-white font-display font-extrabold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer flex items-center gap-1.5 min-h-[40px]"
          >
            <Check className="w-4 h-4" />
            <span>Done</span>
          </button>
        </div>
      </div>
    </div>
  );
}
