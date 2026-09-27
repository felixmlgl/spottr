import { MuscleId } from '../types/schema';

export interface ExerciseMuscleMapping {
  primary: MuscleId[];
  secondary: MuscleId[];
}

export const MUSCLE_NAMES: Record<MuscleId, string> = {
  chest: 'Chest',
  front_delts: 'Front delts',
  rear_delts: 'Rear delts',
  biceps: 'Biceps',
  triceps: 'Triceps',
  forearms: 'Forearms',
  abs: 'Abs',
  obliques: 'Obliques',
  traps: 'Traps',
  lats: 'Lats',
  lower_back: 'Lower back',
  glutes: 'Glutes',
  quads: 'Quads',
  hamstrings: 'Hamstrings',
  calves: 'Calves',
};

export const EXERCISE_MUSCLE_MAP: Record<string, ExerciseMuscleMapping> = {
  // Squats & Quads
  squat: {
    primary: ['quads', 'glutes'],
    secondary: ['hamstrings', 'lower_back', 'calves'],
  },
  'barbell back squat': {
    primary: ['quads', 'glutes'],
    secondary: ['hamstrings', 'lower_back', 'calves'],
  },
  lunge: {
    primary: ['quads', 'glutes'],
    secondary: ['hamstrings', 'calves'],
  },
  'walking lunge': {
    primary: ['quads', 'glutes'],
    secondary: ['hamstrings', 'calves'],
  },
  'leg-press': {
    primary: ['quads', 'glutes'],
    secondary: ['calves'],
  },

  // Chest & Push
  dip: {
    primary: ['triceps', 'chest'],
    secondary: ['front_delts'],
  },
  dips: {
    primary: ['triceps', 'chest'],
    secondary: ['front_delts'],
  },
  'bench-press': {
    primary: ['chest'],
    secondary: ['triceps', 'front_delts'],
  },
  'barbell bench press': {
    primary: ['chest'],
    secondary: ['triceps', 'front_delts'],
  },
  'incline-db': {
    primary: ['chest', 'front_delts'],
    secondary: ['triceps'],
  },
  'incline dumbbell press': {
    primary: ['chest', 'front_delts'],
    secondary: ['triceps'],
  },
  'shoulder-press': {
    primary: ['front_delts'],
    secondary: ['triceps', 'traps'],
  },
  'overhead press': {
    primary: ['front_delts'],
    secondary: ['triceps', 'traps'],
  },
  'tricep-extension': {
    primary: ['triceps'],
    secondary: [],
  },

  // Arms & Pull
  'bicep-curl': {
    primary: ['biceps'],
    secondary: ['forearms'],
  },
  'dumbbell bicep curl': {
    primary: ['biceps'],
    secondary: ['forearms'],
  },
  'lateral-raise': {
    primary: ['front_delts', 'rear_delts'],
    secondary: ['traps'],
  },
  'dumbbell lateral raise': {
    primary: ['front_delts', 'rear_delts'],
    secondary: ['traps'],
  },
  pullup: {
    primary: ['lats', 'biceps'],
    secondary: ['traps', 'forearms'],
  },
  'pull-up': {
    primary: ['lats', 'biceps'],
    secondary: ['traps', 'forearms'],
  },
  'barbell-row': {
    primary: ['lats', 'rear_delts', 'traps'],
    secondary: ['biceps', 'lower_back'],
  },

  // Posterior Chain
  rdl: {
    primary: ['hamstrings', 'glutes'],
    secondary: ['lower_back', 'lats'],
  },
  'romanian deadlift': {
    primary: ['hamstrings', 'glutes'],
    secondary: ['lower_back', 'lats'],
  },
  deadlift: {
    primary: ['glutes', 'hamstrings', 'lower_back'],
    secondary: ['quads', 'lats', 'traps', 'forearms'],
  },
  'leg-curl': {
    primary: ['hamstrings'],
    secondary: ['calves'],
  },
  'calf-raise': {
    primary: ['calves'],
    secondary: [],
  },

  // Core
  plank: {
    primary: ['abs', 'obliques'],
    secondary: ['lower_back'],
  },
};

/**
 * Normalizes exercise name to find its muscle mapping
 */
export function getExerciseMuscleMapping(exerciseKey: string): ExerciseMuscleMapping {
  const normalized = exerciseKey.toLowerCase().trim();
  if (EXERCISE_MUSCLE_MAP[normalized]) {
    return EXERCISE_MUSCLE_MAP[normalized];
  }
  // Substring search
  const found = Object.keys(EXERCISE_MUSCLE_MAP).find((k) =>
    normalized.includes(k) || k.includes(normalized)
  );
  if (found) {
    return EXERCISE_MUSCLE_MAP[found];
  }
  // Default fallback
  return { primary: ['abs'], secondary: [] };
}

/**
 * Computes muscle intensities (0.0 to 1.0) for a given session's exercises
 */
export function computeSessionMuscleIntensities(
  exercises: { name: string; exercise_id?: string; total_reps: number }[]
): Record<MuscleId, number> {
  const scores: Record<MuscleId, number> = {
    chest: 0,
    front_delts: 0,
    rear_delts: 0,
    biceps: 0,
    triceps: 0,
    forearms: 0,
    abs: 0,
    obliques: 0,
    traps: 0,
    lats: 0,
    lower_back: 0,
    glutes: 0,
    quads: 0,
    hamstrings: 0,
    calves: 0,
  };

  exercises.forEach((ex) => {
    const reps = ex.total_reps || 10;
    const key = (ex.exercise_id || ex.name).toLowerCase().trim();
    if (key === 'dip' || key === 'dips') {
      scores.triceps += reps * 1.0;
      scores.chest += reps * 0.7;
      scores.front_delts += reps * 0.5;
      return;
    }

    const mapping = getExerciseMuscleMapping(key);

    mapping.primary.forEach((m) => {
      scores[m] += reps * 1.0;
    });

    mapping.secondary.forEach((m) => {
      scores[m] += reps * 0.5;
    });
  });

  // Find max score to normalize cleanly to 0..1 (target benchmark ~30 reps = 1.0)
  const maxScore = Math.max(...Object.values(scores), 24);
  const normalized: Record<MuscleId, number> = { ...scores };

  (Object.keys(scores) as MuscleId[]).forEach((m) => {
    if (scores[m] === 0) {
      normalized[m] = 0;
    } else {
      normalized[m] = Math.min(1.0, Math.round((scores[m] / maxScore) * 100) / 100);
    }
  });

  return normalized;
}

/**
 * Standard exercise library for the Plan builder
 */
export const AVAILABLE_EXERCISES = [
  { id: 'squat', name: 'Barbell back squat', category: 'Legs', defaultSets: 4, defaultReps: 8 },
  { id: 'rdl', name: 'Romanian deadlift', category: 'Legs', defaultSets: 3, defaultReps: 8 },
  { id: 'lunge', name: 'Walking lunge', category: 'Legs', defaultSets: 3, defaultReps: 10 },
  { id: 'leg-press', name: 'Leg press', category: 'Legs', defaultSets: 3, defaultReps: 12 },
  { id: 'leg-curl', name: 'Hamstring leg curl', category: 'Legs', defaultSets: 3, defaultReps: 10 },
  { id: 'calf-raise', name: 'Standing calf raise', category: 'Legs', defaultSets: 4, defaultReps: 15 },
  { id: 'bench-press', name: 'Barbell bench press', category: 'Chest', defaultSets: 4, defaultReps: 8 },
  { id: 'incline-db', name: 'Incline dumbbell press', category: 'Chest', defaultSets: 3, defaultReps: 10 },
  { id: 'bicep-curl', name: 'Dumbbell bicep curl', category: 'Arms', defaultSets: 4, defaultReps: 10 },
  { id: 'tricep-extension', name: 'Tricep cable pushdown', category: 'Arms', defaultSets: 3, defaultReps: 12 },
  { id: 'lateral-raise', name: 'Dumbbell lateral raise', category: 'Shoulders', defaultSets: 4, defaultReps: 12 },
  { id: 'shoulder-press', name: 'Overhead barbell press', category: 'Shoulders', defaultSets: 3, defaultReps: 8 },
  { id: 'pullup', name: 'Pull-up', category: 'Back', defaultSets: 3, defaultReps: 8 },
  { id: 'barbell-row', name: 'Barbell bent-over row', category: 'Back', defaultSets: 4, defaultReps: 8 },
  { id: 'plank', name: 'Core plank hold', category: 'Core', defaultSets: 3, defaultReps: 45 },
];
