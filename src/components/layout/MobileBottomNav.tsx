'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { motion } from 'framer-motion';
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
    <div
      style={{
        bottom: 'calc(1rem + env(safe-area-inset-bottom, 0px))',
      }}
      className="md:hidden fixed inset-x-0 mx-auto w-[94%] max-w-md z-40 pointer-events-none"
    >
      <nav
        aria-label="Mobile Navigation"
        className="pointer-events-auto rounded-full p-1.5 bg-[#100D20]/90 backdrop-blur-2xl border border-[#9B5CFF]/30 shadow-[0_20px_50px_rgba(0,0,0,0.85),0_0_25px_rgba(155,92,255,0.22)] flex items-center justify-between"
      >
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
              className="relative flex-1 flex flex-col items-center justify-center py-1.5 px-0.5 sm:px-1 rounded-full transition-colors group select-none min-w-0"
            >
              {isActive && (
                <motion.div
                  layoutId="activeMobileTabPill"
                  transition={{ type: 'spring', stiffness: 400, damping: 32 }}
                  className="absolute inset-0 bg-gradient-to-b from-[#9B5CFF]/30 to-[#9B5CFF]/10 rounded-full border border-[#9B5CFF]/50 shadow-[0_0_20px_rgba(155,92,255,0.35)]"
                />
              )}

              <motion.div
                whileTap={{ scale: 0.88 }}
                className="relative z-10 flex flex-col items-center justify-center w-full"
              >
                <Icon
                  className={`w-4.5 h-4.5 sm:w-5 sm:h-5 transition-transform duration-200 shrink-0 ${
                    isActive
                      ? 'text-[#00D5FF] scale-110 drop-shadow-[0_0_10px_rgba(0,213,255,0.8)]'
                      : 'text-[#A9A1BD] group-hover:text-white'
                  }`}
                  strokeWidth={isActive ? 2.4 : 1.9}
                />
                <span
                  className={`text-[8.5px] xs:text-[9px] sm:text-[9.5px] font-display tracking-tight sm:tracking-wider mt-0.5 transition-colors truncate max-w-full text-center ${
                    isActive
                      ? 'text-[#00D5FF] font-extrabold drop-shadow-[0_0_8px_rgba(0,213,255,0.6)]'
                      : 'text-[#A9A1BD] group-hover:text-white font-medium'
                  }`}
                >
                  {item.label}
                </span>
              </motion.div>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
