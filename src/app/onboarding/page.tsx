'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { createClient } from '@/lib/supabase/client';
import { getUserProfile, updateProfile, getOrCreateUserProfile } from '@/lib/services/profileService';
import { setLocalCachedTargets } from '@/lib/services/targetService';
import { OnboardingWizard } from '@/components/onboarding/OnboardingWizard';
import { SignatureLoader } from '@/components/brand/SignatureLoader';
import { SignatureWelcomeExperience } from '@/components/brand/SignatureWelcomeExperience';

export default function OnboardingPage() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [initialName, setInitialName] = useState<string>('');
  const [welcomeData, setWelcomeData] = useState<{ name: string; goal?: string } | null>(null);

  useEffect(() => {
    async function checkAuthAndProfile() {
      try {
        const supabase = createClient();
        const { data: sessionData } = await supabase.auth.getSession();

        if (!sessionData?.session?.user) {
          // Not authenticated -> redirect to login
          router.replace('/login');
          return;
        }

        const user = sessionData.session.user;
        setUserId(user.id);
        const nameFromMeta = user.user_metadata?.full_name || user.user_metadata?.name || '';
        setInitialName(nameFromMeta);

        // Fetch user profile from Supabase
        const profile = await getUserProfile(user.id);

        // Strict Requirement: Never ask again if already completed!
        if (profile && profile.onboarding_completed) {
          router.replace('/');
          return;
        }

        setIsLoading(false);
      } catch (err) {
        console.error('Error in Onboarding checkAuthAndProfile:', err);
        setIsLoading(false);
      }
    }

    checkAuthAndProfile();
  }, [router]);

  const handleOnboardingComplete = async (formData: any) => {
    if (!userId) {
      router.replace('/login');
      return;
    }

    const resolvedName = formData.full_name || initialName || 'Athlete';
    const primaryGoal = formData.fitness_goals?.[0] || formData.fitness_goal || 'muscle_gain';
    const formattedGoal = primaryGoal.replace(/_/g, ' ').toUpperCase();

    try {
      // 1. Ensure profile exists and update it in Supabase
      await getOrCreateUserProfile(userId, resolvedName);
      const updated = await updateProfile(userId, {
        ...formData,
        full_name: resolvedName,
        onboarding_completed: true,
      });

      if (!updated) {
        throw new Error('Unable to save onboarding profile. Please check your connection.');
      }

      // 2. Sync to centralized targets local cache
      setLocalCachedTargets({
        calories: formData.target_calories,
        proteinMin: formData.target_protein_min,
        proteinMax: formData.target_protein_max,
        carbs: formData.target_carbs_g,
        fat: formData.target_fat_g,
        fibreMin: 25,
        fibreMax: 30,
        steps: formData.target_steps,
        weeklyTrainingDays: formData.weekly_training_days,
        goalWeightKg: formData.goal_weight_kg,
      });

      // 3. Mark first-time welcome pending for seamless UX & clear drafts
      if (typeof window !== 'undefined') {
        sessionStorage.setItem('gymhub_first_welcome_active', 'true');
        localStorage.removeItem(`gymhub_onboarding_draft_${userId}`);
        localStorage.removeItem('gymhub_onboarding_draft_v2');
      }

      // 4. Transition into the Signature Futuristic Welcome Experience
      setWelcomeData({
        name: resolvedName,
        goal: formattedGoal,
      });
    } catch (err: any) {
      console.error('Failed to complete onboarding save:', err);
      // Re-throw so wizard can display actionable error rather than looping
      throw err;
    }
  };

  if (isLoading) {
    return (
      <SignatureLoader
        message="CHECKING ONBOARDING STATUS..."
        onTimeoutBypass={() => router.replace('/')}
      />
    );
  }

  // Section 1: Signature Welcome Experience after onboarding completion
  if (welcomeData) {
    return (
      <SignatureWelcomeExperience
        userName={welcomeData.name}
        goalSummary={welcomeData.goal}
        onEnter={() => router.replace('/')}
      />
    );
  }

  return (
    <OnboardingWizard
      userId={userId || undefined}
      initialName={initialName}
      onComplete={handleOnboardingComplete}
    />
  );
}
