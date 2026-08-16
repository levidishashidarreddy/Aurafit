'use client';

import { useState } from 'react';
import { X, Zap } from 'lucide-react';
import { MealType } from '@/lib/types/database';

interface QuickAddModalProps {
  isOpen: boolean;
  mealType: MealType;
  onClose: () => void;
  onQuickAdd: (entry: {
    food_name: string;
    calories: number;
    protein_g: number;
    carbs_g: number;
    fat_g: number;
    meal_type: MealType;
  }) => void;
}

export function QuickAddModal({
  isOpen,
  mealType,
  onClose,
  onQuickAdd,
}: QuickAddModalProps) {
  const [name, setName] = useState('Quick Add Item');
  const [calories, setCalories] = useState('');
  const [protein, setProtein] = useState('');
  const [carbs, setCarbs] = useState('');
  const [fat, setFat] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onQuickAdd({
      food_name: name.trim() || 'Quick Macro Add',
      calories: Number(calories) || 0,
      protein_g: Number(protein) || 0,
      carbs_g: Number(carbs) || 0,
      fat_g: Number(fat) || 0,
      meal_type: mealType,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-400">
              <Zap className="w-4 h-4" />
            </div>
            <h3 className="font-bold text-slate-100 text-base">Quick Macro Add</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="text-xs text-slate-400 font-semibold mb-1 block">Item Name / Description</label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Homemade Protein Bowl"
              className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-orange-400 font-semibold mb-1 block">Calories (kcal)</label>
              <input
                type="number"
                value={calories}
                onChange={(e) => setCalories(e.target.value)}
                placeholder="450"
                required
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-orange-500"
              />
            </div>
            <div>
              <label className="text-xs text-emerald-400 font-semibold mb-1 block">Protein (g)</label>
              <input
                type="number"
                value={protein}
                onChange={(e) => setProtein(e.target.value)}
                placeholder="35"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-cyan-400 font-semibold mb-1 block">Carbs (g)</label>
              <input
                type="number"
                value={carbs}
                onChange={(e) => setCarbs(e.target.value)}
                placeholder="40"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
              />
            </div>
            <div>
              <label className="text-xs text-purple-400 font-semibold mb-1 block">Fat (g)</label>
              <input
                type="number"
                value={fat}
                onChange={(e) => setFat(e.target.value)}
                placeholder="12"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-purple-500"
              />
            </div>
          </div>

          <button
            type="submit"
            className="w-full py-3 mt-2 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            Add to {mealType}
          </button>
        </form>
      </div>
    </div>
  );
}
