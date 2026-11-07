'use client';

import {
  Sparkles,
  X,
  TrendingUp,
  Award,
  AlertCircle,
  Lightbulb,
  CheckCircle2,
  RefreshCw,
  Activity,
  ArrowRight
} from 'lucide-react';
import { WorkoutAnalysis } from '@/lib/types/database';

interface AIWorkoutModalProps {
  isOpen: boolean;
  onClose: () => void;
  analysis: WorkoutAnalysis | null;
  isLoading: boolean;
  onRequestAnalysis: () => void;
  onRegenerateAnalysis?: () => void;
}

export function AIWorkoutModal({
  isOpen,
  onClose,
  analysis,
  isLoading,
  onRequestAnalysis,
  onRegenerateAnalysis,
}: AIWorkoutModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-md">
      <div className="bg-[#100D20]/95 border border-[#9B5CFF]/30 rounded-3xl w-full max-w-xl max-h-[90vh] overflow-y-auto shadow-[0_25px_60px_rgba(0,0,0,0.9)] p-5 md:p-6 space-y-5 animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/8 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-[#9B5CFF]/15 border border-[#9B5CFF]/25 text-[#00D5FF] flex items-center justify-center shadow-lg shadow-[#9B5CFF]/10">
              <Sparkles className="w-5 h-5" />
            </div>
            <div>
              <h3 className="font-display font-extrabold text-white text-lg uppercase tracking-wide">
                AI Workout Assessment
              </h3>
              <p className="text-xs text-[#A9A1BD]">Data-driven performance evaluation & overload audit</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Loading State */}
        {isLoading && (
          <div className="py-12 flex flex-col items-center justify-center space-y-4 text-center">
            <div className="relative">
              <div className="w-16 h-16 rounded-full border-2 border-[#9B5CFF]/20 border-t-[#00D5FF] animate-spin" />
              <Activity className="w-6 h-6 text-[#00D5FF] absolute inset-0 m-auto animate-pulse" />
            </div>
            <div>
              <p className="font-display font-bold text-white text-sm uppercase">Evaluating Workout Dynamics...</p>
              <p className="text-xs text-[#A9A1BD] mt-1">Cross-referencing volume, RPE, and overload with your training history</p>
            </div>
          </div>
        )}

        {/* No Analysis yet (Prompt to Generate) */}
        {!isLoading && !analysis && (
          <div className="py-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-3xl bg-white/5 border border-white/10 text-[#00D5FF] flex items-center justify-center mx-auto">
              <Award className="w-7 h-7" />
            </div>
            <div className="space-y-1">
              <h4 className="font-display font-bold text-white text-base uppercase">Session Saved Successfully!</h4>
              <p className="text-xs text-[#A9A1BD] max-w-sm mx-auto">
                Evaluate this session against your historical baseline to determine your performance rating and overload stimulus.
              </p>
            </div>
            <button
              onClick={onRequestAnalysis}
              className="py-3 px-6 rounded-2xl bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF] text-white font-display font-bold text-xs uppercase tracking-wider shadow-xl shadow-[#9B5CFF]/25 transition-all flex items-center gap-2 mx-auto cursor-pointer active:scale-95"
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
            <div className="p-4 rounded-2xl bg-gradient-to-br from-[#1C1438] via-[#100D20] to-black border border-[#00D5FF]/30 flex items-center justify-between gap-4">
              <div className="space-y-1">
                <span className="text-[11px] font-display font-bold text-[#00D5FF] uppercase tracking-wider flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5" />
                  Performance Score
                </span>
                <p className="text-xs text-[#F6F2FF] leading-relaxed max-w-xs sm:max-w-sm">
                  {analysis.rating_explanation}
                </p>
              </div>

              <div className="flex flex-col items-center justify-center px-4 py-2 rounded-2xl bg-black/60 border border-[#00D5FF]/40 text-center shrink-0">
                <div className="flex items-baseline gap-0.5">
                  <span className="text-3xl font-display font-black text-[#00D5FF] tracking-tight">{analysis.rating.toFixed(1)}</span>
                  <span className="text-xs text-slate-400 font-semibold">/10</span>
                </div>
                <span className="text-[9px] font-display font-bold text-slate-400 uppercase tracking-widest mt-0.5">Overall</span>
              </div>
            </div>

            {/* Performance Summary Paragraph */}
            <div className="space-y-1">
              <h4 className="text-xs font-display font-bold text-slate-300 uppercase tracking-wider">Session Overview</h4>
              <p className="text-xs text-slate-300 leading-relaxed p-3.5 rounded-xl bg-black/40 border border-white/6">
                {analysis.progress_summary}
              </p>
            </div>

            {/* Overload Verdict */}
            <div className="p-3.5 rounded-2xl bg-black/40 border border-white/6 space-y-1.5">
              <span className="text-[10px] font-display font-bold text-[#9B5CFF] uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp className="w-3.5 h-3.5" />
                Progressive Overload Status
              </span>
              <p className="text-xs text-[#F6F2FF] font-medium leading-relaxed">
                {analysis.improvements && analysis.improvements.length > 0
                  ? 'Positive Progressive Overload Stimulus Detected'
                  : 'Consistent Working Volume Maintained'}
              </p>
            </div>

            {/* Key Highlights */}
            {analysis.improvements && analysis.improvements.length > 0 && (
              <div className="space-y-2">
                <h4 className="text-xs font-display font-bold text-[#38E6A5] uppercase tracking-wider flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Key Highlights & Strength Gains
                </h4>
                <div className="space-y-1.5">
                  {analysis.improvements.map((item: string, idx: number) => (
                    <div key={idx} className="p-2.5 rounded-xl bg-[#38E6A5]/10 border border-[#38E6A5]/20 text-xs text-slate-200 flex items-start gap-2">
                      <span className="w-1.5 h-1.5 rounded-full bg-[#38E6A5] mt-1.5 shrink-0" />
                      <span>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Actionable Next Recommendations */}
            {analysis.next_session_tips && (
              <div className="space-y-2">
                <h4 className="text-xs font-display font-bold text-[#00D5FF] uppercase tracking-wider flex items-center gap-1.5">
                  <Lightbulb className="w-3.5 h-3.5" />
                  Next Session Recommendations
                </h4>
                <div className="space-y-1.5">
                  <div className="p-2.5 rounded-xl bg-[#00D5FF]/10 border border-[#00D5FF]/20 text-xs text-slate-200 flex items-start gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-[#00D5FF] mt-1.5 shrink-0" />
                    <span>{analysis.next_session_tips}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Fatigue Warning if any */}
            {analysis.fatigue_cautions && (
              <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/30 text-xs text-amber-200 flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold block text-amber-400">Fatigue & Recovery Caution</span>
                  <span>{analysis.fatigue_cautions}</span>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-3 border-t border-white/8">
              <button
                onClick={onRegenerateAnalysis || onRequestAnalysis}
                className="w-full sm:w-auto py-2.5 px-4 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 text-xs font-display font-bold uppercase flex items-center justify-center gap-2 transition-colors cursor-pointer"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Re-Analyze</span>
              </button>

              <button
                onClick={onClose}
                className="w-full sm:w-auto flex-1 py-3 px-5 rounded-xl bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF] text-white font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-1.5 shadow-[0_0_15px_rgba(155,92,255,0.35)] transition-all cursor-pointer active:scale-95"
              >
                <span>Done Reviewing</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
