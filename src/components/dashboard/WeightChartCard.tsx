'use client';

import { Scale, TrendingDown, TrendingUp, Plus, ArrowRight } from 'lucide-react';
import Link from 'next/link';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface WeightDataPoint {
  date: string;
  weight: number;
}

interface WeightChartCardProps {
  currentWeight?: number | null;
  targetWeight?: number;
  data?: WeightDataPoint[];
  deltaKg?: number | null;
  daysSpan?: number;
}

export function WeightChartCard({
  currentWeight,
  targetWeight = 75,
  data = [],
  deltaKg = null,
  daysSpan = 30,
}: WeightChartCardProps) {
  const isLoss = (deltaKg ?? 0) < 0;
  const hasData = data && data.length > 0;

  return (
    <div className="p-4 sm:p-5 rounded-3xl bg-[#100D20]/85 border border-[#00D5FF]/25 backdrop-blur-xl space-y-4 shadow-[0_10px_30px_rgba(0,0,0,0.5)] flex flex-col justify-between">
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/8 pb-3">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-[#00D5FF]/15 text-[#00D5FF] border border-[#00D5FF]/25 flex items-center justify-center shrink-0">
            <Scale className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <span className="font-display text-[10px] text-[#00D5FF] font-bold tracking-widest uppercase">
              BIOMETRICS & WEIGHT
            </span>
            <div className="flex items-baseline gap-2">
              <h4 className="font-display font-extrabold text-white text-xl tracking-wider">
                {currentWeight ? `${currentWeight} KG` : 'NOT LOGGED'}
              </h4>
              {targetWeight && (
                <span className="text-[10px] font-mono text-slate-400">
                  Target: {targetWeight} kg
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Delta Tag */}
        {deltaKg !== null && deltaKg !== undefined && (
          <div
            className={`flex items-center gap-1 px-2.5 py-1 rounded-xl text-xs font-mono font-bold border ${
              isLoss
                ? 'bg-[#38E6A5]/15 text-[#38E6A5] border-[#38E6A5]/30'
                : 'bg-[#FF42A6]/15 text-[#FF42A6] border-[#FF42A6]/30'
            }`}
          >
            {isLoss ? (
              <TrendingDown className="w-3.5 h-3.5" />
            ) : (
              <TrendingUp className="w-3.5 h-3.5" />
            )}
            <span>
              {deltaKg > 0 ? `+${deltaKg}` : deltaKg} kg ({daysSpan}d)
            </span>
          </div>
        )}
      </div>

      {/* Chart or Zero-Mock Empty State */}
      <div className="h-36 w-full -mx-2">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
              <defs>
                <linearGradient id="weightFutureGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#00D5FF" stopOpacity={0.4} />
                  <stop offset="95%" stopColor="#00D5FF" stopOpacity={0.0} />
                </linearGradient>
              </defs>
              <XAxis
                dataKey="date"
                stroke="#6B7280"
                fontSize={9}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                stroke="#6B7280"
                fontSize={9}
                tickLine={false}
                axisLine={false}
                domain={['auto', 'auto']}
              />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#070512',
                  border: '1px solid rgba(0,213,255,0.3)',
                  borderRadius: '12px',
                  fontSize: '11px',
                  color: '#fff',
                }}
                formatter={(val: any) => [`${val} kg`, 'Weight']}
              />
              <Area
                type="monotone"
                dataKey="weight"
                stroke="#00D5FF"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#weightFutureGradient)"
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="h-full flex flex-col items-center justify-center text-center p-3 space-y-1.5">
            <Scale className="w-6 h-6 text-slate-500" />
            <p className="text-xs text-[#A9A1BD] font-medium">No weigh-in records logged yet.</p>
            <p className="text-[10px] text-slate-500 font-mono">Record your first weigh-in to plot weight trends.</p>
          </div>
        )}
      </div>

      {/* Footer Link / Action */}
      <div className="pt-2 border-t border-white/8 flex items-center justify-between">
        <Link
          href="/activity?tab=weight"
          className="text-xs font-display font-bold text-[#00D5FF] hover:underline flex items-center gap-1 uppercase tracking-wider cursor-pointer"
        >
          <span>VIEW FULL WEIGH-IN LOG</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </Link>

        <Link
          href="/activity?tab=weight"
          className="py-1.5 px-3 rounded-xl bg-white/5 hover:bg-white/10 text-white font-display font-bold text-xs uppercase flex items-center gap-1.5 border border-white/10 transition-colors"
        >
          <Plus className="w-3.5 h-3.5 text-[#00D5FF]" />
          <span>LOG WEIGH-IN</span>
        </Link>
      </div>
    </div>
  );
}
