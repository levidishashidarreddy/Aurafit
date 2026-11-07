'use client';

import { Settings } from 'lucide-react';
import Link from 'next/link';
import { CrossedDumbbellsLogo } from '@/components/brand/CrossedDumbbellsLogo';

interface HeaderProps {
  title?: string;
  subtitle?: string;
}

export function Header({
  title = "GYM HUB",
  subtitle,
}: HeaderProps) {
  return (
    <header className="sticky top-0 z-30 bg-[#070512]/90 backdrop-blur-2xl border-b border-white/8 px-4 py-2.5 flex items-center justify-between transition-all select-none">
      <div className="flex items-center gap-2.5 min-w-0">
        {/* Mobile brand emblem */}
        <div className="md:hidden shrink-0">
          <CrossedDumbbellsLogo size={32} animated={false} />
        </div>
        <div className="min-w-0">
          <h2 className="font-display font-extrabold text-[#F6F2FF] text-sm md:text-base tracking-wider uppercase truncate leading-tight">
            {title}
          </h2>
          {subtitle && (
            <p className="font-mono text-[9px] md:text-[10px] text-[#A9A1BD] tracking-wider truncate leading-none mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        {/* Profile / Settings Button */}
        <Link
          href="/profile"
          className="w-8 h-8 rounded-full bg-white/5 hover:bg-[#9B5CFF]/15 active:scale-95 text-slate-300 hover:text-[#00D5FF] border border-white/10 hover:border-[#9B5CFF]/40 flex items-center justify-center transition-all cursor-pointer shadow-[0_0_10px_rgba(155,92,255,0.15)]"
          title="Profile & Target Settings"
        >
          <Settings className="w-4 h-4" />
        </Link>
      </div>
    </header>
  );
}
