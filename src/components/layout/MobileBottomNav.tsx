'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  LayoutDashboard,
  Dumbbell,
  Utensils,
  Footprints,
  TrendingUp,
} from 'lucide-react';

interface MobileBottomNavProps {
  onQuickAction?: () => void;
}

export function MobileBottomNav({ onQuickAction }: MobileBottomNavProps) {
  const pathname = usePathname();

  const navItems = [
    { label: 'HOME', href: '/', icon: LayoutDashboard },
    { label: 'WORKOUT', href: '/workout', icon: Dumbbell },
    { label: 'NUTRITION', href: '/nutrition', icon: Utensils },
    { label: 'ACTIVITY', href: '/activity', icon: Footprints },
    { label: 'PROGRESS', href: '/progress', icon: TrendingUp },
  ];

  return (
    <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-slate-950/95 backdrop-blur-xl border-t border-slate-800 px-2 py-2">
      <div className="flex items-center justify-around max-w-md mx-auto relative">
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = item.href === '/'
            ? (pathname === '/' || pathname === '/dashboard')
            : pathname?.startsWith(item.href);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={`flex flex-col items-center justify-center min-w-[50px] py-1 px-1.5 rounded-xl transition-all ${
                isActive ? 'text-orange-400 font-bold' : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              <Icon className="w-5 h-5 mb-0.5" />
              <span className="text-[10px] font-display tracking-wider">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
