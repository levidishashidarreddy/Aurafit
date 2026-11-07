'use client';

import { useState } from 'react';
import { X, Utensils, Dumbbell, Scale, Footprints, TrendingUp, CheckCircle2, ArrowRight, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';
import { saveCanonicalWeightRecord } from '@/lib/services/bodyWeightService';
import { saveDailyActivitySummary } from '@/lib/services/dailyActivityService';
import { getFastAuthUser } from '@/lib/supabase/client';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSuccessRefresh?: () => void;
}

export function QuickActionModal({ isOpen, onClose, onSuccessRefresh }: QuickActionModalProps) {
  const router = useRouter();
  const [inlineMode, setInlineMode] = useState<'none' | 'weight' | 'steps'>('none');
  const [inputWeight, setInputWeight] = useState<string>('');
  const [inputSteps, setInputSteps] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  if (!isOpen) return null;

  const triggerHaptic = (len = 15) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(len);
      } catch {}
    }
  };

  const handleSelect = (href: string) => {
    triggerHaptic(10);
    onClose();
    router.push(href);
  };

  const todayStr = new Date().toISOString().split('T')[0];

  const handleSaveInlineWeight = async () => {
    const val = parseFloat(inputWeight);
    if (!val || isNaN(val) || val < 30 || val > 300) return;

    setIsSubmitting(true);
    triggerHaptic(20);
    try {
      const user = await getFastAuthUser();
      const uid = user ? user.id : 'guest';
      await saveCanonicalWeightRecord({
        userId: uid,
        weightKg: val,
        loggedAt: todayStr,
        allowOverwrite: true,
      });

      setSuccessMessage(`Recorded ${val} kg for today`);
      triggerHaptic(30);
      if (onSuccessRefresh) onSuccessRefresh();
      window.dispatchEvent(new CustomEvent('gymhub_weight_updated', { detail: { weightKg: val } }));

      setTimeout(() => {
        setSuccessMessage(null);
        setInlineMode('none');
        setInputWeight('');
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to quick-log weight:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveInlineSteps = async () => {
    const val = parseInt(inputSteps, 10);
    if (isNaN(val) || val < 0) return;

    setIsSubmitting(true);
    triggerHaptic(20);
    try {
      const user = await getFastAuthUser();
      const uid = user ? user.id : 'guest';
      await saveDailyActivitySummary({
        userId: uid,
        entryDate: todayStr,
        totalSteps: val,
        activeCaloriesBurned: Math.round(val * 0.04), // Estimated active burn fallback
      });

      setSuccessMessage(`Recorded ${val.toLocaleString()} steps`);
      triggerHaptic(30);
      if (onSuccessRefresh) onSuccessRefresh();
      window.dispatchEvent(new CustomEvent('gymhub_activity_updated', { detail: { totalSteps: val } }));

      setTimeout(() => {
        setSuccessMessage(null);
        setInlineMode('none');
        setInputSteps('');
        onClose();
      }, 1200);
    } catch (err) {
      console.error('Failed to quick-log steps:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-200">
      <div
        className="w-full max-w-md bg-[#100D20]/95 backdrop-blur-2xl border border-[#9B5CFF]/30 rounded-3xl p-5 shadow-[0_25px_60px_rgba(0,0,0,0.95)] space-y-4 relative animate-in slide-in-from-bottom-6 duration-300"
        role="dialog"
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 pb-3">
          <div>
            <span className="font-display text-[10px] text-[#00D5FF] font-bold tracking-widest uppercase">
              INSTANT ACTIONS
            </span>
            <h3 className="font-display font-bold text-[#F6F2FF] text-lg tracking-wide uppercase">
              {inlineMode === 'weight'
                ? 'Record Body Weight'
                : inlineMode === 'steps'
                ? 'Log Today\'s Steps'
                : 'Quick Fitness Action'}
            </h3>
          </div>
          <button
            onClick={() => {
              if (inlineMode !== 'none') {
                setInlineMode('none');
              } else {
                onClose();
              }
            }}
            className="w-8 h-8 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 text-slate-400 hover:text-white border border-white/8 flex items-center justify-center transition-all cursor-pointer min-h-[32px] min-w-[32px]"
            aria-label="Close action modal"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Success Banner */}
        {successMessage && (
          <div className="p-3 rounded-2xl bg-[#38E6A5]/15 border border-[#38E6A5]/40 text-[#38E6A5] text-xs font-display font-bold uppercase tracking-wider flex items-center justify-center gap-2 animate-in zoom-in-95">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Inline Weight Logger */}
        {inlineMode === 'weight' && !successMessage && (
          <div className="p-4 rounded-2xl bg-black/40 border border-[#FF42A6]/30 space-y-4 animate-in fade-in">
            <p className="text-xs text-[#A9A1BD]">
              Enter your morning weigh-in. Automatically calculates moving average and updates progress analytics.
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                step="0.1"
                min="30"
                max="300"
                placeholder="e.g. 74.8"
                autoFocus
                value={inputWeight}
                onChange={(e) => setInputWeight(e.target.value)}
                className="flex-1 py-3 px-4 rounded-xl bg-black/60 border border-white/10 text-white font-display font-bold text-lg focus:outline-none focus:border-[#FF42A6]"
              />
              <span className="text-sm font-display font-bold text-slate-400">kg</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setInlineMode('none')}
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-display font-bold uppercase text-slate-400 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveInlineWeight}
                disabled={isSubmitting || !inputWeight}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#FF42A6] to-[#9B5CFF] text-white font-display font-extrabold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Save Weight</span>
              </button>
            </div>
          </div>
        )}

        {/* Inline Steps Logger */}
        {inlineMode === 'steps' && !successMessage && (
          <div className="p-4 rounded-2xl bg-black/40 border border-[#38E6A5]/30 space-y-4 animate-in fade-in">
            <p className="text-xs text-[#A9A1BD]">
              Enter today&apos;s step count. If your target is met, it qualifies your dragon streak for today!
            </p>
            <div className="flex items-center gap-3">
              <input
                type="number"
                step="100"
                min="0"
                placeholder="e.g. 10250"
                autoFocus
                value={inputSteps}
                onChange={(e) => setInputSteps(e.target.value)}
                className="flex-1 py-3 px-4 rounded-xl bg-black/60 border border-white/10 text-white font-display font-bold text-lg focus:outline-none focus:border-[#38E6A5]"
              />
              <span className="text-sm font-display font-bold text-slate-400">steps</span>
            </div>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setInlineMode('none')}
                className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-xs font-display font-bold uppercase text-slate-400 min-h-[44px]"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleSaveInlineSteps}
                disabled={isSubmitting || !inputSteps}
                className="flex-1 py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#38E6A5] to-[#00D5FF] text-slate-950 font-display font-extrabold text-xs uppercase tracking-wider shadow-lg active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 min-h-[44px]"
              >
                {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle2 className="w-4 h-4" />}
                <span>Save Steps</span>
              </button>
            </div>
          </div>
        )}

        {/* Main Action List */}
        {inlineMode === 'none' && !successMessage && (
          <div className="grid grid-cols-1 gap-2.5">
            {/* 1. Start Workout */}
            <button
              onClick={() => handleSelect('/workout?action=start')}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#9B5CFF]/20 to-[#7928CA]/20 border border-[#9B5CFF]/30 hover:border-[#9B5CFF]/60 flex items-center justify-between text-left cursor-pointer group active:scale-[0.98] transition-all min-h-[56px]"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#9B5CFF]/15 text-[#9B5CFF] border border-[#9B5CFF]/30 flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105">
                  <Dumbbell className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-[#F6F2FF] text-sm tracking-wide uppercase group-hover:text-white">
                    Start Gym Workout
                  </h4>
                  <p className="text-[11px] text-[#A9A1BD]">Log sets, barbell weight, reps & rest timer</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#9B5CFF] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* 2. Log Food */}
            <button
              onClick={() => handleSelect('/nutrition')}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#00D5FF]/20 to-cyan-500/20 border border-[#00D5FF]/30 hover:border-[#00D5FF]/60 flex items-center justify-between text-left cursor-pointer group active:scale-[0.98] transition-all min-h-[56px]"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#00D5FF]/15 text-[#00D5FF] border border-[#00D5FF]/30 flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105">
                  <Utensils className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-[#F6F2FF] text-sm tracking-wide uppercase group-hover:text-white">
                    Log Daily Nutrition
                  </h4>
                  <p className="text-[11px] text-[#A9A1BD]">Quick-paste daily totals from ChatGPT or notes</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-[#00D5FF] opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </button>

            {/* 3. Record Weight (Inline Fast Logging) */}
            <button
              onClick={() => {
                triggerHaptic(15);
                setInlineMode('weight');
              }}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#FF42A6]/20 to-pink-500/20 border border-[#FF42A6]/30 hover:border-[#FF42A6]/60 flex items-center justify-between text-left cursor-pointer group active:scale-[0.98] transition-all min-h-[56px]"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#FF42A6]/15 text-[#FF42A6] border border-[#FF42A6]/30 flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105">
                  <Scale className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-[#F6F2FF] text-sm tracking-wide uppercase group-hover:text-white">
                    Record Body Weight
                  </h4>
                  <p className="text-[11px] text-[#A9A1BD]">Fast inline entry without leaving dashboard</p>
                </div>
              </div>
              <span className="text-[10px] font-display font-bold text-[#FF42A6] bg-[#FF42A6]/10 px-2 py-0.5 rounded-lg border border-[#FF42A6]/30">
                FAST LOG
              </span>
            </button>

            {/* 4. Log Daily Steps (Inline Fast Logging) */}
            <button
              onClick={() => {
                triggerHaptic(15);
                setInlineMode('steps');
              }}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-[#38E6A5]/20 to-emerald-500/20 border border-[#38E6A5]/30 hover:border-[#38E6A5]/60 flex items-center justify-between text-left cursor-pointer group active:scale-[0.98] transition-all min-h-[56px]"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-[#38E6A5]/15 text-[#38E6A5] border border-[#38E6A5]/30 flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105">
                  <Footprints className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-[#F6F2FF] text-sm tracking-wide uppercase group-hover:text-white">
                    Log Daily Steps
                  </h4>
                  <p className="text-[11px] text-[#A9A1BD]">Record movement & qualify streak immediately</p>
                </div>
              </div>
              <span className="text-[10px] font-display font-bold text-[#38E6A5] bg-[#38E6A5]/10 px-2 py-0.5 rounded-lg border border-[#38E6A5]/30">
                FAST LOG
              </span>
            </button>

            {/* 5. View Progress */}
            <button
              onClick={() => handleSelect('/progress')}
              className="w-full p-3.5 rounded-2xl bg-gradient-to-r from-amber-500/20 to-orange-500/20 border border-amber-500/30 hover:border-amber-500/60 flex items-center justify-between text-left cursor-pointer group active:scale-[0.98] transition-all min-h-[56px]"
            >
              <div className="flex items-center gap-3.5">
                <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-400 border border-amber-500/30 flex items-center justify-center shrink-0 shadow-sm transition-transform group-hover:scale-105">
                  <TrendingUp className="w-5 h-5 stroke-[2.2]" />
                </div>
                <div>
                  <h4 className="font-display font-bold text-[#F6F2FF] text-sm tracking-wide uppercase group-hover:text-white">
                    View Progress Analytics
                  </h4>
                  <p className="text-[11px] text-[#A9A1BD]">Charts, volume progression & body measurements</p>
                </div>
              </div>
              <ArrowRight className="w-4 h-4 text-amber-400 opacity-60 group-hover:opacity-100 group-hover:translate-x-0.5 transition-all" />
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
