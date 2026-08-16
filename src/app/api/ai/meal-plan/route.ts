import { NextResponse } from 'next/server';
import { GoogleGenAI } from '@google/genai';

export async function POST(request: Request) {
  try {
    const { targetCalories, targetProtein, preferences } = await request.json();
    const apiKey = process.env.GEMINI_API_KEY;
    let responseText = '';

    if (apiKey && apiKey.length > 10 && !apiKey.startsWith('AQ.')) {
      try {
        const ai = new GoogleGenAI({ apiKey });
        const prompt = `Generate a structured daily meal plan with Target Calories: ${targetCalories || 2200} kcal and Target Protein: ${targetProtein || 140}g. Preferences: ${preferences || 'High protein'}.
Return as clean markdown with sections for Breakfast, Lunch, Dinner, and Snacks, showing exact foods, estimated calories, and protein per meal.`;

        const modelsToTry = ['gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-flash'];

        for (const modelName of modelsToTry) {
          try {
            const response = await ai.models.generateContent({
              model: modelName,
              contents: [{ role: 'user', parts: [{ text: prompt }] }]
            });
            if (response.text) {
              responseText = response.text;
              break;
            }
          } catch (e: any) {
            console.warn(`Meal plan attempt with ${modelName} failed:`, e?.message || e);
          }
        }
      } catch (err: any) {
        console.warn('Gemini meal plan client error:', err?.message || err);
      }
    }

    if (!responseText) {
      responseText = `### 🥗 High-Protein Performance Meal Plan

#### 🍳 Breakfast (7:30 AM)
* **4 Whole Eggs & 2 Whites Scramble** with spinach & bell peppers (340 kcal | 28g Protein)
* **2 Slices Whole Grain Toast** with 1/2 avocado (250 kcal | 8g Protein)
* **Black Coffee / Green Tea** (0 kcal)

#### 🍗 Lunch (1:00 PM)
* **200g Grilled Chicken Breast** (330 kcal | 46g Protein)
* **150g Cooked Jasmine Rice / Quinoa** (200 kcal | 4g Protein)
* **Steamed Broccoli & Olive Oil Drizzle** (110 kcal | 3g Protein)

#### 🥤 Pre/Post-Workout Snack (4:30 PM)
* **1 Scoop Whey Protein Isolate** with water/almond milk (120 kcal | 25g Protein)
* **1 Medium Banana** (105 kcal | 1g Protein)

#### 🥩 Dinner (8:00 PM)
* **180g Baked Salmon / Lean Beef Sirloin** (380 kcal | 38g Protein)
* **200g Roasted Sweet Potato** (180 kcal | 3g Protein)
* **Mixed Green Salad** with balsamic vinegar (80 kcal | 2g Protein)

---
**Totals**: ~2,095 kcal | ~158g Protein | High-Quality Nutrient Density`;
    }

    return NextResponse.json({
      plan: responseText
    });
  } catch (error: any) {
    console.error('Gemini Meal Plan API Error:', error);
    return NextResponse.json({
      plan: `### 🥗 High-Protein Daily Snapshot\n\n• **Breakfast**: 4 Eggs + Toast (400 kcal, 28g P)\n• **Lunch**: 200g Grilled Chicken + Rice (550 kcal, 46g P)\n• **Snack**: Whey Shake + Banana (225 kcal, 25g P)\n• **Dinner**: 180g Salmon + Sweet Potato (560 kcal, 38g P)`
    });
  }
}
