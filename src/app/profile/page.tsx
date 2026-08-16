'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { User, Target, Flame, Scale, Save, CheckCircle } from 'lucide-react';
import { calculateFitnessTargets } from '@/lib/utils/fitness';
import { ActivityLevel, FitnessGoal } from '@/lib/types/database';

export default function ProfilePage() {
  const [name, setName] = useState('Alex');
  const [email, setEmail] = useState('alex@example.com');
  const [age, setAge] = useState(24);
  const [gender, setGender] = useState<'male' | 'female'>('male');
  const [heightCm, setHeightCm] = useState(178);
  const [weightKg, setWeightKg] = useState(72.4);
  const [goalWeightKg, setGoalWeightKg] = useState(76.0);
  const [fitnessGoal, setFitnessGoal] = useState<FitnessGoal>('muscle_gain');
  const [activityLevel, setActivityLevel] = useState<ActivityLevel>('moderately_active');
  const [savedSuccess, setSavedSuccess] = useState(false);

  const targets = calculateFitnessTargets({
    gender,
    age,
    height_cm: heightCm,
    weight_kg: weightKg,
    goal_weight_kg: goalWeightKg,
    fitness_goal: fitnessGoal,
    activity_level: activityLevel,
  });

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSavedSuccess(true);
    setTimeout(() => setSavedSuccess(false), 3000);
  };

  return (
    <AppShell headerTitle="Profile & Target Configuration">
      <form onSubmit={handleSave} className="space-y-6 max-w-3xl">
        {/* Account Info */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <User className="w-5 h-5 text-emerald-400" />
            <h3 className="font-bold text-slate-100 text-base">Personal Account Information</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-semibold mb-1 block">Full Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold mb-1 block">Email Address</label>
              <input
                type="email"
                value={email}
                disabled
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-400 text-sm cursor-not-allowed opacity-80"
              />
            </div>
          </div>
        </div>

        {/* Biometrics */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Scale className="w-5 h-5 text-cyan-400" />
            <h3 className="font-bold text-slate-100 text-base">Biometrics & Body Stats</h3>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-semibold mb-1 block">Age</label>
              <input
                type="number"
                value={age}
                onChange={(e) => setAge(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold mb-1 block">Height (cm)</label>
              <input
                type="number"
                value={heightCm}
                onChange={(e) => setHeightCm(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold mb-1 block">Current Wt (kg)</label>
              <input
                type="number"
                step="0.1"
                value={weightKg}
                onChange={(e) => setWeightKg(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold mb-1 block">Goal Wt (kg)</label>
              <input
                type="number"
                step="0.1"
                value={goalWeightKg}
                onChange={(e) => setGoalWeightKg(Number(e.target.value))}
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Fitness Goal & Activity */}
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md space-y-4">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
            <Target className="w-5 h-5 text-amber-400" />
            <h3 className="font-bold text-slate-100 text-base">Goal & Activity Level</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-slate-400 font-semibold mb-1 block">Primary Goal</label>
              <select
                value={fitnessGoal}
                onChange={(e) => setFitnessGoal(e.target.value as FitnessGoal)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="fat_loss">Fat Loss (-500 kcal)</option>
                <option value="muscle_gain">Muscle Gain (+300 kcal)</option>
                <option value="recomposition">Recomposition (-200 kcal)</option>
                <option value="maintenance">Maintenance</option>
              </select>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-semibold mb-1 block">Activity Level</label>
              <select
                value={activityLevel}
                onChange={(e) => setActivityLevel(e.target.value as ActivityLevel)}
                className="w-full px-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-amber-500 cursor-pointer"
              >
                <option value="sedentary">Sedentary (Little workout)</option>
                <option value="lightly_active">Lightly Active (1-3 days/wk)</option>
                <option value="moderately_active">Moderately Active (3-5 days/wk)</option>
                <option value="very_active">Very Active (6-7 days/wk)</option>
              </select>
            </div>
          </div>
        </div>

        {/* Live Target Summary Output */}
        <div className="p-5 rounded-2xl bg-slate-950 border border-slate-800 space-y-3">
          <div className="flex items-center gap-2">
            <Flame className="w-5 h-5 text-orange-400" />
            <h4 className="font-bold text-slate-100 text-sm">Calculated Target Summary</h4>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-center text-xs">
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Calories</span>
              <span className="text-orange-400 font-bold text-base">{targets.target_calories} kcal</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Protein</span>
              <span className="text-emerald-400 font-bold text-base">{targets.target_protein_g} g</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Carbs</span>
              <span className="text-cyan-400 font-bold text-base">{targets.target_carbs_g} g</span>
            </div>
            <div className="p-2.5 rounded-xl bg-slate-900 border border-slate-800">
              <span className="text-slate-400 block text-[10px]">Fats</span>
              <span className="text-purple-400 font-bold text-base">{targets.target_fat_g} g</span>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <button
          type="submit"
          className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
        >
          {savedSuccess ? (
            <>
              <CheckCircle className="w-5 h-5 text-slate-950 stroke-[2.5]" />
              <span>Target Settings Saved Successfully!</span>
            </>
          ) : (
            <>
              <Save className="w-5 h-5 stroke-[2.5]" />
              <span>Save & Update Targets</span>
            </>
          )}
        </button>
      </form>
    </AppShell>
  );
}
