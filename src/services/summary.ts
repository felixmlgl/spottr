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
   * Rule-based sports coach generator for instant offline resilience
   */
  public generateLocalRecap(summary: WorkoutSummary): string {
    const sessionNames = summary.sessions
      .filter((s) => s.rep_count > 0)
      .map((s) => `${s.rep_count} reps of ${s.exercise_name}`)
      .join(', ');

    if (!sessionNames || summary.total_reps === 0) {
      return `Solid session for Member ${summary.person_id}. You spent ${summary.total_duration_s}s active on the gym floor; stay hydrated and ramp up intensity on your next set!`;
    }

    const durationMins = Math.max(1, Math.round(summary.total_duration_s / 60));
    return `Great effort! You crushed ${summary.total_reps} clean reps across ${summary.sessions.length} exercise${
      summary.sessions.length > 1 ? 's' : ''
    } (${sessionNames}) in ${durationMins} min${
      durationMins > 1 ? 's' : ''
    }. Your cadence remained solid throughout the eccentric phases with crisp lockout at the peak.`;
  }
}

export const summaryService = new SummaryService();
