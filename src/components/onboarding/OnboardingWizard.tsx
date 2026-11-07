'use client';

import { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CrossedDumbbellsLogo } from '@/components/brand/CrossedDumbbellsLogo';
import { calculateFitnessTargets, calculateBMI } from '@/lib/utils/fitness';
import { ActivityLevel, FitnessGoal } from '@/lib/types/database';
import {
  User,
  Scale,
  Target,
  Activity,
  Settings2,
  ArrowRight,
  ChevronLeft,
  Check,
  CheckCircle2,
  Sparkles,
  Flame,
  Clock,
  Dumbbell,
  Heart,
  Zap,
  AlertTriangle,
  Loader2,
} from 'lucide-react';

interface OnboardingWizardProps {
  initialName?: string;
  onComplete: (data: any) => Promise<void>;
}

const DRAFT_KEY = 'gymhub_onboarding_draft_v2';

const stepVariants = {
  enter: (dir: number) => ({
    x: dir > 0 ? 20 : -20,
    opacity: 0,
  }),
  center: {
    x: 0,
    opacity: 1,
  },
  exit: (dir: number) => ({
    x: dir > 0 ? -20 : 20,
    opacity: 0,
  }),
};

export function OnboardingWizard({ initialName = '', onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<number>(1);
  const [slideDirection, setSlideDirection] = useState<1 | -1>(1);
  const [isFinishing, setIsFinishing] = useState<boolean>(false);
  const [showCompletionSplash, setShowCompletionSplash] = useState<boolean>(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Step 1: Basic Profile
  const [fullName, setFullName] = useState(initialName || '');
  const [age, setAge] = useState<number>(24);
  const [gender, setGender] = useState<'male' | 'female' | 'other'>('male');

  // Step 2: Body Metrics
  const [heightCm, setHeightCm] = useState<number>(178);
  const [currentWeightKg, setCurrentWeightKg] = useState<number>(75);
  const [goalWeightKg, setGoalWeightKg] = useState<number>(75);
  const [waistCm, setWaistCm] = useState<string>('');
  const [chestCm, setChestCm] = useState<string>('');

  // Step 3: Fitness Goals (Multi-selection)
  const [selectedGoals, setSelectedGoals] = useState<string[]>(['muscle_gain', 'strength']);

  // Step 4: Activity & Targets
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderately_active');
  const [weeklyTrainingDays, setWeeklyTrainingDays] = useState<number>(4);
  const [dailyStepsGoal, setDailyStepsGoal] = useState<number>(10000);
  const [customCalories, setCustomCalories] = useState<number | null>(null);
  const [customProtein, setCustomProtein] = useState<number | null>(null);
  const [waterGoalMl, setWaterGoalMl] = useState<number>(3000);

  // Step 5: Preferences
  const [preferredWorkoutTime, setPreferredWorkoutTime] = useState<string>('evening');
  const [workoutLocation, setWorkoutLocation] = useState<string>('gym');
  const [dietaryPreference, setDietaryPreference] = useState<string>('flexible');
  const [unitsPreference, setUnitsPreference] = useState<'metric' | 'imperial'>('metric');
  const [remindersEnabled, setRemindersEnabled] = useState<boolean>(true);

  // 1. Resume Onboarding from Draft after interruption
  useEffect(() => {
    if (typeof window === 'undefined') return;
    try {
      const raw = localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const d = JSON.parse(raw);
        if (d.fullName) setFullName(d.fullName);
        if (d.age) setAge(d.age);
        if (d.gender) setGender(d.gender);
        if (d.heightCm) setHeightCm(d.heightCm);
        if (d.currentWeightKg) setCurrentWeightKg(d.currentWeightKg);
        if (d.goalWeightKg) setGoalWeightKg(d.goalWeightKg);
        if (d.waistCm) setWaistCm(d.waistCm);
        if (d.chestCm) setChestCm(d.chestCm);
        if (d.selectedGoals?.length) setSelectedGoals(d.selectedGoals);
        if (d.activityLevel) setActivityLevel(d.activityLevel);
        if (d.weeklyTrainingDays) setWeeklyTrainingDays(d.weeklyTrainingDays);
        if (d.dailyStepsGoal) setDailyStepsGoal(d.dailyStepsGoal);
        if (d.customCalories) setCustomCalories(d.customCalories);
        if (d.customProtein) setCustomProtein(d.customProtein);
        if (d.preferredWorkoutTime) setPreferredWorkoutTime(d.preferredWorkoutTime);
        if (d.workoutLocation) setWorkoutLocation(d.workoutLocation);
        if (d.dietaryPreference) setDietaryPreference(d.dietaryPreference);
        if (d.unitsPreference) setUnitsPreference(d.unitsPreference);
        if (d.remindersEnabled !== undefined) setRemindersEnabled(d.remindersEnabled);
        if (d.step && d.step >= 1 && d.step <= 5) setStep(d.step);
      }
    } catch {}
  }, []);

  // 2. Save Progress between steps
  const saveDraft = (currentStep: number) => {
    if (typeof window === 'undefined') return;
    try {
      const draft = {
        fullName,
        age,
        gender,
        heightCm,
        currentWeightKg,
        goalWeightKg,
        waistCm,
        chestCm,
        selectedGoals,
        activityLevel,
        weeklyTrainingDays,
        dailyStepsGoal,
        customCalories,
        customProtein,
        preferredWorkoutTime,
        workoutLocation,
        dietaryPreference,
        unitsPreference,
        remindersEnabled,
        step: currentStep,
      };
      localStorage.setItem(DRAFT_KEY, JSON.stringify(draft));
    } catch {}
  };

  const triggerHaptic = (len = 15) => {
    if (typeof window !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(len);
      } catch {}
    }
  };

  // Live BMI Calculation
  const { bmi, category: bmiCategory } = calculateBMI(currentWeightKg, heightCm);

  // Suggested Targets Calculation (Mifflin-St Jeor)
  const primaryGoal: FitnessGoal = selectedGoals.includes('fat_loss')
    ? 'fat_loss'
    : selectedGoals.includes('muscle_gain')
    ? 'muscle_gain'
    : selectedGoals.includes('recomposition')
    ? 'recomposition'
    : 'maintenance';

  const computed = calculateFitnessTargets({
    gender,
    age,
    height_cm: heightCm,
    weight_kg: currentWeightKg,
    goal_weight_kg: goalWeightKg,
    fitness_goal: primaryGoal,
    activity_level: activityLevel,
  });

  const activeCalories = customCalories ?? computed.target_calories;
  const activeProtein = customProtein ?? computed.target_protein_g;

  // Toggle multi-select goals
  const toggleGoal = (id: string) => {
    triggerHaptic(12);
    setSelectedGoals((prev) =>
      prev.includes(id) ? (prev.length > 1 ? prev.filter((g) => g !== id) : prev) : [...prev, id]
    );
  };

  // Validation
  const validateStep = (currentStep: number): boolean => {
    setValidationError(null);
    if (currentStep === 1) {
      if (!fullName.trim()) {
        setValidationError('Please enter your full name to proceed.');
        return false;
      }
      if (!age || age < 14 || age > 100) {
        setValidationError('Please enter a valid age between 14 and 100.');
        return false;
      }
    }
    if (currentStep === 2) {
      if (!heightCm || heightCm < 90 || heightCm > 250) {
        setValidationError('Please enter a valid height in cm (90 - 250).');
        return false;
      }
      if (!currentWeightKg || currentWeightKg < 30 || currentWeightKg > 300) {
        setValidationError('Please enter a valid current weight in kg (30 - 300).');
        return false;
      }
    }
    return true;
  };

  const handleNext = () => {
    if (!validateStep(step)) return;
    triggerHaptic(15);
    if (step < 5) {
      setSlideDirection(1);
      const nextStep = step + 1;
      setStep(nextStep);
      saveDraft(nextStep);
    } else {
      handleFinalSubmission();
    }
  };

  const handleSkipToFinish = () => {
    if (!validateStep(1) || !validateStep(2)) return;
    triggerHaptic(25);
    handleFinalSubmission();
  };

  const handleFinalSubmission = async () => {
    if (isFinishing) return;
    setIsFinishing(true);
    setShowCompletionSplash(true);

    const payload = {
      full_name: fullName.trim() || 'Athlete',
      age,
      gender,
      height_cm: heightCm,
      current_weight_kg: currentWeightKg,
      goal_weight_kg: goalWeightKg || currentWeightKg,
      fitness_goal: primaryGoal,
      fitness_goals: selectedGoals,
      activity_level: activityLevel,
      weekly_training_days: weeklyTrainingDays,
      target_steps: dailyStepsGoal,
      target_calories: activeCalories,
      target_protein_g: activeProtein,
      target_protein_min: Math.round(activeProtein * 0.95),
      target_protein_max: Math.round(activeProtein * 1.05),
      target_carbs_g: computed.target_carbs_g,
      target_fat_g: computed.target_fat_g,
      target_water_ml: waterGoalMl,
      bmr: computed.bmr,
      tdee: computed.tdee,
      preferred_workout_time: preferredWorkoutTime,
      workout_location: workoutLocation,
      dietary_preference: dietaryPreference,
      units_preference: unitsPreference,
      reminders_enabled: remindersEnabled,
      onboarding_completed: true,
    };

    // Clean up draft
    try {
      localStorage.removeItem(DRAFT_KEY);
    } catch {}

    // Immediately trigger onComplete so SignatureWelcomeExperience handles the welcome
    await onComplete(payload);
  };

  return (
    <div className="min-h-screen bg-[#070512] bg-future-streaks flex items-center justify-center p-3 sm:p-6 select-none">
      {/* Ambient background glows */}
      <div className="absolute top-10 left-10 w-72 h-72 rounded-full bg-[#9B5CFF]/15 blur-3xl pointer-events-none" />
      <div className="absolute bottom-10 right-10 w-72 h-72 rounded-full bg-[#00D5FF]/15 blur-3xl pointer-events-none" />

      <div className="w-full max-w-xl glass-future rounded-3xl p-5 sm:p-8 space-y-5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-[#9B5CFF]/25 relative z-10">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 pb-4">
          <div className="flex items-center gap-3">
            <CrossedDumbbellsLogo size={42} animated={false} />
            <div>
              <h1 className="font-display font-extrabold text-base sm:text-lg text-[#F6F2FF] tracking-wider uppercase leading-none">
                PERSONALIZED ONBOARDING
              </h1>
              <p className="text-[10px] text-[#A9A1BD] font-mono mt-1">
                STEP {step} OF 5 • {step === 1 ? 'ABOUT YOU' : step === 2 ? 'BODY METRICS' : step === 3 ? 'FITNESS GOALS' : step === 4 ? 'DAILY TARGETS' : 'PREFERENCES'}
              </p>
            </div>
          </div>

          <div className="text-xs font-display font-bold text-[#9B5CFF] bg-[#9B5CFF]/10 px-2.5 py-1 rounded-xl border border-[#9B5CFF]/20">
            {step * 20}%
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex gap-1.5">
          {[1, 2, 3, 4, 5].map((s) => (
            <div
              key={s}
              className={`h-1.5 flex-1 rounded-full transition-all duration-300 ${
                s <= step ? 'bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF]' : 'bg-white/8'
              }`}
            />
          ))}
        </div>

        {/* Validation Error Message */}
        {validationError && (
          <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/30 text-xs text-red-200 flex items-center gap-2 animate-in fade-in">
            <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
            <span>{validationError}</span>
          </div>
        )}

        {/* ============================================================== */}
        {/* ANIMATED STEP CONTENT WITH DIRECTIONAL TRANSITIONS           */}
        {/* ============================================================== */}
        <div className="overflow-hidden w-full">
          <AnimatePresence mode="wait" custom={slideDirection}>
            <motion.div
              key={step}
              custom={slideDirection}
              variants={stepVariants}
              initial="enter"
              animate="center"
              exit="exit"
              transition={{ duration: 0.28, ease: [0.16, 1, 0.3, 1] }}
              className="w-full"
            >
              {/* STEP 1: ABOUT YOU */}
              {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-display font-extrabold text-white uppercase flex items-center gap-2">
                <User className="w-4 h-4 text-[#9B5CFF]" />
                <span>About You</span>
              </h3>
              <p className="text-xs text-[#A9A1BD]">
                Basic details to personalize your fitness profile and greetings.
              </p>
            </div>

            <div className="space-y-3">
              <div>
                <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block mb-1">
                  Full Name <span className="text-[#00D5FF]">*</span>
                </label>
                <input
                  type="text"
                  placeholder="e.g. Alex Vance"
                  value={fullName}
                  onChange={(e) => {
                    setFullName(e.target.value);
                    if (validationError) setValidationError(null);
                  }}
                  className="w-full py-2.5 px-3.5 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-[#9B5CFF]"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block mb-1">
                    Age (Years) <span className="text-[#00D5FF]">*</span>
                  </label>
                  <input
                    type="number"
                    min={14}
                    max={100}
                    value={age}
                    onChange={(e) => {
                      setAge(Number(e.target.value));
                      if (validationError) setValidationError(null);
                    }}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-[#9B5CFF]"
                  />
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider">
                      Gender
                    </label>
                    <span className="text-[9px] text-[#A9A1BD] font-mono">(Optional)</span>
                  </div>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as any)}
                    className="w-full py-2.5 px-3.5 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-[#9B5CFF]"
                  >
                    <option value="male">Male</option>
                    <option value="female">Female</option>
                    <option value="other">Prefer not to say</option>
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 2: BODY METRICS & BMI                                    */}
        {/* ============================================================== */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-display font-extrabold text-white uppercase flex items-center gap-2">
                <Scale className="w-4 h-4 text-[#00D5FF]" />
                <span>Body Metrics</span>
              </h3>
              <p className="text-xs text-[#A9A1BD]">
                Used to calculate accurate metabolic energy expenditure and baseline BMI.
              </p>
            </div>

            <div className="grid grid-cols-3 gap-2.5">
              <div>
                <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block mb-1">
                  Height (cm) <span className="text-[#00D5FF]">*</span>
                </label>
                <input
                  type="number"
                  min={100}
                  max={250}
                  value={heightCm}
                  onChange={(e) => {
                    setHeightCm(Number(e.target.value));
                    if (validationError) setValidationError(null);
                  }}
                  className="w-full py-2.5 px-2 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white text-center font-bold focus:outline-none focus:border-[#00D5FF]"
                />
              </div>

              <div>
                <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block mb-1">
                  Current Wt (kg) <span className="text-[#00D5FF]">*</span>
                </label>
                <input
                  type="number"
                  step="0.5"
                  min={30}
                  max={300}
                  value={currentWeightKg}
                  onChange={(e) => {
                    setCurrentWeightKg(Number(e.target.value));
                    if (validationError) setValidationError(null);
                  }}
                  className="w-full py-2.5 px-2 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white text-center font-bold focus:outline-none focus:border-[#00D5FF]"
                />
              </div>

              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider">
                    Goal Wt
                  </label>
                  <span className="text-[9px] text-[#A9A1BD] font-mono">(Opt)</span>
                </div>
                <input
                  type="number"
                  step="0.5"
                  min={30}
                  max={300}
                  value={goalWeightKg}
                  onChange={(e) => setGoalWeightKg(Number(e.target.value))}
                  className="w-full py-2.5 px-2 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white text-center font-bold focus:outline-none focus:border-[#00D5FF]"
                />
              </div>
            </div>

            {/* Live Transparent BMI Card */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-[#00D5FF]/20 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-display font-bold text-[#00D5FF] uppercase tracking-wider block">
                  Calculated BMI Index
                </span>
                <span className="text-xs text-slate-300">
                  Category: <strong className="text-white">{bmiCategory}</strong>
                </span>
              </div>
              <div className="text-right">
                <span className="text-xl font-display font-extrabold text-white">{bmi}</span>
                <span className="text-[10px] text-slate-400 block font-mono">kg/m²</span>
              </div>
            </div>

            {/* Optional Measurements */}
            <div className="pt-1">
              <div className="flex items-center justify-between mb-1.5">
                <span className="text-[10px] font-display font-bold text-slate-400 uppercase tracking-wider">
                  Circumference Tracking
                </span>
                <span className="text-[9px] text-slate-500 font-mono">(Optional)</span>
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <input
                  type="number"
                  placeholder="Waist (Optional cm)"
                  value={waistCm}
                  onChange={(e) => setWaistCm(e.target.value)}
                  className="py-2 px-3 rounded-xl bg-black/30 border border-white/8 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00D5FF]"
                />
                <input
                  type="number"
                  placeholder="Chest (Optional cm)"
                  value={chestCm}
                  onChange={(e) => setChestCm(e.target.value)}
                  className="py-2 px-3 rounded-xl bg-black/30 border border-white/8 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-[#00D5FF]"
                />
              </div>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 3: FITNESS GOALS (MULTI-SELECT)                          */}
        {/* ============================================================== */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-display font-extrabold text-white uppercase flex items-center gap-2">
                <Target className="w-4 h-4 text-[#FF42A6]" />
                <span>Fitness Goals</span>
              </h3>
              <p className="text-xs text-[#A9A1BD]">
                Select the goals that define your current journey. The dashboard adapts to your focus.
              </p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {[
                { id: 'fat_loss', label: 'Fat Loss', desc: 'Caloric deficit & lean definition', icon: Flame },
                { id: 'muscle_gain', label: 'Muscle Gain', desc: 'Hypertrophy & progressive overload', icon: Dumbbell },
                { id: 'recomposition', label: 'Body Recomposition', desc: 'Simultaneous fat loss & muscle build', icon: Zap },
                { id: 'strength', label: 'Strength', desc: '1RM focus on heavy compound lifts', icon: Target },
                { id: 'general_fitness', label: 'General Fitness', desc: 'Cardiovascular health & stamina', icon: Heart },
              ].map((goal) => {
                const Icon = goal.icon;
                const isSelected = selectedGoals.includes(goal.id);
                return (
                  <button
                    key={goal.id}
                    type="button"
                    onClick={() => toggleGoal(goal.id)}
                    className={`p-3 rounded-2xl border text-left transition-all flex items-start gap-3 cursor-pointer min-h-[54px] active:scale-98 ${
                      isSelected
                        ? 'bg-[#FF42A6]/15 border-[#FF42A6] shadow-[0_0_15px_rgba(255,66,166,0.25)]'
                        : 'bg-black/30 border-white/8 hover:border-white/20'
                    }`}
                  >
                    <div
                      className={`w-7 h-7 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                        isSelected ? 'bg-[#FF42A6] text-slate-950' : 'bg-white/5 text-slate-400'
                      }`}
                    >
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-xs font-display font-bold text-white uppercase">{goal.label}</div>
                      <div className="text-[10.5px] text-[#A9A1BD] leading-tight">{goal.desc}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 4: DAILY TARGETS                                         */}
        {/* ============================================================== */}
        {step === 4 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-display font-extrabold text-white uppercase flex items-center gap-2">
                <Activity className="w-4 h-4 text-[#38E6A5]" />
                <span>Daily Targets</span>
              </h3>
              <p className="text-xs text-[#A9A1BD]">
                Calculated scientifically via Mifflin-St Jeor equation. Customize as you see fit.
              </p>
            </div>

            {/* Calculated Targets Display & Custom Overrides */}
            <div className="grid grid-cols-2 gap-2.5">
              <div className="p-3.5 rounded-2xl bg-black/40 border border-[#38E6A5]/25 space-y-1">
                <span className="text-[10px] font-display font-bold text-[#38E6A5] uppercase tracking-wider block">
                  Daily Calorie Target
                </span>
                <input
                  type="number"
                  value={activeCalories}
                  onChange={(e) => setCustomCalories(Number(e.target.value))}
                  className="w-full bg-transparent text-xl font-display font-extrabold text-white focus:outline-none"
                />
                <span className="text-[10px] text-[#A9A1BD] font-mono block">
                  TDEE: {computed.tdee} kcal
                </span>
              </div>

              <div className="p-3.5 rounded-2xl bg-black/40 border border-[#9B5CFF]/25 space-y-1">
                <span className="text-[10px] font-display font-bold text-[#9B5CFF] uppercase tracking-wider block">
                  Protein Target (g)
                </span>
                <input
                  type="number"
                  value={activeProtein}
                  onChange={(e) => setCustomProtein(Number(e.target.value))}
                  className="w-full bg-transparent text-xl font-display font-extrabold text-[#9B5CFF] focus:outline-none"
                />
                <span className="text-[10px] text-[#A9A1BD] font-mono block">
                  ~2.2g per kg body weight
                </span>
              </div>
            </div>

            {/* Daily Steps & Weekly Days */}
            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block mb-1">
                  Daily Step Goal
                </label>
                <input
                  type="number"
                  step="500"
                  value={dailyStepsGoal}
                  onChange={(e) => setDailyStepsGoal(Number(e.target.value))}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-[#38E6A5]"
                />
              </div>

              <div>
                <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block mb-1">
                  Workout Frequency
                </label>
                <select
                  value={weeklyTrainingDays}
                  onChange={(e) => setWeeklyTrainingDays(Number(e.target.value))}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-[#38E6A5]"
                >
                  <option value={3}>3 Days / Week</option>
                  <option value={4}>4 Days / Week (Recommended)</option>
                  <option value={5}>5 Days / Week</option>
                  <option value={6}>6 Days / Week</option>
                </select>
              </div>
            </div>

            {/* Activity Level Selector */}
            <div>
              <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block mb-1">
                Baseline Activity Level
              </label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value as any)}
                className="w-full py-2.5 px-3.5 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-[#38E6A5]"
              >
                <option value="sedentary">Sedentary (Desk work, low activity)</option>
                <option value="lightly_active">Lightly Active (1-3 gym sessions / week)</option>
                <option value="moderately_active">Moderately Active (3-5 gym sessions / week)</option>
                <option value="very_active">Very Active (6-7 gym sessions / week)</option>
              </select>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* STEP 5: PREFERENCES                                           */}
        {/* ============================================================== */}
        {step === 5 && (
          <div className="space-y-4 animate-in fade-in duration-200">
            <div className="space-y-1">
              <h3 className="text-base sm:text-lg font-display font-extrabold text-white uppercase flex items-center gap-2">
                <Settings2 className="w-4 h-4 text-[#9B5CFF]" />
                <span>Preferences</span>
              </h3>
              <p className="text-xs text-[#A9A1BD]">
                Configure training location, dietary preferences, and notifications.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block mb-1">
                  Gym vs Home
                </label>
                <select
                  value={workoutLocation}
                  onChange={(e) => setWorkoutLocation(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-[#9B5CFF]"
                >
                  <option value="gym">Commercial Gym</option>
                  <option value="home">Home Gym / Dumbbells</option>
                  <option value="calisthenics">Bodyweight Calisthenics</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block mb-1">
                  Dietary Preference
                </label>
                <select
                  value={dietaryPreference}
                  onChange={(e) => setDietaryPreference(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-[#9B5CFF]"
                >
                  <option value="flexible">High Protein / Flexible</option>
                  <option value="vegetarian">Vegetarian</option>
                  <option value="vegan">Vegan</option>
                  <option value="keto">Keto / Low-Carb</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              <div>
                <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block mb-1">
                  Preferred Time
                </label>
                <select
                  value={preferredWorkoutTime}
                  onChange={(e) => setPreferredWorkoutTime(e.target.value)}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-[#9B5CFF]"
                >
                  <option value="morning">Morning (6:00 - 10:00)</option>
                  <option value="afternoon">Afternoon (12:00 - 16:00)</option>
                  <option value="evening">Evening (17:00 - 21:00)</option>
                  <option value="night">Night (21:00+)</option>
                </select>
              </div>

              <div>
                <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block mb-1">
                  Units
                </label>
                <select
                  value={unitsPreference}
                  onChange={(e) => setUnitsPreference(e.target.value as any)}
                  className="w-full py-2.5 px-3 rounded-xl bg-black/40 border border-white/10 text-xs text-white focus:outline-none focus:border-[#9B5CFF]"
                >
                  <option value="metric">Metric (kg / cm)</option>
                  <option value="imperial">Imperial (lbs / ft)</option>
                </select>
              </div>
            </div>

            {/* Reminder Toggle */}
            <div className="p-3 rounded-2xl bg-black/30 border border-white/8 flex items-center justify-between">
              <div>
                <span className="text-xs font-display font-bold text-white uppercase block">
                  Daily Goal Reminders
                </span>
                <span className="text-[10.5px] text-[#A9A1BD]">
                  Gentle alert if workout or step target is pending
                </span>
              </div>
              <button
                type="button"
                onClick={() => setRemindersEnabled(!remindersEnabled)}
                className={`w-11 h-6 rounded-full transition-colors relative cursor-pointer ${
                  remindersEnabled ? 'bg-[#9B5CFF]' : 'bg-white/10'
                }`}
                aria-label="Toggle goal reminders"
              >
                <span
                  className={`w-5 h-5 rounded-full bg-white absolute top-0.5 transition-transform ${
                    remindersEnabled ? 'left-5' : 'left-0.5'
                  }`}
                />
              </button>
            </div>
          </div>
        )}
            </motion.div>
          </AnimatePresence>
        </div>

        {/* Quick Skip Option (Available once essential metrics are recorded) */}
        {step >= 2 && step <= 4 && (
          <div className="text-center pt-1">
            <button
              type="button"
              onClick={handleSkipToFinish}
              disabled={isFinishing}
              className="text-[11px] font-display font-semibold text-[#00D5FF] hover:underline cursor-pointer py-1 px-3 rounded-lg bg-white/5 border border-white/10 transition-colors"
            >
              Skip remaining optional details & enter dashboard →
            </button>
          </div>
        )}

        {/* ============================================================== */}
        {/* ACTION BUTTONS (BACK / NEXT / COMPLETE)                       */}
        {/* ============================================================== */}
        <div className="flex items-center justify-between pt-3 border-t border-white/8">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => {
                triggerHaptic(10);
                setSlideDirection(-1);
                const prev = step - 1;
                setStep(prev);
                saveDraft(prev);
              }}
              className="py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-[#F6F2FF] font-display font-bold text-xs uppercase tracking-wider flex items-center gap-1.5 cursor-pointer transition-colors min-h-[44px]"
            >
              <ChevronLeft className="w-4 h-4" />
              <span>Back</span>
            </button>
          ) : (
            <div />
          )}

          <button
            type="button"
            onClick={handleNext}
            disabled={isFinishing}
            className="py-3 px-6 rounded-xl bg-gradient-to-r from-[#9B5CFF] via-[#7928CA] to-[#00D5FF] hover:brightness-110 text-white font-display font-extrabold text-xs uppercase tracking-wider flex items-center gap-2 shadow-[0_0_20px_rgba(155,92,255,0.4)] active:scale-95 transition-all cursor-pointer min-h-[44px] disabled:opacity-50 disabled:pointer-events-none"
          >
            {isFinishing ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>SAVING...</span>
              </>
            ) : (
              <>
                <span>{step === 5 ? 'COMPLETE ONBOARDING' : 'CONTINUE'}</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
