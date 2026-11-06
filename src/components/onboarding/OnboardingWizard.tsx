'use client';

import { useState } from 'react';
import { Dumbbell, ArrowRight, CheckCircle, Flame, Target, User, Activity } from 'lucide-react';
import { calculateFitnessTargets, UserStatsInput } from '@/lib/utils/fitness';
import { ActivityLevel, FitnessGoal } from '@/lib/types/database';

interface OnboardingWizardProps {
  onComplete: (data: any) => void;
}

export function OnboardingWizard({ onComplete }: OnboardingWizardProps) {
  const [step, setStep] = useState<number>(1);
  const [formData, setFormData] = useState<UserStatsInput>({
    gender: 'male',
    age: 24,
    height_cm: 178,
    weight_kg: 72,
    goal_weight_kg: 76,
    fitness_goal: 'muscle_gain',
    activity_level: 'moderately_active',
  });
  const [name, setName] = useState('Alex');

  const computedTargets = calculateFitnessTargets(formData);

  const handleNext = () => {
    if (step < 3) {
      setStep(step + 1);
    } else {
      onComplete({ ...formData, ...computedTargets, full_name: name, onboarding_completed: true });
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-xl bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glow backdrop accents */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Header */}
        <div className="flex items-center gap-3">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-lg shadow-emerald-500/20">
            <Dumbbell className="w-7 h-7 text-slate-950 stroke-[2.5]" />
          </div>
          <div>
            <h1 className="text-xl md:text-2xl font-extrabold text-slate-100 tracking-tight">Welcome to AURA FIT</h1>
            <p className="text-xs text-slate-400">Step {step} of 3 • Personalized Target Engine</p>
          </div>
        </div>

        {/* Progress Stepper */}
        <div className="flex gap-2">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`h-2 flex-1 rounded-full transition-all duration-500 ${
                s <= step ? 'bg-gradient-to-r from-emerald-500 to-cyan-500' : 'bg-slate-800'
              }`}
            />
          ))}
        </div>

        {/* STEP 1: Body Metrics */}
        {step === 1 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <h3 className="font-bold text-slate-100 text-lg flex items-center gap-2">
              <User className="w-5 h-5 text-emerald-400" />
              <span>Personal Stats</span>
            </h3>

            <div>
              <label className="text-xs text-slate-400 font-semibold mb-1 block">Your Name</label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Age (years)</label>
                <input
                  type="number"
                  value={formData.age}
                  onChange={(e) => setFormData({ ...formData, age: Number(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Gender</label>
                <select
                  value={formData.gender}
                  onChange={(e) => setFormData({ ...formData, gender: e.target.value as any })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 cursor-pointer"
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                </select>
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Height (cm)</label>
                <input
                  type="number"
                  value={formData.height_cm}
                  onChange={(e) => setFormData({ ...formData, height_cm: Number(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Weight (kg)</label>
                <input
                  type="number"
                  value={formData.weight_kg}
                  onChange={(e) => setFormData({ ...formData, weight_kg: Number(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
              <div>
                <label className="text-xs text-slate-400 font-semibold mb-1 block">Goal Wt (kg)</label>
                <input
                  type="number"
                  value={formData.goal_weight_kg}
                  onChange={(e) => setFormData({ ...formData, goal_weight_kg: Number(e.target.value) })}
                  className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
                />
              </div>
            </div>
          </div>
        )}

        {/* STEP 2: Goal & Activity Level */}
        {step === 2 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <h3 className="font-bold text-slate-100 text-lg flex items-center gap-2">
              <Target className="w-5 h-5 text-cyan-400" />
              <span>Primary Goal & Lifestyle</span>
            </h3>

            <div>
              <label className="text-xs text-slate-400 font-semibold mb-2 block">Primary Fitness Goal</label>
              <div className="grid grid-cols-2 gap-2.5">
                {[
                  { id: 'fat_loss', label: 'Fat Loss (-500 kcal)' },
                  { id: 'muscle_gain', label: 'Muscle Gain (+300 kcal)' },
                  { id: 'recomposition', label: 'Recomposition (-200 kcal)' },
                  { id: 'maintenance', label: 'Maintenance' },
                ].map((g) => (
                  <button
                    type="button"
                    key={g.id}
                    onClick={() => setFormData({ ...formData, fitness_goal: g.id as FitnessGoal })}
                    className={`p-3 rounded-xl border text-left transition-all cursor-pointer ${
                      formData.fitness_goal === g.id
                        ? 'bg-emerald-950/40 border-emerald-500 text-emerald-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    <div className="text-xs">{g.label}</div>
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="text-xs text-slate-400 font-semibold mb-2 block">Activity Level</label>
              <div className="space-y-2">
                {[
                  { id: 'sedentary', label: 'Sedentary', desc: 'Desk job, little workout' },
                  { id: 'lightly_active', label: 'Lightly Active', desc: '1-3 workouts per week' },
                  { id: 'moderately_active', label: 'Moderately Active', desc: '3-5 gym sessions per week' },
                  { id: 'very_active', label: 'Very Active', desc: '6-7 heavy gym sessions per week' },
                ].map((a) => (
                  <button
                    type="button"
                    key={a.id}
                    onClick={() => setFormData({ ...formData, activity_level: a.id as ActivityLevel })}
                    className={`w-full p-3 rounded-xl border text-left transition-all cursor-pointer flex items-center justify-between ${
                      formData.activity_level === a.id
                        ? 'bg-cyan-950/40 border-cyan-500 text-cyan-300 font-bold'
                        : 'bg-slate-950 border-slate-800 text-slate-300 hover:bg-slate-800/50'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-semibold">{a.label}</div>
                      <div className="text-[11px] text-slate-400 font-normal">{a.desc}</div>
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* STEP 3: Calculated Targets Summary */}
        {step === 3 && (
          <div className="space-y-4 animate-in fade-in duration-300">
            <h3 className="font-bold text-slate-100 text-lg flex items-center gap-2">
              <Flame className="w-5 h-5 text-orange-400" />
              <span>Calculated Target Engine</span>
            </h3>

            <div className="grid grid-cols-2 gap-3">
              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-xs text-slate-400 font-semibold uppercase">Daily Calories</span>
                <div className="text-2xl font-extrabold text-orange-400 mt-1">{computedTargets.target_calories}</div>
                <span className="text-[10px] text-slate-400">kcal / day</span>
              </div>

              <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 text-center">
                <span className="text-xs text-slate-400 font-semibold uppercase">Daily Protein</span>
                <div className="text-2xl font-extrabold text-emerald-400 mt-1">{computedTargets.target_protein_g}g</div>
                <span className="text-[10px] text-slate-400">2.2g / kg body weight</span>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800 space-y-2 text-xs">
              <div className="flex justify-between">
                <span className="text-slate-400">BMR (Basal Metabolic Rate):</span>
                <span className="font-bold text-slate-200">{computedTargets.bmr} kcal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">TDEE (Total Daily Energy):</span>
                <span className="font-bold text-slate-200">{computedTargets.tdee} kcal</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Daily Carbs Target:</span>
                <span className="font-bold text-cyan-400">{computedTargets.target_carbs_g}g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Daily Fats Target:</span>
                <span className="font-bold text-purple-400">{computedTargets.target_fat_g}g</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-400">Daily Step Target:</span>
                <span className="font-bold text-emerald-400">10,000 steps</span>
              </div>
            </div>
          </div>
        )}

        {/* Buttons */}
        <div className="flex items-center justify-between pt-2">
          {step > 1 ? (
            <button
              type="button"
              onClick={() => setStep(step - 1)}
              className="py-3 px-5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs cursor-pointer"
            >
              Back
            </button>
          ) : <div />}

          <button
            type="button"
            onClick={handleNext}
            className="py-3 px-6 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-sm flex items-center gap-2 shadow-lg shadow-emerald-500/20 active:scale-95 transition-all cursor-pointer"
          >
            <span>{step === 3 ? 'Launch Dashboard' : 'Continue'}</span>
            {step === 3 ? <CheckCircle className="w-4 h-4" /> : <ArrowRight className="w-4 h-4" />}
          </button>
        </div>
      </div>
    </div>
  );
}
