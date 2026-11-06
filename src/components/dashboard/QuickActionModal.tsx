'use client';

import { X, Utensils, Dumbbell, Scale, Footprints } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface QuickActionModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function QuickActionModal({ isOpen, onClose }: QuickActionModalProps) {
  const router = useRouter();

  if (!isOpen) return null;

  const actions = [
    {
      id: 'food',
      title: 'Paste Daily Nutrition Summary',
      description: 'Paste whole-day nutrition totals from ChatGPT',
      icon: Utensils,
      color: 'from-orange-500/20 to-amber-500/20 text-orange-400 border-orange-500/30',
      href: '/nutrition',
    },
    {
      id: 'workout',
      title: 'Start Gym Workout',
      description: 'Log sets, reps & barbell weight',
      icon: Dumbbell,
      color: 'from-cyan-500/20 to-blue-500/20 text-cyan-400 border-cyan-500/30',
      href: '/workout?action=start',
    },
    {
      id: 'activity',
      title: 'Record Steps & Activity',
      description: 'Manual steps and calories burned',
      icon: Footprints,
      color: 'from-emerald-500/20 to-teal-500/20 text-emerald-400 border-emerald-500/30',
      href: '/activity',
    },
    {
      id: 'weight',
      title: 'Add Body Weight',
      description: 'Record today\'s weigh-in',
      icon: Scale,
      color: 'from-slate-700/30 to-slate-800/30 text-slate-300 border-slate-700/40',
      href: '/progress?action=weight',
    },
  ];

  const handleSelect = (href: string) => {
    onClose();
    router.push(href);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-200">
      <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-md p-5 shadow-2xl space-y-4 relative">
        <div className="flex items-center justify-between border-b border-slate-800 pb-3">
          <h3 className="font-bold text-slate-100 text-lg">Quick Actions</h3>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-slate-200 hover:bg-slate-800 cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="grid grid-cols-1 gap-3">
          {actions.map((act) => {
            const Icon = act.icon;
            return (
              <button
                key={act.id}
                onClick={() => handleSelect(act.href)}
                className={`p-4 rounded-xl border bg-gradient-to-r ${act.color} flex items-center gap-4 hover:scale-[1.01] active:scale-[0.99] transition-all text-left cursor-pointer`}
              >
                <div className="p-3 rounded-xl bg-slate-950/60 border border-slate-700/40">
                  <Icon className="w-6 h-6 stroke-[2.2]" />
                </div>
                <div>
                  <div className="font-semibold text-slate-100 text-base">{act.title}</div>
                  <div className="text-xs text-slate-400 font-medium">{act.description}</div>
                </div>
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
