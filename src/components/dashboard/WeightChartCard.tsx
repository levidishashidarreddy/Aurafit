'use client';

import { TrendingUp, Plus } from 'lucide-react';
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
  currentWeightKg?: number;
  startWeightKg?: number;
  goalWeightKg?: number;
  data?: WeightDataPoint[];
  onAddWeight?: () => void;
}

export function WeightChartCard({
  currentWeightKg = 72.4,
  startWeightKg = 70.0,
  goalWeightKg = 76.0,
  data = [
    { date: 'Aug 1', weight: 70.2 },
    { date: 'Aug 4', weight: 70.8 },
    { date: 'Aug 7', weight: 71.3 },
    { date: 'Aug 10', weight: 71.9 },
    { date: 'Aug 13', weight: 72.4 },
  ],
  onAddWeight,
}: WeightChartCardProps) {
  const delta = (currentWeightKg - startWeightKg).toFixed(1);
  const isGain = Number(delta) >= 0;

  return (
    <div className="p-5 md:p-6 rounded-2xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-md space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <TrendingUp className="w-5 h-5" />
          </div>
          <div>
            <span className="font-display text-[10px] text-orange-400 font-bold tracking-widest uppercase">BODYWEIGHT TREND</span>
            <h4 className="font-display font-extrabold text-slate-100 text-lg md:text-xl tracking-wider uppercase">
              {currentWeightKg} KG <span className="text-xs font-sans text-slate-400 font-normal">({isGain ? `+${delta}` : delta} KG SINCE START)</span>
            </h4>
            <p className="font-display text-xs text-slate-400 tracking-wider uppercase">GOAL TARGET: {goalWeightKg} KG</p>
          </div>
        </div>

        <button
          onClick={onAddWeight}
          className="py-2 px-3.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-orange-400 border border-slate-700/60 font-display text-xs font-bold tracking-wider flex items-center gap-1 cursor-pointer transition-all active:scale-95 uppercase"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>LOG WEIGH-IN</span>
        </button>
      </div>

      {/* Chart visualization */}
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
    </div>
  );
}
