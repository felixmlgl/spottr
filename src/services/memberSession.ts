/**
 * Turns the demo's selected clip + person into the member's "today" session, and merges it with the mock history.
 */

import { PAST_WORKOUTS } from '../mocks/memberData';
import { computeSessionMuscleIntensities } from '../data/exerciseMuscles';
import { PastWorkout, PastWorkoutExercise, WorkoutSummary } from '../types/schema';
import { PipelinePerson, PipelineSession, prettifyExerciseName } from './pipelineAdapter';

/** The mock history's "today" (the hackathon day); the pipeline session replaces the mock workout on this date. */
export const DEMO_TODAY = PAST_WORKOUTS[0].date;

export const trackedSeconds = (p: PipelinePerson) => Math.max(0, p.last_seen_s - p.first_seen_s);

/** Picker order: most sets first, then most reps, then longest time tracked. */
export function sortPeopleForPicker(people: PipelinePerson[]): PipelinePerson[] {
  return [...people].sort(
    (a, b) =>
      (b.sets?.length || 0) - (a.sets?.length || 0) ||
      (b.total_reps || 0) - (a.total_reps || 0) ||
      trackedSeconds(b) - trackedSeconds(a)
  );
}

/** Best person to pre-select in a clip (the top of the picker order). */
export function defaultPersonId(session: PipelineSession): string | null {
  const first = sortPeopleForPicker(session.people)[0];
  return first ? String(first.id) : null;
}

/** Main exercise label for a person, e.g. "Squat", or null when they did no sets. */
export function mainExercise(person: PipelinePerson): string | null {
  const first = person.sets?.[0];
  return first ? prettifyExerciseName(first.exercise) : null;
}

/** A moment the person is clearly in frame: middle of their first set, else the middle of their time on camera. */
export function spotlightTime(person: PipelinePerson): number {
  const set = person.sets?.[0];
  if (set) return (set.start_s + set.end_s) / 2;
  return (person.first_seen_s + person.last_seen_s) / 2;
}

/** The pipeline session as a history entry, so it shows up alongside the mock workouts. */
export function summaryToWorkout(summary: WorkoutSummary, recap: string): PastWorkout {
  const byExercise = new Map<string, PastWorkoutExercise>();
  for (const s of summary.sessions) {
    const ex = byExercise.get(s.exercise_id) || {
      name: s.exercise_name,
      exercise_id: s.exercise_id,
      sets: 0,
      reps_per_set: [],
      total_reps: 0,
    };
    ex.sets += 1;
    ex.reps_per_set.push(s.rep_count);
    ex.total_reps += s.rep_count;
    byExercise.set(s.exercise_id, ex);
  }

  return {
    id: 'pipeline-today',
    date: DEMO_TODAY,
    display_date: 'Today',
    week_group: PAST_WORKOUTS[0].week_group,
    duration_minutes: Math.max(1, Math.round(summary.total_duration_s / 60)),
    total_reps: summary.total_reps,
    exercises: [...byExercise.values()],
    recap,
    suggestion: '',
    muscle_load: summary.muscle_load,
  };
}

/** Today's pipeline session followed by the mock history (minus the mock "today"). */
export function workoutHistory(today: PastWorkout): PastWorkout[] {
  return [today, ...PAST_WORKOUTS.filter((w) => w.date !== DEMO_TODAY)];
}

/** Per-muscle load for a workout: the pipeline's when it has one, else estimated from the exercises. */
export const workoutMuscles = (w: PastWorkout) =>
  w.muscle_load && Object.keys(w.muscle_load).length > 0 ? w.muscle_load : computeSessionMuscleIntensities(w.exercises);
