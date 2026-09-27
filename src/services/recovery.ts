import { MuscleId, RecoveryStatus, TrainingPlan } from '../types/schema';
import { PAST_WORKOUTS } from '../mocks/memberData';
import { EXERCISE_MUSCLE_MAP, getExerciseMuscleMapping, MUSCLE_NAMES } from '../data/exerciseMuscles';

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

export function calculateMuscleRecovery(plan?: TrainingPlan): RecoveryCalculationResult {
  // Current simulated timestamp: Sep 27, 2026 at 1:00 PM (13:00)
  const referenceTime = new Date('2026-09-27T13:00:00Z').getTime();

  const allMuscles: MuscleId[] = [
    'chest',
    'front_delts',
    'rear_delts',
    'biceps',
    'triceps',
    'forearms',
    'abs',
    'obliques',
    'traps',
    'lats',
    'lower_back',
    'glutes',
    'quads',
    'hamstrings',
    'calves',
  ];

  // Track the most recent time and load for each muscle across past workouts
  const lastTrainedHours: Record<MuscleId, number> = {
    chest: 52, // Friday Sep 25 (~48-52h ago)
    front_delts: 52,
    rear_delts: 96,
    biceps: 96, // Wednesday Sep 23 (~96h ago)
    triceps: 52,
    forearms: 96,
    abs: 140,
    obliques: 140,
    traps: 96,
    lats: 168,
    lower_back: 2.5, // Trained today in RDL/squats
    glutes: 2.5,     // Trained today in squats
    quads: 2.5,      // Trained today in squats/lunges
    hamstrings: 2.5, // Trained today in RDL
    calves: 2.5,
  };

  const results: Record<MuscleId, RecoveryStatus> = {} as Record<MuscleId, RecoveryStatus>;

  allMuscles.forEach((muscle) => {
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
      recommendation = {
        headline: `${mondayWorkout.title} is ready for tomorrow`,
        details: `Your upper body pull & push muscles are refreshed. Following your ${mondayWorkout.title} plan tomorrow allows your lower body 48 more hours to supercompensate.`,
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
