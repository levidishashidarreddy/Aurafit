'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Dumbbell,
  Utensils,
  Footprints,
  TrendingUp,
  Settings,
  Plus,
  Sparkles,
} from 'lucide-react';
import { CrossedDumbbellsLogo } from '../brand/CrossedDumbbellsLogo';

interface DesktopSidebarProps {
  onQuickAction?: (action: 'food' | 'workout' | 'activity' | 'weight') => void;
}

export function DesktopSidebar({ onQuickAction }: DesktopSidebarProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'DASHBOARD', href: '/', icon: LayoutDashboard },
    { label: 'WORKOUT PLANNER & LOGGER', href: '/workout', icon: Dumbbell },
    { label: 'NUTRITION TRACKER', href: '/nutrition', icon: Utensils },
    { label: 'ACTIVITY & BODY WEIGHT', href: '/activity', icon: Footprints },
    { label: 'PROGRESS HUB', href: '/progress', icon: TrendingUp },
  ];

  return (
    <aside className="hidden md:flex flex-col w-64 border-r border-white/8 bg-[#0A071A]/95 backdrop-blur-2xl h-screen sticky top-0 z-30 p-4 justify-between select-none">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-2 py-3 mb-5 border-b border-white/8">
          <CrossedDumbbellsLogo size={36} animated={false} />
          <div>
            <h1 className="font-display font-extrabold text-xl text-[#F6F2FF] tracking-wider leading-none">
              GYM <span className="text-[#9B5CFF]">HUB</span>
            </h1>
            <p className="text-[9.5px] text-[#A9A1BD] font-semibold tracking-widest uppercase mt-0.5">
              Fitness Ecosystem
            </p>
          </div>
        </div>

        {/* Quick Log Action Button */}
        <button
          onClick={() => onQuickAction?.('food')}
          className="w-full mb-5 py-3 px-4 rounded-xl bg-gradient-to-r from-[#9B5CFF] via-[#7928CA] to-[#00D5FF] hover:brightness-110 text-white font-display font-bold text-xs tracking-wider flex items-center justify-center gap-2 shadow-[0_4px_20px_rgba(155,92,255,0.35)] transition-all active:scale-95 cursor-pointer uppercase"
        >
          <Plus className="w-4 h-4 stroke-[2.6]" />
          <span>Quick Log Activity</span>
        </button>

        {/* Navigation Items */}
        <nav className="space-y-1.5">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.href === '/'
                ? pathname === '/' || pathname === '/dashboard'
                : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl font-display font-medium text-xs tracking-wider transition-all ${
                  isActive
                    ? 'bg-[#9B5CFF]/15 text-[#00D5FF] border border-[#9B5CFF]/35 shadow-[0_0_15px_rgba(155,92,255,0.18)] font-bold'
                    : 'text-[#A9A1BD] hover:text-white hover:bg-white/5'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-[#00D5FF]' : 'text-[#A9A1BD]'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer */}
      <div className="space-y-2 pt-3 border-t border-white/8">
        <Link
          href="/profile"
          className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors ${
            pathname === '/profile'
              ? 'bg-white/10 text-[#00D5FF] border border-white/10'
              : 'text-[#A9A1BD] hover:text-white hover:bg-white/5'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Settings & Account</span>
        </Link>

        {/* Branding Footer */}
        <div className="pt-2 text-center">
          <p className="font-mono text-[10px] text-[#A9A1BD]/70 tracking-widest uppercase">
            Powered by Master
          </p>
        </div>
      </div>
    </aside>
  );
}
