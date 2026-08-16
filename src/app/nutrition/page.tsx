'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { FoodSearchModal } from '@/components/nutrition/FoodSearchModal';
import { QuickAddModal } from '@/components/nutrition/QuickAddModal';
import { WaterWidget } from '@/components/dashboard/WaterWidget';
import { Plus, Search, Zap, Trash2, Loader2 } from 'lucide-react';
import { MealType, FoodLog } from '@/lib/types/database';
import { createClient } from '@/lib/supabase/client';
import { fetchDailyFoodLogs, addFoodLog, deleteFoodLog } from '@/lib/services/foodLogService';

export function NutritionPageContent() {
  const [loading, setLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [logs, setLogs] = useState<FoodLog[]>([
    { id: '1', user_id: 'demo', food_name: 'Whole Eggs (Large)', meal_type: 'breakfast', servings: 3, calories: 215, protein_g: 18.9, carbs_g: 1.0, fat_g: 14.2, logged_at: '', created_at: '' },
    { id: '2', user_id: 'demo', food_name: 'Oatmeal with Honey', meal_type: 'breakfast', servings: 1, calories: 310, protein_g: 10.0, carbs_g: 54.0, fat_g: 5.0, logged_at: '', created_at: '' },
    { id: '3', user_id: 'demo', food_name: 'Grilled Chicken Breast', meal_type: 'lunch', servings: 2, calories: 330, protein_g: 62.0, carbs_g: 0.0, fat_g: 7.2, logged_at: '', created_at: '' },
    { id: '4', user_id: 'demo', food_name: 'White Rice (Cooked)', meal_type: 'lunch', servings: 1.5, calories: 195, protein_g: 4.0, carbs_g: 42.0, fat_g: 0.5, logged_at: '', created_at: '' },
  ]);

  const [activeMealType, setActiveMealType] = useState<MealType>('breakfast');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isQuickAddOpen, setIsQuickAddOpen] = useState(false);

  const supabase = createClient();

  useEffect(() => {
    async function loadLogs() {
      try {
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          setUserId(user.id);
          const liveLogs = await fetchDailyFoodLogs(user.id);
          if (liveLogs && liveLogs.length > 0) {
            setLogs(liveLogs);
          }
        }
      } catch (err) {
        console.error('Error fetching live food logs:', err);
      } finally {
        setLoading(false);
      }
    }
    loadLogs();
  }, []);

  const openSearch = (type: MealType) => {
    setActiveMealType(type);
    setIsSearchOpen(true);
  };

  const openQuickAdd = (type: MealType) => {
    setActiveMealType(type);
    setIsQuickAddOpen(true);
  };

  const removeItem = async (id: string) => {
    setLogs((prev) => prev.filter((l) => l.id !== id));
    if (userId && !id.startsWith('demo')) {
      await deleteFoodLog(id);
    }
  };

  const handleAddFood = async (food: any, servings: number, mealType: MealType) => {
    const entryData = {
      food_name: food.name,
      meal_type: mealType,
      servings,
      calories: Math.round(food.calories * servings),
      protein_g: parseFloat((food.protein_g * servings).toFixed(1)),
      carbs_g: parseFloat((food.carbs_g * servings).toFixed(1)),
      fat_g: parseFloat((food.fat_g * servings).toFixed(1)),
    };

    if (userId) {
      const saved = await addFoodLog({ user_id: userId, ...entryData });
      if (saved) {
        setLogs((prev) => [...prev, saved]);
        return;
      }
    }

    const fallbackItem: FoodLog = {
      id: Math.random().toString(),
      user_id: userId || 'demo',
      ...entryData,
      logged_at: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    };
    setLogs((prev) => [...prev, fallbackItem]);
  };

  const handleQuickAdd = async (entry: any) => {
    if (userId) {
      const saved = await addFoodLog({ user_id: userId, ...entry });
      if (saved) {
        setLogs((prev) => [...prev, saved]);
        return;
      }
    }

    const fallbackItem: FoodLog = {
      id: Math.random().toString(),
      user_id: userId || 'demo',
      ...entry,
      servings: 1,
      logged_at: new Date().toISOString().split('T')[0],
      created_at: new Date().toISOString(),
    };
    setLogs((prev) => [...prev, fallbackItem]);
  };

  // Compute totals
  const totalCalories = logs.reduce((acc, item) => acc + item.calories, 0);
  const totalProtein = logs.reduce((acc, item) => acc + Number(item.protein_g), 0);
  const totalCarbs = logs.reduce((acc, item) => acc + Number(item.carbs_g), 0);
  const totalFat = logs.reduce((acc, item) => acc + Number(item.fat_g), 0);

  const mealsList: MealType[] = ['breakfast', 'lunch', 'dinner', 'snack'];

  return (
    <AppShell headerTitle="Nutrition & Food Logging">
      {/* Daily Summary Banner */}
      <div className="p-4 md:p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-slate-900 to-emerald-950/30 border border-slate-800 flex flex-col md:flex-row justify-between md:items-center gap-4">
        <div>
          <h2 className="font-extrabold text-slate-100 text-lg md:text-xl">Daily Nutrition Summary</h2>
          <p className="text-xs text-slate-400">Target: 2,200 kcal • 140g Protein</p>
        </div>

        <div className="flex items-center gap-4 text-xs font-bold">
          <div className="text-center px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block text-[10px] font-normal">Calories</span>
            <span className="text-orange-400 text-sm">{totalCalories} kcal</span>
          </div>
          <div className="text-center px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block text-[10px] font-normal">Protein</span>
            <span className="text-emerald-400 text-sm">{totalProtein.toFixed(0)} g</span>
          </div>
          <div className="text-center px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block text-[10px] font-normal">Carbs</span>
            <span className="text-cyan-400 text-sm">{totalCarbs.toFixed(0)} g</span>
          </div>
          <div className="text-center px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800">
            <span className="text-slate-400 block text-[10px] font-normal">Fats</span>
            <span className="text-purple-400 text-sm">{totalFat.toFixed(0)} g</span>
          </div>
        </div>
      </div>

      {/* Meal Breakdown Sections */}
      <div className="space-y-4">
        {mealsList.map((meal) => {
          const mealLogs = logs.filter((l) => l.meal_type === meal);
          const mealCal = mealLogs.reduce((acc, i) => acc + i.calories, 0);
          const mealProt = mealLogs.reduce((acc, i) => acc + Number(i.protein_g), 0);

          return (
            <div key={meal} className="p-4 md:p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md space-y-3">
              <div className="flex items-center justify-between border-b border-slate-800 pb-3">
                <div>
                  <h3 className="font-bold text-slate-100 text-base capitalize">{meal}</h3>
                  <p className="text-xs text-slate-400 font-medium">
                    {mealCal} kcal • {mealProt.toFixed(0)}g Protein
                  </p>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => openSearch(meal)}
                    className="py-1.5 px-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 shadow-md shadow-emerald-500/20"
                  >
                    <Search className="w-3.5 h-3.5" />
                    <span>Search Food</span>
                  </button>

                  <button
                    onClick={() => openQuickAdd(meal)}
                    className="py-1.5 px-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-emerald-400 border border-slate-700/60 font-semibold text-xs flex items-center gap-1 cursor-pointer"
                    title="Quick Add Macros"
                  >
                    <Zap className="w-3.5 h-3.5" />
                    <span className="hidden sm:inline">Quick Add</span>
                  </button>
                </div>
              </div>

              {/* Logged Foods List */}
              {mealLogs.length === 0 ? (
                <div className="py-4 text-center text-xs text-slate-400 italic">
                  No items logged for {meal} yet. Tap 'Search Food' to log.
                </div>
              ) : (
                <div className="space-y-2">
                  {mealLogs.map((item) => (
                    <div
                      key={item.id}
                      className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 flex items-center justify-between"
                    >
                      <div>
                        <div className="font-semibold text-slate-200 text-sm">{item.food_name}</div>
                        <div className="text-xs text-slate-400">
                          {item.servings} serving(s) •{' '}
                          <span className="text-orange-400 font-semibold">{item.calories} kcal</span> •{' '}
                          <span className="text-emerald-400">P: {item.protein_g}g</span> •{' '}
                          <span className="text-cyan-400">C: {item.carbs_g}g</span> •{' '}
                          <span className="text-purple-400">F: {item.fat_g}g</span>
                        </div>
                      </div>

                      <button
                        onClick={() => removeItem(item.id)}
                        className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-900 rounded-lg cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      <WaterWidget />

      {/* Modals */}
      <FoodSearchModal
        isOpen={isSearchOpen}
        mealType={activeMealType}
        onClose={() => setIsSearchOpen(false)}
        onFoodLogged={handleAddFood}
      />

      <QuickAddModal
        isOpen={isQuickAddOpen}
        mealType={activeMealType}
        onClose={() => setIsQuickAddOpen(false)}
        onQuickAdd={handleQuickAdd}
      />
    </AppShell>
  );
}

export default function NutritionPage() {
  return <NutritionPageContent />;
}
