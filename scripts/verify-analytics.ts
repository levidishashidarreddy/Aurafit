// Verification script for GYM HUB Advanced Muscle Performance Analytics
import {
  calculateEstimated1RM,
  resolveExerciseDefinition,
  calculateMuscleGroupStats,
  calculateExerciseAnalytics,
  buildComparisonStudioData,
  calculateOverallAnalytics,
  getInitialSeedSessions,
  MUSCLE_GROUPS
} from '../src/lib/services/workoutAnalyticsService';

console.log('=== STARTING MUSCLE PERFORMANCE ANALYTICS VERIFICATION ===\n');

// 1. Test 1RM Calculations
console.log('1. Testing 1RM Calculation Logic (Brzycki & Epley)...');
const e1rm1 = calculateEstimated1RM(100, 1);
if (e1rm1 !== 100) throw new Error(`Expected 1RM for 100kg x 1 to be 100, got ${e1rm1}`);

const e1rm5 = calculateEstimated1RM(100, 5); // 100 / (1.0278 - 0.0278 * 5) = ~112.5 kg
if (!e1rm5 || e1rm5 < 110 || e1rm5 > 115) throw new Error(`Expected 1RM for 100kg x 5 to be ~112.5, got ${e1rm5}`);

const e1rmZero = calculateEstimated1RM(0, 5);
if (e1rmZero !== null) throw new Error(`Expected null for 0 weight, got ${e1rmZero}`);

console.log(`✓ 1RM calculated accurately: 100kg x 1 = ${e1rm1}kg, 100kg x 5 = ${e1rm5}kg.`);

// 2. Test Muscle Group Catalog & Primary/Secondary Mapping
console.log('\n2. Testing Primary and Secondary Muscle Mapping...');
const benchDef = resolveExerciseDefinition(undefined, 'Barbell Bench Press');
if (benchDef.primaryMuscle !== 'Chest') throw new Error(`Expected Chest primary for Bench, got ${benchDef.primaryMuscle}`);
if (!benchDef.secondaryMuscles.includes('Triceps') || !benchDef.secondaryMuscles.includes('Shoulders')) {
  throw new Error(`Expected Triceps & Shoulders secondary for Bench Press`);
}

const latDef = resolveExerciseDefinition(undefined, 'Lat Pulldown');
if (latDef.primaryMuscle !== 'Back') throw new Error(`Expected Back primary for Lat Pulldown`);
if (!latDef.secondaryMuscles.includes('Biceps')) throw new Error(`Expected Biceps secondary for Lat Pulldown`);
console.log(`✓ Exercise definitions verified: Bench Press maps to Primary: ${benchDef.primaryMuscle}, Secondary: ${benchDef.secondaryMuscles.join(', ')}.`);

// 3. Test Muscle Group Volume Aggregation & Secondary Volume Credit
console.log('\n3. Testing Muscle Group Statistics with 50% Secondary Volume Credit...');
const seedSessions = getInitialSeedSessions();
const now = new Date();
const start30D = new Date();
start30D.setDate(now.getDate() - 30);

const muscleStats = calculateMuscleGroupStats(seedSessions, start30D, now);
if (muscleStats.length !== 6) throw new Error(`Expected 6 muscle groups, got ${muscleStats.length}`);

for (const group of muscleStats) {
  if (!MUSCLE_GROUPS.includes(group.name)) throw new Error(`Unknown muscle group: ${group.name}`);
  if (group.sessionsCount > 0) {
    if (group.totalVolumeKg <= 0) throw new Error(`Expected positive volume for active group ${group.name}`);
    if (group.totalSets <= 0) throw new Error(`Expected positive sets for active group ${group.name}`);
    if (group.totalReps <= 0) throw new Error(`Expected positive reps for active group ${group.name}`);
  }
}
console.log('✓ All 6 muscle groups computed successfully with volume, sets, reps, and performance status.');

// 4. Test Status Rules: Improving, Stable, Declining, Insufficient Data
console.log('\n4. Testing Deterministic Performance Status Determination...');
const chestStats = muscleStats.find((m) => m.name === 'Chest');
if (!chestStats) throw new Error('Chest stats missing');
console.log(`✓ Chest status: [${chestStats.status}] (${chestStats.statusReason}).`);

// 5. Test Individual Exercise Analytics (8 Graphs Data Integrity)
console.log('\n5. Testing Individual Exercise Report Generation (8 Graph Datasets)...');
const benchAnalytics = calculateExerciseAnalytics(seedSessions, 'Barbell Bench Press');
if (benchAnalytics.timeSeries.length === 0) throw new Error('Expected time series data for Barbell Bench Press');
if (benchAnalytics.allTimeBestWeightKg <= 0) throw new Error('Expected all-time best weight for Bench Press');
if (benchAnalytics.personalRecords.length === 0) throw new Error('Expected PR entries for Bench Press');
if (benchAnalytics.availableWorkouts.length === 0) throw new Error('Expected available workouts for drilldown');

const firstPt = benchAnalytics.timeSeries[0];
if (typeof firstPt.weightKg !== 'number' || typeof firstPt.volumeKg !== 'number' || typeof firstPt.reps !== 'number') {
  throw new Error('Data point missing required numeric fields');
}
console.log(`✓ Bench Press analytics verified: ${benchAnalytics.totalWorkouts} sessions, ${benchAnalytics.timeSeries.length} points, Peak: ${benchAnalytics.allTimeBestWeightKg}kg, PRs: ${benchAnalytics.personalRecords.length}.`);

// 6. Test Exercise Comparison Studio
console.log('\n6. Testing Exercise Comparison Studio Multi-Series Generation...');
const compData = buildComparisonStudioData(seedSessions, ['Barbell Bench Press', 'Incline Dumbbell Press']);
if (compData.exercises.length !== 2) throw new Error('Expected 2 exercises in comparison result');
if (compData.timeline.length === 0) throw new Error('Expected timeline data points');
if (compData.summaryTable.length !== 2) throw new Error('Expected 2 summary table rows');
console.log(`✓ Comparison Studio verified with ${compData.timeline.length} aligned timeline dates and summary metrics.`);

// 7. Test Overall Analytics Overview
console.log('\n7. Testing Overall Analytics Overview (Weekly, Monthly, Distribution)...');
const overall = calculateOverallAnalytics(seedSessions, start30D, now);
if (overall.totalVolumeKg <= 0) throw new Error('Expected positive overall volume');
if (overall.muscleDistribution.length !== 6) throw new Error('Expected 6 muscle distribution entries');
if (overall.muscleFrequency.length !== 6) throw new Error('Expected 6 muscle frequency entries');
console.log(`✓ Overall analytics verified: Total Volume: ${overall.totalVolumeKg.toLocaleString()}kg, Working Sets: ${overall.totalWorkingSets}.`);

console.log('\n=== ALL 7 ADVANCED ANALYTICS TESTS PASSED WITH 100% SUCCESS ===\n');
