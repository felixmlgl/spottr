/**
 * Summary Service
 * Workout recaps for the member app (via server-side Gemini or a local fallback).
 */

import { WorkoutSummary } from '../types/schema';
import { joinList } from './nextSession';

export class SummaryService {
  /**
   * Generates a 2-3 sentence personalized coach recap.
   * Calls server-side Gemini API (/api/recap) or falls back to smart local sports coach.
   */
  public async generateRecap(summary: WorkoutSummary): Promise<string> {
    try {
      const response = await fetch('/api/recap', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ summary }),
      });

      if (response.ok) {
        const data = await response.json();
        if (data.recap && typeof data.recap === 'string' && data.recap.trim().length > 0) {
          return data.recap.trim();
        }
      }
    } catch {
      // Backend not reached or offline; fall through to rule-based coach recap
    }

    // High quality intelligent coach recap fallback
    return this.generateLocalRecap(summary);
  }

  /**
   * Rule-based recap when Gemini isn't available. Only states what was counted (exercises, reps, time),
   * never form or technique: nothing in the pipeline measures those.
   */
  public generateLocalRecap(summary: WorkoutSummary): string {
    const repsByExercise = new Map<string, number[]>();
    for (const s of summary.sessions) {
      if (s.rep_count > 0) repsByExercise.set(s.exercise_name, [...(repsByExercise.get(s.exercise_name) ?? []), s.rep_count]);
    }

    if (!repsByExercise.size || summary.total_reps === 0) {
      return `No sets counted for Member ${summary.person_id} in this clip. You were on the gym floor for ${summary.total_duration_s}s.`;
    }

    // e.g. "Squat: 2 sets of 5 and 6 reps."
    return `${[...repsByExercise]
      .map(([name, reps]) => `${name}: ${reps.length} set${reps.length > 1 ? 's' : ''} of ${joinList(reps.map(String))} reps`)
      .join('. ')}.`;
  }
}

export const summaryService = new SummaryService();
