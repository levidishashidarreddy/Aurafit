export interface UserContext {
  fullName?: string;
  goal?: string;
  weightKg?: number;
  targetCalories?: number;
  consumedCalories?: number;
  targetProtein?: number;
  consumedProtein?: number;
  todayWorkoutStatus?: string;
  streakDays?: number;
}

export async function askAICoach(prompt: string, context: UserContext): Promise<string> {
  try {
    const response = await fetch('/api/ai/coach', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, context }),
    });

    if (!response.ok) {
      const err = await response.json().catch(() => ({}));
      return err.reply || `API Error (${response.status}): Unable to connect to AI Coach service.`;
    }

    const data = await response.json();
    return data.reply || 'I apologize, I could not generate a response at this moment.';
  } catch (error: any) {
    console.error('AI Coach client error:', error);
    return `AI Assistant Error: ${error.message || 'Unable to connect to AI Coach service.'}`;
  }
}

export async function generateAIMealPlan(targetCalories: number, targetProtein: number, preferences: string = 'High protein'): Promise<string> {
  try {
    const response = await fetch('/api/ai/meal-plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetCalories, targetProtein, preferences }),
    });

    if (!response.ok) {
      return 'Unable to generate meal plan at this time.';
    }

    const data = await response.json();
    return data.plan || 'Unable to generate meal plan.';
  } catch (error: any) {
    console.error('AI Meal Plan client error:', error);
    return `Error generating meal plan: ${error.message}`;
  }
}
