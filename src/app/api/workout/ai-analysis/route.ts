import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { WorkoutAnalysis } from '@/lib/types/database';

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const {
      sessionId,
      workoutTitle = 'Workout Session',
      durationSeconds = 3600,
      exercises = [],
      historicalStats,
      userGoal = 'muscle_gain',
    } = body;

    // Filter completed working sets
    let totalCompletedSets = 0;
    let totalReps = 0;
    let currentVolume = 0;
    let rpeSum = 0;
    let rpeCount = 0;
    const exerciseSummaries: { name: string; muscle?: string; topWeight: number; totalVolume: number; setsCount: number }[] = [];

    for (const ex of exercises) {
      let exVol = 0;
      let exTop = 0;
      let exSets = 0;

      for (const st of ex.sets || []) {
        if (st.completed) {
          totalCompletedSets += 1;
          totalReps += Number(st.reps);
          const vol = Number(st.weightKg || 0) * Number(st.reps || 0);
          currentVolume += vol;
          exVol += vol;
          exSets += 1;

          if (Number(st.weightKg) > exTop) {
            exTop = Number(st.weightKg);
          }

          if (st.rpe) {
            rpeSum += Number(st.rpe);
            rpeCount += 1;
          }
        }
      }

      if (exSets > 0) {
        exerciseSummaries.push({
          name: ex.name,
          muscle: ex.muscle,
          topWeight: exTop,
          totalVolume: exVol,
          setsCount: exSets,
        });
      }
    }

    // Check for insufficient data
    if (totalCompletedSets === 0 || currentVolume === 0) {
      return NextResponse.json({
        rating: 0,
        rating_explanation: 'Insufficient data for a reliable rating. No completed working sets were recorded in this session.',
        progress_summary: 'Unable to evaluate progress without verified working sets.',
        improvements: [],
        stagnations: [],
        fatigue_cautions: null,
        next_session_tips: 'Log at least one completed working set with verified weight and repetitions.',
        data_limitations: 'Zero completed sets recorded.',
        model_metadata: 'GYM HUB Evaluation Rubric v2.1',
      });
    }

    // 1. DETERMINISTIC RATING RUBRIC (Score out of 10)
    let score = 5.0; // Baseline
    const avgRpe = rpeCount > 0 ? rpeSum / rpeCount : 8.0;

    // Set volume contribution
    if (totalCompletedSets >= 8) score += 1.8;
    else if (totalCompletedSets >= 5) score += 1.4;
    else score += 0.8;

    // RPE Stimulus optimality (7.5 - 9.0 is hyper-efficient hypertrophy zone)
    if (avgRpe >= 7.5 && avgRpe <= 9.0) score += 1.4;
    else if (avgRpe >= 7.0 && avgRpe <= 9.5) score += 1.0;
    else score += 0.5;

    // Comparable session overload
    const prevVolume = historicalStats?.previousVolume || 0;
    let volumeChangePct: number | null = null;
    if (prevVolume > 0) {
      volumeChangePct = Math.round(((currentVolume - prevVolume) / prevVolume) * 1000) / 10;
      if (volumeChangePct >= 3.0) score += 1.8;
      else if (volumeChangePct >= -3.0) score += 1.2;
      else score += 0.5;
    } else {
      score += 1.2; // New or clean baseline
    }

    const calculatedRating = Math.min(10.0, Math.max(1.0, Math.round(score * 10) / 10));

    // 2. CHECK GEMINI API FOR ADVANCED COACHING FEEDBACK
    const apiKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || process.env.GEMINI_KEY;
    let aiExplanation = '';
    let aiProgress = '';
    let aiImprovements: string[] = [];
    let aiStagnations: string[] = [];
    let aiFatigue: string | null = null;
    let aiNextTips: string | null = null;
    let aiLimitations: string | null = 'Rest intervals, subjective sleep score, and barbell velocity were not measured.';
    let modelMetadata = 'Deterministic Rubric v2.1';

    if (apiKey) {
      try {
        const prompt = `
You are GYM HUB's Senior Sports Performance Scientist.
Evaluate this completed workout session based ONLY on the provided deterministic metrics.

CONSTRAINTS:
- Do NOT equate this rating with actual biological muscle growth.
- Do NOT diagnose injuries or infer medical states.
- Do NOT claim calorie expenditure or body composition changes.
- Distinguish between deterministic metrics and practical recommendations.

WORKOUT DATA:
- Title: ${workoutTitle}
- Duration: ${Math.round(durationSeconds / 60)} minutes
- Total Completed Sets: ${totalCompletedSets}
- Total Reps: ${totalReps}
- Total Training Volume: ${currentVolume} kg
- Average RPE: ${avgRpe.toFixed(1)}
- Volume vs Prior Comparable Session: ${volumeChangePct !== null ? `${volumeChangePct > 0 ? '+' : ''}${volumeChangePct}%` : 'Baseline established'}
- Exercises Performed:
${exerciseSummaries.map((e) => `  * ${e.name} (${e.muscle || 'Compound'}): ${e.setsCount} sets, Top Weight: ${e.topWeight} kg, Volume: ${e.totalVolume} kg`).join('\n')}

DETERMINISTIC RATING: ${calculatedRating}/10

Respond in pure valid JSON without markdown fences matching this exact schema:
{
  "rating_explanation": "Short 1-2 sentence explanation of the ${calculatedRating}/10 rating based on sets, volume and intensity.",
  "progress_summary": "1-2 sentence summary comparing this session with target overload stimulus.",
  "improvements": ["Specific exercise or set that progressed well", "Another positive metric"],
  "stagnations": ["Exercise or set that was static or where stimulus can be optimized"],
  "fatigue_cautions": "Practical fatigue or recovery notice based on RPE and total sets",
  "next_session_tips": "Clear actionable recommendation for the next session",
  "data_limitations": "Missing data elements (e.g. tempo, rest periods)"
}
`;

        const geminiRes = await fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${apiKey}`,
          {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: { responseMimeType: 'application/json', temperature: 0.2 },
            }),
          }
        );

        if (geminiRes.ok) {
          const geminiData = await geminiRes.json();
          const candidateText = geminiData.candidates?.[0]?.content?.parts?.[0]?.text;
          if (candidateText) {
            const parsed = JSON.parse(candidateText);
            aiExplanation = parsed.rating_explanation;
            aiProgress = parsed.progress_summary;
            aiImprovements = parsed.improvements || [];
            aiStagnations = parsed.stagnations || [];
            aiFatigue = parsed.fatigue_cautions || null;
            aiNextTips = parsed.next_session_tips || null;
            aiLimitations = parsed.data_limitations || aiLimitations;
            modelMetadata = 'Gemini 1.5 Flash + Deterministic Rubric v2.1';
          }
        }
      } catch (err) {
        console.warn('Gemini API call failed, falling back to deterministic generation:', err);
      }
    }

    // Fallback deterministic synthesis if AI was unavailable or skipped
    if (!aiExplanation) {
      aiExplanation = `Achieved a ${calculatedRating}/10 rating with ${totalCompletedSets} completed working sets across ${exerciseSummaries.length} exercises, yielding a solid total stimulus of ${currentVolume.toLocaleString()} kg.`;
      aiProgress = volumeChangePct !== null
        ? `Session training volume shifted ${volumeChangePct > 0 ? `+${volumeChangePct}%` : `${volumeChangePct}%`} relative to your previous comparable baseline.`
        : `Established a solid ${currentVolume.toLocaleString()} kg volume baseline for this routine.`;

      aiImprovements = exerciseSummaries.slice(0, 2).map(
        (e) => `Maintained disciplined intensity on ${e.name} with top load of ${e.topWeight} kg across ${e.setsCount} working sets.`
      );

      aiStagnations = exerciseSummaries.length > 2
        ? [`Accessory work on ${exerciseSummaries[exerciseSummaries.length - 1].name} completed at maintenance load.`]
        : ['Volume threshold was conservative; an extra set on primary movements can accelerate stimulus.'];

      aiFatigue = avgRpe >= 8.8
        ? 'Average RPE reached ≥ 8.8. Ensure adequate hydration and 48 hours recovery before retraining these muscle groups.'
        : 'Intensity remained well within recoverable bounds (RPE ~8.0).';

      aiNextTips = `Aim for +1 rep on your top sets or a +2.5% load increment on ${exerciseSummaries[0]?.name || 'primary compound movements'}.`;
    }

    // 3. PERSIST ANALYSIS TO SUPABASE IF USER AUTHENTICATED
    let savedAnalysisId = sessionId ? `analysis-${sessionId}` : `analysis-${Date.now()}`;
    try {
      const supabase = await createClient();
      const { data: { user } } = await supabase.auth.getUser();

      if (user && sessionId) {
        const { data: inserted, error: insertError } = await supabase
          .from('workout_analyses')
          .insert({
            user_id: user.id,
            session_id: sessionId,
            rating: calculatedRating,
            rating_explanation: aiExplanation,
            progress_summary: aiProgress,
            improvements: aiImprovements,
            stagnations: aiStagnations,
            fatigue_cautions: aiFatigue,
            next_session_tips: aiNextTips,
            data_limitations: aiLimitations,
            model_metadata: modelMetadata,
          })
          .select('id')
          .single();

        if (!insertError && inserted) {
          savedAnalysisId = inserted.id;
        }
      }
    } catch (dbErr) {
      console.warn('Could not save analysis to Supabase (guest or offline):', dbErr);
    }

    const result: WorkoutAnalysis = {
      id: savedAnalysisId,
      user_id: 'authenticated-user',
      session_id: sessionId || `sess-${Date.now()}`,
      rating: calculatedRating,
      rating_explanation: aiExplanation,
      progress_summary: aiProgress,
      improvements: aiImprovements,
      stagnations: aiStagnations,
      fatigue_cautions: aiFatigue,
      next_session_tips: aiNextTips,
      data_limitations: aiLimitations,
      model_metadata: modelMetadata,
      created_at: new Date().toISOString(),
    };

    return NextResponse.json(result);
  } catch (err: any) {
    console.error('Error in AI workout analysis endpoint:', err);
    return NextResponse.json(
      { error: 'Failed to generate workout analysis', details: err.message },
      { status: 500 }
    );
  }
}
