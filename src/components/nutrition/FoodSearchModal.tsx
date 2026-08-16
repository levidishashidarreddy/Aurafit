'use client';

import { useState } from 'react';
import { Search, X, Plus, Barcode, Check, Loader2 } from 'lucide-react';
import { searchFoods, fetchFoodByBarcode, FoodSearchResult } from '@/lib/services/foodService';
import { MealType } from '@/lib/types/database';

interface FoodSearchModalProps {
  isOpen: boolean;
  mealType: MealType;
  onClose: () => void;
  onFoodLogged: (food: FoodSearchResult, servings: number, mealType: MealType) => void;
}

export function FoodSearchModal({
  isOpen,
  mealType,
  onClose,
  onFoodLogged,
}: FoodSearchModalProps) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<FoodSearchResult[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);
  const [servings, setServings] = useState(1);
  const [barcodeInput, setBarcodeInput] = useState('');
  const [showBarcodeField, setShowBarcodeField] = useState(false);

  if (!isOpen) return null;

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    const data = await searchFoods(query);
    setResults(data);
    setLoading(false);
  };

  const handleBarcodeLookup = async () => {
    if (!barcodeInput.trim()) return;
    setLoading(true);
    const result = await fetchFoodByBarcode(barcodeInput.trim());
    if (result) {
      setResults([result]);
      setSelectedFood(result);
    }
    setLoading(false);
  };

  const handleConfirmLog = () => {
    if (selectedFood) {
      onFoodLogged(selectedFood, servings, mealType);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-lg p-5 shadow-2xl space-y-4 relative max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div>
            <h3 className="font-bold text-slate-100 text-lg capitalize">Add Food to {mealType}</h3>
            <p className="text-xs text-slate-400">Search database or OpenFoodFacts</p>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search Bar */}
        <form onSubmit={handleSearch} className="flex gap-2">
          <div className="relative flex-1">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-3.5" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search food e.g. Chicken, Rice, Eggs..."
              className="w-full pl-9 pr-4 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500 transition-colors"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="px-4 py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 cursor-pointer"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Search'}
          </button>
        </form>

        {/* Barcode toggle */}
        <div className="flex items-center justify-between text-xs">
          <button
            type="button"
            onClick={() => setShowBarcodeField(!showBarcodeField)}
            className="text-cyan-400 font-semibold flex items-center gap-1.5 cursor-pointer hover:underline"
          >
            <Barcode className="w-4 h-4" />
            <span>{showBarcodeField ? 'Hide Barcode Input' : 'Scan / Enter Barcode'}</span>
          </button>
        </div>

        {showBarcodeField && (
          <div className="flex gap-2 p-3 rounded-xl bg-slate-950 border border-slate-800">
            <input
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="Enter product barcode e.g. 737628064502"
              className="flex-1 px-3 py-2 rounded-lg bg-slate-900 border border-slate-800 text-slate-100 text-xs focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={handleBarcodeLookup}
              className="px-3 py-2 rounded-lg bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs cursor-pointer"
            >
              Lookup
            </button>
          </div>
        )}

        {/* Results List */}
        <div className="flex-1 overflow-y-auto space-y-2 pr-1 min-h-[160px] max-h-[280px]">
          {loading && (
            <div className="flex items-center justify-center py-10 text-slate-400 gap-2 text-xs">
              <Loader2 className="w-5 h-5 animate-spin text-emerald-400" />
              <span>Searching nutritional database...</span>
            </div>
          )}

          {!loading && results.length === 0 && (
            <div className="text-center py-8 text-slate-400 text-xs">
              No foods found yet. Type a food item name above or enter a barcode.
            </div>
          )}

          {!loading &&
            results.map((food) => {
              const isSelected = selectedFood?.id === food.id;
              return (
                <div
                  key={food.id}
                  onClick={() => setSelectedFood(food)}
                  className={`p-3 rounded-xl border cursor-pointer transition-all flex items-center justify-between ${
                    isSelected
                      ? 'bg-emerald-950/40 border-emerald-500/60'
                      : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-800/50'
                  }`}
                >
                  <div>
                    <div className="font-semibold text-slate-100 text-sm">{food.name}</div>
                    <div className="text-xs text-slate-400">
                      {food.brand ? `${food.brand} • ` : ''}
                      {food.serving_size} {food.serving_unit}
                    </div>
                    <div className="flex items-center gap-3 text-xs mt-1">
                      <span className="text-orange-400 font-semibold">{food.calories} kcal</span>
                      <span className="text-emerald-400">P: {food.protein_g}g</span>
                      <span className="text-cyan-400">C: {food.carbs_g}g</span>
                      <span className="text-purple-400">F: {food.fat_g}g</span>
                    </div>
                  </div>

                  <div className="p-2 rounded-lg bg-slate-900 text-slate-400">
                    {isSelected ? <Check className="w-5 h-5 text-emerald-400" /> : <Plus className="w-5 h-5" />}
                  </div>
                </div>
              );
            })}
        </div>

        {/* Selected food serving control & Confirm */}
        {selectedFood && (
          <div className="pt-3 border-t border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs text-slate-300 font-medium">Servings ({selectedFood.serving_size}g each):</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setServings(Math.max(0.5, parseFloat((servings - 0.5).toFixed(1))))}
                  className="w-8 h-8 rounded-lg bg-slate-800 text-slate-200 font-bold flex items-center justify-center cursor-pointer hover:bg-slate-700"
                >
                  -
                </button>
                <span className="text-sm font-bold text-slate-100 min-w-[36px] text-center">{servings}</span>
                <button
                  type="button"
                  onClick={() => setServings(parseFloat((servings + 0.5).toFixed(1)))}
                  className="w-8 h-8 rounded-lg bg-slate-800 text-slate-200 font-bold flex items-center justify-center cursor-pointer hover:bg-slate-700"
                >
                  +
                </button>
              </div>
            </div>

            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 flex justify-between text-xs font-semibold">
              <span className="text-slate-400">Total Logged:</span>
              <span className="text-emerald-400">
                {Math.round(selectedFood.calories * servings)} kcal •{' '}
                {(selectedFood.protein_g * servings).toFixed(1)}g Protein
              </span>
            </div>

            <button
              onClick={handleConfirmLog}
              className="w-full py-3 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-sm cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
            >
              Confirm Log to {mealType}
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
