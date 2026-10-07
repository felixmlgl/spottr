/**
 * The member's editable training plan (Plan tab → "My plan"). Frontend-only for now; persisted via
 * services/planStorage.ts so it can later be swapped for an API.
 *
 * Days have no weekday: the plan is a rotation (e.g. Push → Pull → Legs → Push …), and the next session is the day
 * after the last one the member completed.
 */

export interface PlanExercise {
  id: string;
  /** Pipeline exercise label, e.g. "bench_press" (see data/planExercises.ts) */
  exerciseKey: string;
  targetSets: number;
  targetRepsMin: number;
  targetRepsMax: number;
}

export interface PlanDay {
  id: string;
  /** e.g. "Push" */
  name: string;
  exercises: PlanExercise[];
}

export interface Plan {
  id: string;
  name: string;
  days: PlanDay[];
}
