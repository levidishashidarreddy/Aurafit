'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
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
  Settings2,
  Download,
  LogOut,
  Trash2,
  X,
  Shield,
  Bell,
  Activity,
  Droplet,
  LayoutGrid,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ActivityLevel, FitnessGoal } from '@/lib/types/database';
import { createClient, getFastAuthUser } from '@/lib/supabase/client';
import {
  getUserProfile,
  updateProfile,
  deleteUserAccountData,
  clearUserLocalSessionCache,
} from '@/lib/services/profileService';
import {
  fetchUserTargets,
  saveUserTargets,
  UserTargets,
  getLocalCachedTargets,
} from '@/lib/services/targetService';
import { fetchAllWeightRecords } from '@/lib/services/bodyWeightService';
import { fetchAllActivitySummaries } from '@/lib/services/dailyActivityService';
import { fetchUserWorkoutSessions } from '@/lib/services/workoutAnalyticsService';
import {
  DashboardCardConfig,
  DEFAULT_CARD_CONFIG,
} from '@/components/dashboard/DashboardCustomizeModal';

export default function ProfileAndSettingsPage() {
  const router = useRouter();
  const [userId, setUserId] = useState<string | null>(null);
  const [email, setEmail] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [saveSuccess, setSaveSuccess] = useState<boolean>(false);

  // Profile Fields
  const [fullName, setFullName] = useState<string>('');
  const [age, setAge] = useState<number | ''>('');
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');
  const [heightCm, setHeightCm] = useState<number | ''>('');
  const [currentWeightKg, setCurrentWeightKg] = useState<number | ''>('');
  const [goalWeightKg, setGoalWeightKg] = useState<number | ''>('');
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal>('muscle_gain');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderately_active');

  // Preferences
  const [preferredWorkoutTime, setPreferredWorkoutTime] = useState<string>('evening');
  const [workoutLocation, setWorkoutLocation] = useState<string>('gym');
  const [dietaryPreference, setDietaryPreference] = useState<string>('flexible');
  const [unitsPreference, setUnitsPreference] = useState<'metric' | 'imperial'>('metric');
  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(true);

  // Targets
  const [targets, setTargets] = useState<UserTargets>(() => getLocalCachedTargets());

  // Dashboard Card Customization
  const [cardConfig, setCardConfig] = useState<DashboardCardConfig>(() => {
    if (typeof window === 'undefined') return DEFAULT_CARD_CONFIG;
    try {
      const raw = localStorage.getItem('gymhub_dashboard_cards_v2');
      return raw ? { ...DEFAULT_CARD_CONFIG, ...JSON.parse(raw) } : DEFAULT_CARD_CONFIG;
    } catch {
      return DEFAULT_CARD_CONFIG;
    }
  });

  const toggleCard = (key: keyof DashboardCardConfig) => {
    const updated = { ...cardConfig, [key]: !cardConfig[key] };
    setCardConfig(updated);
    try {
      localStorage.setItem('gymhub_dashboard_cards_v2', JSON.stringify(updated));
    } catch {}
  };

  // Modals
  const [showLogoutModal, setShowLogoutModal] = useState<boolean>(false);
  const [showDeleteModal, setShowDeleteModal] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);

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
          const p = dbProfileRes.value;
          setFullName(p.full_name || '');
          setAge(p.age || '');
          setGender((p.gender as any) || 'male');
          setHeightCm(p.height_cm ? Number(p.height_cm) : '');
          setCurrentWeightKg(p.current_weight_kg ? Number(p.current_weight_kg) : '');
          setGoalWeightKg(p.goal_weight_kg ? Number(p.goal_weight_kg) : '');
          setFitnessGoal(p.fitness_goal || 'muscle_gain');
          setActivityLevel(p.activity_level || 'moderately_active');
          if (p.preferred_workout_time) setPreferredWorkoutTime(p.preferred_workout_time);
          if (p.workout_location) setWorkoutLocation(p.workout_location);
          if (p.dietary_preference) setDietaryPreference(p.dietary_preference);
          if (p.units_preference) setUnitsPreference(p.units_preference);
          if (p.reminders_enabled !== undefined) setRemindersEnabled(p.reminders_enabled);
        }

        if (weightRecordsRes.status === 'fulfilled') {
          const weightRecords = weightRecordsRes.value;
          if (weightRecords.length > 0 && !currentWeightKg) {
            const last = weightRecords[weightRecords.length - 1];
            setCurrentWeightKg(last.weight_kg);
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

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!userId) return;

    try {
      // 1. Update Profile
      await updateProfile(userId, {
        full_name: fullName.trim() || 'Athlete',
        age: age === '' ? undefined : Number(age),
        gender,
        height_cm: heightCm === '' ? undefined : Number(heightCm),
        current_weight_kg: currentWeightKg === '' ? undefined : Number(currentWeightKg),
        goal_weight_kg: goalWeightKg === '' ? undefined : Number(goalWeightKg),
        fitness_goal: fitnessGoal,
        activity_level: activityLevel,
        preferred_workout_time: preferredWorkoutTime,
        workout_location: workoutLocation,
        dietary_preference: dietaryPreference,
        units_preference: unitsPreference,
        reminders_enabled: remindersEnabled,
        target_calories: targets.calories,
        target_protein_min: targets.proteinMin,
        target_protein_max: targets.proteinMax,
        target_fibre_min: targets.fibreMin,
        target_fibre_max: targets.fibreMax,
        target_carbs_g: targets.carbs,
        target_fat_g: targets.fat,
        target_steps: targets.steps,
        weekly_training_days: targets.weeklyTrainingDays,
      });

      // 2. Save Targets centrally
      await saveUserTargets(userId, targets);

      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err) {
      console.error('Error saving profile:', err);
    }
  };

  // Secure Logout (Preserves all database records, clears user-specific caches)
  const handleConfirmLogout = async () => {
    try {
      setShowLogoutModal(false);
      await supabase.auth.signOut();
      clearUserLocalSessionCache();
      router.replace('/login');
    } catch (err) {
      console.error('Logout error:', err);
      clearUserLocalSessionCache();
      router.replace('/login');
    }
  };

  // Delete Account
  const handleConfirmDelete = async () => {
    if (!userId) return;
    try {
      setShowDeleteModal(false);
      await deleteUserAccountData(userId);
      await supabase.auth.signOut();
      clearUserLocalSessionCache();
      router.replace('/login');
    } catch (err) {
      console.error('Delete account error:', err);
      clearUserLocalSessionCache();
      router.replace('/login');
    }
  };

  // Data Export (JSON export of user fitness history)
  const handleExportData = async () => {
    if (!userId) return;
    setIsExporting(true);
    try {
      const [weights, activities, sessions, profileData] = await Promise.all([
        fetchAllWeightRecords(userId),
        fetchAllActivitySummaries(userId),
        fetchUserWorkoutSessions(userId),
        getUserProfile(userId),
      ]);

      const exportBundle = {
        exportDate: new Date().toISOString(),
        profile: profileData,
        targets,
        weightRecords: weights,
        activitySummaries: activities,
        workoutSessions: sessions,
      };

      const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportBundle, null, 2));
      const downloadAnchor = document.createElement('a');
      downloadAnchor.setAttribute('href', dataStr);
      downloadAnchor.setAttribute('download', `gymhub_backup_${new Date().toISOString().split('T')[0]}.json`);
      document.body.appendChild(downloadAnchor);
      downloadAnchor.click();
      downloadAnchor.remove();
    } catch (err) {
      console.error('Data export error:', err);
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <AppShell headerTitle="SETTINGS & ACCOUNT" headerSubtitle="PROFILE, TARGETS & PREFERENCES">
      <div className="space-y-6 max-w-4xl mx-auto pb-8">
        {/* Header Banner */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#100D20]/85 border border-[#9B5CFF]/30 backdrop-blur-xl space-y-2 shadow-[0_12px_35px_rgba(0,0,0,0.6)]">
          <div className="flex items-center gap-2 text-[10px] font-display font-bold text-[#00D5FF] uppercase tracking-wider">
            <Settings2 className="w-4 h-4 text-[#9B5CFF]" />
            <span>PERSONAL COMMAND CONFIGURATION</span>
          </div>
          <h1 className="text-xl sm:text-2xl font-display font-extrabold text-white tracking-wide uppercase">
            Profile & Ecosystem Settings
          </h1>
          <p className="text-xs text-[#A9A1BD]">
            Account: <strong className="text-white">{email || 'Authenticated User'}</strong> • Real-time target engine syncs with all tracking modules.
          </p>
        </div>

        {saveSuccess && (
          <div className="p-4 rounded-2xl bg-[#38E6A5]/15 border border-[#38E6A5]/40 text-[#38E6A5] text-xs font-display font-bold flex items-center gap-2 shadow-[0_0_15px_rgba(56,230,165,0.25)]">
            <CheckCircle2 className="w-5 h-5" />
            <span>Profile and centralized targets saved successfully!</span>
          </div>
        )}

        <form onSubmit={handleSave} className="space-y-6">
          {/* Section 1: Personal Details */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#100D20]/85 border border-white/8 backdrop-blur-xl space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <h2 className="text-sm sm:text-base font-display font-extrabold text-white uppercase flex items-center gap-2 border-b border-white/8 pb-3">
              <User className="w-4 h-4 text-[#9B5CFF]" />
              <span>Personal Details & Biometrics</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block mb-1">
                  Full Name
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Vance"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-[#9B5CFF]"
                />
              </div>

              <div>
                <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block mb-1">
                  Account Email
                </label>
                <input
                  type="email"
                  disabled
                  value={email}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-black/60 border border-white/5 text-xs sm:text-sm text-slate-400 font-mono"
                />
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block mb-1">
                  Age (Years)
                </label>
                <input
                  type="number"
                  min={14}
                  max={100}
                  value={age}
                  onChange={(e) => setAge(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-[#9B5CFF]"
                />
              </div>

              <div>
                <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block mb-1">
                  Gender
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as any)}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-[#9B5CFF]"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block mb-1">
                  Height (cm)
                </label>
                <input
                  type="number"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-[#9B5CFF]"
                />
              </div>

              <div>
                <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block mb-1">
                  Current Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={currentWeightKg}
                  onChange={(e) => setCurrentWeightKg(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-[#9B5CFF]"
                />
              </div>
            </div>
          </div>

          {/* Section 2: Goals & Activity */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#100D20]/85 border border-white/8 backdrop-blur-xl space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <h2 className="text-sm sm:text-base font-display font-extrabold text-white uppercase flex items-center gap-2 border-b border-white/8 pb-3">
              <Target className="w-4 h-4 text-[#00D5FF]" />
              <span>Fitness Goals & Training Split</span>
            </h2>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block mb-1">
                  Primary Goal
                </label>
                <select
                  value={fitnessGoal}
                  onChange={(e) => setFitnessGoal(e.target.value as any)}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-[#00D5FF]"
                >
                  <option value="fat_loss">Fat Loss (-500 kcal)</option>
                  <option value="muscle_gain">Muscle Gain (+300 kcal)</option>
                  <option value="recomposition">Body Recomposition (-200 kcal)</option>
                  <option value="maintenance">Maintenance</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block mb-1">
                  Activity Level
                </label>
                <select
                  value={activityLevel}
                  onChange={(e) => setActivityLevel(e.target.value as any)}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-[#00D5FF]"
                >
                  <option value="sedentary">Sedentary (Desk Job)</option>
                  <option value="lightly_active">Lightly Active (1-3 days)</option>
                  <option value="moderately_active">Moderately Active (3-5 days)</option>
                  <option value="very_active">Very Active (6-7 days)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block mb-1">
                  Goal Weight (kg)
                </label>
                <input
                  type="number"
                  step="0.5"
                  value={goalWeightKg}
                  onChange={(e) => setGoalWeightKg(e.target.value === '' ? '' : Number(e.target.value))}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-[#00D5FF]"
                />
              </div>
            </div>
          </div>

          {/* Section 3: Centralized Targets Engine */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#100D20]/85 border border-[#38E6A5]/25 backdrop-blur-xl space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <h2 className="text-sm sm:text-base font-display font-extrabold text-white uppercase flex items-center gap-2 border-b border-white/8 pb-3">
              <Flame className="w-4 h-4 text-[#38E6A5]" />
              <span>Daily Caloric & Nutrient Budget Targets</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div className="p-3 rounded-2xl bg-black/40 border border-white/8 space-y-1">
                <label className="text-[10px] font-display font-bold text-slate-400 uppercase block">Daily Calories</label>
                <input
                  type="number"
                  value={targets.calories}
                  onChange={(e) => setTargets({ ...targets, calories: Number(e.target.value) })}
                  className="w-full py-1.5 px-2 rounded-xl bg-black/50 border border-white/10 text-white font-extrabold text-base focus:outline-none focus:border-[#38E6A5]"
                />
              </div>

              <div className="p-3 rounded-2xl bg-black/40 border border-white/8 space-y-1">
                <label className="text-[10px] font-display font-bold text-[#00D5FF] uppercase block">Protein Range (g)</label>
                <div className="grid grid-cols-2 gap-1.5">
                  <input
                    type="number"
                    value={targets.proteinMin}
                    onChange={(e) => setTargets({ ...targets, proteinMin: Number(e.target.value) })}
                    className="py-1.5 px-1.5 rounded-xl bg-black/50 border border-white/10 text-[#00D5FF] font-bold text-xs text-center focus:outline-none"
                  />
                  <input
                    type="number"
                    value={targets.proteinMax}
                    onChange={(e) => setTargets({ ...targets, proteinMax: Number(e.target.value) })}
                    className="py-1.5 px-1.5 rounded-xl bg-black/50 border border-white/10 text-[#00D5FF] font-bold text-xs text-center focus:outline-none"
                  />
                </div>
              </div>

              <div className="p-3 rounded-2xl bg-black/40 border border-white/8 space-y-1">
                <label className="text-[10px] font-display font-bold text-[#38E6A5] uppercase block">Daily Step Goal</label>
                <input
                  type="number"
                  step="500"
                  value={targets.steps}
                  onChange={(e) => setTargets({ ...targets, steps: Number(e.target.value) })}
                  className="w-full py-1.5 px-2 rounded-xl bg-black/50 border border-white/10 text-white font-extrabold text-base focus:outline-none focus:border-[#38E6A5]"
                />
              </div>

              <div className="p-3 rounded-2xl bg-black/40 border border-white/8 space-y-1">
                <label className="text-[10px] font-display font-bold text-[#FF42A6] uppercase block">Carbs Target (g)</label>
                <input
                  type="number"
                  value={targets.carbs}
                  onChange={(e) => setTargets({ ...targets, carbs: Number(e.target.value) })}
                  className="w-full py-1.5 px-2 rounded-xl bg-black/50 border border-white/10 text-white font-extrabold text-base focus:outline-none focus:border-[#FF42A6]"
                />
              </div>
            </div>
          </div>

          {/* Section 4: Preferences & Environment */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#100D20]/85 border border-white/8 backdrop-blur-xl space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <h2 className="text-sm sm:text-base font-display font-extrabold text-white uppercase flex items-center gap-2 border-b border-white/8 pb-3">
              <Settings2 className="w-4 h-4 text-[#9B5CFF]" />
              <span>Training Preferences</span>
            </h2>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              <div>
                <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block mb-1">
                  Workout Time
                </label>
                <select
                  value={preferredWorkoutTime}
                  onChange={(e) => setPreferredWorkoutTime(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
                >
                  <option value="morning">Morning</option>
                  <option value="afternoon">Afternoon</option>
                  <option value="evening">Evening</option>
                  <option value="night">Night</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block mb-1">
                  Location
                </label>
                <select
                  value={workoutLocation}
                  onChange={(e) => setWorkoutLocation(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
                >
                  <option value="gym">Commercial Gym</option>
                  <option value="home">Home Gym</option>
                  <option value="calisthenics">Bodyweight</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block mb-1">
                  Diet Style
                </label>
                <select
                  value={dietaryPreference}
                  onChange={(e) => setDietaryPreference(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
                >
                  <option value="flexible">High Protein / Flexible</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="keto">Keto</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block mb-1">
                  Units
                </label>
                <select
                  value={unitsPreference}
                  onChange={(e) => setUnitsPreference(e.target.value as any)}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white"
                >
                  <option value="metric">Metric (kg / cm)</option>
                  <option value="imperial">Imperial (lbs / ft)</option>
                </select>
              </div>
            </div>
          </div>

          {/* Section 5: Dashboard Card Customization */}
          <div className="p-5 sm:p-6 rounded-3xl bg-[#100D20]/85 border border-[#9B5CFF]/20 backdrop-blur-xl space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
            <h2 className="text-sm sm:text-base font-display font-extrabold text-white uppercase flex items-center gap-2 border-b border-white/8 pb-3">
              <LayoutGrid className="w-4 h-4 text-[#9B5CFF]" />
              <span>Customize Dashboard Cards</span>
            </h2>
            <p className="text-xs text-[#A9A1BD]">
              Toggle which cards appear on your personal dashboard command center.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { key: 'streak' as const, label: 'Dragon Streak Engine', desc: 'Streak counter & flame emblem' },
                { key: 'macros' as const, label: 'Calorie & Macro Budget', desc: 'Calories, protein, carbs & fat' },
                { key: 'workout' as const, label: "Today's Gym Workout", desc: 'Planned daily exercises' },
                { key: 'activity' as const, label: 'Daily Activity & Steps', desc: 'Steps & active calories' },
                { key: 'weight' as const, label: 'Body Weight Analytics', desc: '7D moving avg & chart' },
                { key: 'recent' as const, label: 'Recent Gym Sessions', desc: 'Workout history log' },
              ].map((item) => {
                const isVisible = cardConfig[item.key];
                return (
                  <button
                    key={item.key}
                    type="button"
                    onClick={() => toggleCard(item.key)}
                    className={`p-3 rounded-2xl border flex items-center justify-between text-left cursor-pointer transition-all ${
                      isVisible
                        ? 'bg-black/40 border-[#9B5CFF]/30 hover:border-[#9B5CFF]/60'
                        : 'bg-black/20 border-white/5 opacity-60 hover:opacity-80'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-display font-bold text-white uppercase">{item.label}</div>
                      <div className="text-[10px] text-[#A9A1BD]">{item.desc}</div>
                    </div>
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center border transition-all ${
                        isVisible
                          ? 'bg-[#9B5CFF]/20 text-[#00D5FF] border-[#9B5CFF]/40'
                          : 'bg-white/5 text-slate-500 border-white/10'
                      }`}
                    >
                      {isVisible ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Save Action */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <button
              type="submit"
              className="py-3.5 px-8 rounded-2xl bg-gradient-to-r from-[#9B5CFF] via-[#7928CA] to-[#00D5FF] hover:brightness-110 text-white font-display font-extrabold text-sm uppercase tracking-wider flex items-center gap-2 shadow-[0_0_25px_rgba(155,92,255,0.4)] active:scale-95 transition-all cursor-pointer"
            >
              <Save className="w-4 h-4 stroke-[2.5]" />
              <span>Save Profile & Targets</span>
            </button>
          </div>
        </form>

        {/* Section 5: Account Security & Data Management */}
        <div className="p-5 sm:p-6 rounded-3xl bg-[#100D20]/85 border border-white/8 backdrop-blur-xl space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)]">
          <h2 className="text-sm sm:text-base font-display font-extrabold text-white uppercase flex items-center gap-2 border-b border-white/8 pb-3">
            <Shield className="w-4 h-4 text-[#00D5FF]" />
            <span>Account Security & Data Management</span>
          </h2>

          <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 pt-1">
            <div>
              <h4 className="font-display font-bold text-white text-sm uppercase">Export Personal Fitness Data</h4>
              <p className="text-xs text-[#A9A1BD]">
                Download a complete JSON backup of your workouts, nutrition, activity, and weight history.
              </p>
            </div>
            <button
              type="button"
              onClick={handleExportData}
              disabled={isExporting}
              className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-white text-xs font-display font-bold uppercase border border-white/10 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Download className="w-4 h-4 text-[#00D5FF]" />
              <span>{isExporting ? 'Exporting...' : 'Export JSON Data'}</span>
            </button>
          </div>

          <div className="border-t border-white/8 pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-display font-bold text-white text-sm uppercase">Account Session</h4>
              <p className="text-xs text-[#A9A1BD]">
                Sign out of your active GYM HUB session. Your data remains safely stored in Supabase.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowLogoutModal(true)}
              className="py-2.5 px-5 rounded-xl bg-white/5 hover:bg-white/10 text-[#00D5FF] text-xs font-display font-bold uppercase border border-[#00D5FF]/30 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
              <span>Log Out</span>
            </button>
          </div>

          <div className="border-t border-white/8 pt-3 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3">
            <div>
              <h4 className="font-display font-bold text-rose-400 text-sm uppercase">Delete Account & Data</h4>
              <p className="text-xs text-[#A9A1BD]">
                Permanently purge your athlete profile and all associated fitness logs.
              </p>
            </div>
            <button
              type="button"
              onClick={() => setShowDeleteModal(true)}
              className="py-2.5 px-4 rounded-xl bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-display font-bold uppercase border border-rose-500/25 flex items-center justify-center gap-2 transition-colors cursor-pointer"
            >
              <Trash2 className="w-4 h-4" />
              <span>Delete Account</span>
            </button>
          </div>
        </div>

        {/* Subtle Premium Footer Requirement */}
        <div className="pt-6 pb-2 text-center select-none">
          <p className="font-mono text-xs text-[#A9A1BD]/75 tracking-widest uppercase">
            Powered by Master
          </p>
        </div>
      </div>

      {/* Logout Confirmation Modal */}
      {showLogoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-future rounded-3xl p-6 max-w-sm w-full border border-white/15 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-[#00D5FF]/15 text-[#00D5FF] flex items-center justify-center mx-auto border border-[#00D5FF]/30">
              <LogOut className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-display font-bold text-white uppercase">Confirm Sign Out</h3>
            <p className="text-xs text-[#A9A1BD]">
              Are you sure you want to log out? All your history and streaks remain securely preserved.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowLogoutModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmLogout}
                className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF] text-white text-xs font-display font-bold uppercase shadow-[0_0_15px_rgba(155,92,255,0.4)]"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
          <div className="glass-future rounded-3xl p-6 max-w-sm w-full border border-rose-500/30 space-y-4 text-center">
            <div className="w-12 h-12 rounded-2xl bg-rose-500/15 text-rose-400 flex items-center justify-center mx-auto border border-rose-500/30">
              <Trash2 className="w-6 h-6" />
            </div>
            <h3 className="text-lg font-display font-bold text-white uppercase">Delete Account</h3>
            <p className="text-xs text-rose-300/80">
              This action cannot be undone. All your workout sessions, weigh-in history, and nutrition logs will be purged.
            </p>
            <div className="flex items-center justify-center gap-3 pt-2">
              <button
                onClick={() => setShowDeleteModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-white/5 text-slate-300 text-xs font-bold uppercase"
              >
                Cancel
              </button>
              <button
                onClick={handleConfirmDelete}
                className="flex-1 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-display font-bold uppercase shadow-[0_0_15px_rgba(225,29,72,0.4)]"
              >
                Confirm Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
