'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { 
  Sparkles, 
  CheckCircle2, 
  TrendingUp, 
  AlertTriangle, 
  Lightbulb, 
  ArrowRight, 
  X, 
  Loader2, 
  Activity,
  Award
} from 'lucide-react';
import { WorkoutAnalysis } from '@/lib/types/database';

interface AIWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: WorkoutAnalysis | null;
  isLoading: boolean;
  onRequestAnalysis: () => void;
}

export function AIWorkoutModal({
  isOpen,
  onClose,
  analysis,
  isLoading,
  onRequestAnalysis,
}: AIWorkoutModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
      <div className="bg-slate-900 border border-slate-800 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-2xl p-5 md:p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-800/80 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-500/10 border border-orange-500/20 text-orange-400 flex items-center justify-center shadow-lg shadow-orange-500/10">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-100 text-lg">AI Workout Assessment</h3>
              <p className="text-xs text-slate-400">Data-driven performance evaluation & overload audit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-slate-200 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-orange-500/20 border-t-orange-500 animate-spin" />
              <Activity className="w-6 h-6 text-orange-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div>
              <p className="font-bold text-slate-200 text-sm">Evaluating Workout Dynamics...</p>
              <p className="text-xs text-slate-400 mt-1">Cross-referencing volume, RPE, and overload with your training history</p>
            </div>
          </div>
        )}

        {/* No Analysis yet (Prompt to Generate) */}
        {!isLoading && !analysis && (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-slate-800/80 border border-slate-700 text-slate-300 flex items-center justify-center mx-auto">
              <Award className="w-7 h-7 text-orange-400" />
            </div>
            <div className="space-y-1">
              <h4 className="font-bold text-slate-100 text-base">Session Saved Successfully!</h4>
              <p className="text-xs text-slate-400 max-w-sm mx-auto">
                Evaluate this session against your historical baseline to determine your performance rating and overload stimulus.
              </p>
            </div>
            <button
              onClick={onRequestAnalysis}
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-400 hover:to-amber-400 text-slate-950 font-bold text-sm shadow-xl shadow-orange-500/20 transition-all flex items-center gap-2 mx-auto cursor-pointer"
            >
              <Sparkles className="w-4 h-4" />
              <span>Generate AI Assessment</span>
            </button>
          </div>
        )}

        {/* Completed Analysis */}
        {!isLoading && analysis && (
          <div className="space-y-5">
            {/* Score Banner */}
            <div className="p-4 rounded-2xl bg-gradient-to-br from-slate-950 via-slate-900 to-orange-950/20 border border-orange-500/30 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-bold text-orange-400 uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" />
                  Performance Score
                </span>
                <p className="text-xs text-slate-300 leading-relaxed max-w-xs sm:max-w-sm">
                  {analysis.rating_explanation}
                </p>
              </div>

              <div className="flex flex-col items-center justify-center px-4 py-2 rounded-2xl bg-slate-900/90 border border-orange-500/40 text-center shrink-0">
                <div className="flex items-baseline gap-0.5">
                  <span className="text-3xl font-black text-orange-400 tracking-tight">{analysis.rating.toFixed(1)}</span>
                  <span className="text-xs text-slate-400 font-semibold">/10</span>
                </div>
                <span className="text-[10px] font-bold text-slate-400 uppercase">Quality Rating</span>
              </div>
            </div>

            {/* Overload / Progress Summary */}
            <div className="p-3.5 rounded-xl bg-slate-950/60 border border-slate-800 space-y-1">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
                <span>Stimulus & Overload Comparison</span>
              </div>
              <p className="text-xs text-slate-300 leading-relaxed">
                {analysis.progress_summary}
              </p>
            </div>

            {/* Improvements and Stagnations */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {/* Improvements */}
              <div className="p-3.5 rounded-xl bg-emerald-950/15 border border-emerald-500/20 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-400">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Key Progression</span>
                </div>
                <ul className="space-y-1.5">
                  {(analysis.improvements || []).map((imp, idx) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-1.5 leading-snug">
                      <span className="text-emerald-400 font-bold mt-0.5">•</span>
                      <span>{imp}</span>
                    </li>
                  ))}
                  {(!analysis.improvements || analysis.improvements.length === 0) && (
                    <li className="text-xs text-slate-400">Baseline established for future progression.</li>
                  )}
                </ul>
              </div>

              {/* Stagnations / Focus */}
              <div className="p-3.5 rounded-xl bg-amber-950/15 border border-amber-500/20 space-y-2">
                <div className="flex items-center gap-1.5 text-xs font-bold text-amber-400">
                  <Activity className="w-4 h-4" />
                  <span>Stagnation / Focus Area</span>
                </div>
                <ul className="space-y-1.5">
                  {(analysis.stagnations || []).map((stg, idx) => (
                    <li key={idx} className="text-xs text-slate-300 flex items-start gap-1.5 leading-snug">
                      <span className="text-amber-400 font-bold mt-0.5">•</span>
                      <span>{stg}</span>
                    </li>
                  ))}
                  {(!analysis.stagnations || analysis.stagnations.length === 0) && (
                    <li className="text-xs text-slate-400">All planned movements completed effectively.</li>
                  )}
                </ul>
              </div>
            </div>

            {/* Fatigue / Recovery Caution */}
            {analysis.fatigue_cautions && (
              <div className="p-3.5 rounded-xl bg-rose-950/15 border border-rose-500/20 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-rose-300">Fatigue & Recovery Notice</h5>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{analysis.fatigue_cautions}</p>
                </div>
              </div>
            )}

            {/* Next Session Tips */}
            {analysis.next_session_tips && (
              <div className="p-3.5 rounded-xl bg-cyan-950/15 border border-cyan-500/20 flex items-start gap-2.5">
                <Lightbulb className="w-4 h-4 text-cyan-400 shrink-0 mt-0.5" />
                <div>
                  <h5 className="text-xs font-bold text-cyan-300">Next Session Recommendation</h5>
                  <p className="text-xs text-slate-300 mt-0.5 leading-relaxed">{analysis.next_session_tips}</p>
                </div>
              </div>
            )}

            {/* Data Limitations Disclaimer */}
            <p className="text-[11px] text-slate-400 italic">
              Note: Workout quality ratings assess load, volume, and RPE progression. They do not claim biological muscle hypertrophy, injury diagnosis, or calorie burns. {analysis.data_limitations ? `Limitations: ${analysis.data_limitations}` : ''}
            </p>

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center gap-2 pt-2 border-t border-slate-800">
              <button
                onClick={onClose}
                className="w-full sm:w-auto flex-1 py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 font-semibold text-xs transition-colors cursor-pointer"
              >
                Close & Return
              </button>
              <button
                onClick={() => {
                  onClose();
                  router.push('/progress');
                }}
                className="w-full sm:w-auto flex-1 py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-400 text-slate-950 font-bold text-xs flex items-center justify-center gap-1.5 shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
              >
                <span>View Muscle Analytics</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
