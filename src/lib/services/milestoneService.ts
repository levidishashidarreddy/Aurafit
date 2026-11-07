// GYM HUB: Motivation & Gamification Milestone Service
// Evaluates verified user achievements and gates dismissible celebrations

export interface Milestone {
  id: string;
  title: string;
  subtitle: string;
  description: string;
  category: 'workout' | 'streak' | 'pr' | 'goal';
  icon: string;
  accentColor: string;
}

export const MILESTONES: Record<string, Milestone> = {
  first_workout: {
    id: 'first_workout',
    title: 'FIRST BATTLE WON',
    subtitle: 'The Journey Begins',
    description: 'You completed your first workout session. Every master was once a beginner.',
    category: 'workout',
    icon: 'dumbbell',
    accentColor: '#9B5CFF',
  },
  streak_7: {
    id: 'streak_7',
    title: 'DRAGON FLAME IGNITED',
    subtitle: '7-Day Unbroken Streak',
    description: '7 consecutive days of verified discipline. The dragon now burns with electric fury.',
    category: 'streak',
    icon: 'flame',
    accentColor: '#00D5FF',
  },
  streak_30: {
    id: 'streak_30',
    title: 'MYTHICAL BEAST MASTER',
    subtitle: '30-Day Unbroken Streak',
    description: 'An elite 30-day streak achieved. Consistency has evolved into permanent lifestyle.',
    category: 'streak',
    icon: 'dragon',
    accentColor: '#FF42A6',
  },
  first_pr: {
    id: 'first_pr',
    title: 'NEW PEAK REACHED',
    subtitle: 'First Personal Record',
    description: 'You surpassed your prior boundaries on a compound lift. Pure progressive overload.',
    category: 'pr',
    icon: 'award',
    accentColor: '#38E6A5',
  },
  first_goal: {
    id: 'first_goal',
    title: 'VISION ACHIEVED',
    subtitle: 'Target Reached',
    description: 'You hit your initial body or consistency milestone. Time to set the next horizon.',
    category: 'goal',
    icon: 'target',
    accentColor: '#F59E0B',
  },
};

const UNLOCKED_KEY = 'gymhub_unlocked_milestones_v1';
const CELEBRATED_KEY = 'gymhub_celebrated_milestones_v1';

export function getUnlockedMilestoneIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(UNLOCKED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function getCelebratedMilestoneIds(): string[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem(CELEBRATED_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

export function markMilestoneCelebrated(id: string): void {
  if (typeof window === 'undefined') return;
  try {
    const celebrated = getCelebratedMilestoneIds();
    if (!celebrated.includes(id)) {
      localStorage.setItem(CELEBRATED_KEY, JSON.stringify([...celebrated, id]));
    }
  } catch (err) {
    console.error('Failed to mark milestone celebrated:', err);
  }
}

export interface VerificationContext {
  workoutCount: number;
  streakCount: number;
  hasPrLogged: boolean;
  goalWeightHit: boolean;
}

export function checkNewMilestones(context: VerificationContext): Milestone | null {
  if (typeof window === 'undefined') return null;

  const unlocked = new Set(getUnlockedMilestoneIds());
  const celebrated = new Set(getCelebratedMilestoneIds());

  const newUnlocks: string[] = [];

  // 1. First Workout
  if (context.workoutCount >= 1 && !unlocked.has('first_workout')) {
    newUnlocks.push('first_workout');
  }

  // 2. 7-Day Streak
  if (context.streakCount >= 7 && !unlocked.has('streak_7')) {
    newUnlocks.push('streak_7');
  }

  // 3. 30-Day Streak
  if (context.streakCount >= 30 && !unlocked.has('streak_30')) {
    newUnlocks.push('streak_30');
  }

  // 4. First PR
  if (context.hasPrLogged && !unlocked.has('first_pr')) {
    newUnlocks.push('first_pr');
  }

  // 5. Goal Weight Hit
  if (context.goalWeightHit && !unlocked.has('first_goal')) {
    newUnlocks.push('first_goal');
  }

  // Save any new unlocks
  if (newUnlocks.length > 0) {
    const updated = [...Array.from(unlocked), ...newUnlocks];
    try {
      localStorage.setItem(UNLOCKED_KEY, JSON.stringify(updated));
    } catch {}
  }

  // Pick the first one that hasn't been celebrated yet to display
  for (const id of [...Array.from(unlocked), ...newUnlocks]) {
    if (!celebrated.has(id) && MILESTONES[id]) {
      return MILESTONES[id];
    }
  }

  return null;
}
