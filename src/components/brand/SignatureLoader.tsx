'use client';

import { useState, useEffect, useId } from 'react';
import { RefreshCw, ArrowRight } from 'lucide-react';
import { CrossedDumbbellsLogo } from './CrossedDumbbellsLogo';

interface SignatureLoaderProps {
  message?: string;
  onTimeoutBypass?: () => void;
  fullScreen?: boolean;
}

export function SignatureLoader({
  message: _message,
  onTimeoutBypass,
  fullScreen = true,
}: SignatureLoaderProps) {
  const [showBypass, setShowBypass] = useState(false);
  const [imageError, setImageError] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const uniqueId = useId().replace(/:/g, '');

  useEffect(() => {
    // 5.5 second timeout safeguard so loader never traps user indefinitely on slow network
    const timer = setTimeout(() => {
      setShowBypass(true);
    }, 5500);

    // Reduced motion preference
    if (typeof window !== 'undefined') {
      const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(motionQuery.matches);

      const handleMotionChange = (e: MediaQueryListEvent) => {
        setPrefersReducedMotion(e.matches);
      };
      motionQuery.addEventListener('change', handleMotionChange);

      // Battery saving: pause rotation when tab is hidden
      const handleVisibilityChange = () => {
        setIsPaused(document.hidden);
      };
      document.addEventListener('visibilitychange', handleVisibilityChange);

      return () => {
        clearTimeout(timer);
        motionQuery.removeEventListener('change', handleMotionChange);
        document.removeEventListener('visibilitychange', handleVisibilityChange);
      };
    }

    return () => clearTimeout(timer);
  }, []);

  const orbitPathId = `loaderOrbitRing-${uniqueId}`;
  const gradOrbitId = `loaderOrbitGrad-${uniqueId}`;

  const shouldAnimate = !isPaused && !prefersReducedMotion;

  const content = (
    <div className="flex flex-col items-center justify-center p-4 text-center relative select-none mx-auto w-full max-w-sm">
      {/* Orbit & Centered White Monochrome Fist-and-Dumbbell Logo */}
      <div className="relative w-[280px] h-[280px] sm:w-[340px] sm:h-[340px] flex items-center justify-center">
        {/* 1. Rotating Orbit Track, Enlarged Curved Text & Traveling Glowing Orbs */}
        <svg
          viewBox="0 0 360 360"
          className="absolute inset-0 w-full h-full overflow-visible pointer-events-none"
        >
          <defs>
            <linearGradient id={gradOrbitId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#9B5CFF" stopOpacity="0.85" />
              <stop offset="50%" stopColor="#00D5FF" stopOpacity="0.95" />
              <stop offset="100%" stopColor="#FF42A6" stopOpacity="0.8" />
            </linearGradient>

            {/* Circular clockwise path for curved text around the orbit (center = 180, 180, radius = 138) */}
            <path
              id={orbitPathId}
              d="M 180, 42 a 138,138 0 1,1 0,276 a 138,138 0 1,1 0,-276"
              fill="none"
            />
          </defs>

          {/* Rotating Group: Independent 16s smooth clockwise rotation */}
          <g
            className={shouldAnimate ? 'animate-spin' : ''}
            style={{
              transformOrigin: '180px 180px',
              animationDuration: '16s',
              animationTimingFunction: 'linear',
            }}
          >
            {/* Thin Gradient Orbit Line */}
            <circle
              cx="180"
              cy="180"
              r="138"
              fill="none"
              stroke={`url(#${gradOrbitId})`}
              strokeWidth="1.5"
              strokeDasharray="6 5"
              opacity="0.45"
            />

            {/* Traveling Glowing Orb along the orbit line */}
            <circle
              cx="180"
              cy="42"
              r="4"
              fill="#00D5FF"
              style={{
                filter: 'drop-shadow(0 0 6px #00D5FF) drop-shadow(0 0 12px rgba(0, 213, 255, 0.9))',
              }}
            />
            {/* Secondary subtle orb on opposing side */}
            <circle
              cx="180"
              cy="318"
              r="3"
              fill="#9B5CFF"
              style={{
                filter: 'drop-shadow(0 0 6px #9B5CFF)',
              }}
              opacity="0.85"
            />

            {/* Enlarged Bold Curved Orbiting Text: PADACHUSUKUNDAM... */}
            <text
              fill="#00D5FF"
              fontSize="20"
              fontFamily="var(--font-display), 'Montserrat', system-ui, -apple-system, sans-serif"
              fontWeight="900"
              letterSpacing="0.20em"
              className="uppercase select-none"
              style={{
                filter: 'drop-shadow(0 0 8px rgba(0, 213, 255, 0.75)) drop-shadow(0 0 16px rgba(155, 92, 255, 0.5))',
              }}
            >
              <textPath href={`#${orbitPathId}`} startOffset="0%">
                PADACHUSUKUNDAM... • PADACHUSUKUNDAM... •
              </textPath>
            </text>
          </g>
        </svg>

        {/* 2. Centered White Monochrome Logo (Subtle breathing pulse, upright & centered) */}
        <div className="relative z-10 w-24 h-24 sm:w-28 sm:h-28 flex items-center justify-center">
          {!imageError ? (
            <img
              src="/brand/fist-dumbbell-logo.png"
              alt="GYM HUB Fist Dumbbell Emblem"
              width={112}
              height={112}
              onError={() => setImageError(true)}
              className={`w-full h-full object-contain filter drop-shadow-[0_0_18px_rgba(155,92,255,0.5)] drop-shadow-[0_0_30px_rgba(0,213,255,0.3)] select-none pointer-events-none ${
                shouldAnimate ? 'animate-breath-pulse' : ''
              }`}
            />
          ) : (
            /* Graceful Vector Fallback */
            <CrossedDumbbellsLogo size={88} animated={false} showOrbitalText={false} glow={true} />
          )}
        </div>
      </div>

      {/* Timeout Bypass Fallback Action */}
      {showBypass && (
        <div className="relative z-10 pt-4 animate-in fade-in duration-300 space-y-2">
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
