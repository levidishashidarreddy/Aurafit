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
    <div className="p-4 rounded-3xl bg-[#100D20]/90 backdrop-blur-2xl border border-[#9B5CFF]/25 shadow-[0_15px_35px_rgba(0,0,0,0.6)] space-y-3 relative">
      <div className="flex items-center justify-between border-b border-white/8 pb-2">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded-lg bg-[#9B5CFF]/15 text-[#00D5FF] border border-[#9B5CFF]/25 flex items-center justify-center">
            <Timer className="w-3.5 h-3.5" />
          </div>
          <h4 className="font-display font-extrabold text-white text-xs uppercase tracking-wider">Gym Rest Timer</h4>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="w-6 h-6 rounded-full bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Countdown Timer Display */}
      <div className="text-center py-1 relative">
        <div className={`text-4xl font-extrabold tracking-tight font-mono ${secondsLeft === 0 ? 'text-[#38E6A5] animate-bounce' : 'text-white'}`}>
          {formatTime(secondsLeft)}
        </div>
        {secondsLeft === 0 && (
          <div className="text-xs font-bold text-[#38E6A5] flex items-center justify-center gap-1 mt-1">
            <Bell className="w-3.5 h-3.5" />
            <span>Rest Complete! Next set ready.</span>
          </div>
        )}

        {/* Progress bar */}
        <div className="w-full bg-black/40 rounded-full h-1.5 mt-3 overflow-hidden border border-white/5">
          <div
            className="bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF] h-1.5 rounded-full transition-all duration-300 shadow-[0_0_8px_rgba(0,213,255,0.5)]"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        <button
          onClick={() => setIsActive(!isActive)}
          className="p-2.5 rounded-xl bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF] text-white font-bold flex items-center justify-center cursor-pointer shadow-[0_0_12px_rgba(155,92,255,0.3)] active:scale-95 transition-all"
        >
          {isActive ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
        </button>
        <button
          onClick={() => {
            setIsActive(false);
            setSecondsLeft(initialSeconds);
          }}
          className="p-2.5 rounded-xl bg-white/5 hover:bg-white/10 text-slate-300 hover:text-white border border-white/10 flex items-center justify-center transition-all cursor-pointer"
        >
          <RotateCcw className="w-4 h-4" />
        </button>
      </div>

      {/* Presets */}
      <div className="grid grid-cols-4 gap-1.5 pt-1 border-t border-white/8">
        {[30, 60, 90, 120].map((secs) => (
          <button
            key={secs}
            onClick={() => startPreset(secs)}
            className={`py-1 rounded-lg text-[10px] font-mono font-bold uppercase transition-all cursor-pointer ${
              initialSeconds === secs
                ? 'bg-[#9B5CFF]/20 text-[#00D5FF] border border-[#9B5CFF]/40'
                : 'bg-white/5 text-slate-400 hover:text-white border border-white/5'
            }`}
          >
            {secs < 60 ? `${secs}s` : `${secs / 60}m`}
          </button>
        ))}
      </div>
    </div>
  );
}
