'use client';

import { TrendingUp, Plus, Scale } from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';
import Link from 'next/link';

export interface WeightDataPoint {
  date: string;
  weight: number;
}

export interface WeightChartCardProps {
  currentWeightKg?: number | null;
  startWeightKg?: number | null;
  goalWeightKg?: number | null;
  data?: WeightDataPoint[];
  onAddWeight?: () => void;
}

export function WeightChartCard({
  currentWeightKg = null,
  startWeightKg = null,
  goalWeightKg = null,
  data = [],
  onAddWeight,
}: WeightChartCardProps) {
  const hasData = currentWeightKg !== null && data.length > 0;
  const delta =
    hasData && startWeightKg !== null
      ? (currentWeightKg - startWeightKg).toFixed(1)
      : null;
  const isGain = delta !== null ? Number(delta) >= 0 : false;

  return (
    <div className="p-5 md:p-6 rounded-2xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-md space-y-4 shadow-xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Scale className="w-5 h-5" />
          </div>
          <div>
            <span className="font-display text-[10px] text-orange-400 font-bold tracking-widest uppercase">
              BODY WEIGHT TREND
            </span>
            <h4 className="font-display font-extrabold text-slate-100 text-lg md:text-xl tracking-wider uppercase">
              {hasData ? (
                <>
                  {currentWeightKg} KG{' '}
                  {delta !== null && (
                    <span className="text-xs font-sans text-slate-400 font-normal">
                      ({isGain ? `+${delta}` : delta} KG SINCE START)
                    </span>
                  )}
                </>
              ) : (
                <span className="text-slate-400">NOT LOGGED YET</span>
              )}
            </h4>
            <p className="font-display text-xs text-slate-400 tracking-wider uppercase">
              GOAL TARGET: {goalWeightKg ? `${goalWeightKg} KG` : 'NOT SET'}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {onAddWeight ? (
            <button
              onClick={onAddWeight}
              className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-orange-400 border border-slate-700/60 font-display text-xs font-bold tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95 uppercase"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>LOG WEIGH-IN</span>
            </button>
          ) : (
            <Link
              href="/activity"
              className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-orange-400 border border-slate-700/60 font-display text-xs font-bold tracking-wider flex items-center gap-1 transition-all active:scale-95 uppercase cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>LOG WEIGH-IN</span>
            </Link>
          )}
        </div>
      </div>

      {/* Chart or Empty state */}
      {!hasData ? (
        <div className="py-8 text-center border border-dashed border-slate-800 rounded-xl space-y-2">
          <p className="text-xs text-slate-400">No body weight logged yet.</p>
          <p className="text-[11px] text-slate-500">
            Log your daily weigh-ins in Activity & Body Weight to view 7-day moving averages and trend analytics.
          </p>
        </div>
      ) : (
        <div className="h-44 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <AreaChart data={data} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <defs>
                <linearGradient id="weightGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#EA580C" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#EA580C" stopOpacity={0} />
                </linearGradient>
              </defs>
              <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
              <YAxis domain={['dataMin - 1', 'dataMax + 1']} stroke="#64748B" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#F8FAFC',
                }}
              />
              <Area
                type="monotone"
                dataKey="weight"
                stroke="#F97316"
                strokeWidth={2.5}
                fillOpacity={1}
                fill="url(#weightGrad)"
              />
            </AreaChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
