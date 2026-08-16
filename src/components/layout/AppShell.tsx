'use client';

import { useState } from 'react';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { Header } from './Header';
import { QuickActionModal } from '../dashboard/QuickActionModal';

interface AppShellProps {
  children: React.ReactNode;
  headerTitle?: string;
}

export function AppShell({ children, headerTitle }: AppShellProps) {
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col md:flex-row font-sans selection:bg-emerald-500 selection:text-slate-950">
      {/* Desktop Sidebar */}
      <DesktopSidebar onQuickAction={() => setIsQuickActionOpen(true)} />

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 pb-20 md:pb-8">
        <Header title={headerTitle} />
        <main className="flex-1 p-4 md:p-6 max-w-7xl mx-auto w-full space-y-6">
          {children}
        </main>
      </div>

      {/* Mobile Bottom Navigation */}
      <MobileBottomNav onQuickAction={() => setIsQuickActionOpen(true)} />

      {/* Quick Action Modal */}
      <QuickActionModal
        isOpen={isQuickActionOpen}
        onClose={() => setIsQuickActionOpen(false)}
      />
    </div>
  );
}
