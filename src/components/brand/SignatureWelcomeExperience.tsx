'use client';

import { useState, useEffect, useRef } from 'react';
import { CrossedDumbbellsLogo } from './CrossedDumbbellsLogo';
import { ArrowRight, Sparkles, FastForward } from 'lucide-react';

interface SignatureWelcomeExperienceProps {
  userName?: string;
  goalSummary?: string;
  onEnter: () => void;
}

export function SignatureWelcomeExperience({
  userName = 'Athlete',
  goalSummary,
  onEnter,
}: SignatureWelcomeExperienceProps) {
  const [stage, setStage] = useState<number>(0);
  const [isEntering, setIsEntering] = useState<boolean>(false);
  const firstName = userName ? userName.trim().split(' ')[0] : 'Athlete';

  // Store timeouts for guaranteed cleanup
  const timersRef = useRef<NodeJS.Timeout[]>([]);

  useEffect(() => {
    // Check if user prefers reduced motion
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      setStage(6);
      return;
    }

    // Sequence stages:
    // 1 (50ms): Ambient lighting fades in
    // 2 (350ms): Crossed dumbbell emblem smoothly appears
    // 3 (750ms): Logo receives a subtle glow pulse
    // 4 (1150ms): Welcome headline fades in
    // 5 (1550ms): Supporting text & greeting appear
    // 6 (1950ms): Primary CTA becomes interactive & prominent
    const scheduleStage = (targetStage: number, delayMs: number) => {
      const t = setTimeout(() => {
        setStage((prev) => Math.max(prev, targetStage));
      }, delayMs);
      timersRef.current.push(t);
    };

    scheduleStage(1, 50);
    scheduleStage(2, 350);
    scheduleStage(3, 750);
    scheduleStage(4, 1150);
    scheduleStage(5, 1550);
    scheduleStage(6, 1950);

    // Keyboard shortcuts: Enter or Escape to enter immediately
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === 'Escape') {
        handleEnter();
      }
    };
    window.addEventListener('keydown', handleKeyDown);

    return () => {
      timersRef.current.forEach(clearTimeout);
      timersRef.current = [];
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, []);

  const handleEnter = () => {
    if (isEntering) return;
    setIsEntering(true);
    // Clear any pending step timers
    timersRef.current.forEach(clearTimeout);

    try {
      if (typeof window !== 'undefined') {
        localStorage.setItem('gymhub_first_welcome_completed', 'true');
        sessionStorage.setItem('gymhub_first_welcome_dismissed', 'true');
        sessionStorage.setItem('gymhub_launch_welcome_shown', 'true');
      }
    } catch {}

    // Smooth exit transition
    setTimeout(() => {
      onEnter();
    }, 250);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Welcome to GYM HUB"
      className={`fixed inset-0 z-50 flex items-center justify-center p-4 bg-[#070512] bg-future-streaks select-none overflow-y-auto transition-opacity duration-300 ${
        isEntering ? 'opacity-0 scale-95' : 'opacity-100 scale-100'
      }`}
    >
      {/* 1. Ambient Lighting (Stage 1) */}
      <div
        className={`absolute inset-0 pointer-events-none transition-opacity duration-700 ease-out ${
          stage >= 1 ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-80 h-80 sm:w-96 sm:h-96 rounded-full bg-radial from-[#9B5CFF]/20 via-[#00D5FF]/10 to-transparent blur-2xl" />
        <div className="absolute bottom-1/4 right-1/4 w-72 h-72 rounded-full bg-radial from-[#FF42A6]/15 via-transparent to-transparent blur-2xl" />
      </div>

      {/* Immediate Skip Action (Available immediately from t=0) */}
      <button
        type="button"
        onClick={handleEnter}
        aria-label="Skip welcome animation"
        className="absolute top-4 right-4 sm:top-6 sm:right-6 z-20 py-1.5 px-3 rounded-full bg-white/5 hover:bg-white/10 active:scale-95 text-[#A9A1BD] hover:text-white border border-white/10 text-xs font-mono tracking-wider uppercase flex items-center gap-1.5 transition-all cursor-pointer min-h-[44px]"
      >
        <span>Skip</span>
        <FastForward className="w-3 h-3 text-[#00D5FF]" />
      </button>

      {/* Main Glass Experience Container */}
      <div className="relative z-10 w-full max-w-lg rounded-3xl bg-[#100D20]/80 backdrop-blur-2xl border border-white/10 p-6 sm:p-10 text-center shadow-[0_25px_60px_rgba(0,0,0,0.95)] space-y-6 my-auto">
        {/* 2 & 3. Crossed-Dumbbell Emblem (Stages 2 & 3) */}
        <div
          className={`flex items-center justify-center transition-all duration-500 ease-out ${
            stage >= 2 ? 'opacity-100 scale-100' : 'opacity-0 scale-90'
          }`}
        >
          <div
            className={`transition-all duration-500 ${
              stage >= 3
                ? 'drop-shadow-[0_0_35px_rgba(155,92,255,0.7)]'
                : 'drop-shadow-[0_0_15px_rgba(155,92,255,0.3)]'
            }`}
          >
            <CrossedDumbbellsLogo
              size={130}
              animated={stage >= 3}
              showOrbitalText={true}
              glow={true}
            />
          </div>
        </div>

        {/* 4. Main Headline (Stage 4) */}
        <div
          className={`space-y-2 transition-all duration-500 ease-out ${
            stage >= 4 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-3'
          }`}
        >
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#9B5CFF]/15 border border-[#9B5CFF]/30 text-[#00D5FF] text-[10px] font-display font-extrabold tracking-widest uppercase">
            <Sparkles className="w-3 h-3" />
            <span>CALIBRATION COMPLETE</span>
          </div>

          <h1 className="font-display font-extrabold text-2xl sm:text-3xl text-white tracking-wide uppercase leading-tight">
            YOUR JOURNEY. <br />
            YOUR GOALS. <br />
            <span className="bg-gradient-to-r from-[#9B5CFF] via-[#00D5FF] to-[#FF42A6] bg-clip-text text-transparent">
              YOUR EVOLUTION.
            </span>
          </h1>
        </div>

        {/* 5. Personalized Greeting & Supporting Message (Stage 5) */}
        <div
          className={`space-y-2 transition-all duration-500 ease-out ${
            stage >= 5 ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'
          }`}
        >
          <p className="font-display font-bold text-sm sm:text-base text-[#F6F2FF]">
            Welcome, <span className="text-[#00D5FF]">{firstName}</span>.
          </p>
          <p className="font-mono text-xs text-[#A9A1BD] uppercase tracking-wider">
            Your fitness journey starts now.
          </p>
          {goalSummary && (
            <div className="pt-1">
              <span className="inline-block text-[11px] font-mono text-[#9B5CFF] bg-[#9B5CFF]/10 border border-[#9B5CFF]/20 px-2.5 py-0.5 rounded-lg">
                Primary Directive: {goalSummary}
              </span>
            </div>
          )}
        </div>

        {/* 6. Primary CTA (Stage 6 - Always clickable, visually highlighted at Stage 6) */}
        <div
          className={`pt-2 transition-all duration-400 ease-out ${
            stage >= 6 ? 'opacity-100 scale-100' : 'opacity-85 scale-[0.98]'
          }`}
        >
          <button
            type="button"
            onClick={handleEnter}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-[#9B5CFF] via-[#7928CA] to-[#00D5FF] hover:brightness-110 active:scale-95 text-white font-display font-extrabold text-sm sm:text-base tracking-wider uppercase flex items-center justify-center gap-2.5 shadow-[0_0_30px_rgba(155,92,255,0.45)] hover:shadow-[0_0_40px_rgba(0,213,255,0.55)] transition-all cursor-pointer min-h-[48px]"
          >
            <span>ENTER GYM HUB</span>
            <ArrowRight className="w-5 h-5 stroke-[2.5]" />
          </button>
        </div>
      </div>
    </div>
  );
}

