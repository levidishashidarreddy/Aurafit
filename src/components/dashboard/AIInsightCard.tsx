'use client';

import { Sparkles, ArrowRight } from 'lucide-react';
import Link from 'next/link';

interface AIInsightCardProps {
  insightText?: string;
  recommendation?: string;
}

export function AIInsightCard({
  insightText = 'Your protein intake is currently 30g below today\'s goal. Consuming a protein shake or 150g chicken breast before 9 PM will optimize muscle protein synthesis after your Push workout.',
  recommendation = 'Action: Add high-protein fuel',
}: AIInsightCardProps) {
  return (
    <div className="p-5 rounded-2xl bg-gradient-to-br from-slate-900/90 via-slate-900 to-indigo-950/20 border border-indigo-500/20 backdrop-blur-md space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <Sparkles className="w-4 h-4" />
          </div>
          <span className="font-display font-extrabold text-slate-100 text-sm tracking-wider uppercase">COACH INSIGHT</span>
        </div>

        <Link
          href="/ai-coach"
          className="font-display text-xs font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition-colors uppercase tracking-wider"
        >
          <span>ASK COACH</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>
      </div>

      <p className="text-xs md:text-sm text-slate-300 leading-relaxed font-medium">
        "{insightText}"
      </p>

      <div className="pt-2 border-t border-slate-800 flex items-center justify-between text-xs">
        <span className="font-display font-bold text-indigo-400 tracking-wider uppercase">{recommendation}</span>
        <span className="text-[10px] text-slate-500 font-mono">UPDATED 10M AGO</span>
      </div>
    </div>
  );
}
