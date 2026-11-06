import assert from 'node:assert';
import { parseDailyNutritionSummary } from '../src/lib/services/nutritionSummaryService';

console.log('=== RUNNING DAILY NUTRITION SUMMARY PARSER TESTS ===\n');

// 1. Exact user example from prompt
const userExamplePrompt = `
Nutrient | Daily intake | Target / status

Calories | 2,050 kcal | 1,900 kcal

Protein | 88 g | 80–90 g

Carbohydrates | 220 g | Estimated

Total fat | 65 g | Estimated

Dietary fibre | 27 g | Around 25–30 g

Total sugars | 42 g | Includes naturally occurring sugars

Added sugar | 12 g | Keep moderate

Saturated fat | 18 g | Monitor
`;

console.log('Test 1: Testing exact user prompt Markdown table...');
const res1 = parseDailyNutritionSummary(userExamplePrompt);

assert.strictEqual(res1.success, true, 'Parser must succeed');
assert.strictEqual(res1.values.calories_kcal, 2050, 'Calories must be 2050 (NOT 1900 from target column!)');
assert.strictEqual(res1.values.protein_g, 88, 'Protein must be 88 (NOT 80-90 from target column!)');
assert.strictEqual(res1.values.carbohydrates_g, 220, 'Carbs must be 220 (NOT Estimated!)');
assert.strictEqual(res1.values.total_fat_g, 65, 'Fat must be 65 (NOT Estimated!)');
assert.strictEqual(res1.values.fibre_g, 27, 'Fibre must be 27 (NOT 25-30 from target column!)');
assert.strictEqual(res1.values.total_sugars_g, 42, 'Sugars must be 42');
assert.strictEqual(res1.values.added_sugar_g, 12, 'Added sugar must be 12 (NOT Keep moderate!)');
assert.strictEqual(res1.values.saturated_fat_g, 18, 'Saturated fat must be 18 (NOT Monitor!)');
assert.strictEqual(res1.detectedCount, 8, 'All 8 nutrients detected');
console.log('✓ Exact user prompt Markdown table parsed with 100% precision!\n');

// 2. Partial table with unavailable nutrients
console.log('Test 2: Testing partial table with missing/estimated fields...');
const partialInput = `
| Nutrient | Daily intake | Target / status |
|---|---|---|
| Calories | 1,850 kcal | 2,000 kcal |
| Protein | 110.5 g | 100 g |
| Carbohydrates | Estimated | 200 g |
| Dietary Fibre | Not available | 30 g |
`;

const res2 = parseDailyNutritionSummary(partialInput);
assert.strictEqual(res2.success, true);
assert.strictEqual(res2.values.calories_kcal, 1850);
assert.strictEqual(res2.values.protein_g, 110.5);
assert.strictEqual(res2.values.carbohydrates_g, null, 'Estimated must be NULL, not zero');
assert.strictEqual(res2.values.fibre_g, null, 'Not available must be NULL, not zero');
assert.strictEqual(res2.values.total_fat_g, null, 'Omitted nutrient must be NULL');
console.log('✓ Partial table parsed correctly; non-numeric words stay NULL, not 0!\n');

// 3. Bullet list and key-value formats
console.log('Test 3: Testing bullet list & key-value formats...');
const bulletInput = `
- Calories: 2,100 kcal (Target: 1,900 kcal)
* Protein: 95 g
* Carbs: 230 g
* Fat: 70 g
* Fiber: 28 g
`;

const res3 = parseDailyNutritionSummary(bulletInput);
assert.strictEqual(res3.success, true);
assert.strictEqual(res3.values.calories_kcal, 2100);
assert.strictEqual(res3.values.protein_g, 95);
assert.strictEqual(res3.values.carbohydrates_g, 230);
assert.strictEqual(res3.values.total_fat_g, 70);
assert.strictEqual(res3.values.fibre_g, 28);
console.log('✓ Bullet list and aliases parsed successfully!\n');

console.log('=== ALL PARSER TESTS PASSED! ===');
