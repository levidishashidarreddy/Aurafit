'use client';

import { useState, useEffect } from 'react';
import { CrossedDumbbellsLogo } from './CrossedDumbbellsLogo';
import { RefreshCw, ArrowRight } from 'lucide-react';

interface SignatureLoaderProps {
  message?: string;
  onTimeoutBypass?: () => void;
  fullScreen?: boolean;
}

export function SignatureLoader({
  message = 'INITIALIZING GYM HUB...',
  onTimeoutBypass,
  fullScreen = true,
}: SignatureLoaderProps) {
  const [showBypass, setShowBypass] = useState(false);

  useEffect(() => {
    // 5.5 second timeout safeguard so loader never traps user indefinitely on slow network
    const timer = setTimeout(() => {
      setShowBypass(true);
    }, 5500);

    return () => clearTimeout(timer);
  }, []);

  const content = (
    <div className="flex flex-col items-center justify-center p-6 text-center space-y-6 relative select-none max-w-sm mx-auto">
      {/* Subtle ambient lighting without CPU blur recalculation */}
      <div className="absolute w-64 h-64 rounded-full bg-radial from-[#9B5CFF]/15 via-[#00D5FF]/10 to-transparent pointer-events-none -top-8 -left-8" />
      <div className="absolute w-64 h-64 rounded-full bg-radial from-[#FF42A6]/10 via-[#9B5CFF]/5 to-transparent pointer-events-none -bottom-8 -right-8" />

      {/* Signature Animated Crossed Dumbbells Logo with Rotating Orbit */}
      <div className="relative z-10 transition-transform duration-300">
        <CrossedDumbbellsLogo size={180} animated={true} showOrbitalText={true} glow={true} />
      </div>

      {/* Brand Identity & Message */}
      <div className="relative z-10 space-y-2">
        <h2 className="font-display font-extrabold text-xl sm:text-2xl text-[#F6F2FF] tracking-wider uppercase">
          GYM <span className="bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF] bg-clip-text text-transparent">HUB</span>
        </h2>
        <div className="flex items-center justify-center gap-2">
          <span className="w-1.5 h-1.5 rounded-full bg-[#00D5FF] animate-pulse" />
          <p className="font-mono text-xs text-[#A9A1BD] uppercase tracking-widest">{message}</p>
        </div>
      </div>

      {/* Timeout Bypass Fallback Action */}
      {showBypass && (
        <div className="relative z-10 pt-2 animate-in fade-in duration-300 space-y-2.5">
          <p className="text-[11px] text-[#A9A1BD]">Taking longer than expected?</p>
          <div className="flex items-center justify-center gap-2">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="py-2 px-3.5 rounded-xl bg-white/5 hover:bg-white/10 text-xs text-[#F6F2FF] font-semibold border border-white/10 flex items-center gap-1.5 cursor-pointer transition-colors min-h-[44px]"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#00D5FF]" />
              <span>Retry</span>
            </button>
            {onTimeoutBypass && (
              <button
                type="button"
                onClick={onTimeoutBypass}
                className="py-2 px-4 rounded-xl bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF] text-white text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-[0_0_15px_rgba(155,92,255,0.4)] active:scale-95 transition-transform min-h-[44px]"
              >
                <span>Continue</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );

  if (!fullScreen) return content;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#070512] bg-future-streaks overflow-hidden p-4"
    >
      {content}
    </div>
  );
}
