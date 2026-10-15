/**
 * Summary Service
 * Workout recaps for the member app (via server-side Gemini or a local fallback).
 */

import { WorkoutSummary } from '../types/schema';

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
    const sessionNames = summary.sessions
      .filter((s) => s.rep_count > 0)
      .map((s) => `${s.rep_count} reps of ${s.exercise_name}`)
      .join(', ');

    if (!sessionNames || summary.total_reps === 0) {
      return `No sets counted for Member ${summary.person_id} in this clip. You were on the gym floor for ${summary.total_duration_s}s.`;
    }

    const durationMins = Math.max(1, Math.round(summary.total_duration_s / 60));
    return `Nice work! ${summary.total_reps} reps across ${summary.sessions.length} set${
      summary.sessions.length > 1 ? 's' : ''
    } (${sessionNames}) in ${durationMins} min. Every rep was counted by the gym camera, so there was nothing to log.`;
  }
}

export const summaryService = new SummaryService();
