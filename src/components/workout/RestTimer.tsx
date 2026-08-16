'use client';

import { useState, useEffect } from 'react';
import { Timer, Play, Pause, RotateCcw, X, Bell } from 'lucide-react';

interface RestTimerProps {
  onClose?: () => void;
}

export function RestTimer({ onClose }: RestTimerProps) {
  const [secondsLeft, setSecondsLeft] = useState<number>(60);
  const [isActive, setIsActive] = useState<boolean>(false);
  const [initialSeconds, setInitialSeconds] = useState<number>(60);

  useEffect(() => {
    let interval: any = null;
    if (isActive && secondsLeft > 0) {
      interval = setInterval(() => {
        setSecondsLeft((prev) => prev - 1);
      }, 1000);
    } else if (secondsLeft === 0 && isActive) {
      setIsActive(false);
      // Play web audio chime if supported
      try {
        const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.connect(gain);
        gain.connect(audioCtx.destination);
        osc.frequency.value = 880; // A5 pitch
        osc.start();
        gain.gain.exponentialRampToValueAtTime(0.00001, audioCtx.currentTime + 0.8);
      } catch (e) {
        // Fallback silently if audio context disabled
      }
    }
    return () => clearInterval(interval);
  }, [isActive, secondsLeft]);

  const startPreset = (secs: number) => {
    setInitialSeconds(secs);
    setSecondsLeft(secs);
    setIsActive(true);
  };

  const formatTime = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins}:${secs < 10 ? '0' : ''}${secs}`;
  };

  const progressPercent = Math.round(((initialSeconds - secondsLeft) / (initialSeconds || 1)) * 100);

  return (
    <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl space-y-3 relative">
      <div className="flex items-center justify-between border-b border-slate-800 pb-2">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-cyan-500/10 text-cyan-400">
            <Timer className="w-4 h-4" />
          </div>
          <h4 className="font-bold text-slate-100 text-sm">Gym Rest Timer</h4>
        </div>
        {onClose && (
          <button onClick={onClose} className="p-1 text-slate-400 hover:text-slate-200">
            <X className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Countdown Timer Display */}
      <div className="text-center py-2 relative">
        <div className={`text-4xl font-extrabold tracking-tight font-mono ${secondsLeft === 0 ? 'text-emerald-400 animate-bounce' : 'text-slate-100'}`}>
          {formatTime(secondsLeft)}
        </div>
        {secondsLeft === 0 && (
          <div className="text-xs font-bold text-emerald-400 flex items-center justify-center gap-1 mt-1">
            <Bell className="w-3.5 h-3.5" />
            <span>Rest Complete! Next set ready.</span>
          </div>
        )}

        {/* Progress bar */}
        <div className="w-full bg-slate-800 rounded-full h-1.5 mt-3 overflow-hidden">
          <div
            className="bg-cyan-400 h-1.5 rounded-full transition-all duration-300"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setIsActive(!isActive)}
          className="p-2.5 rounded-xl bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold flex items-center justify-center cursor-pointer shadow-md shadow-cyan-500/20 active:scale-95 transition-all"
        >
          {isActive ? <Pause className="w-5 h-5 fill-slate-950" /> : <Play className="w-5 h-5 fill-slate-950" />}
        </button>
        <button
          onClick={() => {
            setSecondsLeft(initialSeconds);
            setIsActive(false);
          }}
          className="p-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 font-bold flex items-center justify-center cursor-pointer active:scale-95 transition-all"
        >
          <RotateCcw className="w-5 h-5" />
        </button>
      </div>

      {/* Presets */}
      <div className="grid grid-cols-4 gap-1.5 pt-1">
        {[30, 60, 90, 120].map((secs) => (
          <button
            key={secs}
            onClick={() => startPreset(secs)}
            className={`py-1.5 rounded-lg text-xs font-semibold border cursor-pointer transition-all ${
              initialSeconds === secs && isActive
                ? 'bg-cyan-500/20 text-cyan-400 border-cyan-500/40'
                : 'bg-slate-950 text-slate-300 border-slate-800 hover:bg-slate-800'
            }`}
          >
            {secs}s
          </button>
        ))}
      </div>
    </div>
  );
}
