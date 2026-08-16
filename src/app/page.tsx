'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { MacroCards } from '@/components/dashboard/MacroCards';
import { WaterWidget } from '@/components/dashboard/WaterWidget';
import { TodayWorkoutCard } from '@/components/dashboard/TodayWorkoutCard';
import { WeightChartCard } from '@/components/dashboard/WeightChartCard';
import { HealthSyncCard } from '@/components/dashboard/HealthSyncCard';
import { AIInsightCard } from '@/components/dashboard/AIInsightCard';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { createClient } from '@/lib/supabase/client';
import { getUserProfile, updateProfile } from '@/lib/services/profileService';
import { fetchDailyFoodLogs } from '@/lib/services/foodLogService';
import { fetchWeightLogs } from '@/lib/services/weightService';
import { HealthMetrics, getSimulatedHealthData } from '@/lib/services/googleFitService';
import { Utensils, Dumbbell, Scale, Bot, Loader2 } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';

export default function DashboardPage() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(true);
  const [user, setUser] = useState<any>(null);
  const [isOnboardingCompleted, setIsOnboardingCompleted] = useState<boolean>(true);
  const [userProfile, setUserProfile] = useState<any>({
    full_name: '',
    fitness_goal: 'muscle_gain',
    target_calories: 2200,
    target_protein_g: 140,
    target_carbs_g: 240,
    target_fat_g: 65,
    target_water_ml: 3500,
    streak_count: 1,
  });

  const [dailyTotals, setDailyTotals] = useState({
    calories: 0,
    protein: 0,
    carbs: 0,
    fat: 0,
  });

  const [weightHistory, setWeightHistory] = useState<any[]>([]);

  const [healthMetrics, setHealthMetrics] = useState<HealthMetrics>({
    steps: 0,
    targetSteps: 10000,
    activeCalories: 0,
    distanceKm: 0,
    heartRateBpm: 0,
    isSynced: false,
    source: 'simulated',
  });

  const supabase = createClient();

  useEffect(() => {
    async function loadLiveData() {
      try {
        const { data: { user: currentUser } } = await supabase.auth.getUser();
        if (currentUser) {
          setUser(currentUser);
          const profile = await getUserProfile(currentUser.id);
          if (profile) {
            setUserProfile(profile);
            setIsOnboardingCompleted(profile.onboarding_completed ?? false);

            const logs = await fetchDailyFoodLogs(currentUser.id);
            if (logs && logs.length > 0) {
              const cals = logs.reduce((acc, i) => acc + i.calories, 0);
              const prot = logs.reduce((acc, i) => acc + Number(i.protein_g), 0);
              const carbs = logs.reduce((acc, i) => acc + Number(i.carbs_g), 0);
              const fat = logs.reduce((acc, i) => acc + Number(i.fat_g), 0);
              setDailyTotals({ calories: cals, protein: Math.round(prot), carbs: Math.round(carbs), fat: Math.round(fat) });
            }

            const weights = await fetchWeightLogs(currentUser.id);
            if (weights && weights.length > 0) {
              const formatted = weights.map((w) => ({
                date: new Date(w.logged_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
                weight: Number(w.weight_kg),
              }));
              setWeightHistory(formatted);
            }
          } else {
            setIsOnboardingCompleted(false);
          }
        } else {
          // If user is not authenticated, redirect directly to Login screen
          router.push('/login');
          return;
        }

        // Try syncing Health Metrics via API if connected
        await fetchHealthMetrics();
      } catch (err) {
        console.error('Supabase live data fetch error:', err);
      } finally {
        setLoading(false);
      }
    }

    loadLiveData();
  }, [router]);

  const fetchHealthMetrics = async () => {
    try {
      const res = await fetch('/api/health/sync');
      if (res.ok) {
        const data = await res.json();
        if (data.success && data.metrics) {
          setHealthMetrics(data.metrics);
        }
      }
    } catch (e) {
      console.warn('Health metrics sync skipped:', e);
    }
  };

  const handleSimulateSync = (simulatedData: HealthMetrics) => {
    setHealthMetrics(simulatedData);
  };

  const handleOnboardingComplete = async (formData: any) => {
    setUserProfile(formData);
    setIsOnboardingCompleted(true);
    if (user) {
      await updateProfile(user.id, formData);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-slate-300 gap-3">
        <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
        <span className="font-display text-xs font-semibold tracking-widest uppercase">CONNECTING TO GYM HUB...</span>
      </div>
    );
  }

  if (!isOnboardingCompleted) {
    return <OnboardingWizard onComplete={handleOnboardingComplete} />;
  }

  return (
    <AppShell headerTitle="TODAY'S PERFORMANCE">
      {/* Quick Action Pills Row */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
        <Link
          href="/nutrition"
          className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-orange-500/50 flex items-center gap-3 transition-all cursor-pointer group"
        >
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 group-hover:scale-110 transition-transform">
            <Utensils className="w-4 h-4" />
          </div>
          <div>
            <div className="font-display font-bold text-slate-100 text-sm tracking-wider uppercase">LOG FUEL</div>
            <div className="font-mono text-[10px] text-slate-400">MEALS & MACROS</div>
          </div>
        </Link>

        <Link
          href="/workout"
          className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-orange-500/50 flex items-center gap-3 transition-all cursor-pointer group"
        >
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20 group-hover:scale-110 transition-transform">
            <Dumbbell className="w-4 h-4" />
          </div>
          <div>
            <div className="font-display font-bold text-slate-100 text-sm tracking-wider uppercase">START SESSION</div>
            <div className="font-mono text-[10px] text-slate-400">PUSH / PULL / LEGS</div>
          </div>
        </Link>

        <Link
          href="/progress"
          className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-orange-500/50 flex items-center gap-3 transition-all cursor-pointer group"
        >
          <div className="p-2.5 rounded-xl bg-slate-800 text-slate-300 border border-slate-700/60 group-hover:scale-110 transition-transform">
            <Scale className="w-4 h-4" />
          </div>
          <div>
            <div className="font-display font-bold text-slate-100 text-sm tracking-wider uppercase">RECORD WEIGH-IN</div>
            <div className="font-mono text-[10px] text-slate-400">BODYWEIGHT</div>
          </div>
        </Link>

        <Link
          href="/ai-coach"
          className="p-3.5 rounded-2xl bg-slate-900/90 border border-slate-800 hover:border-indigo-500/50 flex items-center gap-3 transition-all cursor-pointer group"
        >
          <div className="p-2.5 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20 group-hover:scale-110 transition-transform">
            <Bot className="w-4 h-4" />
          </div>
          <div>
            <div className="font-display font-bold text-slate-100 text-sm tracking-wider uppercase">ASK COACH</div>
            <div className="font-mono text-[10px] text-slate-400">TRAINING INTELLIGENCE</div>
          </div>
        </Link>
      </div>

      {/* Daily Macros Section */}
      <MacroCards
        caloriesConsumed={dailyTotals.calories}
        caloriesTarget={userProfile.target_calories || 2200}
        proteinConsumed={dailyTotals.protein}
        proteinTarget={userProfile.target_protein_g || 140}
        carbsConsumed={dailyTotals.carbs}
        carbsTarget={userProfile.target_carbs_g || 240}
        fatConsumed={dailyTotals.fat}
        fatTarget={userProfile.target_fat_g || 65}
      />

      {/* Main Grid: Today's Workout & AI Insight */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          <TodayWorkoutCard />
          <WeightChartCard data={weightHistory} currentWeightKg={userProfile.current_weight_kg || 72.4} goalWeightKg={userProfile.goal_weight_kg || 76.0} />
        </div>

        <div className="space-y-6">
          <AIInsightCard />
          <WaterWidget targetWaterMl={userProfile.target_water_ml || 3500} />
          <HealthSyncCard
            metrics={healthMetrics}
            onSyncRefresh={fetchHealthMetrics}
            onSimulateSync={handleSimulateSync}
          />
        </div>
      </div>
    </AppShell>
  );
}
