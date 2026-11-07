'use client';

import { useState, useEffect } from 'react';
import { X, ArrowRight, Flame, Dumbbell, Footprints, Utensils, Sparkles } from 'lucide-react';
import { CrossedDumbbellsLogo } from '@/components/brand/CrossedDumbbellsLogo';

interface MotivationalWelcomeModalProps {
  currentStreak: number;
  userName?: string;
  todaySteps?: number;
  stepTarget?: number;
  todayWorkoutCompleted?: boolean;
  todayPlannedWorkoutTitle?: string | null;
  caloriesLogged?: number;
  calorieTarget?: number;
}

const MOTIVATIONAL_MESSAGES = [
  'Every set today builds the physique and mindset of tomorrow.',
  'Discipline is choosing between what you want now and what you want most.',
  'Consistency is your superpower. Step into the arena and own today.',
  'Your body can stand almost anything. It’s your mind that you have to convince.',
  'Small daily improvements over time lead to stunning results.',
];

export function MotivationalWelcomeModal({
  currentStreak = 0,
  userName = 'Athlete',
  todaySteps = 0,
  stepTarget = 10000,
  todayWorkoutCompleted = false,
  todayPlannedWorkoutTitle,
  caloriesLogged = 0,
  calorieTarget = 2200,
}: MotivationalWelcomeModalProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [motivationalMessage, setMotivationalMessage] = useState('');

  const firstName = userName ? userName.trim().split(' ')[0] : 'Athlete';

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Check application-launch session flag
    const shownThisSession = sessionStorage.getItem('gymhub_launch_welcome_shown');
    const firstWelcomeJustShown = sessionStorage.getItem('gymhub_first_welcome_dismissed');

    // Show only once per fresh app launch session, and never double-stack if first-time welcome just ran
    if (!shownThisSession && !firstWelcomeJustShown) {
      const randomMsg = MOTIVATIONAL_MESSAGES[Math.floor(Math.random() * MOTIVATIONAL_MESSAGES.length)];
      setMotivationalMessage(randomMsg);

      // Brief 700ms delay for smooth mount after dashboard initial load
      const timer = setTimeout(() => {
        setIsOpen(true);
      }, 700);

      const handleKeyDown = (e: KeyboardEvent) => {
        if (e.key === 'Escape' || e.key === 'Enter') {
          handleDismiss();
        }
      };
      window.addEventListener('keydown', handleKeyDown);

      return () => {
        clearTimeout(timer);
        window.removeEventListener('keydown', handleKeyDown);
      };
    }
  }, []);

  const handleDismiss = () => {
    try {
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('gymhub_launch_welcome_shown', 'true');
      }
    } catch {}
    setIsOpen(false);
  };

  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome back to GYM HUB"
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md animate-in fade-in duration-300 select-none"
      onClick={handleDismiss}
    >
      <div
        className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#1A1434] via-[#100D20] to-[#070512] border border-[#9B5CFF]/35 p-6 sm:p-7 shadow-[0_25px_60px_rgba(0,0,0,0.95)] space-y-5 overflow-hidden animate-in zoom-in-95 duration-300"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Ambient background glows */}
        <div className="absolute -top-16 -right-16 w-48 h-48 rounded-full bg-radial from-[#9B5CFF]/25 via-transparent to-transparent pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-48 h-48 rounded-full bg-radial from-[#00D5FF]/20 via-transparent to-transparent pointer-events-none" />

        {/* Close button */}
        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Close welcome banner"
          className="absolute top-4 right-4 w-9 h-9 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 text-[#A9A1BD] hover:text-white border border-white/10 flex items-center justify-center transition-colors cursor-pointer min-h-[44px] min-w-[44px]"
        >
          <X className="w-4 h-4" />
        </button>

        {/* Brand Emblem & Welcome Header */}
        <div className="text-center space-y-3 pt-1">
          <div className="relative w-20 h-20 mx-auto flex items-center justify-center">
            <CrossedDumbbellsLogo size={76} glow={true} animated={false} />
            {currentStreak > 0 && (
              <div className="absolute -bottom-1 -right-1 px-2 py-0.5 rounded-full bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF] text-white font-display font-extrabold text-[10px] tracking-wider flex items-center gap-0.5 shadow-[0_0_10px_rgba(155,92,255,0.6)]">
                <Flame className="w-2.5 h-2.5 fill-current text-[#00D5FF]" />
                <span>{currentStreak}D</span>
              </div>
            )}
          </div>

          <div className="space-y-1">
            <span className="text-[10px] font-display font-extrabold text-[#00D5FF] tracking-widest uppercase flex items-center justify-center gap-1.5">
              <Sparkles className="w-3 h-3 text-[#9B5CFF]" />
              FUTURISTIC FITNESS COMMAND
            </span>
            <h2 className="text-2xl sm:text-3xl font-display font-black text-[#F6F2FF] tracking-wide uppercase">
              READY TO LEVEL UP?
            </h2>
            <p className="text-xs sm:text-sm text-[#A9A1BD] font-medium">
              Welcome back, <span className="text-[#F6F2FF] font-semibold">{firstName}</span>. Your next milestone is waiting.
            </p>
          </div>
        </div>

        {/* Motivational Insight */}
        <div className="p-3.5 rounded-2xl bg-black/40 border border-[#9B5CFF]/20 text-center">
          <p className="text-xs text-[#F6F2FF] italic font-medium leading-relaxed">
            "{motivationalMessage}"
          </p>
        </div>

        {/* Real Today's Actual Progress Grid (Strictly Real Data, Never Fabricated) */}
        <div className="space-y-2">
          <span className="text-[10px] font-mono text-[#A9A1BD] uppercase tracking-wider block">
            TODAY'S ACTUAL STATUS
          </span>

          <div className="grid grid-cols-3 gap-2 text-left">
            {/* Steps Progress */}
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/8 space-y-1">
              <span className="text-[9px] font-mono text-slate-400 uppercase flex items-center gap-1">
                <Footprints className="w-3 h-3 text-[#00D5FF]" /> Steps
              </span>
              <div className="font-display font-bold text-xs text-[#F6F2FF] truncate">
                {todaySteps.toLocaleString()}
              </div>
              <div className="text-[9px] font-mono text-[#A9A1BD]">
                Goal: {stepTarget.toLocaleString()}
              </div>
            </div>

            {/* Workout Status */}
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/8 space-y-1">
              <span className="text-[9px] font-mono text-slate-400 uppercase flex items-center gap-1">
                <Dumbbell className="w-3 h-3 text-[#9B5CFF]" /> Workout
              </span>
              <div className="font-display font-bold text-xs text-[#F6F2FF] truncate">
                {todayWorkoutCompleted
                  ? 'Completed'
                  : todayPlannedWorkoutTitle || 'Scheduled'}
              </div>
              <div className="text-[9px] font-mono text-[#A9A1BD]">
                {todayWorkoutCompleted ? 'Done today' : 'Ready to train'}
              </div>
            </div>

            {/* Nutrition Status */}
            <div className="p-2.5 rounded-xl bg-white/[0.03] border border-white/8 space-y-1">
              <span className="text-[9px] font-mono text-slate-400 uppercase flex items-center gap-1">
                <Utensils className="w-3 h-3 text-[#FF42A6]" /> Calories
              </span>
              <div className="font-display font-bold text-xs text-[#F6F2FF] truncate">
                {caloriesLogged > 0 ? `${caloriesLogged.toLocaleString()}` : '0 kcal'}
              </div>
              <div className="text-[9px] font-mono text-[#A9A1BD]">
                Target: {calorieTarget ? calorieTarget.toLocaleString() : '2,200'}
              </div>
            </div>
          </div>
        </div>

        {/* Primary "LET'S GO" Action */}
        <button
          type="button"
          onClick={handleDismiss}
          className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-[#9B5CFF] via-[#7928CA] to-[#00D5FF] hover:brightness-110 active:scale-95 text-white font-display font-extrabold text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(155,92,255,0.4)] transition-all cursor-pointer min-h-[48px]"
        >
          <span>LET'S GO</span>
          <ArrowRight className="w-4 h-4 stroke-[2.5]" />
        </button>
      </div>
    </div>
  );
}
