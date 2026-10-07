/**
 * Starting templates for the editable plan. Every exercise is a pipeline label (data/planExercises.ts).
 */

import { Plan } from '../types/plan';

export type PlanTemplateId = 'ppl' | 'upper_lower' | 'full_body';

// [exercise key, sets, reps min, reps max]
type Slot = [key: string, sets: number, repsMin: number, repsMax: number];

interface PlanTemplate {
  id: PlanTemplateId;
  name: string;
  description: string;
  days: { name: string; exercises: Slot[] }[];
}

export const PLAN_TEMPLATES: PlanTemplate[] = [
  {
    id: 'ppl',
    name: 'Push / Pull / Legs',
    description: 'Three days that rotate. A solid default for 3–6 visits a week.',
    days: [
      {
        name: 'Push',
        exercises: [
          ['bench_press', 4, 6, 8],
          ['incline_press', 3, 8, 10],
          ['shoulder_press', 3, 8, 10],
          ['lateral_raise', 3, 12, 15],
          ['tricep_extension', 3, 10, 12],
        ],
      },
      {
        name: 'Pull',
        exercises: [
          ['pull_up', 3, 6, 10],
          ['bent_over_row', 4, 6, 8],
          ['seated_row', 3, 10, 12],
          ['rear_delt_fly', 3, 12, 15],
          ['bicep_curl', 3, 10, 12],
        ],
      },
      {
        name: 'Legs',
        exercises: [
          ['squat', 4, 6, 8],
          ['romanian_deadlift', 3, 8, 10],
          ['leg_press', 3, 10, 12],
          ['leg_curl', 3, 10, 12],
          ['calf_raise', 4, 12, 15],
        ],
      },
    ],
  },
  {
    id: 'upper_lower',
    name: 'Upper / Lower',
    description: 'Two days that alternate. Good for 2–4 visits a week.',
    days: [
      {
        name: 'Upper',
        exercises: [
          ['bench_press', 4, 6, 8],
          ['bent_over_row', 4, 6, 8],
          ['shoulder_press', 3, 8, 10],
          ['lat_pulldown', 3, 10, 12],
          ['bicep_curl', 2, 10, 12],
          ['tricep_extension', 2, 10, 12],
        ],
      },
      {
        name: 'Lower',
        exercises: [
          ['squat', 4, 6, 8],
          ['romanian_deadlift', 3, 8, 10],
          ['lunge', 3, 10, 12],
          ['leg_curl', 3, 10, 12],
          ['calf_raise', 3, 12, 15],
          ['crunch', 3, 12, 15],
        ],
      },
    ],
  },
  {
    id: 'full_body',
    name: 'Full Body',
    description: 'Two full-body days that alternate. Good for 2–3 visits a week.',
    days: [
      {
        name: 'Full Body A',
        exercises: [
          ['squat', 3, 6, 8],
          ['bench_press', 3, 6, 8],
          ['bent_over_row', 3, 8, 10],
          ['lateral_raise', 2, 12, 15],
          ['crunch', 2, 12, 15],
        ],
      },
      {
        name: 'Full Body B',
        exercises: [
          ['deadlift', 3, 5, 6],
          ['shoulder_press', 3, 8, 10],
          ['pull_up', 3, 6, 10],
          ['lunge', 2, 10, 12],
          ['bicep_curl', 2, 10, 12],
        ],
      },
    ],
  },
];

export const DEFAULT_TEMPLATE_ID: PlanTemplateId = 'ppl';

export const newPlanId = (prefix: string) =>
  `${prefix}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 7)}`;

/** A fresh plan (new ids) built from a template. */
export function planFromTemplate(id: PlanTemplateId): Plan {
  const template = PLAN_TEMPLATES.find((t) => t.id === id) ?? PLAN_TEMPLATES[0];
  return {
    id: newPlanId('plan'),
    name: template.name,
    days: template.days.map((day) => ({
      id: newPlanId('day'),
      name: day.name,
      exercises: day.exercises.map(([exerciseKey, targetSets, targetRepsMin, targetRepsMax]) => ({
        id: newPlanId('ex'),
        exerciseKey,
        targetSets,
        targetRepsMin,
        targetRepsMax,
      })),
    })),
  };
}
