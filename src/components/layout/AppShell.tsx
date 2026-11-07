'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { createClient } from '@/lib/supabase/client';
import { getUserProfile, clearUserLocalSessionCache } from '@/lib/services/profileService';
import { DesktopSidebar } from './DesktopSidebar';
import { MobileBottomNav } from './MobileBottomNav';
import { Header } from './Header';
import { QuickActionModal } from '../dashboard/QuickActionModal';
import { SignatureLoader } from '../brand/SignatureLoader';
import { AlertCircle, RefreshCw, LogOut } from 'lucide-react';

interface AppShellProps {
  children: React.ReactNode;
  headerTitle?: string;
  headerSubtitle?: string;
}

export function AppShell({ children, headerTitle, headerSubtitle }: AppShellProps) {
  const router = useRouter();
  const [isQuickActionOpen, setIsQuickActionOpen] = useState(false);
  const [isVerifyingAuth, setIsVerifyingAuth] = useState(true);
  const [authError, setAuthError] = useState<string | null>(null);

  useEffect(() => {
    let isMounted = true;

    async function verifyAuthAndOnboarding() {
      try {
        const supabase = createClient();
        const { data: sessionData, error: sessionErr } = await supabase.auth.getSession();

        if (sessionErr) {
          console.warn('Session check error:', sessionErr);
        }

        const user = sessionData?.session?.user;

        if (!user) {
          // Check if guest session flag exists in localStorage for offline testing
          const isGuest = typeof window !== 'undefined' && localStorage.getItem('aura_guest_session') === 'true';
          if (!isGuest) {
            router.replace('/login');
            return;
          }
        }

        if (user && isMounted) {
          // Check profile & onboarding status
          const profile = await getUserProfile(user.id);

          if (!profile || !profile.onboarding_completed) {
            // Unfinished onboarding -> redirect to onboarding wizard
            router.replace('/onboarding');
            return;
          }
        }

        if (isMounted) {
          setIsVerifyingAuth(false);
        }
      } catch (err: any) {
        console.error('AppShell auth verification error:', err);
        if (isMounted) {
          setAuthError(err.message || 'Unable to verify athlete session.');
          setIsVerifyingAuth(false);
        }
      }
    }

    verifyAuthAndOnboarding();

    return () => {
      isMounted = false;
    };
  }, [router]);

  // Loading Screen during initial boot auth check
  if (isVerifyingAuth) {
    return (
      <SignatureLoader
        message="AUTHENTICATING ATHLETE..."
        onTimeoutBypass={() => setIsVerifyingAuth(false)}
      />
    );
  }

  // Error screen if profile load fails completely (Prevents duplicate profiles or silent crashes)
  if (authError) {
    return (
      <div className="min-h-screen bg-[#070512] bg-future-streaks flex items-center justify-center p-4">
        <div className="glass-future rounded-3xl p-6 sm:p-8 max-w-md w-full text-center space-y-4 border border-rose-500/30 shadow-[0_20px_50px_rgba(0,0,0,0.8)]">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 border border-rose-500/25 flex items-center justify-center mx-auto">
            <AlertCircle className="w-6 h-6" />
          </div>
          <h2 className="text-xl font-display font-bold text-white uppercase">Session Connection Notice</h2>
          <p className="text-xs text-[#A9A1BD]">{authError}</p>
          <div className="flex items-center justify-center gap-3 pt-2">
            <button
              onClick={() => window.location.reload()}
              className="py-2.5 px-4 rounded-xl bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF] text-white font-display font-bold text-xs uppercase flex items-center gap-2 cursor-pointer shadow-[0_0_15px_rgba(155,92,255,0.3)]"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Retry</span>
            </button>
            <button
              onClick={async () => {
                const supabase = createClient();
                await supabase.auth.signOut();
                clearUserLocalSessionCache();
                router.replace('/login');
              }}
              className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 font-display font-bold text-xs uppercase flex items-center gap-2 cursor-pointer border border-white/8"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sign In Again</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#070512] bg-future-streaks text-[#F6F2FF] flex flex-col md:flex-row font-sans selection:bg-[#9B5CFF] selection:text-white antialiased">
      {/* Desktop Sidebar */}
      <DesktopSidebar onQuickAction={() => setIsQuickActionOpen(true)} />

      {/* Main Content Area with safe bottom clearance for floating dock */}
      <div className="flex-1 flex flex-col min-w-0 pb-[calc(7.5rem+env(safe-area-inset-bottom,0px))] md:pb-8">
        <Header title={headerTitle} subtitle={headerSubtitle} />
        <main className="flex-1 p-3.5 sm:p-5 md:p-6 max-w-7xl mx-auto w-full space-y-5 overflow-x-hidden">
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{
              duration: 0.28,
              ease: [0.16, 1, 0.3, 1],
            }}
            className="w-full space-y-5"
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Floating Mobile Bottom Navigation Dock */}
      <MobileBottomNav onQuickAction={() => setIsQuickActionOpen(true)} />

      {/* Quick Action Modal */}
      <QuickActionModal
        isOpen={isQuickActionOpen}
        onClose={() => setIsQuickActionOpen(false)}
      />
    </div>
  );
}
