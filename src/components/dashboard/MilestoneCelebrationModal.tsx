'use client';

import { useEffect } from 'react';
import { Milestone } from '@/lib/services/milestoneService';
import { Dumbbell, Flame, Award, Target, Sparkles, X, CheckCircle2 } from 'lucide-react';

interface MilestoneCelebrationModalProps {
  milestone: Milestone | null;
  onClose: () => void;
}

export function MilestoneCelebrationModal({ milestone, onClose }: MilestoneCelebrationModalProps) {
  useEffect(() => {
    if (milestone && typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([30, 60, 40]);
      } catch {}
    }
  }, [milestone]);

  if (!milestone) return null;

  const renderIcon = () => {
    switch (milestone.icon) {
      case 'dumbbell':
        return <Dumbbell className="w-8 h-8 text-[#9B5CFF]" />;
      case 'flame':
        return <Flame className="w-8 h-8 text-[#00D5FF]" />;
      case 'dragon':
        return <Sparkles className="w-8 h-8 text-[#FF42A6]" />;
      case 'award':
        return <Award className="w-8 h-8 text-[#38E6A5]" />;
      case 'target':
        return <Target className="w-8 h-8 text-[#F59E0B]" />;
      default:
        return <Award className="w-8 h-8 text-[#9B5CFF]" />;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/85 backdrop-blur-md animate-in fade-in duration-300">
      {/* Background radial glow */}
      <div
        className="absolute w-80 h-80 rounded-full blur-3xl pointer-events-none opacity-40 animate-pulse"
        style={{ backgroundColor: milestone.accentColor }}
      />

      <div
        className="w-full max-w-sm bg-[#100D20]/95 border rounded-3xl p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.95)] text-center space-y-5 relative z-10 animate-in zoom-in-95 duration-300"
        style={{ borderColor: `${milestone.accentColor}40` }}
        role="dialog"
      >
        {/* Dismiss X */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 p-1.5 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer"
          aria-label="Dismiss milestone"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Milestone Emblem */}
        <div className="flex justify-center pt-2">
          <div
            className="w-20 h-20 rounded-3xl flex items-center justify-center relative shadow-[0_0_30px_rgba(0,0,0,0.8)] border"
            style={{
              backgroundColor: `${milestone.accentColor}15`,
              borderColor: `${milestone.accentColor}50`,
            }}
          >
            <div className="absolute inset-0 rounded-3xl animate-ping opacity-20" style={{ backgroundColor: milestone.accentColor }} />
            {renderIcon()}
          </div>
        </div>

        {/* Text */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5" style={{ color: milestone.accentColor }} />
            <span
              className="text-[10px] font-display font-extrabold uppercase tracking-widest"
              style={{ color: milestone.accentColor }}
            >
              MILESTONE UNLOCKED
            </span>
          </div>

          <h3 className="text-xl font-display font-black text-white tracking-wide uppercase">
            {milestone.title}
          </h3>

          <div className="text-xs font-display font-bold text-slate-300">
            {milestone.subtitle}
          </div>

          <p className="text-xs text-[#A9A1BD] leading-relaxed pt-1 max-w-xs mx-auto">
            {milestone.description}
          </p>
        </div>

        {/* CTA Button */}
        <button
          onClick={onClose}
          className="w-full py-3 px-5 rounded-2xl text-white font-display font-extrabold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all cursor-pointer flex items-center justify-center gap-2"
          style={{
            background: `linear-gradient(135deg, ${milestone.accentColor}, #7928CA)`,
          }}
        >
          <CheckCircle2 className="w-4 h-4" />
          <span>Keep Crushing It</span>
        </button>
      </div>
    </div>
  );
}
