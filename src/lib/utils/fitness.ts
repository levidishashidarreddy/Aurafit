import { ActivityLevel, FitnessGoal } from '../types/database';

export interface UserStatsInput {
  gender: 'male' | 'female' | 'other';
  age: number;
  height_cm: number;
  weight_kg: number;
  goal_weight_kg?: number;
  fitness_goal: FitnessGoal;
  activity_level: ActivityLevel;
}

export interface CalculatedTargets {
  bmr: number;
  tdee: number;
  target_calories: number;
  target_protein_g: number;
  target_carbs_g: number;
  target_fat_g: number;
  target_fibre_g: number;
  target_steps: number;
  target_water_ml: number;
}

export function calculateFitnessTargets(input: UserStatsInput): CalculatedTargets {
  const { gender, age, height_cm, weight_kg, fitness_goal, activity_level } = input;

  // Mifflin-St Jeor Equation
  let bmr = 10 * weight_kg + 6.25 * height_cm - 5 * age;
  if (gender === 'female') {
    bmr -= 161;
  } else {
    bmr += 5; // Default/Male
  }

  // TDEE Activity Multipliers
  const activityMultipliers: Record<ActivityLevel, number> = {
    sedentary: 1.2,
    lightly_active: 1.375,
    moderately_active: 1.55,
    very_active: 1.725,
    extra_active: 1.9,
  };

  const tdee = Math.round(bmr * (activityMultipliers[activity_level] || 1.55));

  // Calorie Target based on Goal
  let target_calories = tdee;
  if (fitness_goal === 'fat_loss') {
    target_calories = Math.round(tdee - 500);
  } else if (fitness_goal === 'muscle_gain') {
    target_calories = Math.round(tdee + 300);
  } else if (fitness_goal === 'recomposition') {
    target_calories = Math.round(tdee - 200);
  }

  // Protein Target (2.0 - 2.2g per kg body weight)
  const proteinMultiplier = fitness_goal === 'muscle_gain' ? 2.2 : 2.0;
  const target_protein_g = Math.round(weight_kg * proteinMultiplier);
  const proteinCalories = target_protein_g * 4;

  // Fat Target (25% of total calories)
  const fatCalories = target_calories * 0.25;
  const target_fat_g = Math.round(fatCalories / 9);

  // Carb Target (Remaining calories)
  const carbCalories = Math.max(0, target_calories - proteinCalories - fatCalories);
  const target_carbs_g = Math.round(carbCalories / 4);

  // Water target (35ml per kg body weight)
  const target_water_ml = Math.max(2500, Math.round(weight_kg * 35));

  return {
    bmr: Math.round(bmr),
    tdee,
    target_calories,
    target_protein_g,
    target_carbs_g,
    target_fat_g,
    target_fibre_g: 28,
    target_steps: 10000,
    target_water_ml,
  };
}

export function calculateBMI(weightKg: number, heightCm: number): { bmi: number; category: string } {
  if (heightCm <= 0 || weightKg <= 0) return { bmi: 0, category: 'Unknown' };
  const heightM = heightCm / 100;
  const bmi = Number((weightKg / (heightM * heightM)).toFixed(1));
  let category = 'Normal';
  if (bmi < 18.5) category = 'Underweight';
  else if (bmi < 25) category = 'Normal weight';
  else if (bmi < 30) category = 'Overweight';
  else category = 'Obese';
  return { bmi, category };
}

export interface PlateResult {
  plateWeightKg: number;
  countPerSide: number;
}

export function calculatePlates(targetWeightKg: number, barWeightKg: number = 20): {
  perSideWeight: number;
  plates: PlateResult[];
  remainderKg: number;
} {
  if (targetWeightKg <= barWeightKg) {
    return { perSideWeight: 0, plates: [], remainderKg: 0 };
  }

  const perSideWeight = (targetWeightKg - barWeightKg) / 2;
  let remaining = perSideWeight;
  const availablePlates = [25, 20, 15, 10, 5, 2.5, 1.25];
  const plates: PlateResult[] = [];

  for (const plate of availablePlates) {
    if (remaining >= plate) {
      const count = Math.floor(remaining / plate);
      plates.push({ plateWeightKg: plate, countPerSide: count });
      remaining = parseFloat((remaining - count * plate).toFixed(2));
    }
  }

  return {
    perSideWeight,
    plates,
    remainderKg: remaining,
  };
}
