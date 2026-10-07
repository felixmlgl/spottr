/**
 * Exercise library for the editable plan.
 *
 * Keys are the pipeline's exercise labels: the values the vision backend can return for a set
 * (`EXERCISES` / `EXERCISE_IDS` in backend/vision/exercises.py, minus "other"), the same strings that appear in
 * `sets[].exercise` in session.json. Planning only with these keys means every planned exercise is one the cameras
 * can recognise and log.
 *
 * Muscles come from the matching entry in AVAILABLE_EXERCISES (data/exerciseMuscles.ts), so recovery and the body map
 * treat a planned exercise exactly like a logged one.
 */

import { MuscleId } from '../types/schema';
import { AVAILABLE_EXERCISES, LibraryExercise } from './exerciseMuscles';

export type MuscleGroup = LibraryExercise['category'];

/** Picker section order */
export const MUSCLE_GROUPS: MuscleGroup[] = ['Legs', 'Chest', 'Back', 'Shoulders', 'Arms', 'Core'];

export interface PlanExerciseInfo {
  key: string;
  name: string;
  group: MuscleGroup;
  primary: MuscleId[];
  secondary: MuscleId[];
  defaultSets: number;
  defaultRepsMin: number;
  defaultRepsMax: number;
  /** True for the pipeline vocabulary; false for EXTRA_PLAN_EXERCISES */
  trackedByCamera: boolean;
}

// [pipeline key, display name, AVAILABLE_EXERCISES id, default sets, default rep range]
type Row = [key: string, name: string, libraryId: string, sets: number, repsMin: number, repsMax: number];

/** The 25 exercise labels the pipeline can output (backend/vision/exercises.py). */
const PIPELINE_ROWS: Row[] = [
  ['squat', 'Squat', 'squat', 4, 6, 8],
  ['deadlift', 'Deadlift', 'deadlift', 3, 5, 6],
  ['romanian_deadlift', 'Romanian deadlift', 'rdl', 3, 8, 10],
  ['lunge', 'Lunge', 'lunge', 3, 10, 12],
  ['leg_press', 'Leg press', 'leg-press', 3, 10, 12],
  ['leg_extension', 'Leg extension', 'leg-extension', 3, 12, 15],
  ['leg_curl', 'Leg curl', 'leg-curl', 3, 10, 12],
  ['hip_thrust', 'Hip thrust', 'hip-thrust', 3, 8, 12],
  ['calf_raise', 'Calf raise', 'calf-raise', 4, 12, 15],
  ['bench_press', 'Bench press', 'bench-press', 4, 6, 8],
  ['incline_press', 'Incline press', 'incline-db', 3, 8, 10],
  ['push_up', 'Push-up', 'push-up', 3, 10, 15],
  ['chest_fly', 'Chest fly', 'chest-fly', 3, 12, 15],
  ['dip', 'Dip', 'dip', 3, 8, 12],
  ['pull_up', 'Pull-up', 'pullup', 3, 6, 10],
  ['lat_pulldown', 'Lat pulldown', 'lat-pulldown', 3, 10, 12],
  ['seated_row', 'Seated row', 'seated-row', 3, 10, 12],
  ['bent_over_row', 'Bent-over row', 'barbell-row', 4, 6, 8],
  ['shrug', 'Shrug', 'shrug', 3, 10, 12],
  ['shoulder_press', 'Shoulder press', 'shoulder-press', 3, 8, 10],
  ['lateral_raise', 'Lateral raise', 'lateral-raise', 3, 12, 15],
  ['rear_delt_fly', 'Rear delt fly', 'rear-delt-fly', 3, 12, 15],
  ['bicep_curl', 'Bicep curl', 'bicep-curl', 3, 10, 12],
  ['tricep_extension', 'Tricep extension', 'tricep-extension', 3, 10, 12],
  ['crunch', 'Crunch', 'crunch', 3, 12, 15],
];

/**
 * EXTRA EXERCISES (not recognised by the pipeline yet).
 * Anything added here can be planned but won't be logged by the cameras until the backend team adds the label to
 * backend/vision/exercises.py. Keep this list aligned with them. Currently empty: the templates only use pipeline
 * labels.
 */
const EXTRA_ROWS: Row[] = [];

const toInfo = ([key, name, libraryId, sets, repsMin, repsMax]: Row, trackedByCamera: boolean): PlanExerciseInfo => {
  const lib = AVAILABLE_EXERCISES.find((e) => e.id === libraryId);
  if (!lib) throw new Error(`planExercises: no library entry "${libraryId}" for "${key}"`);
  return {
    key,
    name,
    group: lib.category,
    primary: lib.primary,
    secondary: lib.secondary,
    defaultSets: sets,
    defaultRepsMin: repsMin,
    defaultRepsMax: repsMax,
    trackedByCamera,
  };
};

export const PLAN_EXERCISES: PlanExerciseInfo[] = [
  ...PIPELINE_ROWS.map((r) => toInfo(r, true)),
  ...EXTRA_ROWS.map((r) => toInfo(r, false)),
];

const BY_KEY = new Map(PLAN_EXERCISES.map((e) => [e.key, e]));

const normalize = (id: string) => id.toLowerCase().trim().replace(/[-\s]+/g, '_');

/** Library ids used by older data (mock history, weekly plan) → pipeline key, e.g. "rdl" → "romanian_deadlift". */
const ALIASES = new Map<string, string>(
  [...PIPELINE_ROWS, ...EXTRA_ROWS].map(([key, , libraryId]) => [normalize(libraryId), key])
);

/** The plan key for a logged exercise id (pipeline "romanian_deadlift" or library "rdl"), or null if unknown. */
export function toPlanExerciseKey(exerciseId: string): string | null {
  const id = normalize(exerciseId);
  if (BY_KEY.has(id)) return id;
  return ALIASES.get(id) ?? null;
}

const titleCase = (key: string) => {
  const words = key.replace(/_/g, ' ');
  return words.charAt(0).toUpperCase() + words.slice(1);
};

/** Info for a plan exercise; unknown keys (e.g. from an older saved plan) still get a readable name. */
export function planExerciseInfo(key: string): PlanExerciseInfo {
  return (
    BY_KEY.get(key) ?? {
      key,
      name: titleCase(key),
      group: 'Core',
      primary: [],
      secondary: [],
      defaultSets: 3,
      defaultRepsMin: 8,
      defaultRepsMax: 12,
      trackedByCamera: false,
    }
  );
}
