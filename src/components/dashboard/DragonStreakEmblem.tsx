'use client';

import React from 'react';
import { Flame, Info, CheckCircle2, Award } from 'lucide-react';

interface DragonStreakEmblemProps {
  currentStreak: number;
  longestStreak: number;
  isTodayQualified: boolean;
  qualifyingReason?: string;
  onOpenRules?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export function DragonStreakEmblem({
  currentStreak = 0,
  longestStreak = 0,
  isTodayQualified = false,
  qualifyingReason = 'Workout, steps, or nutrition target',
  onOpenRules,
  size = 'md',
}: DragonStreakEmblemProps) {
  const isLarge = size === 'lg';

  return (
    <div className="relative rounded-3xl p-4 sm:p-5 bg-gradient-to-br from-[#16112C]/90 via-[#100D20]/95 to-[#0B0918]/95 border border-[#9B5CFF]/25 backdrop-blur-2xl shadow-[0_16px_40px_rgba(0,0,0,0.7)] overflow-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-12 -right-12 w-48 h-48 rounded-full bg-[#9B5CFF]/20 blur-3xl pointer-events-none" />
      <div className="absolute -bottom-12 -left-12 w-48 h-48 rounded-full bg-[#00D5FF]/15 blur-3xl pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-40 h-40 rounded-full bg-[#FF42A6]/10 blur-2xl pointer-events-none" />

      <div className="relative z-10 flex flex-col sm:flex-row items-center justify-between gap-4">
        {/* Dragon Emblem & Streak Number */}
        <div className="flex items-center gap-4 w-full sm:w-auto">
          {/* Dragon Crest Emblem SVG */}
          <div className="relative shrink-0">
            <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-br from-[#23193C] via-[#100D20] to-[#070512] border border-[#9B5CFF]/40 flex items-center justify-center shadow-[0_0_25px_rgba(155,92,255,0.35)] relative overflow-hidden group">
              {/* Inner glowing pulse */}
              <div className="absolute inset-0 bg-gradient-to-tr from-[#9B5CFF]/25 via-[#00D5FF]/20 to-[#FF42A6]/25 opacity-70 group-hover:opacity-100 transition-opacity" />

              {/* Dragon Crest SVG Artwork */}
              <svg
                viewBox="0 0 100 100"
                className="w-12 h-12 sm:w-14 sm:h-14 relative z-10 drop-shadow-[0_0_12px_rgba(0,213,255,0.7)]"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <defs>
                  <linearGradient id="dragonFlameGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#00D5FF" />
                    <stop offset="50%" stopColor="#9B5CFF" />
                    <stop offset="100%" stopColor="#FF42A6" />
                  </linearGradient>
                </defs>

                {/* Dragon Wings / Horns */}
                <path
                  d="M50 12 C40 22 24 24 16 38 C28 36 38 42 44 48 C42 36 46 22 50 12 Z"
                  fill="url(#dragonFlameGrad)"
                  opacity="0.9"
                />
                <path
                  d="M50 12 C60 22 76 24 84 38 C72 36 62 42 56 48 C58 36 54 22 50 12 Z"
                  fill="url(#dragonFlameGrad)"
                  opacity="0.9"
                />

                {/* Dragon Snout / Head Crest */}
                <path
                  d="M50 24 L56 38 L54 52 L50 64 L46 52 L44 38 Z"
                  fill="#F6F2FF"
                  stroke="#9B5CFF"
                  strokeWidth="1.5"
                />

                {/* Dragon Eyes (Electric Cyan Glow) */}
                <circle cx="47" cy="40" r="2.2" fill="#00D5FF" filter="drop-shadow(0 0 4px #00D5FF)" />
                <circle cx="53" cy="40" r="2.2" fill="#00D5FF" filter="drop-shadow(0 0 4px #00D5FF)" />

                {/* Dragon Lower Jaw & Elemental Breath */}
                <path
                  d="M45 56 L50 68 L55 56 Z"
                  fill="#FF42A6"
                  opacity="0.85"
                />

                {/* Energy Rings */}
                <circle
                  cx="50"
                  cy="50"
                  r="42"
                  stroke="url(#dragonFlameGrad)"
                  strokeWidth="1.5"
                  strokeDasharray="6 4"
                  opacity="0.4"
                />
              </svg>
            </div>

            {/* Glowing Flame Badge in Corner */}
            <div className="absolute -bottom-1.5 -right-1.5 w-7 h-7 rounded-full bg-gradient-to-tr from-[#9B5CFF] to-[#00D5FF] border border-[#F6F2FF] flex items-center justify-center shadow-[0_0_12px_rgba(0,213,255,0.7)]">
              <Flame className="w-4 h-4 text-white fill-white animate-pulse" />
            </div>
          </div>

          {/* Streak Counts & Status */}
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="font-display text-[10px] font-bold text-[#00D5FF] uppercase tracking-widest flex items-center gap-1">
                DRAGON STREAK ENGINE
              </span>
              {onOpenRules && (
                <button
                  onClick={onOpenRules}
                  className="text-slate-400 hover:text-white transition-colors cursor-pointer"
                  title="How streaks work"
                >
                  <Info className="w-3 h-3" />
                </button>
              )}
            </div>

            <div className="flex items-baseline gap-2">
              <h2 className="text-3xl sm:text-4xl font-display font-extrabold text-[#F6F2FF] tracking-tight">
                {currentStreak}
              </h2>
              <span className="font-display font-bold text-base sm:text-lg text-[#9B5CFF] tracking-wider uppercase">
                {currentStreak === 1 ? 'DAY STREAK' : 'DAYS STREAK'}
              </span>
            </div>

            <div className="flex items-center gap-3 text-xs text-[#A9A1BD] font-mono">
              <span className="flex items-center gap-1">
                <Award className="w-3.5 h-3.5 text-[#FF42A6]" />
                Best: <strong className="text-white">{longestStreak} days</strong>
              </span>
            </div>
          </div>
        </div>

        {/* Today's Qualification Pill Status */}
        <div className="w-full sm:w-auto flex sm:flex-col items-center sm:items-end justify-between gap-1.5 pt-2 sm:pt-0 border-t sm:border-t-0 border-white/8">
          <span className="text-[10px] uppercase font-display font-bold tracking-wider text-[#A9A1BD]">
            TODAY'S QUALIFYING STATUS
          </span>

          {isTodayQualified ? (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#38E6A5]/15 border border-[#38E6A5]/40 text-[#38E6A5] text-xs font-display font-extrabold tracking-wider shadow-[0_0_15px_rgba(56,230,165,0.3)]">
              <CheckCircle2 className="w-4 h-4 stroke-[2.5]" />
              <span>GOAL ACHIEVED • STREAK ACTIVE</span>
            </div>
          ) : (
            <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#9B5CFF]/15 border border-[#9B5CFF]/35 text-[#00D5FF] text-xs font-display font-bold tracking-wider">
              <span className="w-2 h-2 rounded-full bg-[#00D5FF] animate-ping" />
              <span>PENDING QUALIFICATION</span>
            </div>
          )}

          <p className="text-[10px] text-[#A9A1BD] font-mono text-right hidden sm:block max-w-[220px] truncate">
            {isTodayQualified ? 'Day counted once in streak history' : qualifyingReason}
          </p>
        </div>
      </div>
    </div>
  );
}

