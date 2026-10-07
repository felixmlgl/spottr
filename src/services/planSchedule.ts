/**
 * Where the member is in their plan: which plan day a logged workout was, which day comes next, and which day fits
 * best given recovery.
 */

import { MuscleId, PastWorkout } from '../types/schema';
import { Plan, PlanDay } from '../types/plan';
import { getExerciseMuscleMapping } from '../data/exerciseMuscles';
import { MuscleGroup, planExerciseInfo, toPlanExerciseKey } from '../data/planExercises';
import { RecoveryCalculationResult } from './recovery';

/** Main muscles a plan day trains */
export function dayMuscles(day: PlanDay): MuscleId[] {
  return [...new Set(day.exercises.flatMap((e) => planExerciseInfo(e.exerciseKey).primary))];
}

/** Muscle groups of a day in plan order, e.g. ["Chest", "Shoulders", "Arms"] */
export function dayGroups(day: PlanDay): MuscleGroup[] {
  return [...new Set(day.exercises.map((e) => planExerciseInfo(e.exerciseKey).group))];
}

/** Main muscles of a logged exercise (pipeline or library id) */
const loggedMuscles = (exerciseId: string): MuscleId[] => {
  const key = toPlanExerciseKey(exerciseId);
  return key ? planExerciseInfo(key).primary : getExerciseMuscleMapping(exerciseId.replace(/[_\s]+/g, '-')).primary;
};

/**
 * How well a logged workout matches a plan day: shared exercises count most, then shared main muscles.
 * 0 means nothing in common.
 */
function matchScore(day: PlanDay, workout: PastWorkout): number {
  const dayKeys = new Set(day.exercises.map((e) => e.exerciseKey));
  const sameExercises = workout.exercises.filter((ex) => {
    const key = toPlanExerciseKey(ex.exercise_id);
    return key !== null && dayKeys.has(key);
  }).length;

  const planned = new Set(dayMuscles(day));
  const trained = new Set(workout.exercises.flatMap((ex) => loggedMuscles(ex.exercise_id)));
  const shared = [...trained].filter((m) => planned.has(m)).length;
  const union = new Set([...planned, ...trained]).size;

  return sameExercises * 2 + (union ? shared / union : 0);
}

/** The plan day a workout was, or null if it doesn't resemble any day. Ties go to the earlier day. */
export function matchWorkoutToDay(plan: Plan, workout: PastWorkout): PlanDay | null {
  let best: PlanDay | null = null;
  let bestScore = 0;
  for (const day of plan.days) {
    const score = matchScore(day, workout);
    if (score > bestScore) {
      best = day;
      bestScore = score;
    }
  }
  return best;
}

export interface UpcomingDay {
  day: PlanDay;
  /** The most recent workout that matched a plan day, and that day; null when none matched */
  last: { workout: PastWorkout; day: PlanDay } | null;
}

/**
 * The next plan day: the one after the day of the most recent matching workout, cycling back to the first day.
 * `history` is newest first. Returns null for a plan without days.
 */
export function upcomingDay(plan: Plan, history: PastWorkout[]): UpcomingDay | null {
  if (!plan.days.length) return null;
  for (const workout of history) {
    if (workout.total_reps <= 0) continue;
    const day = matchWorkoutToDay(plan, workout);
    if (day) {
      const index = plan.days.findIndex((d) => d.id === day.id);
      return { day: plan.days[(index + 1) % plan.days.length], last: { workout, day } };
    }
  }
  // TODO: no logged workout resembles any plan day (e.g. a brand-new member or a plan with unusual exercises).
  // Start at the first day until we track which plan day a session was meant to be.
  return { day: plan.days[0], last: null };
}

export interface DayReadiness {
  ready: MuscleId[];
  recovering: MuscleId[];
  /** Hours until the slowest recovering muscle is back to full (0 when all are ready) */
  hoursUntilReady: number;
}

export function dayReadiness(day: PlanDay, recovery: RecoveryCalculationResult): DayReadiness {
  const muscles = dayMuscles(day);
  const recovering = muscles.filter((m) => recovery.muscles[m].status !== 'ready');
  return {
    ready: muscles.filter((m) => recovery.muscles[m].status === 'ready'),
    recovering,
    hoursUntilReady: Math.max(0, ...recovering.map((m) => recovery.muscles[m].hours_remaining)),
  };
}

/**
 * The plan day that fits best today: the largest share of its main muscles recovered, then the one whose muscles
 * have waited longest. Null for a plan without exercises.
 */
export function bestFitDay(plan: Plan, recovery: RecoveryCalculationResult): PlanDay | null {
  let best: PlanDay | null = null;
  let bestScore = -Infinity;
  for (const day of plan.days) {
    const muscles = dayMuscles(day);
    if (!muscles.length) continue;
    const readyShare = muscles.filter((m) => recovery.muscles[m].status === 'ready').length / muscles.length;
    const waited =
      muscles.reduce((s, m) => s + Math.min(1, recovery.muscles[m].last_trained_hours_ago / (7 * 24)), 0) /
      muscles.length;
    const score = readyShare * 10 + waited;
    if (score > bestScore) {
      best = day;
      bestScore = score;
    }
  }
  return best;
}
