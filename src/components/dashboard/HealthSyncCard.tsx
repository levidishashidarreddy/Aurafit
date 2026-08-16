'use client';

import { useState, useEffect } from 'react';
import { Activity, Footprints, Flame, Heart, RefreshCw, CheckCircle2, ShieldAlert, Zap, AlertTriangle, X, Copy, Check, ExternalLink } from 'lucide-react';
import { HealthMetrics, getSimulatedHealthData } from '@/lib/services/googleFitService';

interface HealthSyncCardProps {
  metrics?: HealthMetrics;
  onSyncRefresh?: () => void;
  onSimulateSync?: (simulated: HealthMetrics) => void;
  isLoading?: boolean;
}

export function HealthSyncCard({
  metrics = {
    steps: 0,
    targetSteps: 10000,
    activeCalories: 0,
    distanceKm: 0,
    heartRateBpm: 0,
    isSynced: false,
    source: 'simulated',
  },
  onSyncRefresh,
  onSimulateSync,
  isLoading = false,
}: HealthSyncCardProps) {
  const [syncing, setSyncing] = useState(false);
  const [oauthError, setOauthError] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search);
      const err = params.get('fit_error');
      if (err) {
        setOauthError(decodeURIComponent(err));
      }
    }
  }, []);

  const redirectUri = typeof window !== 'undefined'
    ? `${window.location.origin}/api/auth/google-fit/callback`
    : 'http://localhost:3000/api/auth/google-fit/callback';

  const copyRedirectUri = () => {
    navigator.clipboard.writeText(redirectUri);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const steps = metrics.steps || 0;
  const targetSteps = metrics.targetSteps || 10000;
  const activeCalories = metrics.activeCalories || 0;
  const distanceKm = metrics.distanceKm || 0;
  const heartRateBpm = metrics.heartRateBpm || 0;
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
    setShowModal(false);
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
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-display font-bold text-xs tracking-wider uppercase transition-all shadow-md shadow-orange-500/20 active:scale-95 flex items-center gap-1.5 cursor-pointer"
            >
              CONNECT FIT
            </button>
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

      {/* OAuth Error Alert Banner */}
      {oauthError && (
        <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-1 relative">
          <button
            onClick={() => setOauthError(null)}
            className="absolute top-2.5 right-2.5 text-amber-400 hover:text-amber-200 cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
          <div className="flex items-center gap-2 font-bold uppercase tracking-wider text-[11px] text-amber-400">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <span>Google OAuth Redirect URI Config Note</span>
          </div>
          <p className="text-[11px] text-amber-200/90 leading-relaxed">
            {oauthError.includes('redirect_uri_mismatch')
              ? 'Google Cloud Console OAuth redirect URI must match your current URL domain (e.g. http://localhost:3000/api/auth/google-fit/callback or your Vercel URL). In the meantime, use the SIMULATE STEPS button below to test live step tracking.'
              : oauthError}
          </p>
        </div>
      )}

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

      {/* Google Fit Setup & OAuth Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-2xl space-y-5 relative">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3">
              <div className="p-3 rounded-2xl bg-orange-500/10 text-orange-400 border border-orange-500/20">
                <Activity className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-display font-extrabold text-slate-100 text-lg">CONNECT GOOGLE FIT</h3>
                <p className="text-xs text-slate-400 font-medium">Sync live step counts, active burn & heart rate</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-950 border border-slate-800/80 space-y-3">
              <div className="text-xs font-bold text-slate-200 uppercase tracking-wider">
                Google Cloud Console OAuth Setup:
              </div>
              <p className="text-xs text-slate-400 leading-relaxed">
                If you encounter <code className="text-amber-400 font-mono">redirect_uri_mismatch</code>, ensure this exact URL is added under <span className="text-slate-200 font-semibold">Authorized redirect URIs</span> in your Google Cloud Console OAuth Client settings:
              </p>

              <div className="flex items-center gap-2 bg-slate-900 p-2.5 rounded-xl border border-slate-800 font-mono text-[11px] text-orange-300 overflow-x-auto">
                <span className="flex-1 truncate">{redirectUri}</span>
                <button
                  onClick={copyRedirectUri}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs flex items-center gap-1 cursor-pointer transition-all active:scale-95 shrink-0"
                >
                  {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                  <span>{copied ? 'COPIED' : 'COPY'}</span>
                </button>
              </div>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 pt-2">
              <a
                href="/api/auth/google-fit"
                className="w-full sm:w-auto flex-1 py-3 px-4 rounded-xl bg-orange-500 hover:bg-orange-600 text-slate-950 font-display font-bold text-xs tracking-wider uppercase transition-all shadow-md shadow-orange-500/20 active:scale-95 flex items-center justify-center gap-2"
              >
                <span>AUTHENTICATE WITH GOOGLE</span>
                <ExternalLink className="w-4 h-4" />
              </a>

              <button
                onClick={handleSimulateClick}
                className="w-full sm:w-auto py-3 px-4 rounded-xl bg-slate-800 hover:bg-slate-700 text-amber-300 border border-slate-700 text-xs font-mono font-medium flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-95"
              >
                <Zap className="w-4 h-4 text-amber-400" />
                <span>USE SIMULATED SENSOR</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
