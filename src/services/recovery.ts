import { MuscleId, PastWorkout, RecoveryStatus, TrainingPlan } from '../types/schema';
import { getExerciseMuscleMapping, MUSCLE_NAMES } from '../data/exerciseMuscles';
import { DEMO_TODAY, workoutMuscles } from './memberSession';

// Required recovery hours
const LARGE_MUSCLES: MuscleId[] = [
  'quads',
  'glutes',
  'hamstrings',
  'lats',
  'lower_back',
];

const BASE_RECOVERY_HOURS: Record<MuscleId, number> = {
  quads: 72,
  glutes: 72,
  hamstrings: 72,
  lats: 72,
  lower_back: 72,
  chest: 48,
  front_delts: 48,
  rear_delts: 48,
  biceps: 48,
  triceps: 48,
  forearms: 48,
  abs: 48,
  obliques: 48,
  traps: 48,
  calves: 48,
};

export interface RecoveryCalculationResult {
  muscles: Record<MuscleId, RecoveryStatus>;
  readyList: RecoveryStatus[];
  recoveringList: RecoveryStatus[];
  recommendation: {
    headline: string;
    details: string;
    actionHint?: string;
  };
}

/** "Now" in the demo: 1:00 PM on the demo's today. Workouts are dated by day only, so each one counts as ending at 10:30. */
const REFERENCE_TIME = Date.parse(`${DEMO_TODAY}T13:00:00Z`);
const WORKOUT_END = 'T10:30:00Z';

/** A muscle counts as trained in a workout once its load (0..1) reaches this. */
export const TRAINED_LOAD = 0.25;

/** Hours since training for a muscle that isn't trained anywhere in the history. */
export const UNTRAINED_HOURS = 28 * 24;

const ALL_MUSCLES = Object.keys(MUSCLE_NAMES) as MuscleId[];

/** Hours between the demo's "now" and the most recent workout that trained each muscle. */
export function hoursSinceTrained(history: PastWorkout[]): Record<MuscleId, number> {
  const hours = Object.fromEntries(ALL_MUSCLES.map((m) => [m, UNTRAINED_HOURS])) as Record<MuscleId, number>;
  history.forEach((w) => {
    const ago = (REFERENCE_TIME - Date.parse(`${w.date}${WORKOUT_END}`)) / 3_600_000;
    (Object.entries(workoutMuscles(w)) as [MuscleId, number][]).forEach(([m, load]) => {
      if (load >= TRAINED_LOAD && m in hours && ago < hours[m]) hours[m] = ago;
    });
  });
  return hours;
}

/** Weekday a muscle is back to full, e.g. "tomorrow" or "Wednesday", counted from the demo's "now". */
export function readyDayLabel(hoursRemaining: number): string {
  const ready = new Date(REFERENCE_TIME + hoursRemaining * 3_600_000);
  const days = Math.round((Date.parse(ready.toISOString().slice(0, 10)) - Date.parse(DEMO_TODAY)) / 86_400_000);
  if (days <= 0) return 'later today';
  if (days === 1) return 'tomorrow';
  return ready.toLocaleDateString('en-US', { weekday: 'long', timeZone: 'UTC' });
}

/**
 * @param history the member's workouts, today's camera-tracked session first. Recovery follows whatever each
 *   workout actually trained, so it changes with the selected demo person.
 */
export function calculateMuscleRecovery(history: PastWorkout[], plan?: TrainingPlan): RecoveryCalculationResult {
  const lastTrainedHours = hoursSinceTrained(history);

  const results: Record<MuscleId, RecoveryStatus> = {} as Record<MuscleId, RecoveryStatus>;

  ALL_MUSCLES.forEach((muscle) => {
    const requiredHours = BASE_RECOVERY_HOURS[muscle];
    const hoursAgo = lastTrainedHours[muscle];

    // Compute recovery ratio: 0.0 to 1.0 (clamped)
    const rawPercent = Math.min(1.0, hoursAgo / requiredHours);
    const recovery_percent = Math.round(rawPercent * 100);

    let status: 'ready' | 'recovering' | 'fatigued' = 'ready';
    if (recovery_percent < 45) {
      status = 'fatigued';
    } else if (recovery_percent < 85) {
      status = 'recovering';
    } else {
      status = 'ready';
    }

    const hours_remaining = Math.max(0, Math.round(requiredHours - hoursAgo));

    results[muscle] = {
      muscle_id: muscle,
      name: MUSCLE_NAMES[muscle],
      recovery_percent,
      status,
      hours_remaining,
      last_trained_hours_ago: Math.round(hoursAgo),
    };
  });

  const muscleList = Object.values(results);
  const readyList = muscleList.filter((m) => m.status === 'ready');
  const recoveringList = muscleList
    .filter((m) => m.status !== 'ready')
    .sort((a, b) => a.recovery_percent - b.recovery_percent);

  // Contextual smart recommendation based on plan
  let recommendation = {
    headline: 'Upper body and pull groups are ready',
    details:
      'Your chest, shoulders, and arms are fully recovered. Tomorrow’s planned Pull day or Upper body workout fits your readiness curve perfectly.',
    actionHint: 'Legs are resting until Wednesday',
  };

  if (plan) {
    const mondayWorkout = plan.days.mon;
    if (mondayWorkout && !mondayWorkout.is_rest) {
      const tired = recoveringList.slice(0, 3).map((m) => m.name.toLowerCase());
      // Primary muscles of tomorrow's planned exercises that haven't recovered yet
      const clashing = recoveringList.filter((m) =>
        mondayWorkout.exercises.some((ex) => getExerciseMuscleMapping(ex.exercise_id).primary.includes(m.muscle_id))
      );
      recommendation = clashing.length
        ? {
            headline: `Go easy on tomorrow's ${mondayWorkout.title}`,
            details: `Your ${clashing
              .slice(0, 3)
              .map((m) => m.name.toLowerCase())
              .join(', ')} ${clashing.length === 1 ? 'is' : 'are'} still recovering from today. Lighter sets, or swap ${mondayWorkout.title} with a day that trains other muscles.`,
            actionHint: `${clashing.length} planned muscle${clashing.length === 1 ? '' : 's'} still recovering`,
          }
        : {
            headline: `${mondayWorkout.title} is ready for tomorrow`,
            details: tired.length
              ? `Your ${tired.join(', ')} ${tired.length === 1 ? 'is' : 'are'} still recovering, and tomorrow's ${mondayWorkout.title} plan leaves them to rest.`
              : `Every muscle group is recovered. You're clear to follow your ${mondayWorkout.title} plan tomorrow.`,
            actionHint: `On track for ${mondayWorkout.title}`,
          };
    }
  }

  return {
    muscles: results,
    readyList,
    recoveringList,
    recommendation,
  };
}
