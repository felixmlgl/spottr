/**
 * Plan tab logic: what the member trained recently, and what to train on the next visit using only the muscles that
 * have recovered.
 */

import { MuscleId, PastWorkout } from '../types/schema';
import { AVAILABLE_EXERCISES, getExerciseMuscleMapping, MUSCLE_NAMES } from '../data/exerciseMuscles';
import { DEMO_TODAY, workoutMuscles } from './memberSession';
import { readyDayLabel, RecoveryCalculationResult, TRAINED_LOAD, UNTRAINED_HOURS } from './recovery';

const DAY_MS = 24 * 60 * 60 * 1000;
const WEEK_HOURS = 7 * 24;

// === Recent training ===

export const daysAgo = (date: string) => Math.round((Date.parse(DEMO_TODAY) - Date.parse(date)) / DAY_MS);

/** Workouts with reps from the last `days` days (today included), newest first. */
export const recentWorkouts = (history: PastWorkout[], days: number) =>
  history.filter((w) => w.total_reps > 0 && daysAgo(w.date) < days);

/** The most recent workout that trained a muscle, and the names of its exercises that worked it. */
export function lastTrainedIn(
  muscle: MuscleId,
  history: PastWorkout[]
): { workout: PastWorkout; exercises: string[] } | null {
  const workout = history.find((w) => (workoutMuscles(w)[muscle] ?? 0) >= TRAINED_LOAD);
  if (!workout) return null;
  const exercises = workout.exercises
    .filter((ex) => {
      // Pipeline ids use underscores (tricep_extension), the muscle map uses hyphens
      const { primary, secondary } = getExerciseMuscleMapping(ex.exercise_id.replace(/[_\s]+/g, '-'));
      return primary.includes(muscle) || secondary.includes(muscle);
    })
    .map((ex) => ex.name);
  return { workout, exercises };
}

// === Suggestions ===

export interface ExerciseSuggestion {
  id: string;
  name: string;
  sets: number;
  reps: number;
  primary: MuscleId[];
  secondary: MuscleId[];
}

export interface SessionPlan {
  title: string; // e.g. "Pull"
  subtitle: string; // e.g. "Back, rear delts & biceps"
  reason: string;
  exercises: ExerciseSuggestion[];
  /** Short core add-on when abs or obliques have gone untrained for a while */
  finisher: ExerciseSuggestion | null;
  /** The muscle the session is built around (the longest untrained one) */
  spotlight: MuscleId;
}

interface Focus {
  title: string;
  subtitle: string;
  /** How sentences name the whole group and the session, e.g. "legs" and "leg day" */
  noun: string;
  day: string;
  muscles: MuscleId[];
}

/** Session templates; each one groups muscles that are trained together and recover together. */
const FOCUSES: Focus[] = [
  {
    title: 'Push',
    subtitle: 'Chest, shoulders & triceps',
    noun: 'pushing muscles',
    day: 'push day',
    muscles: ['chest', 'front_delts', 'triceps'],
  },
  {
    title: 'Pull',
    subtitle: 'Back, rear delts & biceps',
    noun: 'back and biceps',
    day: 'pull day',
    muscles: ['lats', 'traps', 'rear_delts', 'biceps'],
  },
  {
    title: 'Legs',
    subtitle: 'Quads, glutes, hamstrings & calves',
    noun: 'legs',
    day: 'leg day',
    muscles: ['quads', 'glutes', 'hamstrings', 'calves'],
  },
];
const CORE: MuscleId[] = ['abs', 'obliques'];

/** At most this many main exercises; picks stop earlier once the focus is covered and the next one adds little. */
const MAX_EXERCISES = 4;
const MIN_EXERCISES = 3;
const MIN_GAIN = 0.5;

/** Static holds have no reps for the cameras to count, so they're never suggested. */
const LIBRARY: ExerciseSuggestion[] = AVAILABLE_EXERCISES.filter((ex) => ex.id !== 'plank').map((ex) => ({
  id: ex.id,
  name: ex.name,
  sets: ex.defaultSets,
  reps: ex.defaultReps,
  primary: ex.primary,
  secondary: ex.secondary,
}));

/** Muscles keeping an exercise off the menu: main movers that aren't ready, or helpers that are still fatigued. */
export function waitingOn(ex: ExerciseSuggestion, recovery: RecoveryCalculationResult): MuscleId[] {
  const status = (m: MuscleId) => recovery.muscles[m].status;
  return [...ex.primary.filter((m) => status(m) !== 'ready'), ...ex.secondary.filter((m) => status(m) === 'fatigued')];
}

/** How overdue a muscle is, from 0 (just trained) to 1 (a week or more). */
const needOf = (recovery: RecoveryCalculationResult) => (m: MuscleId) =>
  Math.min(1, recovery.muscles[m].last_trained_hours_ago / WEEK_HOURS);

/** "a", "a and b", "a, b and c" */
export const joinList = (words: string[]) =>
  words.length > 1 ? `${words.slice(0, -1).join(', ')} and ${words[words.length - 1]}` : words[0] ?? '';

const SINGULAR: MuscleId[] = ['chest', 'lower_back'];
const listNames = (muscles: MuscleId[]) => joinList(muscles.map((m) => MUSCLE_NAMES[m].toLowerCase()));
const isPlural = (muscles: MuscleId[]) => muscles.length > 1 || !SINGULAR.includes(muscles[0]);

const sinceLabel = (hours: number) => {
  if (hours >= UNTRAINED_HOURS) return 'in the last 4 weeks';
  const days = Math.floor(hours / 24);
  if (days >= 14) return 'in over 2 weeks';
  if (days > 7) return 'in over a week';
  if (days === 7) return 'in a week';
  return days <= 1 ? 'since yesterday' : `in ${days} days`;
};

/** The next visit: the focus whose muscles are all recovered and most overdue, filled with exercises that fit. */
export function suggestNextSession(recovery: RecoveryCalculationResult): SessionPlan {
  const isReady = (m: MuscleId) => recovery.muscles[m].status === 'ready';
  const need = needOf(recovery);
  const fits = LIBRARY.filter((ex) => waitingOn(ex, recovery).length === 0);

  // A muscle that's still recovering counts against its focus
  const score = (f: Focus) => f.muscles.reduce((s, m) => s + (isReady(m) ? need(m) : -1), 0) / f.muscles.length;
  const focus = [...FOCUSES].sort((a, b) => score(b) - score(a))[0];

  const resting = recovery.recoveringList;
  const restingText = resting.length
    ? `Your ${listNames(resting.slice(0, 4).map((r) => r.muscle_id))}${resting.length > 4 ? ' and more' : ''} ${
        isPlural(resting.map((r) => r.muscle_id)) ? 'are' : 'is'
      } still recovering (back to full ${readyDayLabel(Math.max(...resting.map((r) => r.hours_remaining)))}).`
    : 'Everything is recovered.';

  if (score(focus) <= 0) {
    const spotlight = resting[resting.length - 1]?.muscle_id ?? focus.muscles[0];
    return {
      title: 'Rest day',
      subtitle: 'Let everything recover',
      reason: `${restingText} Take a day off, or keep it to light cardio and mobility.`,
      exercises: [],
      finisher: null,
      spotlight,
    };
  }

  // Greedy: each pick adds the most overdue focus muscles that no earlier pick covers
  const exercises: ExerciseSuggestion[] = [];
  const covered = new Set<MuscleId>();
  while (exercises.length < MAX_EXERCISES) {
    let best: ExerciseSuggestion | null = null;
    let bestGain = 0;
    for (const ex of fits) {
      if (exercises.includes(ex)) continue;
      // Variety: skip a movement whose main muscles an earlier pick already trains (chin-ups after pull-ups)
      if (exercises.some((picked) => ex.primary.every((m) => picked.primary.includes(m)))) continue;
      const onFocus = ex.primary.filter((m) => focus.muscles.includes(m));
      if (!onFocus.length) continue;
      const gain =
        onFocus.reduce((s, m) => s + need(m) * (covered.has(m) ? 0.25 : 1), 0) +
        0.05 * ex.secondary.filter((m) => focus.muscles.includes(m)).length -
        0.1 * (ex.primary.length - onFocus.length);
      if (gain > bestGain) {
        best = ex;
        bestGain = gain;
      }
    }
    const focusCovered = focus.muscles.every((m) => covered.has(m) || !isReady(m));
    if (!best || (exercises.length >= MIN_EXERCISES && focusCovered && bestGain < MIN_GAIN)) break;
    exercises.push(best);
    best.primary.forEach((m) => covered.add(m));
  }

  const finisher =
    fits
      .filter((ex) => ex.primary.some((m) => CORE.includes(m)))
      .find((ex) => ex.primary.some((m) => CORE.includes(m) && need(m) >= 0.5)) ?? null;

  // The focus muscles that have waited longest, named as a group when they all tie
  const ready = focus.muscles.filter(isReady).sort((a, b) => need(b) - need(a));
  const overdue = ready.filter((m) => need(m) >= need(ready[0]) - 0.01);
  const whole = overdue.length === focus.muscles.length;
  const overdueText = `Your ${whole ? focus.noun : listNames(overdue.slice(0, 3))} ${
    whole || isPlural(overdue) ? "haven't" : "hasn't"
  } been trained ${sinceLabel(recovery.muscles[overdue[0]].last_trained_hours_ago)}, so a ${focus.day} is the best use of your next visit.`;

  return {
    title: focus.title,
    subtitle: focus.subtitle,
    reason: `${restingText} ${overdueText}`,
    // Compound lifts first
    exercises: [...exercises].sort((a, b) => b.primary.length - a.primary.length),
    finisher,
    spotlight: overdue[0],
  };
}

export interface MuscleOptions {
  /** Exercises for this muscle that every muscle they work is ready for */
  fits: ExerciseSuggestion[];
  /** Exercises for this muscle that have to wait, and the muscles they wait on */
  notYet: { exercise: ExerciseSuggestion; waitingOn: MuscleId[] }[];
}

/** Exercises that work a muscle as a main mover, split by whether they can be trained now. */
export function exercisesForMuscle(muscle: MuscleId, recovery: RecoveryCalculationResult): MuscleOptions {
  const options: MuscleOptions = { fits: [], notYet: [] };
  LIBRARY.filter((ex) => ex.primary.includes(muscle)).forEach((exercise) => {
    const blockers = waitingOn(exercise, recovery);
    if (blockers.length) options.notYet.push({ exercise, waitingOn: blockers });
    else options.fits.push(exercise);
  });
  return options;
}
