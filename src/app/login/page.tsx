'use client';

import { useState } from 'react';
import { Dumbbell, Mail, Lock, ArrowRight, CheckCircle2 } from 'lucide-react';
import { createClient } from '@/lib/supabase/client';
import { useRouter } from 'next/navigation';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const supabase = createClient();

  const handleGoogleLogin = async () => {
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setErrorMsg(error.message);
    } catch (err: any) {
      setErrorMsg(err.message || 'Google Auth Error');
    }
  };

  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: `${window.location.origin}/auth/callback`,
          },
        });
        if (error) {
          setErrorMsg(error.message);
        } else {
          setSuccessMsg('Check your email for confirmation link!');
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) {
          setErrorMsg(error.message);
        } else {
          router.push('/dashboard');
        }
      }
    } catch (err: any) {
      setErrorMsg(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-3xl p-6 md:p-8 shadow-2xl space-y-6 relative overflow-hidden">
        {/* Glow backdrop */}
        <div className="absolute -top-20 -right-20 w-60 h-60 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-60 h-60 bg-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

        {/* Brand */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-emerald-500 to-cyan-500 flex items-center justify-center shadow-xl shadow-emerald-500/20 mx-auto">
            <Dumbbell className="w-8 h-8 text-slate-950 stroke-[2.5]" />
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            AURA <span className="text-emerald-400">FIT</span>
          </h1>
          <p className="text-xs text-slate-400 font-medium">Private Personal Gym & Fitness Platform</p>
        </div>

        {/* Google OAuth Button */}
        <button
          onClick={handleGoogleLogin}
          className="w-full py-3.5 px-4 rounded-xl bg-slate-950 hover:bg-slate-800 border border-slate-800 text-slate-100 font-bold text-sm flex items-center justify-center gap-3 transition-all cursor-pointer shadow-md active:scale-95"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24">
            <path
              fill="#EA4335"
              d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
            />
            <path
              fill="#4285F4"
              d="M23.5 12.3c0-.8-.1-1.6-.2-2.3H12v4.5h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.8z"
            />
            <path
              fill="#FBBC05"
              d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.3s.2-1.6.4-2.3L1.9 7.3C.7 9.7 0 12.4 0 15.3c0 2.9.7 5.6 1.9 8l3.7-2.9z"
            />
            <path
              fill="#34A853"
              d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2.4-6.4-5.2L1.9 16C3.7 19.7 7.5 23 12 23z"
            />
          </svg>
          <span>Continue with Google</span>
        </button>

        <div className="flex items-center gap-3 my-2">
          <div className="flex-1 h-px bg-slate-800" />
          <span className="text-[11px] text-slate-400 font-semibold uppercase">Or Email Sign In</span>
          <div className="flex-1 h-px bg-slate-800" />
        </div>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-500/10 border border-rose-500/20 text-rose-400 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" />
            <span>{successMsg}</span>
          </div>
        )}

        {/* Email & Password Form */}
        <form onSubmit={handleEmailAuth} className="space-y-4">
          <div>
            <label className="text-xs text-slate-400 font-semibold mb-1 block">Email Address</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="alex@example.com"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="text-xs text-slate-400 font-semibold mb-1 block">Password</label>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3.5" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full pl-10 pr-4 py-3 rounded-xl bg-slate-950 border border-slate-800 text-slate-100 text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 rounded-xl bg-gradient-to-r from-emerald-500 to-cyan-500 hover:from-emerald-400 hover:to-cyan-400 text-slate-950 font-bold text-sm flex items-center justify-center gap-2 cursor-pointer shadow-lg shadow-emerald-500/20 active:scale-95 transition-all"
          >
            <span>{isSignUp ? 'Create Account' : 'Sign In'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="text-center pt-2">
          <button
            onClick={() => setIsSignUp(!isSignUp)}
            className="text-xs text-slate-400 hover:text-slate-200 cursor-pointer underline"
          >
            {isSignUp ? 'Already have an account? Sign In' : 'Need an account? Sign Up'}
          </button>
        </div>
      </div>
    </div>
  );
}
