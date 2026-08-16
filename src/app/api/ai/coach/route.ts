import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: Request) {
  try {
    const { prompt, context } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;

    const lowerPrompt = (prompt || '').toLowerCase();
    const name = context?.fullName || 'Alex';
    const consumedProtein = context?.consumedProtein || 118;
    const targetProtein = context?.targetProtein || 140;
    const remainingProtein = Math.max(0, targetProtein - consumedProtein);
    const consumedCals = context?.consumedCalories || 1850;
    const targetCals = context?.targetCalories || 2200;

    let responseText = '';

    if (apiKey && apiKey.length > 10 && !apiKey.startsWith('AQ.')) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const systemPrompt = `You are an expert elite personal fitness coach, sports nutritionist, and workout strategist.
The user's current profile context:
- Name: ${name}
- Goal: ${context?.goal || 'Muscle Gain'}
- Body Weight: ${context?.weightKg || 72} kg
- Daily Calories: ${consumedCals} / ${targetCals} kcal
- Daily Protein: ${consumedProtein} / ${targetProtein} g
- Today's Workout: ${context?.todayWorkoutStatus || 'Push Day'}
- Streak: ${context?.streakDays || 12} days

Provide concise, highly actionable, science-based, friendly guidance using clean markdown bullet points and short paragraphs.`;

        const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

        for (const modelName of modelsToTry) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: [
                { role: 'user', parts: [{ text: `${systemPrompt}\n\nUser Question: ${prompt}` }] }
              ]
            });
            if (response.text) {
              responseText = response.text;
              break;
            }
          } catch (e: any) {
            console.warn(`Gemini model ${modelName} call error:`, e?.message || e);
          }
        }
      } catch (err: any) {
        console.warn('Gemini client error:', err?.message || err);
      }
    }

    // Smart context-aware fallback if Gemini API is unavailable or returns empty text
    if (!responseText) {
      if (lowerPrompt.includes('protein')) {
        responseText = `Hey ${name}! You are currently at **${consumedProtein}g** of protein out of your **${targetProtein}g** daily target (${Math.round((consumedProtein / targetProtein) * 100)}% complete).\n\n` +
                       `**Next Steps to Hit Your Goal:**\n` +
                       `• You need **${remainingProtein}g** more protein today.\n` +
                       `• **Quick High-Protein Options**:\n` +
                       `  - 1 Scoop Whey Protein Isolate (~25g protein)\n` +
                       `  - 200g Greek Yogurt or Cottage Cheese (~18-20g protein)\n` +
                       `  - 120g Grilled Chicken Breast or Lean Beef (~30g protein)`;
      } else if (lowerPrompt.includes('chest') || lowerPrompt.includes('tricep') || lowerPrompt.includes('routine') || lowerPrompt.includes('workout')) {
        responseText = `Here is an elite **Hypertrophy Chest & Triceps Routine** tailored for your Muscle Gain goal:\n\n` +
                       `1. **Incline Dumbbell Press**: 4 sets x 8-10 reps (Focus on upper chest stretch)\n` +
                       `2. **Flat Barbell Bench Press**: 3 sets x 6-8 reps (Heavy mechanical tension)\n` +
                       `3. **Low-to-High Cable Flyes**: 3 sets x 12-15 reps (Peak contraction at center)\n` +
                       `4. **Bodyweight Dips or Overhead Cable Extension**: 3 sets x 10-12 reps (Long head tricep focus)\n` +
                       `5. **Rope Tricep Pushdowns**: 3 sets x 12-15 reps (Lateral & medial head burn out)`;
      } else {
        responseText = `Hey ${name}! Based on today's snapshot:\n\n` +
                       `• **Calories**: You've logged **${consumedCals} / ${targetCals} kcal** (${Math.round((consumedCals / targetCals) * 100)}%).\n` +
                       `• **Protein**: You are at **${consumedProtein} / ${targetProtein} g**.\n` +
                       `• **Coach Tip**: Keep progressive overload high on compound lifts today and ensure you hit your remaining ${remainingProtein}g of protein before bed to maximize muscle protein synthesis!`;
      }
    }

    return NextResponse.json({ reply: responseText });
  } catch (error: any) {
    console.error('AI Coach Route Error:', error);
    return NextResponse.json({
      reply: `AI Assistant Notice: ${error.message || 'Unable to complete request'}`
    });
  }
}
