'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getUserProfile } from '@/lib/services/profileService';
import { CrossedDumbbellsLogo } from '@/components/brand/CrossedDumbbellsLogo';
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  User,
  ArrowRight,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  Loader2,
  ChevronLeft,
  RefreshCw,
} from 'lucide-react';

type AuthMode = 'welcome' | 'login' | 'register' | 'forgot';

export default function LoginPage() {
  const router = useRouter();
  const [mode, setMode] = useState<AuthMode>('welcome');

  // Form Fields
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  // Status & Safety
  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isNetworkError, setIsNetworkError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const supabase = createClient();

  // Handle Google OAuth
  const handleGoogleAuth = async () => {
    setIsLoading(true);
    setErrorMessage('');
    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: `${window.location.origin}/auth/callback`,
        },
      });
      if (error) setErrorMessage(error.message);
    } catch (err: any) {
      setErrorMessage(err.message || 'Google Authentication failed');
      setIsLoading(false);
    }
  };

  // Handle Password Reset
  const handleForgotPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!email) {
      setErrorMessage('Please enter your email address to reset password');
      return;
    }
    setIsLoading(true);
    setErrorMessage('');
    setSuccessMessage('');

    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: `${window.location.origin}/auth/callback?type=recovery`,
      });
      if (error) {
        setErrorMessage(error.message);
      } else {
        setSuccessMessage('Password reset instructions sent to your email.');
      }
    } catch (err: any) {
      setErrorMessage(err.message || 'Failed to send reset instructions');
    } finally {
      setIsLoading(false);
    }
  };

  // Handle Email Auth (Login / Register) with network/DNS error discrimination
  const handleEmailAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLoading || isSubmitting) return;

    setErrorMessage('');
    setSuccessMessage('');
    setIsNetworkError(false);

    const trimmedEmail = email.trim().toLowerCase();
    if (!trimmedEmail || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmedEmail)) {
      setErrorMessage('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMessage('Password must be at least 6 characters long.');
      return;
    }

    if (mode === 'register' && !fullName.trim()) {
      setErrorMessage('Please enter your full name to create an account.');
      return;
    }

    setIsLoading(true);
    setIsSubmitting(true);

    try {
      if (mode === 'register') {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              full_name: fullName.trim() || 'Athlete',
            },
            emailRedirectTo:
              typeof window !== 'undefined'
                ? `${window.location.origin}/auth/callback`
                : undefined,
          },
        });

        if (error) {
          const msg = error.message || '';
          if (msg.toLowerCase().includes('already registered') || error.status === 422) {
            setErrorMessage('An account with this email already exists. Please switch to Sign In.');
          } else if (msg.toLowerCase().includes('password')) {
            setErrorMessage('Password does not meet security requirements. Use at least 6 characters.');
          } else if (msg.toLowerCase().includes('rate limit') || error.status === 429) {
            setErrorMessage('Too many registration attempts. Please wait a moment and try again.');
          } else {
            setErrorMessage(error.message);
          }
          return;
        }

        // Handle successful registration response
        if (data.session) {
          router.push('/onboarding');
        } else if (data.user) {
          setSuccessMessage('Account created! Please check your email to confirm your account, then sign in.');
          setTimeout(() => {
            setMode('login');
          }, 4000);
        } else {
          setErrorMessage('Registration could not be completed. Please try again.');
        }
      } else {
        // Mode: Login
        const { data, error } = await supabase.auth.signInWithPassword({
          email: trimmedEmail,
          password,
        });

        if (error) {
          const msg = error.message || '';
          if (msg.toLowerCase().includes('invalid login credentials')) {
            setErrorMessage('Invalid email or password. Please verify your credentials and try again.');
          } else if (msg.toLowerCase().includes('email not confirmed')) {
            setErrorMessage('Please confirm your email address before signing in.');
          } else {
            setErrorMessage(error.message);
          }
          return;
        }

        if (data.user) {
          // Check if onboarding was completed
          const profile = await getUserProfile(data.user.id);
          if (profile && profile.onboarding_completed) {
            router.push('/');
          } else {
            router.push('/onboarding');
          }
        } else {
          router.push('/');
        }
      }
    } catch (err: any) {
      console.error('Authentication request failure:', err);
      const rawMsg = err?.message || String(err || '');
      const isDnsOrNetwork =
        rawMsg.includes('Failed to fetch') ||
        rawMsg.includes('ERR_NAME_NOT_RESOLVED') ||
        rawMsg.includes('NetworkError') ||
        err?.name === 'TypeError';

      if (isDnsOrNetwork) {
        setIsNetworkError(true);
        setErrorMessage(
          'Unable to reach the Supabase authentication server. Please check your internet connection or verify your Supabase project status.'
        );
      } else {
        setErrorMessage(rawMsg || 'Authentication error occurred. Please try again.');
      }
    } finally {
      setIsLoading(false);
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#070512] bg-future-streaks flex items-center justify-center p-4 relative overflow-hidden select-none">
      {/* Ambient background glows inspired by FUTURE START */}
      <div className="absolute top-1/4 -left-20 w-80 h-80 rounded-full bg-[#9B5CFF]/18 blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 -right-20 w-80 h-80 rounded-full bg-[#00D5FF]/18 blur-3xl pointer-events-none" />
      <div className="absolute -top-10 right-1/3 w-60 h-60 rounded-full bg-[#FF42A6]/12 blur-3xl pointer-events-none" />

      {/* Main Container */}
      <div className="w-full max-w-md relative z-10">
        {/* ============================================================== */}
        {/* 1. WELCOME SCREEN                                             */}
        {/* ============================================================== */}
        {mode === 'welcome' && (
          <div className="glass-future rounded-3xl p-6 sm:p-8 space-y-6 text-center shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-[#9B5CFF]/25 animate-in fade-in zoom-in-95 duration-300">
            {/* Signature Logo */}
            <div className="flex justify-center pt-2">
              <CrossedDumbbellsLogo size={130} animated={true} showOrbitalText={true} />
            </div>

            {/* Brand Intro */}
            <div className="space-y-2">
              <span className="font-display text-[10px] sm:text-xs font-bold text-[#00D5FF] tracking-widest uppercase flex items-center justify-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#9B5CFF]" />
                FUTURISTIC FITNESS ECOSYSTEM
              </span>
              <h1 className="text-3xl sm:text-4xl font-display font-extrabold text-[#F6F2FF] tracking-tight uppercase leading-none">
                GYM <span className="text-[#9B5CFF]">HUB</span>
              </h1>
              <p className="text-xs sm:text-sm text-[#A9A1BD] max-w-xs mx-auto leading-relaxed pt-1">
                Intelligent gym workouts, real-time macro fueling, biometrics analytics, and dragon streak gamification.
              </p>
            </div>

            {/* Actions */}
            <div className="space-y-3 pt-2">
              <button
                onClick={() => setMode('register')}
                className="w-full py-3.5 px-5 rounded-2xl bg-gradient-to-r from-[#9B5CFF] via-[#7928CA] to-[#00D5FF] hover:brightness-110 text-white font-display font-extrabold text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(155,92,255,0.4)] active:scale-95 transition-all cursor-pointer"
              >
                <span>GET STARTED</span>
                <ArrowRight className="w-4 h-4 stroke-[2.5]" />
              </button>

              <button
                onClick={() => setMode('login')}
                className="w-full py-3.5 px-5 rounded-2xl bg-white/5 hover:bg-white/10 text-[#F6F2FF] font-display font-bold text-xs tracking-wider uppercase border border-white/10 transition-all active:scale-95 cursor-pointer"
              >
                I ALREADY HAVE AN ACCOUNT
              </button>
            </div>
          </div>
        )}

        {/* ============================================================== */}
        {/* 2. LOGIN / REGISTER / FORGOT PASSWORD FORM                    */}
        {/* ============================================================== */}
        {mode !== 'welcome' && (
          <div className="glass-future rounded-3xl p-6 sm:p-8 space-y-5 shadow-[0_20px_50px_rgba(0,0,0,0.85)] border border-[#9B5CFF]/25 animate-in fade-in duration-200">
            {/* Header with Back Button */}
            <div className="flex items-center justify-between border-b border-white/8 pb-3">
              <button
                onClick={() => setMode('welcome')}
                className="w-8 h-8 rounded-xl bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white border border-white/8 flex items-center justify-center transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>

              <div className="flex items-center gap-2">
                <CrossedDumbbellsLogo size={32} animated={false} />
                <span className="font-display font-extrabold text-sm text-[#F6F2FF] tracking-wider uppercase">
                  GYM <span className="text-[#9B5CFF]">HUB</span>
                </span>
              </div>

              <div className="w-8" />
            </div>

            {/* Mode Titles */}
            <div className="text-center space-y-1">
              <h2 className="text-xl sm:text-2xl font-display font-extrabold text-[#F6F2FF] tracking-wide uppercase">
                {mode === 'login' && 'Welcome Back'}
                {mode === 'register' && 'Create Your Account'}
                {mode === 'forgot' && 'Reset Password'}
              </h2>
              <p className="text-xs text-[#A9A1BD]">
                {mode === 'login' && 'Sign in to access your personal fitness console'}
                {mode === 'register' && 'Begin your customized futuristic fitness journey'}
                {mode === 'forgot' && 'Enter your email to receive a recovery link'}
              </p>
            </div>

            {/* Error & Success Messages */}
            {errorMessage && (
              <div className="p-3.5 rounded-2xl bg-rose-500/15 border border-rose-500/35 text-rose-300 text-xs flex flex-col gap-2.5 animate-in fade-in">
                <div className="flex items-start gap-2.5">
                  <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-400" />
                  <span className="leading-relaxed flex-1">{errorMessage}</span>
                </div>
                {isNetworkError && (
                  <div className="flex items-center justify-between pt-2 border-t border-rose-500/20">
                    <span className="text-[10px] text-rose-400/90 font-mono">Status: Server Unreachable (DNS / Network)</span>
                    <button
                      type="button"
                      onClick={(e) => handleEmailAuth(e as any)}
                      disabled={isLoading || isSubmitting}
                      className="px-2.5 py-1 rounded-lg bg-rose-500/25 hover:bg-rose-500/35 active:scale-95 text-[11px] font-semibold text-white flex items-center gap-1.5 cursor-pointer transition-all border border-rose-500/30"
                    >
                      <RefreshCw className="w-3 h-3 text-rose-300" />
                      <span>Retry</span>
                    </button>
                  </div>
                )}
              </div>
            )}
            {successMessage && (
              <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-xs flex items-center gap-2.5 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                <span className="leading-relaxed">{successMessage}</span>
              </div>
            )}

            {/* Form */}
            {mode === 'forgot' ? (
              <form onSubmit={handleForgotPassword} className="space-y-4">
                <div className="space-y-1">
                  <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block">
                    Account Email
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full py-2.5 pl-10 pr-3 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-[#9B5CFF] transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-full py-3.5 rounded-xl bg-gradient-to-r from-[#9B5CFF] to-[#00D5FF] text-white font-display font-bold text-xs uppercase tracking-wider flex items-center justify-center gap-2 shadow-[0_0_20px_rgba(155,92,255,0.4)] active:scale-95 transition-all cursor-pointer"
                >
                  {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <span>Send Recovery Email</span>}
                </button>

                <button
                  type="button"
                  onClick={() => setMode('login')}
                  className="w-full text-center text-xs text-[#00D5FF] hover:underline cursor-pointer"
                >
                  Back to Sign In
                </button>
              </form>
            ) : (
              <form onSubmit={handleEmailAuth} className="space-y-3.5">
                {/* Full Name for Registration */}
                {mode === 'register' && (
                  <div className="space-y-1">
                    <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block">
                      Full Name
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        required
                        autoComplete="name"
                        placeholder="Enter your full name"
                        value={fullName}
                        onChange={(e) => setFullName(e.target.value)}
                        className="w-full py-2.5 pl-10 pr-3 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-[#9B5CFF] transition-colors"
                      />
                    </div>
                  </div>
                )}

                {/* Email Field */}
                <div className="space-y-1">
                  <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type="email"
                      required
                      autoComplete="email"
                      placeholder="Enter your email address"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="w-full py-2.5 pl-10 pr-3 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-[#9B5CFF] transition-colors"
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between">
                    <label className="text-[10px] font-display font-bold text-[#A9A1BD] uppercase tracking-wider block">
                      Password
                    </label>
                    {mode === 'login' && (
                      <button
                        type="button"
                        onClick={() => setMode('forgot')}
                        className="text-[10px] text-[#00D5FF] hover:underline cursor-pointer"
                      >
                        Forgot password?
                      </button>
                    )}
                  </div>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      type={showPassword ? 'text' : 'password'}
                      required
                      minLength={6}
                      autoComplete={mode === 'register' ? 'new-password' : 'current-password'}
                      placeholder="••••••••"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="w-full py-2.5 pl-10 pr-10 rounded-xl bg-black/40 border border-white/10 text-xs sm:text-sm text-white focus:outline-none focus:border-[#9B5CFF] transition-colors"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                    >
                      {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>

                {/* Submit Action */}
                <button
                  type="submit"
                  disabled={isLoading || isSubmitting}
                  className="w-full py-3.5 mt-2 rounded-2xl bg-gradient-to-r from-[#9B5CFF] via-[#7928CA] to-[#00D5FF] hover:brightness-110 disabled:opacity-75 disabled:cursor-not-allowed text-white font-display font-extrabold text-sm tracking-wider uppercase flex items-center justify-center gap-2 shadow-[0_0_25px_rgba(155,92,255,0.4)] active:scale-95 transition-all cursor-pointer"
                >
                  {isLoading || isSubmitting ? (
                    <div className="flex items-center gap-2">
                      <Loader2 className="w-5 h-5 animate-spin text-white" />
                      <span>{mode === 'register' ? 'CREATING ACCOUNT...' : 'SIGNING IN...'}</span>
                    </div>
                  ) : (
                    <>
                      <span>{mode === 'register' ? 'CREATE ACCOUNT' : 'SIGN IN'}</span>
                      <ArrowRight className="w-4 h-4 stroke-[2.5]" />
                    </>
                  )}
                </button>

                {/* Divider */}
                <div className="flex items-center gap-3 pt-1">
                  <div className="h-px flex-1 bg-white/8" />
                  <span className="text-[10px] text-[#A9A1BD] uppercase font-mono">OR</span>
                  <div className="h-px flex-1 bg-white/8" />
                </div>

                {/* Google OAuth Button */}
                <button
                  type="button"
                  onClick={handleGoogleAuth}
                  disabled={isLoading}
                  className="w-full py-3 rounded-xl bg-white/5 hover:bg-white/10 text-[#F6F2FF] font-display font-bold text-xs uppercase tracking-wider border border-white/10 flex items-center justify-center gap-2 transition-all cursor-pointer"
                >
                  <svg className="w-4 h-4" viewBox="0 0 24 24">
                    <path
                      fill="#EA4335"
                      d="M12 5c1.6 0 3 .6 4.1 1.6l3.1-3.1C17.3 1.7 14.8 1 12 1 7.5 1 3.7 3.6 1.9 7.3l3.7 2.9C6.5 7.4 9 5 12 5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M23.5 12.3c0-.8-.1-1.7-.2-2.3H12v4.6h6.5c-.3 1.5-1.1 2.8-2.4 3.7l3.7 2.9c2.2-2 3.7-5 3.7-8.9z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M5.6 14.8c-.2-.7-.4-1.5-.4-2.8s.2-2.1.4-2.8L1.9 6.3C.7 8.7 0 10.8 0 12s.7 3.3 1.9 5.7l3.7-2.9z"
                    />
                    <path
                      fill="#34A853"
                      d="M12 23c3.2 0 6-1.1 8-3l-3.7-2.9c-1.1.7-2.5 1.2-4.3 1.2-3 0-5.5-2-6.4-4.8L1.9 16.4C3.7 20.4 7.5 23 12 23z"
                    />
                  </svg>
                  <span>Continue with Google</span>
                </button>

                {/* Mode Switcher */}
                <div className="pt-2 text-center">
                  {mode === 'login' ? (
                    <p className="text-xs text-[#A9A1BD]">
                      New to GYM HUB?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage('');
                          setMode('register');
                        }}
                        className="text-[#00D5FF] font-bold hover:underline cursor-pointer"
                      >
                        Create an account
                      </button>
                    </p>
                  ) : (
                    <p className="text-xs text-[#A9A1BD]">
                      Already have an account?{' '}
                      <button
                        type="button"
                        onClick={() => {
                          setErrorMessage('');
                          setMode('login');
                        }}
                        className="text-[#00D5FF] font-bold hover:underline cursor-pointer"
                      >
                        Sign in
                      </button>
                    </p>
                  )}
                </div>
              </form>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
