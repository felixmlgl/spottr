import { GymOccupancyData, PastWorkout, PersonalBest } from '../types/schema';

export const MEMBER_PROFILE = {
  name: 'Felix',
  gymName: 'RSF Weight Room',
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
    recap:
      'Strong lower body session with textbook squat depth throughout. Your cadence remained steady at 3.1 seconds per repetition with zero breakdown in form.',
    suggestion:
      'Consider pausing for 1 second in the hole on your first two squat sets next time to build explosive power.',
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
    recap:
      'Clean push day with great lockout control on the flat bench. Pacing was consistent across all heavy working sets.',
    suggestion:
      'Slightly widen your grip on the third set of bench press to engage the pectorals more completely.',
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
    recap:
      'Focused arm hypertrophy day. Elbow angle stayed firmly fixed with minimal torso momentum.',
    suggestion:
      'Slow down the eccentric lowering phase to 3 seconds for enhanced metabolic stress.',
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
    recap:
      'Full body compound session. You sustained high work capacity across both primary barbell stations.',
    suggestion:
      'Take an extra 45 seconds rest before your final bench set to hit the targeted 8 repetitions.',
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
    recap:
      'Upper body push and pull balance. Crisp lockouts registered on 32 of 34 bench reps.',
    suggestion:
      'Keep shoulder blades pinched tightly on the bench bench press setup.',
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
    recap:
      'Leg day with sustained pace and deep parallel knee flexion on every squat set.',
    suggestion:
      'Focus on pushing knees outward slightly during the turnaround at the bottom.',
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
    recap:
      'Well-rounded hypertrophy session. Smooth transitions between exercise stations.',
    suggestion:
      'Add one more set to lateral raises next week to progressively overload the medial delts.',
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
    recap:
      'Posterior chain focus. Strong hip hinge mechanics tracked cleanly by camera.',
    suggestion:
      'Maintain neutral neck alignment during deadlift lockout.',
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
    recap:
      'Chest and arms pump session with tight rep pacing and zero pauses at lockout.',
    suggestion:
      'Try a slight incline for your curls to hit the long head of the bicep.',
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
    recap:
      'Consistent 4-set squat sequence initiating the September volume block.',
    suggestion:
      'Focus on a crisp exhale as you drive up through the sticking point.',
  },
];

export const GYM_OCCUPANCY: GymOccupancyData = {
  current_percent: 38,
  status_label: 'Not busy',
  hourly_traffic: [
    { hour: '6 AM', percent: 18 },
    { hour: '7 AM', percent: 34 },
    { hour: '8 AM', percent: 52 },
    { hour: '9 AM', percent: 45 },
    { hour: '10 AM', percent: 35 },
    { hour: '11 AM', percent: 38, is_now: true },
    { hour: '12 PM', percent: 62 },
    { hour: '1 PM', percent: 58 },
    { hour: '2 PM', percent: 40 },
    { hour: '3 PM', percent: 48 },
    { hour: '4 PM', percent: 68 },
    { hour: '5 PM', percent: 86 },
    { hour: '6 PM', percent: 92 },
    { hour: '7 PM', percent: 78 },
    { hour: '8 PM', percent: 54 },
    { hour: '9 PM', percent: 28 },
  ],
  zones: [
    {
      id: 'squat-racks',
      name: 'Squat racks',
      status: 'available',
      status_text: '3 of 4 racks free',
      free_units: 3,
      total_units: 4,
    },
    {
      id: 'benches',
      name: 'Flat benches',
      status: 'available',
      status_text: '2 of 4 benches free',
      free_units: 2,
      total_units: 4,
    },
    {
      id: 'dumbbells',
      name: 'Dumbbell area',
      status: 'moderate',
      status_text: 'Open space available',
      free_units: 6,
      total_units: 10,
    },
    {
      id: 'cables',
      name: 'Cable stations',
      status: 'moderate',
      status_text: '1 of 3 stations free',
      free_units: 1,
      total_units: 3,
    },
  ],
};

export const PERSONAL_BESTS: PersonalBest[] = [
  {
    exercise: 'Barbell back squat',
    value: '32 reps',
    date: 'Sep 27, 2026',
    note: 'Completed 4 sets of 8 with parallel depth',
  },
  {
    exercise: 'Barbell bench press',
    value: '34 reps',
    date: 'Sep 18, 2026',
    note: 'Maintained 3.2s cadence across all working sets',
  },
  {
    exercise: 'Dumbbell bicep curl',
    value: '40 reps',
    date: 'Sep 23, 2026',
    note: '4 sets of 10 without elbow drift',
  },
];

export const EXERCISE_PROGRESS_DATA: Record<
  string,
  { date: string; reps: number; label: string }[]
> = {
  squat: [
    { date: 'Sep 1', reps: 28, label: '4x7' },
    { date: 'Sep 8', reps: 29, label: '4x7-8' },
    { date: 'Sep 15', reps: 30, label: '4x8' },
    { date: 'Sep 20', reps: 30, label: '4x8' },
    { date: 'Sep 27', reps: 32, label: '4x8 (PB)' },
  ],
  'bench-press': [
    { date: 'Sep 4', reps: 30, label: '4x7-8' },
    { date: 'Sep 11', reps: 32, label: '4x8' },
    { date: 'Sep 18', reps: 34, label: '4x8-10 (PB)' },
    { date: 'Sep 20', reps: 28, label: '4x7' },
    { date: 'Sep 25', reps: 32, label: '4x8' },
  ],
  'bicep-curl': [
    { date: 'Sep 4', reps: 38, label: '4x9-10' },
    { date: 'Sep 11', reps: 30, label: '3x10' },
    { date: 'Sep 18', reps: 36, label: '4x9' },
    { date: 'Sep 23', reps: 40, label: '4x10 (PB)' },
  ],
};
