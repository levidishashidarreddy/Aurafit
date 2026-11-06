'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import {
  User,
  Target,
  Flame,
  Scale,
  Save,
  CheckCircle2,
  Footprints,
  Calendar,
  AlertCircle,
  Dumbbell,
  Sparkles,
  Info
} from 'lucide-react';
import { ActivityLevel, FitnessGoal } from '@/lib/types/database';
import { createClient, getFastAuthUser } from '@/lib/supabase/client';
import { getUserProfile, updateProfile } from '@/lib/services/profileService';
import {
  fetchUserTargets,
  saveUserTargets,
  UserTargets,
  DEFAULT_CENTRALIZED_TARGETS,
  getLocalCachedTargets,
} from '@/lib/services/targetService';
import { fetchAllWeightRecords } from '@/lib/services/bodyWeightService';

export default function ProfileAndGoalsPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Authenticated Profile Fields (Initialized empty, never hardcoded fake Alex 24)
  const [fullName, setFullName] = useState<string>('');
  const [email, setEmail] = useState<string>('');
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [heightCm, setHeightCm] = useState<number | ''>('');
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal>('muscle_gain');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderately_active');

  // Actual measured weight from weight logs (read-only measurement, not goal)
  const [latestMeasuredWeight, setLatestMeasuredWeight] = useState<{ weightKg: number; date: string } | null>(null);

  // Centralized Targets (Single source of truth) - instant local read
  const [targets, setTargets] = useState<UserTargets>(() => getLocalCachedTargets());

  const supabase = createClient();

  useEffect(() => {
    async function loadData() {
      try {
        const user = await getFastAuthUser();
        let uid = 'guest';

        if (user) {
          uid = user.id;
          setUserId(user.id);
          setEmail(user.email || '');
        }

        const [dbProfileRes, weightRecordsRes, loadedTargetsRes] = await Promise.allSettled([
          user ? getUserProfile(user.id) : Promise.resolve(null),
          fetchAllWeightRecords(uid),
          fetchUserTargets(uid),
        ]);

        if (dbProfileRes.status === 'fulfilled' && dbProfileRes.value) {
          const dbProfile = dbProfileRes.value;
          setFullName(dbProfile.full_name || '');
          setAge(dbProfile.age || '');
          setGender((dbProfile.gender as any) || 'male');
          setHeightCm(dbProfile.height_cm ? Number(dbProfile.height_cm) : '');
          setFitnessGoal(dbProfile.fitness_goal || 'muscle_gain');
          setActivityLevel(dbProfile.activity_level || 'moderately_active');
        }

        if (weightRecordsRes.status === 'fulfilled') {
          const weightRecords = weightRecordsRes.value;
          if (weightRecords.length > 0) {
            const last = weightRecords[weightRecords.length - 1];
            setLatestMeasuredWeight({ weightKg: last.weight_kg, date: last.logged_at });
          }
        }

        if (loadedTargetsRes.status === 'fulfilled') {
          setTargets(loadedTargetsRes.value);
        }
      } catch (err) {
        console.error('Error loading profile and targets:', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  const handleSaveAll = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaveSuccess(false);

    try {
      // 1. Save targets via centralized service
      await saveUserTargets(userId || undefined, targets);

      // 2. Save profile fields to database if user authenticated
      if (userId && userId !== 'guest') {
        await updateProfile(userId, {
          full_name: fullName,
          age: typeof age === 'number' ? age : undefined,
          gender,
          height_cm: typeof heightCm === 'number' ? heightCm : undefined,
          goal_weight_kg: targets.goalWeightKg || undefined,
          fitness_goal: fitnessGoal,
          activity_level: activityLevel,
        });
      }

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 4000);
    } catch (err) {
      console.error('Failed to save profile settings:', err);
    }
  };

  return (
    <AppShell headerTitle="Profile & Tracking Goals">
      <div className="max-w-4xl mx-auto space-y-6">
        {/* Header Banner */}
        <div className="p-5 md:p-6 rounded-3xl bg-gradient-to-r from-slate-900 via-slate-900 to-orange-950/20 border border-slate-800 shadow-xl space-y-2">
          <div className="flex items-center gap-2 text-xs font-bold text-orange-400 uppercase tracking-wider">
            <Target className="w-4 h-4" />
            <span>Single Source of Truth</span>
          </div>
          <h1 className="text-xl md:text-2xl font-black text-slate-100">
            Profile & Centralized Goal Settings
          </h1>
          <p className="text-xs text-slate-400">
            All fitness targets configured here synchronize automatically across your Dashboard, Nutrition Tracker, Activity Tracker, and Progress Hub.
          </p>
        </div>

        {saveSuccess && (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-in fade-in duration-200">
            <CheckCircle2 className="w-5 h-5 text-emerald-400" />
            <span>Settings saved successfully! All tracking modules have been updated with your new targets.</span>
          </div>
        )}

        <form onSubmit={handleSaveAll} className="space-y-6">
          {/* SECTION 1: PERSONAL PROFILE */}
          <div className="p-5 md:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-orange-500/10 text-orange-400 flex items-center justify-center border border-orange-500/20">
                  <User className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-100 text-sm md:text-base">Personal Profile</h2>
                  <p className="text-[11px] text-slate-400">Your biometric baseline (never populated with fake demo profiles)</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              {/* Full Name */}
              <div className="space-y-1">
                <label className="text-slate-400 font-bold block">Full Name</label>
                <input
                  type="text"
                  placeholder="Your full name"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-medium focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Email (Read from authenticated account) */}
              <div className="space-y-1">
                <label className="text-slate-400 font-bold block">Authenticated Email</label>
                <input
                  type="email"
                  disabled
                  value={email || 'Not authenticated (Guest Mode)'}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-950/60 border border-slate-800 text-slate-400 cursor-not-allowed font-medium"
                />
              </div>

              {/* Age */}
              <div className="space-y-1">
                <label className="text-slate-400 font-bold block">Age</label>
                <input
                  type="number"
                  placeholder="e.g. 28"
                  value={age}
                  onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-medium focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Gender */}
              <div className="space-y-1">
                <label className="text-slate-400 font-bold block">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-medium focus:outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other / Prefer not to say</option>
                </select>
              </div>

              {/* Height */}
              <div className="space-y-1">
                <label className="text-slate-400 font-bold block">Height (cm)</label>
                <input
                  type="number"
                  placeholder="e.g. 178"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-medium focus:outline-none focus:border-orange-500"
                />
              </div>

              {/* Primary Fitness Goal */}
              <div className="space-y-1">
                <label className="text-slate-400 font-bold block">Primary Fitness Goal</label>
                <select
                  value={fitnessGoal}
                  onChange={(e) => setFitnessGoal(e.target.value as any)}
                  className="w-full py-2.5 px-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 font-medium focus:outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value="fat_loss">Fat Loss (Calorie Deficit)</option>
                  <option value="maintenance">Maintenance (Body Recomposition)</option>
                  <option value="muscle_gain">Muscle Gain (Hypertrophy)</option>
                </select>
              </div>
            </div>

            {/* Current Body Weight vs Goal Body Weight (Strictly Separated) */}
            <div className="p-4 rounded-2xl bg-slate-950/70 border border-slate-800/80 grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
              <div>
                <span className="text-[10px] font-bold text-slate-400 uppercase block mb-0.5">Latest Measured Weight</span>
                {latestMeasuredWeight ? (
                  <div className="flex items-baseline gap-2">
                    <span className="text-xl font-black text-slate-100">{latestMeasuredWeight.weightKg} kg</span>
                    <span className="text-[11px] text-slate-400">Logged on {latestMeasuredWeight.date}</span>
                  </div>
                ) : (
                  <span className="text-xs text-slate-400 italic">No weight measurements logged yet</span>
                )}
                <p className="text-[10px] text-slate-400 mt-1">
                  Actual body weight is recorded via Activity & Body Weight, kept distinct from goal settings.
                </p>
              </div>

              <div>
                <label className="text-[10px] font-bold text-slate-400 uppercase block mb-1">Target / Goal Body Weight (kg)</label>
                <input
                  type="number"
                  step="0.1"
                  placeholder="e.g. 75.0"
                  value={targets.goalWeightKg || ''}
                  onChange={(e) => setTargets({ ...targets, goalWeightKg: e.target.value ? Number(e.target.value) : null })}
                  className="w-full py-2 px-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm font-bold focus:outline-none focus:border-orange-500"
                />
              </div>
            </div>
          </div>

          {/* SECTION 2: CENTRALIZED NUTRITION & ACTIVITY TARGETS */}
          <div className="p-5 md:p-6 rounded-3xl bg-slate-900/90 border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-400 flex items-center justify-center border border-emerald-500/20">
                  <Target className="w-4 h-4" />
                </div>
                <div>
                  <h2 className="font-extrabold text-slate-100 text-sm md:text-base">Centralized Daily Tracking Targets</h2>
                  <p className="text-[11px] text-slate-400">Configured once; applied universally across GYM HUB</p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 text-xs">
              {/* Daily Calorie Target */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Daily Calorie Target (kcal)</label>
                <input
                  type="number"
                  value={targets.calories}
                  onChange={(e) => setTargets({ ...targets, calories: Number(e.target.value) })}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 font-extrabold text-base focus:outline-none focus:border-orange-500"
                />
                <span className="text-[10px] text-slate-400">Baseline initialized to 1,900 kcal</span>
              </div>

              {/* Protein Target Range */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Protein Target Range (g)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    placeholder="Min"
                    value={targets.proteinMin}
                    onChange={(e) => setTargets({ ...targets, proteinMin: Number(e.target.value) })}
                    className="py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 font-extrabold text-sm focus:outline-none focus:border-orange-500 text-center"
                  />
                  <input
                    type="number"
                    placeholder="Max"
                    value={targets.proteinMax}
                    onChange={(e) => setTargets({ ...targets, proteinMax: Number(e.target.value) })}
                    className="py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 font-extrabold text-sm focus:outline-none focus:border-orange-500 text-center"
                  />
                </div>
                <span className="text-[10px] text-slate-400">Recommended range: 80–90 g</span>
              </div>

              {/* Step Target */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Daily Step Target</label>
                <input
                  type="number"
                  value={targets.steps}
                  onChange={(e) => setTargets({ ...targets, steps: Number(e.target.value) })}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 font-extrabold text-base focus:outline-none focus:border-orange-500"
                />
                <span className="text-[10px] text-slate-400">Default: 10,000 steps</span>
              </div>

              {/* Dietary Fibre Target Range */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Fibre Target Range (g)</label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="number"
                    value={targets.fibreMin}
                    onChange={(e) => setTargets({ ...targets, fibreMin: Number(e.target.value) })}
                    className="py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 font-extrabold text-sm focus:outline-none focus:border-orange-500 text-center"
                  />
                  <input
                    type="number"
                    value={targets.fibreMax}
                    onChange={(e) => setTargets({ ...targets, fibreMax: Number(e.target.value) })}
                    className="py-1.5 px-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 font-extrabold text-sm focus:outline-none focus:border-orange-500 text-center"
                  />
                </div>
                <span className="text-[10px] text-slate-400">Recommended: 25–30 g</span>
              </div>

              {/* Carbohydrates Target */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Carbohydrate Target (g)</label>
                <input
                  type="number"
                  value={targets.carbs}
                  onChange={(e) => setTargets({ ...targets, carbs: Number(e.target.value) })}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 font-extrabold text-base focus:outline-none focus:border-orange-500"
                />
                <span className="text-[10px] text-slate-400">Default: 210 g</span>
              </div>

              {/* Total Fat Target */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Total Fat Target (g)</label>
                <input
                  type="number"
                  value={targets.fat}
                  onChange={(e) => setTargets({ ...targets, fat: Number(e.target.value) })}
                  className="w-full py-1.5 px-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 font-extrabold text-base focus:outline-none focus:border-orange-500"
                />
                <span className="text-[10px] text-slate-400">Default: 60 g</span>
              </div>

              {/* Weekly Training Frequency */}
              <div className="p-3.5 rounded-2xl bg-slate-950/70 border border-slate-800 space-y-1">
                <label className="text-[10px] font-bold text-slate-400 uppercase block">Weekly Workout Frequency</label>
                <select
                  value={targets.weeklyTrainingDays}
                  onChange={(e) => setTargets({ ...targets, weeklyTrainingDays: Number(e.target.value) })}
                  className="w-full py-2 px-2.5 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 font-extrabold text-sm focus:outline-none focus:border-orange-500 cursor-pointer"
                >
                  <option value={3}>3 Days / Week</option>
                  <option value={4}>4 Days / Week (Upper/Lower or Push/Pull)</option>
                  <option value={5}>5 Days / Week</option>
                  <option value={6}>6 Days / Week (PPL Split)</option>
                </select>
                <span className="text-[10px] text-slate-400">Used for weekly adherence planning</span>
              </div>
            </div>
          </div>

          {/* Action Bar */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              className="py-3 px-8 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-black text-sm shadow-xl shadow-orange-500/20 transition-all flex items-center gap-2 cursor-pointer"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              <span>Save Profile & Target Settings</span>
            </button>
          </div>
        </form>
      </div>
    </AppShell>
  );
}
