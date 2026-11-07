'use client';

import React, { useId, useEffect, useState } from 'react';

interface CrossedDumbbellsLogoProps {
  className?: string;
  size?: number; // default 64
  animated?: boolean;
  showOrbitalText?: boolean;
  glow?: boolean;
}

export function CrossedDumbbellsLogo({
  className = '',
  size = 64,
  animated = false,
  showOrbitalText = false,
  glow = true,
}: CrossedDumbbellsLogoProps) {
  const uniqueId = useId().replace(/:/g, '');
  const [isPaused, setIsPaused] = useState(false);

  // Pause rotation when the browser tab/app is backgrounded to save mobile battery
  useEffect(() => {
    if (!animated || !showOrbitalText) return;

    const handleVisibilityChange = () => {
      setIsPaused(document.hidden);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [animated, showOrbitalText]);

  // If orbital text is shown, we expand the viewBox to give text clearance
  const viewBoxSize = showOrbitalText ? 240 : 120;
  const center = viewBoxSize / 2;

  const gradShaftId = `dbShaft-${uniqueId}`;
  const gradPlateId = `dbPlate-${uniqueId}`;
  const gradRingId = `dbRing-${uniqueId}`;
  const orbitalPathId = `orbitPath-${uniqueId}`;

  return (
    <div
      className={`relative inline-flex items-center justify-center select-none ${className}`}
      style={{
        width: size,
        height: size,
        filter: glow
          ? 'drop-shadow(0 0 14px rgba(155, 92, 255, 0.45)) drop-shadow(0 0 28px rgba(0, 213, 255, 0.25))'
          : 'none',
      }}
      aria-label="GYM HUB Crossed Dumbbells Logo"
      role="img"
    >
      <svg
        viewBox={`0 0 ${viewBoxSize} ${viewBoxSize}`}
        className="w-full h-full overflow-visible"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          {/* Futuristic Chromatic Gradients */}
          <linearGradient id={gradPlateId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9B5CFF" />
            <stop offset="48%" stopColor="#00D5FF" />
            <stop offset="100%" stopColor="#FF42A6" />
          </linearGradient>

          <linearGradient id={gradShaftId} x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#F6F2FF" />
            <stop offset="50%" stopColor="#A9A1BD" />
            <stop offset="100%" stopColor="#F6F2FF" />
          </linearGradient>

          <linearGradient id={gradRingId} x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#9B5CFF" stopOpacity="0.85" />
            <stop offset="50%" stopColor="#00D5FF" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#FF42A6" stopOpacity="0.85" />
          </linearGradient>

          {/* Smooth circular path for orbital text */}
          <path
            id={orbitalPathId}
            d={`M ${center}, ${center - 88} a 88,88 0 1,1 0,176 a 88,88 0 1,1 0,-176`}
            fill="none"
          />
        </defs>

        {/* Ambient background bloom */}
        <circle
          cx={center}
          cy={center}
          r={showOrbitalText ? 72 : 46}
          fill={`url(#${gradPlateId})`}
          opacity="0.16"
        />

        {/* Optional Rotating Orbital Text */}
        {showOrbitalText && (
          <g
            className={animated && !isPaused ? 'animate-spin' : ''}
            style={{
              transformOrigin: `${center}px ${center}px`,
              animationDuration: '14s',
              animationTimingFunction: 'linear',
            }}
          >
            {/* Glowing Orbit Track */}
            <circle
              cx={center}
              cy={center}
              r="88"
              fill="none"
              stroke={`url(#${gradRingId})`}
              strokeWidth="1.2"
              strokeDasharray="4 4"
              opacity="0.55"
            />
            {/* Orbital Text: "padachusukundam...." */}
            <text
              fill="#00D5FF"
              fontSize="9"
              fontFamily="var(--font-sans), system-ui, sans-serif"
              fontWeight="800"
              letterSpacing="0.22em"
              className="uppercase tracking-widest"
              opacity="0.95"
            >
              <textPath href={`#${orbitalPathId}`} startOffset="0%">
                padachusukundam.... • padachusukundam.... •
              </textPath>
            </text>
          </g>
        )}

        {/* Center Crossed Dumbbells */}
        <g transform={`translate(${center}, ${center})`}>
          {/* Dumbbell 1: Rotated -45 degrees */}
          <g transform="rotate(-45)">
            {/* Shaft / Bar */}
            <rect
              x="-24"
              y="-3"
              width="48"
              height="6"
              rx="3"
              fill={`url(#${gradShaftId})`}
              stroke="#070512"
              strokeWidth="1"
            />
            {/* Knurling rings on grip */}
            <line x1="-8" y1="-3" x2="-8" y2="3" stroke="#070512" strokeWidth="1" />
            <line x1="0" y1="-3" x2="0" y2="3" stroke="#070512" strokeWidth="1" />
            <line x1="8" y1="-3" x2="8" y2="3" stroke="#070512" strokeWidth="1" />

            {/* Left Weight Plates */}
            <rect x="-34" y="-12" width="7" height="24" rx="2.5" fill={`url(#${gradPlateId})`} />
            <rect x="-39" y="-9" width="4" height="18" rx="2" fill="#9B5CFF" />
            <rect x="-42" y="-4" width="3" height="8" rx="1.5" fill="#F6F2FF" />

            {/* Right Weight Plates */}
            <rect x="27" y="-12" width="7" height="24" rx="2.5" fill={`url(#${gradPlateId})`} />
            <rect x="35" y="-9" width="4" height="18" rx="2" fill="#00D5FF" />
            <rect x="39" y="-4" width="3" height="8" rx="1.5" fill="#F6F2FF" />
          </g>

          {/* Dumbbell 2: Rotated +45 degrees */}
          <g transform="rotate(45)">
            {/* Shaft / Bar */}
            <rect
              x="-24"
              y="-3"
              width="48"
              height="6"
              rx="3"
              fill={`url(#${gradShaftId})`}
              stroke="#070512"
              strokeWidth="1"
            />
            {/* Knurling rings on grip */}
            <line x1="-8" y1="-3" x2="-8" y2="3" stroke="#070512" strokeWidth="1" />
            <line x1="0" y1="-3" x2="0" y2="3" stroke="#070512" strokeWidth="1" />
            <line x1="8" y1="-3" x2="8" y2="3" stroke="#070512" strokeWidth="1" />

            {/* Left Weight Plates */}
            <rect x="-34" y="-12" width="7" height="24" rx="2.5" fill={`url(#${gradPlateId})`} />
            <rect x="-39" y="-9" width="4" height="18" rx="2" fill="#FF42A6" />
            <rect x="-42" y="-4" width="3" height="8" rx="1.5" fill="#F6F2FF" />

            {/* Right Weight Plates */}
            <rect x="27" y="-12" width="7" height="24" rx="2.5" fill={`url(#${gradPlateId})`} />
            <rect x="35" y="-9" width="4" height="18" rx="2" fill="#9B5CFF" />
            <rect x="39" y="-4" width="3" height="8" rx="1.5" fill="#F6F2FF" />
          </g>

          {/* Center Connection Node / Metallic Core */}
          <circle cx="0" cy="0" r="5" fill="#F6F2FF" />
          <circle cx="0" cy="0" r="3.5" fill="#9B5CFF" />
          <circle cx="0" cy="0" r="1.8" fill="#070512" />
        </g>
      </svg>
    </div>
  );
}
