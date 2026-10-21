import { MuscleId, PastWorkout, RecoveryStatus } from '../types/schema';
import { MUSCLE_NAMES } from '../data/exerciseMuscles';
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
export function calculateMuscleRecovery(history: PastWorkout[]): RecoveryCalculationResult {
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

  return {
    muscles: results,
    readyList,
    recoveringList,
  };
}
