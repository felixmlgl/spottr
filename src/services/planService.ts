import { PlannedWorkout, TrainingPlan } from '../types/schema';

export const DEFAULT_TRAINING_PLAN: TrainingPlan = {
  id: 'default-plan',
  name: 'Push / Pull / Legs Split',
  days: {
    mon: {
      id: 'mon',
      day: 'mon',
      day_label: 'Monday',
      is_rest: false,
      title: 'Push',
      exercises: [
        { id: '1', name: 'Barbell bench press', exercise_id: 'bench-press', target_sets: 4, target_reps: 8 },
        { id: '2', name: 'Incline dumbbell press', exercise_id: 'incline-db', target_sets: 3, target_reps: 10 },
        { id: '3', name: 'Overhead barbell press', exercise_id: 'shoulder-press', target_sets: 3, target_reps: 8 },
        { id: '4', name: 'Tricep cable pushdown', exercise_id: 'tricep-extension', target_sets: 3, target_reps: 12 },
      ],
    },
    tue: {
      id: 'tue',
      day: 'tue',
      day_label: 'Tuesday',
      is_rest: false,
      title: 'Pull',
      exercises: [
        { id: '5', name: 'Pull-up', exercise_id: 'pullup', target_sets: 3, target_reps: 8 },
        { id: '6', name: 'Barbell bent-over row', exercise_id: 'barbell-row', target_sets: 4, target_reps: 8 },
        { id: '7', name: 'Dumbbell bicep curl', exercise_id: 'bicep-curl', target_sets: 4, target_reps: 10 },
        { id: '8', name: 'Dumbbell lateral raise', exercise_id: 'lateral-raise', target_sets: 4, target_reps: 12 },
      ],
    },
    wed: {
      id: 'wed',
      day: 'wed',
      day_label: 'Wednesday',
      is_rest: false,
      title: 'Legs',
      exercises: [
        { id: '9', name: 'Barbell back squat', exercise_id: 'squat', target_sets: 4, target_reps: 8 },
        { id: '10', name: 'Romanian deadlift', exercise_id: 'rdl', target_sets: 3, target_reps: 8 },
        { id: '11', name: 'Walking lunge', exercise_id: 'lunge', target_sets: 3, target_reps: 10 },
        { id: '12', name: 'Standing calf raise', exercise_id: 'calf-raise', target_sets: 4, target_reps: 15 },
      ],
    },
    thu: {
      id: 'thu',
      day: 'thu',
      day_label: 'Thursday',
      is_rest: true,
      title: 'Rest',
      exercises: [],
    },
    fri: {
      id: 'fri',
      day: 'fri',
      day_label: 'Friday',
      is_rest: false,
      title: 'Upper',
      exercises: [
        { id: '13', name: 'Barbell bench press', exercise_id: 'bench-press', target_sets: 4, target_reps: 8 },
        { id: '14', name: 'Pull-up', exercise_id: 'pullup', target_sets: 3, target_reps: 8 },
        { id: '15', name: 'Dumbbell bicep curl', exercise_id: 'bicep-curl', target_sets: 4, target_reps: 10 },
      ],
    },
    sat: {
      id: 'sat',
      day: 'sat',
      day_label: 'Saturday',
      is_rest: false,
      title: 'Lower',
      exercises: [
        { id: '16', name: 'Barbell back squat', exercise_id: 'squat', target_sets: 3, target_reps: 8 },
        { id: '17', name: 'Romanian deadlift', exercise_id: 'rdl', target_sets: 3, target_reps: 8 },
      ],
    },
    sun: {
      id: 'sun',
      day: 'sun',
      day_label: 'Sunday',
      is_rest: false,
      title: 'Legs & Core',
      exercises: [
        { id: '18', name: 'Barbell back squat', exercise_id: 'squat', target_sets: 4, target_reps: 8 },
        { id: '19', name: 'Romanian deadlift', exercise_id: 'rdl', target_sets: 3, target_reps: 8 },
        { id: '20', name: 'Walking lunge', exercise_id: 'lunge', target_sets: 3, target_reps: 8 },
      ],
    },
  },
};

const PLAN_STORAGE_KEY = 'spottr_training_plan';
const LEGACY_STORAGE_KEY = 'repswell_training_plan';

export function loadTrainingPlan(): TrainingPlan {
  try {
    const raw = localStorage.getItem(PLAN_STORAGE_KEY) || localStorage.getItem(LEGACY_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      if (parsed && parsed.days) return parsed;
    }
  } catch {
    // localStorage disabled or error
  }
  return DEFAULT_TRAINING_PLAN;
}

export function saveTrainingPlan(plan: TrainingPlan): void {
  try {
    localStorage.setItem(PLAN_STORAGE_KEY, JSON.stringify(plan));
  } catch {
    // ignore
  }
}
