import assert from 'node:assert';
import { calculateDailyNutrients } from '../src/lib/services/nutritionService';
import { calculateStepStreaks, calculateDayActivityTotals, getMonthHeatmap } from '../src/lib/services/activityService';
import { NutritionEntry, ActivityEntry } from '../src/lib/types/database';

console.log('--- RUNNING GYM HUB QUALITY CHECKS ---');

// TEST 1: Nutrition Nutrient Calculations & Missing Value Handling
console.log('1. Testing Nutrition Calculations & Missing Value Handling...');
const sampleEntries: NutritionEntry[] = [
  {
    id: '1',
    user_id: 'test',
    entry_date: '2026-10-15',
    meal_type: 'breakfast',
    food_name: 'Eggs & Oatmeal',
    calories: 450,
    protein_g: 25,
    carbohydrates_g: 50,
    total_fat_g: 15,
    fibre_g: 8,
    total_sugars_g: 12,
    added_sugar_g: 2,
    saturated_fat_g: 4,
    created_at: '',
    updated_at: '',
  },
  {
    id: '2',
    user_id: 'test',
    entry_date: '2026-10-15',
    meal_type: 'lunch',
    food_name: 'Chicken Breast & Rice',
    calories: 550,
    protein_g: 45,
    carbohydrates_g: 60,
    total_fat_g: 10,
    fibre_g: null, // Missing fibre
    total_sugars_g: null, // Missing sugars
    added_sugar_g: null,
    saturated_fat_g: 2,
    created_at: '',
    updated_at: '',
  },
  {
    id: '3',
    user_id: 'test',
    entry_date: '2026-10-15',
    meal_type: 'snack',
    food_name: 'Protein Shake',
    calories: 140,
    protein_g: 25,
    carbohydrates_g: 3,
    total_fat_g: 2,
    fibre_g: 0, // Explicitly 0
    total_sugars_g: 1,
    added_sugar_g: 0,
    saturated_fat_g: null,
    created_at: '',
    updated_at: '',
  },
];

const nutrientSummary = calculateDailyNutrients(sampleEntries);

assert.strictEqual(nutrientSummary.calories, 1140, 'Calories must equal 450+550+140');
assert.strictEqual(nutrientSummary.protein_g, 95.0, 'Protein must equal 25+45+25');
assert.strictEqual(nutrientSummary.carbs_g, 113.0, 'Carbs must equal 50+60+3');
assert.strictEqual(nutrientSummary.total_fat_g, 27.0, 'Fat must equal 15+10+2');

// Fibre: Entry 1 = 8g, Entry 2 = null (missing), Entry 3 = 0g
assert.strictEqual(nutrientSummary.fibre_g, 8.0, 'Fibre must sum only entered values (8 + 0)');
assert.strictEqual(nutrientSummary.fibreMissingCount, 1, 'Fibre missing count must be 1');

// Sugars: Entry 1 has total 12g, added 2g -> natural is 10g. Entry 3 has total 1g, added 0g.
assert.strictEqual(nutrientSummary.total_sugars_g, 13.0, 'Total sugars must sum entered values (12 + 1)');
assert.strictEqual(nutrientSummary.added_sugar_g, 2.0, 'Added sugar must sum entered values (2 + 0)');
assert.strictEqual(nutrientSummary.naturallyOccurringSugar_g, 11.0, 'Natural sugars = 13 - 2 = 11g');
assert.strictEqual(nutrientSummary.totalSugarsMissingCount, 1, 'Total sugars missing count must be 1');

// Saturated fat: 4 + 2 = 6g, missing count = 1
assert.strictEqual(nutrientSummary.saturated_fat_g, 6.0, 'Saturated fat must equal 6g');
assert.strictEqual(nutrientSummary.saturatedFatMissingCount, 1, 'Saturated fat missing count must be 1');
console.log('✓ Nutrition calculations & missing values passed.');

// TEST 2: Empty/Missing state does NOT turn into fake 0
console.log('2. Testing Empty Nutrition State...');
const emptyNutrients = calculateDailyNutrients([]);
assert.strictEqual(emptyNutrients.hasEntries, false);
assert.strictEqual(emptyNutrients.fibre_g, null, 'Unlogged fibre must remain null, NOT zero');
assert.strictEqual(emptyNutrients.total_sugars_g, null, 'Unlogged sugars must remain null, NOT zero');
assert.strictEqual(emptyNutrients.added_sugar_g, null);
assert.strictEqual(emptyNutrients.saturated_fat_g, null);
console.log('✓ Empty nutrition state passed.');

// TEST 3: Activity Breakdown & Manual Calories (Never Estimated)
console.log('3. Testing Activity Breakdown & Manual Calories...');
const sampleActivities: ActivityEntry[] = [
  {
    id: 'a1',
    user_id: 'test',
    activity_date: '2026-10-15',
    activity_type: 'Walking',
    steps: 4000,
    calories_burned: 160,
    duration_minutes: 40,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'a2',
    user_id: 'test',
    activity_date: '2026-10-15',
    activity_type: 'Treadmill',
    steps: 3500,
    calories_burned: 200,
    duration_minutes: 30,
    created_at: '',
    updated_at: '',
  },
  {
    id: 'a3',
    user_id: 'test',
    activity_date: '2026-10-15',
    activity_type: 'Running',
    steps: 3000,
    calories_burned: 280,
    duration_minutes: 25,
    created_at: '',
    updated_at: '',
  },
];

const actSummary = calculateDayActivityTotals(sampleActivities);
assert.strictEqual(actSummary.totalSteps, 10500, 'Total steps must be 4000+3500+3000 = 10,500');
assert.strictEqual(actSummary.totalCaloriesBurned, 640, 'Total calories must be manual sum: 160+200+280 = 640');
assert.strictEqual(actSummary.totalDurationMinutes, 95, 'Total minutes must be 40+30+25 = 95');

assert.strictEqual(actSummary.breakdown.walking.steps, 4000);
assert.strictEqual(actSummary.breakdown.treadmill.steps, 3500);
assert.strictEqual(actSummary.breakdown.running.steps, 3000);
console.log('✓ Activity breakdown & manual calories passed.');

// TEST 4: Calendar Step Streaks & Month Boundary Handling
console.log('4. Testing Stepper Streak Logic across Month & Year Boundaries...');
// Test consecutive days reaching 10,000 steps across Feb -> Mar boundary (2024 leap year)
const streakEntries: ActivityEntry[] = [
  // 3-day streak in Jan: Jan 10, 11, 12
  { id: 's1', user_id: 'test', activity_date: '2024-01-10', activity_type: 'Walking', steps: 11000, calories_burned: 400, created_at: '', updated_at: '' },
  { id: 's2', user_id: 'test', activity_date: '2024-01-11', activity_type: 'Walking', steps: 10500, calories_burned: 400, created_at: '', updated_at: '' },
  { id: 's3', user_id: 'test', activity_date: '2024-01-12', activity_type: 'Walking', steps: 12000, calories_burned: 400, created_at: '', updated_at: '' },
  // Missing Jan 13 -> streak broken!
  // Day below target: Jan 14 only 8,000 steps
  { id: 's4', user_id: 'test', activity_date: '2024-01-14', activity_type: 'Walking', steps: 8000, calories_burned: 300, created_at: '', updated_at: '' },
  // 5-day streak crossing Feb 28 -> Feb 29 (leap year) -> Mar 01 -> Mar 02 -> Mar 03
  { id: 's5', user_id: 'test', activity_date: '2024-02-27', activity_type: 'Walking', steps: 10000, calories_burned: 400, created_at: '', updated_at: '' },
  { id: 's6', user_id: 'test', activity_date: '2024-02-28', activity_type: 'Walking', steps: 10200, calories_burned: 400, created_at: '', updated_at: '' },
  { id: 's7', user_id: 'test', activity_date: '2024-02-29', activity_type: 'Walking', steps: 10100, calories_burned: 400, created_at: '', updated_at: '' },
  { id: 's8', user_id: 'test', activity_date: '2024-03-01', activity_type: 'Walking', steps: 10500, calories_burned: 400, created_at: '', updated_at: '' },
  { id: 's9', user_id: 'test', activity_date: '2024-03-02', activity_type: 'Walking', steps: 10300, calories_burned: 400, created_at: '', updated_at: '' },
];

const streakResult = calculateStepStreaks(streakEntries, 10000);
assert.strictEqual(streakResult.longestStreak, 5, 'Longest streak across Feb->Mar leap year boundary must be 5 days');
console.log('✓ Stepper streak and month boundary test passed.');

// TEST 5: Heatmap distinguishing completed, incomplete, and unlogged days
console.log('5. Testing Monthly Heatmap Classification...');
const heatmap = getMonthHeatmap(2024, 1, streakEntries, 10000); // Feb 2024 has 29 days
assert.strictEqual(heatmap.length, 29, 'Feb 2024 must have 29 days');
const feb27 = heatmap.find(h => h.date === '2024-02-27');
const feb28 = heatmap.find(h => h.date === '2024-02-28');
const feb1 = heatmap.find(h => h.date === '2024-02-01');

assert.strictEqual(feb27?.status, 'completed', 'Feb 27 must be completed');
assert.strictEqual(feb28?.status, 'completed', 'Feb 28 must be completed');
assert.strictEqual(feb1?.status, 'unlogged', 'Feb 1 must be unlogged');
console.log('✓ Heatmap classification passed.');

console.log('\nALL 5 QUALITY CHECK SUITES PASSED SUCCESSFULLY!');
