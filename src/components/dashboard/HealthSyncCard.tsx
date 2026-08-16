'use client';

import { useState } from 'react';
import { Activity, Footprints, Flame, Heart, RefreshCw, CheckCircle2, ShieldAlert, Zap } from 'lucide-react';
import { HealthMetrics, getSimulatedHealthData } from '@/lib/services/googleFitService';

interface HealthSyncCardProps {
  metrics?: HealthMetrics;
  onSyncRefresh?: () => void;
  onSimulateSync?: (simulated: HealthMetrics) => void;
  isLoading?: boolean;
}

export function HealthSyncCard({
  metrics = {
    steps: 7800,
    targetSteps: 10000,
    activeCalories: 450,
    distanceKm: 5.4,
    heartRateBpm: 72,
    isSynced: false,
    source: 'simulated',
  },
  onSyncRefresh,
  onSimulateSync,
  isLoading = false,
}: HealthSyncCardProps) {
  const [syncing, setSyncing] = useState(false);

  const steps = metrics.steps || 7800;
  const targetSteps = metrics.targetSteps || 10000;
  const activeCalories = metrics.activeCalories || 450;
  const distanceKm = metrics.distanceKm || 5.4;
  const heartRateBpm = metrics.heartRateBpm || 72;
  const isSynced = metrics.isSynced;

  const stepsPercent = Math.min(100, Math.round((steps / (targetSteps || 1)) * 100));

  const handleRefreshClick = async () => {
    setSyncing(true);
    if (onSyncRefresh) {
      await onSyncRefresh();
    }
    setTimeout(() => setSyncing(false), 800);
  };

  const handleSimulateClick = () => {
    const simData = getSimulatedHealthData(steps);
    if (onSimulateSync) {
      onSimulateSync(simData);
    }
  };

  return (
    <div className="p-5 rounded-2xl bg-slate-900/90 border border-slate-800/80 backdrop-blur-md space-y-4 shadow-xl">
      {/* Header & Connection Status */}
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
            <Activity className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-display text-[10px] text-slate-400 font-bold tracking-widest uppercase">
                GOOGLE FIT INTEGRATION
              </span>
              {isSynced ? (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  <CheckCircle2 className="w-2.5 h-2.5" /> CONNECTED
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[9px] font-mono font-semibold bg-slate-800 text-slate-400 border border-slate-700">
                  <ShieldAlert className="w-2.5 h-2.5 text-amber-400" /> UNCONNECTED
                </span>
              )}
            </div>
            <h4 className="font-display font-extrabold text-slate-100 text-base tracking-wider uppercase">
              ACTIVITY & STEP CALCULATION
            </h4>
          </div>
        </div>

        {/* Action Controls */}
        <div className="flex items-center gap-2">
          {/* Simulate Step Sync Button */}
          <button
            onClick={handleSimulateClick}
            className="px-2.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 text-xs font-mono font-medium flex items-center gap-1.5 transition-all active:scale-95 cursor-pointer"
            title="Simulate step sensor update for preview"
          >
            <Zap className="w-3.5 h-3.5 text-amber-400" />
            <span className="hidden sm:inline">SIMULATE STEPS</span>
          </button>

          {/* Connect / Refresh Button */}
          {!isSynced ? (
            <a
              href="/api/auth/google-fit"
              className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-display font-bold text-xs tracking-wider uppercase transition-all shadow-md shadow-orange-500/20 active:scale-95 flex items-center gap-1.5"
            >
              CONNECT FIT
            </a>
          ) : (
            <button
              onClick={handleRefreshClick}
              disabled={syncing || isLoading}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 border border-slate-700/60 cursor-pointer transition-all active:scale-95 disabled:opacity-50"
              title="Refresh Google Fit Data"
            >
              <RefreshCw className={`w-4 h-4 ${syncing || isLoading ? 'animate-spin text-orange-400' : ''}`} />
            </button>
          )}
        </div>
      </div>

      {/* Progress Bar */}
      <div className="space-y-1.5">
        <div className="flex justify-between font-mono text-[11px] text-slate-400">
          <span>DAILY STEP PROGRESS</span>
          <span className="font-bold text-slate-200">{steps.toLocaleString()} / {targetSteps.toLocaleString()} STEPS</span>
        </div>
        <div className="h-2.5 w-full bg-slate-950 rounded-full overflow-hidden border border-slate-800 p-0.5">
          <div
            className="h-full bg-gradient-to-r from-orange-500 to-amber-400 rounded-full transition-all duration-500"
            style={{ width: `${stepsPercent}%` }}
          />
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
        {/* Steps */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="flex items-center gap-1.5 font-display text-[10px] text-slate-400 font-bold tracking-wider uppercase mb-1">
            <Footprints className="w-3.5 h-3.5 text-orange-400" />
            <span>DAILY STEPS</span>
          </div>
          <div className="font-display text-xl font-extrabold text-slate-100 tracking-wider">
            {steps.toLocaleString()}
          </div>
          <div className="font-mono text-[10px] text-slate-500 mt-0.5">{stepsPercent}% OF GOAL</div>
        </div>

        {/* Calories Burned */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="flex items-center gap-1.5 font-display text-[10px] text-slate-400 font-bold tracking-wider uppercase mb-1">
            <Flame className="w-3.5 h-3.5 text-orange-400" />
            <span>ACTIVE BURN</span>
          </div>
          <div className="font-display text-xl font-extrabold text-slate-100 tracking-wider">{activeCalories} KCAL</div>
          <div className="font-mono text-[10px] text-slate-500 mt-0.5">ESTIMATED BURN</div>
        </div>

        {/* Distance */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="flex items-center gap-1.5 font-display text-[10px] text-slate-400 font-bold tracking-wider uppercase mb-1">
            <Activity className="w-3.5 h-3.5 text-slate-300" />
            <span>DISTANCE</span>
          </div>
          <div className="font-display text-xl font-extrabold text-slate-100 tracking-wider">{distanceKm} KM</div>
          <div className="font-mono text-[10px] text-slate-500 mt-0.5">WALK & RUN</div>
        </div>

        {/* Heart Rate */}
        <div className="p-3 rounded-xl bg-slate-950/70 border border-slate-800/80">
          <div className="flex items-center gap-1.5 font-display text-[10px] text-slate-400 font-bold tracking-wider uppercase mb-1">
            <Heart className="w-3.5 h-3.5 text-rose-400" />
            <span>AVG HEART RATE</span>
          </div>
          <div className="font-display text-xl font-extrabold text-slate-100 tracking-wider">{heartRateBpm} BPM</div>
          <div className="font-mono text-[10px] text-slate-500 mt-0.5">REST / ACTIVE</div>
        </div>
      </div>

      {/* Sync Footer Note */}
      {metrics.lastSyncedAt && (
        <div className="flex items-center justify-between text-[10px] font-mono text-slate-500 pt-1 border-t border-slate-800/60">
          <span>SOURCE: {metrics.source === 'google_fit' ? 'GOOGLE FIT REST API' : 'GOOGLE FIT SIMULATOR'}</span>
          <span>LAST SYNCED: {metrics.lastSyncedAt}</span>
        </div>
      )}
    </div>
  );
}
