/**
 * Sample data for the member app. Only "today" comes from the camera pipeline (the selected clip and person);
 * the older workouts below are illustrative sample history and are labelled as such in the UI. So far the
 * pipeline has been tested on squats and dips only.
 */

import { PastWorkout } from '../types/schema';
import { GYM } from './gym/gym';

export const MEMBER_PROFILE = {
  name: 'Felix',
  // Same fictional gym as the operator demo (/gyms)
  gymName: GYM.name,
  avatarUrl: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80',
  currentStreakDays: 4,
  workoutsThisMonth: 14,
  totalRepsThisMonth: 842,
};

export const PAST_WORKOUTS: PastWorkout[] = [
  {
    id: 'wo-1',
    date: '2026-09-27',
    display_date: 'Today, 10:45 AM',
    week_group: 'This week',
    duration_minutes: 42,
    total_reps: 64,
    exercises: [
      {
        name: 'Barbell back squat',
        exercise_id: 'squat',
        sets: 4,
        reps_per_set: [8, 8, 8, 8],
        total_reps: 32,
      },
      {
        name: 'Romanian deadlift',
        exercise_id: 'rdl',
        sets: 3,
        reps_per_set: [8, 8, 8],
        total_reps: 24,
      },
      {
        name: 'Walking lunge',
        exercise_id: 'lunge',
        sets: 2,
        reps_per_set: [4, 4],
        total_reps: 8,
      },
    ],
    timeline_points: [
      { t: 6, exercise: 'Barbell back squat', reps: 8 },
      { t: 14, exercise: 'Barbell back squat', reps: 8 },
      { t: 22, exercise: 'Barbell back squat', reps: 8 },
      { t: 29, exercise: 'Romanian deadlift', reps: 8 },
      { t: 36, exercise: 'Romanian deadlift', reps: 8 },
      { t: 41, exercise: 'Walking lunge', reps: 8 },
    ],
  },
  {
    id: 'wo-2',
    date: '2026-09-25',
    display_date: 'Friday, Sep 25',
    week_group: 'This week',
    duration_minutes: 48,
    total_reps: 76,
    exercises: [
      {
        name: 'Barbell bench press',
        exercise_id: 'bench-press',
        sets: 4,
        reps_per_set: [10, 8, 8, 6],
        total_reps: 32,
      },
      {
        name: 'Incline dumbbell press',
        exercise_id: 'incline-db',
        sets: 3,
        reps_per_set: [10, 8, 8],
        total_reps: 26,
      },
      {
        name: 'Dumbbell lateral raise',
        exercise_id: 'lateral-raise',
        sets: 3,
        reps_per_set: [6, 6, 6],
        total_reps: 18,
      },
    ],
    timeline_points: [
      { t: 8, exercise: 'Barbell bench press', reps: 10 },
      { t: 16, exercise: 'Barbell bench press', reps: 8 },
      { t: 24, exercise: 'Barbell bench press', reps: 8 },
      { t: 34, exercise: 'Incline dumbbell press', reps: 10 },
      { t: 42, exercise: 'Dumbbell lateral raise', reps: 8 },
    ],
  },
  {
    id: 'wo-3',
    date: '2026-09-23',
    display_date: 'Wednesday, Sep 23',
    week_group: 'This week',
    duration_minutes: 38,
    total_reps: 68,
    exercises: [
      {
        name: 'Dumbbell bicep curl',
        exercise_id: 'bicep-curl',
        sets: 4,
        reps_per_set: [10, 10, 10, 10],
        total_reps: 40,
      },
      {
        name: 'Dumbbell lateral raise',
        exercise_id: 'lateral-raise',
        sets: 4,
        reps_per_set: [7, 7, 7, 7],
        total_reps: 28,
      },
    ],
    timeline_points: [
      { t: 5, exercise: 'Dumbbell bicep curl', reps: 10 },
      { t: 14, exercise: 'Dumbbell bicep curl', reps: 10 },
      { t: 24, exercise: 'Dumbbell lateral raise', reps: 7 },
      { t: 33, exercise: 'Dumbbell lateral raise', reps: 7 },
    ],
  },
  {
    id: 'wo-4',
    date: '2026-09-20',
    display_date: 'Sunday, Sep 20',
    week_group: 'Last week',
    duration_minutes: 52,
    total_reps: 82,
    exercises: [
      {
        name: 'Barbell back squat',
        exercise_id: 'squat',
        sets: 4,
        reps_per_set: [8, 8, 8, 6],
        total_reps: 30,
      },
      {
        name: 'Romanian deadlift',
        exercise_id: 'rdl',
        sets: 3,
        reps_per_set: [8, 8, 8],
        total_reps: 24,
      },
      {
        name: 'Barbell bench press',
        exercise_id: 'bench-press',
        sets: 4,
        reps_per_set: [8, 8, 6, 6],
        total_reps: 28,
      },
    ],
    timeline_points: [
      { t: 10, exercise: 'Barbell back squat', reps: 8 },
      { t: 22, exercise: 'Barbell back squat', reps: 8 },
      { t: 35, exercise: 'Romanian deadlift', reps: 8 },
      { t: 47, exercise: 'Barbell bench press', reps: 8 },
    ],
  },
  {
    id: 'wo-5',
    date: '2026-09-18',
    display_date: 'Friday, Sep 18',
    week_group: 'Last week',
    duration_minutes: 45,
    total_reps: 70,
    exercises: [
      {
        name: 'Barbell bench press',
        exercise_id: 'bench-press',
        sets: 4,
        reps_per_set: [10, 8, 8, 8],
        total_reps: 34,
      },
      {
        name: 'Dumbbell bicep curl',
        exercise_id: 'bicep-curl',
        sets: 4,
        reps_per_set: [9, 9, 9, 9],
        total_reps: 36,
      },
    ],
  },
  {
    id: 'wo-6',
    date: '2026-09-15',
    display_date: 'Tuesday, Sep 15',
    week_group: 'Last week',
    duration_minutes: 40,
    total_reps: 58,
    exercises: [
      {
        name: 'Barbell back squat',
        exercise_id: 'squat',
        sets: 4,
        reps_per_set: [8, 8, 7, 7],
        total_reps: 30,
      },
      {
        name: 'Walking lunge',
        exercise_id: 'lunge',
        sets: 4,
        reps_per_set: [7, 7, 7, 7],
        total_reps: 28,
      },
    ],
  },
  {
    id: 'wo-7',
    date: '2026-09-11',
    display_date: 'Friday, Sep 11',
    week_group: '2 weeks ago',
    duration_minutes: 50,
    total_reps: 74,
    exercises: [
      {
        name: 'Barbell bench press',
        exercise_id: 'bench-press',
        sets: 4,
        reps_per_set: [8, 8, 8, 8],
        total_reps: 32,
      },
      {
        name: 'Dumbbell bicep curl',
        exercise_id: 'bicep-curl',
        sets: 3,
        reps_per_set: [10, 10, 10],
        total_reps: 30,
      },
      {
        name: 'Dumbbell lateral raise',
        exercise_id: 'lateral-raise',
        sets: 2,
        reps_per_set: [6, 6],
        total_reps: 12,
      },
    ],
  },
  {
    id: 'wo-8',
    date: '2026-09-08',
    display_date: 'Tuesday, Sep 8',
    week_group: '2 weeks ago',
    duration_minutes: 44,
    total_reps: 60,
    exercises: [
      {
        name: 'Barbell back squat',
        exercise_id: 'squat',
        sets: 4,
        reps_per_set: [8, 8, 7, 6],
        total_reps: 29,
      },
      {
        name: 'Romanian deadlift',
        exercise_id: 'rdl',
        sets: 4,
        reps_per_set: [8, 8, 8, 7],
        total_reps: 31,
      },
    ],
  },
  {
    id: 'wo-9',
    date: '2026-09-04',
    display_date: 'Friday, Sep 4',
    week_group: '3 weeks ago',
    duration_minutes: 46,
    total_reps: 68,
    exercises: [
      {
        name: 'Barbell bench press',
        exercise_id: 'bench-press',
        sets: 4,
        reps_per_set: [8, 8, 7, 7],
        total_reps: 30,
      },
      {
        name: 'Dumbbell bicep curl',
        exercise_id: 'bicep-curl',
        sets: 4,
        reps_per_set: [10, 10, 9, 9],
        total_reps: 38,
      },
    ],
  },
  {
    id: 'wo-10',
    date: '2026-09-01',
    display_date: 'Tuesday, Sep 1',
    week_group: '3 weeks ago',
    duration_minutes: 41,
    total_reps: 56,
    exercises: [
      {
        name: 'Barbell back squat',
        exercise_id: 'squat',
        sets: 4,
        reps_per_set: [7, 7, 7, 7],
        total_reps: 28,
      },
      {
        name: 'Walking lunge',
        exercise_id: 'lunge',
        sets: 4,
        reps_per_set: [7, 7, 7, 7],
        total_reps: 28,
      },
    ],
  },
];
