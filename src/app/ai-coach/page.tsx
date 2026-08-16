'use client';

import { useState } from 'react';
import { AppShell } from '@/components/layout/AppShell';
import { askAICoach, generateAIMealPlan } from '@/lib/services/aiService';
import { Bot, Send, Sparkles, Utensils, Dumbbell, Loader2, User } from 'lucide-react';

interface ChatMessage {
  id: string;
  sender: 'user' | 'ai';
  text: string;
  timestamp: string;
}

export default function AICoachPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: '1',
      sender: 'ai',
      text: "Hello Alex! 👋 I'm your AI Fitness Coach. I've analyzed today's data:\n• Calories: 1,850 / 2,200 kcal\n• Protein: 118 / 140 g\n• Workout: Push Day Completed\n\nHow can I optimize your training or nutrition today?",
      timestamp: '9:00 AM',
    },
  ]);

  const [inputQuery, setInputQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState<'chat' | 'meal_planner' | 'workout_gen'>('chat');
  const [generatedMealPlan, setGeneratedMealPlan] = useState<string>('');

  const handleSend = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputQuery.trim() || loading) return;

    const userMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: 'user',
      text: inputQuery.trim(),
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, userMsg]);
    const currentQuery = inputQuery.trim();
    setInputQuery('');
    setLoading(true);

    const aiResponse = await askAICoach(currentQuery, {
      fullName: 'Alex',
      goal: 'Muscle Gain',
      weightKg: 72.4,
      targetCalories: 2200,
      consumedCalories: 1850,
      targetProtein: 140,
      consumedProtein: 118,
      todayWorkoutStatus: 'Push Day Completed (4 exercises, 14 sets)',
      streakDays: 12,
    });

    const aiMsg: ChatMessage = {
      id: Math.random().toString(),
      sender: 'ai',
      text: aiResponse,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setMessages((prev) => [...prev, aiMsg]);
    setLoading(false);
  };

  const handleGenerateMealPlan = async () => {
    setLoading(true);
    const plan = await generateAIMealPlan(2200, 140, 'High protein, clean bulk');
    setGeneratedMealPlan(plan);
    setLoading(false);
  };

  return (
    <AppShell headerTitle="AI Fitness Assistant & Coach">
      {/* Mode Selector Tabs */}
      <div className="flex gap-2 p-1.5 rounded-2xl bg-slate-900 border border-slate-800">
        {[
          { id: 'chat', label: 'Conversational Coach', icon: Bot },
          { id: 'meal_planner', label: 'AI Meal Planner', icon: Utensils },
          { id: 'workout_gen', label: 'AI Workout Generator', icon: Dumbbell },
        ].map((tab) => {
          const Icon = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id as any)}
              className={`flex-1 py-2.5 px-3 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer ${
                activeTab === tab.id
                  ? 'bg-gradient-to-r from-purple-600 to-indigo-600 text-slate-100 shadow-md shadow-purple-500/20'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
              }`}
            >
              <Icon className="w-4 h-4" />
              <span>{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* CHAT TAB */}
      {activeTab === 'chat' && (
        <div className="flex flex-col h-[calc(100vh-280px)] min-h-[450px] rounded-2xl bg-slate-900/80 border border-slate-800/80 backdrop-blur-md overflow-hidden">
          {/* Chat Messages scroll area */}
          <div className="flex-1 overflow-y-auto p-4 md:p-5 space-y-4">
            {messages.map((msg) => (
              <div
                key={msg.id}
                className={`flex gap-3 max-w-[85%] ${msg.sender === 'user' ? 'ml-auto flex-row-reverse' : ''}`}
              >
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center flex-shrink-0 text-xs font-bold ${
                    msg.sender === 'user'
                      ? 'bg-emerald-500 text-slate-950'
                      : 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                  }`}
                >
                  {msg.sender === 'user' ? <User className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
                </div>

                <div
                  className={`p-4 rounded-2xl text-xs md:text-sm whitespace-pre-wrap leading-relaxed ${
                    msg.sender === 'user'
                      ? 'bg-emerald-600 text-slate-950 font-medium rounded-tr-none'
                      : 'bg-slate-950/80 border border-slate-800 text-slate-100 rounded-tl-none'
                  }`}
                >
                  {msg.text}
                  <div className="text-[10px] opacity-60 mt-2 text-right">{msg.timestamp}</div>
                </div>
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 max-w-[85%]">
                <div className="w-8 h-8 rounded-xl bg-purple-500/20 text-purple-300 border border-purple-500/30 flex items-center justify-center">
                  <Loader2 className="w-4 h-4 animate-spin text-purple-400" />
                </div>
                <div className="p-3 rounded-2xl bg-slate-950 border border-slate-800 text-xs text-slate-400 italic">
                  AI Coach is analyzing your fitness data...
                </div>
              </div>
            )}
          </div>

          {/* Preset Prompts Pill Row */}
          <div className="px-4 py-2 bg-slate-950/40 border-t border-slate-800/60 flex gap-2 overflow-x-auto text-xs">
            {[
              'What should I eat for dinner?',
              'How is my protein target today?',
              'Create a Chest & Triceps routine',
              'Estimate my 1RM Bench Press',
            ].map((preset, idx) => (
              <button
                key={idx}
                onClick={() => {
                  setInputQuery(preset);
                }}
                className="py-1 px-3 rounded-full bg-slate-800/80 hover:bg-purple-950/60 text-purple-300 border border-slate-700/60 flex-shrink-0 cursor-pointer transition-colors"
              >
                {preset}
              </button>
            ))}
          </div>

          {/* Input Form */}
          <form onSubmit={handleSend} className="p-3 bg-slate-950 border-t border-slate-800 flex gap-2">
            <input
              type="text"
              value={inputQuery}
              onChange={(e) => setInputQuery(e.target.value)}
              placeholder="Ask your AI Fitness Coach..."
              className="flex-1 px-4 py-3 rounded-xl bg-slate-900 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-purple-500"
            />
            <button
              type="submit"
              disabled={loading || !inputQuery.trim()}
              className="px-5 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-slate-100 font-bold text-sm flex items-center justify-center cursor-pointer shadow-lg shadow-purple-500/20 active:scale-95 transition-all disabled:opacity-50"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
        </div>
      )}

      {/* MEAL PLANNER TAB */}
      {activeTab === 'meal_planner' && (
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-bold text-slate-100 text-base">AI Personalized Meal Generator</h3>
              <p className="text-xs text-slate-400">Generates exact meals matching remaining 350 kcal & 22g protein target</p>
            </div>
            <button
              onClick={handleGenerateMealPlan}
              disabled={loading}
              className="py-2.5 px-4 rounded-xl bg-purple-600 hover:bg-purple-500 text-slate-100 font-bold text-xs flex items-center gap-2 cursor-pointer shadow-md shadow-purple-500/20"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              <span>Generate Meal Plan</span>
            </button>
          </div>

          {generatedMealPlan && (
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 text-xs md:text-sm text-slate-200 leading-relaxed font-mono whitespace-pre-wrap">
              {generatedMealPlan}
            </div>
          )}
        </div>
      )}

      {/* WORKOUT GENERATOR TAB */}
      {activeTab === 'workout_gen' && (
        <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-4">
          <h3 className="font-bold text-slate-100 text-base">AI Workout Routine Creator</h3>
          <p className="text-xs text-slate-400">Select parameters to generate a custom progressive overload gym split:</p>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs text-slate-400 font-semibold mb-1 block">Muscle Focus</label>
              <select className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs">
                <option>Push (Chest, Shoulders, Triceps)</option>
                <option>Pull (Back, Biceps, Rear Delts)</option>
                <option>Legs (Quads, Hamstrings, Calves)</option>
                <option>Upper Body Hypertrophy</option>
              </select>
            </div>
            <div>
              <label className="text-xs text-slate-400 font-semibold mb-1 block">Available Equipment</label>
              <select className="w-full p-2.5 rounded-xl bg-slate-950 border border-slate-800 text-slate-200 text-xs">
                <option>Full Commercial Gym</option>
                <option>Dumbbells & Bench Only</option>
                <option>Bodyweight / Home Gym</option>
              </select>
            </div>
          </div>

          <button
            onClick={() => alert('Generating customized 45-minute hypertrophy workout session...')}
            className="w-full py-3 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 text-slate-100 font-bold text-xs cursor-pointer shadow-lg shadow-purple-500/20"
          >
            Generate AI Gym Routine
          </button>
        </div>
      )}
    </AppShell>
  );
}
