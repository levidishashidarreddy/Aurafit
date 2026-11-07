// GYM HUB: Persistent Dragon Streak Engine
// Strictly calculates and updates streaks once per local calendar date.
// Qualifying activities: Step goal achieved, workout session completed, or nutrition logged.

import { createClient } from '../supabase/client';
import { updateProfile, getUserProfile } from './profileService';

export interface StreakState {
  currentStreak: number;
  longestStreak: number;
  lastStreakDate: string | null;
  isTodayQualified: boolean;
  qualifyingReason: string;
}

const LOCAL_STREAK_KEY = 'gymhub_user_streak_state_v1';

export function getLocalStreakState(): StreakState {
  if (typeof window === 'undefined') {
    return {
      currentStreak: 0,
      longestStreak: 0,
      lastStreakDate: null,
      isTodayQualified: false,
      qualifyingReason: 'Complete steps, workout, or nutrition',
    };
  }
  try {
    const raw = localStorage.getItem(LOCAL_STREAK_KEY);
    if (raw) return JSON.parse(raw);
  } catch {}
  return {
    currentStreak: 0,
    longestStreak: 0,
    lastStreakDate: null,
    isTodayQualified: false,
    qualifyingReason: 'Complete steps, workout, or nutrition',
  };
}

export function saveLocalStreakState(state: StreakState): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(LOCAL_STREAK_KEY, JSON.stringify(state));
    window.dispatchEvent(new CustomEvent('gymhub_streak_updated', { detail: state }));
  } catch {}
}

export function getLocalDateString(d: Date = new Date()): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getYesterdayDateString(today: Date = new Date()): string {
  const y = new Date(today);
  y.setDate(y.getDate() - 1);
  return getLocalDateString(y);
}

export interface DayActivityData {
  totalSteps: number;
  stepTarget: number;
  workoutCompleted: boolean;
  nutritionLogged: boolean;
}

/**
 * Checks whether the user qualified for a streak today based on real data
 */
export function checkIsDayQualified(data: DayActivityData): { qualified: boolean; reason: string } {
  if (data.workoutCompleted) {
    return { qualified: true, reason: 'Completed scheduled workout session' };
  }
  if (data.stepTarget > 0 && data.totalSteps >= data.stepTarget) {
    return { qualified: true, reason: `Reached daily step goal (${data.totalSteps.toLocaleString()} steps)` };
  }
  if (data.nutritionLogged) {
    return { qualified: true, reason: 'Logged daily nutrition summary' };
  }
  return {
    qualified: false,
    reason: `Qualify by reaching ${data.stepTarget.toLocaleString()} steps, finishing a workout, or logging nutrition`,
  };
}

/**
 * Evaluates and idempotently syncs streak progress to Supabase profiles
 */
export async function evaluateAndSyncStreak(
  userId: string,
  activityData: DayActivityData
): Promise<StreakState> {
  const todayStr = getLocalDateString();
  const yesterdayStr = getYesterdayDateString();

  const { qualified, reason } = checkIsDayQualified(activityData);

  // Load existing profile state
  const profile = await getUserProfile(userId);

  let currentStreak = profile?.streak_count || 0;
  let longestStreak = profile?.longest_streak || 0;
  let lastStreakDate = profile?.last_streak_date || null;

  if (qualified) {
    if (lastStreakDate === todayStr) {
      // Already counted for today! Do not double-increment.
      // currentStreak and longestStreak remain unchanged
    } else if (lastStreakDate === yesterdayStr) {
      // Consecutive day! Increment
      currentStreak += 1;
      lastStreakDate = todayStr;
      if (currentStreak > longestStreak) {
        longestStreak = currentStreak;
      }
      // Persist to Supabase
      await updateProfile(userId, {
        streak_count: currentStreak,
        longest_streak: longestStreak,
        last_streak_date: todayStr,
      });
    } else {
      // Missed at least 1 day, or first ever qualification: reset streak to 1
      currentStreak = 1;
      lastStreakDate = todayStr;
      if (longestStreak < 1) longestStreak = 1;

      await updateProfile(userId, {
        streak_count: currentStreak,
        longest_streak: longestStreak,
        last_streak_date: todayStr,
      });
    }
  } else {
    // Today not qualified yet
    if (lastStreakDate === todayStr) {
      // Retain today's qualification if recorded earlier today
    } else if (lastStreakDate === yesterdayStr) {
      // Yesterday was qualified, streak is preserved pending today's qualification
    } else if (lastStreakDate && lastStreakDate < yesterdayStr) {
      // Missed day has elapsed and today is not completed yet -> reset active streak
      currentStreak = 0;
      await updateProfile(userId, {
        streak_count: 0,
      });
    } else if (!lastStreakDate) {
      currentStreak = 0;
    }
  }

  const state: StreakState = {
    currentStreak,
    longestStreak,
    lastStreakDate,
    isTodayQualified: qualified || lastStreakDate === todayStr,
    qualifyingReason: reason,
  };

  saveLocalStreakState(state);
  return state;
}

