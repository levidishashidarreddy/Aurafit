'use client';

import { useState, useEffect } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { WeightChartCard } from '@/components/dashboard/WeightChartCard';
import { TrendingUp, Plus, Scale, Dumbbell, Activity, Calendar } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { fetchWeightLogs, addWeightLog } from '@/lib/services/weightService';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

export default function ProgressPage() {
  const [activeTimeframe, setActiveTimeframe] = useState<'1W' | '1M' | '3M' | 'ALL'>('1M');
  const [showAddWeightModal, setShowAddWeightModal] = useState<boolean>(false);
  const [newWeight, setNewWeight] = useState<string>('72.5');
  const [userId, setUserId] = useState<string | null>(null);
  const [weightData, setWeightData] = useState<any[]>([
    { date: 'Aug 1', weight: 70.2 },
    { date: 'Aug 4', weight: 70.8 },
    { date: 'Aug 7', weight: 71.3 },
    { date: 'Aug 10', weight: 71.9 },
    { date: 'Aug 13', weight: 72.4 },
  ]);

  const supabase = createClient();

  useEffect(() => {
    async function loadWeights() {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setUserId(user.id);
        const liveLogs = await fetchWeightLogs(user.id);
        if (liveLogs && liveLogs.length > 0) {
          const formatted = liveLogs.map((w) => ({
            date: new Date(w.logged_at).toLocaleDateString([], { month: 'short', day: 'numeric' }),
            weight: Number(w.weight_kg),
          }));
          setWeightData(formatted);
        }
      }
    }
    loadWeights();
  }, []);

  const handleSaveWeight = async () => {
    const val = Number(newWeight);
    if (!val) return;

    if (userId) {
      const saved = await addWeightLog(userId, val);
      if (saved) {
        const formattedDate = new Date(saved.logged_at).toLocaleDateString([], { month: 'short', day: 'numeric' });
        setWeightData((prev) => [...prev, { date: formattedDate, weight: val }]);
        setShowAddWeightModal(false);
        return;
      }
    }

    setWeightData((prev) => [...prev, { date: 'Today', weight: val }]);
    setShowAddWeightModal(false);
  };

  const strengthData = [
    { date: 'Jul 15', bench: 50, squat: 70, deadlift: 90 },
    { date: 'Jul 22', bench: 52.5, squat: 75, deadlift: 95 },
    { date: 'Jul 29', bench: 55, squat: 80, deadlift: 100 },
    { date: 'Aug 5', bench: 57.5, squat: 82.5, deadlift: 105 },
    { date: 'Aug 12', bench: 60, squat: 85, deadlift: 110 },
  ];

  const bodyMeasurements = [
    { label: 'Chest', current: 102, initial: 98, unit: 'cm' },
    { label: 'Waist', current: 78, initial: 82, unit: 'cm' },
    { label: 'Arms (Biceps)', current: 38, initial: 35, unit: 'cm' },
    { label: 'Thighs', current: 58, initial: 55, unit: 'cm' },
    { label: 'Neck', current: 39, initial: 38, unit: 'cm' },
  ];

  return (
    <AppShell headerTitle="Progress Hub & Analytics">
      {/* Timeframe selector header */}
      <div className="flex items-center justify-between bg-slate-900/80 p-3 rounded-2xl border border-slate-800">
        <div className="flex items-center gap-2 text-xs font-bold text-slate-300">
          <Calendar className="w-4 h-4 text-emerald-400" />
          <span>Analytics Timeframe</span>
        </div>

        <div className="flex gap-1">
          {(['1W', '1M', '3M', 'ALL'] as const).map((tf) => (
            <button
              key={tf}
              onClick={() => setActiveTimeframe(tf)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold cursor-pointer transition-all ${
                activeTimeframe === tf
                  ? 'bg-emerald-500 text-slate-950 shadow-md shadow-emerald-500/20'
                  : 'bg-slate-950 text-slate-400 hover:text-slate-200'
              }`}
            >
              {tf}
            </button>
          ))}
        </div>
      </div>

      {/* Weight Progress Chart Card */}
      <WeightChartCard data={weightData} onAddWeight={() => setShowAddWeightModal(true)} />

      {/* Strength Progression Chart */}
      <div className="p-4 md:p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Dumbbell className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-100 text-sm md:text-base">Estimated 1RM Strength Curves</h4>
              <p className="text-xs text-slate-400">Bench Press, Squat & Deadlift</p>
            </div>
          </div>

          <div className="flex items-center gap-3 text-xs font-semibold">
            <span className="flex items-center gap-1 text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400" /> Bench</span>
            <span className="flex items-center gap-1 text-cyan-400"><span className="w-2 h-2 rounded-full bg-cyan-400" /> Squat</span>
            <span className="flex items-center gap-1 text-purple-400"><span className="w-2 h-2 rounded-full bg-purple-400" /> Deadlift</span>
          </div>
        </div>

        <div className="h-52 w-full pt-2">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={strengthData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
              <XAxis dataKey="date" stroke="#64748B" fontSize={11} tickLine={false} />
              <YAxis stroke="#64748B" fontSize={11} tickLine={false} />
              <Tooltip
                contentStyle={{
                  backgroundColor: '#0F172A',
                  borderColor: '#334155',
                  borderRadius: '0.75rem',
                  fontSize: '12px',
                  color: '#F8FAFC',
                }}
              />
              <Line type="monotone" dataKey="bench" stroke="#10B981" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="squat" stroke="#06B6D4" strokeWidth={2.5} dot={{ r: 4 }} />
              <Line type="monotone" dataKey="deadlift" stroke="#8B5CF6" strokeWidth={2.5} dot={{ r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Body Measurements Grid */}
      <div className="p-4 md:p-5 rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20">
              <Activity className="w-5 h-5" />
            </div>
            <div>
              <h4 className="font-bold text-slate-100 text-sm md:text-base">Body Circumference Measurements</h4>
              <p className="text-xs text-slate-400">Track muscle growth & body composition</p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3">
          {bodyMeasurements.map((bm, idx) => {
            const diff = (bm.current - bm.initial).toFixed(1);
            const isPos = Number(diff) >= 0;
            return (
              <div key={idx} className="p-3 rounded-xl bg-slate-950/60 border border-slate-800/60 space-y-1">
                <span className="text-xs text-slate-400 font-semibold block">{bm.label}</span>
                <div className="text-lg font-bold text-slate-100">
                  {bm.current} <span className="text-xs font-normal text-slate-400">{bm.unit}</span>
                </div>
                <div className={`text-[11px] font-semibold ${isPos ? 'text-emerald-400' : 'text-cyan-400'}`}>
                  {isPos ? `+${diff}` : diff} {bm.unit} change
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Add Weight Modal */}
      {showAddWeightModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-sm p-5 space-y-4 shadow-2xl">
            <h3 className="font-bold text-slate-100 text-base">Record Body Weight</h3>
            <div>
              <label className="text-xs text-slate-400 font-semibold mb-1 block">Today's Weight (kg)</label>
              <input
                type="number"
                step="0.1"
                value={newWeight}
                onChange={(e) => setNewWeight(e.target.value)}
                className="w-full px-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-lg font-bold focus:outline-none focus:border-emerald-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setShowAddWeightModal(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-800 text-slate-300 font-semibold text-xs cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleSaveWeight}
                className="flex-1 py-2.5 rounded-xl bg-emerald-500 text-slate-950 font-bold text-xs cursor-pointer shadow-md shadow-emerald-500/20"
              >
                Save Log
              </button>
            </div>
          </div>
        </div>
      )}
    </AppShell>
  );
}
