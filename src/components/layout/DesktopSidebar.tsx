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
  Flame,
} from 'lucide-react';

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
    <aside className="hidden md:flex flex-col w-64 border-r border-slate-800/80 bg-slate-950/90 backdrop-blur-xl h-screen sticky top-0 z-30 p-4 justify-between">
      <div>
        {/* Brand Header */}
        <div className="flex items-center gap-3 px-3 py-4 mb-6 border-b border-slate-800/80">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-orange-600 to-amber-600 flex items-center justify-center shadow-lg shadow-orange-600/20">
            <Dumbbell className="w-6 h-6 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="font-display font-extrabold text-xl text-slate-100 tracking-wider leading-none">
              GYM <span className="text-orange-500">HUB</span>
            </h1>
            <p className="text-[10px] text-slate-400 font-semibold tracking-widest uppercase">Performance Console</p>
          </div>
        </div>

        {/* Quick Log Action Button */}
        <button
          onClick={() => onQuickAction?.('food')}
          className="w-full mb-6 py-3 px-4 rounded-xl bg-gradient-to-r from-orange-600 to-amber-600 hover:from-orange-500 hover:to-amber-500 text-slate-950 font-display font-bold text-sm tracking-wider flex items-center justify-center gap-2 shadow-lg shadow-orange-600/20 transition-all active:scale-95 cursor-pointer uppercase"
        >
          <Plus className="w-5 h-5 stroke-[2.5]" />
          <span>Quick Log Activity</span>
        </button>

        {/* Navigation Items (5 Primary Tracking Sections) */}
        <nav className="space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = item.href === '/'
              ? (pathname === '/' || pathname === '/dashboard')
              : pathname?.startsWith(item.href);

            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center gap-3 px-3.5 py-3 rounded-xl font-display font-medium text-xs tracking-wider transition-all ${
                  isActive
                    ? 'bg-orange-500/10 text-orange-400 border border-orange-500/30 shadow-sm'
                    : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
                }`}
              >
                <Icon className={`w-4 h-4 ${isActive ? 'text-orange-400' : 'text-slate-400'}`} />
                <span>{item.label}</span>
              </Link>
            );
          })}
        </nav>
      </div>

      {/* Sidebar Footer: Settings Link & Streak Badge */}
      <div className="space-y-2 pt-2 border-t border-slate-800/80">
        <Link
          href="/profile"
          className={`flex items-center gap-2.5 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-colors ${
            pathname === '/profile'
              ? 'bg-slate-900 text-orange-400 border border-slate-800'
              : 'text-slate-400 hover:text-slate-200 hover:bg-slate-900/60'
          }`}
        >
          <Settings className="w-4 h-4" />
          <span>Profile & Goal Settings</span>
        </Link>

        <div className="p-3 rounded-xl bg-slate-900/80 border border-slate-800/80 flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-orange-500/10 text-orange-400 border border-orange-500/20 shrink-0">
            <Flame className="w-4 h-4 fill-orange-400/20" />
          </div>
          <div>
            <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">Training Streak</div>
            <div className="text-xs font-display font-bold text-slate-100 tracking-wider">🔥 ACTIVE CONSISTENCY</div>
          </div>
        </div>
      </div>
    </aside>
  );
}
