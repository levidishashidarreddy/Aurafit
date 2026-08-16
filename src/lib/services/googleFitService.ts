export interface HealthMetrics {
  steps: number;
  targetSteps: number;
  activeCalories: number;
  distanceKm: number;
  heartRateBpm: number;
  isSynced: boolean;
  lastSyncedAt?: string;
  source?: 'google_fit' | 'simulated';
}

/**
 * Calculates start of today (00:00:00) in milliseconds UTC/local
 */
export function getTodayStartAndEndMs() {
  const now = new Date();
  const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0, 0);
  return {
    startTimeMillis: startOfDay.getTime(),
    endTimeMillis: now.getTime(),
  };
}

/**
 * Fetches fitness metrics from Google Fitness REST API using an access token
 */
export async function fetchGoogleFitMetrics(accessToken: string): Promise<HealthMetrics> {
  const { startTimeMillis, endTimeMillis } = getTodayStartAndEndMs();

  const requestBody = {
    aggregateBy: [
      { dataTypeName: 'com.google.step_count.delta' },
      { dataTypeName: 'com.google.calories.expended' },
      { dataTypeName: 'com.google.distance.delta' },
      { dataTypeName: 'com.google.heart_rate.bpm' },
    ],
    bucketByTime: { durationMillis: endTimeMillis - startTimeMillis || 86400000 },
    startTimeMillis,
    endTimeMillis,
  };

  const response = await fetch('https://www.googleapis.com/fitness/v1/users/me/dataset:aggregate', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(requestBody),
  });

  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Google Fit API request failed (${response.status}): ${errText}`);
  }

  const data = await response.json();
  return parseGoogleFitResponse(data);
}

/**
 * Parses Google Fitness REST API response into HealthMetrics
 */
export function parseGoogleFitResponse(data: any): HealthMetrics {
  let steps = 0;
  let activeCalories = 0;
  let distanceMeters = 0;
  let heartRateSum = 0;
  let heartRateCount = 0;

  if (data?.bucket && Array.isArray(data.bucket)) {
    for (const bucket of data.bucket) {
      if (bucket.dataset && Array.isArray(bucket.dataset)) {
        for (const dataset of bucket.dataset) {
          const dataTypeName = dataset.dataTypeName;
          if (dataset.point && Array.isArray(dataset.point)) {
            for (const point of dataset.point) {
              if (point.value && Array.isArray(point.value)) {
                for (const val of point.value) {
                  if (dataTypeName === 'com.google.step_count.delta' && val.intVal) {
                    steps += val.intVal;
                  } else if (dataTypeName === 'com.google.calories.expended' && (val.fpVal || val.intVal)) {
                    activeCalories += val.fpVal || val.intVal || 0;
                  } else if (dataTypeName === 'com.google.distance.delta' && (val.fpVal || val.intVal)) {
                    distanceMeters += val.fpVal || val.intVal || 0;
                  } else if (dataTypeName === 'com.google.heart_rate.bpm' && val.fpVal) {
                    heartRateSum += val.fpVal;
                    heartRateCount++;
                  }
                }
              }
            }
          }
        }
      }
    }
  }

  const distanceKm = Number((distanceMeters / 1000).toFixed(2));
  const avgHeartRate = heartRateCount > 0 ? Math.round(heartRateSum / heartRateCount) : 72;

  return {
    steps: Math.max(steps, 0),
    targetSteps: 10000,
    activeCalories: Math.round(activeCalories),
    distanceKm,
    heartRateBpm: avgHeartRate,
    isSynced: true,
    lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    source: 'google_fit',
  };
}

/**
 * Returns simulated realistic health data for testing/demo
 */
export function getSimulatedHealthData(existingSteps?: number): HealthMetrics {
  const baseSteps = existingSteps || 8420;
  // Add slight random increment to simulate real movement
  const newSteps = baseSteps + Math.floor(Math.random() * 150) + 25;
  const distance = Number((newSteps * 0.00078).toFixed(2));
  const cals = Math.round(newSteps * 0.045);

  return {
    steps: newSteps,
    targetSteps: 10000,
    activeCalories: cals,
    distanceKm: distance,
    heartRateBpm: 72 + Math.floor(Math.random() * 8),
    isSynced: true,
    lastSyncedAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    source: 'simulated',
  };
}
