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
  const listed = AVAILABLE_EXERCISES.find((item) => item.id === normalized);
  if (listed) {
    return listed;
  }
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

export interface LibraryExercise extends ExerciseMuscleMapping {
  id: string;
  name: string;
  category: 'Legs' | 'Chest' | 'Shoulders' | 'Arms' | 'Back' | 'Core';
  defaultSets: number;
  defaultReps: number;
}

const ex = (
  id: string,
  name: string,
  category: LibraryExercise['category'],
  defaultSets: number,
  defaultReps: number,
  primary: MuscleId[],
  secondary: MuscleId[] = []
): LibraryExercise => ({ id, name, category, defaultSets, defaultReps, primary, secondary });

/**
 * Exercise library for the routine editor and the Plan tab's suggestions, with the muscles each one works.
 * Within a muscle, earlier entries are preferred, so the staple lifts come first.
 */
export const AVAILABLE_EXERCISES: LibraryExercise[] = [
  // Legs
  ex('squat', 'Barbell back squat', 'Legs', 4, 8, ['quads', 'glutes'], ['hamstrings', 'lower_back', 'calves']),
  ex('deadlift', 'Deadlift', 'Legs', 3, 5, ['glutes', 'hamstrings', 'lower_back'], ['quads', 'lats', 'traps', 'forearms']),
  ex('rdl', 'Romanian deadlift', 'Legs', 3, 8, ['hamstrings', 'glutes'], ['lower_back', 'lats']),
  ex('lunge', 'Walking lunge', 'Legs', 3, 10, ['quads', 'glutes'], ['hamstrings', 'calves']),
  ex('leg-press', 'Leg press', 'Legs', 3, 12, ['quads', 'glutes'], ['calves']),
  ex('leg-extension', 'Leg extension', 'Legs', 3, 12, ['quads']),
  ex('leg-curl', 'Hamstring leg curl', 'Legs', 3, 10, ['hamstrings'], ['calves']),
  ex('hip-thrust', 'Barbell hip thrust', 'Legs', 3, 10, ['glutes'], ['hamstrings']),
  ex('calf-raise', 'Standing calf raise', 'Legs', 4, 15, ['calves']),
  ex('front-squat', 'Front squat', 'Legs', 4, 6, ['quads', 'glutes'], ['abs', 'lower_back']),
  ex('goblet-squat', 'Goblet squat', 'Legs', 3, 12, ['quads', 'glutes'], ['abs']),
  ex('hack-squat', 'Hack squat', 'Legs', 3, 10, ['quads', 'glutes']),
  ex('bulgarian-split-squat', 'Bulgarian split squat', 'Legs', 3, 10, ['quads', 'glutes'], ['hamstrings']),
  ex('step-up', 'Dumbbell step-up', 'Legs', 3, 10, ['quads', 'glutes'], ['hamstrings', 'calves']),
  ex('good-morning', 'Good morning', 'Legs', 3, 10, ['hamstrings', 'lower_back'], ['glutes']),
  ex('single-leg-rdl', 'Single-leg Romanian deadlift', 'Legs', 3, 10, ['hamstrings', 'glutes'], ['lower_back']),
  ex('seated-leg-curl', 'Seated leg curl', 'Legs', 3, 12, ['hamstrings']),
  ex('nordic-curl', 'Nordic hamstring curl', 'Legs', 3, 6, ['hamstrings']),
  ex('glute-bridge', 'Glute bridge', 'Legs', 3, 15, ['glutes'], ['hamstrings']),
  ex('cable-kickback', 'Cable glute kickback', 'Legs', 3, 12, ['glutes'], ['hamstrings']),
  ex('seated-calf-raise', 'Seated calf raise', 'Legs', 4, 15, ['calves']),
  ex('single-leg-calf-raise', 'Single-leg calf raise', 'Legs', 3, 12, ['calves']),
  ex('leg-press-calf-raise', 'Leg press calf raise', 'Legs', 4, 15, ['calves']),
  ex('donkey-calf-raise', 'Donkey calf raise', 'Legs', 3, 15, ['calves']),
  ex('smith-calf-raise', 'Smith machine calf raise', 'Legs', 4, 12, ['calves']),

  // Chest
  ex('bench-press', 'Barbell bench press', 'Chest', 4, 8, ['chest'], ['triceps', 'front_delts']),
  ex('incline-db', 'Incline dumbbell press', 'Chest', 3, 10, ['chest', 'front_delts'], ['triceps']),
  ex('push-up', 'Push-up', 'Chest', 3, 15, ['chest'], ['triceps', 'front_delts', 'abs']),
  ex('chest-fly', 'Cable chest fly', 'Chest', 3, 12, ['chest'], ['front_delts']),
  ex('dip', 'Dip', 'Chest', 3, 10, ['triceps', 'chest'], ['front_delts']),
  ex('db-bench', 'Dumbbell bench press', 'Chest', 4, 10, ['chest'], ['triceps', 'front_delts']),
  ex('decline-bench', 'Decline bench press', 'Chest', 3, 8, ['chest'], ['triceps', 'front_delts']),
  ex('pec-deck', 'Pec deck fly', 'Chest', 3, 12, ['chest'], ['front_delts']),

  // Shoulders
  ex('lateral-raise', 'Dumbbell lateral raise', 'Shoulders', 4, 12, ['front_delts', 'rear_delts'], ['traps']),
  ex('shoulder-press', 'Overhead barbell press', 'Shoulders', 3, 8, ['front_delts'], ['triceps', 'traps']),
  ex('rear-delt-fly', 'Rear delt fly', 'Shoulders', 3, 15, ['rear_delts'], ['traps']),
  ex('db-shoulder-press', 'Seated dumbbell shoulder press', 'Shoulders', 3, 10, ['front_delts'], ['triceps', 'traps']),
  ex('arnold-press', 'Arnold press', 'Shoulders', 3, 10, ['front_delts'], ['triceps']),
  ex('front-raise', 'Dumbbell front raise', 'Shoulders', 3, 12, ['front_delts']),
  ex('cable-lateral-raise', 'Cable lateral raise', 'Shoulders', 3, 15, ['front_delts', 'rear_delts'], ['traps']),
  ex('face-pull', 'Cable face pull', 'Shoulders', 3, 15, ['rear_delts', 'traps']),
  ex('reverse-pec-deck', 'Reverse pec deck', 'Shoulders', 3, 15, ['rear_delts'], ['traps']),
  ex('upright-row', 'Upright row', 'Shoulders', 3, 10, ['traps', 'front_delts', 'rear_delts'], ['biceps']),

  // Arms
  ex('bicep-curl', 'Dumbbell bicep curl', 'Arms', 4, 10, ['biceps'], ['forearms']),
  ex('tricep-extension', 'Tricep cable pushdown', 'Arms', 3, 12, ['triceps']),
  ex('barbell-curl', 'Barbell curl', 'Arms', 3, 10, ['biceps'], ['forearms']),
  ex('hammer-curl', 'Hammer curl', 'Arms', 3, 10, ['biceps', 'forearms']),
  ex('preacher-curl', 'Preacher curl', 'Arms', 3, 10, ['biceps'], ['forearms']),
  ex('cable-curl', 'Cable curl', 'Arms', 3, 12, ['biceps'], ['forearms']),
  ex('zottman-curl', 'Zottman curl', 'Arms', 3, 10, ['biceps', 'forearms']),
  ex('reverse-curl', 'Reverse barbell curl', 'Arms', 3, 12, ['forearms', 'biceps']),
  ex('wrist-curl', 'Wrist curl', 'Arms', 3, 15, ['forearms']),
  ex('reverse-wrist-curl', 'Reverse wrist curl', 'Arms', 3, 15, ['forearms']),
  ex('behind-back-wrist-curl', 'Behind-the-back wrist curl', 'Arms', 3, 15, ['forearms']),
  ex('skull-crusher', 'Skull crusher', 'Arms', 3, 10, ['triceps']),
  ex('overhead-tricep-extension', 'Overhead tricep extension', 'Arms', 3, 12, ['triceps']),
  ex('tricep-kickback', 'Tricep kickback', 'Arms', 3, 12, ['triceps']),
  ex('close-grip-bench', 'Close-grip bench press', 'Arms', 3, 8, ['triceps', 'chest'], ['front_delts']),
  ex('diamond-push-up', 'Diamond push-up', 'Arms', 3, 12, ['triceps', 'chest'], ['front_delts']),
  ex('bench-dip', 'Bench dip', 'Arms', 3, 12, ['triceps'], ['chest', 'front_delts']),

  // Back
  ex('pullup', 'Pull-up', 'Back', 3, 8, ['lats', 'biceps'], ['traps', 'forearms']),
  ex('lat-pulldown', 'Lat pulldown', 'Back', 3, 10, ['lats'], ['biceps', 'rear_delts']),
  ex('seated-row', 'Seated cable row', 'Back', 3, 10, ['lats', 'traps'], ['rear_delts', 'biceps']),
  ex('barbell-row', 'Barbell bent-over row', 'Back', 4, 8, ['lats', 'rear_delts', 'traps'], ['biceps', 'lower_back']),
  ex('shrug', 'Dumbbell shrug', 'Back', 3, 12, ['traps'], ['forearms']),
  ex('chin-up', 'Chin-up', 'Back', 3, 8, ['lats', 'biceps'], ['forearms', 'rear_delts']),
  ex('db-row', 'One-arm dumbbell row', 'Back', 3, 10, ['lats', 'rear_delts'], ['biceps', 'traps']),
  ex('t-bar-row', 'T-bar row', 'Back', 3, 8, ['lats', 'traps', 'rear_delts'], ['biceps', 'lower_back']),
  ex('straight-arm-pulldown', 'Straight-arm pulldown', 'Back', 3, 12, ['lats']),
  ex('barbell-shrug', 'Barbell shrug', 'Back', 3, 12, ['traps'], ['forearms']),
  ex('rack-pull', 'Rack pull', 'Back', 3, 5, ['traps', 'lower_back', 'glutes'], ['hamstrings', 'forearms']),
  ex('back-extension', 'Back extension', 'Back', 3, 12, ['lower_back'], ['glutes', 'hamstrings']),
  ex('superman', 'Superman', 'Back', 3, 12, ['lower_back'], ['glutes']),

  // Core
  ex('crunch', 'Crunch', 'Core', 3, 15, ['abs'], ['obliques']),
  ex('plank', 'Core plank hold', 'Core', 3, 45, ['abs', 'obliques'], ['lower_back']),
  ex('hanging-leg-raise', 'Hanging leg raise', 'Core', 3, 10, ['abs'], ['obliques', 'forearms']),
  ex('cable-crunch', 'Cable crunch', 'Core', 3, 12, ['abs'], ['obliques']),
  ex('ab-wheel', 'Ab wheel rollout', 'Core', 3, 10, ['abs'], ['lower_back', 'lats']),
  ex('sit-up', 'Sit-up', 'Core', 3, 15, ['abs'], ['obliques']),
  ex('reverse-crunch', 'Reverse crunch', 'Core', 3, 15, ['abs']),
  ex('v-up', 'V-up', 'Core', 3, 12, ['abs'], ['obliques']),
  ex('bicycle-crunch', 'Bicycle crunch', 'Core', 3, 20, ['abs', 'obliques']),
  ex('russian-twist', 'Russian twist', 'Core', 3, 20, ['obliques'], ['abs']),
  ex('woodchopper', 'Cable woodchopper', 'Core', 3, 12, ['obliques'], ['abs']),
  ex('side-bend', 'Dumbbell side bend', 'Core', 3, 15, ['obliques']),
  ex('oblique-knee-raise', 'Hanging oblique knee raise', 'Core', 3, 10, ['obliques', 'abs'], ['forearms']),
  ex('side-plank-dip', 'Side plank hip dip', 'Core', 3, 15, ['obliques'], ['abs']),
  ex('bird-dog', 'Bird dog', 'Core', 3, 10, ['lower_back', 'abs'], ['glutes']),
];
