'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, X, Barcode, Loader2, CheckCircle2 } from 'lucide-react';
import { fetchFoodByBarcode, FoodSearchResult } from '@/lib/services/foodService';
import { MealType } from '@/lib/types/database';

interface BarcodeScannerModalProps {
  isOpen: boolean;
  mealType: MealType;
  onClose: () => void;
  onFoodLogged: (food: FoodSearchResult, servings: number, mealType: MealType) => void;
}

export function BarcodeScannerModal({
  isOpen,
  mealType,
  onClose,
  onFoodLogged,
}: BarcodeScannerModalProps) {
  const [barcodeInput, setBarcodeInput] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(false);
  const [scannedFood, setScannedFood] = useState<FoodSearchResult | null>(null);
  const [servings, setServings] = useState<number>(1);
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    let stream: MediaStream | null = null;
    if (isOpen && cameraActive) {
      navigator.mediaDevices
        .getUserMedia({ video: { facingMode: 'environment' } })
        .then((s) => {
          stream = s;
          if (videoRef.current) {
            videoRef.current.srcObject = s;
          }
        })
        .catch((err) => {
          console.error('Camera access error:', err);
          setCameraActive(false);
        });
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach((t) => t.stop());
      }
    };
  }, [isOpen, cameraActive]);

  if (!isOpen) return null;

  const handleLookup = async (code: string) => {
    if (!code.trim()) return;
    setLoading(true);
    const food = await fetchFoodByBarcode(code.trim());
    setLoading(false);
    if (food) {
      setScannedFood(food);
      setCameraActive(false);
    } else {
      alert('Product not found in OpenFoodFacts database.');
    }
  };

  const handleConfirm = () => {
    if (scannedFood) {
      onFoodLogged(scannedFood, servings, mealType);
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
              <Barcode className="w-5 h-5" />
            </div>
            <h3 className="font-bold text-slate-100 text-base">Barcode Scanner</h3>
          </div>
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200 cursor-pointer">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Camera stream box */}
        {cameraActive ? (
          <div className="relative rounded-xl overflow-hidden bg-slate-950 aspect-video border border-slate-800 flex items-center justify-center">
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
            <div className="absolute inset-x-8 top-1/2 h-0.5 bg-cyan-400 shadow-md shadow-cyan-400/80 animate-pulse" />
            <div className="absolute bottom-2 text-[10px] bg-slate-950/80 text-cyan-300 px-3 py-1 rounded-full border border-slate-800">
              Align barcode inside frame...
            </div>
          </div>
        ) : (
          <button
            onClick={() => setCameraActive(true)}
            className="w-full py-4 rounded-xl bg-slate-950 border border-slate-800 hover:border-cyan-500/50 flex flex-col items-center justify-center gap-2 cursor-pointer transition-colors"
          >
            <Camera className="w-8 h-8 text-cyan-400" />
            <span className="text-xs font-semibold text-slate-300">Tap to Open Camera Scanner</span>
          </button>
        )}

        {/* Manual Barcode Input Form */}
        <div className="space-y-2">
          <label className="text-xs text-slate-400 font-semibold block">Or Enter Product Barcode</label>
          <div className="flex gap-2">
            <input
              type="text"
              value={barcodeInput}
              onChange={(e) => setBarcodeInput(e.target.value)}
              placeholder="e.g. 737628064502"
              className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-cyan-500"
            />
            <button
              onClick={() => handleLookup(barcodeInput)}
              disabled={loading || !barcodeInput.trim()}
              className="px-4 py-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs flex items-center gap-1 cursor-pointer"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Lookup'}
            </button>
          </div>
        </div>

        {/* Scanned Result */}
        {scannedFood && (
          <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 space-y-3">
            <div>
              <div className="font-bold text-slate-100 text-sm">{scannedFood.name}</div>
              <div className="text-xs text-slate-400">{scannedFood.brand || 'Generic'}</div>
              <div className="flex items-center gap-3 text-xs mt-1 font-semibold">
                <span className="text-orange-400">{scannedFood.calories} kcal</span>
                <span className="text-emerald-400">P: {scannedFood.protein_g}g</span>
                <span className="text-cyan-400">C: {scannedFood.carbs_g}g</span>
                <span className="text-purple-400">F: {scannedFood.fat_g}g</span>
              </div>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-slate-800">
              <span className="text-xs text-slate-300">Servings:</span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setServings(Math.max(0.5, servings - 0.5))}
                  className="w-7 h-7 rounded bg-slate-800 text-slate-200 font-bold text-xs"
                >
                  -
                </button>
                <span className="text-xs font-bold text-slate-100">{servings}</span>
                <button
                  type="button"
                  onClick={() => setServings(servings + 0.5)}
                  className="w-7 h-7 rounded bg-slate-800 text-slate-200 font-bold text-xs"
                >
                  +
                </button>
              </div>
            </div>

            <button
              onClick={handleConfirm}
              className="w-full py-2.5 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 cursor-pointer shadow-md shadow-emerald-500/20"
            >
              <CheckCircle2 className="w-4 h-4" />
              <span>Log to {mealType}</span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
